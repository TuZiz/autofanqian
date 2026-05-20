import "server-only";

import { z } from "zod";

import { AuthApiError } from "@/lib/auth/errors";
import {
  decryptSecret,
  encryptSecret,
  hasEncryptionKey,
  type EncryptedSecret,
} from "@/lib/security/encryption";
import { prisma } from "@/lib/prisma";

export const ALIPAY_CONFIG_KEY = "payment_alipay_v1";
export const ALIPAY_PRIVATE_KEY_CLEAR_VALUE = "__CLEAR__";
export const ALIPAY_ENCRYPTION_KEY_ERROR = "服务器未配置 SETTINGS_ENCRYPTION_KEY，无法安全保存支付私钥。";

export type AlipayPaymentConfig = {
  version: 1;
  enabled: boolean;
  sandbox: boolean;
  appId: string;
  gateway: string;
  returnUrl: string;
  notifyUrl: string;
  signType: "RSA2";
  alipayPublicKey: string;
  encryptedPrivateKey?: EncryptedSecret;
};

export type SafeAlipayPaymentConfig = {
  version: 1;
  enabled: boolean;
  sandbox: boolean;
  appId: string;
  gateway: string;
  returnUrl: string;
  notifyUrl: string;
  signType: "RSA2";
  alipayPublicKeyConfigured: boolean;
  alipayPublicKeyPreview: string | null;
  privateKeyConfigured: boolean;
};

export type AlipayPaymentConfigUpdateInput = {
  enabled: boolean;
  sandbox: boolean;
  appId: string;
  gateway: string;
  returnUrl: string;
  notifyUrl: string;
  signType: "RSA2";
  alipayPublicKey?: string;
  privateKey?: string;
};

type AppConfigStore = {
  findUnique(): Promise<{ value: unknown } | null>;
  upsert(value: AlipayPaymentConfig): Promise<void>;
};

const encryptedSecretSchema = z.object({
  alg: z.literal("aes-256-gcm"),
  iv: z.string().min(1),
  tag: z.string().min(1),
  data: z.string().min(1),
});

const httpUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  }, "必须是 http/https URL");

const alipayConfigSchema = z.object({
  version: z.literal(1),
  enabled: z.boolean(),
  sandbox: z.boolean(),
  appId: z.string().trim(),
  gateway: httpUrlSchema,
  returnUrl: httpUrlSchema,
  notifyUrl: httpUrlSchema,
  signType: z.literal("RSA2"),
  alipayPublicKey: z.string(),
  encryptedPrivateKey: encryptedSecretSchema.optional(),
});

const updateSchema = z.object({
  enabled: z.boolean(),
  sandbox: z.boolean(),
  appId: z.string().trim(),
  gateway: httpUrlSchema,
  returnUrl: httpUrlSchema,
  notifyUrl: httpUrlSchema,
  signType: z.literal("RSA2"),
  alipayPublicKey: z.string().optional(),
  privateKey: z.string().optional(),
});

function getDefaultGateway(sandbox: boolean) {
  return sandbox
    ? "https://openapi-sandbox.dl.alipaydev.com/gateway.do"
    : "https://openapi.alipay.com/gateway.do";
}

export function getDefaultAlipayPaymentConfig(): AlipayPaymentConfig {
  const appBaseUrl = process.env.APP_BASE_URL?.trim() || "http://localhost:3000";

  return {
    version: 1,
    enabled: false,
    sandbox: true,
    appId: process.env.ALIPAY_APP_ID?.trim() || "",
    gateway: process.env.ALIPAY_GATEWAY?.trim() || getDefaultGateway(true),
    returnUrl: process.env.ALIPAY_RETURN_URL?.trim() || `${appBaseUrl}/dashboard?payment=alipay_return`,
    notifyUrl: process.env.ALIPAY_NOTIFY_URL?.trim() || `${appBaseUrl}/api/payments/alipay/notify`,
    signType: "RSA2",
    alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY?.trim() || "",
  };
}

function normalizeConfig(config: AlipayPaymentConfig): AlipayPaymentConfig {
  return {
    ...config,
    appId: config.appId.trim(),
    gateway: config.gateway.trim(),
    returnUrl: config.returnUrl.trim(),
    notifyUrl: config.notifyUrl.trim(),
    signType: "RSA2",
    alipayPublicKey: config.alipayPublicKey.trim(),
  };
}

function createPrismaAppConfigStore(): AppConfigStore {
  return {
    async findUnique() {
      return prisma.appConfig.findUnique({
        where: { key: ALIPAY_CONFIG_KEY },
        select: { value: true },
      });
    },
    async upsert(value) {
      await prisma.appConfig.upsert({
        where: { key: ALIPAY_CONFIG_KEY },
        create: { key: ALIPAY_CONFIG_KEY, value },
        update: { value },
      });
    },
  };
}

function parseStoredConfig(value: unknown): AlipayPaymentConfig | null {
  const parsed = alipayConfigSchema.safeParse(value);
  if (!parsed.success) return null;
  return normalizeConfig(parsed.data);
}

function previewPublicKey(publicKey: string) {
  const compact = publicKey.replace(/\s+/g, "");
  if (!compact) return null;
  if (compact.length <= 18) return compact;
  return `${compact.slice(0, 8)}…${compact.slice(-8)}`;
}

export function toSafeAlipayPaymentConfig(config: AlipayPaymentConfig): SafeAlipayPaymentConfig {
  return {
    version: 1,
    enabled: config.enabled,
    sandbox: config.sandbox,
    appId: config.appId,
    gateway: config.gateway,
    returnUrl: config.returnUrl,
    notifyUrl: config.notifyUrl,
    signType: "RSA2",
    alipayPublicKeyConfigured: Boolean(config.alipayPublicKey.trim()),
    alipayPublicKeyPreview: previewPublicKey(config.alipayPublicKey),
    privateKeyConfigured: Boolean(config.encryptedPrivateKey),
  };
}

export async function getAlipayPaymentConfig(store: AppConfigStore = createPrismaAppConfigStore()) {
  try {
    const existing = await store.findUnique();
    const parsed = existing ? parseStoredConfig(existing.value) : null;
    return parsed ?? getDefaultAlipayPaymentConfig();
  } catch {
    return getDefaultAlipayPaymentConfig();
  }
}

export async function getSafeAlipayPaymentConfig(store?: AppConfigStore) {
  return toSafeAlipayPaymentConfig(await getAlipayPaymentConfig(store));
}

export async function updateAlipayPaymentConfig(
  input: unknown,
  store: AppConfigStore = createPrismaAppConfigStore(),
) {
  const parsed = updateSchema.parse(input);
  const before = await getAlipayPaymentConfig(store);
  const nextPrivateKey = parsed.privateKey;
  let encryptedPrivateKey = before.encryptedPrivateKey;

  if (nextPrivateKey === ALIPAY_PRIVATE_KEY_CLEAR_VALUE) {
    encryptedPrivateKey = undefined;
  } else if (nextPrivateKey && nextPrivateKey.trim()) {
    if (!hasEncryptionKey()) {
      throw new AuthApiError(500, ALIPAY_ENCRYPTION_KEY_ERROR);
    }
    encryptedPrivateKey = encryptSecret(nextPrivateKey.trim());
  }

  const normalized = normalizeConfig({
    version: 1,
    enabled: parsed.enabled,
    sandbox: parsed.sandbox,
    appId: parsed.appId,
    gateway: parsed.gateway,
    returnUrl: parsed.returnUrl,
    notifyUrl: parsed.notifyUrl,
    signType: "RSA2",
    alipayPublicKey: parsed.alipayPublicKey ?? before.alipayPublicKey,
    ...(encryptedPrivateKey ? { encryptedPrivateKey } : {}),
  });

  await store.upsert(normalized);
  return normalized;
}

export async function getDecryptedAlipayPrivateKey(store?: AppConfigStore) {
  const config = await getAlipayPaymentConfig(store);
  if (config.encryptedPrivateKey) {
    return decryptSecret(config.encryptedPrivateKey);
  }

  return process.env.ALIPAY_PRIVATE_KEY?.trim() || "";
}

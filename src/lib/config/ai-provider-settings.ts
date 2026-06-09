import "server-only";

import { z } from "zod";

import type {
  AiProviderFallbackPolicy,
  AiProviderLineId,
  AiProviderLineSetting,
  AiProviderSettings,
  AiProviderType,
  ProviderProtocol,
} from "@/lib/admin/ai-provider-settings-types";
import { AuthApiError } from "@/lib/auth/errors";
import { prisma } from "@/lib/prisma";
import {
  decryptSecret,
  encryptSecret,
  hasEncryptionKey,
  type EncryptedSecret,
} from "@/lib/security/encryption";

export const AI_PROVIDER_SETTINGS_KEY = "ai_provider_settings_v1";
export const AI_PROVIDER_SETTINGS_ENCRYPTION_ERROR =
  "服务器未配置 SETTINGS_ENCRYPTION_KEY，无法安全保存 AI Provider API Key。";

export type AiProviderLineUpdateInput = Omit<
  AiProviderLineSetting,
  "apiKeyEncrypted" | "apiKeyPreview" | "hasApiKey"
> & {
  apiKey?: string;
};

export type AiProviderSettingsUpdateInput = {
  version: 2;
  primary: AiProviderLineUpdateInput;
  backup: AiProviderLineUpdateInput;
  fallbackPolicy: AiProviderFallbackPolicy;
};

export type RuntimeAiProviderSetting = {
  id: AiProviderLineId;
  providerType: AiProviderType;
  protocol: ProviderProtocol;
  label: string;
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  model: string;
  modelOptions: string[];
  anthropicVersion?: string;
};

type AppConfigStore = {
  findUnique(): Promise<{ value: unknown } | null>;
  upsert(value: AiProviderSettings): Promise<void>;
};

const FALLBACK_STATUS_CODES = [408, 429, 500, 502, 503, 504];

const encryptedSecretSchema = z.object({
  alg: z.literal("aes-256-gcm"),
  iv: z.string().min(1),
  tag: z.string().min(1),
  data: z.string().min(1),
});

const providerProtocolSchema = z.enum([
  "openai_chat",
  "openai_responses",
  "anthropic_messages",
]);

const providerTypeSchema = z.enum(["openai_compatible", "anthropic"]);
const legacyProviderTypeSchema = z.enum(["openai_compatible", "anthropic", "ark"]);
const lineIdSchema = z.enum(["primary", "backup"]);

const lineBaseSchema = z.object({
  id: lineIdSchema,
  enabled: z.boolean(),
  providerType: providerTypeSchema,
  protocol: providerProtocolSchema,
  label: z.string().trim().max(80),
  baseUrl: z.string().trim().max(500),
  model: z.string().trim().max(160),
  modelOptions: z.array(z.string().trim().min(1).max(160)).max(40),
  hasApiKey: z.boolean().optional(),
  apiKeyPreview: z.string().trim().max(64).optional(),
  apiKeyEncrypted: z.string().min(1).optional(),
  anthropicVersion: z.string().trim().max(80).optional(),
});

const storedLineBaseSchema = lineBaseSchema.extend({
  providerType: legacyProviderTypeSchema,
});

type ProtocolLine = {
  providerType: AiProviderType | "ark";
  protocol: ProviderProtocol;
};

function validateLineProtocol(
  line: ProtocolLine,
  context: z.RefinementCtx,
) {
  if (line.providerType === "anthropic" && line.protocol !== "anthropic_messages") {
    context.addIssue({
      code: "custom",
      message: "Anthropic Messages 必须使用 anthropic_messages 协议。",
      path: ["protocol"],
    });
  }

  if (line.providerType !== "anthropic" && line.protocol === "anthropic_messages") {
    context.addIssue({
      code: "custom",
      message: "OpenAI 兼容接口不支持 anthropic_messages 协议。",
      path: ["protocol"],
    });
  }
}

const storedLineSchema = storedLineBaseSchema.superRefine(validateLineProtocol);

const fallbackPolicySchema = z.object({
  enabled: z.boolean(),
  timeoutMs: z.coerce.number().int().min(1_000).max(300_000),
  maxRetries: z.coerce.number().int().min(0).max(5),
  useBackupOnStatus: z.array(z.coerce.number().int().min(100).max(599)).max(24),
});

const storedSettingsSchema = z.object({
  version: z.literal(2),
  primary: storedLineSchema,
  backup: storedLineSchema,
  fallbackPolicy: fallbackPolicySchema,
});

const updateLineSchema = lineBaseSchema
  .omit({
    apiKeyEncrypted: true,
    apiKeyPreview: true,
    hasApiKey: true,
  })
  .extend({
    apiKey: z.string().max(6000).optional(),
  })
  .superRefine(validateLineProtocol);

const updateSettingsSchema = z.object({
  version: z.literal(2),
  primary: updateLineSchema,
  backup: updateLineSchema,
  fallbackPolicy: fallbackPolicySchema,
});

const legacyProviderSchema = z.object({
  id: z.string().trim().min(1).max(80),
  type: z.enum(["openai_compatible", "anthropic"]),
  protocol: providerProtocolSchema,
  label: z.string().trim().max(80),
  enabled: z.boolean(),
  baseUrl: z.string().trim().max(500),
  model: z.string().trim().max(160),
  modelOptions: z.array(z.string().trim().min(1).max(160)).max(40),
  hasApiKey: z.boolean().optional(),
  apiKeyPreview: z.string().trim().max(64).optional(),
  apiKeyEncrypted: z.string().min(1).optional(),
  anthropicVersion: z.string().trim().max(80).optional(),
});

const legacySettingsSchema = z.object({
  version: z.literal(1),
  providers: z.array(legacyProviderSchema).max(8),
});

function createPrismaAppConfigStore(): AppConfigStore {
  return {
    async findUnique() {
      return prisma.appConfig.findUnique({
        where: { key: AI_PROVIDER_SETTINGS_KEY },
        select: { value: true },
      });
    },
    async upsert(value) {
      await prisma.appConfig.upsert({
        where: { key: AI_PROVIDER_SETTINGS_KEY },
        create: { key: AI_PROVIDER_SETTINGS_KEY, value },
        update: { value },
      });
    },
  };
}

function readFirstEnv(keys: string[], fallback = "") {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return fallback;
}

function parseModelOptions(raw: string | undefined, fallbackModel: string) {
  const values = (raw || "")
    .split(/[\n,;|]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
  const merged = [fallbackModel.trim(), ...values].filter(Boolean);
  return Array.from(new Set(merged));
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function assertHttpBaseUrl(value: string, path: Array<string | number>) {
  const baseUrl = normalizeBaseUrl(value);
  if (!baseUrl) return "";

  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("unsupported protocol");
    }
    return baseUrl;
  } catch {
    throw new z.ZodError([
      {
        code: "custom",
        message: "Base URL 必须是 http/https URL。",
        path,
      },
    ]);
  }
}

function getDefaultFallbackPolicy(): AiProviderFallbackPolicy {
  return {
    enabled: true,
    timeoutMs: 30_000,
    maxRetries: 1,
    useBackupOnStatus: FALLBACK_STATUS_CODES,
  };
}

function getDefaultLine(lineId: AiProviderLineId): AiProviderLineSetting {
  if (lineId === "backup") {
    const model = readFirstEnv(["ANTHROPIC_MODEL"], "claude-sonnet-4-20250514");
    return {
      id: "backup",
      enabled: false,
      providerType: "anthropic",
      protocol: "anthropic_messages",
      label: readFirstEnv(["ANTHROPIC_PROVIDER_LABEL"], "Anthropic"),
      baseUrl: readFirstEnv(["ANTHROPIC_BASE_URL"], "https://api.anthropic.com"),
      model,
      modelOptions: parseModelOptions(readFirstEnv(["ANTHROPIC_MODEL_OPTIONS"]), model),
      anthropicVersion: readFirstEnv(["ANTHROPIC_VERSION"], "2023-06-01"),
    };
  }

  const model = readFirstEnv(["GPT_PRIMARY_MODEL", "AI_MODEL"], "gpt-5.4");
  return {
    id: "primary",
    enabled: false,
    providerType: "openai_compatible",
    protocol: "openai_responses",
    label: readFirstEnv(
      ["GPT_PRIMARY_PROVIDER_LABEL", "AI_PROVIDER_LABEL", "AI_PROVIDER_NAME"],
      "OpenAI 兼容接口",
    ),
    baseUrl: readFirstEnv(["GPT_PRIMARY_BASE_URL", "AI_BASE_URL"], "https://api.openai.com"),
    model,
    modelOptions: parseModelOptions(
      readFirstEnv(["GPT_PRIMARY_MODEL_OPTIONS", "AI_MODEL_OPTIONS"]),
      model,
    ),
  };
}

function getDefaultAiProviderSettings(): AiProviderSettings {
  return {
    version: 2,
    primary: getDefaultLine("primary"),
    backup: getDefaultLine("backup"),
    fallbackPolicy: getDefaultFallbackPolicy(),
  };
}

function serializeEncryptedSecret(secret: EncryptedSecret) {
  return JSON.stringify(secret);
}

function parseEncryptedSecret(value: string): EncryptedSecret | null {
  try {
    const parsed: unknown = JSON.parse(value);
    const secret = encryptedSecretSchema.safeParse(parsed);
    return secret.success ? secret.data : null;
  } catch {
    return null;
  }
}

function decryptApiKey(apiKeyEncrypted: string) {
  const secret = parseEncryptedSecret(apiKeyEncrypted);
  if (!secret) {
    throw new AuthApiError(500, "AI Provider API Key 加密数据格式无效。");
  }
  return decryptSecret(secret);
}

function previewSecret(secret: string) {
  const compact = secret.replace(/\s+/g, "");
  if (!compact) return undefined;
  if (compact.length <= 10) return `${compact.slice(0, 2)}-****${compact.slice(-2)}`;
  return `${compact.slice(0, 4)}-****${compact.slice(-4)}`;
}

function normalizeProviderType(
  providerType: AiProviderType | "ark",
): ProviderProtocol {
  if (providerType === "anthropic") return "anthropic_messages";
  return "openai_responses";
}

function normalizeLineProviderType(providerType: AiProviderType | "ark"): AiProviderType {
  return providerType === "anthropic" ? "anthropic" : "openai_compatible";
}

function normalizeModelOptions(model: string, options: string[]) {
  const merged = [model, ...options]
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 40);
  return Array.from(new Set(merged));
}

function normalizeStoredLine(line: z.infer<typeof storedLineSchema>): AiProviderLineSetting {
  const model = line.model.trim();
  const providerType = normalizeLineProviderType(line.providerType);
  return {
    id: line.id,
    enabled: line.enabled,
    providerType,
    protocol: normalizeProviderType(line.providerType),
    label: line.label.trim() || (line.id === "primary" ? "主用线路" : "备用线路"),
    baseUrl: normalizeBaseUrl(line.baseUrl),
    model,
    modelOptions: normalizeModelOptions(model, line.modelOptions),
    ...(line.apiKeyEncrypted ? { apiKeyEncrypted: line.apiKeyEncrypted } : {}),
    ...(line.apiKeyEncrypted ? { hasApiKey: true } : {}),
    ...(line.apiKeyPreview ? { apiKeyPreview: line.apiKeyPreview } : {}),
    ...(providerType === "anthropic"
      ? { anthropicVersion: line.anthropicVersion?.trim() || "2023-06-01" }
      : {}),
  };
}

function legacyProviderToLine(
  legacy: z.infer<typeof legacyProviderSchema> | undefined,
  lineId: AiProviderLineId,
): AiProviderLineSetting {
  if (!legacy) return getDefaultLine(lineId);
  const providerType: AiProviderType | "ark" =
    legacy.id === "ark" ? "ark" : legacy.type === "anthropic" ? "anthropic" : "openai_compatible";
  return normalizeStoredLine({
    id: lineId,
    enabled: legacy.enabled,
    providerType,
    protocol: normalizeProviderType(providerType),
    label: legacy.label,
    baseUrl: legacy.baseUrl,
    model: legacy.model,
    modelOptions: legacy.modelOptions,
    ...(legacy.apiKeyEncrypted ? { apiKeyEncrypted: legacy.apiKeyEncrypted } : {}),
    ...(legacy.apiKeyPreview ? { apiKeyPreview: legacy.apiKeyPreview } : {}),
    ...(providerType === "anthropic"
      ? { anthropicVersion: legacy.anthropicVersion ?? "2023-06-01" }
      : {}),
  });
}

function parseStoredSettings(value: unknown): AiProviderSettings | null {
  const parsed = storedSettingsSchema.safeParse(value);
  if (parsed.success) {
    return {
      version: 2,
      primary: normalizeStoredLine(parsed.data.primary),
      backup: normalizeStoredLine(parsed.data.backup),
      fallbackPolicy: parsed.data.fallbackPolicy,
    };
  }

  const legacy = legacySettingsSchema.safeParse(value);
  if (legacy.success) {
    return {
      version: 2,
      primary: legacyProviderToLine(legacy.data.providers[0], "primary"),
      backup: legacyProviderToLine(legacy.data.providers[1], "backup"),
      fallbackPolicy: getDefaultFallbackPolicy(),
    };
  }

  return null;
}

function toSafeLine(line: AiProviderLineSetting): AiProviderLineSetting {
  const hasApiKey = Boolean(line.apiKeyEncrypted);
  return {
    id: line.id,
    enabled: line.enabled,
    providerType: line.providerType,
    protocol: line.protocol,
    label: line.label,
    baseUrl: line.baseUrl,
    model: line.model,
    modelOptions: line.modelOptions,
    hasApiKey,
    ...(hasApiKey && line.apiKeyPreview ? { apiKeyPreview: line.apiKeyPreview } : {}),
    ...(line.anthropicVersion ? { anthropicVersion: line.anthropicVersion } : {}),
  };
}

export function toSafeAiProviderSettings(settings: AiProviderSettings): AiProviderSettings {
  return {
    version: 2,
    primary: toSafeLine(settings.primary),
    backup: toSafeLine(settings.backup),
    fallbackPolicy: settings.fallbackPolicy,
  };
}

async function getStoredAiProviderSettings(
  store: AppConfigStore = createPrismaAppConfigStore(),
) {
  const existing = await store.findUnique();
  const parsed = existing ? parseStoredSettings(existing.value) : null;
  return parsed ?? getDefaultAiProviderSettings();
}

export async function getAiProviderSettings(store?: AppConfigStore) {
  return toSafeAiProviderSettings(await getStoredAiProviderSettings(store));
}

function normalizeUpdateLine(
  line: z.infer<typeof updateLineSchema>,
  previous: AiProviderLineSetting,
  pathPrefix: string,
): AiProviderLineSetting {
  const baseUrl = assertHttpBaseUrl(line.baseUrl, [pathPrefix, "baseUrl"]);
  const model = line.model.trim();
  const apiKey = line.apiKey?.trim();
  let apiKeyEncrypted = previous.apiKeyEncrypted;
  let apiKeyPreview = previous.apiKeyPreview;

  if (apiKey) {
    if (!hasEncryptionKey()) {
      throw new AuthApiError(500, AI_PROVIDER_SETTINGS_ENCRYPTION_ERROR);
    }
    apiKeyEncrypted = serializeEncryptedSecret(encryptSecret(apiKey));
    apiKeyPreview = previewSecret(apiKey);
  }

  return normalizeStoredLine({
    id: line.id,
    enabled: line.enabled,
    providerType: line.providerType,
    protocol: normalizeProviderType(line.providerType),
    label: line.label,
    baseUrl,
    model,
    modelOptions: line.modelOptions,
    ...(apiKeyEncrypted ? { apiKeyEncrypted } : {}),
    ...(apiKeyPreview ? { apiKeyPreview } : {}),
    ...(line.providerType === "anthropic"
      ? { anthropicVersion: line.anthropicVersion?.trim() || "2023-06-01" }
      : {}),
  });
}

export async function updateAiProviderSettings(
  input: unknown,
  store: AppConfigStore = createPrismaAppConfigStore(),
) {
  const parsed = updateSettingsSchema.parse(input);
  const before = await getStoredAiProviderSettings(store);
  const normalized: AiProviderSettings = {
    version: 2,
    primary: normalizeUpdateLine(parsed.primary, before.primary, "primary"),
    backup: normalizeUpdateLine(parsed.backup, before.backup, "backup"),
    fallbackPolicy: parsed.fallbackPolicy,
  };

  await store.upsert(normalized);
  return toSafeAiProviderSettings(normalized);
}

export async function getRuntimeAiProviderSettings() {
  const settings = await getStoredAiProviderSettings();
  const providers: RuntimeAiProviderSetting[] = [];

  for (const line of [settings.primary, settings.backup]) {
    if (!line.enabled || !line.apiKeyEncrypted) continue;
    if (!line.baseUrl || !line.model) continue;

    providers.push({
      id: line.id,
      providerType: line.providerType,
      protocol: line.protocol,
      label: line.label,
      enabled: line.enabled,
      baseUrl: line.baseUrl,
      apiKey: decryptApiKey(line.apiKeyEncrypted),
      model: line.model,
      modelOptions: line.modelOptions,
      ...(line.anthropicVersion ? { anthropicVersion: line.anthropicVersion } : {}),
    });
  }

  return providers;
}

export async function getAiProviderApiKeyForTest(params: {
  providerId: string;
  temporaryApiKey?: string;
}) {
  const temporary = params.temporaryApiKey?.trim();
  if (temporary) return temporary;

  const settings = await getStoredAiProviderSettings();
  const line =
    params.providerId === "backup" || params.providerId === "anthropic"
      ? settings.backup
      : settings.primary;
  if (!line.apiKeyEncrypted) return "";
  return decryptApiKey(line.apiKeyEncrypted);
}

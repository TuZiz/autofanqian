import "server-only";

import { AuthApiError } from "@/lib/auth/errors";
import {
  getAlipayPaymentConfig,
  getDecryptedAlipayPrivateKey,
  type AlipayPaymentConfig,
} from "@/lib/payments/alipay-config";

export type AlipayRuntimeConfig = AlipayPaymentConfig & {
  privateKey: string;
};

function withEnvFallback(config: AlipayPaymentConfig): AlipayPaymentConfig {
  return {
    ...config,
    appId: config.appId || process.env.ALIPAY_APP_ID?.trim() || "",
    gateway: config.gateway || process.env.ALIPAY_GATEWAY?.trim() || "",
    returnUrl: config.returnUrl || process.env.ALIPAY_RETURN_URL?.trim() || "",
    notifyUrl: config.notifyUrl || process.env.ALIPAY_NOTIFY_URL?.trim() || "",
    alipayPublicKey: config.alipayPublicKey || process.env.ALIPAY_PUBLIC_KEY?.trim() || "",
  };
}

function assertConfigComplete(config: AlipayRuntimeConfig) {
  const missing: string[] = [];
  if (!config.appId) missing.push("APP_ID");
  if (!config.gateway) missing.push("网关地址");
  if (!config.privateKey) missing.push("应用私钥");
  if (!config.alipayPublicKey) missing.push("支付宝公钥");

  if (missing.length > 0) {
    throw new AuthApiError(500, `支付宝支付配置不完整：${missing.join("、")}。`);
  }
}

export async function getAlipayRuntimeConfig() {
  const stored = await getAlipayPaymentConfig();
  const config = withEnvFallback(stored);

  if (!config.enabled) {
    throw new AuthApiError(400, "支付宝支付未启用");
  }

  const privateKey = (await getDecryptedAlipayPrivateKey()) || process.env.ALIPAY_PRIVATE_KEY?.trim() || "";
  const runtimeConfig: AlipayRuntimeConfig = {
    ...config,
    privateKey,
  };

  assertConfigComplete(runtimeConfig);
  return runtimeConfig;
}

export async function assertAlipayPaymentAvailable() {
  await getAlipayRuntimeConfig();
  return { available: true as const };
}

export async function createAlipayOrderPreview() {
  const config = await getAlipayRuntimeConfig();

  return {
    provider: "alipay" as const,
    mode: config.sandbox ? "sandbox" as const : "production" as const,
    gateway: config.gateway,
    signType: config.signType,
    ready: true as const,
  };
}

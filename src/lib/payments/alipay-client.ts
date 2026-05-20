import "server-only";

import { createSign, createVerify } from "node:crypto";

import { AuthApiError } from "@/lib/auth/errors";
import {
  getAlipayPaymentConfig,
  getDecryptedAlipayPrivateKey,
  type AlipayPaymentConfig,
} from "@/lib/payments/alipay-config";

export type AlipayRuntimeConfig = AlipayPaymentConfig & {
  privateKey: string;
};

export type AlipayNotifyParams = Record<string, string>;

type CreateAlipayPagePayParams = {
  outTradeNo: string;
  subject: string;
  amountCents: number;
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

function normalizePemKey(key: string, type: "private" | "public") {
  const trimmed = key.trim();
  if (trimmed.includes("BEGIN ")) return trimmed;

  const header = type === "private" ? "-----BEGIN PRIVATE KEY-----" : "-----BEGIN PUBLIC KEY-----";
  const footer = type === "private" ? "-----END PRIVATE KEY-----" : "-----END PUBLIC KEY-----";
  const body = trimmed
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "")
    .match(/.{1,64}/g)
    ?.join("\n");

  return `${header}\n${body ?? ""}\n${footer}`;
}

function encodeBizContent(value: unknown) {
  return JSON.stringify(value);
}

function createSignContent(params: Record<string, string | undefined | null>) {
  return Object.entries(params)
    .filter(([key, value]) => key !== "sign" && key !== "sign_type" && value !== undefined && value !== null && value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

function signParams(params: Record<string, string>, privateKey: string) {
  const signer = createSign("RSA-SHA256");
  signer.update(createSignContent(params), "utf8");
  signer.end();
  return signer.sign(normalizePemKey(privateKey, "private"), "base64");
}

export function verifyAlipayNotifySignature(params: AlipayNotifyParams, alipayPublicKey: string) {
  if (!params.sign) return false;

  try {
    const verifier = createVerify("RSA-SHA256");
    verifier.update(createSignContent(params), "utf8");
    verifier.end();
    return verifier.verify(normalizePemKey(alipayPublicKey, "public"), params.sign, "base64");
  } catch {
    return false;
  }
}

function formatAmount(amountCents: number) {
  return (amountCents / 100).toFixed(2);
}

export function amountYuanToCents(value: string) {
  const normalized = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [yuan, cents = ""] = normalized.split(".");
  return Number(yuan) * 100 + Number(cents.padEnd(2, "0"));
}

export async function createAlipayPagePayUrl(params: CreateAlipayPagePayParams) {
  const config = await getAlipayRuntimeConfig();
  const requestParams: Record<string, string> = {
    app_id: config.appId,
    method: "alipay.trade.page.pay",
    format: "JSON",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
    version: "1.0",
    return_url: config.returnUrl,
    notify_url: config.notifyUrl,
    biz_content: encodeBizContent({
      out_trade_no: params.outTradeNo,
      product_code: "FAST_INSTANT_TRADE_PAY",
      total_amount: formatAmount(params.amountCents),
      subject: params.subject,
    }),
  };

  requestParams.sign = signParams(requestParams, config.privateKey);

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(requestParams)) {
    search.set(key, value);
  }

  return `${config.gateway}?${search.toString()}`;
}

export async function verifyAlipayNotify(params: AlipayNotifyParams) {
  const config = await getAlipayRuntimeConfig();
  return verifyAlipayNotifySignature(params, config.alipayPublicKey);
}

export async function queryAlipayTrade(outTradeNo: string) {
  if (!outTradeNo.trim()) {
    throw new AuthApiError(400, "缺少支付宝商户订单号。");
  }

  await getAlipayRuntimeConfig();
  throw new AuthApiError(501, "支付宝主动查询接口已预留，尚未接入。");
}

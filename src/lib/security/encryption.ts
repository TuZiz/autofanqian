import "server-only";

import { createHash, createDecipheriv, createCipheriv, randomBytes } from "node:crypto";

import { AuthApiError } from "@/lib/auth/errors";

export type EncryptedSecret = {
  alg: "aes-256-gcm";
  iv: string;
  tag: string;
  data: string;
};

const ALGORITHM = "aes-256-gcm";

function getRawEncryptionKey() {
  return process.env.SETTINGS_ENCRYPTION_KEY?.trim() ?? "";
}

function deriveEncryptionKey() {
  const rawKey = getRawEncryptionKey();
  if (!rawKey || Buffer.byteLength(rawKey, "utf8") < 32) {
    throw new AuthApiError(500, "服务器未配置 SETTINGS_ENCRYPTION_KEY，无法安全保存支付私钥。");
  }

  return createHash("sha256").update(rawKey, "utf8").digest();
}

export function hasEncryptionKey() {
  const rawKey = getRawEncryptionKey();
  return Buffer.byteLength(rawKey, "utf8") >= 32;
}

export function encryptSecret(plainText: string): EncryptedSecret {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, deriveEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);

  return {
    alg: ALGORITHM,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: encrypted.toString("base64"),
  };
}

export function decryptSecret(secret: EncryptedSecret): string {
  try {
    if (secret.alg !== ALGORITHM) {
      throw new Error("Unsupported encryption algorithm.");
    }

    const decipher = createDecipheriv(
      ALGORITHM,
      deriveEncryptionKey(),
      Buffer.from(secret.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(secret.tag, "base64"));

    return Buffer.concat([
      decipher.update(Buffer.from(secret.data, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new AuthApiError(500, "敏感配置解密失败，请检查服务器加密密钥。");
  }
}

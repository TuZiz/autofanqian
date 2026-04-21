import { z } from "zod";
import { zhCN } from "@/lib/copy/zh-cn";

const emailSchema = z
  .string()
  .trim()
  .min(1, zhCN.auth.validation.emailRequired)
  .email(zhCN.auth.validation.emailInvalid)
  .transform((value) => value.toLowerCase());

const passwordSchema = z
  .string()
  .min(6, zhCN.auth.validation.passwordMin);

const loginPasswordSchema = z
  .string()
  .min(1, zhCN.auth.validation.passwordRequired);

const codeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, zhCN.auth.validation.codeInvalid);

export const sendCodeSchema = z.object({
  email: emailSchema,
});

export const registerConfirmSchema = z.object({
  email: emailSchema,
  code: codeSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
});

export const passwordResetSchema = z.object({
  email: emailSchema,
  code: codeSchema,
  newPassword: passwordSchema,
});

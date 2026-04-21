import "server-only";

import nodemailer from "nodemailer";
import type { EmailVerificationPurpose } from "@prisma/client";

import { zhCN } from "@/lib/copy/zh-cn";

const globalForMailer = globalThis as unknown as {
  authMailer?: nodemailer.Transporter;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(zhCN.auth.error.envMissing(name));
  }

  return value;
}

function getMailerTransport() {
  if (globalForMailer.authMailer) {
    return globalForMailer.authMailer;
  }

  const host = getRequiredEnv("MAIL_HOST");
  const port = Number(getRequiredEnv("MAIL_PORT"));
  const scheme = process.env.MAIL_SCHEME?.toLowerCase();
  const secure = scheme === "smtps" || port === 465;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: getRequiredEnv("MAIL_USERNAME"),
      pass: getRequiredEnv("MAIL_PASSWORD"),
    },
  });

  globalForMailer.authMailer = transporter;

  return transporter;
}

function buildEmailContent(
  purpose: EmailVerificationPurpose,
  code: string,
  fromName: string
) {
  if (purpose === "register") {
    return {
      subject: zhCN.auth.mail.registerSubject(fromName),
      text: zhCN.auth.mail.registerText(code),
      html: zhCN.auth.mail.registerHtml(code),
    };
  }

  return {
    subject: zhCN.auth.mail.resetSubject(fromName),
    text: zhCN.auth.mail.resetText(code),
    html: zhCN.auth.mail.resetHtml(code),
  };
}

export async function sendVerificationCodeEmail({
  email,
  code,
  purpose,
}: {
  email: string;
  code: string;
  purpose: EmailVerificationPurpose;
}) {
  const transporter = getMailerTransport();
  const fromAddress = getRequiredEnv("MAIL_FROM_ADDRESS");
  const fromName = process.env.MAIL_FROM_NAME || "Tomato App";
  const content = buildEmailContent(purpose, code, fromName);

  await transporter.sendMail({
    from: `${fromName} <${fromAddress}>`,
    to: email,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });
}

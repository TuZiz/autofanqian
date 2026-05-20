import "server-only";

import { spawn } from "node:child_process";
import path from "node:path";

import type { DeployJob } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { readLocalBuildInfo } from "@/lib/system/version";

const MAX_LOG_LENGTH = 30_000;
const DEPLOY_RUNNER_PATH = path.join(process.cwd(), "scripts", "run-deploy-job.mjs");
const SENSITIVE_ENV_KEYS = [
  "DATABASE_URL",
  "SESSION_SECRET",
  "ALIPAY_PRIVATE_KEY",
  "SETTINGS_ENCRYPTION_KEY",
  "AI_API_KEY",
  "ARK_API_KEY",
  "ANTHROPIC_API_KEY",
];
const SENSITIVE_PATTERNS = [
  /postgres(?:ql)?:\/\/[^\s"']+/gi,
  /Bearer\s+[A-Za-z0-9._~+\-/]+=*/gi,
  /-----BEGIN [^-]+ PRIVATE KEY-----[\s\S]*?-----END [^-]+ PRIVATE KEY-----/gi,
];

function appendLog(existing: string, chunk: string) {
  const next = `${existing}${chunk}`;
  return next.length > MAX_LOG_LENGTH ? next.slice(next.length - MAX_LOG_LENGTH) : next;
}

export function sanitizeDeployLog(input: string) {
  let output = input;

  for (const key of SENSITIVE_ENV_KEYS) {
    const value = process.env[key];
    if (value) {
      output = output.split(value).join(`[${key}_HIDDEN]`);
    }
    output = output.replace(new RegExp(`(${key}\\s*=\\s*)[^\\s]+`, "gi"), `$1[已隐藏]`);
  }

  for (const pattern of SENSITIVE_PATTERNS) {
    output = output.replace(pattern, "[敏感信息已隐藏]");
  }

  return output;
}

async function updateJobLog(jobId: string, chunk: string) {
  const safeChunk = sanitizeDeployLog(chunk);
  const current = await prisma.deployJob.findUnique({ where: { id: jobId }, select: { log: true } });
  if (!current) return;

  await prisma.deployJob.update({
    where: { id: jobId },
    data: { log: appendLog(current.log, safeChunk) },
  });
}

export async function hasRunningDeployJob() {
  const running = await prisma.deployJob.findFirst({
    where: { status: "running" },
    orderBy: { startedAt: "desc" },
    select: { id: true },
  });
  return running;
}

export async function startDeployJob(job: DeployJob) {
  const before = await readLocalBuildInfo();
  await prisma.deployJob.update({
    where: { id: job.id },
    data: {
      currentVersion: before.version,
      commitBefore: before.commit,
      log: appendLog(job.log, `[deploy] start ${new Date().toISOString()}\n[deploy] script scripts/deploy.sh\n`),
    },
  });

  const child = spawn(process.execPath, [DEPLOY_RUNNER_PATH, job.id], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      APP_DIR: process.env.APP_DIR || process.cwd(),
      BRANCH: process.env.BRANCH || "main",
      APP_NAME: process.env.APP_NAME || "autofanqian",
    },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });

  child.stdout.on("data", (data: Buffer) => {
    void updateJobLog(job.id, data.toString("utf8"));
  });

  child.stderr.on("data", (data: Buffer) => {
    void updateJobLog(job.id, data.toString("utf8"));
  });

  child.on("error", (error) => {
    void prisma.deployJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        error: sanitizeDeployLog(error.message),
        finishedAt: new Date(),
      },
    });
  });

  child.unref();
}

export function toSafeDeployJob(job: DeployJob) {
  return {
    id: job.id,
    status: job.status,
    currentVersion: job.currentVersion,
    targetVersion: job.targetVersion,
    commitBefore: job.commitBefore,
    commitAfter: job.commitAfter,
    log: sanitizeDeployLog(job.log).slice(-8000),
    error: job.error ? sanitizeDeployLog(job.error) : null,
    startedAt: job.startedAt.toISOString(),
    finishedAt: job.finishedAt?.toISOString() ?? null,
  };
}

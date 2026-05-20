import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

const jobId = process.argv[2];
const cwd = process.cwd();
const deployScriptPath = path.join(cwd, "scripts", "deploy.sh");
const maxLogLength = 30_000;
const sensitiveEnvKeys = [
  "DATABASE_URL",
  "SESSION_SECRET",
  "ALIPAY_PRIVATE_KEY",
  "SETTINGS_ENCRYPTION_KEY",
  "AI_API_KEY",
  "ARK_API_KEY",
  "ANTHROPIC_API_KEY",
];
const sensitivePatterns = [
  /postgres(?:ql)?:\/\/[^\s"']+/gi,
  /Bearer\s+[A-Za-z0-9._~+\-/]+=*/gi,
  /-----BEGIN [^-]+ PRIVATE KEY-----[\s\S]*?-----END [^-]+ PRIVATE KEY-----/gi,
];

if (!jobId) {
  throw new Error("DEPLOY_JOB_ID is required.");
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function sanitizeDeployLog(input) {
  let output = input;

  for (const key of sensitiveEnvKeys) {
    const value = process.env[key];
    if (value) {
      output = output.split(value).join(`[${key}_HIDDEN]`);
    }
    output = output.replace(new RegExp(`(${key}\\s*=\\s*)[^\\s]+`, "gi"), "$1[已隐藏]");
  }

  for (const pattern of sensitivePatterns) {
    output = output.replace(pattern, "[敏感信息已隐藏]");
  }

  return output;
}

function appendLog(existing, chunk) {
  const next = `${existing}${chunk}`;
  return next.length > maxLogLength ? next.slice(next.length - maxLogLength) : next;
}

async function updateJob(data) {
  const keys = Object.keys(data);
  if (keys.length === 0) return;
  const assignments = keys.map((key, index) => `"${key}" = $${index + 2}`).join(", ");
  await pool.query(`UPDATE "DeployJob" SET ${assignments} WHERE "id" = $1`, [jobId, ...keys.map((key) => data[key])]);
}

async function finishJob(data) {
  const keys = Object.keys(data);
  if (keys.length === 0) return;
  const assignments = keys.map((key, index) => `"${key}" = $${index + 2}`).join(", ");
  await pool.query(`UPDATE "DeployJob" SET ${assignments} WHERE "id" = $1 AND "status" = 'running'`, [
    jobId,
    ...keys.map((key) => data[key]),
  ]);
}

async function appendJobLog(chunk) {
  const safeChunk = sanitizeDeployLog(chunk);
  const result = await pool.query('SELECT "log" FROM "DeployJob" WHERE "id" = $1', [jobId]);
  const currentLog = result.rows[0]?.log ?? "";
  await updateJob({ log: appendLog(currentLog, safeChunk) });
}

async function readBuildInfo() {
  try {
    const raw = await readFile(path.join(cwd, "public", "build-info.json"), "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function main() {
  await appendJobLog(`[deploy] runner started ${new Date().toISOString()}\n`);

  const child = spawn("bash", [deployScriptPath], {
    cwd,
    env: {
      ...process.env,
      APP_DIR: process.env.APP_DIR || cwd,
      BRANCH: process.env.BRANCH || "main",
      APP_NAME: process.env.APP_NAME || "autofanqian",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (data) => {
    void appendJobLog(data.toString("utf8"));
  });

  child.stderr.on("data", (data) => {
    void appendJobLog(data.toString("utf8"));
  });

  const code = await new Promise((resolve) => {
    child.on("error", async (error) => {
      await appendJobLog(`[deploy] failed to start: ${error.message}\n`);
      resolve(1);
    });
    child.on("close", resolve);
  });

  const buildInfo = await readBuildInfo();
  await appendJobLog(`[deploy] finished with code ${code ?? "unknown"}\n`);
  await finishJob({
    status: code === 0 ? "success" : "failed",
    targetVersion: buildInfo.version ?? null,
    commitAfter: buildInfo.commit ?? null,
    error: code === 0 ? null : `deploy.sh exited with code ${code ?? "unknown"}`,
    finishedAt: new Date(),
  });
}

main()
  .catch(async (error) => {
    const message = error instanceof Error ? error.message : String(error);
    await finishJob({ status: "failed", error: sanitizeDeployLog(message), finishedAt: new Date() }).catch(() => {});
  })
  .finally(async () => {
    await pool.end();
  });

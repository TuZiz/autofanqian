import "dotenv/config";

import { runPendingGenerationJobs } from "../src/lib/jobs/generation-job-runner.ts";

const DEFAULT_INTERVAL_MS = 15_000;
const DEFAULT_BATCH_SIZE = 5;

function readPositiveInt(name, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  if (!Number.isFinite(value) || value < min) return fallback;
  return Math.min(value, max);
}

const intervalMs = readPositiveInt("GENERATION_WORKER_INTERVAL_MS", DEFAULT_INTERVAL_MS, {
  min: 10_000,
  max: 30_000,
});
const batchSize = readPositiveInt("GENERATION_WORKER_BATCH_SIZE", DEFAULT_BATCH_SIZE, {
  min: 1,
  max: 20,
});

let stopping = false;

function log(message, extra = {}) {
  const suffix = Object.keys(extra).length ? ` ${JSON.stringify(extra)}` : "";
  console.log(`[generation-worker] ${new Date().toISOString()} ${message}${suffix}`);
}

async function runOnce() {
  const startedAt = Date.now();
  try {
    const result = await runPendingGenerationJobs({ limit: batchSize });
    const succeeded = result.results.filter((item) => item.status === "succeeded").length;
    const failed = result.results.filter((item) => item.status === "failed").length;
    const skipped = result.results.filter((item) => item.status === "skipped").length;
    log("tick completed", {
      scanned: result.scanned,
      succeeded,
      failed,
      skipped,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    log("tick failed", {
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startedAt,
    });
  }
}

function installShutdownSignal(signal) {
  process.once(signal, () => {
    stopping = true;
    log(`${signal} received, stopping after current tick`);
  });
}

installShutdownSignal("SIGINT");
installShutdownSignal("SIGTERM");

log("started", { intervalMs, batchSize });

while (!stopping) {
  await runOnce();
  if (stopping) break;
  await new Promise((resolve) => setTimeout(resolve, intervalMs));
}

log("stopped");

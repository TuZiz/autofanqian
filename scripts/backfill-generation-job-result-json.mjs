import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const supportedActions = ["chapter.consistency_check", "chapter.quality_check"];
const batchSize = 100;

function readArgValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const mode = process.argv.includes("--apply")
  ? "apply"
  : process.argv.includes("--dry-run")
    ? "dry-run"
    : null;
const requestedAction = readArgValue("--action");
const limitArg = readArgValue("--limit");
const limit =
  typeof limitArg === "string" && limitArg.trim()
    ? Number.parseInt(limitArg, 10)
    : undefined;
const actions =
  requestedAction && supportedActions.includes(requestedAction)
    ? [requestedAction]
    : requestedAction
      ? []
      : supportedActions;

if (!mode || !actions.length || (limitArg && (!Number.isFinite(limit) || limit <= 0))) {
  console.error(
    "Usage: node scripts/backfill-generation-job-result-json.mjs --dry-run|--apply [--limit N] [--action chapter.quality_check|chapter.consistency_check]",
  );
  process.exitCode = 1;
  await prisma.$disconnect();
  process.exit();
}

function clampScore(value) {
  const score = Number.parseInt(String(value), 10);
  if (!Number.isFinite(score)) return null;
  return Math.max(0, Math.min(100, score));
}

function parseScore(summary) {
  const match = summary?.match(/\bscore=(\d{1,3})\b/);
  return match ? clampScore(match[1]) : null;
}

function parseJsonMarker(summary) {
  const match = summary?.match(/\bJSON=(\{[\s\S]*\})\s*$/);
  if (!match?.[1]) return null;
  try {
    const parsed = JSON.parse(match[1]);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function stringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

function parseResultJson(job) {
  const score = parseScore(job.resultSummary);
  const marker = parseJsonMarker(job.resultSummary);
  if (job.action === "chapter.consistency_check") {
    if (score === null && !marker) return null;
    return {
      score: score ?? clampScore(marker?.score ?? 0) ?? 0,
      issues: stringArray(marker?.issues),
    };
  }

  if (job.action === "chapter.quality_check") {
    if (!marker && score === null) return null;
    return {
      score: score ?? clampScore(marker?.score ?? 0) ?? 0,
      rhythm: clampScore(marker?.rhythm ?? 0) ?? 0,
      hook: clampScore(marker?.hook ?? 0) ?? 0,
      emotion: clampScore(marker?.emotion ?? 0) ?? 0,
      conflict: clampScore(marker?.conflict ?? 0) ?? 0,
      issues: stringArray(marker?.issues),
      suggestions: stringArray(marker?.suggestions),
    };
  }

  return null;
}

function countByAction(items) {
  return items.reduce((acc, item) => {
    acc[item.job.action] = (acc[item.job.action] ?? 0) + 1;
    return acc;
  }, {});
}

async function collectBackfillJobs() {
  const jobs = await prisma.generationJob.findMany({
    where: {
      action: { in: actions },
      resultJson: { equals: null },
      resultSummary: { not: null },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      id: true,
      action: true,
      resultSummary: true,
    },
  });

  return jobs
    .map((job) => ({ job, resultJson: parseResultJson(job) }))
    .filter((item) => item.resultJson !== null);
}

async function main() {
  const candidates = await collectBackfillJobs();
  const byAction = countByAction(candidates);
  console.log(
    `[${mode}] ${candidates.length} GenerationJob rows can be backfilled with resultJson.`,
  );
  for (const action of supportedActions) {
    if (!actions.includes(action)) continue;
    console.log(`[${mode}] ${action}: ${byAction[action] ?? 0}`);
  }

  if (mode === "dry-run") return;

  for (let index = 0; index < candidates.length; index += batchSize) {
    const batch = candidates.slice(index, index + batchSize);
    await Promise.all(
      batch.map(async ({ job, resultJson }) => {
        try {
          await prisma.generationJob.update({
            where: { id: job.id },
            data: { resultJson },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`skip ${job.id}: ${message}`);
        }
      }),
    );
    console.log(`updated ${Math.min(index + batch.length, candidates.length)}/${candidates.length}`);
  }
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}

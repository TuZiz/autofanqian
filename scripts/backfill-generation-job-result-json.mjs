import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const mode = process.argv.includes("--apply")
  ? "apply"
  : process.argv.includes("--dry-run")
    ? "dry-run"
    : null;
const actions = ["chapter.consistency_check", "chapter.quality_check"];
const batchSize = 100;

if (!mode) {
  console.error("Usage: node scripts/backfill-generation-job-result-json.mjs --dry-run|--apply");
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

function parseResultJson(job) {
  const score = parseScore(job.resultSummary);
  if (job.action === "chapter.consistency_check") {
    if (score === null) return null;
    return {
      score,
      issues: [],
    };
  }

  if (job.action === "chapter.quality_check") {
    const marker = parseJsonMarker(job.resultSummary);
    if (!marker && score === null) return null;
    return {
      score: score ?? 0,
      rhythm: clampScore(marker?.rhythm ?? 0) ?? 0,
      hook: clampScore(marker?.hook ?? 0) ?? 0,
      emotion: clampScore(marker?.emotion ?? 0) ?? 0,
      conflict: clampScore(marker?.conflict ?? 0) ?? 0,
      issues: Array.isArray(marker?.issues)
        ? marker.issues.filter((item) => typeof item === "string")
        : [],
      suggestions: Array.isArray(marker?.suggestions)
        ? marker.suggestions.filter((item) => typeof item === "string")
        : [],
    };
  }

  return null;
}

async function collectBackfillJobs() {
  const jobs = await prisma.generationJob.findMany({
    where: {
      action: { in: actions },
      resultJson: { equals: null },
      resultSummary: { not: null },
    },
    orderBy: { createdAt: "asc" },
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
  console.log(
    `[${mode}] ${candidates.length} GenerationJob rows can be backfilled with resultJson.`,
  );

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

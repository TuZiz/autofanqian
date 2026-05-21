import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  assertMembershipAiUsageAvailable,
  assertMembershipCountAvailable,
} from "../src/lib/membership/rules.ts";

process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/test";

const rootDir = process.cwd();

function read(relativePath) {
  return readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assertBefore(source, before, after, label) {
  const beforeIndex = source.indexOf(before);
  const afterIndex = source.indexOf(after);
  assert.notEqual(beforeIndex, -1, `${label}: missing ${before}`);
  assert.notEqual(afterIndex, -1, `${label}: missing ${after}`);
  assert.ok(beforeIndex < afterIndex, `${label}: expected ${before} before ${after}`);
}

function makeLimits(overrides) {
  return {
    tier: overrides.tier ?? "default",
    label: overrides.label ?? "Free",
    dailyAiCalls: overrides.dailyAiCalls,
    dailyTokens: overrides.dailyTokens ?? 30_000,
    minuteAiCalls: overrides.minuteAiCalls ?? 1,
    maxWorks: overrides.maxWorks ?? 3,
    maxChaptersPerWork: overrides.maxChaptersPerWork ?? 20,
    dailyShortStoryOutlines: overrides.dailyShortStoryOutlines ?? 3,
    dailyLongNovelOutlines: overrides.dailyLongNovelOutlines ?? 1,
    dailyIdeaGenerations: overrides.dailyIdeaGenerations ?? 10,
    dailyIdeaAnalyses: overrides.dailyIdeaAnalyses ?? 10,
    dailyChapterGenerations: overrides.dailyChapterGenerations ?? 10,
    dailyChapterSummaries: overrides.dailyChapterSummaries ?? 10,
    dailyChapterOutlines: overrides.dailyChapterOutlines ?? 10,
    dailyChapterDetails: overrides.dailyChapterDetails ?? 10,
  };
}

function makeUpstreamResult(overrides = {}) {
  return {
    ok: true,
    text: "ok",
    status: 200,
    routeId: "test-route",
    providerId: "test-provider",
    modelUsed: "test-model",
    usage: {
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
    },
    durationMs: 123,
    ...overrides,
  };
}

function makeFinalizeClient(options = {}) {
  const events = [];
  const counters = [];
  const updates = [];
  const fallbackUpdates = [];
  const aiUsageCounter = {
    async upsert(args) {
      counters.push(args);
      return { id: `counter-${counters.length}` };
    },
  };
  const client = {
    async $transaction(fn) {
      if (options.failTransactionBeforeCallback) {
        throw new Error("transaction failed");
      }

      return fn({
        aiUsageEvent: {
          async create(args) {
            if (options.failUsageCreate) {
              throw new Error("usage create failed");
            }
            events.push(args.data);
            return { id: `event-${events.length}` };
          },
        },
        aiUsageCounter,
        aiQuotaReservation: {
          async findUnique() {
            return { status: options.status ?? "pending" };
          },
          async update(args) {
            updates.push(args.data.status);
            return { id: "reservation-1" };
          },
        },
      });
    },
    aiUsageEvent: {
      async create(args) {
        events.push(args.data);
        return { id: `event-${events.length}` };
      },
    },
    aiUsageCounter,
    aiQuotaReservation: {
      async updateMany(args) {
        fallbackUpdates.push(args.data.status);
        return { count: 1 };
      },
    },
  };

  return { client, events, counters, updates, fallbackUpdates };
}

test("default membership tier is displayed as Free without enum rename", () => {
  const groupsSource = read("src/lib/auth/user-groups.ts");
  assert.match(groupsSource, /membershipTierValues = \["default", "plus", "pro", "max"\] as const/);
  assert.match(groupsSource, /default: "Free"/);
  assert.doesNotMatch(groupsSource, /default: "Default"/);
});

test("membership limits define Free, Plus, Pro and Max quotas", () => {
  const limitsSource = read("src/lib/membership/limits.ts");

  assert.match(limitsSource, /default: \{[\s\S]*dailyAiCalls: 10/);
  assert.match(limitsSource, /default: \{[\s\S]*dailyTokens: 30_000/);
  assert.match(limitsSource, /default: \{[\s\S]*dailyShortStoryOutlines: 3/);
  assert.match(limitsSource, /default: \{[\s\S]*dailyLongNovelOutlines: 1/);
  assert.match(limitsSource, /default: \{[\s\S]*dailyIdeaGenerations: 10/);
  assert.match(limitsSource, /default: \{[\s\S]*dailyIdeaAnalyses: 10/);
  assert.match(limitsSource, /default: \{[\s\S]*dailyChapterGenerations: 10/);
  assert.match(limitsSource, /default: \{[\s\S]*dailyChapterSummaries: 10/);
  assert.match(limitsSource, /default: \{[\s\S]*dailyChapterOutlines: 10/);
  assert.match(limitsSource, /default: \{[\s\S]*dailyChapterDetails: 10/);

  assert.match(limitsSource, /plus: \{[\s\S]*dailyAiCalls: 100/);
  assert.match(limitsSource, /plus: \{[\s\S]*dailyIdeaGenerations: 100/);
  assert.match(limitsSource, /pro: \{[\s\S]*dailyAiCalls: 500/);
  assert.match(limitsSource, /pro: \{[\s\S]*dailyChapterGenerations: 500/);
  assert.match(limitsSource, /max: \{[\s\S]*dailyAiCalls: 3_000/);
  assert.match(limitsSource, /max: \{[\s\S]*dailyChapterDetails: 3_000/);
  assert.match(limitsSource, /maxWorks: -1/);
  assert.match(limitsSource, /maxChaptersPerWork: -1/);
  assert.match(limitsSource, /MEMBERSHIP_LIMITS_CONFIG_KEY = "membership_limits"/);
});

test("quota and membership guards return 429 and keep admins unlimited", () => {
  const quotaSource = read("src/lib/ai/quota.ts");
  const guardsSource = read("src/lib/membership/guards.ts");
  const rulesSource = read("src/lib/membership/rules.ts");

  assert.match(quotaSource, /if \(isAdminUser\(user\)\) return/);
  assert.match(guardsSource, /if \(isAdminUser\(user\)\) return/);
  assert.match(rulesSource, /new AuthApiError\(\s*429,[\s\S]*今日 AI 调用次数已用完/);
  assert.match(rulesSource, /throw new AuthApiError\(429, params\.message\(params\.limit\)\)/);
  assert.match(guardsSource, /new AuthApiError\(\s*429,[\s\S]*今日.*次数已用完/);
});

test("default user exceeding dailyAiCalls receives 429", () => {
  const limits = makeLimits({ dailyAiCalls: 10, label: "Free" });

  assert.throws(
    () =>
      assertMembershipAiUsageAvailable(limits, {
        activeJobs: 0,
        dailyCalls: 10,
        dailyTokens: 0,
        minuteCalls: 0,
      }),
    (error) =>
      error?.status === 429 &&
      error?.message === "Free 今日 AI 调用次数已用完，请升级套餐或明天再试。",
  );
});

test("plus, pro and max use their own dailyAiCalls quotas", () => {
  const tiers = [
    makeLimits({ tier: "plus", label: "Plus", dailyAiCalls: 100, minuteAiCalls: 3 }),
    makeLimits({ tier: "pro", label: "Pro", dailyAiCalls: 500, minuteAiCalls: 8 }),
    makeLimits({ tier: "max", label: "Max", dailyAiCalls: 3_000, minuteAiCalls: 20 }),
  ];

  for (const limits of tiers) {
    assert.doesNotThrow(() =>
      assertMembershipAiUsageAvailable(limits, {
        activeJobs: 0,
        dailyCalls: limits.dailyAiCalls - 1,
        dailyTokens: 0,
        minuteCalls: 0,
      }),
    );

    assert.throws(
      () =>
        assertMembershipAiUsageAvailable(limits, {
          activeJobs: 0,
          dailyCalls: limits.dailyAiCalls,
          dailyTokens: 0,
          minuteCalls: 0,
        }),
      (error) => error?.status === 429 && error?.message.includes(limits.label),
    );
  }
});

test("maxWorks=-1 skips work count limit", () => {
  assert.doesNotThrow(() =>
    assertMembershipCountAvailable({
      current: 999_999,
      limit: -1,
      message: () => "should not throw",
    }),
  );
});

test("membership guards enforce works, chapters and outline action limits server-side", () => {
  const guardsSource = read("src/lib/membership/guards.ts");
  const workRouteSource = read("src/app/api/works/route.ts");
  const shortWorkRouteSource = read("src/app/api/works/short-story/route.ts");
  const chapterRouteSource = read("src/backend/works/work-chapter-detail-route.ts");
  const outlineRouteSource = read("src/backend/ai/outline/generate-route.ts");
  const shortOutlineRouteSource = read("src/backend/ai/short-story/outline-route.ts");

  assert.match(guardsSource, /export async function assertCanCreateWork/);
  assert.match(guardsSource, /export async function assertCanCreateChapter/);
  assert.match(guardsSource, /export async function assertCanUseAiAction/);
  assert.match(guardsSource, /isUnlimitedMembershipLimit\(limits\.maxWorks\)/);
  assert.match(guardsSource, /isUnlimitedMembershipLimit\(limits\.maxChaptersPerWork\)/);
  assert.match(guardsSource, /prisma\.aiUsageEvent\.count/);
  assert.match(guardsSource, /prisma\.aiQuotaReservation\.count/);
  assert.match(guardsSource, /success: true/);

  assert.match(workRouteSource, /await assertCanCreateWork\(user\)/);
  assert.match(shortWorkRouteSource, /await assertCanCreateWork\(user\)/);
  assert.match(chapterRouteSource, /await assertCanCreateChapter\(user, work\.id/);
  assert.match(outlineRouteSource, /await assertCanUseAiAction\(user, "outline_generate"\)/);
  assert.match(shortOutlineRouteSource, /await assertCanUseAiAction\(user, "short_story_outline_generate"\)/);
});

test("membership guards define configurable limits for all billable AI actions", () => {
  const guardsSource = read("src/lib/membership/guards.ts");

  const expectedMappings = [
    ["idea_generate", "dailyIdeaGenerations"],
    ["idea_analyze", "dailyIdeaAnalyses"],
    ["chapter_generate", "dailyChapterGenerations"],
    ["chapter_summary", "dailyChapterSummaries"],
    ["chapter_outline", "dailyChapterOutlines"],
    ["chapter_details", "dailyChapterDetails"],
  ];

  for (const [action, limitKey] of expectedMappings) {
    assert.match(guardsSource, new RegExp(`params\\.action === "${action}"`));
    assert.match(guardsSource, new RegExp(`limit: params\\.${limitKey}`));
  }

  assert.match(guardsSource, /usedCount \+ pendingReservationCount >= actionLimit\.limit/);
});

test("retry, expand and repair actions roll up into their primary action limits", () => {
  const guardsSource = read("src/lib/membership/guards.ts");

  const expectedRollups = [
    ["idea_generate_expand", "dailyIdeaGenerations"],
    ["outline_generate_retry", "dailyLongNovelOutlines"],
    ["short_story_outline_generate_retry", "dailyShortStoryOutlines"],
    ["chapter_generate_length_repair", "dailyChapterGenerations"],
  ];

  for (const [action, limitKey] of expectedRollups) {
    assert.match(guardsSource, new RegExp(`params\\.action === "${action}"`));
    assert.match(guardsSource, new RegExp(`limit: params\\.${limitKey}`));
  }
});

test("AI quota reservations are schema-backed, expiring and concurrency-safe", () => {
  const schemaSource = read("prisma/schema.prisma");
  const quotaSource = read("src/lib/ai/quota.ts");

  assert.match(schemaSource, /enum AiQuotaReservationStatus/);
  assert.match(schemaSource, /model AiQuotaReservation/);
  assert.match(schemaSource, /committed_failed/);
  assert.match(schemaSource, /status\s+AiQuotaReservationStatus\s+@default\(pending\)/);
  assert.match(schemaSource, /expiresAt\s+DateTime/);
  assert.match(schemaSource, /@@index\(\[userId, status, expiresAt\]\)/);

  assert.match(quotaSource, /RESERVATION_TTL_MS = 5 \* 60_000/);
  assert.match(quotaSource, /Prisma\.TransactionIsolationLevel\.Serializable/);
  assert.match(quotaSource, /expiresAt: \{ gt: now \}/);
  assert.match(quotaSource, /\{ status: "pending", expiresAt: \{ gt: now \} \}/);
  assert.match(quotaSource, /\{ status: "pending", expiresAt: \{ gt: params\.now \} \}/);
  assert.match(quotaSource, /\{ status: "committed_failed" \}/);
  assert.match(quotaSource, /pendingMinuteReservations/);
  assert.match(quotaSource, /minuteCalls: Math\.max\(recentSuccessCount, minuteCounterUsage\.requestCount\) \+ pendingMinuteReservations/);
  assert.match(quotaSource, /dailyCalls: Math\.max\(successCallCount, dailyCounterUsage\.requestCount\) \+ pendingDailyReservations/);
});

test("AI quota reservations support idempotency and exclude the current generation job", () => {
  const schemaSource = read("prisma/schema.prisma");
  const quotaSource = read("src/lib/ai/quota.ts");
  const generateSource = read("src/backend/ai/chapter/generate-service.ts");
  const streamRouteSource = read("src/backend/ai/chapter/stream-route.ts");

  assert.match(schemaSource, /@@unique\(\[userId, action, idempotencyKey\]\)/);
  assert.match(quotaSource, /export type AiQuotaReservationOptions = \{/);
  assert.match(quotaSource, /idempotencyKey\?: string \| null/);
  assert.match(quotaSource, /estimatedOutputChars\?: number \| null/);
  assert.match(quotaSource, /excludeGenerationJobId\?: string \| null/);
  assert.match(quotaSource, /userId_action_idempotencyKey/);
  assert.match(quotaSource, /existingReservation\?\.status === "pending"/);
  assert.match(quotaSource, /existingReservation\?\.status === "committed"/);
  assert.match(quotaSource, /idempotencyKey,/);
  assert.match(quotaSource, /estimatedOutputChars,/);
  assert.match(quotaSource, /activeGenerationJobWhere\.id = \{ not: params\.excludeGenerationJobId \}/);
  assert.match(generateSource, /excludeGenerationJobId: generationJob\.id/);
  assert.match(generateSource, /idempotencyKey: input\.idempotencyKey \?\? null/);
  assert.match(streamRouteSource, /excludeGenerationJobId: generationJobId/);
  assert.match(streamRouteSource, /idempotencyKey: parsedBody\.data\.idempotencyKey \?\? null/);
});

test("completed generation idempotency returns the existing chapter result", () => {
  const jobSource = read("src/lib/ai/generation-jobs.ts");
  const generateSource = read("src/backend/ai/chapter/generate-service.ts");
  const routeSource = read("src/backend/ai/chapter/generate-route.ts");

  assert.match(jobSource, /export type BeginGenerationJobResult/);
  assert.match(jobSource, /kind: "completed"/);
  assert.match(jobSource, /existing\.status === "succeeded"/);
  assert.match(jobSource, /return \{ kind: "completed", job: existing \}/);
  assert.match(generateSource, /export async function getCompletedChapterGenerationResult/);
  assert.match(generateSource, /prisma\.generationJob\.findFirst/);
  assert.match(generateSource, /normalizeGenerationJobSuccessStatus\(generationJob\.status\) !== "succeeded"/);
  assert.match(generateSource, /serializeGeneratedChapter\(chapter\)/);
  assert.match(generateSource, /generationJobResult\.kind === "completed"/);
  assert.match(routeSource, /getCompletedChapterGenerationResult\(\{/);
  assertBefore(
    routeSource,
    "await assertCanCreateChapter(user, parsedBody.data.workId",
    "const cachedGeneration = await getCompletedChapterGenerationResult",
    "ownership before cached idempotency",
  );
  assertBefore(
    routeSource,
    "const cachedGeneration = await getCompletedChapterGenerationResult",
    "await assertAiQuotaAvailable(user);",
    "cached idempotency before quota",
  );
});

test("App Router AI routes delegate to backend quota-protected handlers", () => {
  const routeExpectations = [
    ["src/app/api/ai/idea/route.ts", "@/backend/ai/idea/generate-route"],
    ["src/app/api/ai/idea/analyze/route.ts", "@/backend/ai/idea/analyze-route"],
    ["src/app/api/ai/chapter/route.ts", "@/backend/ai/chapter/generate-route"],
    ["src/app/api/ai/chapter/summary/route.ts", "@/backend/ai/chapter/summary-route"],
    ["src/app/api/ai/chapter/outline/route.ts", "@/backend/ai/chapter/outline-route"],
    ["src/app/api/ai/chapter/details/route.ts", "@/backend/ai/chapter/details-route"],
  ];

  for (const [file, backendModule] of routeExpectations) {
    const source = read(file);
    assert.match(source, /export const runtime = "nodejs"/, `${file} must use node runtime`);
    assert.match(source, new RegExp(`export \\{ POST \\} from "${backendModule.replaceAll("/", "\\/")}"`));
    assert.doesNotMatch(source, /callAiText\(/, `${file} must not keep a legacy AI implementation`);
  }
});

test("quota checks happen before every explicit retry or expansion call", () => {
  const ideaSource = read("src/backend/ai/idea/generate-route.ts");
  const analyzeSource = read("src/backend/ai/idea/analyze-route.ts");
  const outlineSource = read("src/backend/ai/outline/generate-route.ts");
  const refineSource = read("src/backend/ai/outline/refine-route.ts");
  const shortOutlineSource = read("src/backend/ai/short-story/outline-route.ts");

  assert.ok((ideaSource.match(/await assertAiQuotaAvailable\(user\)/g) ?? []).length >= 2);
  assertBefore(
    ideaSource,
    "await assertAiQuotaAvailable(user);",
    'const second = await runWithAiQuotaReservation(user, "idea_generate_expand"',
    "idea expansion",
  );
  assert.match(ideaSource, /runWithAiQuotaReservation\(user, "idea_generate"[\s\S]*callAiText\(/);

  assert.ok((analyzeSource.match(/await assertAiQuotaAvailable\(user\)/g) ?? []).length >= 2);
  assertBefore(
    analyzeSource,
    "await assertAiQuotaAvailable(user);",
    'const second = await runWithAiQuotaReservation(user, "idea_analyze_retry"',
    "idea analyze retry",
  );
  assert.match(analyzeSource, /runWithAiQuotaReservation\(user, "idea_analyze"[\s\S]*callAiText\(/);

  assert.ok((outlineSource.match(/await assertAiQuotaAvailable\(user\)/g) ?? []).length >= 2);
  assertBefore(
    outlineSource,
    "await assertAiQuotaAvailable(user);",
    'const second = await runWithAiQuotaReservation(user, "outline_generate_retry"',
    "long outline retry",
  );
  assert.match(outlineSource, /runWithAiQuotaReservation\(user, "outline_generate"[\s\S]*callAiText\(/);

  assert.ok((refineSource.match(/await assertAiQuotaAvailable\(user\)/g) ?? []).length >= 2);
  assertBefore(
    refineSource,
    "await assertAiQuotaAvailable(user);",
    'const second = await runWithAiQuotaReservation(user, "outline_extend_retry"',
    "outline extend retry",
  );
  assert.match(refineSource, /runWithAiQuotaReservation\(user, "outline_extend"[\s\S]*callAiText\(/);

  assert.ok((shortOutlineSource.match(/await assertAiQuotaAvailable\(user\)/g) ?? []).length >= 2);
  assertBefore(
    shortOutlineSource,
    "await assertAiQuotaAvailable(user);",
    'const retry = await runWithAiQuotaReservation(user, "short_story_outline_generate_retry"',
    "short outline retry",
  );
  assert.match(shortOutlineSource, /runWithAiQuotaReservation\(user, "short_story_outline_generate"[\s\S]*callAiText\(/);
});

test("chapter metadata routes verify access before quota and AI calls", () => {
  const checks = [
    ["src/backend/ai/chapter/summary-route.ts", "chapter_summary"],
    ["src/backend/ai/chapter/outline-route.ts", "chapter_outline"],
    ["src/backend/ai/chapter/details-route.ts", "chapter_details"],
  ];

  for (const [file, action] of checks) {
    const source = read(file);
    assertBefore(source, "const work = await prisma.work.findUnique", "await assertAiQuotaAvailable(user);", file);
    assertBefore(
      source,
      `await assertCanUseAiAction(user, "${action}")`,
      `const result = await runWithAiQuotaReservation(user, "${action}"`,
      file,
    );
    assert.match(source, new RegExp(`runWithAiQuotaReservation\\(user, "${action}"`));
    assert.doesNotMatch(source, new RegExp(`action: \\\`${action}_\\$\\{body\\.index\\}`));
  }
});

test("chapter generation repair checks quota before optional repair AI call", () => {
  const repairSource = read("src/lib/ai/chapter-length-repair.ts");
  const generateSource = read("src/backend/ai/chapter/generate-service.ts");
  const streamPersistenceSource = read("src/backend/ai/chapter/stream-persistence.ts");

  assertBefore(repairSource, "await params.beforeRepairAiCall?.();", "const repairResult = await executeRepairAiCall", "repair quota");
  assert.match(generateSource, /beforeRepairAiCall: \(\) => assertAiQuotaAvailable\(user\)/);
  assert.match(generateSource, /runRepairAiCall: \(execute\) =>[\s\S]*runWithAiQuotaReservation\(user, "chapter_generate_length_repair", execute\)/);
  assert.match(streamPersistenceSource, /beforeRepairAiCall: \(\) => assertAiQuotaAvailable\(prepared\.user\)/);
  assert.match(streamPersistenceSource, /runWithAiQuotaReservation\([\s\S]*prepared\.user,[\s\S]*"chapter_generate_stream_length_repair"/);
});

test("AI quota reservation is committed on success and released on failure", () => {
  const quotaSource = read("src/lib/ai/quota.ts");

  assertBefore(
    quotaSource,
    "const reservation = await params.ops.reserve(user, action, params.options);",
    "result = await execute();",
    "reservation before upstream call",
  );
  const runSource = quotaSource.slice(quotaSource.indexOf("export async function runWithAiQuotaReservationUsingOps"));
  assertBefore(
    runSource,
    "result = await execute();",
    "await params.ops.finalize({",
    "finalization after upstream call",
  );
  assert.match(quotaSource, /export async function finalizeAiQuotaUsage/);
  assert.match(quotaSource, /await client\.\$transaction\(async \(tx\) =>/);
  assert.match(quotaSource, /await tx\.aiUsageEvent\.create/);
  assert.match(quotaSource, /incrementAiUsageCountersWithClient\(tx, usageParams\)/);
  assert.match(quotaSource, /await tx\.aiQuotaReservation\.update/);
  assert.match(quotaSource, /status: isSuccessfulAiResult\(result\) \? "committed" : "cancelled"/);
  assert.match(quotaSource, /status: "committed_failed"/);
  assert.match(quotaSource, /shouldPersistFailedUsage\(result\)/);
  assert.match(quotaSource, /console\.warn\("Failed to finalize AI quota usage:"/);
  assert.match(quotaSource, /await cancelAiQuotaReservation\(reservation\)/);
  assert.match(quotaSource, /if \(result\.ok && result\.text\)/);
  assert.match(quotaSource, /await commitAiQuotaReservation\(reservation\)/);
});

test("AI quota uses aggregate counters while keeping event audit logs", () => {
  const schemaSource = read("prisma/schema.prisma");
  const migrationSource = read("prisma/migrations/20260520165000_generation_jobs_and_usage_counters/migration.sql");
  const quotaSource = read("src/lib/ai/quota.ts");
  const usageLogSource = read("src/lib/ai/usage-log.ts");
  const counterSource = read("src/lib/ai/usage-counter.ts");

  assert.match(schemaSource, /model AiUsageCounter/);
  assert.match(schemaSource, /enum AiUsagePeriodType/);
  assert.match(schemaSource, /@@unique\(\[userId, periodType, periodKey, action\]\)/);
  assert.match(migrationSource, /CREATE TABLE "AiUsageCounter"/);
  assert.match(counterSource, /periodType: "minute"/);
  assert.match(counterSource, /periodType: "daily"/);
  assert.match(counterSource, /periodType: "monthly"/);
  assert.match(counterSource, /client\.aiUsageCounter\.upsert/);
  assert.match(quotaSource, /client\.aiUsageCounter\.findMany/);
  assert.match(quotaSource, /Math\.max\(successCallCount, dailyCounterUsage\.requestCount\)/);
  assert.match(usageLogSource, /await prisma\.\$transaction\(async \(tx\) =>/);
  assert.match(usageLogSource, /incrementAiUsageCountersWithClient\(tx, params\)/);
});

test("chapter generation uses durable DB jobs instead of in-memory duplicate locks", () => {
  const schemaSource = read("prisma/schema.prisma");
  const migrationSource = read("prisma/migrations/20260520165000_generation_jobs_and_usage_counters/migration.sql");
  const lockSource = read("src/lib/ai/chapter-generation-lock.ts");
  const jobSource = read("src/lib/ai/generation-jobs.ts");
  const generateSource = read("src/backend/ai/chapter/generate-service.ts");
  const streamPersistenceSource = read("src/backend/ai/chapter/stream-persistence.ts");
  const streamRouteSource = read("src/backend/ai/chapter/stream-route.ts");

  assert.match(schemaSource, /model GenerationJob/);
  assert.match(schemaSource, /activeLockKey\s+String\?/);
  assert.match(schemaSource, /@@unique\(\[activeLockKey\]\)/);
  assert.match(schemaSource, /idempotencyKey\s+String\?/);
  assert.match(schemaSource, /@@unique\(\[userId, action, idempotencyKey\]\)/);
  assert.match(schemaSource, /heartbeatAt\s+DateTime\?/);
  assert.match(migrationSource, /CREATE UNIQUE INDEX "GenerationJob_activeLockKey_key"/);
  assert.match(migrationSource, /CREATE UNIQUE INDEX "GenerationJob_active_chapter_generation_key"/);
  assert.doesNotMatch(lockSource, /ACTIVE_GENERATIONS/);
  assert.match(jobSource, /markStaleGenerationJobs/);
  assert.match(jobSource, /heartbeatAt: \{ lt: staleBefore \}/);
  assert.match(jobSource, /activeLockKey: null/);
  assert.match(jobSource, /P2002/);
  assert.match(generateSource, /beginGenerationJob\(\{/);
  assert.match(generateSource, /idempotencyKey: input\.idempotencyKey \?\? null/);
  assert.match(streamPersistenceSource, /beginGenerationJob\(\{/);
  assert.match(streamRouteSource, /idempotencyKey: parsedBody\.data\.idempotencyKey \?\? null/);
});

test("reservation finalization owns usage logging for protected AI calls", () => {
  const protectedFiles = [
    "src/backend/ai/idea/generate-route.ts",
    "src/backend/ai/idea/analyze-route.ts",
    "src/backend/ai/outline/generate-route.ts",
    "src/backend/ai/outline/refine-route.ts",
    "src/backend/ai/short-story/generate-route.ts",
    "src/backend/ai/short-story/outline-route.ts",
    "src/backend/ai/chapter/summary-route.ts",
    "src/backend/ai/chapter/outline-route.ts",
    "src/backend/ai/chapter/details-route.ts",
    "src/backend/ai/chapter/rewrite-route.ts",
  ];

  for (const file of protectedFiles) {
    const source = read(file);
    assert.doesNotMatch(source, /logAiUsage/, `${file} must not double-write usage`);
  }
});

test("reservation-protected AI actions are not followed by manual usage logging", () => {
  const protectedActions = [
    ["src/backend/ai/idea/generate-route.ts", "idea_generate"],
    ["src/backend/ai/idea/generate-route.ts", "idea_generate_expand"],
    ["src/backend/ai/idea/analyze-route.ts", "idea_analyze"],
    ["src/backend/ai/outline/generate-route.ts", "outline_generate"],
    ["src/backend/ai/outline/generate-route.ts", "outline_generate_retry"],
    ["src/backend/ai/short-story/generate-route.ts", "short_story_outline_generate"],
    ["src/backend/ai/short-story/outline-route.ts", "short_story_outline_generate"],
    ["src/backend/ai/short-story/outline-route.ts", "short_story_outline_generate_retry"],
    ["src/backend/ai/chapter/generate-service.ts", "chapter_generate"],
    ["src/backend/ai/chapter/summary-route.ts", "chapter_summary"],
    ["src/backend/ai/chapter/outline-route.ts", "chapter_outline"],
    ["src/backend/ai/chapter/details-route.ts", "chapter_details"],
  ];

  for (const [file, action] of protectedActions) {
    const source = read(file);
    const callIndex = source.search(
      new RegExp(`runWithAiQuotaReservation\\(\\s*user,\\s*"${action}"`),
    );
    assert.notEqual(callIndex, -1, `${file} must reserve quota for ${action}`);

    const nextProtectedCallIndex = source.indexOf("runWithAiQuotaReservation(", callIndex + 1);
    const searchEnd = nextProtectedCallIndex === -1 ? source.length : nextProtectedCallIndex;
    const blockAfterCall = source.slice(callIndex, searchEnd);
    assert.doesNotMatch(
      blockAfterCall,
      /logAiUsage\(/,
      `${file} must not log ${action} outside reservation finalization`,
    );
  }
});

test("chapter provider probes keep manual usage logging outside reserved generation calls", () => {
  const generateSource = read("src/backend/ai/chapter/generate-service.ts");
  const probeLogIndex = generateSource.indexOf("await logAiUsage({");
  const generationIndex = generateSource.search(
    /runWithAiQuotaReservation\(\s*user,\s*"chapter_generate"/,
  );

  assert.notEqual(probeLogIndex, -1);
  assert.ok(probeLogIndex < generationIndex);
  assertBefore(generateSource, "await logAiUsage({", "userId: null,", "chapter probe user id");
  assert.match(generateSource, /action: `chapter_generate_\$\{input\.index\}_probe`/);
});

test("quota finalization creates one usage event for one reserved successful call", async () => {
  const { finalizeAiQuotaUsageWithClient } = await import("../src/lib/ai/quota.ts");
  const { client, events, counters, updates, fallbackUpdates } = makeFinalizeClient();

  await finalizeAiQuotaUsageWithClient(client, {
    reservation: { id: "reservation-1", userId: "user-1", action: "idea_generate" },
    result: makeUpstreamResult(),
    action: "idea_generate",
    userId: "user-1",
  });

  assert.equal(events.length, 1);
  assert.equal(events[0].action, "idea_generate");
  assert.equal(events[0].success, true);
  assert.equal(counters.length, 3);
  assert.deepEqual(updates, ["committed"]);
  assert.deepEqual(fallbackUpdates, []);
});

test("runWithAiQuotaReservation success delegates to exactly one finalization", async () => {
  const { runWithAiQuotaReservationUsingOps } = await import("../src/lib/ai/quota.ts");
  const result = makeUpstreamResult();
  const calls = [];
  const user = {
    id: "user-1",
    email: "user@example.test",
    membershipTier: "default",
  };

  const returned = await runWithAiQuotaReservationUsingOps(
    user,
    "idea_generate",
    async () => result,
    {
      ops: {
        async reserve(reservedUser, action) {
          calls.push(["reserve", reservedUser.id, action]);
          return { id: "reservation-1", userId: reservedUser.id, action };
        },
        async finalize(params) {
          calls.push([
            "finalize",
            params.reservation?.id,
            params.action,
            params.userId,
            params.result,
          ]);
        },
        async cancel() {
          calls.push(["cancel"]);
        },
      },
    },
  );

  assert.equal(returned, result);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], ["reserve", "user-1", "idea_generate"]);
  assert.deepEqual(calls[1], [
    "finalize",
    "reservation-1",
    "idea_generate",
    "user-1",
    result,
  ]);
});

test("failed quota finalization with consumed tokens creates one failed usage event", async () => {
  const { finalizeAiQuotaUsageWithClient } = await import("../src/lib/ai/quota.ts");
  const { client, events, counters, updates, fallbackUpdates } = makeFinalizeClient();

  await finalizeAiQuotaUsageWithClient(client, {
    reservation: {
      id: "reservation-1",
      userId: "user-1",
      action: "chapter_summary",
    },
    result: makeUpstreamResult({
      ok: false,
      text: "",
      status: 502,
      usage: { inputTokens: 10, outputTokens: 2, totalTokens: 12 },
    }),
    action: "chapter_summary",
    userId: "user-1",
  });

  assert.equal(events.length, 1);
  assert.equal(events[0].action, "chapter_summary");
  assert.equal(events[0].success, false);
  assert.equal(events[0].totalTokens, 12);
  assert.equal(counters.length, 0);
  assert.deepEqual(updates, ["cancelled"]);
  assert.deepEqual(fallbackUpdates, []);
});

test("quota finalization transaction failure marks committed_failed without duplicate usage", async () => {
  const { finalizeAiQuotaUsageWithClient } = await import("../src/lib/ai/quota.ts");
  const { client, events, updates, fallbackUpdates } = makeFinalizeClient({
    failUsageCreate: true,
  });
  const originalWarn = console.warn;
  const warnings = [];
  console.warn = (...args) => {
    warnings.push(args);
  };

  try {
    await finalizeAiQuotaUsageWithClient(client, {
      reservation: {
        id: "reservation-1",
        userId: "user-1",
        action: "chapter_generate",
      },
      result: makeUpstreamResult(),
      action: "chapter_generate",
      userId: "user-1",
    });
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(events.length, 0);
  assert.deepEqual(updates, []);
  assert.deepEqual(fallbackUpdates, ["committed_failed"]);
  assert.equal(warnings.length, 1);
});

test("chapter generation and stream generation use aggregated action names", () => {
  const generateSource = read("src/backend/ai/chapter/generate-service.ts");
  const streamSource = read("src/backend/ai/chapter/stream-route.ts");

  assert.match(generateSource, /runWithAiQuotaReservation\(\s*user,\s*"chapter_generate"[\s\S]*callAiText\(/);
  assert.match(generateSource, /generated\.selectedProviderId = selected\.provider\.id/);
  assert.doesNotMatch(generateSource, /action: `chapter_generate_\$\{input\.index\}`/);
  assert.doesNotMatch(generateSource, /action: `chapter_generate_length_repair_\$\{input\.index\}`/);

  assert.match(streamSource, /reserveAiQuota\([\s\S]*"chapter_generate_stream"/);
  assert.match(streamSource, /finalizeAiQuotaUsage\(\{[\s\S]*action: "chapter_generate_stream"/);
  assert.doesNotMatch(streamSource, /action: `chapter_generate_stream_\$\{parsedBody\.data\.index\}`/);
  assert.doesNotMatch(streamSource, /settleAiQuotaReservation\(quotaReservation, usageResult\)/);
});

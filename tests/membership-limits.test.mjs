import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  assertMembershipAiUsageAvailable,
  assertMembershipCountAvailable,
} from "../src/lib/membership/rules.ts";

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
  };
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

  assert.match(limitsSource, /plus: \{[\s\S]*dailyAiCalls: 100/);
  assert.match(limitsSource, /pro: \{[\s\S]*dailyAiCalls: 500/);
  assert.match(limitsSource, /max: \{[\s\S]*dailyAiCalls: 3_000/);
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
  assert.match(guardsSource, /new AuthApiError\(\s*429,[\s\S]*今日.*生成次数已用完/);
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
  assert.match(guardsSource, /success: true/);

  assert.match(workRouteSource, /await assertCanCreateWork\(user\)/);
  assert.match(shortWorkRouteSource, /await assertCanCreateWork\(user\)/);
  assert.match(chapterRouteSource, /await assertCanCreateChapter\(user, work\.id/);
  assert.match(outlineRouteSource, /await assertCanUseAiAction\(user, "outline_generate"\)/);
  assert.match(shortOutlineRouteSource, /await assertCanUseAiAction\(user, "short_story_outline_generate"\)/);
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
    "const second = await callAiText",
    "idea expansion",
  );

  assert.ok((analyzeSource.match(/await assertAiQuotaAvailable\(user\)/g) ?? []).length >= 2);
  assertBefore(
    analyzeSource,
    "await assertAiQuotaAvailable(user);",
    "const second = await callAiText",
    "idea analyze retry",
  );

  assert.ok((outlineSource.match(/await assertAiQuotaAvailable\(user\)/g) ?? []).length >= 2);
  assertBefore(
    outlineSource,
    "await assertAiQuotaAvailable(user);",
    "const second = await callAiText",
    "long outline retry",
  );

  assert.ok((refineSource.match(/await assertAiQuotaAvailable\(user\)/g) ?? []).length >= 2);
  assertBefore(
    refineSource,
    "await assertAiQuotaAvailable(user);",
    "const second = await callAiText",
    "outline extend retry",
  );

  assert.ok((shortOutlineSource.match(/await assertAiQuotaAvailable\(user\)/g) ?? []).length >= 2);
  assertBefore(
    shortOutlineSource,
    "await assertAiQuotaAvailable(user);",
    "const retry = await callAiText",
    "short outline retry",
  );
  assert.match(shortOutlineSource, /action: "short_story_outline_generate_retry"/);
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
    assertBefore(source, `await assertCanUseAiAction(user, "${action}")`, "const result = await callAiText", file);
  }
});

test("chapter generation repair checks quota before optional repair AI call", () => {
  const repairSource = read("src/lib/ai/chapter-length-repair.ts");
  const generateSource = read("src/backend/ai/chapter/generate-service.ts");
  const streamPersistenceSource = read("src/backend/ai/chapter/stream-persistence.ts");

  assertBefore(repairSource, "await params.beforeRepairAiCall?.();", "const repairResult = await callAiText", "repair quota");
  assert.match(generateSource, /beforeRepairAiCall: \(\) => assertAiQuotaAvailable\(user\)/);
  assert.match(streamPersistenceSource, /beforeRepairAiCall: \(\) => assertAiQuotaAvailable\(prepared\.user\)/);
});

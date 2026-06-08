import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const rootDir = process.cwd();

function read(relativePath) {
  return readFileSync(path.join(rootDir, relativePath), "utf8");
}

function walk(dir) {
  const result = [];
  for (const entry of readdirSync(path.join(rootDir, dir))) {
    const relativePath = path.join(dir, entry);
    const absolutePath = path.join(rootDir, relativePath);
    const stat = statSync(absolutePath);
    if (stat.isDirectory()) {
      result.push(...walk(relativePath));
    } else if (entry.endsWith(".ts")) {
      result.push(relativePath);
    }
  }
  return result;
}

test("admin management guards protect root and admin targets", () => {
  const adminSource = read("src/lib/auth/admin.ts");
  assert.match(adminSource, /export function assertCanManageTargetUser/);
  assert.match(adminSource, /isRootAdminUser\(targetUser\)/);
  assert.match(adminSource, /isAdminUser\(targetUser\)/);

  const usersRouteSource = read("src/app/api/admin/users/route.ts");
  const userDetailRouteSource = read("src/app/api/admin/users/[id]/route.ts");
  const liteServiceSource = read("src/backend/admin/admin-users-lite-service.ts");

  assert.match(usersRouteSource, /export async function GET/);
  assert.doesNotMatch(usersRouteSource, /export async function POST/);
  assert.match(userDetailRouteSource, /export async function GET/);
  assert.match(userDetailRouteSource, /export async function PATCH/);
  assert.match(userDetailRouteSource, /assertSameOriginRequest\(request\);/);
  assert.doesNotMatch(userDetailRouteSource, /export async function (PUT|DELETE)/);
  assert.match(liteServiceSource, /assertCanManageTargetUser\(\{[\s\S]*action: roleChange \? "role_change" : membershipChange \? "membership_change" : "update"/);
  assert.match(liteServiceSource, /isRootAdminUser\(before\)[\s\S]*input\.status && input\.status !== "active"/);
  assert.match(liteServiceSource, /requestedRole && nextRole !== "super_admin"/);
  assert.doesNotMatch(liteServiceSource, /prisma\.user\.delete\(/);
  assert.equal(
    existsSync(path.join(rootDir, "src/app/api/admin/users/[id]/reset-password/route.ts")),
    false,
  );
});

test("all mutating route handlers catch assertSameOriginRequest with the first try block", () => {
  const files = [...walk("src/app/api"), ...walk("src/backend")];
  const sameOriginExemptions = new Set([
    path.join("src/app/api/payments/alipay/notify/route.ts"),
  ]);
  const problems = [];

  for (const file of files) {
    if (sameOriginExemptions.has(file)) {
      continue;
    }

    const lines = read(file).split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      if (!/^export async function (POST|PUT|PATCH|DELETE)\b/.test(lines[index])) {
        continue;
      }

      let requestParam = null;
      let openLine = -1;
      for (let cursor = index; cursor < Math.min(lines.length, index + 20); cursor += 1) {
        const match = lines[cursor].match(/\b([A-Za-z_][A-Za-z0-9_]*)\s*:\s*Request\b/);
        if (!requestParam && match) requestParam = match[1];
        if (/\{\s*$/.test(lines[cursor])) {
          openLine = cursor;
          break;
        }
      }

      if (!requestParam || openLine < 0) {
        problems.push(`${file}:${index + 1} has no Request parameter`);
        continue;
      }

      const firstBodyLine = lines
        .slice(openLine + 1, openLine + 8)
        .find((line) => line.trim().length > 0);
      if (firstBodyLine?.trim() !== "try {") {
        problems.push(`${file}:${index + 1} must enter try before origin assertion`);
        continue;
      }

      const tryLine = lines.findIndex(
        (line, lineIndex) => lineIndex > openLine && line.trim() === "try {",
      );
      const expected = `assertSameOriginRequest(${requestParam});`;
      const firstTryStatements = lines
        .slice(tryLine + 1, tryLine + 8)
        .map((line) => line.trim())
        .filter(Boolean);
      if (firstTryStatements[0] !== expected) {
        problems.push(`${file}:${index + 1} first try block missing ${expected}`);
      }
    }
  }

  assert.deepEqual(problems, []);
});

test("AI quota includes minute limit and active generation jobs", () => {
  const quotaSource = read("src/lib/ai/quota.ts");
  assert.match(quotaSource, /getMembershipLimits\(user\.membershipTier \?\? "default"\)/);
  assert.doesNotMatch(quotaSource, /AI_DAILY_CALL_LIMIT/);
  assert.doesNotMatch(quotaSource, /AI_DAILY_TOKEN_LIMIT/);
  assert.doesNotMatch(quotaSource, /AI_MINUTE_CALL_LIMIT/);
  assert.match(quotaSource, /createdAt: \{ gte: minuteStart \}/);
  assert.match(quotaSource, /success: true/);
  assert.match(quotaSource, /client\.generationJob\.count/);
  assert.match(quotaSource, /pendingMinuteReservations/);
  assert.match(quotaSource, /status: \{ in: \["queued", "running"\] \}/);
  assert.match(quotaSource, /assertMembershipAiUsageAvailable\(limits/);
});

test("session lastSeenAt writes are throttled", () => {
  const sessionSource = read("src/lib/auth/session.ts");

  assert.match(sessionSource, /export const SESSION_TOUCH_INTERVAL_MS = 10 \* 60 \* 1000/);
  assert.match(sessionSource, /lastSeenAt: true/);
  assert.match(sessionSource, /now - session\.lastSeenAt\.getTime\(\) >= SESSION_TOUCH_INTERVAL_MS/);
  assert.match(sessionSource, /prisma\.userSession[\s\S]*\.updateMany\(\{/);
  assert.match(sessionSource, /lastSeenAt: \{[\s\S]*lt: new Date\(now - SESSION_TOUCH_INTERVAL_MS\)/);
  assert.doesNotMatch(sessionSource, /prisma\.userSession[\s\S]*\.update\(\{[\s\S]*data: \{ lastSeenAt: new Date\(\) \}/);
});

test("security headers include a production CSP", () => {
  const nextConfigSource = read("next.config.ts");

  assert.match(nextConfigSource, /Content-Security-Policy/);
  assert.match(nextConfigSource, /default-src 'self'/);
  assert.match(nextConfigSource, /frame-ancestors 'none'/);
  assert.match(nextConfigSource, /object-src 'none'/);
  assert.match(nextConfigSource, /X-Frame-Options/);
  assert.match(nextConfigSource, /X-Content-Type-Options/);
  assert.match(nextConfigSource, /Referrer-Policy/);
});

test("login rate limit and cleanup helpers are reusable", () => {
  const loginSecuritySource = read("src/lib/auth/login-security.ts");
  const rateLimitSource = read("src/lib/security/rate-limit.ts");
  const cleanupSource = read("src/lib/maintenance/cleanup.ts");

  assert.match(rateLimitSource, /export type RateLimitDimension = "ip" \| "email" \| "userId"/);
  assert.match(rateLimitSource, /export async function assertLoginRateLimit/);
  assert.match(loginSecuritySource, /assertLoginRateLimit\(\{/);
  assert.match(cleanupSource, /cleanupExpiredSecurityRecords/);
  assert.match(cleanupSource, /loginAttempt\.deleteMany/);
  assert.match(cleanupSource, /emailVerificationCode\.deleteMany/);
  assert.match(cleanupSource, /aiQuotaReservation\.updateMany/);
  assert.match(cleanupSource, /status: "cancelled"/);
});

test("AI upstream has request observability, abort propagation and circuit breaker hooks", () => {
  const textServiceSource = read("src/backend/ai/upstream/text-service.ts");
  const requestSource = read("src/backend/ai/upstream/request.ts");
  const healthSource = read("src/backend/ai/upstream/health.ts");
  const observabilitySource = read("src/backend/ai/upstream/observability.ts");
  const streamRouteSource = read("src/backend/ai/chapter/stream-route.ts");

  assert.match(observabilitySource, /createUpstreamRequestId/);
  assert.match(observabilitySource, /logUpstreamRequest/);
  assert.doesNotMatch(observabilitySource, /messages|prompt|apiKey/i);
  assert.match(healthSource, /isProviderCircuitOpen/);
  assert.match(healthSource, /recordProviderCircuitResult/);
  assert.match(healthSource, /state\.openedUntil > 0 && state\.openedUntil <= Date\.now\(\)/);
  assert.match(healthSource, /return state\.openedUntil > Date\.now\(\)/);
  assert.match(textServiceSource, /const requestId = createUpstreamRequestId\(\)/);
  assert.match(textServiceSource, /logUpstreamRequest\(\{/);
  assert.match(textServiceSource, /recordProviderCircuitResult\(provider\.id/);
  assert.match(textServiceSource, /signal\?: AbortSignal/);
  assert.match(requestSource, /externalSignal: params\.signal/);
  assert.match(requestSource, /status: 499/);
  assert.match(streamRouteSource, /signal: abortController\.signal/);
});

test("provider circuit preserves failures until threshold and clears on success", async () => {
  const {
    isProviderCircuitOpen,
    recordProviderCircuitResult,
  } = await import("../src/backend/ai/upstream/health.ts");

  recordProviderCircuitResult("gpt_primary", true);
  assert.equal(isProviderCircuitOpen("gpt_primary"), false);

  recordProviderCircuitResult("gpt_primary", false);
  assert.equal(isProviderCircuitOpen("gpt_primary"), false);
  recordProviderCircuitResult("gpt_primary", false);
  assert.equal(isProviderCircuitOpen("gpt_primary"), false);
  recordProviderCircuitResult("gpt_primary", false);
  assert.equal(isProviderCircuitOpen("gpt_primary"), true);

  recordProviderCircuitResult("gpt_primary", true);
  assert.equal(isProviderCircuitOpen("gpt_primary"), false);
});

test("idea generation route has a single user and quota check", () => {
  const ideaSource = read("src/backend/ai/idea/generate-route.ts");
  assert.equal((ideaSource.match(/getCurrentUser\(/g) ?? []).length, 1);
  assert.ok((ideaSource.match(/assertAiQuotaAvailable\(user\)/g) ?? []).length >= 2);
  assert.doesNotMatch(ideaSource, /void user/);
  assert.doesNotMatch(ideaSource, /当前“生成创意”配置使用/);
});

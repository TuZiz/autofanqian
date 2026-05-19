import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
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

  const userDetailSource = read("src/backend/admin/user-detail-route.ts");
  const resetPasswordSource = read("src/app/api/admin/users/[id]/reset-password/route.ts");
  assert.match(userDetailSource, /assertCanManageTargetUser\(\{[\s\S]*action: "update"/);
  assert.match(userDetailSource, /assertCanManageTargetUser\(\{[\s\S]*action: "delete"/);
  assert.match(resetPasswordSource, /assertCanManageTargetUser\(\{[\s\S]*action: "reset_password"/);
  assert.doesNotMatch(userDetailSource, /prisma\.user\.delete\(/);
  assert.match(userDetailSource, /status: "deleted"/);
});

test("all mutating route handlers catch assertSameOriginRequest with the first try block", () => {
  const files = [...walk("src/app/api"), ...walk("src/backend")];
  const problems = [];

  for (const file of files) {
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
  assert.match(quotaSource, /prisma\.generationJob\.count/);
  assert.match(quotaSource, /status: \{ in: \["queued", "running"\] \}/);
  assert.match(quotaSource, /assertMembershipAiUsageAvailable\(limits/);
});

test("idea generation route has a single user and quota check", () => {
  const ideaSource = read("src/backend/ai/idea/generate-route.ts");
  assert.equal((ideaSource.match(/getCurrentUser\(/g) ?? []).length, 1);
  assert.ok((ideaSource.match(/assertAiQuotaAvailable\(user\)/g) ?? []).length >= 2);
  assert.doesNotMatch(ideaSource, /void user/);
  assert.doesNotMatch(ideaSource, /当前“生成创意”配置使用/);
});

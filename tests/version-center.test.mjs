import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const rootDir = process.cwd();

function read(relativePath) {
  return readFileSync(path.join(rootDir, relativePath), "utf8");
}

test("version center writes build info before Next build", () => {
  const packageJson = JSON.parse(read("package.json"));
  const buildScript = packageJson.scripts.build;

  assert.match(buildScript, /node scripts\/write-build-info\.mjs && npm run db:generate && next build/);
  assert.match(read("scripts/write-build-info.mjs"), /public[\\", ]+build-info\.json/);
});

test("deploy script uses fixed commands and lock without printing secrets", () => {
  const deployScript = read("scripts/deploy.sh");

  assert.match(deployScript, /set -euo pipefail/);
  assert.match(deployScript, /APP_DIR="\$\{APP_DIR:-\/www\/wwwroot\/autofanqian\}"/);
  assert.match(deployScript, /flock -n 9/);
  assert.match(deployScript, /git fetch origin "\$BRANCH"/);
  assert.match(deployScript, /git reset --hard "origin\/\$\{?BRANCH\}?"|git reset --hard "origin\/\$BRANCH"/);
  assert.match(deployScript, /npm ci --include=dev/);
  assert.match(deployScript, /npm run db:generate/);
  assert.match(deployScript, /npx prisma migrate deploy/);
  assert.doesNotMatch(deployScript, /npm run db:push/);
  assert.match(deployScript, /npm run build/);
  assert.match(deployScript, /pm2 reload "\$APP_NAME" --update-env \|\| pm2 start npm --name "\$APP_NAME" -- start/);
  assert.match(deployScript, /pm2 save/);
  assert.doesNotMatch(deployScript, /cat \.env|printenv|env\s*$/m);
});

test("deploy job schema and admin APIs enforce safe fixed-script updates", () => {
  const schema = read("prisma/schema.prisma");
  const updateRoute = read("src/app/api/admin/system/update/route.ts");
  const jobRoute = read("src/app/api/admin/system/update/[jobId]/route.ts");
  const deployLib = read("src/lib/system/deploy.ts");
  const versionUi = read("src/components/admin/admin-version-popover.tsx");
  const versionHook = read("src/lib/admin/use-admin-version-center.ts");

  assert.match(schema, /model DeployJob \{/);
  assert.match(schema, /@@index\(\[status, startedAt\]\)/);
  assert.match(updateRoute, /assertSameOriginRequest\(request\);/);
  assert.match(updateRoute, /isSuperAdminUser\(adminUser\)/);
  assert.match(updateRoute, /recordAdminAuditLog/);
  assert.doesNotMatch(updateRoute, /request\.json\(/);
  assert.match(deployLib, /DEPLOY_RUNNER_PATH = path\.join\(process\.cwd\(\), "scripts", "run-deploy-job\.mjs"\)/);
  assert.match(deployLib, /RUNNING_DEPLOY_TIMEOUT_MS = 30 \* 60 \* 1000/);
  assert.match(deployLib, /expireStaleDeployJobs/);
  assert.match(deployLib, /spawn\(process\.execPath, \[DEPLOY_RUNNER_PATH, job\.id\]/);
  const runner = read("scripts/run-deploy-job.mjs");
  assert.match(runner, /spawn\("bash", \[deployScriptPath\]/);
  assert.match(runner, /WHERE "id" = \$1 AND "status" = 'running'/);
  assert.match(deployLib, /DATABASE_URL/);
  assert.match(deployLib, /ALIPAY_PRIVATE_KEY/);
  assert.match(deployLib, /SETTINGS_ENCRYPTION_KEY/);
  assert.match(jobRoute, /toSafeDeployJob\(job\)/);
  assert.match(versionUi, /云端更新/);
  assert.match(versionHook, /更新会拉取 GitHub main 并重启网站/);
});

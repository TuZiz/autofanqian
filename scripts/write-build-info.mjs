import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

function readPackageVersion() {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
  return typeof packageJson.version === "string" ? packageJson.version : "0.0.0";
}

function readGitValue(args, fallback) {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || fallback;
  } catch {
    return fallback;
  }
}

const buildInfo = {
  version: readPackageVersion(),
  commit: readGitValue(["rev-parse", "--short", "HEAD"], "unknown"),
  branch: readGitValue(["rev-parse", "--abbrev-ref", "HEAD"], "unknown"),
  builtAt: new Date().toISOString(),
};

mkdirSync("public", { recursive: true });
writeFileSync(path.join("public", "build-info.json"), `${JSON.stringify(buildInfo, null, 2)}\n`, "utf8");
console.log(`Wrote public/build-info.json for v${buildInfo.version} (${buildInfo.commit})`);

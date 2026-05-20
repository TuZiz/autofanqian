import "server-only";

import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const GITHUB_REPO_API = "https://api.github.com/repos/TuZiz/autofanqian";

export type BuildInfo = {
  version: string;
  commit: string;
  branch: string;
  builtAt: string;
};

export type VersionStatus = {
  currentVersion: string;
  currentCommit: string;
  currentBranch: string;
  builtAt: string | null;
  latestVersion: string | null;
  latestCommit: string | null;
  hasUpdate: boolean;
  releaseUrl: string | null;
  checkedAt: string;
};

type GithubRelease = {
  tag_name?: string;
  html_url?: string;
};

type GithubCommit = {
  sha?: string;
  html_url?: string;
};

const fallbackBuildInfo: BuildInfo = {
  version: "0.0.0",
  commit: "unknown",
  branch: "unknown",
  builtAt: "",
};

async function readPackageVersion() {
  try {
    const packageJson = JSON.parse(await readFile(path.join(process.cwd(), "package.json"), "utf8")) as { version?: string };
    return packageJson.version || fallbackBuildInfo.version;
  } catch {
    return fallbackBuildInfo.version;
  }
}

async function readGitValue(args: string[], fallback: string) {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd: process.cwd(),
      timeout: 3000,
      maxBuffer: 32 * 1024,
    });
    return stdout.trim() || fallback;
  } catch {
    return fallback;
  }
}

export async function readLocalBuildInfo(): Promise<BuildInfo> {
  try {
    const raw = await readFile(path.join(process.cwd(), "public", "build-info.json"), "utf8");
    const parsed = JSON.parse(raw) as Partial<BuildInfo>;
    return {
      version: parsed.version || (await readPackageVersion()),
      commit: parsed.commit || (await readGitValue(["rev-parse", "--short", "HEAD"], "unknown")),
      branch: parsed.branch || (await readGitValue(["rev-parse", "--abbrev-ref", "HEAD"], "unknown")),
      builtAt: parsed.builtAt || "",
    };
  } catch {
    return {
      version: await readPackageVersion(),
      commit: await readGitValue(["rev-parse", "--short", "HEAD"], "unknown"),
      branch: await readGitValue(["rev-parse", "--abbrev-ref", "HEAD"], "unknown"),
      builtAt: "",
    };
  }
}

function normalizeVersion(version: string | null | undefined) {
  return (version ?? "").trim().replace(/^v/i, "");
}

export function compareVersions(current: string | null | undefined, latest: string | null | undefined) {
  const currentParts = normalizeVersion(current).split(/[.-]/).map((part) => Number.parseInt(part, 10));
  const latestParts = normalizeVersion(latest).split(/[.-]/).map((part) => Number.parseInt(part, 10));
  const length = Math.max(currentParts.length, latestParts.length, 3);

  for (let index = 0; index < length; index += 1) {
    const left = Number.isFinite(currentParts[index]) ? currentParts[index] : 0;
    const right = Number.isFinite(latestParts[index]) ? latestParts[index] : 0;
    if (left < right) return -1;
    if (left > right) return 1;
  }

  return 0;
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "autofanqian-version-center",
    },
    next: { revalidate: 60 },
  });

  if (!response.ok) return null;
  return (await response.json()) as T;
}

export async function getLatestGithubRelease() {
  const release = await fetchJson<GithubRelease>(`${GITHUB_REPO_API}/releases/latest`);
  if (release?.tag_name) {
    return {
      latestVersion: release.tag_name.replace(/^v/i, ""),
      latestCommit: null,
      releaseUrl: release.html_url ?? `${GITHUB_REPO_API.replace("api.github.com/repos", "github.com")}/releases/latest`,
    };
  }

  const commit = await fetchJson<GithubCommit>(`${GITHUB_REPO_API}/commits/main`);
  return {
    latestVersion: null,
    latestCommit: commit?.sha ? commit.sha.slice(0, 7) : null,
    releaseUrl: commit?.html_url ?? "https://github.com/TuZiz/autofanqian/commits/main",
  };
}

export async function getVersionStatus(): Promise<VersionStatus> {
  const local = await readLocalBuildInfo();
  const latest = await getLatestGithubRelease();
  const latestVersion = latest.latestVersion ?? null;
  const latestCommit = latest.latestCommit;
  const hasVersionUpdate = latest.latestVersion ? compareVersions(local.version, latest.latestVersion) < 0 : false;
  const hasCommitUpdate = Boolean(latestCommit && local.commit !== "unknown" && !latestCommit.startsWith(local.commit));

  return {
    currentVersion: local.version,
    currentCommit: local.commit,
    currentBranch: local.branch,
    builtAt: local.builtAt || null,
    latestVersion: latestVersion ?? local.version,
    latestCommit,
    hasUpdate: hasVersionUpdate || hasCommitUpdate,
    releaseUrl: latest.releaseUrl,
    checkedAt: new Date().toISOString(),
  };
}

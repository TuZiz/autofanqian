"use client";

import { CheckCircle2, Cloud, ExternalLink, GitBranch, Loader2, RefreshCw, Rocket, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAdminVersionCenter } from "@/lib/admin/use-admin-version-center";
import { cn } from "@/lib/utils";

type AdminVersionPopoverProps = {
  canUpdate?: boolean;
};

export function AdminVersionPopover({ canUpdate = false }: AdminVersionPopoverProps) {
  const versionCenter = useAdminVersionCenter();
  const { error, isLatest, job, loading, message, updating, version } = versionCenter;
  const versionLabel = version?.currentVersion ? `v${version.currentVersion}` : "v--";
  const releaseHref = version?.releaseUrl || "https://github.com/TuZiz/autofanqian/releases";

  return (
    <Popover>
      <PopoverTrigger>
        <button
          type="button"
          className="group inline-flex h-7 items-center gap-1.5 rounded-full border border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] px-2.5 text-xs font-extrabold text-[var(--theme-brand-text)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          title="查看版本与更新"
        >
          <GitBranch className="h-3.5 w-3.5" />
          {versionLabel}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(92vw,390px)] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-0 text-[var(--theme-text-primary)] shadow-2xl">
        <div className="overflow-hidden rounded-lg">
          <div className="relative border-b border-[var(--theme-border)] bg-[var(--theme-surface-strong)] p-4">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.12),transparent_34%)]" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--theme-text-muted)]">当前版本</div>
                <div className="mt-1 text-3xl font-black tracking-tight text-[var(--theme-text-strong)]">{versionLabel}</div>
                <div className="mt-1 text-xs font-semibold text-[var(--theme-text-muted)]">
                  commit {version?.currentCommit ?? "unknown"} · {version?.currentBranch ?? "unknown"}
                </div>
              </div>
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-extrabold",
                  isLatest
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200"
                    : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200",
                )}
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                {isLatest ? "已是最新版" : "可检查更新"}
              </div>
            </div>
          </div>

          <div className="space-y-3 p-4">
            {version?.hasUpdate ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
                发现新版本 {version.latestVersion ? `v${version.latestVersion}` : version.latestCommit}
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100">
                绿色灯亮着，当前构建已经对齐最新发布信息。
              </div>
            )}

            <dl className="grid grid-cols-2 gap-2 text-xs font-semibold">
              <VersionFact label="最新版本" value={version?.latestVersion ? `v${version.latestVersion}` : "暂无 release"} />
              <VersionFact label="最新提交" value={version?.latestCommit ?? "以 release 为准"} />
              <VersionFact label="构建时间" value={version?.builtAt ? new Date(version.builtAt).toLocaleString("zh-CN") : "未知"} />
              <VersionFact label="检查时间" value={version?.checkedAt ? new Date(version.checkedAt).toLocaleTimeString("zh-CN") : "未检查"} />
            </dl>

            <div className="grid gap-2 sm:grid-cols-3">
              <Button
                type="button"
                variant="outline"
                className="h-9 gap-1.5 text-xs font-bold"
                onClick={() => window.open(releaseHref, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                查看发布
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 gap-1.5 text-xs font-bold"
                disabled={loading || updating}
                onClick={() => void versionCenter.checkVersion()}
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                检查更新
              </Button>
              {canUpdate ? (
                <Button
                  type="button"
                  className="h-9 gap-1.5 bg-[var(--theme-brand-600)] text-xs font-bold text-white hover:brightness-105"
                  disabled={updating}
                  onClick={() => void versionCenter.startUpdate()}
                >
                  {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Cloud className="h-3.5 w-3.5" />}
                  云端更新
                </Button>
              ) : (
                <div className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--theme-border)] px-2 text-xs font-bold text-[var(--theme-text-muted)]">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  只读
                </div>
              )}
            </div>

            {message ? <div className="rounded-lg bg-[var(--theme-brand-soft)] px-3 py-2 text-xs font-bold text-[var(--theme-brand-text)]">{message}</div> : null}
            {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">{error}</div> : null}

            {job ? (
              <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] p-3">
                <div className="mb-2 flex items-center justify-between gap-2 text-xs font-extrabold text-[var(--theme-text-strong)]">
                  <span className="inline-flex items-center gap-1.5">
                    {job.status === "running" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                    更新任务：{job.status}
                  </span>
                  <span className="font-mono text-[10px] text-[var(--theme-text-muted)]">{job.id.slice(0, 8)}</span>
                </div>
                <pre className="max-h-36 overflow-auto whitespace-pre-wrap rounded-lg bg-black/85 p-2 text-[11px] leading-5 text-emerald-100">
                  {job.log || job.error || "等待日志输出..."}
                </pre>
              </div>
            ) : null}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function VersionFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] px-2.5 py-2">
      <dt className="text-[10px] font-black uppercase tracking-wider text-[var(--theme-text-muted)]">{label}</dt>
      <dd className="mt-0.5 truncate font-bold text-[var(--theme-text-strong)]" title={value}>{value}</dd>
    </div>
  );
}

import Link from "next/link";
import { ArrowLeft, BarChart3, BookMarked, ChevronDown, Download, LogOut, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LogoutConfirmDialog } from "@/components/ui/logout-confirm-dialog";
import { ExportDownloadButton } from "@/components/workbench/export-download-button";
import type { WorkDashboardController } from "@/lib/workbench/use-work-dashboard";
import { cn } from "@/lib/utils";
import { isShortStoryWork } from "@/shared/work-type";

const topbarIconButtonClass =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-[var(--theme-text-secondary)] transition-all hover:border-[var(--theme-border-strong)] hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--theme-brand-border)]/30";

const topbarTextButtonClass =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 text-xs font-bold text-[var(--theme-text-secondary)] transition-all hover:border-[var(--theme-border-strong)] hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--theme-brand-border)]/30";

const exportMenuItemClass =
  "flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-xs font-bold text-[var(--theme-text-secondary)] transition-all hover:bg-[var(--theme-brand-soft)] hover:text-[var(--theme-brand-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-brand-border)]";

export function WorkDashboardHeader({ dashboard }: { dashboard: WorkDashboardController }) {
  const { handleLogout, isAdmin, logoutBusy, userDisplayName, work } = dashboard;
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const isShortStory = isShortStoryWork(work?.workType);
  const workTitle = work?.title?.trim() || "未命名作品";
  const aiObservabilityHref = work
    ? `/dashboard/novel/${encodeURIComponent(work.id)}/ai-observability`
    : "";
  const storyBibleHref = work ? `/dashboard/work/${encodeURIComponent(work.id)}/bible` : "";
  const exportScope = isShortStory ? ("short_story" as const) : ("book" as const);

  useEffect(() => {
    if (!exportMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && exportMenuRef.current?.contains(event.target)) return;
      setExportMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setExportMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [exportMenuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--theme-divider)] bg-[var(--theme-topbar)]/95 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1540px] flex-col gap-2 px-3 py-2.5 sm:px-5 lg:px-6">
        <div className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="flex min-w-0 items-center gap-3 justify-self-start">
            <Link
              href="/dashboard"
              aria-label="返回控制台"
              className={topbarIconButtonClass}
              title="返回控制台"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="hidden min-w-0 sm:block">
              <p className="text-[11px] font-bold tracking-[0.18em] text-[var(--theme-text-muted)]">
                作品工作台
              </p>
              <p className="mt-0.5 max-w-[16rem] truncate text-sm font-extrabold text-[var(--theme-text-strong)]">
                {workTitle}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 items-center justify-end gap-1.5 justify-self-end sm:gap-2">
            {work ? (
              <>
                <Link
                  href={storyBibleHref}
                  aria-label="故事圣经"
                  className={cn(topbarIconButtonClass, "hidden sm:inline-flex")}
                  title="故事圣经"
                >
                  <BookMarked className="h-4 w-4" />
                </Link>
                <Link
                  href={aiObservabilityHref}
                  aria-label="AI 观测台"
                  className={cn(topbarIconButtonClass, "md:hidden")}
                  title="AI 观测台"
                >
                  <BarChart3 className="h-4 w-4" />
                </Link>
                <Link
                  href={aiObservabilityHref}
                  aria-label="AI 观测台"
                  className={cn(topbarIconButtonClass, "hidden md:inline-flex")}
                  title="AI 观测台"
                >
                  <BarChart3 className="h-4 w-4" />
                </Link>
                <div ref={exportMenuRef} className="relative hidden md:block">
                  <button
                    type="button"
                    aria-expanded={exportMenuOpen}
                    aria-haspopup="menu"
                    onClick={() => setExportMenuOpen((open) => !open)}
                    className={cn(
                      topbarTextButtonClass,
                      exportMenuOpen &&
                        "border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)]",
                    )}
                  >
                    <Download className="h-4 w-4" />
                    <span>导出</span>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 text-[var(--theme-text-muted)] transition-transform",
                        exportMenuOpen && "rotate-180 text-[var(--theme-brand-text)]",
                      )}
                    />
                  </button>
                  {exportMenuOpen ? (
                    <div
                      role="menu"
                      className="absolute right-0 top-[calc(100%+0.5rem)] z-[70] w-44 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-1.5 shadow-lg shadow-slate-900/10"
                    >
                      <p className="px-3 pb-1 pt-1 text-[10px] font-black tracking-[0.18em] text-[var(--theme-text-muted)]">
                        下载作品
                      </p>
                      <ExportDownloadButton
                        workId={work.id}
                        scope={exportScope}
                        format="md"
                        ariaLabel={isShortStory ? "导出短篇 Markdown" : "导出全书 Markdown"}
                        className={exportMenuItemClass}
                        title={isShortStory ? "导出短篇 Markdown" : "导出全书 Markdown"}
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Markdown</span>
                        <span className="ml-auto text-[10px] opacity-60">MD</span>
                      </ExportDownloadButton>
                      <ExportDownloadButton
                        workId={work.id}
                        scope={exportScope}
                        format="docx"
                        ariaLabel={isShortStory ? "导出短篇 DOCX" : "导出全书 DOCX"}
                        className={exportMenuItemClass}
                        title={isShortStory ? "导出短篇 DOCX" : "导出全书 DOCX"}
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Word 文档</span>
                        <span className="ml-auto text-[10px] opacity-60">DOCX</span>
                      </ExportDownloadButton>
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}

            <span
              className="hidden h-10 max-w-[120px] items-center truncate px-2 text-xs font-bold text-[var(--theme-text-secondary)] lg:inline-flex"
              title={userDisplayName || "创作者"}
            >
              {userDisplayName || "创作者"}
            </span>

            {isAdmin ? (
              <Link
                href="/dashboard/admin"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)] transition-all hover:bg-[var(--theme-brand-soft)] hover:ring-2 hover:ring-[var(--theme-brand-border)]/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--theme-brand-border)]/30 sm:w-auto sm:gap-2 sm:px-3 sm:text-xs sm:font-bold"
                title="管理员"
              >
                <ShieldCheck className="h-4 w-4" />
                <span className="hidden sm:inline">管理员</span>
              </Link>
            ) : null}

            <ThemeToggle className={cn(topbarIconButtonClass, "p-0")} />
            <button
              type="button"
              onClick={() => setLogoutConfirmOpen(true)}
              disabled={logoutBusy}
              className="hidden h-10 shrink-0 items-center gap-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-4 text-xs font-semibold text-[var(--theme-text-secondary)] transition-all hover:border-[var(--theme-danger-border)] hover:bg-[var(--theme-danger-soft)] hover:text-[var(--theme-danger-text)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" />
              {logoutBusy ? "退出中" : "退出"}
            </button>
          </div>
        </div>
      </div>

      <LogoutConfirmDialog
        open={logoutConfirmOpen}
        busy={logoutBusy}
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={async () => {
          try {
            await handleLogout();
          } finally {
            setLogoutConfirmOpen(false);
          }
        }}
      />
    </header>
  );
}

"use client";

import { FileText } from "lucide-react";

import { extractBookName } from "@/lib/create/dashboard-create-utils";
import type { DashboardCreateController } from "@/lib/create/use-dashboard-create";
import { cn } from "@/lib/utils";
import { SubmitOutlineButton } from "./submit-outline-button";

export function CreateActionSidebar({
  className,
  create,
}: {
  className?: string;
  create: DashboardCreateController;
}) {
  const selectedTemplate = create.templateShowcaseCards.find(
    (item) => item.id === create.selectedTemplateCardId,
  );

  return (
    <aside
      className={cn(
        "w-full min-w-0 self-start min-[1240px]:sticky min-[1240px]:top-20 min-[1240px]:pr-1",
        className,
      )}
    >
      <section className="app-compact-panel overflow-hidden rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] shadow-sm">
        <div className="grid gap-2.5 px-3.5 py-3">
          <SubmitOutlineButton create={create} sidebar />
        </div>

        {selectedTemplate ? (
          <div className="border-t border-[var(--theme-border)] px-3.5 py-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold tracking-wide text-[var(--theme-text-strong)]">
              <FileText className="h-4 w-4 text-[var(--theme-brand-600)]" />
              当前模板
            </div>
            <div className="border border-amber-200/70 bg-amber-50/70 px-3 py-2.5 text-[11px] font-medium leading-5 text-amber-800 dark:border-amber-500/15 dark:bg-amber-500/5 dark:text-amber-200">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                {selectedTemplate.genreLabel}
              </div>
              <div className="mt-1">{selectedTemplate.summary}</div>
            </div>
          </div>
        ) : null}

        <CompactCreateOptions create={create} />
      </section>
    </aside>
  );
}

function CompactCreateOptions({ create }: { create: DashboardCreateController }) {
  const {
    dnaBookTitle,
    dnaStyles,
    isAdmin,
    platform,
    platforms,
    setDnaBookTitle,
    setPlatform,
    setWords,
    wordOptions,
    words,
  } = create;

  return (
    <div className="border-t border-[var(--theme-border)] px-3.5 py-3">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="text-sm font-bold tracking-wide text-[var(--theme-text-strong)]">
          可选设置
        </div>
        <span className="border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] px-2 py-0.5 text-[10px] font-black tracking-[0.16em] text-[var(--theme-text-muted)]">
          可不填
        </span>
      </div>

      <div className="space-y-2.5">
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">
            目标平台
          </span>
          <select
            value={platform}
            onChange={(event) => setPlatform(event.target.value)}
            className="h-9 w-full cursor-pointer appearance-none border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] px-3 text-xs font-bold text-[var(--theme-text-primary)] outline-none transition-all focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">默认平台</option>
            {platforms.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">
            目标字数
          </span>
          <select
            value={words}
            onChange={(event) => setWords(event.target.value)}
            className="h-9 w-full cursor-pointer appearance-none border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] px-3 text-xs font-bold text-[var(--theme-text-primary)] outline-none transition-all focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/20"
          >
            {wordOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">
            仿书 DNA
            <span className="bg-emerald-50 px-1.5 py-0.5 text-[9px] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              测试中
            </span>
          </span>
          <input
            value={dnaBookTitle}
            list="create-sidebar-dna-book-suggestions"
            disabled={!isAdmin}
            onChange={(event) => setDnaBookTitle(event.target.value)}
            placeholder={isAdmin ? "输入参考书名" : "仅管理员可用"}
            className="h-9 w-full border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] px-3 text-xs font-bold text-[var(--theme-text-primary)] outline-none transition-all focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <datalist id="create-sidebar-dna-book-suggestions">
            {dnaStyles.map((item) => {
              const name = extractBookName(item.label);
              return (
                <option key={item.id} value={name}>
                  {item.label}
                </option>
              );
            })}
          </datalist>
        </label>
      </div>

      <div className="mt-3 border border-emerald-200/60 bg-emerald-50/50 px-3 py-2 text-[11px] font-semibold leading-5 text-emerald-700 dark:border-emerald-500/15 dark:bg-emerald-500/5 dark:text-emerald-300">
        DNA 会抽象写法与结构，不复制原作剧情。
      </div>
    </div>
  );
}

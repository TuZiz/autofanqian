"use client";

import { extractBookName } from "@/lib/create/dashboard-create-utils";
import type { DashboardCreateController } from "@/lib/create/use-dashboard-create";

type CreateOptionsSectionProps = {
  create: DashboardCreateController;
};

export function CreateOptionsSection({ create }: CreateOptionsSectionProps) {
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
    <section className="overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] shadow-sm">
      <div className="border-b border-[var(--theme-border)] bg-gradient-to-r from-emerald-500/5 to-transparent px-6 py-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-xs font-black text-white shadow-sm">
            3
          </span>
          <div className="text-xl font-extrabold tracking-tight text-[var(--theme-text-strong)]">
            可选设置
          </div>
        </div>
        <p className="mt-1.5 text-sm font-medium text-[var(--theme-text-secondary)]">
          这些不是必填，直接默认也能创建大纲。
        </p>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--theme-text-primary)]">
              目标平台
              <span className="text-xs font-semibold text-[var(--theme-text-muted)]">(可选)</span>
            </label>
            <select
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
              className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] px-4 text-sm font-medium text-[var(--theme-text-primary)] outline-none transition-all focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">选择目标发布平台</option>
              {platforms.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-[var(--theme-text-primary)]">
              目标字数
            </label>
            <select
              value={words}
              onChange={(event) => setWords(event.target.value)}
              className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] px-4 text-sm font-medium text-[var(--theme-text-primary)] outline-none transition-all focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/20"
            >
              {wordOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--theme-text-primary)]">
              仿书 DNA
              <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                测试中功能
              </span>
            </label>
            <input
              value={dnaBookTitle}
              list="dna-book-suggestions"
              disabled={!isAdmin}
              onChange={(event) => setDnaBookTitle(event.target.value)}
              placeholder={
                isAdmin ? "输入或选择参考书名（例如：诡秘之主）" : "内测中：仅管理员可使用"
              }
              className="h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] px-4 text-sm font-medium text-[var(--theme-text-primary)] outline-none transition-all focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <datalist id="dna-book-suggestions">
              {dnaStyles.map((item) => {
                const name = extractBookName(item.label);
                return (
                  <option key={item.id} value={name}>
                    {item.label}
                  </option>
                );
              })}
            </datalist>
          </div>

          <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/50 px-4 py-3 text-xs font-semibold leading-5 text-emerald-700 dark:border-emerald-500/15 dark:bg-emerald-500/5 dark:text-emerald-300">
            生成大纲时会尝试进行网络检索，并抽象其写法与结构，不复制原作剧情。
          </div>
        </div>
      </div>
    </section>
  );
}

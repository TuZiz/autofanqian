"use client";

import Link from "next/link";
import { CheckCircle2, FileText, Loader2, Plus, RefreshCw, Save, ToggleLeft, ToggleRight } from "lucide-react";

import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import type { AdminPromptsController, AdminPromptTemplate } from "@/lib/admin/use-admin-prompts";
import type { PromptTemplateCategory } from "@/shared/schemas/prompt-template";
import { cn } from "@/lib/utils";

const categoryLabels: Record<PromptTemplateCategory, string> = {
  idea: "创意",
  outline: "大纲",
  chapter: "章节",
  context: "上下文",
  template: "模板",
  regenerate: "重生成",
};

export function AdminPromptsView({ prompts }: { prompts: AdminPromptsController }) {
  return (
    <main className="app-work-surface relative min-h-dvh overflow-x-hidden pb-6 font-sans">
      <div className="pointer-events-none fixed inset-0 theme-app-surface" />
      <DashboardTopbar
        className="relative z-40"
        title="提示词模板中心"
        showBackToDashboard
        backHref="/dashboard/admin"
        backLabel="返回管理台"
        showAdminLink={false}
        maxWidthClassName="max-w-[1320px]"
      />

      <div className="relative z-10 mx-auto max-w-[1320px] px-4 pt-4 sm:px-5 lg:px-6">
        <section className="app-compact-panel mb-3 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <div className="mb-2 inline-flex h-8 items-center gap-2 rounded-md bg-emerald-50 px-2.5 text-xs font-black text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20">
                <FileText className="h-3.5 w-3.5" />
                PromptTemplate
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-[var(--theme-text-strong)]">
                数据库激活提示词优先，代码默认提示词兜底
              </h1>
              <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-[var(--theme-text-secondary)]">
                按 category 管理提示词版本。启用某个版本后，同 key 的旧版本会自动停用，AI 调用会记录版本号。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void prompts.load()}
                disabled={prompts.loading}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 text-sm font-bold text-[var(--theme-text-secondary)] disabled:opacity-50"
              >
                <RefreshCw className={cn("h-4 w-4", prompts.loading && "animate-spin")} />
                刷新
              </button>
              <button
                type="button"
                onClick={prompts.startCreate}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-bold text-white dark:bg-white dark:text-zinc-950"
              >
                <Plus className="h-4 w-4" />
                新增提示词
              </button>
            </div>
          </div>
        </section>

        {prompts.error ? (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
            {prompts.error}
          </div>
        ) : null}
        {prompts.notice ? (
          <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
            {prompts.notice}
          </div>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-[340px_minmax(0,1fr)]">
          <section className="app-compact-panel overflow-hidden">
            <div className="border-b border-[var(--theme-divider)] p-3">
              <div className="mb-2 flex gap-1 overflow-x-auto">
                <CategoryButton active={prompts.category === "all"} onClick={() => prompts.setCategory("all")}>
                  全部
                </CategoryButton>
                {prompts.categories.map((item) => (
                  <CategoryButton
                    active={prompts.category === item}
                    key={item}
                    onClick={() => prompts.setCategory(item)}
                  >
                    {categoryLabels[item]}
                  </CategoryButton>
                ))}
              </div>
              <p className="text-xs font-semibold text-[var(--theme-text-muted)]">
                {prompts.filtered.length} 个版本，按 key 和版本排序。
              </p>
            </div>

            {prompts.loading && !prompts.filtered.length ? (
              <div className="flex min-h-[420px] items-center justify-center gap-2 text-sm font-bold text-[var(--theme-text-muted)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                正在加载提示词...
              </div>
            ) : (
              <div className="max-h-[calc(100dvh-260px)] overflow-y-auto p-2">
                {prompts.filtered.map((item) => (
                  <PromptListItem
                    active={prompts.selectedId === item.id}
                    item={item}
                    key={item.id}
                    onClick={() => prompts.selectTemplate(item)}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="app-compact-panel overflow-hidden">
            <div className="border-b border-[var(--theme-divider)] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-[var(--theme-text-strong)]">
                    {prompts.selected ? "编辑版本" : "新增提示词"}
                  </h2>
                  <p className="text-xs font-semibold text-[var(--theme-text-muted)]">
                    {prompts.selected ? `${prompts.selected.key} · v${prompts.selected.version}` : "创建新的 key 和版本"}
                  </p>
                </div>
                {prompts.selected?.isActive ? (
                  <span className="inline-flex h-7 items-center gap-1 rounded-full bg-emerald-50 px-2.5 text-xs font-black text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    激活
                  </span>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 p-4 md:grid-cols-2">
              <Field label="Key">
                <input
                  value={prompts.draft.key}
                  onChange={(event) => prompts.setDraft((draft) => ({ ...draft, key: event.target.value }))}
                  disabled={Boolean(prompts.selected)}
                  className="h-10 w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 text-sm font-semibold outline-none disabled:opacity-60"
                />
              </Field>
              <Field label="Category">
                <select
                  value={prompts.draft.category}
                  onChange={(event) =>
                    prompts.setDraft((draft) => ({
                      ...draft,
                      category: event.target.value as PromptTemplateCategory,
                    }))
                  }
                  disabled={Boolean(prompts.selected)}
                  className="h-10 w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 text-sm font-semibold outline-none disabled:opacity-60"
                >
                  {prompts.categories.map((item) => (
                    <option key={item} value={item}>
                      {categoryLabels[item]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="名称">
                <input
                  value={prompts.draft.name}
                  onChange={(event) => prompts.setDraft((draft) => ({ ...draft, name: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 text-sm font-semibold outline-none"
                />
              </Field>
              <Field label="启用状态">
                <button
                  type="button"
                  onClick={() => prompts.setDraft((draft) => ({ ...draft, isActive: !draft.isActive }))}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 text-sm font-bold text-[var(--theme-text-secondary)]"
                >
                  {prompts.draft.isActive ? <ToggleRight className="h-5 w-5 text-emerald-600" /> : <ToggleLeft className="h-5 w-5" />}
                  {prompts.draft.isActive ? "保存后启用" : "保存为停用"}
                </button>
              </Field>
              <Field label="提示词内容" wide>
                <textarea
                  value={prompts.draft.content}
                  onChange={(event) => prompts.setDraft((draft) => ({ ...draft, content: event.target.value }))}
                  rows={18}
                  className="w-full resize-y rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 py-3 font-mono text-sm leading-6 outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/10"
                />
              </Field>
            </div>

            <div className="flex flex-wrap justify-between gap-2 border-t border-[var(--theme-divider)] px-4 py-3">
              <div className="flex gap-2">
                {prompts.selected ? (
                  <button
                    type="button"
                    disabled={prompts.saving}
                    onClick={() => void prompts.deactivate(prompts.selected!)}
                    className="h-10 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-700 disabled:opacity-50 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200"
                  >
                    停用
                  </button>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Link
                  href="/dashboard/admin"
                  className="inline-flex h-10 items-center rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-4 text-sm font-bold text-[var(--theme-text-secondary)]"
                >
                  返回
                </Link>
                {prompts.selected ? (
                  <button
                    type="button"
                    disabled={prompts.saving}
                    onClick={() => void prompts.save({ createVersion: true })}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-4 text-sm font-bold text-[var(--theme-text-secondary)] disabled:opacity-50"
                  >
                    创建新版本
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={prompts.saving}
                  onClick={() => void prompts.save()}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-zinc-950 px-5 text-sm font-bold text-white disabled:opacity-50 dark:bg-white dark:text-zinc-950"
                >
                  {prompts.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  保存
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function CategoryButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 shrink-0 rounded-lg px-3 text-xs font-black transition",
        active
          ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
          : "bg-[var(--theme-surface-solid)] text-[var(--theme-text-muted)] ring-1 ring-[var(--theme-border)] hover:text-[var(--theme-text-strong)]",
      )}
    >
      {children}
    </button>
  );
}

function PromptListItem({
  active,
  item,
  onClick,
}: {
  active: boolean;
  item: AdminPromptTemplate;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "mb-2 w-full rounded-lg border p-3 text-left transition",
        active
          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10"
          : "border-[var(--theme-border)] bg-[var(--theme-surface-solid)] hover:bg-[var(--theme-surface-hover)]",
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="truncate text-sm font-extrabold text-[var(--theme-text-strong)]">{item.name}</span>
        <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-black text-[var(--theme-text-muted)] ring-1 ring-[var(--theme-border)] dark:bg-zinc-950/80">
          v{item.version}
        </span>
      </div>
      <div className="flex items-center gap-2 text-[11px] font-bold text-[var(--theme-text-muted)]">
        <span className="truncate">{item.key}</span>
        <span>{categoryLabels[item.category]}</span>
        {item.isActive ? <span className="text-emerald-600">激活</span> : <span>停用</span>}
      </div>
    </button>
  );
}

function Field({
  children,
  label,
  wide,
}: {
  children: React.ReactNode;
  label: string;
  wide?: boolean;
}) {
  return (
    <label className={cn("block", wide && "md:col-span-2")}>
      <span className="mb-1 block text-xs font-bold text-[var(--theme-text-muted)]">{label}</span>
      {children}
    </label>
  );
}

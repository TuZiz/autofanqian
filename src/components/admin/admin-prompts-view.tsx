"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle2, FileText, Loader2, Plus, RefreshCw, Save, ToggleLeft, ToggleRight } from "lucide-react";

import { Button } from "@/components/design-system";
import type { AdminPromptsController, AdminPromptTemplate } from "@/lib/admin/use-admin-prompts";
import type { PromptTemplateCategory } from "@/shared/schemas/prompt-template";
import { cn } from "@/lib/utils";

import { AdminStatusPill } from "./admin-console-primitives";
import { AdminWorkspaceShell } from "./admin-workspace-shell";

const categoryLabels: Record<PromptTemplateCategory, string> = {
  idea: "创意",
  outline: "大纲",
  chapter: "章节",
  context: "上下文",
  template: "模板",
  regenerate: "重生成",
};

export function AdminPromptsView({ prompts }: { prompts: AdminPromptsController }) {
  const activeCount = prompts.filtered.filter((item) => item.isActive).length;

  return (
    <AdminWorkspaceShell
      breadcrumbs={[{ label: "提示词模板" }]}
      description="提示词 / 模板中心"
      icon={FileText}
      subtitle="按 category 管理提示词版本。启用某个版本后，同 key 的旧版本会自动停用，AI 调用会记录版本号。"
      title="提示词模板中心"
      userEmail={prompts.user?.email ?? ""}
      meta={
        <div className="flex flex-wrap items-center gap-2">
          <AdminStatusPill tone="neutral">{prompts.filtered.length} 个版本</AdminStatusPill>
          <AdminStatusPill tone="success">激活 {activeCount} 个</AdminStatusPill>
          <AdminStatusPill tone="brand">
            {prompts.category === "all" ? "全部分类" : categoryLabels[prompts.category]}
          </AdminStatusPill>
          <Button
            type="button"
            icon={RefreshCw}
            busy={prompts.loading}
            onClick={() => void prompts.load()}
            className="min-h-9 px-3"
          >
            刷新
          </Button>
          <Button
            type="button"
            icon={Plus}
            onClick={prompts.startCreate}
            className="min-h-9 px-3"
          >
            新增提示词
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 lg:grid-cols-[340px_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-[24px] border border-[var(--theme-border)] bg-[rgba(255,255,255,0.78)] shadow-[var(--theme-shadow-card)]">
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

        {prompts.error ? (
          <div className="mb-3 rounded-lg border border-[var(--theme-danger-border)] bg-[var(--theme-danger-soft)] px-4 py-3 text-sm font-bold text-[var(--theme-danger-text)]">
            {prompts.error}
          </div>
        ) : null}
        {prompts.notice ? (
          <div className="mb-3 rounded-lg border border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] px-4 py-3 text-sm font-bold text-[var(--theme-brand-text)]">
            {prompts.notice}
          </div>
        ) : null}

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

        <section className="overflow-hidden rounded-[24px] border border-[var(--theme-border)] bg-[rgba(255,255,255,0.82)] shadow-[var(--theme-shadow-card)]">
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
                <span className="inline-flex h-7 items-center gap-1 rounded-full bg-[var(--theme-brand-soft)] px-2.5 text-xs font-black text-[var(--theme-brand-text)] ring-1 ring-[var(--theme-brand-border)]">
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
                  {prompts.draft.isActive ? <ToggleRight className="h-5 w-5 text-[var(--theme-brand-text)]" /> : <ToggleLeft className="h-5 w-5" />}
                  {prompts.draft.isActive ? "保存后启用" : "保存为停用"}
                </button>
              </Field>
              <Field label="提示词内容" wide>
                <textarea
                  value={prompts.draft.content}
                  onChange={(event) => prompts.setDraft((draft) => ({ ...draft, content: event.target.value }))}
                  rows={18}
                  className="w-full resize-y rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 py-3 font-mono text-sm leading-6 outline-none focus:border-[var(--theme-brand-border)] focus:ring-2 focus:ring-[var(--theme-brand-500)]/10"
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
                    className="h-10 rounded-lg border border-[var(--theme-danger-border)] bg-[var(--theme-danger-soft)] px-4 text-sm font-bold text-[var(--theme-danger-text)] disabled:opacity-50"
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
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--theme-text-strong)] px-5 text-sm font-bold text-[var(--theme-surface-solid)] disabled:opacity-50"
                >
                  {prompts.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  保存
                </button>
              </div>
            </div>
        </section>
      </div>
    </AdminWorkspaceShell>
  );
}

function CategoryButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 shrink-0 rounded-lg px-3 text-xs font-black transition",
        active
          ? "bg-[var(--theme-text-strong)] text-[var(--theme-surface-solid)]"
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
          ? "border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)]"
          : "border-[var(--theme-border)] bg-[var(--theme-surface-solid)] hover:bg-[var(--theme-surface-hover)]",
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="truncate text-sm font-extrabold text-[var(--theme-text-strong)]">{item.name}</span>
        <span className="shrink-0 rounded-full bg-[var(--theme-surface-overlay)] px-2 py-0.5 text-[10px] font-black text-[var(--theme-text-muted)] ring-1 ring-[var(--theme-border)]">
          v{item.version}
        </span>
      </div>
      <div className="flex items-center gap-2 text-[11px] font-bold text-[var(--theme-text-muted)]">
        <span className="truncate">{item.key}</span>
        <span>{categoryLabels[item.category]}</span>
        {item.isActive ? <span className="text-[var(--theme-brand-text)]">激活</span> : <span>停用</span>}
      </div>
    </button>
  );
}

function Field({
  children,
  label,
  wide,
}: {
  children: ReactNode;
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

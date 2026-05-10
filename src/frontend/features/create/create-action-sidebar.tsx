"use client";

import { FileText, Gauge, Settings2 } from "lucide-react";

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
        "w-full min-w-0 self-start min-[1260px]:sticky min-[1260px]:top-[4.5rem]",
        className,
      )}
    >
      <div className="space-y-3">
        <section className="overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] shadow-sm">
          <div className="border-b border-[var(--theme-border)] px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">
                  <Gauge className="h-3.5 w-3.5" />
                  操作栏
                </div>
                <h2 className="mt-1.5 text-base font-semibold text-[var(--theme-text-strong)]">
                  生成大纲
                </h2>
              </div>
            </div>

            <div className="mt-2.5">
              <SubmitOutlineButton create={create} sidebar />
            </div>
          </div>
        </section>

        {selectedTemplate ? (
          <section className="overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] shadow-sm">
            <div className="border-b border-[var(--theme-border)] px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--theme-text-strong)]">
                <FileText className="h-4 w-4 text-[var(--theme-text-secondary)]" />
                当前模板
              </div>
            </div>
            <div className="px-4 py-3">
              <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] px-3 py-2.5">
                <div className="text-xs font-semibold text-[var(--theme-text-muted)]">{selectedTemplate.genreLabel}</div>
                <div className="mt-1 text-sm font-semibold text-[var(--theme-text-strong)]">{selectedTemplate.label}</div>
              </div>
            </div>
          </section>
        ) : null}

        <CompactCreateOptions create={create} />
      </div>
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
    <section className="overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] shadow-sm">
      <div className="border-b border-[var(--theme-border)] px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--theme-text-strong)]">
          <Settings2 className="h-4 w-4 text-[var(--theme-text-secondary)]" />
          参数配置
        </div>
      </div>

      <div className="space-y-3 px-4 py-3">
        <SelectField
          label="目标平台"
          value={platform}
          onChange={setPlatform}
          options={[{ id: "", label: "默认平台" }, ...platforms]}
        />

        <SelectField
          label="目标字数"
          value={words}
          onChange={setWords}
          options={wordOptions}
        />

        <label className="block">
          <span className="text-sm font-semibold text-[var(--theme-text-strong)]">仿书 DNA</span>
          <input
            value={dnaBookTitle}
            list="create-sidebar-dna-book-suggestions"
            disabled={!isAdmin}
            onChange={(event) => setDnaBookTitle(event.target.value)}
            placeholder={isAdmin ? "输入参考作品名称" : "仅管理员可用"}
            className="mt-1.5 h-10 w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 text-sm font-medium text-[var(--theme-text-primary)] outline-none transition-all placeholder:text-[var(--theme-text-muted)] focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/12 disabled:cursor-not-allowed disabled:bg-[var(--theme-surface-overlay)] disabled:text-[var(--theme-text-secondary)]"
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

        <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] px-3 py-2 text-xs leading-5 text-[var(--theme-text-secondary)]">
          DNA 只提取结构与写法偏好，不会复制原作剧情。
        </div>
      </div>
    </section>
  );
}

function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ id: string; label: string }>;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[var(--theme-text-strong)]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-10 w-full cursor-pointer appearance-none rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 text-sm font-medium text-[var(--theme-text-primary)] outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/12"
      >
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}

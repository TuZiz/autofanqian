"use client";

import { ChevronDown, FileText, Settings2 } from "lucide-react";

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
        {/* 提交按钮 */}
        <div className="rounded-2xl bg-[var(--theme-surface-solid)] p-4">
          <SubmitOutlineButton create={create} sidebar />
        </div>

        {/* 当前模板 */}
        {selectedTemplate && (
          <div className="rounded-2xl bg-[var(--theme-surface-solid)] p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-[var(--theme-text-muted)]">
              <FileText className="h-3.5 w-3.5" />
              当前模板
            </div>
            <div className="rounded-xl bg-[var(--theme-surface-overlay)] px-3.5 py-3">
              <div className="text-[11px] font-medium text-[var(--theme-text-muted)]">
                {selectedTemplate.genreLabel}
              </div>
              <div className="mt-0.5 text-sm font-semibold text-[var(--theme-text-strong)]">
                {selectedTemplate.label}
              </div>
            </div>
          </div>
        )}

        {/* 参数配置 */}
        <CompactCreateOptions create={create} />
      </div>
    </aside>
  );
}

function CompactCreateOptions({
  create,
}: {
  create: DashboardCreateController;
}) {
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
    <div className="rounded-2xl bg-[var(--theme-surface-solid)] p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-[var(--theme-text-muted)]">
        <Settings2 className="h-3.5 w-3.5" />
        参数配置
      </div>

      <div className="space-y-3">
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
          <span className="text-xs font-semibold text-[var(--theme-text-muted)]">
            仿书 DNA
          </span>
          <div className="relative mt-1.5">
            <input
              value={dnaBookTitle}
              list="create-sidebar-dna-book-suggestions"
              disabled={!isAdmin}
              onChange={(event) => setDnaBookTitle(event.target.value)}
              placeholder={
                isAdmin ? "输入参考作品名称" : "仅管理员可用"
              }
              className="h-10 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3.5 pr-8 text-sm text-[var(--theme-text-strong)] outline-none transition-all placeholder:text-[var(--theme-text-muted)] hover:border-[var(--theme-text-muted)] focus:border-[var(--theme-text-strong)] focus:ring-2 focus:ring-[var(--theme-text-strong)]/10 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
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
    </div>
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
      <span className="text-xs font-semibold text-[var(--theme-text-muted)]">
        {label}
      </span>
      <div className="relative mt-1.5">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3.5 pr-9 text-sm text-[var(--theme-text-strong)] outline-none transition-all hover:border-[var(--theme-text-muted)] focus:border-[var(--theme-text-strong)] focus:ring-2 focus:ring-[var(--theme-text-strong)]/10"
        >
          {options.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--theme-text-muted)]" />
      </div>
    </label>
  );
}

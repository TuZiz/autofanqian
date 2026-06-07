"use client";

import { ChevronDown, Settings2, Sparkles, Wand2 } from "lucide-react";

import { ProgressPanel, SectionCard, StatusBadge } from "@/components/design-system";
import { extractBookName } from "@/lib/create/dashboard-create-utils";
import type { DashboardCreateController } from "@/lib/create/use-dashboard-create";
import { cn } from "@/lib/utils";

import { IdeaAnalysisPanel } from "./idea-analysis-panel";
import { SubmitOutlineButton } from "./submit-outline-button";

export function CreateActionSidebar({
  className,
  create,
}: {
  className?: string;
  create: DashboardCreateController;
}) {
  return (
    <aside
      className={cn(
        "w-full min-w-0 self-start min-[1180px]:sticky min-[1180px]:top-3",
        className,
      )}
    >
      <div className="space-y-3">
        <SectionCard
          accent={false}
          className="rounded-[8px] [&>div:first-of-type]:px-3 [&>div:first-of-type]:py-2.5 [&>div:last-child]:p-3"
          icon={Sparkles}
          title="AI 预览"
          description="先检查卖点与读者，再生成大纲。"
        >
          <div className="space-y-2.5">
            {create.showAiProgress ? (
              <ProgressPanel
                label={create.aiThinkingCopy || "AI 正在分析创意"}
                progress={create.aiProgressPercent}
                description="正在整理题材、卖点、目标读者和结构方向。"
                status={<StatusBadge tone="ai">{create.aiProgressPercent}%</StatusBadge>}
              />
            ) : null}

            {create.ideaAnalysis ? (
              <IdeaAnalysisPanel analysis={create.ideaAnalysis} />
            ) : (
              <div className="rounded-[6px] border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface-soft)] p-3">
                <div className="flex items-start gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-600)] ring-1 ring-[var(--theme-brand-border)]">
                    <Wand2 className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-[var(--theme-text-strong)]">
                      等待创意分析
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-[var(--theme-text-secondary)]">
                      填写创意后点击“分析创意”，这里展示卖点、书名和读者。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {create.formError ? (
              <div className="rounded-[6px] border border-[var(--theme-danger-border)] bg-[var(--theme-danger-soft)] px-3 py-2 text-sm font-semibold text-[var(--theme-danger-text)]">
                {create.formError}
              </div>
            ) : null}

            <SubmitOutlineButton create={create} sidebar />
            <p className="text-center text-xs font-semibold leading-5 text-[var(--theme-text-muted)]">
              {create.submitBlockedReason || "设定完整后会生成可继续编辑的大纲。"}
            </p>
          </div>
        </SectionCard>

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
    <SectionCard
      accent={false}
      className="rounded-[8px] [&>div:first-of-type]:px-3 [&>div:first-of-type]:py-2.5 [&>div:last-child]:p-3"
      id="create-options-section"
      icon={Settings2}
      title="风格参数"
      description="目标平台、目标字数和可选仿书 DNA。"
    >
      <div className="space-y-2.5">
        <SelectField
          label="目标平台"
          value={platform}
          onChange={setPlatform}
          options={[{ id: "", label: "请选择目标平台" }, ...platforms]}
          selectId="create-platform-select"
        />

        <SelectField
          label="目标字数"
          value={words}
          onChange={setWords}
          options={[{ id: "", label: "请选择目标字数" }, ...wordOptions]}
          selectId="create-words-select"
        />

        <label className="block">
          <span className="text-xs font-black text-[var(--theme-text-muted)]">仿书 DNA</span>
          <div className="relative mt-1.5">
            <input
              value={dnaBookTitle}
              list="create-sidebar-dna-book-suggestions"
              disabled={!isAdmin}
              onChange={(event) => setDnaBookTitle(event.target.value)}
              placeholder={isAdmin ? "输入参考作品名称" : "仅管理员可用"}
              className="h-9 w-full rounded-[4px] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 pr-9 text-sm font-semibold text-[var(--theme-text-primary)] outline-none transition placeholder:text-[var(--theme-text-muted)] focus:border-[var(--theme-brand-border)] focus:ring-4 focus:ring-[var(--theme-brand-subtle)] disabled:cursor-not-allowed disabled:opacity-50"
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
    </SectionCard>
  );
}

function SelectField({
  label,
  onChange,
  options,
  selectId,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ id: string; label: string }>;
  selectId?: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black text-[var(--theme-text-muted)]">{label}</span>
      <div className="relative mt-1.5">
        <select
          id={selectId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-full cursor-pointer appearance-none rounded-[4px] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 pr-9 text-sm font-semibold text-[var(--theme-text-primary)] outline-none transition focus:border-[var(--theme-brand-border)] focus:ring-4 focus:ring-[var(--theme-brand-subtle)]"
        >
          {options.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--theme-text-muted)]" />
      </div>
    </label>
  );
}

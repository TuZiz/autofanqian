"use client";

import { motion } from "framer-motion";
import {
  AlertCircle,
  Lightbulb,
  ListChecks,
  Loader2,
  PenLine,
  RefreshCw,
  Sparkles,
  Wand2,
} from "lucide-react";
import type { ReactNode } from "react";

import {
  AppShell,
  MobileBottomNav,
  SectionCard,
  StatusBadge,
} from "@/components/design-system";
import {
  getShortStoryStageMessage,
  getShortStoryWordOptionHint,
  type ShortStoryCreateController,
} from "@/lib/create/use-short-story-create";
import { cn } from "@/lib/utils";

import { CreateWorkspaceHeader, type CreateStep } from "./create-workspace-header";
import {
  getShortStoryEndingLabel,
  getShortStoryPovLabel,
  getShortStoryStructureLabel,
  getShortStoryStyleLabel,
} from "./short-story-labels";

const GENRE_PRESETS = ["悬疑", "恋爱", "反转", "脑洞", "虐文", "爽文", "短剧风", "小红书故事"];
const SHORT_STEPS = [
  { label: "确定创意", text: "题材、关键词和核心钩子" },
  { label: "短篇结构", text: "模板、视角、结局倾向" },
  { label: "一键成文", text: "8000 字以上进入后台任务" },
  { label: "润色导出", text: "进入作品页继续编辑" },
] satisfies CreateStep[];

type ShortStoryCreateViewProps = {
  create: ShortStoryCreateController;
};

export function ShortStoryCreateView({ create }: ShortStoryCreateViewProps) {
  const stageText = getShortStoryStageMessage(create.stage);
  const createProgress = getShortCreateProgress(create);

  return (
    <AppShell
      className="create-modern-shell"
      maxWidthClassName="max-w-[1500px]"
      mobileNav={<MobileBottomNav activeHref="/dashboard/create" />}
    >
      <form onSubmit={create.handleSubmit} noValidate className="space-y-3">
        <CreateWorkspaceHeader
          active="short"
          ariaLabel="短篇创建进度"
          currentStepIndex={createProgress.currentStepIndex}
          progress={createProgress.progress}
          steps={SHORT_STEPS}
          title="短篇创作任务台"
        />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="grid gap-3 min-[1120px]:grid-cols-[minmax(0,1fr)_360px]"
        >
          <div className="min-w-0">
            <p className="mb-2 text-xs font-black text-[var(--theme-brand-600)]">
              一篇完结 · 快速成稿 · 可润色投稿和导出
            </p>
            <ParameterSection create={create} />
          </div>

          <aside className="min-w-0 min-[1120px]:sticky min-[1120px]:top-3 min-[1120px]:self-start">
            <ShortSubmitPanel create={create} stageText={stageText} />
          </aside>
        </motion.div>
      </form>
    </AppShell>
  );
}

function getShortCreateProgress(create: ShortStoryCreateController) {
  const generating = create.stage === "outline" || create.stage === "work" || create.stage === "queued";
  const completed = create.stage === "done"
    ? SHORT_STEPS.length
    : generating
      ? 3
      : create.inputValid
        ? 2
        : create.idea.trim().length >= 10
          ? 1
          : 0;
  const progress = (completed / SHORT_STEPS.length) * 100;
  const currentStepIndex = Math.max(0, Math.min(completed, SHORT_STEPS.length - 1));

  return {
    currentStepIndex,
    progress,
  };
}

function ParameterSection({ create }: { create: ShortStoryCreateController }) {
  const customGenre = GENRE_PRESETS.includes(create.genre) ? "" : create.genre;
  const structureSummary = getStructureSummary(create);

  return (
    <SectionCard
      accent={false}
      className="rounded-[8px] [&>div:first-of-type]:px-3 [&>div:first-of-type]:py-3 [&>div:last-child]:p-3"
      icon={ListChecks}
      title="参数区"
      description="先确定类型、字数和核心创意。"
      actions={<StatusBadge>{create.ideaCount}/2000</StatusBadge>}
    >
      <div className="space-y-3">
        <div className="overflow-hidden rounded-[8px] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)]">
          <div className="border-b border-[var(--theme-divider)] px-3 py-2.5">
            <h3 className="text-sm font-black text-[var(--theme-text-strong)]">故事参数</h3>
            <p className="mt-0.5 truncate text-xs font-semibold text-[var(--theme-text-muted)]">
              {create.genre || "未选类型"} · {structureSummary}
            </p>
          </div>

          <div className="grid min-[860px]:grid-cols-2">
            <GenreChoiceGroup
              className="border-b border-[var(--theme-divider)] min-[860px]:border-r"
              customGenre={customGenre}
              genre={create.genre}
              onChange={create.setGenre}
            />
            <ParameterChoiceGroup
              className="border-b border-[var(--theme-divider)]"
              label="结构"
              options={create.structureTemplateOptions}
              value={create.structureTemplate}
              onChange={create.setStructureTemplate}
              renderLabel={getShortStoryStructureLabel}
            />
          </div>

          <div className="grid min-[860px]:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <ParameterChoiceGroup
              className="border-b border-[var(--theme-divider)] min-[860px]:border-r"
              label="风格"
              options={create.styleOptions}
              value={create.style}
              onChange={create.setStyle}
              renderLabel={getShortStoryStyleLabel}
            />
            <ParameterChoiceGroup
              className="border-b border-[var(--theme-divider)]"
              label="视角"
              options={create.povOptions}
              value={create.pov}
              onChange={create.setPov}
              renderLabel={getShortStoryPovLabel}
            />
          </div>

          <div className="grid min-[860px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <ParameterChoiceGroup
              className="min-[860px]:border-r min-[860px]:border-[var(--theme-divider)]"
              label="结局"
              options={create.endingOptions}
              value={create.endingType}
              onChange={create.setEndingType}
              renderLabel={getShortStoryEndingLabel}
            />
            <div className="min-w-0 bg-[var(--theme-surface-soft)] px-3 py-3 text-xs font-semibold leading-5 text-[var(--theme-text-secondary)]">
              <p className="font-black text-[var(--theme-text-strong)]">创作取向</p>
              <p className="mt-1">
                短篇更吃钩子、节奏和结尾回收，参数越明确，生成时越不容易散。
              </p>
            </div>
          </div>
        </div>
        <FieldError message={create.fieldErrors.genre} />
        <FieldError message={create.fieldErrors.endingType} />

        <div className="grid gap-3 min-[760px]:grid-cols-[minmax(0,1fr)_280px]">
          <div className="rounded-[8px] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-3">
            <FieldLabel label="关键词" />
            <input
              value={create.tagsText}
              onChange={(event) => create.setTagsText(event.target.value)}
              className="h-10 w-full rounded-[6px] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 text-sm font-semibold text-[var(--theme-text-primary)] outline-none transition placeholder:text-[var(--theme-text-muted)] focus:border-[var(--theme-brand-border)] focus:ring-4 focus:ring-[var(--theme-brand-subtle)]"
              placeholder="例如：雨夜 反杀 暗恋"
            />
            <p className="mt-1.5 text-xs font-semibold text-[var(--theme-text-muted)]">
              添加核心关键词，帮助 AI 抓住情绪和反转。
            </p>
            <FieldError message={create.fieldErrors.tags} />
          </div>

          <div className="rounded-[8px] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-3">
            <FieldLabel label="目标字数" />
            <select
              value={create.targetPreset}
              onChange={(event) => create.setTargetPreset(event.target.value)}
              className="h-10 w-full rounded-[6px] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 text-sm font-semibold text-[var(--theme-text-primary)] outline-none transition focus:border-[var(--theme-brand-border)] focus:ring-4 focus:ring-[var(--theme-brand-subtle)]"
            >
              {create.wordOptions.map((words) => (
                <option key={words} value={words}>
                  {words.toLocaleString("zh-CN")} 字 · {getShortStoryWordOptionHint(words)}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs font-semibold text-[var(--theme-text-muted)]">
              {getShortStoryWordOptionHint(create.targetWords)}
            </p>
            <FieldError message={create.fieldErrors.targetWords} />
          </div>
        </div>

        <div>
          <FieldLabel label="核心创意" />
          <div className="overflow-hidden rounded-[8px] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] transition focus-within:border-[var(--theme-brand-border)] focus-within:ring-4 focus-within:ring-[var(--theme-brand-subtle)]">
            <textarea
              value={create.idea}
              onChange={(event) => create.setIdea(event.target.value.slice(0, 2000))}
              className="min-h-[164px] w-full resize-y bg-transparent px-3.5 py-3 text-[15px] font-semibold leading-7 text-[var(--theme-text-primary)] outline-none placeholder:text-[var(--theme-text-muted)]"
              placeholder="写清主角、冲突、反转或情绪落点。至少 10 个字。"
            />
            <div className="flex items-center justify-between gap-3 border-t border-[var(--theme-divider)] bg-[var(--theme-surface-soft)] px-3 py-2">
              <p className="min-w-0 truncate text-xs font-semibold text-[var(--theme-text-muted)]">
                创意越具体，短篇生成结果越稳定。
              </p>
              <span className="shrink-0 text-xs font-black text-[var(--theme-text-secondary)]">
                {create.ideaCount}/2000 字
              </span>
            </div>
          </div>
          <FieldError message={create.fieldErrors.idea} />
        </div>
      </div>
    </SectionCard>
  );
}

function ShortSubmitPanel({
  create,
  stageText,
}: {
  create: ShortStoryCreateController;
  stageText: string;
}) {
  const status = create.asyncJob?.status ?? (create.busy ? "running" : "queued");
  const failed = status === "failed" || create.stage === "failed";
  const running = create.busy || status === "running" || status === "queued" || status === "stale";
  const hasGenre = create.genre.trim().length > 0;
  const hasIdea = create.idea.trim().length >= 10;
  const structureSummary = getStructureSummary(create);
  const submitLabel = create.busy
    ? "生成中..."
    : !hasGenre || !hasIdea
      ? "先补齐创意"
      : "一键生成短篇";
  const progress = create.asyncProgress?.totalSegments
    ? (create.asyncProgress.generatedSegments / create.asyncProgress.totalSegments) * 100
    : create.stage === "done"
      ? 100
      : running
        ? 28
        : 0;

  return (
    <div className="space-y-3">
      <section className="overflow-hidden rounded-[8px] border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] shadow-[var(--theme-shadow-card)]">
        <div className="flex items-start gap-3 bg-[linear-gradient(135deg,var(--theme-brand-soft),transparent)] px-3 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] bg-[var(--theme-surface-solid)] text-[var(--theme-brand-600)] ring-1 ring-[var(--theme-brand-border)]">
            <Wand2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-black text-[var(--theme-text-strong)]">生成短篇</h2>
            <p className="mt-1 text-sm font-semibold leading-5 text-[var(--theme-text-secondary)]">
              AI 将基于你的创意，生成完整短篇小说。
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[8px] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-3 shadow-[var(--theme-shadow-card)]">
        <div className="space-y-3">
          <AsyncJobPanel
            failed={failed}
            label={failed ? "后台生成失败" : create.asyncJobId ? "后台分段生成" : "等待提交"}
            progress={progress}
            progressLabel={create.asyncProgress?.label ?? ""}
            targetWords={create.targetWords}
            status={<StatusBadge tone={failed ? "danger" : running ? "ai" : "neutral"}>{formatJobStatus(status)}</StatusBadge>}
          />

          {create.formError ? (
            <div className="rounded-[6px] border border-[var(--theme-danger-border)] bg-[var(--theme-danger-soft)] px-3 py-2 text-sm font-semibold text-[var(--theme-danger-text)]">
              {create.formError}
            </div>
          ) : null}

          {failed ? (
            <div className="rounded-[6px] border border-[var(--theme-danger-border)] bg-[var(--theme-danger-soft)] p-3 text-sm font-semibold text-[var(--theme-danger-text)]">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-black">失败原因</p>
                  <p className="mt-1 leading-6">{create.asyncJob?.errorMessage || create.formError || "后台任务失败，请重试。"}</p>
                </div>
              </div>
              {create.asyncJobId ? (
                <button
                  type="button"
                  onClick={() => void create.retryAsyncJob()}
                  disabled={create.retrying}
                  className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-[6px] bg-[var(--theme-danger-text)] px-3 text-xs font-black text-white transition disabled:cursor-wait disabled:opacity-65"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", create.retrying ? "animate-spin" : "")} />
                  {create.retrying ? "正在重试..." : "重试后台生成"}
                </button>
              ) : null}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={create.busy}
            className="theme-brand-gradient-bg inline-flex h-11 w-full items-center justify-center gap-2 rounded-[6px] px-4 text-sm font-black text-white shadow-[var(--theme-shadow-button)] transition hover:-translate-y-0.5 active:translate-y-px disabled:cursor-wait disabled:opacity-65"
          >
            {create.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
            {submitLabel}
          </button>

          <p className="text-center text-xs font-semibold leading-5 text-[var(--theme-text-muted)]">
            {stageText}
          </p>
        </div>
      </section>

      <section className="rounded-[8px] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-3 shadow-[var(--theme-shadow-card)]">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-600)] ring-1 ring-[var(--theme-brand-border)]">
            <ListChecks className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-black text-[var(--theme-text-strong)]">创作概览</h2>
            <p className="text-xs font-semibold text-[var(--theme-text-muted)]">提交前快速核对生成方向。</p>
          </div>
        </div>
        <CompactSummary
          genre={create.genre || "未填写"}
          hasGenre={hasGenre}
          hasIdea={hasIdea}
          ideaCount={create.ideaCount}
          structureSummary={structureSummary}
          targetWords={create.targetWords}
        />
      </section>

      <section className="rounded-[8px] border border-[var(--theme-info-border)] bg-[var(--theme-info-soft)] p-3">
        <div className="flex items-start gap-2.5">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[var(--theme-info-text)]" />
          <div>
            <h2 className="text-sm font-black text-[var(--theme-text-strong)]">小贴士</h2>
            <p className="mt-1 text-xs font-semibold leading-5 text-[var(--theme-text-secondary)]">
              创意越具体，生成效果越好。可以先用“雨夜反杀”“双向误会”这类关键词锁定情绪。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function AsyncJobPanel({
  failed,
  label,
  progress,
  progressLabel,
  status,
  targetWords,
}: {
  failed: boolean;
  label: string;
  progress: number;
  progressLabel: string;
  status: ReactNode;
  targetWords: number;
}) {
  return (
    <CompactProgress
      failed={failed}
      label={label}
      progress={progress}
      description={
        progressLabel
          ? <>已生成段落：{progressLabel}</>
          : targetWords >= 8000
            ? "提交后会创建后台任务并分段生成正文。"
            : "当前字数通常会直接生成完成。"
      }
      status={status}
    />
  );
}

function CompactProgress({
  description,
  failed,
  label,
  progress,
  status,
}: {
  description: ReactNode;
  failed: boolean;
  label: string;
  progress: number;
  status: ReactNode;
}) {
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <div className="rounded-[6px] bg-[var(--theme-surface-soft)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-extrabold text-[var(--theme-text-strong)]">
            <Sparkles className={cn("h-4 w-4", failed ? "text-[var(--theme-danger-text)]" : "text-[var(--theme-brand-600)]")} />
            <span className="truncate">{label}</span>
          </div>
          <p className="mt-1 text-xs font-semibold leading-5 text-[var(--theme-text-muted)]">{description}</p>
        </div>
        <div className="shrink-0">{status}</div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--theme-surface-overlay)]">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500",
            failed ? "bg-[var(--theme-danger-text)]" : "theme-brand-gradient-bg",
          )}
          style={{ width: `${safeProgress}%` }}
        />
      </div>
    </div>
  );
}

function CompactSummary({
  genre,
  hasGenre,
  hasIdea,
  ideaCount,
  structureSummary,
  targetWords,
}: {
  genre: string;
  hasGenre: boolean;
  hasIdea: boolean;
  ideaCount: number;
  structureSummary: string;
  targetWords: number;
}) {
  return (
    <div className="text-xs font-semibold leading-5 text-[var(--theme-text-muted)]">
      <div className="grid gap-2">
        <SummaryToken label="类型" ready={hasGenre} value={genre} />
        <SummaryToken label="创意" ready={hasIdea} value={hasIdea ? `${ideaCount}/2000` : "至少 10 字"} />
        <SummaryToken
          label="字数"
          ready
          value={`${Number.isFinite(targetWords) ? targetWords.toLocaleString("zh-CN") : "-"} 字`}
        />
      </div>
      <p className="mt-2 truncate border-t border-[var(--theme-divider)] pt-2 text-[var(--theme-text-secondary)]">
        结构：{structureSummary}
      </p>
    </div>
  );
}

function SummaryToken({
  label,
  ready,
  value,
}: {
  label: string;
  ready: boolean;
  value: string;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          ready ? "bg-[var(--theme-brand-600)]" : "bg-[var(--theme-danger-text)]",
        )}
      />
      <span className="shrink-0">{label}</span>
      <span className="truncate font-black text-[var(--theme-text-strong)]">{value}</span>
    </span>
  );
}

function formatJobStatus(status: string) {
  const labels: Record<string, string> = {
    cancelled: "已取消",
    failed: "失败",
    queued: "排队中",
    running: "生成中",
    stale: "等待恢复",
    success: "已完成",
    succeeded: "已完成",
  };
  return labels[status] ?? status;
}

function FieldLabel({ label }: { label: string }) {
  return <label className="mb-1.5 block text-sm font-black text-[var(--theme-text-strong)]">{label}</label>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1.5 rounded-[4px] bg-[var(--theme-danger-soft)] px-2.5 py-1.5 text-xs font-black text-[var(--theme-danger-text)]">
      <AlertCircle className="h-3.5 w-3.5" />
      {message}
    </p>
  );
}

function GenreChoiceGroup({
  className,
  customGenre,
  genre,
  onChange,
}: {
  className?: string;
  customGenre: string;
  genre: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className={cn("min-w-0 bg-[var(--theme-surface-solid)] p-3", className)}>
      <ParameterGroupLabel label="类型" />
      <div className="flex min-w-0 flex-wrap gap-1.5">
        {GENRE_PRESETS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={cn(
              "h-8 rounded-[6px] border px-2.5 text-xs font-black transition",
              genre === item
                ? "border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)]"
                : "border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface-hover)]",
            )}
          >
            {item}
          </button>
        ))}
        <input
          value={customGenre}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 min-w-[96px] flex-1 rounded-[6px] border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] px-2.5 text-xs font-semibold text-[var(--theme-text-primary)] outline-none transition placeholder:text-[var(--theme-text-muted)] focus:border-[var(--theme-brand-border)] focus:ring-4 focus:ring-[var(--theme-brand-subtle)]"
          placeholder="自定义"
          maxLength={64}
        />
      </div>
    </div>
  );
}

function ParameterChoiceGroup<T extends string>({
  className,
  label,
  onChange,
  options,
  renderLabel,
  value,
}: {
  className?: string;
  label: string;
  onChange: (value: T) => void;
  options: readonly T[];
  renderLabel: (value: T) => string;
  value: T;
}) {
  return (
    <div className={cn("min-w-0 bg-[var(--theme-surface-solid)] p-3", className)}>
      <ParameterGroupLabel label={label} />
      <div className="flex min-w-0 flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              "h-8 rounded-[6px] border px-2.5 text-xs font-black transition",
              value === option
                ? "border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)]"
                : "border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface-hover)]",
            )}
          >
            {renderLabel(option)}
          </button>
        ))}
      </div>
    </div>
  );
}

function ParameterGroupLabel({ label }: { label: string }) {
  return <div className="mb-1 text-[11px] font-black text-[var(--theme-text-muted)]">{label}</div>;
}

function getStructureSummary(create: ShortStoryCreateController) {
  return [
    getShortStoryStructureLabel(create.structureTemplate),
    getShortStoryStyleLabel(create.style),
    getShortStoryPovLabel(create.pov),
    getShortStoryEndingLabel(create.endingType),
  ].join(" / ");
}

"use client";

import {
  BookOpen,
  CheckCircle2,
  Clock,
  Database,
  Library,
  ListTree,
  PenLine,
  Plus,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";

import {
  AiButton,
  Button,
  StatusBadge,
  Surface,
} from "@/components/design-system";
import { formatWordStat } from "@/lib/dashboard/dashboard-format";
import {
  getChapterLine,
  getEditorialTone,
  getPlanningLabel,
  getProgressCopy,
  getTitleInitial,
} from "@/lib/dashboard/dashboard-visual";
import type { DashboardClientController } from "@/lib/dashboard/use-dashboard-client";
import { cn } from "@/lib/utils";
import { isShortStoryWork } from "@/shared/work-type";

type DashboardOverview = NonNullable<DashboardClientController["overview"]>;
type DashboardActiveWork = DashboardOverview["activeWork"];

type DashboardStat = {
  helper: string;
  icon: LucideIcon;
  label: string;
  value: string;
};

export function DashboardStatsGrid({
  activeWork,
  overview,
}: {
  activeWork: DashboardActiveWork | null;
  overview: DashboardClientController["overview"];
}) {
  const stats = useMemo<DashboardStat[]>(() => {
    const words = formatWordStat(overview?.stats.totalWords ?? 0);
    const activeWords = formatWordStat(activeWork?.wordCount ?? 0);

    return [
      {
        helper: "全部正文累计",
        icon: PenLine,
        label: "总字数",
        value: `${words.value}${words.unit}`,
      },
      {
        helper: "长篇、短篇、导入稿",
        icon: Library,
        label: "作品数",
        value: `${overview?.stats.workCount ?? 0}`,
      },
      {
        helper: "章节与短篇场景",
        icon: BookOpen,
        label: "章节数",
        value: `${overview?.stats.chapterCount ?? 0}`,
      },
      {
        helper: activeWork ? "最近活跃稿件" : "等待第一部作品",
        icon: TrendingUp,
        label: "当前稿件",
        value: activeWork ? `${activeWords.value}${activeWords.unit}` : "0字",
      },
    ];
  }, [activeWork, overview]);

  return (
    <section aria-label="工作台统计" className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((item) => (
        <DashboardStatCard key={item.label} {...item} />
      ))}
    </section>
  );
}

export function DashboardFocusPanel({
  activeWork,
  onCreate,
  onContinue,
  onManage,
  onSettings,
}: {
  activeWork: DashboardActiveWork | null;
  onCreate: () => void;
  onContinue: () => void;
  onManage: () => void;
  onSettings: () => void;
}) {
  if (!activeWork) {
    return (
      <Surface className="relative overflow-hidden rounded-[6px] p-5 sm:p-6" variant="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge className="rounded-[3px]" tone="warning">尚未开稿</StatusBadge>
              <StatusBadge className="rounded-[3px]">写作工作台</StatusBadge>
            </div>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[var(--theme-text-strong)] sm:text-3xl">
              把一个灵感变成第一部作品
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--theme-text-secondary)]">
              从长篇、短篇或旧稿导入开始。工作台会追踪字数、章节、规划窗口和最近入口。
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <AiButton className="rounded-[4px]" onClick={onCreate} icon={Plus}>
              创建作品
            </AiButton>
          </div>
        </div>
      </Surface>
    );
  }

  const activeProgress = getProgressCopy(activeWork);
  const normalizedProgress = Math.max(0, Math.min(100, Math.round(activeProgress.percent || 0)));
  const chapterLine = getChapterLine(activeWork);
  const tone = getEditorialTone(`${activeWork.id}:${activeWork.title}`);
  const coverUrl = activeWork.coverImageUrl || activeWork.coverUrl || null;
  const shortStory = isShortStoryWork(activeWork.workType);
  const wordStat = formatWordStat(activeWork.wordCount);
  const targetCopy = activeProgress.hasTarget
    ? activeProgress.hint.replace(/^目标\s*/, "")
    : "未设定";
  const visibleTags = [
    shortStory ? "短篇" : "长篇",
    activeWork.genreLabel,
    ...activeWork.tags,
  ].filter(Boolean).slice(0, 3);
  const synopsis =
    activeWork.synopsis?.trim() ||
    "这部作品还没有简介。进入作品驾驶舱后，可以补充简介、大纲和下一步写作目标。";

  return (
    <Surface className="relative overflow-hidden rounded-[6px] p-4 shadow-[var(--theme-shadow-panel)] sm:p-5" variant="card">
      <div className="relative grid gap-5 md:grid-cols-[132px_minmax(0,1fr)]">
        <WorkCover
          coverUrl={coverUrl}
          gradient={tone.coverGradient}
          title={activeWork.title}
        />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge className="rounded-[3px]" tone="ai">当前作品</StatusBadge>
            {visibleTags.map((tag) => (
              <StatusBadge className="rounded-[3px]" key={tag}>{tag}</StatusBadge>
            ))}
          </div>
          <h2 className="mt-2 truncate text-2xl font-extrabold tracking-tight text-[var(--theme-text-strong)] sm:text-3xl">
            {activeWork.title}
          </h2>
          <p className="mt-2 flex min-w-0 items-center gap-2 text-sm font-bold text-[var(--theme-text-strong)]">
            <BookOpen className="h-4 w-4 shrink-0" />
            <span className="truncate">{chapterLine}</span>
          </p>
          <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-[var(--theme-text-secondary)]">
            {synopsis}
          </p>

          <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm font-bold">
                <span className="truncate text-[var(--theme-text-strong)]">
                  已写 {wordStat.value}{wordStat.unit} / 目标 {targetCopy}
                </span>
                <span className="shrink-0 text-[var(--theme-text-strong)]">{activeProgress.value}</span>
              </div>
              <div className="relative h-1.5 overflow-hidden rounded-[2px] bg-[var(--theme-surface-overlay)]">
                <div
                  className="theme-brand-gradient-bg h-full rounded-[2px] shadow-[0_0_18px_var(--theme-primary-glow)] transition-[width] duration-700"
                  style={{ width: `${normalizedProgress}%` }}
                />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <MiniMetric label="已写字数" value={`${wordStat.value}${wordStat.unit}`} />
                <MiniMetric label={shortStory ? "当前场景" : "当前章节"} value={String(activeWork.chapter.index)} />
                <MiniMetric label="规划窗口" value={getPlanningLabel(activeWork)} />
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row lg:w-[426px]">
              <AiButton onClick={onContinue} icon={PenLine} className="min-h-9 flex-1 rounded-[4px] px-3">
                继续写第 {activeWork.chapter.index} 场景
              </AiButton>
              <Button type="button" onClick={onManage} icon={ListTree} className="min-h-9 flex-1 rounded-[4px] px-3 shadow-none">
                章节管理
              </Button>
              <Button type="button" onClick={onSettings} icon={Settings} className="min-h-9 flex-1 rounded-[4px] px-3 shadow-none">
                作品设置
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Surface>
  );
}

export function DashboardAiTaskSummary({
  activeWork,
  worksCount,
}: {
  activeWork: DashboardActiveWork | null;
  worksCount: number;
}) {
  return (
    <section className="h-full overflow-hidden rounded-[6px] border border-[var(--theme-border)] bg-[var(--theme-card-secondary)] shadow-[var(--theme-shadow-card)]">
      <div className="flex items-start gap-3 border-b border-[var(--theme-divider)] px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] bg-[var(--theme-surface-overlay)] text-[var(--theme-brand-600)] ring-1 ring-[var(--theme-border)]">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-base font-extrabold text-[var(--theme-text-strong)]">
            AI 状态
          </h2>
          <p className="mt-1 text-sm font-medium leading-5 text-[var(--theme-text-secondary)]">
            系统监控与上下文状态
          </p>
        </div>
      </div>
      <div className="grid gap-2.5 p-4">
        <TaskRow statusTone="success" icon={Zap} title="系统可用" description="AI 服务运行正常，创作功能可用。" />
        <TaskRow
          statusTone={activeWork ? "info" : "neutral"}
          icon={activeWork ? Database : Clock}
          title="上下文已加载"
          description={activeWork ? "当前作品上下文已完整加载。" : "选择作品后加载上下文。"}
        />
        <TaskRow
          statusTone={worksCount ? "ai" : "warning"}
          icon={Target}
          title="准备就绪"
          description={worksCount ? "可正常进行创作与续写。" : "建议先新建或导入作品。"}
        />
      </div>
    </section>
  );
}

function TaskRow({
  description,
  icon: Icon = CheckCircle2,
  statusTone,
  title,
}: {
  description: string;
  icon?: LucideIcon;
  statusTone: "neutral" | "success" | "warning" | "danger" | "ai" | "info";
  title: string;
}) {
  const toneStyles: Record<string, string> = {
    ai: "bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)] ring-[var(--theme-brand-border)]",
    danger: "bg-[var(--theme-danger-soft)] text-[var(--theme-danger-text)] ring-[var(--theme-danger-border)]",
    info: "bg-[var(--theme-info-soft)] text-[var(--theme-info-text)] ring-[var(--theme-info-border)]",
    neutral: "bg-[var(--theme-surface-overlay)] text-[var(--theme-text-secondary)] ring-[var(--theme-border)]",
    success: "bg-[var(--theme-success-soft)] text-[var(--theme-success-text)] ring-[var(--theme-success-border)]",
    warning: "bg-[var(--theme-warning-soft)] text-[var(--theme-warning-text)] ring-[var(--theme-warning-border)]",
  };

  return (
    <div className="flex items-center gap-3 rounded-[4px] border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.42)]">
      <div
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[3px] ring-1",
          toneStyles[statusTone] ?? toneStyles.neutral,
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-[var(--theme-text-strong)]">{title}</p>
        <p className="mt-0.5 truncate text-xs text-[var(--theme-text-secondary)]">{description}</p>
      </div>
      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-[2px] shadow-[0_0_14px_currentColor]", toneStyles[statusTone] ?? toneStyles.neutral)} />
    </div>
  );
}

function DashboardStatCard({
  helper,
  icon: Icon,
  label,
  value,
}: DashboardStat) {
  return (
    <div className="group relative min-w-0 overflow-hidden rounded-[6px] border border-[var(--theme-border)] bg-[var(--theme-card-secondary)] px-4 py-3 shadow-[var(--theme-shadow-card)] transition-all duration-300 hover:border-[var(--theme-border-strong)] hover:bg-[var(--theme-surface-strong)]">
      <div className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-[4px] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-600)] ring-1 ring-[var(--theme-brand-border)]">
        <Icon className="h-4 w-4" />
      </div>
      <p className="truncate text-xs font-bold text-[var(--theme-text-muted)]">{label}</p>
      <p className="mt-2 truncate text-2xl font-extrabold text-[var(--theme-text-strong)]">{value}</p>
      <p className="mt-1 truncate text-xs font-medium text-[var(--theme-text-secondary)]">{helper}</p>
      <div className="mt-4 flex h-8 items-end gap-1.5">
        {[30, 52, 42, 68, 55, 76, 92].map((height, index) => (
          <span
            key={`${label}-${height}-${index}`}
            className="w-full bg-[var(--theme-brand-600)]/75 shadow-[0_0_12px_var(--theme-primary-glow)]"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[4px] bg-[var(--theme-card-secondary)] px-2.5 py-2">
      <p className="truncate text-[11px] font-bold text-[var(--theme-text-muted)]">{label}</p>
      <p className="mt-0.5 truncate text-sm font-extrabold text-[var(--theme-text-strong)]">{value}</p>
    </div>
  );
}

function WorkCover({
  coverUrl,
  gradient,
  title,
}: {
  coverUrl: string | null;
  gradient: string;
  title: string;
}) {
  return (
    <div className="relative mx-auto aspect-[3/4] w-full max-w-[136px] overflow-hidden rounded-[4px] border border-[var(--theme-border-strong)] bg-[var(--theme-card-secondary)] shadow-[var(--theme-shadow-panel)] md:mx-0">
      {coverUrl ? (
        <div
          aria-label={`${title} 封面`}
          className="h-full w-full bg-cover bg-center"
          role="img"
          style={{ backgroundImage: `url("${coverUrl}")` }}
        />
      ) : (
        <>
          <div className="absolute inset-0" style={{ backgroundImage: gradient }} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_45%_20%,rgba(255,255,255,0.32),transparent_20%),linear-gradient(180deg,rgba(5,9,20,0.08),rgba(5,9,20,0.72))]" />
          <div className="absolute inset-x-0 bottom-0 p-4 text-white">
            <div className="text-4xl font-black">{getTitleInitial(title)}</div>
            <div className="mt-2 h-1 w-12 bg-white/60" />
          </div>
        </>
      )}
      <div className="pointer-events-none absolute inset-0 ring-1 ring-white/20" />
    </div>
  );
}

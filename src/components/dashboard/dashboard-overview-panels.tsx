"use client";

import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  Info,
  Library,
  Lightbulb,
  Link2,
  ListTree,
  Loader2,
  MoreVertical,
  PenLine,
  Plus,
  Settings,
  ShieldCheck,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { formatWordStat } from "@/lib/dashboard/dashboard-format";
import {
  getPlanningLabel,
  getProgressCopy,
  getTitleInitial,
} from "@/lib/dashboard/dashboard-visual";
import type { DashboardAiStatus } from "@/lib/dashboard/dashboard-types";
import type { DashboardClientController } from "@/lib/dashboard/use-dashboard-client";
import { cn } from "@/lib/utils";
import { isShortStoryWork } from "@/shared/work-type";

type DashboardOverview = NonNullable<DashboardClientController["overview"]>;
type DashboardActiveWork = DashboardOverview["activeWork"];

type DashboardStatTone = "blue" | "green" | "orange" | "violet";

type DashboardStat = {
  helper: string;
  icon: LucideIcon;
  label: string;
  progress?: number;
  tone: DashboardStatTone;
  value: string;
};

type AiVisualTone = "blue" | "green" | "red" | "slate" | "violet" | "yellow";

type AiStatusVisualItem = {
  description: string;
  icon: LucideIcon;
  loading?: boolean;
  title: string;
  tone: AiVisualTone;
};

const AI_PERFORMANCE_WINDOW_SIZE = 60;

export function DashboardStatsGrid({
  activeWork,
  overview,
}: {
  activeWork: DashboardActiveWork | null;
  overview: DashboardClientController["overview"];
}) {
  const stats = useMemo<DashboardStat[]>(() => {
    const totalWords = formatWordStat(overview?.stats.totalWords ?? 0);
    const activeWords = formatWordStat(activeWork?.wordCount ?? 0);
    const activeProgress = activeWork ? getProgressCopy(activeWork) : null;

    return [
      {
        helper: "全部正文累计",
        icon: PenLine,
        label: "总字数",
        tone: "blue",
        value: `${totalWords.value}${totalWords.unit}`,
      },
      {
        helper: "作品库累计",
        icon: Library,
        label: "作品数",
        tone: "green",
        value: `${overview?.stats.workCount ?? 0} 部`,
      },
      {
        helper: "章节与短篇场景",
        icon: BookOpen,
        label: "章节数",
        tone: "violet",
        value: `${overview?.stats.chapterCount ?? 0} 个`,
      },
      {
        helper: activeProgress ? `当前进度 ${activeProgress.value}` : "等待第一部作品",
        icon: TrendingUp,
        label: "当前稿件",
        progress: activeProgress?.percent,
        tone: "orange",
        value: activeWork ? `${activeWords.value}${activeWords.unit}` : "0字",
      },
    ];
  }, [activeWork, overview]);

  return (
    <section
      aria-label="工作台统计"
      className="grid min-w-0 overflow-hidden rounded-[14px] border border-[#dce8f6] bg-white shadow-[0_18px_48px_rgba(15,64,116,0.06)] sm:grid-cols-2 xl:grid-cols-4"
    >
      {stats.map((item, index) => (
        <DashboardStatCard
          key={item.label}
          {...item}
          divider={index > 0}
        />
      ))}
    </section>
  );
}

export function DashboardFocusPanel({
  activeWork,
  continueHref,
  createHref,
  detailHref,
}: {
  activeWork: DashboardActiveWork | null;
  continueHref: string;
  createHref: string;
  detailHref: string;
}) {
  if (!activeWork) {
    return (
      <article className="flex min-h-[340px] min-w-0 flex-col justify-between rounded-[14px] border border-[#dce8f6] bg-white px-5 py-5 shadow-[0_20px_56px_rgba(15,64,116,0.07)] xl:min-h-[430px] 2xl:min-h-[576px] 2xl:px-7 2xl:py-7">
        <div className="min-w-0">
          <span className="inline-flex rounded-[6px] border border-[#d7eaff] bg-[#eef7ff] px-4 py-2 text-sm font-bold text-[#1375dd]">
            尚未开始
          </span>
          <h2 className="mt-8 max-w-2xl text-[32px] font-extrabold leading-[1.22] text-[#111827]">
            把一个灵感变成第一部作品
          </h2>
          <p className="mt-4 max-w-2xl text-base font-medium leading-8 text-[#51627a]">
            从长篇、短篇或旧稿导入开始，先搭好故事骨架，再进入写作。
          </p>
        </div>
        <DashboardActionLink
          className="mt-8 min-h-[58px] w-full max-w-[288px] text-lg"
          href={createHref}
          icon={Plus}
          tone="primary"
        >
          创建作品
        </DashboardActionLink>
      </article>
    );
  }

  const activeProgress = getProgressCopy(activeWork);
  const normalizedProgress = Math.max(0, Math.min(100, Math.round(activeProgress.percent || 0)));
  const shortStory = isShortStoryWork(activeWork.workType);
  const unitLabel = shortStory ? "场景" : "章";
  const wordStat = formatWordStat(activeWork.wordCount);
  const targetCopy = activeProgress.hasTarget
    ? activeProgress.hint.replace(/^目标\s*/, "")
    : "未设置";
  const coverUrl = activeWork.coverImageUrl || activeWork.coverUrl || null;
  const visibleTags = [
    shortStory ? "短篇小说" : "长篇小说",
    activeWork.genreLabel || activeWork.tag || activeWork.platformLabel,
    `${unitLabel} ${activeWork.chapter.index}`,
    getPlanningLabel(activeWork),
  ].filter(Boolean).slice(0, 4);

  return (
      <article className="relative min-h-[430px] min-w-0 overflow-hidden rounded-[14px] border border-[#dce8f6] bg-white px-5 py-5 shadow-[0_20px_56px_rgba(15,64,116,0.07)] xl:min-h-[452px] 2xl:min-h-[576px] 2xl:px-7 2xl:py-7">
      <button
        type="button"
        className="absolute right-5 top-5 inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[#40516f] transition hover:bg-[#edf5ff] hover:text-[#0f172a] 2xl:right-7 2xl:top-7 2xl:h-9 2xl:w-9"
        aria-label="更多作品操作"
      >
        <MoreVertical className="h-5 w-5" />
      </button>

      <span className="inline-flex rounded-[6px] border border-[#d7eaff] bg-[#eef7ff] px-3 py-1.5 text-sm font-bold text-[#1375dd] 2xl:px-4 2xl:py-2">
        当前作品
      </span>

      <div className="mt-4 grid min-w-0 gap-5 sm:grid-cols-[80px_minmax(0,1fr)] 2xl:mt-[22px] 2xl:grid-cols-[108px_minmax(0,1fr)] 2xl:gap-7">
        <WorkCover coverUrl={coverUrl} title={activeWork.title} />
        <div className="min-w-0 pt-1">
          <h2 className="truncate text-[26px] font-extrabold leading-[1.2] text-[#111827] 2xl:text-[32px]">
            {activeWork.title}
          </h2>
          <div className="mt-3 flex min-w-0 flex-wrap gap-2 2xl:mt-4">
            {visibleTags.map((tag) => (
              <span
                className="max-w-full truncate rounded-[6px] border border-[#dce8f6] bg-[#f6faff] px-2.5 py-1.5 text-xs font-semibold text-[#64748b] 2xl:px-3 2xl:py-2 2xl:text-sm"
                key={tag}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-5 line-clamp-2 max-w-3xl text-sm font-medium leading-7 text-[#334155] 2xl:mt-9 2xl:line-clamp-3 2xl:text-base 2xl:leading-8">
        {activeWork.synopsis || "暂无简介，进入作品设置补充故事介绍。"}
      </p>

      <div className="mt-5 2xl:mt-10">
        <div className="mb-3 flex items-center justify-between gap-4 text-base font-extrabold text-[#111827] 2xl:mb-4 2xl:text-lg">
          <span className="min-w-0 truncate">
            已写 {wordStat.value}{wordStat.unit} / 目标 {targetCopy}
          </span>
          <span className="shrink-0 tabular-nums">{activeProgress.value}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#e9eef5] 2xl:h-2.5">
          <div
            className="h-full rounded-full bg-[#1687f2] transition-[width] duration-700"
            style={{ width: `${normalizedProgress}%` }}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-[#52647e] 2xl:mt-7 2xl:gap-x-9 2xl:gap-y-3">
        <span className="inline-flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-[#748299]" />
          最近编辑：{formatLastEdited(activeWork.updatedAt)}
        </span>
        <span className="inline-flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#21c27a]" />
          自动保存：已开启
        </span>
      </div>

      <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-[minmax(180px,0.95fr)_minmax(132px,0.56fr)_minmax(132px,0.56fr)] 2xl:mt-8 2xl:gap-4 2xl:sm:grid-cols-[minmax(220px,0.95fr)_minmax(150px,0.56fr)_minmax(150px,0.56fr)]">
        <DashboardActionLink
          className="min-h-12 text-base 2xl:min-h-[58px] 2xl:text-xl"
          href={continueHref}
          icon={PenLine}
          tone="primary"
        >
          继续创作
        </DashboardActionLink>
        <DashboardActionLink className="min-h-12 2xl:min-h-[58px]" href={detailHref} icon={ListTree}>
          章节管理
        </DashboardActionLink>
        <DashboardActionLink className="min-h-12 2xl:min-h-[58px]" href={detailHref} icon={Settings}>
          作品设置
        </DashboardActionLink>
      </div>
    </article>
  );
}

export function DashboardInsightColumn({
  aiStatus,
  aiStatusError,
  aiStatusLoading,
  detailHref,
  logsHref,
}: {
  aiStatus: DashboardClientController["aiStatus"];
  aiStatusError: string;
  aiStatusLoading: boolean;
  detailHref: string;
  logsHref: string;
}) {
  return (
    <aside className="grid min-w-0 gap-3 2xl:gap-4">
      <DashboardAiStatusPanel
        aiStatus={aiStatus}
        error={aiStatusError}
        loading={aiStatusLoading}
      />
      <DashboardAiPerformanceCard
        aiStatus={aiStatus}
        error={aiStatusError}
        loading={aiStatusLoading}
        logsHref={logsHref}
      />
      <DashboardQuickActions detailHref={detailHref} />
    </aside>
  );
}

function DashboardActionLink({
  children,
  className,
  href,
  icon: Icon,
  tone = "secondary",
}: {
  children: ReactNode;
  className?: string;
  href: string;
  icon: LucideIcon;
  tone?: "primary" | "secondary";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-[8px] border px-3.5 text-sm font-extrabold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1687f2]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:translate-y-px 2xl:gap-3 2xl:px-5 2xl:text-base",
        tone === "primary"
          ? "border-transparent bg-[#1687f2] text-white shadow-[0_18px_30px_rgba(22,135,242,0.22)] hover:bg-[#0f7ae5]"
          : "border-[#dce8f6] bg-[#fbfdff] text-[#172033] shadow-[0_12px_28px_rgba(15,64,116,0.05)] hover:border-[#bfd5ee] hover:bg-[#f5faff]",
        className,
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="min-w-0 truncate">{children}</span>
    </Link>
  );
}

function DashboardStatCard({
  divider,
  helper,
  icon: Icon,
  label,
  progress,
  tone,
  value,
}: DashboardStat & { divider: boolean }) {
  return (
    <div
      className={cn(
        "min-w-0 px-5 py-5 2xl:px-7 2xl:py-7",
        divider ? "border-t border-[#e6eef8] sm:border-l sm:border-t-0" : "",
      )}
    >
      <div className="flex min-w-0 items-center gap-5">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] border 2xl:h-[54px] 2xl:w-[54px]",
            getStatIconClassName(tone),
          )}
        >
          <Icon className="h-5 w-5 2xl:h-7 2xl:w-7" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[#64748b]">{label}</p>
          <p className="mt-1.5 truncate text-[26px] font-extrabold leading-7 text-[#111827] 2xl:mt-2 2xl:text-[32px] 2xl:leading-8">
            {value}
          </p>
          <p className="mt-2 truncate text-sm font-semibold text-[#52647e] 2xl:mt-3">{helper}</p>
        </div>
      </div>
      {typeof progress === "number" ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e9eef5]">
          <div
            className="h-full rounded-full bg-[#f18a25] transition-[width] duration-700"
            style={{ width: `${Math.max(0, Math.min(100, Math.round(progress || 0)))}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

function DashboardAiStatusPanel({
  aiStatus,
  error,
  loading,
}: {
  aiStatus: DashboardAiStatus | null;
  error: string;
  loading: boolean;
}) {
  const items = useMemo(
    () => getAiStatusVisualItems(aiStatus, error, loading),
    [aiStatus, error, loading],
  );
  const statusCopy = getAiReadinessCopy(aiStatus, error, loading);

  return (
    <section className="rounded-[14px] border border-[#dce8f6] bg-white px-4 py-4 shadow-[0_18px_48px_rgba(15,64,116,0.06)] 2xl:px-7 2xl:py-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-extrabold text-[#111827]">AI 引擎状态</h2>
        <span className={cn("inline-flex items-center gap-2 text-sm font-bold", statusCopy.className)}>
          <span className={cn("h-2.5 w-2.5 rounded-full", statusCopy.dotClassName)} />
          {statusCopy.label}
        </span>
      </div>

      <ol className="mt-4 grid min-w-0 grid-cols-3 gap-2 2xl:mt-6 2xl:gap-4">
        {items.map((item) => (
          <DashboardAiStatusNode key={item.title} {...item} />
        ))}
      </ol>
    </section>
  );
}

function DashboardAiPerformanceCard({
  aiStatus,
  error,
  loading,
  logsHref,
}: {
  aiStatus: DashboardAiStatus | null;
  error: string;
  loading: boolean;
  logsHref: string;
}) {
  const performance = aiStatus?.performance ?? null;
  const outcomeSlots = useMemo<Array<DashboardAiStatus["performance"]["recentOutcomes"][number] | "empty">>(() => {
    const outcomes = performance?.recentOutcomes.slice(-AI_PERFORMANCE_WINDOW_SIZE) ?? [];
    const emptyCount = Math.max(0, AI_PERFORMANCE_WINDOW_SIZE - outcomes.length);
    return [...outcomes, ...Array.from({ length: emptyCount }, () => "empty" as const)];
  }, [performance?.recentOutcomes]);
  const successRateLabel = performance && performance.recentCount > 0
    ? performance.successRate.toFixed(1)
    : "--";
  const successCount = performance?.successCount ?? 0;
  const failedCount = performance?.failedCount ?? 0;
  const hint = getAiPerformanceHint(error, loading, failedCount, performance?.recentCount ?? 0);
  const HintIcon = hint.icon;

  return (
    <section className="rounded-[14px] border border-[#dce8f6] bg-white px-4 py-4 shadow-[0_18px_48px_rgba(15,64,116,0.06)] 2xl:px-7 2xl:py-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-lg font-extrabold text-[#111827]">生成表现</h2>
          <Info className="h-4 w-4 shrink-0 text-[#94a3b8]" />
        </div>
        <Link
          href={logsHref}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-[#1687f2] transition hover:text-[#0f6ed0]"
        >
          查看日志
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)] gap-4 2xl:mt-6 2xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] 2xl:gap-6">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#64748b]">生成成功率</p>
          <p className="mt-2 text-[34px] font-extrabold leading-none text-[#2f9af7] 2xl:text-[40px]">
            {successRateLabel}
            {successRateLabel === "--" ? null : <span className="ml-1 text-[26px]">%</span>}
          </p>
        </div>
        <div className="min-w-0 border-l border-[#dce8f6] pl-4 2xl:pl-8">
          <p className="text-sm font-semibold text-[#64748b]">近 60 次任务</p>
          <p className="mt-3 text-sm font-bold text-[#40516f] 2xl:text-base">
            成功 <span className="text-[#21b879]">{successCount} 次</span>
            <span className="mx-2 text-[#cbd5e1] 2xl:mx-4">|</span>
            失败 <span className="text-[#ef4455]">{failedCount} 次</span>
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[repeat(60,minmax(2px,1fr))] gap-x-[3px] 2xl:mt-7 2xl:gap-x-[6px]">
        {outcomeSlots.map((outcome, index) => (
          <span
            aria-hidden="true"
            className={cn(
              "h-6 rounded-full transition-transform duration-200 hover:-translate-y-0.5 2xl:h-9",
              getAiPerformanceBarClassName(outcome),
            )}
            key={`${outcome}-${index}`}
          />
        ))}
      </div>

      <div className="mt-4 flex min-w-0 items-start gap-2 text-sm font-semibold leading-5 text-[#40516f] 2xl:mt-6">
        <HintIcon className={cn("mt-0.5 h-4 w-4 shrink-0", hint.iconClassName)} />
        <p>{hint.message}</p>
      </div>
    </section>
  );
}

function DashboardQuickActions({ detailHref }: { detailHref: string }) {
  return (
    <section className="rounded-[14px] border border-[#dce8f6] bg-white px-4 py-4 shadow-[0_18px_48px_rgba(15,64,116,0.06)] 2xl:px-7 2xl:py-6">
      <h2 className="text-lg font-extrabold text-[#111827]">快捷操作</h2>
      <div className="mt-4 grid min-w-0 grid-cols-2 gap-3 2xl:gap-4">
        <DashboardActionLink className="min-h-[46px] text-base" href={detailHref} icon={ListTree}>
          章节管理
        </DashboardActionLink>
        <DashboardActionLink className="min-h-[46px] text-base" href={detailHref} icon={Settings}>
          作品设置
        </DashboardActionLink>
      </div>
    </section>
  );
}

function DashboardAiStatusNode({
  description,
  icon: Icon,
  loading,
  title,
  tone,
}: AiStatusVisualItem) {
  const DisplayIcon = loading ? Loader2 : Icon;

  return (
    <li className="min-w-0">
      <span
        className="inline-flex min-h-[42px] w-full min-w-0 items-center justify-center gap-2 rounded-[6px] border border-[#dce8f6] bg-[#fbfdff] px-2 py-2 2xl:min-h-[54px] 2xl:gap-3 2xl:px-4 2xl:py-3"
        title={`${title}：${description}`}
      >
        <span className={cn("shrink-0", getAiStatusIconClassName(tone))}>
          <DisplayIcon className={cn("h-4 w-4 2xl:h-5 2xl:w-5", loading ? "animate-spin" : "")} />
        </span>
        <span className="min-w-0 truncate text-sm font-bold text-[#2f3b52] 2xl:text-base">{title}</span>
      </span>
    </li>
  );
}

function WorkCover({
  coverUrl,
  title,
}: {
  coverUrl: string | null;
  title: string;
}) {
  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-[#1687f2] text-[42px] font-extrabold leading-none text-white shadow-[0_18px_34px_rgba(22,135,242,0.24)] 2xl:h-[108px] 2xl:w-[108px] 2xl:text-[58px]">
      {coverUrl ? (
        <span
          aria-label={`${title} 封面`}
          className="h-full w-full bg-cover bg-center"
          role="img"
          style={{ backgroundImage: `url("${coverUrl}")` }}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-[linear-gradient(145deg,#56b3ff_0%,#1687f2_58%,#0f6ed0_100%)]">
          {getTitleInitial(title)}
        </span>
      )}
    </div>
  );
}

function getAiStatusVisualItems(
  aiStatus: DashboardAiStatus | null,
  error: string,
  loading: boolean,
): AiStatusVisualItem[] {
  if (error) {
    return [
      {
        description: error,
        icon: AlertTriangle,
        title: "AI 异常",
        tone: "red",
      },
      {
        description: "当前作品上下文待确认",
        icon: Database,
        title: "待确认",
        tone: "slate",
      },
      {
        description: "生成任务暂不可用",
        icon: Zap,
        title: "需处理",
        tone: "yellow",
      },
    ];
  }

  if (!aiStatus) {
    return [
      {
        description: loading ? "服务状态同步中" : "等待状态更新",
        icon: Link2,
        loading,
        title: loading ? "读取中" : "待连接",
        tone: "blue",
      },
      {
        description: "当前作品上下文",
        icon: Database,
        title: "上下文",
        tone: "slate",
      },
      {
        description: "暂无生成任务",
        icon: Zap,
        title: "任务状态",
        tone: "slate",
      },
    ];
  }

  return [
    {
      description: aiStatus.service.description,
      icon: Link2,
      title: aiStatus.service.state === "available"
        ? "已连接"
        : getCompactStatusTitle(aiStatus.service.title, "AI 已配置"),
      tone: mapAiTone(aiStatus.service.tone),
    },
    {
      description: aiStatus.context.description,
      icon: Database,
      title: aiStatus.context.state === "ready"
        ? "上下文正常"
        : getCompactStatusTitle(aiStatus.context.title, "上下文"),
      tone: mapAiTone(aiStatus.context.tone),
    },
    {
      description: aiStatus.queue.description,
      icon: Zap,
      loading: aiStatus.queue.state === "running",
      title: aiStatus.queue.state === "running"
        ? "生成中"
        : aiStatus.queue.state === "failed"
          ? "需重试"
          : "可生成",
      tone: aiStatus.queue.state === "running" ? "violet" : mapAiTone(aiStatus.queue.tone),
    },
  ];
}

function getAiReadinessCopy(
  aiStatus: DashboardAiStatus | null,
  error: string,
  loading: boolean,
) {
  if (error) {
    return {
      className: "text-[#ef4455]",
      dotClassName: "bg-[#ef4455]",
      label: "需处理",
    };
  }

  if (loading && !aiStatus) {
    return {
      className: "text-[#1687f2]",
      dotClassName: "bg-[#1687f2]",
      label: "检测中",
    };
  }

  if (aiStatus?.readiness.tone === "danger" || aiStatus?.readiness.tone === "warning") {
    return {
      className: "text-[#c47a20]",
      dotClassName: "bg-[#f59e0b]",
      label: "需关注",
    };
  }

  return {
    className: "text-[#1dbb78]",
    dotClassName: "bg-[#1fc87f]",
    label: "运行正常",
  };
}

function getAiPerformanceHint(
  error: string,
  loading: boolean,
  failedCount: number,
  recentCount: number,
): {
  icon: LucideIcon;
  iconClassName: string;
  message: string;
} {
  if (error) {
    return {
      icon: AlertTriangle,
      iconClassName: "text-[#ef4455]",
      message: "提示：成功率数据读取失败，稍后会自动刷新。",
    };
  }

  if (loading) {
    return {
      icon: Loader2,
      iconClassName: "animate-spin text-[#1687f2]",
      message: "提示：正在同步最近生成任务表现。",
    };
  }

  if (recentCount === 0) {
    return {
      icon: Lightbulb,
      iconClassName: "text-[#f59e0b]",
      message: "提示：开始创作后，这里会显示最近生成任务趋势。",
    };
  }

  if (failedCount > 0) {
    return {
      icon: Lightbulb,
      iconClassName: "text-[#f59e0b]",
      message: `提示：最近 ${failedCount} 次失败，可点击查看日志进行重试。`,
    };
  }

  return {
    icon: ShieldCheck,
    iconClassName: "text-[#1dbb78]",
    message: "提示：最近生成任务全部成功，当前状态比较稳定。",
  };
}

function getCompactStatusTitle(title: string, fallback: string) {
  const normalized = title.trim();
  if (!normalized) return fallback;
  if (normalized.includes("服务") && normalized.includes("可用")) return "已连接";
  if (normalized.includes("上下文")) return "上下文正常";
  if (normalized.includes("失败") || normalized.includes("异常")) return "需重试";
  if (normalized.includes("完成")) return "可生成";
  return normalized.length > 7 ? fallback : normalized;
}

function mapAiTone(tone: DashboardAiStatus["readiness"]["tone"]): AiVisualTone {
  if (tone === "success") return "green";
  if (tone === "danger") return "red";
  if (tone === "warning") return "yellow";
  if (tone === "ai") return "violet";
  if (tone === "info") return "blue";
  return "slate";
}

function getAiStatusIconClassName(tone: AiVisualTone) {
  if (tone === "green") return "text-[#1dbb78]";
  if (tone === "red") return "text-[#ef4455]";
  if (tone === "yellow") return "text-[#f59e0b]";
  if (tone === "violet") return "text-[#7c5cf6]";
  if (tone === "blue") return "text-[#1687f2]";
  return "text-[#64748b]";
}

function getAiPerformanceBarClassName(
  outcome: DashboardAiStatus["performance"]["recentOutcomes"][number] | "empty",
) {
  if (outcome === "success") return "bg-[#26c987]";
  if (outcome === "failed") return "bg-[#ff4053]";
  return "bg-[#e5ebf3]";
}

function getStatIconClassName(tone: DashboardStatTone) {
  if (tone === "green") return "border-[#c7efde] bg-[#eefbf5] text-[#1dbb78]";
  if (tone === "orange") return "border-[#f9dfc4] bg-[#fff4e8] text-[#f18a25]";
  if (tone === "violet") return "border-[#ddd6fe] bg-[#f4f0ff] text-[#7c5cf6]";
  return "border-[#cfe7ff] bg-[#edf7ff] text-[#1687f2]";
}

function formatLastEdited(value?: string) {
  if (!value) return "暂无记录";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "暂无记录";

  const now = new Date();
  const time = date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
  });

  if (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  ) {
    return `今天 ${time}`;
  }

  return `${date.toLocaleDateString("zh-CN", {
    day: "2-digit",
    month: "2-digit",
  })} ${time}`;
}

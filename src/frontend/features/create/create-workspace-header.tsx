"use client";

import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme/theme-toggle";

import { CreateModeSwitch, type CreateMode } from "./create-mode-switch";

export type CreateStep = {
  label: string;
  text: string;
};

type CreateWorkspaceHeaderProps = {
  active: CreateMode;
  ariaLabel: string;
  currentStepIndex: number;
  progress: number;
  showAdmin?: boolean;
  steps: readonly CreateStep[];
  title: string;
};

const FALLBACK_STEP: CreateStep = {
  label: "步骤",
  text: "创建进度",
};

export function CreateWorkspaceHeader({
  active,
  ariaLabel,
  currentStepIndex,
  progress,
  showAdmin = false,
  steps,
  title,
}: CreateWorkspaceHeaderProps) {
  const maxStepIndex = Math.max(steps.length - 1, 0);
  const safeStepIndex = Math.max(0, Math.min(currentStepIndex, maxStepIndex));
  const currentStep = steps[safeStepIndex] ?? FALLBACK_STEP;
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <header className="rounded-[8px] border border-[var(--theme-border)] bg-[var(--theme-surface-strong)]/92 px-4 py-3 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.42)] backdrop-blur-xl">
      <div className="flex flex-col gap-3">
        <h1 className="sr-only">{title}</h1>
        <div className="grid gap-2.5 min-[720px]:grid-cols-[auto_minmax(0,1fr)_auto] min-[720px]:items-center">
          <Link
            href="/dashboard"
            aria-label="返回工作台"
            className="inline-flex h-9 w-fit shrink-0 items-center gap-2 rounded-[6px] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 text-sm font-black text-[var(--theme-text-secondary)] shadow-[var(--theme-shadow-button)] transition hover:border-[var(--theme-border-strong)] hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)]"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </Link>

          <div className="flex min-w-0 min-[720px]:justify-center">
            <CreateModeSwitch active={active} />
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 min-[720px]:justify-end">
            {showAdmin ? (
              <Link
                href="/dashboard/admin"
                className="hidden h-9 items-center gap-2 rounded-[6px] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 text-sm font-black text-[var(--theme-text-secondary)] shadow-[var(--theme-shadow-button)] transition hover:border-[var(--theme-border-strong)] hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)] sm:inline-flex"
              >
                <ShieldCheck className="h-4 w-4" />
                管理
              </Link>
            ) : null}
            <ThemeToggle className="h-9 w-9 rounded-[6px]" />
          </div>
        </div>

        <div
          className="grid min-w-0 gap-2 rounded-[6px] bg-[var(--theme-surface-soft)] px-3 py-2 min-[820px]:grid-cols-[auto_minmax(160px,1fr)_auto] min-[820px]:items-center"
          role="progressbar"
          aria-label={ariaLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={safeProgress}
        >
          <div className="flex min-w-0 items-center gap-2 text-xs font-black">
            <span className="shrink-0 text-[var(--theme-text-strong)]">
              步骤 {safeStepIndex + 1}/{steps.length || 1}
            </span>
            <span className="shrink-0 text-[var(--theme-brand-text)]">{currentStep.label}</span>
            <span className="hidden truncate font-semibold text-[var(--theme-text-muted)] sm:inline">
              {currentStep.text}
            </span>
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--theme-surface-overlay)]">
            <div
              className="theme-brand-gradient-bg h-full rounded-full transition-[width] duration-300"
              style={{ width: `${safeProgress}%` }}
            />
          </div>

          <span className="text-xs font-black text-[var(--theme-text-muted)] min-[820px]:text-right">
            {safeProgress}%
          </span>
        </div>
      </div>
    </header>
  );
}

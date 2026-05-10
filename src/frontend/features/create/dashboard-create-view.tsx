"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import type { DashboardCreateController } from "@/lib/create/use-dashboard-create";
import { cn } from "@/lib/utils";

import { CreateActionSidebar } from "./create-action-sidebar";
import { CreateBlueprintSection } from "./create-blueprint-section";
import { CreateFormError } from "./create-form-error";
import { CreateSectionNav } from "./create-section-nav";
import { SubmitOutlineButton } from "./submit-outline-button";

type DashboardCreateViewProps = {
  create: DashboardCreateController;
};

const CREATE_STEPS = [
  {
    icon: Sparkles,
    label: "输入创意",
    description: "明确故事核心与创作方向",
    status: "current" as const,
  },
  {
    icon: FileText,
    label: "确认大纲",
    description: "整理可写的结构与节奏",
    status: "upcoming" as const,
  },
  {
    icon: CheckCircle2,
    label: "开始创作",
    description: "进入工作台继续扩写",
    status: "upcoming" as const,
  },
];

export function DashboardCreateView({ create }: DashboardCreateViewProps) {
  return (
    <main className="min-h-dvh w-full overflow-x-clip bg-[var(--theme-bg)] font-sans antialiased">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[1480px] flex-col">
        <header className="sticky top-0 z-50 border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/95 backdrop-blur-xl">
          <div className="grid gap-2 px-4 py-2 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center lg:px-8">
            <div className="flex min-w-0 items-start gap-3">
              <Link
                href="/dashboard"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-[var(--theme-text-secondary)] shadow-sm transition-all hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/15"
                title="返回控制台"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">
                    创建流程
                  </p>
                  <span className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] px-2.5 py-1 text-[10px] font-semibold text-[var(--theme-text-secondary)]">
                    当前步骤 1 / 3
                  </span>
                </div>
                <h1 className="mt-0.5 text-base font-bold tracking-tight text-[var(--theme-text-strong)] sm:text-lg">
                  开始创作
                </h1>
                <p className="mt-0.5 max-w-2xl text-xs leading-5 text-[var(--theme-text-secondary)]">
                  输入故事创意，选择创作方向与基础设定，再生成第一版大纲。
                </p>
              </div>
            </div>

            <CreateStepIndicator />

            <div className="flex items-center justify-end gap-2">
              {create.isAdmin ? (
                <Link
                  href="/dashboard/admin"
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 text-xs font-semibold text-[var(--theme-text-secondary)] shadow-sm transition-all hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/15"
                  title="进入管理员后台"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">管理员入口</span>
                </Link>
              ) : null}
              <ThemeToggle className="h-9 w-9 shrink-0 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-[var(--theme-text-secondary)] shadow-sm transition-all hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)]" />
            </div>
          </div>
        </header>

        <div className="flex-1 px-4 pb-20 pt-3 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="grid gap-4 min-[1040px]:grid-cols-[216px_minmax(0,1fr)] min-[1040px]:items-start min-[1260px]:grid-cols-[216px_minmax(0,1fr)_300px]"
          >
            <CreateSectionNav create={create} />

            <form
              id="dashboard-create-form"
              className="min-w-0 space-y-3"
              onSubmit={create.handleSubmit}
              noValidate
            >
              <CreateFormError message={create.formError} />
              <CreateBlueprintSection create={create} />
              <CreateActionSidebar className="min-[1260px]:hidden" create={create} />
            </form>

            <CreateActionSidebar className="hidden min-[1260px]:block" create={create} />
          </motion.div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--theme-border)] bg-[var(--theme-bg)]/96 px-4 py-3 backdrop-blur-xl sm:hidden">
        <div className="mx-auto max-w-[1480px]">
          <p className="mb-2 truncate text-xs font-medium text-[var(--theme-text-secondary)]">
            {create.submitBlockedReason || "已准备完成，可以生成大纲"}
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-sm font-semibold text-[var(--theme-text-secondary)] shadow-sm transition-colors hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)]"
            >
              返回控制台
            </Link>
            <SubmitOutlineButton create={create} />
          </div>
        </div>
      </div>
    </main>
  );
}

function CreateStepIndicator() {
  return (
    <div className="hidden items-center gap-2 lg:flex">
      {CREATE_STEPS.map((step, index) => {
        const Icon = step.icon;
        const isCurrent = step.status === "current";

        return (
          <div key={step.label} className="flex items-center gap-2">
            {index > 0 ? <div className="h-px w-5 bg-[var(--theme-divider)]" /> : null}
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-all",
                isCurrent
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300"
                  : "border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-[var(--theme-text-secondary)]",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <div className="min-w-0">
                <div className="text-[11px] font-semibold leading-none">{step.label}</div>
                <div className="mt-0.5 text-[10px] leading-none opacity-80">{step.description}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

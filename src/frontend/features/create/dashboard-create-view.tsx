"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  PenLine,
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
  { icon: Sparkles, label: "创意", description: "明确方向" },
  { icon: FileText, label: "大纲", description: "整理结构" },
  { icon: PenLine, label: "创作", description: "开始写作" },
];

export function DashboardCreateView({ create }: DashboardCreateViewProps) {
  return (
    <main className="min-h-dvh w-full overflow-x-clip bg-[var(--theme-bg)]">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[1480px] flex-col">
        {/* ── 顶部栏 ── */}
        <header className="sticky top-0 z-50 border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/95 backdrop-blur-xl">
          <div className="flex items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
            {/* 左：返回 + 标题 */}
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/dashboard"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--theme-text-secondary)] transition-colors hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)]"
                title="返回控制台"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div className="min-w-0">
                <h1 className="text-sm font-bold tracking-tight text-[var(--theme-text-strong)] sm:text-base">
                  开始创作
                </h1>
                <p className="hidden text-xs text-[var(--theme-text-muted)] sm:block">
                  输入创意，选择方向，生成大纲
                </p>
              </div>
            </div>

            {/* 中：步骤条 */}
            <CreateStepIndicator />

            {/* 右：操作 */}
            <div className="ml-auto flex items-center gap-1.5">
              {create.isAdmin ? (
                <Link
                  href="/dashboard/admin"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-[var(--theme-text-secondary)] transition-colors hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)]"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">管理</span>
                </Link>
              ) : null}
              <ThemeToggle className="h-8 w-8 rounded-lg text-[var(--theme-text-secondary)] transition-colors hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)]" />
            </div>
          </div>
        </header>

        {/* ── 主体 ── */}
        <div className="flex-1 px-4 pb-20 pt-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="grid gap-5 min-[1040px]:grid-cols-[200px_minmax(0,1fr)] min-[1040px]:items-start min-[1260px]:grid-cols-[200px_minmax(0,1fr)_280px]"
          >
            <CreateSectionNav create={create} />

            <form
              id="dashboard-create-form"
              className="min-w-0 space-y-4"
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

      {/* ── 移动端底部栏 ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--theme-border)] bg-[var(--theme-bg)]/96 px-4 py-3 backdrop-blur-xl sm:hidden">
        <div className="mx-auto max-w-[1480px]">
          <p className="mb-2 truncate text-xs text-[var(--theme-text-muted)]">
            {create.submitBlockedReason || "已准备完成"}
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-[var(--theme-border)] text-sm font-medium text-[var(--theme-text-secondary)] transition-colors hover:bg-[var(--theme-surface-hover)]"
            >
              返回
            </Link>
            <SubmitOutlineButton create={create} />
          </div>
        </div>
      </div>
    </main>
  );
}

function CreateStepIndicator() {
  const currentStep = 0;
  return (
    <div className="ml-auto hidden items-center gap-1 lg:flex">
      {CREATE_STEPS.map((step, index) => {
        const Icon = step.icon;
        const isDone = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <div key={step.label} className="flex items-center gap-1">
            {index > 0 && <div className="mx-1 h-px w-4 bg-[var(--theme-divider)]" />}
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-all",
                isCurrent
                  ? "bg-[var(--theme-text-strong)] text-[var(--theme-bg)] font-semibold"
                  : isDone
                    ? "text-[var(--theme-text-secondary)]"
                    : "text-[var(--theme-text-muted)]",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{step.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

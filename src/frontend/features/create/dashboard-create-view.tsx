"use client";

import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, FileText, Lightbulb, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import type { DashboardCreateController } from "@/lib/create/use-dashboard-create";
import { cn } from "@/lib/utils";

// 确保这里的引入是【命名导入】（带有大括号）
import { CreateActionSidebar } from "./create-action-sidebar";
import { CreateBlueprintSection } from "./create-blueprint-section";
import { CreateFormError } from "./create-form-error";
import { CreateSectionNav } from "./create-section-nav";
import { SubmitOutlineButton } from "./submit-outline-button";

type DashboardCreateViewProps = {
  create: DashboardCreateController;
};

export function DashboardCreateView({ create }: DashboardCreateViewProps) {
  function handleJumpToIdea() {
    const element = document.getElementById("create-idea-section");
    element?.scrollIntoView({ behavior: "smooth", block: "start" });

    window.requestAnimationFrame(() => {
      document.querySelector<HTMLTextAreaElement>("#create-idea-input")?.focus({
        preventScroll: true,
      });
    });
  }

  return (
    <main className="app-work-surface relative min-h-dvh w-full overflow-x-clip font-sans antialiased selection:bg-emerald-200/50 dark:selection:bg-emerald-500/30 bg-[var(--theme-bg)]">
      {/* 装饰性背景光晕 & 网格 */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-[20%] left-[20%] h-[500px] w-[500px] rounded-full bg-emerald-400/10 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] h-[400px] w-[400px] rounded-full bg-amber-400/5 blur-[100px]" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.015] mix-blend-overlay" />
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col">
        <header className="sticky top-0 z-50 border-b border-[var(--theme-border)]/50 bg-[var(--theme-bg)]/60 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.03)] supports-[backdrop-filter]:bg-[var(--theme-bg)]/40">
          <div className="mx-auto flex w-full max-w-[1540px] flex-col gap-2 px-4 py-3 sm:px-6 lg:px-8">
            <div className="relative flex min-h-12 items-center justify-center">
              <div className="absolute left-0 top-1/2 flex -translate-y-1/2 items-center gap-2 sm:gap-4">
                <Link
                  href="/dashboard"
                  className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--theme-border)]/60 bg-[var(--theme-surface-solid)]/80 shadow-sm transition-all duration-300 hover:scale-105 hover:bg-[var(--theme-surface-hover)] hover:shadow-md hover:border-emerald-500/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/20"
                  title="返回控制台"
                >
                  <ArrowLeft className="h-4 w-4 text-[var(--theme-text-muted)] transition-colors group-hover:text-emerald-500" />
                </Link>
                <div className="hidden h-6 w-px rounded-full bg-gradient-to-b from-transparent via-[var(--theme-border)] to-transparent sm:block" />
              </div>

              <div className="w-full min-w-0 px-14 sm:px-24 lg:px-48">
                <CreateIntroStrip />
              </div>

              <div className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-3">
                {create.isAdmin ? (
                  <Link
                    href="/dashboard/admin"
                    className="group relative inline-flex h-10 shrink-0 overflow-hidden items-center justify-center gap-2 rounded-xl border border-emerald-200/60 bg-gradient-to-b from-emerald-50 to-emerald-100/50 px-4 text-xs font-bold text-emerald-700 shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md hover:shadow-emerald-500/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/20 dark:border-emerald-500/20 dark:from-emerald-500/10 dark:to-emerald-500/5 dark:text-emerald-300"
                    title="管理员"
                  >
                    <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100 dark:bg-white/5" />
                    <ShieldCheck className="h-4 w-4" />
                    <span className="hidden sm:inline">管理员</span>
                  </Link>
                ) : null}
                <ThemeToggle className="h-10 w-10 shrink-0 rounded-xl border border-[var(--theme-border)]/60 bg-[var(--theme-surface-solid)]/80 shadow-sm transition-all duration-300 hover:scale-105 hover:bg-[var(--theme-surface-hover)] hover:shadow-md hover:border-[var(--theme-border)]" />
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1496px] flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="grid gap-5 min-[1040px]:grid-cols-[220px_minmax(0,1fr)] min-[1040px]:items-start min-[1240px]:grid-cols-[220px_minmax(0,1fr)_340px] min-[1420px]:grid-cols-[240px_minmax(0,1fr)_360px]"
          >
            <CreateSectionNav
              create={create}
              onJumpToIdea={handleJumpToIdea}
            />

            <form
              id="dashboard-create-form"
              className="min-w-0 space-y-6"
              onSubmit={create.handleSubmit}
              noValidate
            >
              <CreateFormError message={create.formError} />
              <CreateBlueprintSection create={create} />
              <CreateActionSidebar className="min-[1240px]:hidden" create={create} />
            </form>

            <CreateActionSidebar className="hidden min-[1240px]:block" create={create} />
          </motion.div>
        </main>
      </div>

      <div className="fixed bottom-6 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl border border-[var(--theme-border)]/60 bg-[var(--theme-surface-strong)]/80 p-2 shadow-[0_8px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl sm:hidden">
        <Link
          href="/dashboard"
          className="flex h-11 flex-1 items-center justify-center rounded-xl bg-[var(--theme-surface-overlay)] text-sm font-bold text-[var(--theme-text-secondary)] transition-all hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-primary)]"
        >
          放弃创建
        </Link>
        <SubmitOutlineButton create={create} />
      </div>
    </main>
  );
}

function CreateIntroStrip() {
  const steps = [
    { icon: Lightbulb, label: "输入创意", active: true },
    { icon: FileText, label: "确认大纲", active: false },
    { icon: CheckCircle2, label: "创建成功", active: false },
  ];

  return (
    <div className="mx-auto hidden w-full max-w-[620px] min-w-0 items-center justify-center px-3 min-[760px]:flex">
      <div className="flex min-w-[360px] items-center justify-center">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.label} className="flex items-center">
              {index > 0 ? (
                <div className="relative mx-2 h-0.5 w-10 overflow-hidden rounded-full bg-[var(--theme-divider)]/50 min-[1120px]:w-16">
                  {step.active && (
                     <motion.div 
                       initial={{ x: "-100%" }}
                       animate={{ x: "0%" }}
                       transition={{ duration: 0.6, ease: "easeOut" }}
                       className="absolute inset-0 bg-emerald-400" 
                     />
                  )}
                </div>
              ) : null}
              <div
                className={cn(
                  "relative flex items-center gap-2 rounded-full px-4 py-2 transition-all duration-500",
                  step.active
                    ? "border border-emerald-200/50 bg-emerald-50/80 text-emerald-700 shadow-[0_0_20px_rgba(16,185,129,0.1)] dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : "border border-[var(--theme-border)]/40 bg-[var(--theme-surface-overlay)]/50 text-[var(--theme-text-muted)] opacity-70 grayscale hover:opacity-100 hover:grayscale-0",
                )}
              >
                {step.active && (
                  <motion.div 
                    layoutId="active-step-bg" 
                    className="absolute inset-0 rounded-full bg-emerald-100/50 dark:bg-emerald-500/10" 
                  />
                )}
                <Icon className={cn("relative z-10 h-4 w-4", step.active && "animate-pulse text-emerald-500 dark:text-emerald-400")} />
                <span className="relative z-10 whitespace-nowrap text-sm font-bold tracking-wide">{step.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
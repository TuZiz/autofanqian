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
    <main className="create-modern-shell min-h-dvh w-full overflow-x-clip bg-[#f7f8fa] text-slate-900">
      <div className="pointer-events-none fixed inset-0 opacity-[0.16] [background-image:linear-gradient(to_right,rgba(51,65,85,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(51,65,85,0.035)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[1480px] flex-col">
        <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/92 backdrop-blur-xl">
          <div className="grid min-h-[64px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-3.5 py-2 sm:px-4 lg:px-[18px]">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/dashboard"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/70 bg-white text-slate-500 transition-all duration-200 hover:-translate-x-0.5 hover:border-slate-300 hover:text-slate-900"
                title="返回控制台"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div className="min-w-0">
                <h1 className="truncate text-[20px] font-extrabold tracking-tight text-slate-950">
                  开始创作
                </h1>
                <p className="hidden truncate text-[12px] font-medium text-slate-500 sm:block">
                  选择模板，补齐设定，生成可继续编辑的大纲
                </p>
              </div>
            </div>

            <div className="hidden justify-center lg:flex">
              <CreateStepIndicator />
            </div>

            <div className="flex items-center justify-end gap-1.5">
              {create.isAdmin ? (
                <Link
                  href="/dashboard/admin"
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200/70 bg-white px-3 text-xs font-semibold text-slate-500 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">管理</span>
                </Link>
              ) : null}
              <ThemeToggle className="h-9 w-9 rounded-xl border border-slate-200/70 bg-white text-slate-500 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950" />
            </div>
          </div>
        </header>

        <div className="flex-1 px-3.5 pb-20 pt-3.5 sm:px-4 lg:px-[18px]">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="grid gap-3 min-[1040px]:grid-cols-[240px_minmax(0,1fr)] min-[1040px]:items-start min-[1120px]:grid-cols-[240px_minmax(0,1fr)_280px] min-[1440px]:grid-cols-[248px_minmax(0,1fr)_288px]"
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
              <CreateActionSidebar className="min-[1120px]:hidden" create={create} />
            </form>

            <CreateActionSidebar className="hidden min-[1120px]:block" create={create} />
          </motion.div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/92 px-3.5 py-3 shadow-[0_-10px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:hidden">
        <div className="mx-auto max-w-[1480px]">
          <p className="mb-2 truncate text-xs font-semibold text-slate-500">
            {create.submitBlockedReason || "已准备好生成大纲"}
          </p>
          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard"
              className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-sm font-semibold text-slate-600 transition-all hover:text-slate-950"
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
    <div className="inline-flex items-center gap-0.5 rounded-xl border border-slate-200/70 bg-slate-50/90 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      {CREATE_STEPS.map((step, index) => {
        const Icon = step.icon;
        const isDone = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <div key={step.label} className="flex items-center gap-1">
            {index > 0 && <div className="h-4 w-px bg-slate-200" />}
            <div
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition-all duration-200",
                isCurrent
                  ? "bg-slate-950 text-white shadow-[0_8px_18px_-12px_rgba(15,23,42,0.9)]"
                  : isDone
                    ? "text-slate-600"
                    : "text-slate-400 hover:bg-white hover:text-slate-600",
              )}
              title={step.description}
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

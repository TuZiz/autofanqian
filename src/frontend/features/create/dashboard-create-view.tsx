"use client";

import { motion } from "framer-motion";
import Link from "next/link";

import {
  AppShell,
  MobileBottomNav,
} from "@/components/design-system";
import type { DashboardCreateController } from "@/lib/create/use-dashboard-create";

import { CreateActionSidebar } from "./create-action-sidebar";
import { CreateBlueprintSection } from "./create-blueprint-section";
import { CreateFormError } from "./create-form-error";
import { CreateSectionNav } from "./create-section-nav";
import { CreateWorkspaceHeader, type CreateStep } from "./create-workspace-header";
import { SubmitOutlineButton } from "./submit-outline-button";

type DashboardCreateViewProps = {
  create: DashboardCreateController;
};

const CREATE_STEPS = [
  { label: "类型", text: "模板或自定义题材" },
  { label: "创意", text: "主角、冲突、反转" },
  { label: "参数", text: "平台、字数、DNA" },
  { label: "分析", text: "卖点与读者预览" },
  { label: "大纲", text: "进入可写章节" },
] satisfies CreateStep[];

export function DashboardCreateView({ create }: DashboardCreateViewProps) {
  const createProgress = getLongCreateProgress(create);

  return (
    <AppShell
      className="create-modern-shell"
      maxWidthClassName="max-w-[1500px]"
      mobileNav={<MobileBottomNav activeHref="/dashboard/create" />}
    >
      <div className="space-y-3">
        <CreateWorkspaceHeader
          active="long"
          ariaLabel="创建向导进度"
          currentStepIndex={createProgress.currentStepIndex}
          progress={createProgress.progress}
          showAdmin={create.isAdmin}
          steps={CREATE_STEPS}
          title="分步骤创作向导"
        />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="grid gap-3 min-[1080px]:grid-cols-[240px_minmax(0,1fr)] min-[1180px]:grid-cols-[240px_minmax(0,1fr)_300px]"
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
            <CreateActionSidebar className="min-[1180px]:hidden" create={create} />
          </form>

          <div className="hidden min-[1180px]:block">
            <CreateActionSidebar create={create} />
          </div>
        </motion.div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--theme-border)] bg-[var(--theme-surface-strong)]/95 px-3 py-3 shadow-[0_-10px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:hidden">
        <div className="mx-auto max-w-md">
          <p className="mb-2 truncate text-xs font-semibold text-[var(--theme-text-muted)]">
            {create.submitBlockedReason || "已准备好生成大纲"}
          </p>
          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard"
              className="inline-flex h-10 flex-1 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-sm font-black text-[var(--theme-text-secondary)]"
            >
              返回
            </Link>
            <SubmitOutlineButton create={create} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function getLongCreateProgress(create: DashboardCreateController) {
  const completed = [
    Boolean(create.selectedGenre),
    create.wordCount >= create.MIN_IDEA_LENGTH_FOR_OUTLINE,
    Boolean(create.platform && create.words),
    Boolean(create.ideaAnalysis),
    create.canSubmitOutline,
  ].filter(Boolean).length;
  const progress = (completed / CREATE_STEPS.length) * 100;
  const currentStepIndex = Math.max(0, Math.min(completed - 1, CREATE_STEPS.length - 1));

  return {
    currentStepIndex,
    progress,
  };
}

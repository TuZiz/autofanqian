"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Bot,
  FileInput,
  Plus,
  Sparkles,
  UserRound,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";

import {
  AppShell,
  Button,
  MobileBottomNav,
} from "@/components/design-system";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LogoutConfirmDialog } from "@/components/ui/logout-confirm-dialog";
import type { DashboardClientController } from "@/lib/dashboard/use-dashboard-client";

import {
  DashboardAiTaskSummary,
  DashboardFocusPanel,
  DashboardStatsGrid,
} from "./dashboard-overview-panels";
import { DashboardProfileModal } from "./dashboard-profile-modal";
import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardUpgradeModal } from "./dashboard-upgrade-modal";
import { DashboardWorksSection } from "./dashboard-works-section";
import { AIAssistantDrawer } from "./dashboard-ai-assistant-drawer";

type DashboardShellProps = {
  dashboard: DashboardClientController;
};

export function DashboardShell({ dashboard }: DashboardShellProps) {
  const { handleLogout, logoutBusy, overview, updateUser, user } = dashboard;
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  const works = overview?.works ?? [];
  const activeWork = overview?.activeWork ?? null;
  const displayName = user?.name?.trim() || user?.email?.split("@")[0] || "创作者";
  const continueHref = activeWork
    ? `/dashboard/novel/${activeWork.id}/chapter/${Math.max(1, activeWork.chapter.index)}`
    : "/dashboard/create";

  return (
    <AppShell
      maxWidthClassName="max-w-[1480px]"
      sidebar={
        <DashboardSidebar
          displayName={displayName}
          isAdmin={Boolean(user?.isAdmin)}
          logoutBusy={logoutBusy}
          onCreate={() => router.push("/dashboard/create")}
          onLogoutOpen={() => setLogoutConfirmOpen(true)}
          onProfileOpen={() => setProfileOpen(true)}
          activeWorkId={activeWork?.id ?? null}
          recentWorks={works.slice(0, 6)}
        />
      }
      mobileNav={<MobileBottomNav activeHref="/dashboard" />}
      actions={
        <DashboardHeader
          activeWorkTitle={activeWork?.title ?? null}
          displayName={displayName}
          onAssistantOpen={() => setAssistantOpen(true)}
          onCreate={() => router.push("/dashboard/create")}
          onImport={() => router.push("/dashboard/import")}
          onProfileOpen={() => setProfileOpen(true)}
        />
      }
    >
      <div className="space-y-3">
        <section className="grid gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)]">
          <DashboardFocusPanel
            activeWork={activeWork}
            onCreate={() => router.push("/dashboard/create")}
            onContinue={() => router.push(continueHref)}
            onManage={() => activeWork && router.push(`/dashboard/novel/${activeWork.id}`)}
            onSettings={() => activeWork && router.push(`/dashboard/novel/${activeWork.id}`)}
          />
          <DashboardAiTaskSummary activeWork={activeWork} worksCount={works.length} />
        </section>

        <DashboardStatsGrid activeWork={activeWork} overview={overview} />

        <DashboardWorksSection activeWorkId={activeWork?.id ?? null} dashboard={dashboard} />
      </div>

      <AnimatePresence>
        {profileOpen && user ? (
          <DashboardProfileModal
            user={user}
            onClose={() => setProfileOpen(false)}
            onUpgradeOpen={() => {
              setProfileOpen(false);
              setUpgradeOpen(true);
            }}
            onUserUpdated={updateUser}
          />
        ) : null}
      </AnimatePresence>

      <DashboardUpgradeModal
        isOpen={upgradeOpen}
        currentTier={user?.membershipTier}
        isAdmin={Boolean(user?.isAdmin)}
        onClose={() => setUpgradeOpen(false)}
      />

      <AIAssistantDrawer
        activeWorkTitle={activeWork?.title ?? null}
        open={assistantOpen}
        onClose={() => setAssistantOpen(false)}
      />

      <LogoutConfirmDialog
        open={logoutConfirmOpen}
        busy={logoutBusy}
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={async () => {
          try {
            await handleLogout();
          } finally {
            setLogoutConfirmOpen(false);
          }
        }}
      />
    </AppShell>
  );
}

function DashboardHeader({
  activeWorkTitle,
  displayName,
  onAssistantOpen,
  onCreate,
  onImport,
  onProfileOpen,
}: {
  activeWorkTitle: string | null;
  displayName: string;
  onAssistantOpen: () => void;
  onCreate: () => void;
  onImport: () => void;
  onProfileOpen: () => void;
}) {
  return (
    <header className="border-b border-[var(--theme-divider)] bg-[var(--theme-topbar)]/95 px-3 py-2.5 backdrop-blur-2xl sm:px-4 lg:px-5">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-extrabold tracking-tight text-[var(--theme-text-strong)] sm:text-2xl">
            AI 小说创作工作台
          </h1>
          <p className="mt-0.5 hidden truncate text-xs font-semibold text-[var(--theme-text-muted)] sm:block">
            当前作品：{activeWorkTitle ?? "等待新建或导入"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            tone="secondary"
            icon={FileInput}
            onClick={onImport}
            className="hidden min-h-9 rounded-[4px] px-3 shadow-none sm:inline-flex"
          >
            导入作品
          </Button>
          <Button
            type="button"
            tone="ai"
            icon={Plus}
            onClick={onCreate}
            className="min-h-9 rounded-[4px] px-3 shadow-[0_0_22px_var(--theme-primary-glow)]"
          >
            新建作品
          </Button>
          <Button
            type="button"
            tone="secondary"
            icon={Sparkles}
            onClick={onAssistantOpen}
            className="hidden min-h-9 rounded-[4px] px-3 shadow-none md:inline-flex"
          >
            AI 助手
          </Button>
          <Button
            type="button"
            tone="secondary"
            onClick={onAssistantOpen}
            className="h-9 w-9 rounded-[4px] px-0 md:hidden"
            aria-label="AI 助手"
            title="AI 助手"
          >
            <Bot className="h-4 w-4" />
          </Button>
          <ThemeToggle className="h-9 w-9 rounded-[4px]" />
          <button
            type="button"
            onClick={onProfileOpen}
            className="hidden h-9 items-center gap-2 rounded-[4px] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-2 text-sm font-bold text-[var(--theme-text-strong)] shadow-none transition hover:border-[var(--theme-border-strong)] hover:bg-[var(--theme-surface-hover)] lg:inline-flex"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-[3px] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)] ring-1 ring-[var(--theme-brand-border)]">
              <UserRound className="h-4 w-4" />
            </span>
            <span className="max-w-[92px] truncate">{displayName}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Bell,
  ChevronDown,
  FileInput,
  Plus,
  UserRound,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";

import { MobileBottomNav } from "@/components/design-system";
import { LogoutConfirmDialog } from "@/components/ui/logout-confirm-dialog";
import type { DashboardClientController } from "@/lib/dashboard/use-dashboard-client";

import {
  DashboardFocusPanel,
  DashboardInsightColumn,
  DashboardStatsGrid,
} from "./dashboard-overview-panels";
import { DashboardProfileModal } from "./dashboard-profile-modal";
import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardUpgradeModal } from "./dashboard-upgrade-modal";
import { DashboardWorksSection } from "./dashboard-works-section";

type DashboardShellProps = {
  dashboard: DashboardClientController;
};

export function DashboardShell({ dashboard }: DashboardShellProps) {
  const { handleLogout, logoutBusy, overview, updateUser, user } = dashboard;
  const [profileOpen, setProfileOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const activeWork = overview?.activeWork ?? null;
  const displayName = user?.name?.trim() || user?.email?.split("@")[0] || "创作者";
  const continueHref = activeWork
    ? `/dashboard/novel/${activeWork.id}/chapter/${Math.max(1, activeWork.chapter.index)}`
    : "/dashboard/create";
  const detailHref = activeWork ? `/dashboard/novel/${activeWork.id}` : "/dashboard/create";
  const logsHref = activeWork
    ? `/dashboard/novel/${activeWork.id}/ai-observability`
    : "/dashboard/admin";

  return (
    <main className="relative min-h-dvh overflow-x-clip bg-[#f7fbff] text-[#111827]">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,#fbfdff_0%,#f7fbff_48%,#eef7ff_100%)]" />

      <div className="relative z-10 flex min-h-dvh w-full lg:min-h-[111.111dvh] lg:w-[111.111%] lg:origin-top-left lg:scale-90">
        <DashboardSidebar
          displayName={displayName}
          isAdmin={Boolean(user?.isAdmin)}
          logoutBusy={logoutBusy}
          onLogoutOpen={() => setLogoutConfirmOpen(true)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardHeader
            displayName={displayName}
            onProfileOpen={() => setProfileOpen(true)}
          />

          <div className="min-w-0 flex-1 px-4 pb-28 pt-1 sm:px-5 lg:px-6 lg:pb-6 2xl:px-[37px]">
            <div className="w-full">
              <DashboardWelcome displayName={displayName} />

              <div className="mt-5 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_420px] 2xl:mt-[28px] 2xl:gap-[30px] 2xl:grid-cols-[minmax(0,1fr)_532px]">
                <DashboardFocusPanel
                  activeWork={activeWork}
                  createHref="/dashboard/create"
                  continueHref={continueHref}
                  detailHref={detailHref}
                />

                <DashboardInsightColumn
                  aiStatus={dashboard.aiStatus}
                  aiStatusError={dashboard.aiStatusError}
                  aiStatusLoading={dashboard.aiStatusLoading}
                  detailHref={detailHref}
                  logsHref={logsHref}
                />
              </div>

              <div className="mt-5 2xl:mt-[28px]">
                <DashboardStatsGrid
                  activeWork={activeWork}
                  overview={overview}
                />
              </div>

              <div className="mt-5 2xl:mt-6">
                <DashboardWorksSection activeWorkId={activeWork?.id ?? null} dashboard={dashboard} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <MobileBottomNav activeHref="/dashboard" />

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
    </main>
  );
}

function DashboardHeader({
  displayName,
  onProfileOpen,
}: {
  displayName: string;
  onProfileOpen: () => void;
}) {
  return (
    <header className="px-4 pb-2 pt-4 sm:px-5 lg:px-6 lg:pb-2 lg:pt-5 2xl:px-[37px] 2xl:pb-3 2xl:pt-[30px]">
      <div className="flex min-h-11 w-full items-center justify-end gap-3 2xl:min-h-[50px]">
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 2xl:gap-3">
          <Link
            href="/dashboard/import"
            className="hidden h-11 items-center justify-center gap-2 rounded-[9px] border border-[#dce8f6] bg-white px-4 text-sm font-extrabold text-[#172033] shadow-[0_12px_30px_rgba(15,64,116,0.05)] transition hover:border-[#bfd5ee] hover:bg-[#f8fbff] sm:inline-flex 2xl:h-[50px] 2xl:gap-3 2xl:px-5 2xl:text-base"
          >
            <FileInput className="h-4 w-4" />
            导入作品
          </Link>
          <Link
            href="/dashboard/create"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[9px] border border-transparent bg-[#1687f2] px-4 text-sm font-extrabold text-white shadow-[0_16px_30px_rgba(22,135,242,0.22)] transition hover:bg-[#0f7ae5] 2xl:h-[50px] 2xl:gap-3 2xl:px-5 2xl:text-base"
          >
            <Plus className="h-4 w-4" />
            新建作品
          </Link>
          <button
            type="button"
            className="hidden h-11 w-11 items-center justify-center rounded-[9px] text-[#263551] transition hover:bg-white hover:shadow-[0_12px_30px_rgba(15,64,116,0.05)] md:inline-flex 2xl:h-[50px] 2xl:w-[50px] 2xl:rounded-[10px]"
            aria-label="通知"
          >
            <Bell className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onProfileOpen}
            className="hidden h-11 items-center gap-2 rounded-[9px] px-2 text-sm font-extrabold text-[#172033] transition hover:bg-white hover:shadow-[0_12px_30px_rgba(15,64,116,0.05)] lg:inline-flex 2xl:h-[50px] 2xl:gap-3 2xl:rounded-[10px] 2xl:px-2.5 2xl:text-base"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#dce8f6] bg-[#f1f6fd] text-[#172033] 2xl:h-[46px] 2xl:w-[46px]">
              <UserRound className="h-5 w-5" />
            </span>
            <span className="max-w-[100px] truncate">{displayName}</span>
            <ChevronDown className="h-4 w-4 text-[#64748b]" />
          </button>
        </div>
      </div>
    </header>
  );
}

function DashboardWelcome({ displayName }: { displayName: string }) {
  return (
    <section className="min-w-0">
      <h1 className="truncate text-[28px] font-extrabold leading-9 text-[#111827]">
        晚上好，{displayName} 👋
      </h1>
      <p className="mt-2 text-base font-semibold text-[#52647e] 2xl:mt-3">
        继续创作，记录你的灵感与故事
      </p>
    </section>
  );
}

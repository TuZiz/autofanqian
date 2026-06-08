"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  LogOut,
  RefreshCw,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { type ReactNode, useState } from "react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LogoutConfirmDialog } from "@/components/ui/logout-confirm-dialog";
import { apiRequest } from "@/lib/client/auth-api";
import { cn } from "@/lib/utils";

export const adminPanelClassName =
  "border border-[#dbe7f4] bg-white/95 shadow-[0_14px_38px_rgba(31,87,140,0.06)]";

export const adminInputClassName =
  "h-10 rounded-none border-[#d9e6f5] bg-white text-sm font-semibold text-[#14213d] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] placeholder:text-[#8090aa] focus-visible:border-[#2f7cff] focus-visible:ring-[#2f7cff]/18";

export const adminSelectClassName =
  "h-10 rounded-none border border-[#d9e6f5] bg-white px-4 text-sm font-black text-[#14213d] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] outline-none transition focus:border-[#2f7cff] focus:ring-2 focus:ring-[#2f7cff]/18";

export const adminSecondaryButtonClassName =
  "h-10 rounded-none border-[#d9e6f5] bg-white px-4 text-sm font-black text-[#14213d] shadow-[0_8px_18px_rgba(31,87,140,0.05)] hover:border-[#b8cff0] hover:bg-[#f7fbff]";

export const adminPrimaryButtonClassName =
  "h-10 rounded-none bg-[#1f74ff] px-4 text-sm font-black text-white shadow-[0_10px_20px_rgba(31,116,255,0.18)] hover:bg-[#145ee7]";

type AdminPageShellProps = {
  children: ReactNode;
  nav: ReactNode;
};

export function AdminPageShell({ children, nav }: AdminPageShellProps) {
  return (
    <main className="min-h-dvh bg-[#f7fbff] text-[#14213d]">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(235,244,255,0.85),rgba(255,255,255,0.92)_34%,rgba(248,251,255,1))]" />
      <div className="relative z-10">
        <AdminTopbar nav={nav} />
        <div className="mx-auto w-full max-w-[1880px] px-4 py-5 sm:px-6 lg:px-8">
          <div className="space-y-4">{children}</div>
        </div>
      </div>
    </main>
  );
}

type AdminTopbarProps = {
  nav: ReactNode;
};

function AdminTopbar({ nav }: AdminTopbarProps) {
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  async function handleLogout() {
    if (logoutBusy) return;

    setLogoutBusy(true);
    try {
      const response = await apiRequest<{ redirectTo: string }>("/api/auth/logout", {});

      if (response.success && response.data?.redirectTo) {
        window.location.href = response.data.redirectTo;
      }
    } finally {
      setLogoutBusy(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[#dbe7f4] bg-white/92 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[78px] w-full max-w-[1880px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/dashboard/admin" className="flex min-w-0 shrink-0 items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-none bg-[#eef5ff] text-[#1f74ff] ring-1 ring-[#cfe0f8]">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <span className="hidden truncate text-xl font-black tracking-tight text-[#111b36] sm:block">
            后台管理系统
          </span>
        </Link>

        <div className="hidden min-w-0 flex-1 justify-center px-4 md:flex">{nav}</div>

        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center gap-2 rounded-none border border-[#d9e6f5] bg-white px-4 text-sm font-black text-[#14213d] shadow-[0_8px_18px_rgba(31,87,140,0.05)] transition hover:border-[#b8cff0] hover:bg-[#f7fbff]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">返回工作台</span>
          </Link>

          <ThemeToggle className="h-11 w-11 rounded-none border border-[#d9e6f5] bg-white p-0 text-[#14213d] shadow-[0_8px_18px_rgba(31,87,140,0.05)]" />

          <button
            type="button"
            onClick={() => setLogoutConfirmOpen(true)}
            disabled={logoutBusy}
            className="inline-flex h-11 items-center gap-3 rounded-none border border-[#d9e6f5] bg-white px-3 text-sm font-black text-[#14213d] shadow-[0_8px_18px_rgba(31,87,140,0.05)] transition hover:border-[#b8cff0] hover:bg-[#f7fbff] disabled:opacity-60"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-none bg-[#202a3f] text-sm font-black text-white">
              N
            </span>
            <span className="hidden sm:inline">{logoutBusy ? "退出中" : "退出登录"}</span>
            {logoutBusy ? <LogOut className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="border-t border-[#edf3fb] px-4 py-3 md:hidden">{nav}</div>

      <LogoutConfirmDialog
        open={logoutConfirmOpen}
        busy={logoutBusy}
        square
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={async () => {
          try {
            await handleLogout();
          } finally {
            setLogoutConfirmOpen(false);
          }
        }}
      />
    </header>
  );
}

type AdminHeroProps = {
  description: string;
  eyebrow: string;
  icon: LucideIcon;
  onRefresh?: () => void;
  refreshBusy?: boolean;
  refreshLabel?: string;
  title: string;
};

export function AdminHero({
  description,
  eyebrow,
  icon: Icon,
  onRefresh,
  refreshBusy = false,
  refreshLabel = "刷新数据",
  title,
}: AdminHeroProps) {
  return (
    <section className={cn(adminPanelClassName, "px-5 py-4 sm:px-6")}>
      <div className="flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 gap-4">
          <span className="flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-none bg-[linear-gradient(145deg,#eef5ff,#f8fbff)] text-[#1f74ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-[#d5e5fb]">
            <Icon className="h-7 w-7" />
          </span>
          <div className="min-w-0 pt-1">
            <p className="text-[13px] font-black tracking-wide text-[#4c6387]">{eyebrow}</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-[#101a34]">
              {title}
            </h1>
            <p className="mt-1.5 max-w-3xl text-sm font-semibold leading-6 text-[#536889] sm:text-base">
              {description}
            </p>
          </div>
        </div>

        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshBusy}
            className={cn(adminPrimaryButtonClassName, "inline-flex shrink-0 items-center justify-center gap-2 self-start md:self-auto")}
          >
            <RefreshCw className={cn("h-4 w-4", refreshBusy ? "animate-spin" : "")} />
            {refreshLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}

type AdminMetricCardProps = {
  helper: string;
  icon: LucideIcon;
  label: string;
  tone?: "blue" | "emerald" | "purple" | "sky";
  value: string;
};

export function AdminMetricCard({
  helper,
  icon: Icon,
  label,
  tone = "blue",
  value,
}: AdminMetricCardProps) {
  const toneClassName = {
    blue: "bg-[#edf5ff] text-[#1f74ff]",
    emerald: "bg-[#ecfff5] text-[#18a957]",
    purple: "bg-[#f4efff] text-[#7657ff]",
    sky: "bg-[#eef6ff] text-[#2f7cff]",
  }[tone];

  return (
    <article className={cn(adminPanelClassName, "p-5")}>
      <div className="flex items-center gap-4">
        <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-none", toneClassName)}>
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-[#4c6387]">{label}</p>
          <p className="mt-1 truncate text-2xl font-black leading-none tracking-tight text-[#101a34]">
            {value}
          </p>
          <p className="mt-2 truncate text-sm font-semibold text-[#536889]">{helper}</p>
        </div>
      </div>
    </article>
  );
}

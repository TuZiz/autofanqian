"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  FileInput,
  LayoutDashboard,
  PenLine,
  Plus,
  Shield,
} from "lucide-react";

import { cn } from "@/lib/utils";

type DashboardSidebarProps = {
  displayName: string;
  isAdmin: boolean;
  logoutBusy: boolean;
  onLogoutOpen: () => void;
};

export function DashboardSidebar({
  displayName,
  isAdmin,
  logoutBusy,
  onLogoutOpen,
}: DashboardSidebarProps) {
  const userInitial = getUserInitial(displayName);

  return (
    <aside className="sticky top-0 hidden h-dvh w-[220px] shrink-0 flex-col border-r border-[#d7e4f2] bg-white/82 px-3 py-5 text-[#172033] backdrop-blur-2xl lg:flex lg:h-[111.111dvh] 2xl:w-[278px] 2xl:px-[15px] 2xl:py-[30px]">
      <div className="flex items-center gap-4 px-2 2xl:gap-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-[7px] bg-[#1687f2] text-white shadow-[0_16px_28px_rgba(22,135,242,0.22)] 2xl:h-[53px] 2xl:w-[53px]">
          <PenLine className="h-6 w-6 2xl:h-7 2xl:w-7" />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-base font-extrabold text-[#111827] 2xl:text-lg">
            AI 小说创作工作台
          </h2>
          <p className="mt-1.5 truncate text-sm font-semibold text-[#64748b] 2xl:mt-2">
            让创作更轻松
          </p>
        </div>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-2 2xl:mt-[42px] 2xl:gap-4">
        <SidebarLink active href="/dashboard" icon={<LayoutDashboard className="h-6 w-6" />}>
          创作总览
        </SidebarLink>
        <SidebarLink href="/dashboard/create" icon={<Plus className="h-6 w-6" />}>
          新建作品
        </SidebarLink>
        <SidebarLink href="/dashboard/import" icon={<FileInput className="h-6 w-6" />}>
          导入文本
        </SidebarLink>
        {isAdmin ? (
          <SidebarLink href="/dashboard/admin" icon={<Shield className="h-6 w-6" />}>
            管理后台
          </SidebarLink>
        ) : null}
      </nav>

      <button
        type="button"
        disabled={logoutBusy}
        onClick={onLogoutOpen}
        className="mt-5 flex min-h-12 w-full items-center gap-3 rounded-[10px] px-2.5 text-left text-sm font-bold text-[#40516f] transition hover:bg-[#f1f6fd] hover:text-[#111827] disabled:cursor-not-allowed disabled:opacity-60 2xl:mt-6 2xl:min-h-[52px] 2xl:text-base"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2d2f31] text-lg font-semibold text-white 2xl:h-[43px] 2xl:w-[43px] 2xl:text-xl">
          {userInitial}
        </span>
        <span className="min-w-0 truncate">
          {logoutBusy ? "退出中..." : "退出登录"}
        </span>
      </button>
    </aside>
  );
}

function SidebarLink({
  active = false,
  href,
  icon,
  children,
}: {
  active?: boolean;
  href: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex min-h-[54px] items-center gap-4 rounded-[8px] px-4 text-sm font-extrabold no-underline transition 2xl:min-h-[64px] 2xl:gap-5 2xl:px-5 2xl:text-base",
        active
          ? "bg-[#eaf4ff] text-[#1375dd]"
          : "text-[#40516f] hover:bg-[#f1f6fd] hover:text-[#111827]",
      )}
    >
      {active ? (
        <span className="absolute left-0 top-1/2 h-10 w-1 -translate-y-1/2 rounded-r-full bg-[#1687f2] 2xl:h-[47px]" />
      ) : null}
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{children}</span>
    </Link>
  );
}

function getUserInitial(displayName: string) {
  const trimmed = displayName.trim();
  if (!trimmed) return "N";

  const firstCharacter = Array.from(trimmed)[0];
  if (!firstCharacter) return "N";

  return /[a-z]/i.test(firstCharacter) ? firstCharacter.toUpperCase() : firstCharacter;
}

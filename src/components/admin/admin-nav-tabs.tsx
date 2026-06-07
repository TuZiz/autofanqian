"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Users } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/dashboard/admin",
    icon: Activity,
    label: "生成日志",
  },
  {
    href: "/dashboard/admin/users",
    icon: Users,
    label: "用户管理",
  },
] as const;

export function AdminNavTabs({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-lg border border-[#d9e5f2] bg-white p-1 shadow-[0_10px_26px_rgba(15,64,116,0.06)]",
        className,
      )}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === "/dashboard/admin"
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-extrabold transition",
              active
                ? "bg-[#1687f2] text-white shadow-[0_10px_18px_rgba(22,135,242,0.18)]"
                : "text-[#52647e] hover:bg-[#f3f7fc] hover:text-[#172033]",
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

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
        "mx-auto inline-flex max-w-full items-center gap-2 rounded-full border border-[#d9e6f5] bg-white/88 p-1.5 shadow-[0_12px_30px_rgba(31,87,140,0.08)]",
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
              "relative inline-flex h-10 min-w-[138px] items-center justify-center gap-2 rounded-full px-5 text-sm font-black transition",
              active
                ? "bg-[#eef5ff] text-[#1f74ff]"
                : "text-[#536889] hover:bg-[#f7fbff] hover:text-[#14213d]",
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
            {active ? (
              <span className="absolute inset-x-5 -bottom-1.5 h-1 rounded-full bg-[#1f74ff] shadow-[0_4px_12px_rgba(31,116,255,0.45)]" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Bot,
  Command,
  Download,
  FileInput,
  Library,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";

type CommandItem = {
  description: string;
  href: string;
  icon: typeof Plus;
  keywords: string[];
  label: string;
};

const COMMAND_ITEMS: CommandItem[] = [
  {
    description: "打开长篇/短篇创作向导",
    href: "/dashboard/create",
    icon: Plus,
    keywords: ["new", "create", "新建", "作品", "小说"],
    label: "新建作品",
  },
  {
    description: "回到最近活跃作品",
    href: "/dashboard",
    icon: BookOpen,
    keywords: ["continue", "write", "继续", "写作"],
    label: "继续写作",
  },
  {
    description: "从本地文本导入已有作品",
    href: "/dashboard/import",
    icon: FileInput,
    keywords: ["import", "导入", "作品"],
    label: "导入作品",
  },
  {
    description: "在工作台筛选作品库",
    href: "/dashboard",
    icon: Search,
    keywords: ["search", "搜索", "作品"],
    label: "搜索作品",
  },
  {
    description: "打开章节列表和导航",
    href: "/dashboard#chapters",
    icon: Library,
    keywords: ["chapter", "章节", "导航"],
    label: "搜索章节",
  },
  {
    description: "进入作品设定、人物和伏笔管理",
    href: "/dashboard#context",
    icon: Sparkles,
    keywords: ["bible", "故事圣经", "设定", "人物"],
    label: "打开故事圣经",
  },
  {
    description: "查看生成日志、成功率和失败原因",
    href: "/dashboard/admin",
    icon: Bot,
    keywords: ["ai", "job", "任务", "生成", "日志"],
    label: "查看生成日志",
  },
  {
    description: "进入导出入口或当前作品导出",
    href: "/dashboard",
    icon: Download,
    keywords: ["export", "导出", "下载"],
    label: "导出作品",
  },
];

export function GlobalCommandMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return COMMAND_ITEMS;
    return COMMAND_ITEMS.filter((item) => {
      const haystack = [item.label, item.description, ...item.keywords]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [query]);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        aria-label="打开命令菜单"
        onClick={() => setOpen(true)}
        className="theme-brand-gradient-bg fixed bottom-20 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-[var(--theme-shadow-button)] transition hover:-translate-y-0.5 lg:hidden"
      >
        <Command className="h-5 w-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/35 px-3 pt-[12vh] backdrop-blur-sm">
          <button
            type="button"
            aria-label="关闭命令菜单"
            className="absolute inset-0 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-2xl overflow-hidden rounded-[28px] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] shadow-[0_28px_80px_rgba(25,20,16,0.24)]">
            <div className="flex items-center gap-3 border-b border-[var(--theme-divider)] px-4 py-3">
              <Search className="h-5 w-5 shrink-0 text-[var(--theme-text-muted)]" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索作品、章节、生成日志或输入命令"
                className="h-10 min-w-0 flex-1 bg-transparent text-base font-semibold text-[var(--theme-text-primary)] outline-none placeholder:text-[var(--theme-text-muted)]"
              />
              <kbd className="hidden rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] px-2 py-1 text-xs font-black text-[var(--theme-text-muted)] sm:block">
                ESC
              </kbd>
            </div>
            <div className="max-h-[58vh] overflow-y-auto p-2">
              {filteredItems.length ? (
                filteredItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={`${item.label}-${item.href}`}
                      type="button"
                      onClick={() => navigate(item.href)}
                      className="group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-[var(--theme-surface-hover)]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--theme-brand-soft)] text-[var(--theme-brand-600)] ring-1 ring-[var(--theme-brand-border)]">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black text-[var(--theme-text-strong)]">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block truncate text-xs font-semibold text-[var(--theme-text-secondary)]">
                          {item.description}
                        </span>
                      </span>
                      <span className="text-xs font-black text-[var(--theme-text-muted)] opacity-0 transition group-hover:opacity-100">
                        打开
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm font-black text-[var(--theme-text-strong)]">没有匹配命令</p>
                  <p className="mt-1 text-xs font-semibold text-[var(--theme-text-muted)]">
                    试试“新建”“导入”“生成日志”。
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-[var(--theme-divider)] px-4 py-3 text-xs font-semibold text-[var(--theme-text-muted)]">
              <span>Ctrl / Cmd + K</span>
              <Link
                href="/dashboard/create"
                onClick={() => setOpen(false)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full bg-[var(--theme-brand-soft)] px-3 py-1.5 font-black text-[var(--theme-brand-text)]",
                )}
              >
                <Plus className="h-3.5 w-3.5" />
                新建作品
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

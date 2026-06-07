"use client";

import { RefreshCw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GenerationLogsController } from "@/lib/admin/use-generation-logs";
import type { GenerationLogStatusFilter } from "@/lib/admin/generation-log-types";

const statusOptions: Array<{ label: string; value: GenerationLogStatusFilter }> = [
  { label: "全部", value: "all" },
  { label: "queued", value: "queued" },
  { label: "running", value: "running" },
  { label: "succeeded", value: "succeeded" },
  { label: "success", value: "success" },
  { label: "failed", value: "failed" },
  { label: "stale", value: "stale" },
  { label: "cancelled", value: "cancelled" },
];

const takeOptions = [20, 50, 100] as const;

export function GenerationLogFilters({ logs }: { logs: GenerationLogsController }) {
  return (
    <section className="rounded-[18px] border border-[#d9e5f2] bg-white p-3 shadow-[0_18px_48px_rgba(15,64,116,0.06)]">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[220px] flex-1 sm:max-w-[420px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7b8ca5]" />
          <Input
            value={logs.query}
            onChange={(event) => logs.setQuery(event.target.value)}
            placeholder="搜索邮箱、作品名、模型、action"
            className="h-9 rounded-md pl-9"
          />
        </label>

        <select
          value={logs.status}
          onChange={(event) => logs.setStatus(event.target.value as GenerationLogStatusFilter)}
          className="h-9 rounded-md border border-[#d9e5f2] bg-white px-3 text-sm font-bold text-[#172033] outline-none focus:ring-2 focus:ring-[#1687f2]/20"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
              {option.value !== "all" ? ` (${logs.countMap.get(option.value) ?? 0})` : ""}
            </option>
          ))}
        </select>

        <select
          value={logs.take}
          onChange={(event) => logs.setTake(Number(event.target.value) as 20 | 50 | 100)}
          className="h-9 rounded-md border border-[#d9e5f2] bg-white px-3 text-sm font-bold text-[#172033] outline-none focus:ring-2 focus:ring-[#1687f2]/20"
        >
          {takeOptions.map((option) => (
            <option key={option} value={option}>
              {option} 条
            </option>
          ))}
        </select>

        <Button
          type="button"
          variant={logs.autoRefresh ? "default" : "outline"}
          size="lg"
          onClick={() => logs.setAutoRefresh(!logs.autoRefresh)}
        >
          自动刷新
        </Button>

        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => void logs.refresh()}
          disabled={logs.loading}
        >
          <RefreshCw className={logs.loading ? "animate-spin" : ""} />
          刷新
        </Button>
      </div>
      <p className="mt-2 text-xs font-semibold text-[#7b8ca5]">
        自动刷新间隔 10 秒，默认关闭。
      </p>
    </section>
  );
}

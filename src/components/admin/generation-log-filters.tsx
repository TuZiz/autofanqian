"use client";

import { RefreshCw, Search } from "lucide-react";

import {
  adminInputClassName,
  adminPanelClassName,
  adminPrimaryButtonClassName,
  adminSecondaryButtonClassName,
  adminSelectClassName,
} from "@/components/admin/admin-page-shell";
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
    <section className={`${adminPanelClassName} p-2.5`}>
      <div className="grid items-center gap-2 md:grid-cols-[minmax(260px,1fr)_132px_108px_auto_auto] xl:grid-cols-[minmax(300px,420px)_132px_108px_auto_auto_minmax(0,1fr)]">
        <label className="relative min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#7084a3]" />
          <Input
            value={logs.query}
            onChange={(event) => logs.setQuery(event.target.value)}
            placeholder="搜索邮箱、作品名、模型、action"
            className={`${adminInputClassName} h-8 pl-8 text-xs`}
          />
        </label>

        <select
          value={logs.status}
          onChange={(event) => logs.setStatus(event.target.value as GenerationLogStatusFilter)}
          className={`${adminSelectClassName} h-8 px-2.5 text-xs`}
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
          className={`${adminSelectClassName} h-8 px-2.5 text-xs`}
        >
          {takeOptions.map((option) => (
            <option key={option} value={option}>
              {option} 条/页
            </option>
          ))}
        </select>

        <Button
          type="button"
          variant={logs.autoRefresh ? "default" : "outline"}
          size="lg"
          onClick={() => logs.setAutoRefresh(!logs.autoRefresh)}
          className={`${logs.autoRefresh ? adminPrimaryButtonClassName : adminSecondaryButtonClassName} h-8 px-3 text-xs`}
        >
          自动刷新
        </Button>

        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => void logs.refresh()}
          disabled={logs.loading}
          className={`${adminSecondaryButtonClassName} h-8 px-3 text-xs`}
        >
          <RefreshCw className={logs.loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
          刷新
        </Button>
      </div>
      <p className="mt-2 text-[11px] font-semibold leading-4 text-[#7084a3]">
        自动刷新间隔 10 秒，默认关闭。
      </p>
    </section>
  );
}

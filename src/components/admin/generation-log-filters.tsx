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
    <section className={`${adminPanelClassName} p-4`}>
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[260px] flex-[1_1_420px]">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7084a3]" />
          <Input
            value={logs.query}
            onChange={(event) => logs.setQuery(event.target.value)}
            placeholder="搜索邮箱、作品名、模型、action"
            className={`${adminInputClassName} pl-11`}
          />
        </label>

        <select
          value={logs.status}
          onChange={(event) => logs.setStatus(event.target.value as GenerationLogStatusFilter)}
          className={`${adminSelectClassName} min-w-[170px]`}
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
          className={`${adminSelectClassName} min-w-[138px]`}
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
          className={logs.autoRefresh ? adminPrimaryButtonClassName : adminSecondaryButtonClassName}
        >
          自动刷新
        </Button>

        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => void logs.refresh()}
          disabled={logs.loading}
          className={adminSecondaryButtonClassName}
        >
          <RefreshCw className={logs.loading ? "animate-spin" : ""} />
          刷新
        </Button>
      </div>
      <p className="mt-3 text-xs font-semibold text-[#7084a3]">
        自动刷新间隔 10 秒，默认关闭。
      </p>
    </section>
  );
}

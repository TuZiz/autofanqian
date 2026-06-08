"use client";

import { cn } from "@/lib/utils";

type Bar = {
  id: string;
  status: string;
  createdAt: string;
};

const statusColor: Record<string, string> = {
  cancelled: "bg-slate-300",
  failed: "bg-red-500",
  queued: "bg-slate-400",
  running: "bg-blue-500",
  stale: "bg-orange-500",
  success: "bg-emerald-500",
  succeeded: "bg-emerald-500",
};

export function GenerationLogStatusBars({ bars }: { bars: Bar[] }) {
  if (!bars.length) {
    return (
      <div className="flex h-12 items-center justify-center rounded-[12px] border border-dashed border-[#d9e6f5] bg-[#f7fbff] text-xs font-bold text-[#7084a3]">
        暂无最近任务
      </div>
    );
  }

  return (
    <div className="rounded-[12px] border border-[#d9e6f5] bg-[#f7fbff] px-4 py-4">
      <div className="flex h-12 items-end gap-1 overflow-hidden">
        {bars.map((bar) => (
          <span
            key={bar.id}
            title={`${bar.status} · ${new Date(bar.createdAt).toLocaleString("zh-CN")}`}
            className={cn(
              "block h-full min-w-1.5 flex-1 rounded-full transition hover:scale-y-110",
              statusColor[bar.status] ?? "bg-slate-300",
            )}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[11px] font-bold text-[#536889]">
        <Legend color="bg-emerald-500" label="成功" />
        <Legend color="bg-red-500" label="失败" />
        <Legend color="bg-blue-500" label="运行中" />
        <Legend color="bg-slate-400" label="排队" />
        <Legend color="bg-orange-500" label="stale" />
        <Legend color="bg-slate-300" label="cancelled" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", color)} />
      {label}
    </span>
  );
}

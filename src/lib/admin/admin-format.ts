"use client";

import {
  CheckCircle2,
  Clock,
  Loader2,
  PauseCircle,
  Shield,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Meta = {
  className: string;
  icon?: LucideIcon;
  label: string;
};

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatRelativeTime(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  const timestamp = date.getTime();
  if (Number.isNaN(timestamp)) return "-";

  const diffMs = Date.now() - timestamp;
  const absMs = Math.abs(diffMs);
  const minute = 60_000;
  const hour = minute * 60;
  const day = hour * 24;

  if (absMs < minute) return diffMs >= 0 ? "刚刚" : "即将";
  if (absMs < hour) return `${Math.round(absMs / minute)} 分钟${diffMs >= 0 ? "前" : "后"}`;
  if (absMs < day) return `${Math.round(absMs / hour)} 小时${diffMs >= 0 ? "前" : "后"}`;
  return `${Math.round(absMs / day)} 天${diffMs >= 0 ? "前" : "后"}`;
}

export function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return "-";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${trimFixed(ms / 1000)}s`;

  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

export function formatCompactNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "0";
  const abs = Math.abs(value);
  if (abs < 1000) return `${value}`;
  if (abs < 10_000) return `${trimFixed(value / 1000)}k`;
  return `${trimFixed(value / 10_000)}w`;
}

export function formatTokens(value: number | null | undefined): string {
  return formatCompactNumber(value);
}

export function getGenerationStatusMeta(status: string): Meta {
  const key = status.toLowerCase();
  const map: Record<string, Meta> = {
    cancelled: {
      className: "border-slate-200 bg-slate-50 text-slate-500",
      icon: PauseCircle,
      label: "已取消",
    },
    failed: {
      className: "border-red-200 bg-red-50 text-red-700",
      icon: XCircle,
      label: "失败",
    },
    queued: {
      className: "border-slate-200 bg-slate-50 text-slate-600",
      icon: Clock,
      label: "排队",
    },
    running: {
      className: "border-blue-200 bg-blue-50 text-blue-700",
      icon: Loader2,
      label: "运行中",
    },
    stale: {
      className: "border-orange-200 bg-orange-50 text-orange-700",
      icon: Clock,
      label: "过期",
    },
    success: {
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      icon: CheckCircle2,
      label: "成功",
    },
    succeeded: {
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      icon: CheckCircle2,
      label: "成功",
    },
  };

  return map[key] ?? {
    className: "border-slate-200 bg-slate-50 text-slate-600",
    label: status || "未知",
  };
}

export function getUserStatusMeta(status: string): Meta {
  const map: Record<string, Meta> = {
    active: {
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      label: "正常",
    },
    banned: {
      className: "border-red-200 bg-red-50 text-red-700",
      label: "封禁",
    },
    deleted: {
      className: "border-slate-200 bg-slate-50 text-slate-500",
      label: "删除态",
    },
    limited: {
      className: "border-orange-200 bg-orange-50 text-orange-700",
      label: "受限",
    },
  };

  return map[status] ?? {
    className: "border-slate-200 bg-slate-50 text-slate-600",
    label: status || "未知",
  };
}

export function getUserRoleMeta(role: string): Meta {
  const map: Record<string, Meta> = {
    admin: {
      className: "border-blue-200 bg-blue-50 text-blue-700",
      icon: Shield,
      label: "管理员",
    },
    super_admin: {
      className: "border-violet-200 bg-violet-50 text-violet-700",
      icon: ShieldCheck,
      label: "超级管理员",
    },
    user: {
      className: "border-slate-200 bg-slate-50 text-slate-600",
      icon: UserRound,
      label: "用户",
    },
  };

  return map[role] ?? {
    className: "border-slate-200 bg-slate-50 text-slate-600",
    label: role || "未知",
  };
}

export function getMembershipMeta(tier: string): Meta {
  const map: Record<string, Meta> = {
    default: {
      className: "border-slate-200 bg-slate-50 text-slate-600",
      label: "Default",
    },
    max: {
      className: "border-amber-200 bg-amber-50 text-amber-700",
      label: "Max",
    },
    plus: {
      className: "border-blue-200 bg-blue-50 text-blue-700",
      label: "Plus",
    },
    pro: {
      className: "border-violet-200 bg-violet-50 text-violet-700",
      label: "Pro",
    },
  };

  return map[tier] ?? {
    className: "border-slate-200 bg-slate-50 text-slate-600",
    label: tier || "未知",
  };
}

export function getRiskOperationLabel(next: {
  role?: string;
  status?: string;
}): string | null {
  if (next.status === "banned") return "封禁用户";
  if (next.status === "deleted") return "设为删除态";
  if (next.role === "admin") return "设为管理员";
  if (next.role === "user") return "取消管理员";
  return null;
}

function trimFixed(value: number): string {
  return value.toFixed(1).replace(/\.0$/, "");
}

"use client";

import { SlidersHorizontal } from "lucide-react";

import type { DashboardAdminController } from "@/lib/admin/use-dashboard-admin";
import type { PlanningWindowConfig } from "@/lib/admin/dashboard-admin-types";

const PRESET_KEYS = ["short", "smart", "long"] as const;

export function AdminPlanningSection({ admin }: { admin: DashboardAdminController }) {
  const config = admin.planningConfig;
  if (!config) return null;
  const currentConfig = config as PlanningWindowConfig;

  function update(next: PlanningWindowConfig) {
    admin.handleUpdatePlanningConfig(next);
  }

  function updateRoot(key: "unlockThreshold" | "hardMaxChapters", value: number) {
    update({
      ...currentConfig,
      [key]: key === "unlockThreshold" ? Math.max(0.1, Math.min(1, value)) : Math.max(1, Math.min(60, Math.trunc(value))),
    });
  }

  function updatePreset(
    key: keyof PlanningWindowConfig["presets"],
    field: "min" | "max",
    value: number,
  ) {
    const nextValue = Math.max(1, Math.min(currentConfig.hardMaxChapters, Math.trunc(value)));
    const nextPreset = {
      ...currentConfig.presets[key],
      [field]: nextValue,
    };

    if (nextPreset.min > nextPreset.max) {
      if (field === "min") nextPreset.max = nextPreset.min;
      else nextPreset.min = nextPreset.max;
    }

    update({
      ...currentConfig,
      presets: {
        ...currentConfig.presets,
        [key]: nextPreset,
      },
    });
  }

  return (
    <section className="mt-4 overflow-hidden rounded-lg border border-stone-200 bg-white/95 shadow-sm backdrop-blur dark:border-white/10 dark:bg-stone-950">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-100 p-4 dark:border-white/10">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-400/20">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-stone-950 dark:text-white">规划参数配置</h2>
            <p className="mt-1 text-sm font-semibold text-stone-500 dark:text-stone-400">
              控制初始可写窗口、单次延展上限和开放阈值；修改后自动保存。
            </p>
          </div>
        </div>
        <SaveBadge state={admin.planningSaveState} error={admin.planningSaveError} time={admin.planningLastSavedAt} />
      </div>

      <div className="grid gap-3 p-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <NumberField
            label="延展触发阈值"
            suffix="%"
            value={Math.round(currentConfig.unlockThreshold * 100)}
            min={10}
            max={100}
            onChange={(value) => updateRoot("unlockThreshold", value / 100)}
          />
          <NumberField
            label="单次硬上限"
            suffix="章"
            value={currentConfig.hardMaxChapters}
            min={1}
            max={60}
            onChange={(value) => updateRoot("hardMaxChapters", value)}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {PRESET_KEYS.map((key) => {
            const preset = currentConfig.presets[key];
            return (
              <div key={key} className="rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="mb-3 text-sm font-bold text-stone-950 dark:text-white">{preset.label}</div>
                <div className="grid grid-cols-2 gap-2">
                  <NumberField
                    label="最少"
                    suffix="章"
                    value={preset.min}
                    min={1}
                    max={currentConfig.hardMaxChapters}
                    onChange={(value) => updatePreset(key, "min", value)}
                  />
                  <NumberField
                    label="最多"
                    suffix="章"
                    value={preset.max}
                    min={1}
                    max={currentConfig.hardMaxChapters}
                    onChange={(value) => updatePreset(key, "max", value)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function NumberField({
  label,
  max,
  min,
  onChange,
  suffix,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  suffix: string;
  value: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold text-stone-500 dark:text-stone-400">{label}</span>
      <span className="flex h-10 items-center overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm dark:border-white/10 dark:bg-stone-950">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="min-w-0 flex-1 bg-transparent px-3 text-sm font-medium text-stone-950 outline-none dark:text-white"
        />
        <span className="shrink-0 border-l border-stone-200 px-2 text-xs font-bold text-stone-500 dark:border-white/10">
          {suffix}
        </span>
      </span>
    </label>
  );
}

function SaveBadge({
  error,
  state,
  time,
}: {
  error: string;
  state: "idle" | "dirty" | "saving" | "saved" | "error";
  time: Date | null;
}) {
  const text =
    state === "saving"
      ? "自动保存中"
      : state === "dirty"
        ? "待自动保存"
        : state === "error"
          ? error || "保存失败"
          : state === "saved"
            ? "已自动保存"
            : "等待加载";

  return (
    <div className="inline-flex h-8 max-w-full items-center rounded-full border border-stone-200 bg-white px-3 text-xs font-semibold text-emerald-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-emerald-200">
      <span className="truncate">{text}</span>
      {time ? (
        <span className="ml-2 hidden text-[11px] font-bold text-stone-500 sm:inline">
          {time.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
        </span>
      ) : null}
    </div>
  );
}

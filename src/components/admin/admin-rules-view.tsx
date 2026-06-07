"use client";

import { SlidersHorizontal, Timer } from "lucide-react";

import type { PlanningWindowConfig } from "@/lib/admin/dashboard-admin-types";
import type { AdminRulesController } from "@/lib/admin/use-admin-rules";

import { AdminFormGroup, AdminStatusPill } from "./admin-console-primitives";
import {
  AdminAutoSaveStatus,
  AdminLeftNav,
  AdminWorkspaceLayout,
  AdminWorkspaceShell,
} from "./admin-workspace-shell";

const PRESET_KEYS = ["short", "smart", "long"] as const;

const RULES_NAV_ITEMS = [
  { description: "延展触发阈值与硬上限", icon: SlidersHorizontal, id: "global", title: "全局规则" },
  { description: "短段、智能、长段窗口配置", icon: Timer, id: "presets", title: "章节长度规则" },
];

type AdminRulesViewProps = {
  rules: AdminRulesController;
};

export function AdminRulesView({ rules }: AdminRulesViewProps) {
  const { planningConfig, user } = rules;

  if (!planningConfig) return null;

  const currentConfig = planningConfig;

  function update(next: PlanningWindowConfig) {
    rules.handleUpdatePlanningConfig(next);
  }

  function updateRoot(key: "unlockThreshold" | "hardMaxChapters", value: number) {
    const nextConfig: PlanningWindowConfig = {
      version: currentConfig.version,
      unlockThreshold:
        key === "unlockThreshold"
          ? Math.max(0.1, Math.min(1, value))
          : currentConfig.unlockThreshold,
      hardMaxChapters:
        key === "hardMaxChapters"
          ? Math.max(1, Math.min(60, Math.trunc(value)))
          : currentConfig.hardMaxChapters,
      presets: currentConfig.presets,
    };

    update(nextConfig);
  }

  function updatePreset(
    key: keyof PlanningWindowConfig["presets"],
    field: "max" | "min",
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

    const nextConfig: PlanningWindowConfig = {
      version: currentConfig.version,
      unlockThreshold: currentConfig.unlockThreshold,
      hardMaxChapters: currentConfig.hardMaxChapters,
      presets: {
        ...currentConfig.presets,
        [key]: nextPreset,
      },
    };

    update(nextConfig);
  }

  return (
    <AdminWorkspaceShell
      breadcrumbs={[{ label: "规则配置" }]}
      description="配置 / 规则参数"
      icon={SlidersHorizontal}
      subtitle="控制初始可写窗口、单次硬上限和章节长度规则。修改后自动保存。"
      title="规则参数配置"
      userEmail={user?.email ?? ""}
      meta={
        <AdminAutoSaveStatus
          state={rules.planningSaveState}
          lastSavedAt={rules.planningLastSavedAt}
          error={rules.planningSaveError}
        />
      }
    >
      <AdminWorkspaceLayout
        leftNav={
          <AdminLeftNav
            activeId={rules.activeSection}
            items={RULES_NAV_ITEMS}
            onSelect={rules.setActiveSection}
          />
        }
      >
        <div className="space-y-4">
          {rules.activeSection === "global" ? (
            <AdminFormGroup
              title="全局规则"
              description="影响规划窗口何时开放，以及一次最多允许推进多少章节。"
            >
              <div className="grid gap-3 md:grid-cols-2">
                <NumberField
                  label="延展触发阈值"
                  hint="当已规划窗口接近耗尽时，会按这个百分比阈值触发下一段规划。"
                  suffix="%"
                  value={Math.round(currentConfig.unlockThreshold * 100)}
                  min={10}
                  max={100}
                  onChange={(value) => updateRoot("unlockThreshold", value / 100)}
                />
                <NumberField
                  label="单次硬上限"
                  hint="限制单次规划扩展的最大章节数，避免一次性放出过长窗口。"
                  suffix="章"
                  value={currentConfig.hardMaxChapters}
                  min={1}
                  max={60}
                  onChange={(value) => updateRoot("hardMaxChapters", value)}
                />
              </div>
            </AdminFormGroup>
          ) : null}

          {rules.activeSection === "presets" ? (
            <AdminFormGroup
              title="章节长度规则"
              description="按短段、智能、长段三个档位定义章节窗口范围，编辑器与创建流程会直接复用。"
            >
              <div className="grid gap-3 lg:grid-cols-3">
                {PRESET_KEYS.map((key) => {
                  const preset = currentConfig.presets[key];
                  return (
                    <div
                      key={key}
                      className="rounded-[20px] border border-[var(--theme-border)] bg-[rgba(246,251,254,0.9)] p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-black text-[var(--theme-text-strong)]">
                            {preset.label}
                          </h4>
                          <p className="mt-1 text-xs font-semibold text-[var(--theme-text-muted)]">
                            保持最小与最大章节窗口边界一致。
                          </p>
                        </div>
                        <AdminStatusPill tone="neutral">
                          {preset.min}-{preset.max} 章
                        </AdminStatusPill>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <NumberField
                          label="最小值"
                          hint="该档位允许的最小章节数。"
                          suffix="章"
                          value={preset.min}
                          min={1}
                          max={currentConfig.hardMaxChapters}
                          onChange={(value) => updatePreset(key, "min", value)}
                        />
                        <NumberField
                          label="最大值"
                          hint="该档位允许的最大章节数。"
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
            </AdminFormGroup>
          ) : null}
        </div>
      </AdminWorkspaceLayout>
    </AdminWorkspaceShell>
  );
}

function NumberField({
  hint,
  label,
  max,
  min,
  onChange,
  suffix,
  value,
}: {
  hint: string;
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  suffix: string;
  value: number;
}) {
  return (
    <label className="block">
      <span className="block text-[12px] font-black text-[var(--theme-text-strong)]">{label}</span>
      <span className="mt-1 block text-[12px] font-medium leading-5 text-[var(--theme-text-muted)]">
        {hint}
      </span>
      <span className="mt-3 flex h-12 items-center overflow-hidden rounded-[16px] border border-[var(--theme-border)] bg-[rgba(255,255,255,0.96)] shadow-[var(--theme-shadow-button)] transition focus-within:border-[var(--theme-brand-border)] focus-within:shadow-[var(--theme-focus-ring)]">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(event) => {
            const nextValue = Number(event.target.value);
            if (Number.isNaN(nextValue)) return;
            onChange(nextValue);
          }}
          className="min-w-0 flex-1 bg-transparent px-4 text-sm font-semibold text-[var(--theme-text-strong)] outline-none"
        />
        <span className="flex h-full shrink-0 items-center border-l border-[var(--theme-border)] px-3 text-xs font-black text-[var(--theme-text-muted)]">
          {suffix}
        </span>
      </span>
    </label>
  );
}

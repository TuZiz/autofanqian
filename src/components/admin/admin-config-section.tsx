"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { EditDrawer } from "@/components/admin/admin-config-edit-drawer";
import {
  buildModules,
  getModuleItems,
  handleAddCurrent,
  handleDeleteCurrent,
  type ConfigModuleKey,
} from "@/components/admin/admin-config-model";
import { ModuleNav } from "@/components/admin/admin-config-module-nav";
import { SummaryList } from "@/components/admin/admin-config-summary-list";
import type { DashboardAdminController } from "@/lib/admin/use-dashboard-admin";

type AdminConfigSectionProps = {
  admin: DashboardAdminController;
};

export function AdminConfigSection({ admin }: AdminConfigSectionProps) {
  const { config } = admin;
  const [activeModuleKey, setActiveModuleKey] = useState<ConfigModuleKey>("genres");
  const [selectedId, setSelectedId] = useState("");

  const modules = useMemo(() => (config ? buildModules(config) : []), [config]);
  const activeModule =
    modules.find((module) => module.key === activeModuleKey) ?? modules[0];
  const items = useMemo(
    () => (config && activeModule ? getModuleItems(config, activeModule.key) : []),
    [activeModule, config],
  );
  const effectiveSelectedId = items.some((item) => item.id === selectedId)
    ? selectedId
    : items[0]?.id ?? "";
  const selectedItem = items.find((item) => item.id === effectiveSelectedId) ?? null;

  if (!config || !activeModule) return null;

  const addLabel = activeModule.key === "genres" ? "新增类型" : "新增选项";

  return (
    <section className="mb-4 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm dark:border-white/10 dark:bg-stone-950">
      <div className="border-b border-stone-100 px-4 py-3 dark:border-white/10">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold text-stone-950 dark:text-stone-50">
              创作入口配置
            </h2>
            <p className="mt-1 text-xs font-semibold text-stone-500 dark:text-stone-400">
              左侧切模块，中间看摘要，右侧只编辑当前选中项。修改后会自动保存。
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleAddCurrent(admin, activeModule.key)}
            className="theme-button-secondary inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold active:scale-95"
          >
            <Plus className="h-4 w-4" />
            {addLabel}
          </button>
        </div>
      </div>

      <div className="grid min-h-[620px] gap-0 lg:grid-cols-[250px_minmax(0,1fr)_420px]">
        <ModuleNav
          activeKey={activeModule.key}
          modules={modules}
          onSelect={(key) => {
            setActiveModuleKey(key);
            const nextItems = config ? getModuleItems(config, key) : [];
            setSelectedId(nextItems[0]?.id ?? "");
          }}
        />

        <SummaryList
          config={config}
          items={items}
          module={activeModule}
          onDelete={(id) => handleDeleteCurrent(admin, activeModule.key, id)}
          onSelect={setSelectedId}
          selectedId={effectiveSelectedId}
        />

        <EditDrawer
          config={config}
          moduleKey={activeModule.key}
          onDelete={(id) => handleDeleteCurrent(admin, activeModule.key, id)}
          selectedItem={selectedItem}
          setConfig={admin.setConfig}
        />
      </div>
    </section>
  );
}

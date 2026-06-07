"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { Button, SectionCard } from "@/components/design-system";
import {
  buildModules,
  getModuleItems,
  handleAddCurrent,
  handleDeleteCurrent,
  type ConfigModuleKey,
} from "@/components/admin/admin-config-model";
import { AdminStatusPill } from "@/components/admin/admin-console-primitives";
import { EditDrawer } from "@/components/admin/admin-config-edit-drawer";
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
  const activeModule = modules.find((module) => module.key === activeModuleKey) ?? modules[0];
  const items = useMemo(
    () => (config && activeModule ? getModuleItems(config, activeModule.key) : []),
    [activeModule, config],
  );
  const effectiveSelectedId = items.some((item) => item.id === selectedId) ? selectedId : items[0]?.id ?? "";
  const selectedItem = items.find((item) => item.id === effectiveSelectedId) ?? null;

  if (!config || !activeModule) return null;

  const addLabel = activeModule.key === "genres" ? "新增类型" : "新增选项";

  return (
    <SectionCard
      icon={Plus}
      title="创作入口配置"
      description="把入口配置明确拆成模块导航、中栏摘要和右侧编辑抽屉，保证桌面端三栏清晰，窄屏下自动顺序堆叠。"
      variant="elevated"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <AdminStatusPill tone="neutral">
            当前模块 {activeModule.active}/{activeModule.total}
          </AdminStatusPill>
          <Button
            type="button"
            icon={Plus}
            onClick={() => handleAddCurrent(admin, activeModule.key)}
            className="min-h-9 px-3"
          >
            {addLabel}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_360px]">
        <ModuleNav
          activeKey={activeModule.key}
          modules={modules}
          onSelect={(key) => {
            setActiveModuleKey(key);
            const nextItems = getModuleItems(config, key);
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
    </SectionCard>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Layers3, Plus } from "lucide-react";

import { Button } from "@/components/design-system";
import {
  buildModules,
  getModuleItems,
  type ConfigModuleKey,
} from "@/components/admin/admin-config-model";
import type { AdminEntryConfigController } from "@/lib/admin/use-admin-entry-config";

import { AdminStatusPill } from "./admin-console-primitives";
import { EditDrawer } from "./admin-config-edit-drawer";
import { ModuleNav } from "./admin-config-module-nav";
import { SummaryList } from "./admin-config-summary-list";
import { AdminAutoSaveStatus, AdminWorkspaceLayout, AdminWorkspaceShell } from "./admin-workspace-shell";

type AdminEntryConfigViewProps = {
  entryConfig: AdminEntryConfigController;
};

export function AdminEntryConfigView({ entryConfig }: AdminEntryConfigViewProps) {
  const { config, user } = entryConfig;
  const [activeModuleKey, setActiveModuleKey] = useState<ConfigModuleKey>("genres");
  const [selectedId, setSelectedId] = useState("");

  const modules = useMemo(() => (config ? buildModules(config) : []), [config]);
  const activeModule = modules.find((module) => module.key === activeModuleKey) ?? modules[0];
  const items = useMemo(
    () => (config && activeModule ? getModuleItems(config, activeModule.key) : []),
    [activeModule, config],
  );
  const effectiveSelectedId = items.some((item) => item.id === selectedId)
    ? selectedId
    : items[0]?.id ?? "";
  const selectedItem = items.find((item) => item.id === effectiveSelectedId) ?? null;

  if (!config || !activeModule) return null;

  const activeGenre = config.genres.filter((g) => g.active).length;
  const activePlatform = config.platforms.filter((p) => p.active).length;
  const activeDna = config.dnaStyles.filter((d) => d.active).length;
  const activeWord = config.wordOptions.filter((w) => w.active).length;
  const totalEnabled = activeGenre + activePlatform + activeDna + activeWord;

  function handleAdd() {
    if (activeModuleKey === "genres") {
      entryConfig.handleAddGenre();
    } else {
      entryConfig.handleAddOption(activeModuleKey);
    }
  }

  function handleDelete(id: string) {
    if (activeModuleKey === "genres") {
      entryConfig.handleDeleteGenre(id);
    } else {
      entryConfig.handleDeleteOption(activeModuleKey, id);
    }
  }

  return (
    <AdminWorkspaceShell
      breadcrumbs={[{ label: "入口配置" }]}
      description="配置 / 创作入口"
      icon={Layers3}
      subtitle="管理类型卡片、目标平台、仿书 DNA 和目标字数，控制创作页的首屏展示。"
      title="创作入口配置"
      userEmail={user?.email ?? ""}
      meta={
        <>
          <AdminAutoSaveStatus
            state={entryConfig.configSaveState}
            lastSavedAt={entryConfig.configLastSavedAt}
            error={entryConfig.configSaveError}
          />
          <AdminStatusPill tone="brand">已启用 {totalEnabled} 个入口</AdminStatusPill>
          <Button
            type="button"
            icon={Plus}
            onClick={handleAdd}
            className="min-h-9 px-3"
          >
            {activeModuleKey === "genres" ? "新增类型" : "新增选项"}
          </Button>
        </>
      }
    >
      <AdminWorkspaceLayout
        leftNav={
          <ModuleNav
            activeKey={activeModuleKey}
            modules={modules}
            onSelect={(key) => {
              setActiveModuleKey(key);
              const nextItems = getModuleItems(config, key);
              setSelectedId(nextItems[0]?.id ?? "");
            }}
          />
        }
        drawer={
          <EditDrawer
            config={config}
            moduleKey={activeModule.key}
            onDelete={handleDelete}
            selectedItem={selectedItem}
            setConfig={entryConfig.setConfig}
          />
        }
      >
        <SummaryList
          config={config}
          items={items}
          module={activeModule}
          onDelete={handleDelete}
          onSelect={setSelectedId}
          selectedId={effectiveSelectedId}
        />
      </AdminWorkspaceLayout>
    </AdminWorkspaceShell>
  );
}

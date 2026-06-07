import { Fingerprint, Layers3, Target, Type, type LucideIcon } from "lucide-react";

import type { CreateUiConfig, OptionSectionKey } from "@/lib/admin/dashboard-admin-types";
import type { DashboardAdminController } from "@/lib/admin/use-dashboard-admin";

export type ConfigModuleKey = "genres" | OptionSectionKey;

export type ConfigModule = {
  active: number;
  description: string;
  icon: LucideIcon;
  key: ConfigModuleKey;
  title: string;
  total: number;
};

const moduleCopy: Record<ConfigModuleKey, Omit<ConfigModule, "active" | "total">> = {
  genres: {
    key: "genres",
    icon: Layers3,
    title: "类型卡片",
    description: "创作入口的题材、标签、图标与渐变样式。",
  },
  platforms: {
    key: "platforms",
    icon: Target,
    title: "目标平台",
    description: "平台定位、文风语气与平台注入规则。",
  },
  dnaStyles: {
    key: "dnaStyles",
    icon: Fingerprint,
    title: "仿书 DNA",
    description: "卖点、节奏与结构特征，决定 AI 模仿方向。",
  },
  wordOptions: {
    key: "wordOptions",
    icon: Type,
    title: "目标字数",
    description: "控制生成篇幅与章节密度的可选方案。",
  },
};

export function buildModules(config: CreateUiConfig): ConfigModule[] {
  const source: Array<{ key: ConfigModuleKey; items: Array<{ active: boolean }> }> = [
    { key: "genres", items: config.genres },
    { key: "platforms", items: config.platforms },
    { key: "dnaStyles", items: config.dnaStyles },
    { key: "wordOptions", items: config.wordOptions },
  ];

  return source.map(({ key, items }) => ({
    ...moduleCopy[key],
    active: items.filter((item) => item.active).length,
    total: items.length,
  }));
}

export function getModuleItems(config: CreateUiConfig, key: ConfigModuleKey) {
  return key === "genres" ? config.genres : config[key];
}

export function handleAddCurrent(admin: DashboardAdminController, key: ConfigModuleKey) {
  if (key === "genres") {
    admin.handleAddGenre();
    return;
  }
  admin.handleAddOption(key);
}

export function handleDeleteCurrent(
  admin: DashboardAdminController,
  key: ConfigModuleKey,
  id: string,
) {
  if (key === "genres") {
    admin.handleDeleteGenre(id);
    return;
  }
  admin.handleDeleteOption(key, id);
}

export function getUsageHint(
  config: CreateUiConfig,
  moduleKey: ConfigModuleKey,
  id: string,
) {
  if (moduleKey !== "genres") return "";
  if (config.platforms.some((item) => item.id === id)) return "与平台同名";
  return "";
}

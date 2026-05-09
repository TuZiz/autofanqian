"use client";

import { useCallback } from "react";

import type {
  CreateUiConfig,
  OptionConfig,
  OptionSectionKey,
} from "@/lib/admin/dashboard-admin-types";

type UseAdminCreateConfigActionsParams = {
  config: CreateUiConfig | null;
  setConfig: (value: CreateUiConfig) => void;
};

export function useAdminCreateConfigActions({
  config,
  setConfig,
}: UseAdminCreateConfigActionsParams) {
  const handleAddGenre = useCallback(() => {
    if (!config) return;

    const id =
      window.prompt("请输入新类型 ID（建议英文/数字，如 fantasy2）", "new_genre")?.trim() ??
      "";
    if (!id) return;

    if (config.genres.some((genre) => genre.id === id)) {
      window.alert("该 ID 已存在，请换一个。");
      return;
    }

    const name = window.prompt("请输入类型名称", "新类型")?.trim() ?? "";
    if (!name) return;

    const nextSortOrder =
      Math.max(0, ...config.genres.map((genre) => genre.sortOrder ?? 0)) + 10;
    setConfig({
      ...config,
      genres: [
        ...config.genres,
        {
          id,
          name,
          tags: [],
          icon: "✍️",
          gradient: "from-emerald-500 to-teal-500",
          sortOrder: nextSortOrder,
          active: true,
        },
      ],
    });
  }, [config, setConfig]);

  const handleDeleteGenre = useCallback(
    (id: string) => {
      if (!config) return;
      if (!window.confirm(`确定删除类型「${id}」吗？`)) return;
      setConfig({
        ...config,
        genres: config.genres.filter((genre) => genre.id !== id),
      });
    },
    [config, setConfig],
  );

  const handleAddOption = useCallback(
    (section: OptionSectionKey) => {
      if (!config) return;

      const id =
        window.prompt("请输入新选项 ID（建议英文/数字，如 qidian2）", "new_option")?.trim() ??
        "";
      if (!id) return;

      const items = (config[section] ?? []) as OptionConfig[];
      if (items.some((item) => item.id === id)) {
        window.alert("该 ID 已存在，请换一个。");
        return;
      }

      const label = window.prompt("请输入显示名称", "新选项")?.trim() ?? "";
      if (!label) return;

      const nextSortOrder =
        Math.max(0, ...items.map((item) => item.sortOrder ?? 0)) + 10;
      setConfig({
        ...config,
        [section]: [
          ...items,
          { id, label, promptHint: "", sortOrder: nextSortOrder, active: true },
        ],
      } as CreateUiConfig);
    },
    [config, setConfig],
  );

  const handleDeleteOption = useCallback(
    (section: OptionSectionKey, id: string) => {
      if (!config) return;
      if (!window.confirm(`确定删除选项「${id}」吗？`)) return;

      const items = (config[section] ?? []) as OptionConfig[];
      setConfig({
        ...config,
        [section]: items.filter((item) => item.id !== id),
      } as CreateUiConfig);
    },
    [config, setConfig],
  );

  return {
    handleAddGenre,
    handleAddOption,
    handleDeleteGenre,
    handleDeleteOption,
  };
}

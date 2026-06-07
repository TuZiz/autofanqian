import type { DashboardFilters } from "@/lib/dashboard/dashboard-types";

export function hasActiveWorkLibraryFilter(filters: DashboardFilters) {
  return Boolean(
    filters.q.trim() ||
      filters.genreId.trim() ||
      filters.tag.trim() ||
      filters.owner.trim() ||
      filters.type !== "all",
  );
}

export function getWorkLibraryEmptyCopy(filters: DashboardFilters) {
  if (!hasActiveWorkLibraryFilter(filters)) {
    return {
      title: "这里还没有作品",
      description: "先创建一部长篇，或一篇完结的短篇故事，作品库会自动归档。",
      canCreate: true,
    };
  }

  if (filters.type === "long") {
    return {
      title: "当前筛选下没有长篇",
      description: "短篇仍会保留在作品库里，切回“全部”或“短篇”就能看到。",
      canCreate: false,
    };
  }

  if (filters.type === "short") {
    return {
      title: "当前筛选下没有短篇",
      description: "可以去短篇入口生成一篇完结故事，或切回“全部”查看长篇作品。",
      canCreate: false,
    };
  }

  if (filters.type === "imported") {
    return {
      title: "当前筛选下没有导入作品",
      description: "导入 TXT 或粘贴旧稿后，它们会自动进入这个分组。",
      canCreate: false,
    };
  }

  return {
    title: "没有匹配的作品",
    description: "尝试放宽筛选条件，或者换一个关键词再搜索。",
    canCreate: false,
  };
}

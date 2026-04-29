"use client";

import { useMemo, useState } from "react";
import {
  ChevronRight,
  Fingerprint,
  Layers3,
  Pencil,
  Plus,
  Target,
  Trash2,
  Type,
  type LucideIcon,
} from "lucide-react";

import { parseTags, stringifyTags } from "@/lib/admin/dashboard-admin-format";
import type {
  CreateUiConfig,
  GenreConfig,
  OptionConfig,
  OptionSectionKey,
} from "@/lib/admin/dashboard-admin-types";
import type { DashboardAdminController } from "@/lib/admin/use-dashboard-admin";
import { cn } from "@/lib/utils";

type AdminConfigSectionProps = {
  admin: DashboardAdminController;
};

type ConfigModuleKey = "genres" | OptionSectionKey;

type ConfigModule = {
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
    description: "创作入口的题材、标签和展示样式",
  },
  platforms: {
    key: "platforms",
    icon: Target,
    title: "目标平台",
    description: "平台定位和写作基调注入",
  },
  dnaStyles: {
    key: "dnaStyles",
    icon: Fingerprint,
    title: "仿书 DNA",
    description: "卖点、节奏和结构参考",
  },
  wordOptions: {
    key: "wordOptions",
    icon: Type,
    title: "目标字数",
    description: "生成篇幅和项目规模选项",
  },
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
    <section className="mb-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
      <div className="border-b border-slate-100 px-4 py-3 dark:border-white/10">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">
              创作入口配置
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              左侧切模块，中间看摘要，右侧只编辑当前选中项。修改后会自动保存。
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleAddCurrent(admin, activeModule.key)}
            className="theme-button-secondary inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-black active:scale-95"
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

function buildModules(config: CreateUiConfig): ConfigModule[] {
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

function getModuleItems(config: CreateUiConfig, key: ConfigModuleKey) {
  return key === "genres" ? config.genres : config[key];
}

function handleAddCurrent(admin: DashboardAdminController, key: ConfigModuleKey) {
  if (key === "genres") {
    admin.handleAddGenre();
    return;
  }
  admin.handleAddOption(key);
}

function handleDeleteCurrent(
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

function ModuleNav({
  activeKey,
  modules,
  onSelect,
}: {
  activeKey: ConfigModuleKey;
  modules: ConfigModule[];
  onSelect: (key: ConfigModuleKey) => void;
}) {
  return (
    <aside className="border-b border-slate-100 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/[0.03] lg:border-b-0 lg:border-r">
      <div className="mb-3 px-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
        Modules
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {modules.map((module) => {
          const Icon = module.icon;
          const selected = module.key === activeKey;

          return (
            <button
              key={module.key}
              type="button"
              onClick={() => onSelect(module.key)}
              className={cn(
                "group flex items-center justify-between gap-3 rounded-lg border px-3 py-3 text-left transition",
                selected
                  ? "border-slate-950 bg-slate-950 text-white shadow-sm dark:border-white dark:bg-white dark:text-slate-950"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200 dark:hover:bg-white/[0.06]",
              )}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                    selected
                      ? "border-white/20 bg-white/10 dark:border-slate-950/10 dark:bg-slate-950/10"
                      : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.04]",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black">{module.title}</span>
                  <span
                    className={cn(
                      "mt-0.5 block truncate text-[11px] font-bold",
                      selected ? "text-white/65 dark:text-slate-600" : "text-slate-500 dark:text-slate-400",
                    )}
                  >
                    {module.active}/{module.total} 启用
                  </span>
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function SummaryList({
  config,
  items,
  module,
  onDelete,
  onSelect,
  selectedId,
}: {
  config: CreateUiConfig;
  items: Array<GenreConfig | OptionConfig>;
  module: ConfigModule;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  selectedId: string;
}) {
  return (
    <section className="min-w-0 border-b border-slate-100 dark:border-white/10 lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-white/10">
        <div className="min-w-0">
          <h3 className="text-base font-black text-slate-950 dark:text-slate-50">
            {module.title}
          </h3>
          <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
            {module.description}
          </p>
        </div>
        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-black text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
          {items.length} 项
        </span>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-white/10">
        {items.map((item) => (
          <SummaryRow
            key={item.id}
            config={config}
            item={item}
            moduleKey={module.key}
            onDelete={onDelete}
            onSelect={onSelect}
            selected={item.id === selectedId}
          />
        ))}
        {!items.length ? (
          <div className="p-8 text-center text-sm font-bold text-slate-400">
            当前模块暂无配置项
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SummaryRow({
  config,
  item,
  moduleKey,
  onDelete,
  onSelect,
  selected,
}: {
  config: CreateUiConfig;
  item: GenreConfig | OptionConfig;
  moduleKey: ConfigModuleKey;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  selected: boolean;
}) {
  const isGenre = moduleKey === "genres";
  const genre = isGenre ? (item as GenreConfig) : null;
  const option = isGenre ? null : (item as OptionConfig);
  const title = isGenre ? genre!.name : option!.label;
  const subtitle = isGenre
    ? `${genre!.tags.length || 0} 个标签 · ${genre!.gradient || "未设渐变"}`
    : option!.promptHint
      ? option!.promptHint
      : "未填写提示词注入规则";
  const usage = getUsageHint(config, moduleKey, item.id);

  return (
    <article
      className={cn(
        "grid gap-3 px-4 py-3 transition lg:grid-cols-[minmax(0,1fr)_150px_106px] lg:items-center",
        selected ? "bg-emerald-50/70 dark:bg-emerald-400/10" : "bg-white dark:bg-transparent",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(item.id)}
        className="min-w-0 text-left"
      >
        <div className="flex items-center gap-2">
          {isGenre ? (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm font-black dark:border-white/10 dark:bg-white/[0.04]">
              {genre!.icon || "?"}
            </span>
          ) : null}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-black text-slate-950 dark:text-slate-50">
                {title}
              </span>
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-black text-slate-500 dark:bg-white/[0.08] dark:text-slate-400">
                {item.id}
              </span>
            </div>
            <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          </div>
        </div>
      </button>

      <div className="flex flex-wrap items-center gap-2 text-xs font-black">
        <span
          className={cn(
            "rounded-md border px-2 py-1",
            item.active
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-200"
              : "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400",
          )}
        >
          {item.active ? "启用" : "停用"}
        </span>
        <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
          排序 {item.sortOrder}
        </span>
        {usage ? (
          <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
            {usage}
          </span>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onSelect(item.id)}
          className="theme-button-secondary inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-black active:scale-95"
        >
          <Pencil className="h-3.5 w-3.5" />
          编辑
        </button>
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-black text-rose-500 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-400/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}

function EditDrawer({
  config,
  moduleKey,
  onDelete,
  selectedItem,
  setConfig,
}: {
  config: CreateUiConfig;
  moduleKey: ConfigModuleKey;
  onDelete: (id: string) => void;
  selectedItem: GenreConfig | OptionConfig | null;
  setConfig: (value: CreateUiConfig) => void;
}) {
  if (!selectedItem) {
    return (
      <aside className="flex min-h-[320px] items-center justify-center bg-slate-50/60 p-6 text-sm font-bold text-slate-400 dark:bg-white/[0.02]">
        选择左侧列表项后在这里编辑
      </aside>
    );
  }

  const isGenre = moduleKey === "genres";

  return (
    <aside className="bg-slate-50/70 dark:bg-white/[0.02]">
      <div className="sticky top-20">
        <div className="border-b border-slate-100 px-4 py-3 dark:border-white/10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                Edit Drawer
              </div>
              <h3 className="mt-1 truncate text-lg font-black text-slate-950 dark:text-slate-50">
                {isGenre ? (selectedItem as GenreConfig).name : (selectedItem as OptionConfig).label}
              </h3>
              <p className="mt-0.5 truncate font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                {selectedItem.id}
              </p>
            </div>
            <span
              className={cn(
                "rounded-md border px-2 py-1 text-xs font-black",
                selectedItem.active
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-200"
                  : "border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400",
              )}
            >
              {selectedItem.active ? "启用" : "停用"}
            </span>
          </div>
        </div>

        <div className="space-y-3 p-4">
          {isGenre ? (
            <GenreEditor
              config={config}
              genre={selectedItem as GenreConfig}
              setConfig={setConfig}
            />
          ) : (
            <OptionEditor
              config={config}
              item={selectedItem as OptionConfig}
              moduleKey={moduleKey as OptionSectionKey}
              setConfig={setConfig}
            />
          )}

          <button
            type="button"
            onClick={() => onDelete(selectedItem.id)}
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 text-sm font-black text-rose-600 transition hover:bg-rose-100 dark:border-rose-300/20 dark:bg-rose-400/10 dark:text-rose-200"
          >
            <Trash2 className="h-4 w-4" />
            删除当前项
          </button>
        </div>
      </div>
    </aside>
  );
}

function GenreEditor({
  config,
  genre,
  setConfig,
}: {
  config: CreateUiConfig;
  genre: GenreConfig;
  setConfig: (value: CreateUiConfig) => void;
}) {
  function updateGenre(patch: Partial<GenreConfig>) {
    setConfig({
      ...config,
      genres: config.genres.map((item) => (item.id === genre.id ? { ...item, ...patch } : item)),
    });
  }

  return (
    <>
      <ReadOnlyField label="ID" value={genre.id} />
      <ToggleField
        checked={genre.active}
        label="启用类型"
        onChange={(active) => updateGenre({ active })}
      />
      <TextInput label="显示名称" value={genre.name} onChange={(name) => updateGenre({ name })} />
      <TextInput label="图标" value={genre.icon} onChange={(icon) => updateGenre({ icon })} />
      <TextInput
        label="标签，逗号或顿号分隔"
        value={stringifyTags(genre.tags)}
        onChange={(value) => updateGenre({ tags: parseTags(value) })}
      />
      <TextInput
        label="渐变样式"
        value={genre.gradient}
        onChange={(gradient) => updateGenre({ gradient })}
      />
      <TextInput
        label="排序"
        type="number"
        value={String(genre.sortOrder)}
        onChange={(value) => updateGenre({ sortOrder: Number(value) || 0 })}
      />
    </>
  );
}

function OptionEditor({
  config,
  item,
  moduleKey,
  setConfig,
}: {
  config: CreateUiConfig;
  item: OptionConfig;
  moduleKey: OptionSectionKey;
  setConfig: (value: CreateUiConfig) => void;
}) {
  function updateItem(patch: Partial<OptionConfig>) {
    const items = config[moduleKey] as OptionConfig[];
    setConfig({
      ...config,
      [moduleKey]: items.map((current) =>
        current.id === item.id ? { ...current, ...patch } : current,
      ),
    } as CreateUiConfig);
  }

  return (
    <>
      <ReadOnlyField label="ID" value={item.id} />
      <ToggleField
        checked={item.active}
        label="启用选项"
        onChange={(active) => updateItem({ active })}
      />
      <TextInput label="显示名称" value={item.label} onChange={(label) => updateItem({ label })} />
      <TextInput
        label="排序"
        type="number"
        value={String(item.sortOrder)}
        onChange={(value) => updateItem({ sortOrder: Number(value) || 0 })}
      />
      <label className="block">
        <span className="mb-1 block text-[11px] font-black text-slate-500 dark:text-slate-400">
          提示词注入规则
        </span>
        <textarea
          value={item.promptHint ?? ""}
          onChange={(event) => updateItem({ promptHint: event.target.value || undefined })}
          className="theme-textarea min-h-[160px] w-full resize-y rounded-lg px-3 py-2 text-sm"
          rows={7}
        />
      </label>
    </>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-black text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm font-black text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
        {value}
      </div>
    </label>
  );
}

function ToggleField({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
      <span className="text-sm font-black text-slate-700 dark:text-slate-200">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/50 dark:border-white/20 dark:bg-white/10"
      />
    </label>
  );
}

type TextInputProps = {
  label: string;
  onChange: (value: string) => void;
  type?: "number" | "text";
  value: string;
};

function TextInput({ label, onChange, type = "text", value }: TextInputProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-black text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="theme-input h-9 w-full rounded-lg px-3 text-sm font-semibold"
      />
    </label>
  );
}

function getUsageHint(config: CreateUiConfig, moduleKey: ConfigModuleKey, id: string) {
  if (moduleKey !== "genres") return "";
  if (config.platforms.some((item) => item.id === id)) return "平台同名";
  return "";
}

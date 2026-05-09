import { Trash2 } from "lucide-react";

import type { ConfigModuleKey } from "@/components/admin/admin-config-model";
import { parseTags, stringifyTags } from "@/lib/admin/dashboard-admin-format";
import type {
  CreateUiConfig,
  GenreConfig,
  OptionConfig,
  OptionSectionKey,
} from "@/lib/admin/dashboard-admin-types";
import { cn } from "@/lib/utils";

type EditDrawerProps = {
  config: CreateUiConfig;
  moduleKey: ConfigModuleKey;
  onDelete: (id: string) => void;
  selectedItem: GenreConfig | OptionConfig | null;
  setConfig: (value: CreateUiConfig) => void;
};

export function EditDrawer({
  config,
  moduleKey,
  onDelete,
  selectedItem,
  setConfig,
}: EditDrawerProps) {
  if (!selectedItem) {
    return (
      <aside className="flex min-h-[320px] items-center justify-center bg-stone-50/60 p-6 text-sm font-bold text-stone-500 dark:bg-white/[0.02]">
        选择左侧列表项后在这里编辑
      </aside>
    );
  }

  const isGenre = moduleKey === "genres";

  return (
    <aside className="bg-stone-50/70 dark:bg-white/[0.02]">
      <div className="sticky top-20">
        <div className="border-b border-stone-100 px-4 py-3 dark:border-white/10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">
                Edit Drawer
              </div>
              <h3 className="mt-1 truncate text-lg font-extrabold text-stone-950 dark:text-stone-50">
                {isGenre
                  ? (selectedItem as GenreConfig).name
                  : (selectedItem as OptionConfig).label}
              </h3>
              <p className="mt-0.5 truncate font-mono text-xs font-bold text-stone-500 dark:text-stone-400">
                {selectedItem.id}
              </p>
            </div>
            <span
              className={cn(
                "rounded-md border px-2 py-1 text-xs font-semibold",
                selectedItem.active
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-200"
                  : "border-stone-200 bg-white text-stone-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-400",
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
            onClick={() => {
              if (window.confirm("确定要删除该配置项吗？")) onDelete(selectedItem.id);
            }}
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 text-sm font-semibold text-red-600 transition hover:bg-red-100 dark:border-red-300/20 dark:bg-red-400/10 dark:text-red-200"
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
      genres: config.genres.map((item) =>
        item.id === genre.id ? { ...item, ...patch } : item,
      ),
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
        <span className="mb-1 block text-[11px] font-bold text-stone-500 dark:text-stone-400">
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
      <span className="mb-1 block text-[11px] font-bold text-stone-500 dark:text-stone-400">
        {label}
      </span>
      <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 font-mono text-sm font-medium text-stone-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-300">
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
    <label className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
      <span className="text-sm font-bold text-stone-700 dark:text-stone-200">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500/50 dark:border-white/20 dark:bg-white/10"
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
      <span className="mb-1 block text-[11px] font-bold text-stone-500 dark:text-stone-400">
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

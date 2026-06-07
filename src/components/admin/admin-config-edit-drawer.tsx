import { Trash2 } from "lucide-react";

import { Button, RightInspector } from "@/components/design-system";
import {
  AdminEmptyStateCard,
  AdminFormGroup,
  AdminStatusPill,
} from "@/components/admin/admin-console-primitives";
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
      <RightInspector className="xl:sticky xl:top-[92px] xl:max-h-[calc(100dvh-124px)]" title="编辑抽屉">
        <AdminEmptyStateCard
          title="先从中栏选择一个配置项"
          description="选中后，这里会切换成分组表单，支持修改名称、状态、样式和危险操作。"
        />
      </RightInspector>
    );
  }

  const isGenre = moduleKey === "genres";

  return (
    <RightInspector
      className="xl:sticky xl:top-[92px] xl:max-h-[calc(100dvh-124px)]"
      title="编辑抽屉"
    >
      <div className="space-y-4">
        <div className="rounded-[22px] border border-[var(--theme-border)] bg-[rgba(255,255,255,0.94)] p-4 shadow-[var(--theme-shadow-card)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">
                当前选中
              </p>
              <h3 className="mt-2 truncate text-lg font-black text-[var(--theme-text-strong)]">
                {isGenre ? (selectedItem as GenreConfig).name : (selectedItem as OptionConfig).label}
              </h3>
              <p className="mt-1 truncate font-mono text-xs font-bold text-[var(--theme-text-muted)]">
                {selectedItem.id}
              </p>
            </div>
            <AdminStatusPill tone={selectedItem.active ? "success" : "neutral"}>
              {selectedItem.active ? "启用中" : "已停用"}
            </AdminStatusPill>
          </div>
        </div>

        {isGenre ? (
          <GenreEditor config={config} genre={selectedItem as GenreConfig} setConfig={setConfig} />
        ) : (
          <OptionEditor
            config={config}
            item={selectedItem as OptionConfig}
            moduleKey={moduleKey as OptionSectionKey}
            setConfig={setConfig}
          />
        )}

        <AdminFormGroup
          title="危险操作"
          description="删除会立即把当前配置项从创建页可选入口中移除，请确认无误后再执行。"
          danger
        >
          <Button
            type="button"
            tone="danger"
            icon={Trash2}
            onClick={() => {
              if (window.confirm("确定要删除当前配置项吗？")) onDelete(selectedItem.id);
            }}
            className="w-full justify-center"
          >
            删除当前项
          </Button>
        </AdminFormGroup>
      </div>
    </RightInspector>
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
      <AdminFormGroup
        title="基础信息"
        description="决定创建页上展示的名称、图标、标签与是否启用。"
      >
        <ReadOnlyField label="ID" value={genre.id} />
        <ToggleField
          checked={genre.active}
          label="启用类型"
          description="关闭后，这个题材不会在创建页入口中展示。"
          onChange={(active) => updateGenre({ active })}
        />
        <TextInput
          label="显示名称"
          description="用于创建页卡片标题和题材显示。"
          value={genre.name}
          onChange={(name) => updateGenre({ name })}
        />
        <TextInput
          label="图标"
          description="建议使用单个字符或 Emoji，保持入口列表可识别。"
          value={genre.icon}
          onChange={(icon) => updateGenre({ icon })}
        />
        <TextInput
          label="标签"
          description="用逗号、顿号或空格分隔，最多保留 12 个标签。"
          value={stringifyTags(genre.tags)}
          onChange={(value) => updateGenre({ tags: parseTags(value) })}
        />
      </AdminFormGroup>

      <AdminFormGroup
        title="视觉样式"
        description="控制题材卡片的渐变样式与默认排序。"
      >
        <TextInput
          label="渐变样式"
          description="用于题材卡片背景，保持浅色高辨识度即可。"
          value={genre.gradient}
          onChange={(gradient) => updateGenre({ gradient })}
        />
        <TextInput
          label="排序"
          description="数值越小越靠前。"
          type="number"
          value={String(genre.sortOrder)}
          onChange={(value) => updateGenre({ sortOrder: Number(value) || 0 })}
        />
      </AdminFormGroup>
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
    const items = config[moduleKey];
    setConfig({
      ...config,
      [moduleKey]: items.map((current) => (current.id === item.id ? { ...current, ...patch } : current)),
    });
  }

  return (
    <>
      <AdminFormGroup
        title="基础信息"
        description="维护入口名称与启用状态，确保创建页中栏列表保持可读。"
      >
        <ReadOnlyField label="ID" value={item.id} />
        <ToggleField
          checked={item.active}
          label="启用选项"
          description="关闭后，这个选项会从对应模块中隐藏。"
          onChange={(active) => updateItem({ active })}
        />
        <TextInput
          label="显示名称"
          description="用于当前模块列表和创建页实际展示。"
          value={item.label}
          onChange={(label) => updateItem({ label })}
        />
      </AdminFormGroup>

      <AdminFormGroup
        title="视觉样式"
        description="主要控制顺序，让创建页入口排列更自然。"
      >
        <TextInput
          label="排序"
          description="数值越小越靠前。"
          type="number"
          value={String(item.sortOrder)}
          onChange={(value) => updateItem({ sortOrder: Number(value) || 0 })}
        />
      </AdminFormGroup>

      <AdminFormGroup
        title="注入规则"
        description="用于写作提示词注入的补充说明，留空时按默认策略处理。"
      >
        <TextAreaField
          label="提示词注入规则"
          description="建议写清适用场景、风格或约束，便于后续维护。"
          value={item.promptHint ?? ""}
          onChange={(value) => updateItem({ promptHint: value || undefined })}
        />
      </AdminFormGroup>
    </>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <FieldLabel label={label} />
      <div className="rounded-[16px] border border-[var(--theme-border)] bg-[rgba(246,251,254,0.96)] px-4 py-3 font-mono text-sm font-semibold text-[var(--theme-text-secondary)]">
        {value}
      </div>
    </div>
  );
}

function ToggleField({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-3 rounded-[18px] border border-[var(--theme-border)] bg-[rgba(246,251,254,0.96)] px-4 py-3">
      <span className="min-w-0">
        <span className="block text-sm font-black text-[var(--theme-text-strong)]">{label}</span>
        <span className="mt-1 block text-[13px] font-medium leading-6 text-[var(--theme-text-muted)]">
          {description}
        </span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 rounded border-[var(--theme-border)] text-[var(--theme-brand-text)] focus:ring-[var(--theme-brand-500)]/50"
      />
    </label>
  );
}

type TextInputProps = {
  description: string;
  label: string;
  onChange: (value: string) => void;
  type?: "number" | "text";
  value: string;
};

function TextInput({ description, label, onChange, type = "text", value }: TextInputProps) {
  return (
    <label className="block space-y-2">
      <FieldLabel description={description} label={label} />
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="theme-input h-11 w-full rounded-[16px] px-4 text-sm font-semibold"
      />
    </label>
  );
}

function TextAreaField({
  description,
  label,
  onChange,
  value,
}: {
  description: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block space-y-2">
      <FieldLabel description={description} label={label} />
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn("theme-textarea min-h-[180px] w-full resize-y rounded-[16px] px-4 py-3 text-sm leading-7")}
        rows={8}
      />
    </label>
  );
}

function FieldLabel({
  description,
  label,
}: {
  description?: string;
  label: string;
}) {
  return (
    <span className="block">
      <span className="block text-[12px] font-black text-[var(--theme-text-strong)]">{label}</span>
      {description ? (
        <span className="mt-1 block text-[12px] font-medium leading-5 text-[var(--theme-text-muted)]">
          {description}
        </span>
      ) : null}
    </span>
  );
}

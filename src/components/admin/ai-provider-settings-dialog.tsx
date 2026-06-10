"use client";

import {
  AlertCircle,
  ChevronDown,
  CheckCircle2,
  DatabaseZap,
  KeyRound,
  Loader2,
  PlugZap,
  RefreshCw,
  Save,
  Settings2,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import {
  adminInputClassName,
  adminPanelClassName,
  adminPrimaryButtonClassName,
  adminSecondaryButtonClassName,
} from "@/components/admin/admin-page-shell";
import type {
  AiProviderFallbackPolicy,
  AiProviderLineId,
  AiProviderLineSetting,
  AiProviderSettings,
  AiProviderType,
  ProviderProtocol,
} from "@/lib/admin/ai-provider-settings-types";
import { apiRequest } from "@/lib/client/auth-api";
import { cn } from "@/lib/utils";

type AiProviderSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type EditableLine = AiProviderLineSetting & {
  apiKeyInput: string;
  modelOptionsText: string;
};

type EditableSettings = {
  version: 2;
  primary: EditableLine;
  backup: EditableLine;
  fallbackPolicy: AiProviderFallbackPolicy;
};

type AiProviderTestResult = {
  ok: boolean;
  status: number;
  durationMs: number;
  providerType: string;
  modelUsed?: string;
  modelOptions?: string[];
  modelOptionsMessage?: string;
  textPreview?: string;
  message?: string;
};

type AiProviderModelsResult = {
  modelOptions: string[];
  message?: string;
};

type ProviderTestState = {
  status: "idle" | "testing" | "success" | "error";
  message?: string;
  statusCode?: number;
  durationMs?: number;
  modelOptionsCount?: number;
  modelOptionsMessage?: string;
  textPreview?: string;
};

type ModelFetchState = {
  status: "idle" | "loading" | "success" | "error";
  message?: string;
  count?: number;
};

type SettingsNotice = {
  tone: "success" | "error" | "info";
  text: string;
};

type LineSavePayload = Omit<
  AiProviderLineSetting,
  "apiKeyEncrypted" | "apiKeyPreview" | "hasApiKey" | "modelOptions"
> & {
  apiKey?: string;
  modelOptions: string[];
};

const DEFAULT_TEST_STATE: ProviderTestState = { status: "idle" };
const DEFAULT_MODEL_FETCH_STATE: ModelFetchState = { status: "idle" };
const MODEL_OPTIONS_LIMIT = 40;

const DEFAULT_FALLBACK_POLICY: AiProviderFallbackPolicy = {
  enabled: true,
  timeoutMs: 30_000,
  maxRetries: 1,
  useBackupOnStatus: [408, 429, 500, 502, 503, 504],
};

function getProviderDefaults(
  providerType: AiProviderType,
  lineId: AiProviderLineId,
): Pick<
  EditableLine,
  "anthropicVersion" | "baseUrl" | "label" | "model" | "modelOptions" | "modelOptionsText" | "protocol"
> {
  if (providerType === "anthropic") {
    return {
      label: "Anthropic",
      baseUrl: "https://api.anthropic.com",
      model: "claude-sonnet-4-20250514",
      modelOptions: ["claude-sonnet-4-20250514"],
      modelOptionsText: "claude-sonnet-4-20250514",
      protocol: "anthropic_messages",
      anthropicVersion: "2023-06-01",
    };
  }

  return {
    label: lineId === "primary" ? "OpenAI 兼容接口" : "备用 OpenAI 兼容接口",
    baseUrl: "https://api.openai.com",
    model: "gpt-5.4",
    modelOptions: ["gpt-5.4", "gpt-5.2", "gpt-5.4-mini"],
    modelOptionsText: "gpt-5.4, gpt-5.2, gpt-5.4-mini",
    protocol: "openai_responses",
    anthropicVersion: undefined,
  };
}

function createDefaultLine(lineId: AiProviderLineId): EditableLine {
  const providerType: AiProviderType = lineId === "primary" ? "openai_compatible" : "anthropic";
  const defaults = getProviderDefaults(providerType, lineId);
  return {
    id: lineId,
    enabled: false,
    providerType,
    label: defaults.label,
    baseUrl: defaults.baseUrl,
    apiKeyInput: "",
    model: defaults.model,
    modelOptions: defaults.modelOptions,
    modelOptionsText: defaults.modelOptionsText,
    protocol: defaults.protocol,
    hasApiKey: false,
    ...(defaults.anthropicVersion ? { anthropicVersion: defaults.anthropicVersion } : {}),
  };
}

function toEditableLine(line: AiProviderLineSetting): EditableLine {
  return {
    ...line,
    apiKeyInput: "",
    modelOptionsText: line.modelOptions.join(", "),
  };
}

function toEditableSettings(settings: AiProviderSettings): EditableSettings {
  return {
    version: 2,
    primary: toEditableLine(settings.primary),
    backup: toEditableLine(settings.backup),
    fallbackPolicy: settings.fallbackPolicy,
  };
}

function getEmptySettings(): EditableSettings {
  return {
    version: 2,
    primary: createDefaultLine("primary"),
    backup: createDefaultLine("backup"),
    fallbackPolicy: DEFAULT_FALLBACK_POLICY,
  };
}

function getDefaultModelFetchStates(): Record<AiProviderLineId, ModelFetchState> {
  return {
    primary: DEFAULT_MODEL_FETCH_STATE,
    backup: DEFAULT_MODEL_FETCH_STATE,
  };
}

function parseModelOptions(value: string, model: string) {
  const options = value
    .split(/[,\n;|]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
  return Array.from(new Set([model.trim(), ...options].filter(Boolean))).slice(
    0,
    MODEL_OPTIONS_LIMIT,
  );
}

function mergeModelOptions(model: string, modelOptionsText: string, upstreamModels: string[]) {
  return Array.from(
    new Set(
      [
        model.trim(),
        ...upstreamModels.map((item) => item.trim()),
        ...parseModelOptions(modelOptionsText, model),
      ].filter(Boolean),
    ),
  ).slice(0, MODEL_OPTIONS_LIMIT);
}

function formatModelOptionsText(modelOptions: string[]) {
  return modelOptions.join(", ");
}

function normalizeProtocol(providerType: AiProviderType): ProviderProtocol {
  if (providerType === "anthropic") return "anthropic_messages";
  return "openai_responses";
}

function toSaveLine(line: EditableLine): LineSavePayload {
  const apiKey = line.apiKeyInput.trim();
  const protocol = normalizeProtocol(line.providerType);
  return {
    id: line.id,
    enabled: line.enabled,
    providerType: line.providerType,
    protocol,
    label: line.label.trim(),
    baseUrl: line.baseUrl.trim(),
    model: line.model.trim(),
    modelOptions: parseModelOptions(line.modelOptionsText, line.model),
    ...(line.providerType === "anthropic"
      ? { anthropicVersion: line.anthropicVersion?.trim() || "2023-06-01" }
      : {}),
    ...(apiKey ? { apiKey } : {}),
  };
}

function getProviderTypeLabel(providerType: AiProviderType) {
  if (providerType === "anthropic") return "Anthropic Messages";
  return "OpenAI 兼容接口";
}

function getLineTitle(lineId: AiProviderLineId) {
  return lineId === "primary" ? "主用线路" : "备用线路";
}

function getLineDescription(lineId: AiProviderLineId) {
  return lineId === "primary"
    ? "主用线路用于正常 AI 请求。"
    : "备用线路会在主用线路失败、超时、限流或熔断时自动接管。";
}

function getStatusHint(status?: number) {
  if (!status) return "等待测试";
  if (status === 401) return "API Key 无效";
  if (status === 403) return "权限不足";
  if (status === 404) return "模型不存在";
  if (status === 408) return "请求超时";
  if (status === 429) return "上游限流";
  if (status >= 500) return "上游服务异常";
  if (status >= 400) return "请求被上游拒绝";
  return "返回 OK";
}

function getSavedKeyText(line: EditableLine) {
  if (!line.hasApiKey) return "尚未保存 API 密钥";
  return `已保存 ${line.apiKeyPreview ?? "sk-****"}`;
}

export function AiProviderSettingsDialog({
  open,
  onOpenChange,
}: AiProviderSettingsDialogProps) {
  const [settings, setSettings] = useState<EditableSettings>(() => getEmptySettings());
  const [selectedLineId, setSelectedLineId] = useState<AiProviderLineId>("primary");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<SettingsNotice | null>(null);
  const [testStates, setTestStates] = useState<Record<AiProviderLineId, ProviderTestState>>({
    primary: DEFAULT_TEST_STATE,
    backup: DEFAULT_TEST_STATE,
  });
  const [modelFetchStates, setModelFetchStates] =
    useState<Record<AiProviderLineId, ModelFetchState>>(() => getDefaultModelFetchStates());
  const [editingKeys, setEditingKeys] = useState<Record<AiProviderLineId, boolean>>({
    primary: false,
    backup: false,
  });

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) {
        onOpenChange(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange, open, saving]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function loadSettings() {
      setLoading(true);
      setNotice(null);
      const res = await apiRequest<{ settings: AiProviderSettings }>(
        "/api/admin/ai-provider-settings",
      );
      if (cancelled) return;

      if (res.success && res.data?.settings) {
        setSettings(toEditableSettings(res.data.settings));
        setTestStates({ primary: DEFAULT_TEST_STATE, backup: DEFAULT_TEST_STATE });
        setModelFetchStates(getDefaultModelFetchStates());
        setEditingKeys({ primary: false, backup: false });
        setSelectedLineId("primary");
      } else {
        setNotice({
          tone: "error",
          text: res.message || "AI 配置加载失败。",
        });
      }
      setLoading(false);
    }

    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const selectedLine = settings[selectedLineId];

  function updateLine(
    lineId: AiProviderLineId,
    updater: (line: EditableLine) => EditableLine,
  ) {
    setSettings((current) => ({
      ...current,
      [lineId]: updater(current[lineId]),
    }));
  }

  function handleProviderTypeChange(lineId: AiProviderLineId, providerType: AiProviderType) {
    updateLine(lineId, (line) => {
      const defaults = getProviderDefaults(providerType, lineId);
      return {
        ...line,
        providerType,
        label: defaults.label,
        baseUrl: defaults.baseUrl,
        model: defaults.model,
        modelOptions: defaults.modelOptions,
        modelOptionsText: defaults.modelOptionsText,
        protocol: defaults.protocol,
        anthropicVersion: defaults.anthropicVersion,
      };
    });
    setTestStates((current) => ({ ...current, [lineId]: DEFAULT_TEST_STATE }));
    setModelFetchStates((current) => ({ ...current, [lineId]: DEFAULT_MODEL_FETCH_STATE }));
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setNotice(null);

    const payload = {
      version: 2 as const,
      primary: toSaveLine(settings.primary),
      backup: toSaveLine(settings.backup),
      fallbackPolicy: settings.fallbackPolicy,
    };
    const res = await apiRequest<{ settings: AiProviderSettings }>(
      "/api/admin/ai-provider-settings",
      { settings: payload },
      { method: "PUT" },
    );

    if (res.success && res.data?.settings) {
      setSettings(toEditableSettings(res.data.settings));
      setEditingKeys({ primary: false, backup: false });
      setNotice({
        tone: "success",
        text: "保存成功，新的 AI 请求会立即按该配置生效。",
      });
    } else {
      setNotice({
        tone: "error",
        text: res.message || "保存失败，请检查配置。",
      });
    }
    setSaving(false);
  }

  async function handleFetchModels(line: EditableLine) {
    const payload = toSaveLine(line);
    setNotice(null);
    setModelFetchStates((current) => ({
      ...current,
      [line.id]: { status: "loading", message: "正在获取模型..." },
    }));

    const res = await apiRequest<AiProviderModelsResult>(
      "/api/admin/ai-provider-settings/models",
      { provider: payload },
      { method: "POST" },
    );

    if (res.success && res.data) {
      const responseData = res.data;
      const upstreamModels = responseData.modelOptions;
      updateLine(line.id, (current) => {
        const modelOptions = mergeModelOptions(
          current.model,
          current.modelOptionsText,
          upstreamModels,
        );
        return {
          ...current,
          model: current.model.trim() || modelOptions[0] || "",
          modelOptions,
          modelOptionsText: formatModelOptionsText(modelOptions),
        };
      });

      const message = `已获取 ${upstreamModels.length} 个模型，默认模型和可选模型已更新。`;
      setModelFetchStates((current) => ({
        ...current,
        [line.id]: {
          status: "success",
          count: upstreamModels.length,
          message: responseData.message || res.message || message,
        },
      }));
      setNotice({ tone: "success", text: message });
      return;
    }

    const message = res.message || "模型列表获取失败，请检查接口地址和 API Key。";
    setModelFetchStates((current) => ({
      ...current,
      [line.id]: { status: "error", message },
    }));
    setNotice({ tone: "error", text: message });
  }

  async function handleTest(line: EditableLine) {
    const payload = toSaveLine(line);
    setTestStates((current) => ({
      ...current,
      [line.id]: { status: "testing", message: "测试中..." },
    }));
    const res = await apiRequest<AiProviderTestResult>(
      "/api/admin/ai-provider-settings/test",
      { provider: payload },
      { method: "POST" },
    );

    if (res.success && res.data) {
      const result = res.data;
      const upstreamModels = result.modelOptions ?? [];

      if (result.ok && upstreamModels.length) {
        updateLine(line.id, (current) => {
          const modelOptions = mergeModelOptions(
            current.model,
            current.modelOptionsText,
            upstreamModels,
          );
          return {
            ...current,
            model: current.model.trim() || modelOptions[0] || "",
            modelOptions,
            modelOptionsText: formatModelOptionsText(modelOptions),
          };
        });
      }

      setTestStates((current) => ({
        ...current,
        [line.id]: {
          status: result.ok ? "success" : "error",
          message: result.message || getStatusHint(result.status),
          statusCode: result.status,
          durationMs: result.durationMs,
          modelOptionsCount: upstreamModels.length,
          modelOptionsMessage: result.modelOptionsMessage,
          textPreview: result.textPreview,
        },
      }));
      return;
    }

    setTestStates((current) => ({
      ...current,
      [line.id]: {
        status: "error",
        statusCode: res.status,
        message: res.message || getStatusHint(res.status),
      },
    }));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center px-3 py-4 sm:px-6">
      <button
        type="button"
        aria-label="关闭 AI 配置弹窗"
        className="absolute inset-0 bg-[#111827]/40 backdrop-blur-[8px]"
        onClick={() => {
          if (!saving) onOpenChange(false);
        }}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-provider-settings-title"
        className={cn(
          adminPanelClassName,
          "relative z-10 flex max-h-[calc(100dvh-36px)] w-full max-w-[960px] flex-col overflow-hidden rounded-[18px] border-white/75 bg-white/95 shadow-[0_28px_80px_rgba(15,23,42,0.22)] backdrop-blur-xl",
        )}
      >
        <header className="shrink-0 border-b border-[#dbe7f4] bg-[linear-gradient(180deg,#ffffff,#f8fbff)] px-5 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-[#dbe7f4] bg-[#eef5ff] text-[#1f74ff] shadow-[0_8px_18px_rgba(31,116,255,0.12)]">
                  <Settings2 className="h-4.5 w-4.5" />
                </span>
                <h2
                  id="ai-provider-settings-title"
                  className="text-2xl font-black tracking-tight text-[#101a34]"
                >
                  AI 配置
                </h2>
              </div>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-5 text-[#536889]">
                配置 OpenAI-compatible 和 Anthropic 上游，API Key 会加密保存，前端不会显示明文
              </p>
            </div>
            <button
              type="button"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-[#d9e6f5] bg-white text-[#536889] shadow-[0_8px_18px_rgba(31,87,140,0.06)] transition hover:bg-[#f7fbff] hover:text-[#14213d]"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,#f8fbff,#ffffff)] px-5 py-5 sm:px-7">
          {notice ? <InlineNotice tone={notice.tone}>{notice.text}</InlineNotice> : null}

          <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <LineSidebar
              selectedLineId={selectedLineId}
              settings={settings}
              onSelect={setSelectedLineId}
            />

            <section className="min-w-0 overflow-hidden rounded-[16px] border border-[#dbe7f4] bg-white/95 shadow-[0_18px_40px_rgba(31,87,140,0.07)]">
              {loading ? (
                <div className="flex min-h-80 items-center justify-center gap-2 text-sm font-black text-[#536889]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在加载 AI 配置...
                </div>
              ) : (
                <LineConfigPanel
                  editingKey={editingKeys[selectedLineId]}
                  line={selectedLine}
                  modelFetchState={
                    modelFetchStates[selectedLineId] ?? DEFAULT_MODEL_FETCH_STATE
                  }
                  testState={testStates[selectedLineId] ?? DEFAULT_TEST_STATE}
                  onProviderTypeChange={(providerType) =>
                    handleProviderTypeChange(selectedLineId, providerType)
                  }
                  onChange={(updater) => updateLine(selectedLineId, updater)}
                  onEditKey={(editing) =>
                    setEditingKeys((current) => ({ ...current, [selectedLineId]: editing }))
                  }
                  onFetchModels={() => void handleFetchModels(selectedLine)}
                  onTest={() => void handleTest(selectedLine)}
                />
              )}
            </section>
          </div>
        </div>

        <footer className="flex shrink-0 flex-col gap-2 border-t border-[#dbe7f4] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <FooterNotice notice={notice} />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className={cn(adminSecondaryButtonClassName, "inline-flex items-center gap-2 rounded-[10px]")}
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              取消
            </button>
            <button
              type="button"
              className={cn(adminPrimaryButtonClassName, "inline-flex items-center gap-2 rounded-[10px]")}
              onClick={() => void handleSave()}
              disabled={saving || loading}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "保存中..." : "保存配置"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function LineSidebar({
  onSelect,
  selectedLineId,
  settings,
}: {
  onSelect: (lineId: AiProviderLineId) => void;
  selectedLineId: AiProviderLineId;
  settings: EditableSettings;
}) {
  return (
    <aside className="min-w-0 rounded-[16px] border border-[#dbe7f4] bg-white/92 p-3 shadow-[0_16px_32px_rgba(31,87,140,0.06)]">
      <p className="px-1 text-xs font-black tracking-wide text-[#4c6387]">线路</p>
      <div className="mt-3 grid gap-2">
        {(["primary", "backup"] as const).map((lineId) => {
          const line = settings[lineId];
          const selected = selectedLineId === lineId;
          return (
            <button
              key={lineId}
              type="button"
              onClick={() => onSelect(lineId)}
              className={cn(
                "w-full min-w-0 overflow-hidden rounded-[14px] border px-3 py-3 text-left transition duration-200",
                selected
                  ? "border-[#7aa7ff] bg-[linear-gradient(135deg,#eef5ff,#f8fbff)] shadow-[0_12px_24px_rgba(31,116,255,0.12)]"
                  : "border-[#edf3fb] bg-white hover:-translate-y-0.5 hover:border-[#d9e6f5] hover:bg-[#f7fbff]",
              )}
            >
              <span className="block truncate text-sm font-black text-[#101a34]">
                {getLineTitle(lineId)}
              </span>
              <span className="mt-1 block max-w-full truncate text-xs font-bold text-[#536889]">
                {getProviderTypeLabel(line.providerType)} · {line.model || "未设置模型"}
              </span>
              <span
                className={cn(
                  "mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-black",
                  line.enabled
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-[#eef3f8] text-[#6b7d98]",
                )}
              >
                {line.enabled ? "已启用" : "未启用"}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function LineConfigPanel({
  editingKey,
  line,
  modelFetchState,
  testState,
  onChange,
  onEditKey,
  onFetchModels,
  onProviderTypeChange,
  onTest,
}: {
  editingKey: boolean;
  line: EditableLine;
  modelFetchState: ModelFetchState;
  testState: ProviderTestState;
  onChange: (updater: (line: EditableLine) => EditableLine) => void;
  onEditKey: (editing: boolean) => void;
  onFetchModels: () => void;
  onProviderTypeChange: (providerType: AiProviderType) => void;
  onTest: () => void;
}) {
  const isAnthropic = line.providerType === "anthropic";
  const modelFetchText = getModelFetchText(modelFetchState);
  const modelFetchTone =
    modelFetchState.status === "error"
      ? "error"
      : modelFetchState.status === "success"
        ? "success"
        : "muted";

  return (
    <div className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 border-b border-[#edf3fb] pb-4">
        <div className="min-w-0">
          <h3 className="text-lg font-black text-[#101a34]">
            {getLineTitle(line.id)}配置
          </h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-[#536889]">
            {getLineDescription(line.id)}
          </p>
        </div>
        <Switch
          checked={line.enabled}
          label="启用线路"
          onChange={(checked) => onChange((current) => ({ ...current, enabled: checked }))}
        />
      </div>

      <div className="mt-5 grid gap-4">
        <ProviderTypeSegment
          value={line.providerType}
          onChange={onProviderTypeChange}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="显示名称"
            value={line.label}
            onChange={(value) => onChange((current) => ({ ...current, label: value }))}
          />
          <ModelSelectField
            id={`ai-provider-${line.id}-model`}
            action={
              <FetchModelsButton
                modelFetchState={modelFetchState}
                onClick={onFetchModels}
              />
            }
            label="默认模型"
            options={parseModelOptions(line.modelOptionsText, line.model)}
            statusText={modelFetchText}
            statusTone={modelFetchTone}
            value={line.model}
            onChange={(value) => onChange((current) => ({ ...current, model: value }))}
          />
        </div>

        <TextField
          label="接口地址"
          value={line.baseUrl}
          onChange={(value) => onChange((current) => ({ ...current, baseUrl: value }))}
        />

        <ApiKeyField
          editing={editingKey}
          line={line}
          onEditKey={onEditKey}
          onChange={(value) => onChange((current) => ({ ...current, apiKeyInput: value }))}
        />

        <TextField
          label="可选模型"
          hint="逗号分隔"
          value={line.modelOptionsText}
          onChange={(value) =>
            onChange((current) => ({ ...current, modelOptionsText: value }))
          }
        />

        {isAnthropic ? (
          <TextField
            label="Anthropic-Version"
            value={line.anthropicVersion ?? "2023-06-01"}
            onChange={(value) =>
              onChange((current) => ({
                ...current,
                anthropicVersion: value,
                protocol: "anthropic_messages",
              }))
            }
          />
        ) : (
          <FixedProtocolField />
        )}
      </div>

      <TestConnectionPanel
        testState={testState}
        onTest={onTest}
      />
    </div>
  );
}

function ProviderTypeSegment({
  onChange,
  value,
}: {
  onChange: (providerType: AiProviderType) => void;
  value: AiProviderType;
}) {
  const items: Array<{ id: AiProviderType; label: string }> = [
    { id: "openai_compatible", label: "OpenAI 兼容接口" },
    { id: "anthropic", label: "Anthropic Messages" },
  ];

  return (
    <div className="grid gap-1.5 text-xs font-black text-[#425a7d]">
      <span>接口类型</span>
      <div className="grid gap-1 rounded-[12px] border border-[#d9e6f5] bg-[#f8fbff] p-1 sm:grid-cols-2">
        {items.map((item) => {
          const active = value === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={cn(
                "h-9 rounded-[9px] px-2 text-xs font-black transition",
                active
                  ? "bg-white text-[#1f74ff] shadow-[0_6px_14px_rgba(31,87,140,0.08)]"
                  : "text-[#536889] hover:bg-white/70 hover:text-[#14213d]",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Switch({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex shrink-0 items-center gap-2 text-xs font-black text-[#425a7d]"
    >
      <span
        className={cn(
          "relative h-6 w-11 rounded-full border transition",
          checked ? "border-emerald-400 bg-emerald-500" : "border-[#cbd8e8] bg-[#e9eff7]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition",
            checked ? "left-[21px]" : "left-0.5",
          )}
        />
      </span>
      {label}
    </button>
  );
}

function ApiKeyField({
  editing,
  line,
  onChange,
  onEditKey,
}: {
  editing: boolean;
  line: EditableLine;
  onChange: (value: string) => void;
  onEditKey: (editing: boolean) => void;
}) {
  return (
    <div className="grid gap-1.5 text-xs font-black text-[#425a7d]">
      <div className="flex items-center justify-between gap-2">
        <span>API 密钥</span>
        <button
          type="button"
          className="text-xs font-black text-[#1f74ff] hover:text-[#145ee7]"
          onClick={() => onEditKey(!editing)}
        >
          {editing ? "收起" : "替换密钥"}
        </button>
      </div>
      <div className="flex min-h-10 items-center justify-between gap-3 rounded-[10px] border border-[#d9e6f5] bg-[#f8fbff] px-3 text-sm font-bold text-[#536889]">
        <span className="truncate">{getSavedKeyText(line)}</span>
        <KeyRound className="h-4 w-4 shrink-0 text-[#8090aa]" />
      </div>
      {editing ? (
        <input
          type="password"
          value={line.apiKeyInput}
          placeholder="输入新的 API Key，留空则不修改"
          onChange={(event) => onChange(event.target.value)}
          className={cn(adminInputClassName, "h-10 w-full rounded-[10px] border px-3")}
        />
      ) : null}
    </div>
  );
}

function getModelFetchText(modelFetchState: ModelFetchState) {
  if (modelFetchState.status === "loading") return "正在从上游读取模型...";
  if (modelFetchState.status === "success") {
    return modelFetchState.message || `已获取 ${modelFetchState.count ?? 0} 个模型`;
  }
  if (modelFetchState.status === "error") {
    return modelFetchState.message || "模型列表获取失败";
  }
  return undefined;
}

function FetchModelsButton({
  modelFetchState,
  onClick,
}: {
  modelFetchState: ModelFetchState;
  onClick: () => void;
}) {
  const loading = modelFetchState.status === "loading";

  return (
    <button
      type="button"
      aria-label="获取上游模型列表"
      title="获取上游模型列表"
      className="inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-[8px] border border-[#b8cff0] bg-white px-2.5 text-[11px] font-black text-[#1f74ff] shadow-[0_6px_14px_rgba(31,87,140,0.06)] transition hover:bg-[#f7fbff] hover:text-[#145ee7] disabled:cursor-not-allowed disabled:opacity-60"
      onClick={onClick}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <RefreshCw className="h-3.5 w-3.5" />
      )}
      获取模型
    </button>
  );
}

function FixedProtocolField() {
  return (
    <div className="grid gap-1.5 text-xs font-black text-[#425a7d]">
      <span>调用方式</span>
      <div className="rounded-[12px] border border-[#d9e6f5] bg-[#f8fbff] p-1">
        <div className="flex h-9 items-center justify-center rounded-[9px] bg-white px-3 text-xs font-black text-[#1f74ff] shadow-[0_6px_14px_rgba(31,87,140,0.08)]">
          Responses API
        </div>
      </div>
    </div>
  );
}

function TestConnectionPanel({
  onTest,
  testState,
}: {
  onTest: () => void;
  testState: ProviderTestState;
}) {
  const testing = testState.status === "testing";
  const success = testState.status === "success";
  const failed = testState.status === "error";
  const modelSyncText =
    success && testState.modelOptionsCount
      ? `已同步 ${testState.modelOptionsCount} 个模型，可在默认模型中切换`
      : testState.modelOptionsMessage;
  const statusText = success
    ? `连接成功 · ${testState.durationMs ?? 0}ms · ${testState.textPreview ? `返回 ${testState.textPreview}` : "返回 OK"}`
    : failed
      ? `连接失败${testState.statusCode ? ` · ${testState.statusCode}` : ""} · ${testState.message ?? getStatusHint(testState.statusCode)}`
      : testState.message ?? "使用当前表单中的配置测试连接。";

  return (
    <div className="mt-5 rounded-[16px] border border-[#dbe7f4] bg-[linear-gradient(180deg,#f8fbff,#ffffff)] p-3 shadow-[0_12px_26px_rgba(31,87,140,0.06)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef5ff] text-[#1f74ff]">
            <DatabaseZap className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black text-[#101a34]">连接测试</p>
            <p className="mt-0.5 text-xs font-semibold text-[#536889]">
              测试当前配置能否正常连接到上游服务
            </p>
          </div>
        </div>
        <button
          type="button"
          className={cn(
            adminSecondaryButtonClassName,
            "inline-flex items-center justify-center gap-2 rounded-[10px] border-[#b8cff0] text-[#1f74ff]",
          )}
          onClick={onTest}
          disabled={testing}
        >
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
          {testing ? "测试中..." : "测试连接"}
        </button>
      </div>

      <div
        className={cn(
          "mt-3 flex items-start gap-2 rounded-[10px] border px-3 py-2 text-xs font-bold",
          success
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : failed
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-[#dbe7f4] bg-white text-[#536889]",
        )}
      >
        {testing ? (
          <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" />
        ) : success ? (
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        ) : failed ? (
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        ) : (
          <PlugZap className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        )}
        <span className="min-w-0 break-words">{statusText}</span>
      </div>

      {modelSyncText ? (
        <p className="mt-2 text-xs font-semibold leading-5 text-[#536889]">{modelSyncText}</p>
      ) : null}
    </div>
  );
}

function ModelSelectField({
  action,
  id,
  label,
  onChange,
  options,
  statusText,
  statusTone = "muted",
  value,
}: {
  action?: ReactNode;
  id: string;
  label: string;
  onChange: (value: string) => void;
  options: string[];
  statusText?: string;
  statusTone?: "success" | "error" | "muted";
  value: string;
}) {
  const selectOptions = Array.from(
    new Set([value.trim(), ...options.map((option) => option.trim())].filter(Boolean)),
  ).slice(0, MODEL_OPTIONS_LIMIT);
  const selectValue = selectOptions.includes(value.trim()) ? value.trim() : "";

  return (
    <div className="grid gap-1.5 text-xs font-black text-[#425a7d]">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <label htmlFor={id} className="min-w-0 truncate">
          {label}
        </label>
        {action}
      </div>
      <span className="relative block">
        <select
          id={id}
          value={selectValue}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            adminInputClassName,
            "h-10 w-full appearance-none rounded-[10px] border bg-white px-3 pr-10 outline-none",
          )}
        >
          {selectValue ? null : <option value="">请选择模型</option>}
          {selectOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7d98]" />
      </span>
      {statusText ? (
        <span
          className={cn(
            "min-w-0 break-words text-[11px] font-bold leading-4",
            statusTone === "success"
              ? "text-emerald-700"
              : statusTone === "error"
                ? "text-red-600"
                : "text-[#8090aa]",
          )}
        >
          {statusText}
        </span>
      ) : null}
    </div>
  );
}

function TextField({
  hint,
  label,
  onChange,
  placeholder,
  value,
}: {
  hint?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-black text-[#425a7d]">
      <span className="flex items-center justify-between gap-2">
        <span>{label}</span>
        {hint ? <span className="font-bold text-[#8090aa]">{hint}</span> : null}
      </span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cn(adminInputClassName, "h-10 w-full rounded-[10px] border px-3")}
      />
    </label>
  );
}

function FooterNotice({ notice }: { notice: SettingsNotice | null }) {
  if (!notice) {
    return (
      <p className="text-xs font-bold text-[#536889]">
        保存后立即影响新的 AI 请求，已运行任务不会被修改
      </p>
    );
  }

  const success = notice.tone === "success";
  return (
    <div
      aria-live="polite"
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-[10px] border px-3 py-2 text-xs font-black shadow-[0_10px_22px_rgba(31,87,140,0.06)]",
        success
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700",
      )}
      role={success ? "status" : "alert"}
    >
      {success ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0" />
      )}
      <span className="min-w-0 truncate">{notice.text}</span>
    </div>
  );
}

function InlineNotice({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "success" | "error" | "info";
}) {
  return (
    <div
      className={cn(
        "mb-3 flex items-start gap-2 rounded-[12px] border px-3 py-2 text-sm font-bold shadow-[0_10px_24px_rgba(31,87,140,0.05)]",
        tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : tone === "error"
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-[#dbe7f4] bg-white text-[#425a7d]",
      )}
    >
      {tone === "success" ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <span>{children}</span>
    </div>
  );
}

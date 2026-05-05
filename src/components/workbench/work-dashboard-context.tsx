"use client";

import type { ComponentType, Dispatch, ReactNode, SetStateAction } from "react";
import { Edit3, Loader2, MapPinned, RefreshCw, Route } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/client/auth-api";
import type { WorkDashboardController } from "@/lib/workbench/use-work-dashboard";

type ForeshadowingItem = {
  id: string;
  title: string | null;
  hint: string;
  payoff: string | null;
  status: string;
  importance: number;
  plantedChapter: number | null;
  resolvedChapter: number | null;
  updatedAt: string;
};

type SettingItem = {
  id: string;
  kind: string;
  name: string;
  desc: string;
  firstChapter: number | null;
  lastUpdatedChapter: number | null;
  updatedAt: string;
};

type TimelineItem = {
  id: string;
  title: string | null;
  description: string | null;
  summary: string;
  storyTime: string | null;
  chapterIndex: number | null;
  order: number;
  canonical: boolean;
  updatedAt: string;
};

type EditorState =
  | {
      kind: "foreshadowing";
      id: string;
      draft: Record<string, string>;
    }
  | {
      kind: "setting";
      id: string;
      draft: Record<string, string>;
    }
  | {
      kind: "timeline";
      id: string;
      draft: Record<string, string>;
    };

export function WorkDashboardContextPanel({ dashboard }: { dashboard: WorkDashboardController }) {
  const workId = dashboard.work?.id ?? "";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [foreshadowings, setForeshadowings] = useState<ForeshadowingItem[]>([]);
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [editor, setEditor] = useState<EditorState | null>(null);

  async function loadContext() {
    if (!workId) return;

    setLoading(true);
    setError("");
    const [foreshadowingRes, settingsRes, timelineRes] = await Promise.all([
      apiRequest<{ foreshadowings: ForeshadowingItem[] }>(`/api/works/${encodeURIComponent(workId)}/foreshadowings`),
      apiRequest<{ settings: SettingItem[] }>(`/api/works/${encodeURIComponent(workId)}/settings`),
      apiRequest<{ events: TimelineItem[] }>(`/api/works/${encodeURIComponent(workId)}/timeline`),
    ]);

    if (foreshadowingRes.status === 401 || settingsRes.status === 401 || timelineRes.status === 401) {
      window.location.href = "/login";
      return;
    }

    setForeshadowings(foreshadowingRes.success && foreshadowingRes.data?.foreshadowings ? foreshadowingRes.data.foreshadowings : []);
    setSettings(settingsRes.success && settingsRes.data?.settings ? settingsRes.data.settings : []);
    setTimeline(timelineRes.success && timelineRes.data?.events ? timelineRes.data.events : []);
    setError(
      [foreshadowingRes, settingsRes, timelineRes]
        .find((response) => !response.success)?.message || "",
    );
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadContext();
    }, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workId]);

  function openForeshadowing(item: ForeshadowingItem) {
    setEditor({
      kind: "foreshadowing",
      id: item.id,
      draft: {
        title: item.title ?? "",
        hint: item.hint,
        payoff: item.payoff ?? "",
        status: item.status,
        importance: String(item.importance),
        plantedChapter: item.plantedChapter ? String(item.plantedChapter) : "",
        resolvedChapter: item.resolvedChapter ? String(item.resolvedChapter) : "",
      },
    });
  }

  function openSetting(item: SettingItem) {
    setEditor({
      kind: "setting",
      id: item.id,
      draft: {
        kind: item.kind,
        name: item.name,
        desc: item.desc,
        firstChapter: item.firstChapter ? String(item.firstChapter) : "",
        lastUpdatedChapter: item.lastUpdatedChapter ? String(item.lastUpdatedChapter) : "",
      },
    });
  }

  function openTimeline(item: TimelineItem) {
    setEditor({
      kind: "timeline",
      id: item.id,
      draft: {
        title: item.title ?? "",
        description: item.description ?? "",
        summary: item.summary,
        storyTime: item.storyTime ?? "",
        chapterIndex: item.chapterIndex ? String(item.chapterIndex) : "",
        order: String(item.order),
        canonical: item.canonical ? "true" : "false",
      },
    });
  }

  async function saveEditor() {
    if (!editor || !workId) return;

    setSaving(true);
    setError("");

    const payload =
      editor.kind === "foreshadowing"
        ? {
            title: editor.draft.title || null,
            hint: editor.draft.hint,
            payoff: editor.draft.payoff || null,
            status: editor.draft.status,
            importance: Number(editor.draft.importance || 50),
            plantedChapter: editor.draft.plantedChapter ? Number(editor.draft.plantedChapter) : null,
            resolvedChapter: editor.draft.resolvedChapter ? Number(editor.draft.resolvedChapter) : null,
          }
        : editor.kind === "setting"
          ? {
              kind: editor.draft.kind,
              name: editor.draft.name,
              desc: editor.draft.desc,
              firstChapter: editor.draft.firstChapter ? Number(editor.draft.firstChapter) : null,
              lastUpdatedChapter: editor.draft.lastUpdatedChapter ? Number(editor.draft.lastUpdatedChapter) : null,
            }
          : {
              title: editor.draft.title || null,
              description: editor.draft.description || null,
              summary: editor.draft.summary,
              storyTime: editor.draft.storyTime || null,
              chapterIndex: editor.draft.chapterIndex ? Number(editor.draft.chapterIndex) : null,
              order: Number(editor.draft.order || 0),
              canonical: editor.draft.canonical === "true",
            };

    const path =
      editor.kind === "foreshadowing"
        ? `/api/works/${encodeURIComponent(workId)}/foreshadowings/${encodeURIComponent(editor.id)}`
        : editor.kind === "setting"
          ? `/api/works/${encodeURIComponent(workId)}/settings/${encodeURIComponent(editor.id)}`
          : `/api/works/${encodeURIComponent(workId)}/timeline/${encodeURIComponent(editor.id)}`;

    const res = await apiRequest(path, payload, { method: "PATCH" });
    setSaving(false);

    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }

    if (!res.success) {
      setError(res.message || "保存失败");
      return;
    }

    setEditor(null);
    await loadContext();
  }

  const counts = useMemo(
    () => ({
      foreshadowing: foreshadowings.length,
      settings: settings.length,
      timeline: timeline.length,
    }),
    [foreshadowings.length, settings.length, timeline.length],
  );

  return (
    <section id="context" className="rounded-3xl border border-zinc-200/50 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-900/60 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            Context Assets
          </div>
          <h3 className="mt-1 text-xl font-black text-zinc-950 dark:text-white">上下文资源</h3>
          <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-600 dark:text-zinc-300">
            伏笔、设定、时间线集中摘要展示，可在右侧抽屉直接修正。
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadContext()}
          disabled={loading}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200/80 bg-white px-4 text-sm font-bold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-950 hover:shadow-md hover:ring-1 hover:ring-zinc-300 disabled:opacity-50 dark:border-zinc-700/80 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white dark:hover:ring-zinc-700"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          刷新
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200/60 bg-red-50/80 px-4 py-3 text-sm font-bold leading-relaxed text-red-600 shadow-inner dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <ContextList
          icon={MapPinned}
          title="伏笔"
          count={counts.foreshadowing}
          empty="暂时没有伏笔"
        >
          {foreshadowings.map((item) => (
            <ContextCard
              key={item.id}
              title={item.title || "未命名伏笔"}
              meta={`重要度 ${item.importance} · ${item.status}`}
              desc={item.hint}
              onEdit={() => openForeshadowing(item)}
            />
          ))}
        </ContextList>

        <ContextList icon={ShieldIcon} title="设定" count={counts.settings} empty="暂时没有设定">
          {settings.map((item) => (
            <ContextCard
              key={item.id}
              title={item.name}
              meta={`${item.kind}${item.firstChapter ? ` · 第 ${item.firstChapter} 章` : ""}`}
              desc={item.desc}
              onEdit={() => openSetting(item)}
            />
          ))}
        </ContextList>

        <ContextList icon={Route} title="时间线" count={counts.timeline} empty="暂时没有时间线">
          {timeline.map((item) => (
            <ContextCard
              key={item.id}
              title={item.title || `事件 ${item.order}`}
              meta={`${item.chapterIndex ? `第 ${item.chapterIndex} 章` : "未绑定章节"} · ${item.canonical ? "正史" : "旁支"}`}
              desc={item.summary}
              onEdit={() => openTimeline(item)}
            />
          ))}
        </ContextList>
      </div>

      {editor ? (
        <ContextDrawer
          editor={editor}
          onClose={() => setEditor(null)}
          onSave={() => void saveEditor()}
          saving={saving}
          setEditor={setEditor}
        />
      ) : null}
    </section>
  );
}

function ContextList({
  children,
  count,
  empty,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  count: number;
  empty: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
}) {
  const items = Array.isArray(children) ? children.filter(Boolean) : [children].filter(Boolean);

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white/50 p-4 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/50">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-zinc-200/50 dark:bg-zinc-900 dark:ring-zinc-800/50">
            <Icon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          </div>
          <h4 className="text-sm font-black text-zinc-950 dark:text-white">{title}</h4>
        </div>
        <span className="rounded-lg bg-zinc-100 px-2 py-0.5 text-[11px] font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">{count}</span>
      </div>
      <div className="space-y-3">
        {items.length ? (
          items
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-300/80 px-4 py-8 text-center text-xs font-bold text-zinc-500 dark:border-zinc-700/80 dark:text-zinc-400">
            {empty}
          </div>
        )}
      </div>
    </div>
  );
}

function ContextCard({
  desc,
  meta,
  onEdit,
  title,
}: {
  desc: string;
  meta: string;
  onEdit: () => void;
  title: string;
}) {
  return (
    <article className="group rounded-xl border border-zinc-200/80 bg-white p-4 transition-all hover:shadow-md hover:ring-1 hover:ring-zinc-300 dark:border-zinc-800/80 dark:bg-zinc-950 dark:hover:ring-zinc-700">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-black text-zinc-950 dark:text-white">{title}</div>
          <div className="mt-1 text-[11px] font-bold text-zinc-500 dark:text-zinc-400">{meta}</div>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200/50 bg-zinc-50 text-zinc-500 opacity-0 transition-all group-hover:opacity-100 hover:bg-zinc-100 hover:text-zinc-900 active:scale-95 dark:border-zinc-800/50 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
          title="编辑"
        >
          <Edit3 className="h-3.5 w-3.5" />
        </button>
      </div>
      {desc ? (
        <p className="mt-3 line-clamp-3 text-xs font-medium leading-relaxed text-zinc-600 dark:text-zinc-300">
          {desc}
        </p>
      ) : null}
    </article>
  );
}

function ContextDrawer({
  editor,
  onClose,
  onSave,
  saving,
  setEditor,
}: {
  editor: EditorState;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  setEditor: Dispatch<SetStateAction<EditorState | null>>;
}) {
  return (
    <div className="fixed inset-0 z-[120]">
      <button
        type="button"
        aria-label="关闭编辑抽屉"
        className="absolute inset-0 cursor-pointer bg-zinc-950/40 backdrop-blur-md"
        onClick={onClose}
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[560px] flex-col border-l border-zinc-200/50 bg-white/90 shadow-2xl shadow-zinc-950/20 backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/90">
        <div className="border-b border-zinc-200/50 bg-white/50 px-6 py-5 dark:border-zinc-800/50 dark:bg-zinc-900/50">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            Editor
          </div>
          <h4 className="mt-1 text-2xl font-black text-zinc-950 dark:text-white">
            {editor.kind === "foreshadowing"
              ? "修正伏笔"
              : editor.kind === "setting"
                ? "修正设定"
                : "修正时间线"}
          </h4>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {editor.kind === "foreshadowing" ? (
            <div className="space-y-4">
              <Field label="标题" value={editor.draft.title} onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, title: value } })} />
              <Field label="伏笔提示" value={editor.draft.hint} textarea onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, hint: value } })} />
              <Field label="兑现方向" value={editor.draft.payoff ?? ""} textarea onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, payoff: value } })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="状态" value={editor.draft.status} onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, status: value } })} />
                <Field label="重要度" value={editor.draft.importance} onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, importance: value } })} />
                <Field label="埋设章节" value={editor.draft.plantedChapter} onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, plantedChapter: value } })} />
                <Field label="回收章节" value={editor.draft.resolvedChapter} onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, resolvedChapter: value } })} />
              </div>
            </div>
          ) : editor.kind === "setting" ? (
            <div className="space-y-4">
              <Field label="分类" value={editor.draft.kind} onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, kind: value } })} />
              <Field label="名称" value={editor.draft.name} onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, name: value } })} />
              <Field label="说明" value={editor.draft.desc} textarea onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, desc: value } })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="首次出现章节" value={editor.draft.firstChapter} onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, firstChapter: value } })} />
                <Field label="最近更新章节" value={editor.draft.lastUpdatedChapter} onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, lastUpdatedChapter: value } })} />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Field label="标题" value={editor.draft.title} onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, title: value } })} />
              <Field label="摘要" value={editor.draft.summary} textarea onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, summary: value } })} />
              <Field label="描述" value={editor.draft.description ?? ""} textarea onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, description: value } })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="故事时间" value={editor.draft.storyTime} onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, storyTime: value } })} />
                <Field label="顺序" value={editor.draft.order} onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, order: value } })} />
                <Field label="章节序号" value={editor.draft.chapterIndex} onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, chapterIndex: value } })} />
                <Field label="正史" value={editor.draft.canonical} onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, canonical: value } })} />
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-zinc-200/50 bg-zinc-50/50 px-6 py-5 dark:border-zinc-800/50 dark:bg-zinc-900/50">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-12 items-center rounded-xl border border-zinc-200/80 bg-white px-5 text-sm font-bold text-zinc-600 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-900 active:scale-[0.98] dark:border-zinc-800/80 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-bold text-white shadow-md transition-all hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit3 className="h-4 w-4" />}
            保存
          </button>
        </div>
      </aside>
    </div>
  );
}

function Field({
  label,
  onChange,
  textarea = false,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  textarea?: boolean;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          className="min-h-[120px] w-full rounded-xl border border-zinc-200/80 bg-white/80 px-4 py-3 text-sm font-bold text-zinc-700 outline-none shadow-sm transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 dark:border-zinc-700/80 dark:bg-zinc-950/80 dark:text-zinc-100 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-full rounded-xl border border-zinc-200/80 bg-white/80 px-4 text-sm font-bold text-zinc-700 outline-none shadow-sm transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 dark:border-zinc-700/80 dark:bg-zinc-950/80 dark:text-zinc-100 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
        />
      )}
    </label>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return <MapPinned className={className} />;
}

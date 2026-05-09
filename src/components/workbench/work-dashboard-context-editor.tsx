"use client";

import { Edit3, Loader2 } from "lucide-react";

import type { ContextEditorState } from "@/lib/workbench/work-dashboard-context-types";

export function ContextEditor({
  editor,
  onClose,
  onSave,
  saving,
  setEditor,
}: {
  editor: ContextEditorState;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  setEditor: (editor: ContextEditorState | null) => void;
}) {
  return (
    <div className="fixed inset-0 z-[120]">
      <button
        type="button"
        aria-label="关闭编辑抽屉"
        className="absolute inset-0 cursor-pointer bg-zinc-950/40 backdrop-blur-sm dark:bg-black/60"
        onClick={onClose}
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[600px] flex-col border-l border-white/60 bg-white/70 shadow-lg shadow-zinc-950/20 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/60">
        <div className="border-b border-[var(--theme-border)] bg-white/50 px-8 py-6 dark:border-[var(--theme-border)] dark:bg-zinc-950/50">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            Editor
          </div>
          <h4 className="mt-1 text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
            {editor.kind === "foreshadowing"
              ? "修正伏笔"
              : editor.kind === "setting"
                ? "修正设定"
                : "修正时间线"}
          </h4>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-8">
          {editor.kind === "foreshadowing" ? (
            <ForeshadowingFields editor={editor} setEditor={setEditor} />
          ) : editor.kind === "setting" ? (
            <SettingFields editor={editor} setEditor={setEditor} />
          ) : (
            <TimelineFields editor={editor} setEditor={setEditor} />
          )}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-[var(--theme-border)] bg-zinc-50/50 px-8 py-6 dark:border-[var(--theme-border)] dark:bg-zinc-900/50">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-12 items-center justify-center rounded-xl border border-[var(--theme-border)] bg-white px-6 text-sm font-bold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-950 hover:shadow-md hover:ring-1 hover:ring-[var(--theme-border)] active:scale-[0.98] dark:border-[var(--theme-border)] dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white dark:hover:ring-[var(--theme-border)]"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 hover:bg-emerald-500 hover:shadow-xl hover:shadow-emerald-500/30 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 dark:bg-emerald-500 dark:hover:bg-emerald-400"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit3 className="h-4 w-4" />}
            保存修改
          </button>
        </div>
      </aside>
    </div>
  );
}

function ForeshadowingFields({
  editor,
  setEditor,
}: {
  editor: Extract<ContextEditorState, { kind: "foreshadowing" }>;
  setEditor: (editor: ContextEditorState | null) => void;
}) {
  return (
    <div className="space-y-5">
      <Field label="标题" value={editor.draft.title} onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, title: value } })} />
      <Field label="伏笔提示" value={editor.draft.hint} textarea onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, hint: value } })} />
      <Field label="兑现方向" value={editor.draft.payoff ?? ""} textarea onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, payoff: value } })} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="状态" value={editor.draft.status} onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, status: value } })} />
        <Field label="重要度" value={editor.draft.importance} onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, importance: value } })} />
        <Field label="埋设章节" value={editor.draft.plantedChapter} onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, plantedChapter: value } })} />
        <Field label="回收章节" value={editor.draft.resolvedChapter} onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, resolvedChapter: value } })} />
      </div>
    </div>
  );
}

function SettingFields({
  editor,
  setEditor,
}: {
  editor: Extract<ContextEditorState, { kind: "setting" }>;
  setEditor: (editor: ContextEditorState | null) => void;
}) {
  return (
    <div className="space-y-5">
      <Field label="分类" value={editor.draft.kind} onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, kind: value } })} />
      <Field label="名称" value={editor.draft.name} onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, name: value } })} />
      <Field label="说明" value={editor.draft.desc} textarea onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, desc: value } })} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="首次出现章节" value={editor.draft.firstChapter} onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, firstChapter: value } })} />
        <Field label="最近更新章节" value={editor.draft.lastUpdatedChapter} onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, lastUpdatedChapter: value } })} />
      </div>
    </div>
  );
}

function TimelineFields({
  editor,
  setEditor,
}: {
  editor: Extract<ContextEditorState, { kind: "timeline" }>;
  setEditor: (editor: ContextEditorState | null) => void;
}) {
  return (
    <div className="space-y-5">
      <Field label="标题" value={editor.draft.title} onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, title: value } })} />
      <Field label="摘要" value={editor.draft.summary} textarea onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, summary: value } })} />
      <Field label="描述" value={editor.draft.description ?? ""} textarea onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, description: value } })} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="故事时间" value={editor.draft.storyTime} onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, storyTime: value } })} />
        <Field label="顺序" value={editor.draft.order} onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, order: value } })} />
        <Field label="章节序号" value={editor.draft.chapterIndex} onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, chapterIndex: value } })} />
        <Field label="正史" value={editor.draft.canonical} onChange={(value) => setEditor({ ...editor, draft: { ...editor.draft, canonical: value } })} />
      </div>
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
      <span className="mb-3 block text-[11px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          className="min-h-[140px] w-full rounded-2xl border border-[var(--theme-border)] bg-white/80 px-5 py-4 text-sm font-bold text-zinc-900 shadow-sm outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 dark:border-[var(--theme-border)] dark:bg-zinc-950/80 dark:text-white dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20"
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-full rounded-xl border border-[var(--theme-border)] bg-white/80 px-5 text-sm font-bold text-zinc-900 shadow-sm outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 dark:border-[var(--theme-border)] dark:bg-zinc-950/80 dark:text-white dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20"
        />
      )}
    </label>
  );
}

"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BookMarked,
  GitBranch,
  Loader2,
  MapPinned,
  Plus,
  RefreshCw,
  Route,
  Search,
  Sparkles,
  StickyNote,
  Trash2,
  Users,
  Wand2,
  X,
  type LucideIcon,
} from "lucide-react";

import { ExportDownloadButton } from "@/components/workbench/export-download-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import type {
  StoryBibleController,
  StoryBibleForeshadowing,
  StoryBibleItem,
  StoryBibleSection,
  StoryBibleTimelineEvent,
  StoryBibleWritingMemory,
  StoryBibleWorldSetting,
  StoryBibleCharacter,
  StoryBibleRelationship,
} from "@/lib/workbench/use-story-bible";
import { cn } from "@/lib/utils";

type SectionMeta = {
  id: StoryBibleSection;
  title: string;
  subtitle: string;
  icon: LucideIcon;
};

const sections: SectionMeta[] = [
  { id: "characters", title: "角色卡", subtitle: "身份、目标和当前状态", icon: Users },
  { id: "worldSettings", title: "世界观设定", subtitle: "规则、地点和关键名词", icon: MapPinned },
  { id: "timelineEvents", title: "时间线", subtitle: "事件顺序与故事时间", icon: Route },
  { id: "foreshadowings", title: "伏笔墙", subtitle: "埋设、回收和重要度", icon: Sparkles },
  { id: "relationships", title: "人物关系", subtitle: "关系状态与冲突变化", icon: GitBranch },
  { id: "writingMemories", title: "写作记忆", subtitle: "风格、约束和事实", icon: StickyNote },
];

export function StoryBibleView({
  bible,
  workId,
}: {
  bible: StoryBibleController;
  workId: string;
}) {
  const active = sections.find((item) => item.id === bible.activeSection) ?? sections[0];
  const activeItems = bible.data[bible.activeSection] as StoryBibleItem[];
  const totalCount = sections.reduce((sum, item) => sum + bible.data[item.id].length, 0);

  return (
    <main className="app-work-surface relative min-h-dvh overflow-x-hidden pb-6 font-sans">
      <div className="pointer-events-none fixed inset-0 theme-app-surface" />
      <header className="sticky top-0 z-40 border-b border-[var(--theme-border)] bg-[var(--theme-surface-solid)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1480px] items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            href={`/dashboard/work/${encodeURIComponent(workId)}`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--theme-surface-solid)] text-[var(--theme-text-secondary)] shadow-sm ring-1 ring-[var(--theme-border)] transition hover:bg-[var(--theme-surface-solid)] hover:text-[var(--theme-text-strong)]"
            title="返回作品"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)] shadow-sm ring-1 ring-[var(--theme-brand-border)]">
            <BookMarked className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-extrabold tracking-tight text-[var(--theme-text-strong)]">
              故事圣经
            </h1>
            <p className="truncate text-xs font-semibold text-[var(--theme-text-muted)]">
              {totalCount} 条上下文档案，支持检索、章节范围过滤和 AI 提取
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => void bible.loadBible()}
              disabled={bible.loading}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--theme-surface-solid)] px-3 text-xs font-bold text-[var(--theme-text-secondary)] shadow-sm ring-1 ring-[var(--theme-border)] transition hover:bg-[var(--theme-surface-solid)] hover:text-[var(--theme-text-strong)] disabled:opacity-50"
            >
              <RefreshCw className={cn("h-4 w-4", bible.loading && "animate-spin")} />
              刷新
            </button>
            <ThemeToggle className="h-10 w-10 rounded-xl bg-[var(--theme-surface-solid)] shadow-sm ring-1 ring-[var(--theme-border)]" />
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid max-w-[1480px] gap-4 px-4 pt-4 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <section className="app-compact-panel p-2.5">
            <div className="mb-2 px-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">
              Bible
            </div>
            <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
              {sections.map((item) => (
                <SectionButton
                  active={item.id === bible.activeSection}
                  count={bible.data[item.id].length}
                  key={item.id}
                  meta={item}
                  onClick={() => bible.setActiveSection(item.id)}
                />
              ))}
            </nav>
          </section>
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="app-compact-panel p-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_120px_auto]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--theme-text-muted)]" />
                <input
                  value={bible.search}
                  onChange={(event) => bible.setSearch(event.target.value)}
                  placeholder="搜索角色、设定、伏笔、记忆..."
                  className="h-10 w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] pl-9 pr-3 text-sm font-semibold text-[var(--theme-text-primary)] outline-none transition focus:border-[var(--theme-brand-border)] focus:ring-2 focus:ring-[var(--theme-brand-border)]"
                />
              </label>
              <input
                value={bible.fromChapter}
                onChange={(event) => bible.setFromChapter(event.target.value)}
                placeholder="起始章"
                inputMode="numeric"
                className="h-10 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 text-sm font-semibold outline-none focus:border-[var(--theme-brand-border)] focus:ring-2 focus:ring-[var(--theme-brand-border)]"
              />
              <input
                value={bible.toChapter}
                onChange={(event) => bible.setToChapter(event.target.value)}
                placeholder="结束章"
                inputMode="numeric"
                className="h-10 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 text-sm font-semibold outline-none focus:border-[var(--theme-brand-border)] focus:ring-2 focus:ring-[var(--theme-brand-border)]"
              />
              <button
                type="button"
                onClick={() => bible.openCreate(bible.activeSection)}
                className="theme-brand-gradient-bg inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold text-white shadow-[var(--theme-shadow-button)] transition hover:brightness-105 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                新增
              </button>
            </div>
          </div>

          {bible.error ? (
            <div className="rounded-lg border border-[var(--theme-danger-border)] bg-[var(--theme-danger-soft)] px-4 py-3 text-sm font-bold text-[var(--theme-danger-text)]">
              {bible.error}
            </div>
          ) : null}
          {bible.notice ? (
            <div className="rounded-lg border border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] px-4 py-3 text-sm font-bold text-[var(--theme-brand-text)]">
              {bible.notice}
            </div>
          ) : null}

          <div className="app-compact-panel overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--theme-divider)] px-4 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)] ring-1 ring-[var(--theme-brand-border)]">
                  <active.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-extrabold text-[var(--theme-text-strong)]">{active.title}</h2>
                  <p className="truncate text-xs font-semibold text-[var(--theme-text-muted)]">{active.subtitle}</p>
                </div>
              </div>
              <span className="rounded-full bg-[var(--theme-surface-solid)] px-3 py-1 text-xs font-black text-[var(--theme-text-muted)] ring-1 ring-[var(--theme-border)]">
                {activeItems.length}
              </span>
            </div>

            {bible.loading && !activeItems.length ? (
              <div className="flex min-h-[360px] items-center justify-center gap-3 text-sm font-bold text-[var(--theme-text-muted)]">
                <Loader2 className="h-5 w-5 animate-spin" />
                正在加载故事圣经...
              </div>
            ) : activeItems.length ? (
              <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
                {activeItems.map((item) => (
                  <StoryBibleCard
                    item={item}
                    key={item.id}
                    section={bible.activeSection}
                    onDelete={() => void bible.deleteItem(bible.activeSection, item.id)}
                    onEdit={() => bible.openEdit(bible.activeSection, item)}
                    saving={bible.saving}
                  />
                ))}
              </div>
            ) : (
              <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--theme-surface-solid)] text-[var(--theme-text-muted)] ring-1 ring-[var(--theme-border)]">
                  <active.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-extrabold text-[var(--theme-text-strong)]">暂无{active.title}</h3>
                <p className="mt-1 max-w-sm text-sm leading-6 text-[var(--theme-text-secondary)]">
                  可以手动新增，也可以从当前章节调用 AI 提取人物、设定、时间线和写作记忆。
                </p>
                <button
                  type="button"
                  onClick={() => bible.openCreate(bible.activeSection)}
                  className="theme-brand-gradient-bg mt-4 inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold text-white shadow-[var(--theme-shadow-button)] transition hover:brightness-105"
                >
                  <Plus className="h-4 w-4" />
                  新增条目
                </button>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <section className="app-compact-panel p-4">
            <div className="mb-3 flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-[var(--theme-brand-text)]" />
              <h2 className="text-sm font-extrabold text-[var(--theme-text-strong)]">从章节提取</h2>
            </div>
            <p className="mb-3 text-xs font-semibold leading-5 text-[var(--theme-text-secondary)]">
              AI 会读取指定章节并写入角色、设定、时间线、伏笔、关系和写作记忆。
            </p>
            <div className="flex gap-2">
              <input
                value={bible.extractChapterIndex}
                onChange={(event) => bible.setExtractChapterIndex(event.target.value)}
                inputMode="numeric"
                className="h-10 min-w-0 flex-1 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 text-sm font-semibold outline-none focus:border-[var(--theme-brand-border)] focus:ring-2 focus:ring-[var(--theme-brand-border)]"
              />
              <button
                type="button"
                onClick={() => void bible.extractFromChapter()}
                disabled={bible.extracting}
                className="theme-brand-gradient-bg inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold text-white shadow-[var(--theme-shadow-button)] transition hover:brightness-105 disabled:opacity-50"
              >
                {bible.extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                提取
              </button>
            </div>
          </section>

          <section className="app-compact-panel p-4">
            <h2 className="mb-3 text-sm font-extrabold text-[var(--theme-text-strong)]">导出作品</h2>
            <div className="grid gap-2">
              <ExportLink workId={workId} format="txt" label="全书 TXT" />
              <ExportLink workId={workId} format="md" label="全书 Markdown" />
              <button className="h-9 cursor-not-allowed rounded-lg border border-dashed border-[var(--theme-border)] text-xs font-bold text-[var(--theme-text-muted)]" disabled>
                DOCX / EPUB 接口预留
              </button>
            </div>
          </section>
        </aside>
      </div>

      {bible.editor ? <StoryBibleEditor bible={bible} /> : null}
    </main>
  );
}

function SectionButton({
  active,
  count,
  meta,
  onClick,
}: {
  active: boolean;
  count: number;
  meta: SectionMeta;
  onClick: () => void;
}) {
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "grid min-w-[168px] grid-cols-[auto_1fr_auto] items-center gap-2 rounded-xl border px-3 py-3 text-left transition lg:min-w-0",
        active
          ? "border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)] shadow-sm"
          : "border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-strong)]",
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="truncate text-sm font-bold">{meta.title}</span>
      <span className="rounded-full bg-[var(--theme-surface-soft)] px-2 py-0.5 text-[10px] font-black text-[var(--theme-text-muted)] ring-1 ring-[var(--theme-border)]">
        {count}
      </span>
    </button>
  );
}

function StoryBibleCard({
  item,
  onDelete,
  onEdit,
  saving,
  section,
}: {
  item: StoryBibleItem;
  onDelete: () => void;
  onEdit: () => void;
  saving: boolean;
  section: StoryBibleSection;
}) {
  const summary = getCardSummary(section, item);
  const meta = getCardMeta(section, item);

  return (
    <article className="group flex min-h-[178px] flex-col rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-extrabold text-[var(--theme-text-strong)]">
            {getCardTitle(section, item)}
          </h3>
          <p className="mt-0.5 truncate text-[11px] font-bold text-[var(--theme-text-muted)]">{meta}</p>
        </div>
        <div className="flex gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
          <button
            type="button"
            onClick={onEdit}
            className="h-8 rounded-md bg-[var(--theme-surface-overlay)] px-2 text-xs font-bold text-[var(--theme-text-secondary)] ring-1 ring-[var(--theme-border)] hover:text-[var(--theme-text-strong)]"
          >
            编辑
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={saving}
            title="删除"
            className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--theme-danger-soft)] text-[var(--theme-danger-text)] ring-1 ring-[var(--theme-danger-border)] transition hover:bg-[var(--theme-danger-soft)] disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <p className="line-clamp-5 text-sm font-medium leading-6 text-[var(--theme-text-secondary)]">
        {summary || "暂无说明。"}
      </p>
    </article>
  );
}

function getCardTitle(section: StoryBibleSection, item: StoryBibleItem) {
  if (section === "characters") return (item as StoryBibleCharacter).name;
  if (section === "worldSettings") return (item as StoryBibleWorldSetting).name;
  if (section === "timelineEvents") return (item as StoryBibleTimelineEvent).title || "时间线事件";
  if (section === "foreshadowings") return (item as StoryBibleForeshadowing).title || "未命名伏笔";
  if (section === "relationships") {
    const row = item as StoryBibleRelationship;
    return `${row.characterAName} / ${row.characterBName}`;
  }
  return (item as StoryBibleWritingMemory).kind;
}

function getCardMeta(section: StoryBibleSection, item: StoryBibleItem) {
  if (section === "characters") {
    const row = item as StoryBibleCharacter;
    return `${row.role}${row.firstChapter ? ` · 初见第 ${row.firstChapter} 章` : ""}`;
  }
  if (section === "worldSettings") return (item as StoryBibleWorldSetting).kind;
  if (section === "timelineEvents") {
    const row = item as StoryBibleTimelineEvent;
    return `${row.chapterIndex ? `第 ${row.chapterIndex} 章` : "全局"}${row.storyTime ? ` · ${row.storyTime}` : ""}`;
  }
  if (section === "foreshadowings") {
    const row = item as StoryBibleForeshadowing;
    return `${row.status} · 重要度 ${row.importance}`;
  }
  if (section === "relationships") return (item as StoryBibleRelationship).status;
  return `优先级 ${(item as StoryBibleWritingMemory).priority}`;
}

function getCardSummary(section: StoryBibleSection, item: StoryBibleItem) {
  if (section === "characters") {
    const row = item as StoryBibleCharacter;
    return row.currentState || row.desc;
  }
  if (section === "worldSettings") return (item as StoryBibleWorldSetting).desc;
  if (section === "timelineEvents") {
    const row = item as StoryBibleTimelineEvent;
    return row.description || row.summary;
  }
  if (section === "foreshadowings") {
    const row = item as StoryBibleForeshadowing;
    return [row.hint, row.payoff ? `回收：${row.payoff}` : ""].filter(Boolean).join("\n");
  }
  if (section === "relationships") return (item as StoryBibleRelationship).conflict || "";
  return (item as StoryBibleWritingMemory).content;
}

function StoryBibleEditor({ bible }: { bible: StoryBibleController }) {
  const editor = bible.editor;
  if (!editor) return null;
  const meta = sections.find((item) => item.id === editor.section) ?? sections[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--theme-surface-solid)]/35 p-3 backdrop-blur-sm sm:items-center">
      <section className="max-h-[92dvh] w-full max-w-2xl overflow-hidden rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--theme-divider)] px-4 py-3">
          <div>
            <h2 className="text-base font-extrabold text-[var(--theme-text-strong)]">
              {editor.id ? "编辑" : "新增"}{meta.title}
            </h2>
            <p className="text-xs font-semibold text-[var(--theme-text-muted)]">{meta.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => bible.setEditor(null)}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--theme-surface-solid)] text-[var(--theme-text-muted)] ring-1 ring-[var(--theme-border)] hover:text-[var(--theme-text-strong)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid max-h-[68dvh] gap-3 overflow-y-auto p-4 sm:grid-cols-2">
          <EditorFields editor={editor} updateDraft={bible.updateDraft} />
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--theme-divider)] px-4 py-3">
          <button
            type="button"
            onClick={() => bible.setEditor(null)}
            className="h-10 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-4 text-sm font-bold text-[var(--theme-text-secondary)]"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => void bible.saveEditor()}
            disabled={bible.saving}
            className="theme-brand-gradient-bg inline-flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-bold text-white shadow-[var(--theme-shadow-button)] transition hover:brightness-105 disabled:opacity-50"
          >
            {bible.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            保存
          </button>
        </div>
      </section>
    </div>
  );
}

function EditorFields({
  editor,
  updateDraft,
}: {
  editor: StoryBibleController["editor"];
  updateDraft: StoryBibleController["updateDraft"];
}) {
  if (!editor) return null;
  const draft = editor.draft;
  const field = (key: keyof typeof draft, label: string, area = false) => (
    <label className={cn("block", area && "sm:col-span-2")} key={key}>
      <span className="mb-1 block text-xs font-bold text-[var(--theme-text-muted)]">{label}</span>
      {area ? (
        <textarea
          value={draft[key]}
          onChange={(event) => updateDraft({ [key]: event.target.value })}
          rows={4}
          className="w-full resize-y rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 py-2 text-sm font-semibold leading-6 outline-none focus:border-[var(--theme-brand-border)] focus:ring-2 focus:ring-[var(--theme-brand-border)]"
        />
      ) : (
        <input
          value={draft[key]}
          onChange={(event) => updateDraft({ [key]: event.target.value })}
          className="h-10 w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 text-sm font-semibold outline-none focus:border-[var(--theme-brand-border)] focus:ring-2 focus:ring-[var(--theme-brand-border)]"
        />
      )}
    </label>
  );

  if (editor.section === "characters") {
    return (
      <>
        {field("name", "角色名")}
        {field("role", "定位")}
        {field("firstChapter", "首次出现章节")}
        {field("lastChapter", "最后更新章节")}
        {field("currentState", "当前状态", true)}
        {field("desc", "角色描述", true)}
      </>
    );
  }

  if (editor.section === "worldSettings") {
    return (
      <>
        {field("kind", "设定类型")}
        {field("name", "设定名称")}
        {field("firstChapter", "首次出现章节")}
        {field("lastUpdatedChapter", "最近更新章节")}
        {field("desc", "设定说明", true)}
      </>
    );
  }

  if (editor.section === "timelineEvents") {
    return (
      <>
        {field("title", "事件标题")}
        {field("chapterIndex", "章节序号")}
        {field("storyTime", "故事时间")}
        {field("order", "排序")}
        {field("summary", "事件摘要", true)}
        {field("description", "详细说明", true)}
      </>
    );
  }

  if (editor.section === "foreshadowings") {
    return (
      <>
        {field("title", "伏笔标题")}
        {field("status", "状态 open / partial / resolved / dropped")}
        {field("priority", "重要度")}
        {field("plantedChapter", "埋设章节")}
        {field("resolvedChapter", "回收章节")}
        {field("hint", "伏笔提示", true)}
        {field("payoff", "回收方式", true)}
      </>
    );
  }

  if (editor.section === "relationships") {
    return (
      <>
        {field("characterAName", "人物 A")}
        {field("characterBName", "人物 B")}
        {field("status", "关系状态")}
        {field("recentChangeChapter", "最近变化章节")}
        {field("conflict", "冲突 / 变化", true)}
      </>
    );
  }

  return (
    <>
      {field("kind", "记忆类型 fact / style / constraint")}
      {field("priority", "优先级")}
      {field("source", "来源")}
      {field("content", "记忆内容", true)}
    </>
  );
}

function ExportLink({
  format,
  label,
  workId,
}: {
  format: "txt" | "md";
  label: string;
  workId: string;
}) {
  return (
    <ExportDownloadButton
      workId={workId}
      scope="book"
      format={format}
      className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 text-xs font-bold text-[var(--theme-text-secondary)] transition hover:bg-[var(--theme-brand-soft)] hover:text-[var(--theme-brand-text)]"
      title={`导出 ${label}`}
    >
      {label}
    </ExportDownloadButton>
  );
}

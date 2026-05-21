import { AlertCircle, Check, Copy, Download, FileText, History, Save, Sparkles, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { ExportDownloadButton } from "@/components/workbench/export-download-button";
import { aiZhCN } from "@/lib/copy/ai-zh-cn";
import type { WorkChapterEditorController } from "@/lib/workbench/use-work-chapter-editor";
import { cn } from "@/lib/utils";
import { isShortStoryWork } from "@/shared/work-type";

export function ChapterEditorMain({ editor }: { editor: WorkChapterEditorController }) {
  const {
    aiStageMessage,
    chapterIndex,
    content,
    copiedTarget,
    dirty,
    effectiveAiBusy,
    effectiveAiProgress,
    error,
    handleCopy,
    handleManualSave,
    metaSaving,
    outlinePreviewLines,
    openFullChapterRewriteDialog,
    openRewriteDialog,
    rewriteApplying,
    rewriteBlockedReason,
    rewriteBusy,
    rewriteSelection,
    saving,
    setRewriteSelection,
    setRevisionDialogOpen,
    summaryPreview,
    title,
    updateContent,
    updateTitle,
    wordCount,
    work,
  } = editor;

  const isShortStory = isShortStoryWork(work?.workType);
  const currentChapterLabel = formatChapterLabel(chapterIndex, work?.workType);
  const contextPreview =
    summaryPreview ||
    outlinePreviewLines.join("；") ||
    (isShortStory
      ? "暂无本场景上下文。可在右侧生成摘要、段落提示或细节设定后继续写作。"
      : "暂无本章上下文。可在右侧生成摘要、大纲或细节设定后继续写作。");
  const contextChips = outlinePreviewLines.length
    ? outlinePreviewLines.slice(0, 3)
    : [work?.tag || "写作", currentChapterLabel].filter(Boolean);
  const selectedLength = rewriteSelection.text.trim().length;
  const rewriteToolbarActions = [
    { action: "polish", label: "润色" },
    { action: "expand", label: "扩写" },
    { action: "compress", label: "压缩" },
    { action: "add_conflict", label: "加冲突" },
    { action: "add_emotion", label: "加情绪" },
    { action: "爽文化", label: "爽文化" },
    { action: "细腻化", label: "细腻化" },
    { action: "去 AI 味", label: "去 AI 味" },
    { action: "增强开头钩子", label: "开头钩子" },
    { action: "增强结尾追读感", label: "结尾追读" },
    { action: "对话自然化", label: "对话自然" },
  ] as const;

  function syncSelection(target: HTMLTextAreaElement) {
    const start = target.selectionStart;
    const end = target.selectionEnd;
    setRewriteSelection({
      start,
      end,
      text: start === end ? "" : target.value.slice(start, end),
    });
  }

  return (
    <div className="relative flex min-w-0 w-full flex-col items-center pb-8 lg:h-full lg:min-h-0 lg:self-stretch lg:pb-0">
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-[4.25rem] z-40 mb-3 flex w-full max-w-[1080px] items-center justify-between rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] px-3 py-2 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 text-white shadow-inner dark:bg-white dark:text-zinc-900">
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[var(--theme-text-strong)]">
                {currentChapterLabel}
              </span>
              <span className="rounded-md bg-zinc-200/50 px-2 py-0.5 text-[10px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {work?.tag || (isShortStory ? "场景" : "章节")}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--theme-text-muted)]">
              <span>{wordCount.toLocaleString("zh-CN")} 字</span>
              <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              <SaveInlineStatus
                aiLabel={aiStageMessage}
                aiBusy={effectiveAiBusy}
                dirty={dirty}
                error={error}
                metaSaving={metaSaving}
                saving={saving}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!content.trim()}
            onClick={() => void handleCopy("content", content)}
            className={cn(
              "flex h-8 items-center justify-center rounded-md px-3 text-sm font-bold transition-colors active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45",
              copiedTarget === "content"
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/20"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-white",
            )}
            title={copiedTarget === "content" ? "正文已复制" : "复制当前正文"}
          >
            {copiedTarget === "content" ? (
              <Check className="h-4 w-4 sm:mr-2" />
            ) : (
              <Copy className="h-4 w-4 sm:mr-2" />
            )}
            <span className="hidden sm:inline">
              {copiedTarget === "content" ? "已复制" : "复制正文"}
            </span>
          </button>
          {work ? (
            <div className="hidden items-center gap-1 rounded-md bg-zinc-100 p-0.5 dark:bg-zinc-800 sm:flex">
              <ExportDownloadButton
                workId={work.id}
                scope="chapter"
                chapterIndex={chapterIndex}
                format="txt"
                className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-bold text-zinc-600 transition hover:bg-white hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white"
                title="导出当前章节 TXT"
              >
                <Download className="h-3.5 w-3.5" />
                TXT
              </ExportDownloadButton>
              <ExportDownloadButton
                workId={work.id}
                scope="chapter"
                chapterIndex={chapterIndex}
                format="md"
                className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-bold text-zinc-600 transition hover:bg-white hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white"
                title="导出当前章节 Markdown"
              >
                <FileText className="h-3.5 w-3.5" />
                MD
              </ExportDownloadButton>
              <ExportDownloadButton
                workId={work.id}
                scope="chapter"
                chapterIndex={chapterIndex}
                format="docx"
                className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-bold text-zinc-600 transition hover:bg-white hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white"
                title="导出当前章节 DOCX"
              >
                <FileText className="h-3.5 w-3.5" />
                DOCX
              </ExportDownloadButton>
            </div>
          ) : null}
          <button
            type="button"
            disabled={!work}
            onClick={() => setRevisionDialogOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-100 text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-zinc-900 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-white sm:w-auto sm:px-3 sm:font-bold"
          >
            <History className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">历史</span>
          </button>
          <button
            type="button"
            disabled={!work || saving || metaSaving || effectiveAiBusy}
            onClick={() => void handleManualSave()}
            className="group relative flex h-8 items-center justify-center overflow-hidden rounded-md bg-zinc-900 px-4 text-sm font-bold text-white shadow-sm transition-all hover:bg-black active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 dark:bg-white dark:text-zinc-900"
          >
            <Save className="mr-2 h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:scale-110" />
            保存
          </button>
        </div>
      </motion.header>

      <main className="flex w-full max-w-[1080px] min-h-0 flex-1 flex-col gap-3">
        
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: "auto" }} 
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-3 rounded-2xl bg-red-500/10 px-5 py-4 text-sm font-medium text-red-600 ring-1 ring-red-500/20 backdrop-blur-md dark:text-red-400"
            >
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {effectiveAiBusy && (
            <motion.div 
              initial={{ opacity: 0, y: -8 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -8 }}
              className="overflow-hidden rounded-2xl border border-emerald-200/70 bg-[linear-gradient(180deg,rgba(247,252,249,0.98),rgba(240,249,244,0.94))] shadow-sm dark:border-emerald-500/20 dark:bg-[linear-gradient(180deg,rgba(18,40,31,0.55),rgba(15,28,23,0.7))]"
            >
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-200/80 bg-white/80 text-emerald-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <Sparkles className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-200">AI 正在润稿</h3>
                      <span className="inline-flex items-center rounded-full border border-emerald-200/80 bg-white/75 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                        写作流
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs font-semibold text-emerald-700/80 dark:text-emerald-300/80">
                      {aiStageMessage || aiZhCN.chapterGenerate.stages.draft}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <div className="hidden w-36 sm:block">
                    <div className="h-2 overflow-hidden rounded-full bg-emerald-100/90 dark:bg-emerald-500/10">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,rgba(16,185,129,0.82),rgba(5,150,105,0.98))] transition-[width] duration-300 ease-out"
                        style={{ width: `${Math.max(6, Math.min(99, Math.round(effectiveAiProgress)))}%` }}
                      />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-emerald-200/80 bg-white/80 px-3 py-1.5 text-lg font-black tabular-nums text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                    {Math.max(1, Math.min(99, Math.round(effectiveAiProgress)))}%
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-emerald-200/70 dark:bg-emerald-500/10" />
              <div className="px-4 py-2">
                <div className="h-1.5 overflow-hidden rounded-full bg-emerald-100/90 dark:bg-emerald-500/10 sm:hidden">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,rgba(16,185,129,0.82),rgba(5,150,105,0.98))] transition-[width] duration-300 ease-out"
                    style={{ width: `${Math.max(6, Math.min(99, Math.round(effectiveAiProgress)))}%` }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 标题输入区 */}
        <div className="group relative">
          <input
            value={title}
            onChange={(event) => updateTitle(event.target.value)}
            disabled={!work || effectiveAiBusy}
            placeholder={`${currentChapterLabel}标题`}
            className="w-full rounded-lg border border-transparent bg-transparent px-2 py-2 text-2xl font-medium tracking-tight text-[var(--theme-text-strong)] placeholder:text-zinc-300 focus:border-[var(--theme-border)] focus:bg-[var(--theme-surface-strong)] focus:outline-none disabled:opacity-50 dark:placeholder:text-zinc-700 sm:text-3xl"
          />
          <div className="absolute -left-12 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 hidden sm:block">
             <CopyButton
              active={copiedTarget === "title"}
              disabled={!title.trim()}
              onClick={() => void handleCopy("title", title)}
            />
          </div>
        </div>

        {/* 上下文轻量卡片 */}
        <div className="app-compact-panel group px-4 py-3">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-xs font-bold tracking-widest text-zinc-400 uppercase">当前上下文</h4>
            <div className="flex gap-2">
              {contextChips.map((item) => (
                <span key={item} className="rounded-full bg-zinc-200/50 px-2.5 py-1 text-[10px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <p className="line-clamp-3 text-sm font-medium leading-6 text-[var(--theme-text-secondary)] xl:line-clamp-2">
            {contextPreview}
          </p>
        </div>

        {/* 正文输入区 */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] px-3 py-2 shadow-sm">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!work || rewriteBusy || rewriteApplying}
              onClick={() => openFullChapterRewriteDialog("polish")}
              title={rewriteBlockedReason || "无需选中文本，打开整章 AI 改写预览"}
              className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-zinc-900 px-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-45 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              <Sparkles className="h-3.5 w-3.5" />
              整章 AI 改写
            </button>
            <div className="min-w-0 text-xs font-semibold text-[var(--theme-text-muted)]">
              {selectedLength
                ? `已选中 ${selectedLength.toLocaleString("zh-CN")} 字，可只改写选中文本`
                : "可整章改写，或选中正文后只改写选中文本"}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {rewriteToolbarActions.map((item) => (
              <button
                key={item.action}
                type="button"
                disabled={!work || !selectedLength || rewriteBusy || rewriteApplying}
                onClick={() => openRewriteDialog(item.action)}
                className="inline-flex h-7 items-center rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-2.5 text-xs font-bold text-[var(--theme-text-secondary)] transition hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-45 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-200"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="group relative flex min-h-0 flex-1">
          <div className="absolute -left-12 top-2 opacity-0 transition-opacity group-hover:opacity-100 hidden sm:block">
             <CopyButton
              active={copiedTarget === "content"}
              disabled={!content.trim()}
              onClick={() => void handleCopy("content", content)}
            />
          </div>
          <textarea
            value={content}
            onChange={(event) => updateContent(event.target.value)}
            onSelect={(event) => syncSelection(event.currentTarget)}
            onKeyUp={(event) => syncSelection(event.currentTarget)}
            onMouseUp={(event) => syncSelection(event.currentTarget)}
            disabled={!work || effectiveAiBusy}
            placeholder={`开始您的创作...`}
            className="h-full min-h-[52vh] w-full resize-y rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-4 py-3 text-base font-medium leading-8 text-[var(--theme-text-primary)] shadow-sm placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 disabled:opacity-50 dark:placeholder:text-zinc-700 sm:text-[18px] lg:min-h-0"
          />
        </div>

      </main>
    </div>
  );
}

function CopyButton({
  active,
  disabled,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full transition-all active:scale-90 disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400"
          : "bg-zinc-100 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:hover:text-zinc-300",
      )}
      title={active ? "已复制" : "复制"}
    >
      {active ? <Check className="h-4 w-4 stroke-[3]" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

function SaveInlineStatus({
  aiLabel,
  aiBusy,
  dirty,
  error,
  metaSaving,
  saving,
}: {
  aiLabel: string;
  aiBusy: boolean;
  dirty: boolean;
  error: string;
  metaSaving: boolean;
  saving: boolean;
}) {
  const busy = saving || metaSaving;
  const label = error
    ? "异常"
    : aiBusy
      ? aiLabel || "生成中"
      : busy
        ? "保存中"
        : dirty
          ? "未保存"
          : "已保存";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 transition-colors",
        error
          ? "text-red-500"
          : aiBusy
            ? "text-emerald-500"
            : busy || dirty
              ? "text-amber-500"
              : "text-green-500",
      )}
    >
      <span className={cn(
        "h-1.5 w-1.5 rounded-full",
        error ? "bg-red-500" : aiBusy ? "bg-emerald-500 animate-pulse" : busy || dirty ? "bg-amber-500" : "bg-green-500"
      )} />
      {label}
    </span>
  );
}

function formatChapterLabel(index: number, workType?: string | null) {
  if (isShortStoryWork(workType)) return `场景 ${Math.max(1, index)}`;
  return `第 ${Math.max(1, index)} 章`;
}

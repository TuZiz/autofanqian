import { AlertCircle, Check, Copy, FileText, History, Save, Sparkles, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { aiZhCN } from "@/lib/copy/ai-zh-cn";
import type { WorkChapterEditorController } from "@/lib/workbench/use-work-chapter-editor";
import { cn } from "@/lib/utils";

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
    saving,
    setRevisionDialogOpen,
    statusText,
    summaryPreview,
    title,
    updateContent,
    updateTitle,
    wordCount,
    work,
  } = editor;

  const currentChapterLabel = formatChapterLabel(chapterIndex);
  const contextPreview =
    summaryPreview ||
    outlinePreviewLines.join("；") ||
    "暂无本章上下文。可在右侧生成摘要、大纲或细节设定后继续写作。";
  const contextChips = outlinePreviewLines.length
    ? outlinePreviewLines.slice(0, 3)
    : [work?.tag || "写作", currentChapterLabel].filter(Boolean);

  return (
    <div className="relative flex min-w-0 w-full flex-col items-center pb-32 pt-8 lg:col-span-8 xl:col-span-9 bg-zinc-50/30 dark:bg-black/10">
      
      {/* 悬浮主控导航胶囊 (Floating Toolbar Pill) */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-6 z-40 mb-12 flex w-[90%] max-w-4xl items-center justify-between rounded-full border border-white/40 bg-white/70 px-4 py-3 shadow-lg shadow-black/5 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-900/60 transition-all hover:shadow-xl hover:shadow-black/10"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-inner">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-zinc-900 dark:text-white">
                {currentChapterLabel}
              </span>
              <span className="rounded-full bg-zinc-200/50 px-2 py-0.5 text-[10px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {work?.tag || "章节"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              <span>{wordCount.toLocaleString("zh-CN")} 字</span>
              <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              <SaveInlineStatus
                aiLabel={aiStageMessage}
                aiBusy={effectiveAiBusy}
                dirty={dirty}
                error={error}
                metaSaving={metaSaving}
                saving={saving}
                statusText={statusText}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!work}
            onClick={() => setRevisionDialogOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-zinc-900 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-white sm:h-auto sm:w-auto sm:px-4 sm:font-bold"
          >
            <History className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">历史</span>
          </button>
          <button
            type="button"
            disabled={!work || saving || metaSaving || effectiveAiBusy}
            onClick={() => void handleManualSave()}
            className="group relative flex h-10 items-center justify-center overflow-hidden rounded-full bg-zinc-900 px-5 text-sm font-bold text-white shadow-md transition-all hover:scale-105 hover:bg-black hover:shadow-xl active:scale-95 disabled:pointer-events-none disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            <Save className="mr-2 h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:scale-110" />
            保存
          </button>
        </div>
      </motion.header>

      {/* 主体编辑区 (Hero Editor) */}
      <main className="w-[90%] max-w-4xl flex-col flex gap-8">
        
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
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative overflow-hidden rounded-3xl bg-blue-500/5 px-6 py-5 ring-1 ring-blue-500/20 backdrop-blur-md"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 animate-[rewrite-scan_2s_ease-in-out_infinite]" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400">
                    <Sparkles className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-blue-700 dark:text-blue-300">AI 正在介入</h3>
                    <p className="text-xs font-semibold text-blue-600/70 dark:text-blue-400/70">
                      {aiStageMessage || aiZhCN.chapterGenerate.stages.draft}
                    </p>
                  </div>
                </div>
                <div className="text-2xl font-black tabular-nums text-blue-600 dark:text-blue-400">
                  {Math.max(1, Math.min(99, Math.round(effectiveAiProgress)))}%
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
            className="w-full bg-transparent px-2 py-4 text-4xl sm:text-5xl font-black tracking-tight text-zinc-900 placeholder:text-zinc-300 focus:outline-none disabled:opacity-50 dark:text-white dark:placeholder:text-zinc-700 transition-colors"
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
        <div className="group rounded-3xl bg-white/40 px-6 py-5 shadow-sm ring-1 ring-zinc-900/5 transition-all hover:bg-white/60 dark:bg-zinc-900/30 dark:ring-white/10 dark:hover:bg-zinc-900/50 backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-xs font-black tracking-widest text-zinc-400 uppercase">当前上下文</h4>
            <div className="flex gap-2">
              {contextChips.map((item) => (
                <span key={item} className="rounded-full bg-zinc-200/50 px-2.5 py-1 text-[10px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <p className="text-sm font-medium leading-relaxed text-zinc-600 dark:text-zinc-300">
            {contextPreview}
          </p>
        </div>

        {/* 正文输入区 */}
        <div className="group relative mt-4">
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
            disabled={!work || effectiveAiBusy}
            placeholder={`开始您的创作...`}
            className="min-h-[70vh] w-full resize-none bg-transparent px-2 py-2 text-lg sm:text-[21px] font-medium leading-[2.2] text-zinc-800 placeholder:text-zinc-300 focus:outline-none disabled:opacity-50 dark:text-zinc-100 dark:placeholder:text-zinc-700"
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
  statusText,
}: {
  aiLabel: string;
  aiBusy: boolean;
  dirty: boolean;
  error: string;
  metaSaving: boolean;
  saving: boolean;
  statusText: string;
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
            ? "text-blue-500"
            : busy || dirty
              ? "text-amber-500"
              : "text-green-500",
      )}
    >
      <span className={cn(
        "h-1.5 w-1.5 rounded-full",
        error ? "bg-red-500" : aiBusy ? "bg-blue-500 animate-pulse" : busy || dirty ? "bg-amber-500" : "bg-green-500"
      )} />
      {label}
    </span>
  );
}

function formatChapterLabel(index: number) {
  return `第 ${Math.max(1, index)} 章`;
}

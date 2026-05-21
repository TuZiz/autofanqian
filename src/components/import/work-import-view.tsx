"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardPaste,
  FileUp,
  Loader2,
  Sparkles,
  UploadCloud,
} from "lucide-react";

import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { ImportPreviewPanel } from "@/components/import/import-preview-panel";
import type { WorkImportController } from "@/lib/import/use-work-import";
import { cn } from "@/lib/utils";
import type { WorkTypeValue } from "@/shared/work-type";

const workTypeOptions: Array<{ value: WorkTypeValue; label: string }> = [
  { value: "long_novel", label: "长篇连载" },
  { value: "short_story", label: "短篇小说" },
];

export function WorkImportView({ controller }: { controller: WorkImportController }) {
  const {
    busy,
    error,
    fileName,
    genre,
    handleConfirm,
    handleFileChange,
    handlePreview,
    platform,
    preview,
    rawText,
    setGenre,
    setPlatform,
    setRawText,
    setSynopsis,
    setTagsText,
    setTitle,
    setWorkType,
    singleLongImportWarning,
    stage,
    synopsis,
    tagsText,
    title,
    workType,
  } = controller;
  const previewing = stage === "previewing";
  const confirming = stage === "confirming";
  const canPreview = Boolean(title.trim() && genre.trim() && rawText.trim()) && !busy;
  const canConfirm = Boolean(preview?.chapters.length) && !busy;
  const shortStoryMergeWarning =
    workType === "short_story" && (preview?.chapters.length ?? 0) > 1;

  return (
    <main className="theme-page relative min-h-screen overflow-hidden font-sans transition-[background-color,color]">
      <div className="pointer-events-none absolute inset-0 theme-app-surface" />
      <div className="pointer-events-none absolute inset-0 theme-app-grid" />
      <div className="pointer-events-none absolute inset-0 theme-app-vignette" />
      <div className="pointer-events-none absolute inset-0 app-noise theme-app-noise" />

      <DashboardTopbar title="导入作品" showBackToDashboard showAdminLink={false} />

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-4.5rem)] w-full max-w-[1560px] flex-col gap-4 px-4 py-4 sm:px-5 lg:px-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="theme-kicker text-xs font-bold uppercase tracking-[0.18em]">
              Work Import
            </p>
            <h1 className="theme-heading mt-1 text-2xl font-black tracking-tight md:text-3xl">
              导入已有作品
            </h1>
            <p className="theme-subheading mt-2 max-w-2xl text-sm leading-6">
              粘贴全文或上传 TXT/Markdown，先解析预览，再写入作品库。
            </p>
          </div>
          <Link
            href="/dashboard"
            className="theme-button-secondary inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold"
          >
            <ArrowLeft className="h-4 w-4" />
            返回工作台
          </Link>
        </header>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
          <section className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-950">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-base font-extrabold text-[var(--theme-text-strong)]">
                  导入配置
                </h2>
                <p className="text-xs text-[var(--theme-text-muted)]">用于创建作品信息</p>
              </div>
            </div>

            <div className="space-y-4">
              <Field label="作品类型">
                <div className="grid grid-cols-2 gap-2">
                  {workTypeOptions.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setWorkType(item.value)}
                      className={cn(
                        "h-10 rounded-lg border px-3 text-sm font-bold transition",
                        workType === item.value
                          ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                          : "border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface-hover)]",
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </Field>

              <TextInput label="作品标题" value={title} onChange={setTitle} placeholder="例如：雨夜电话" />
              <TextInput label="题材" value={genre} onChange={setGenre} placeholder="悬疑 / 都市 / 现言..." />
              <TextInput label="标签" value={tagsText} onChange={setTagsText} placeholder="用空格、逗号或顿号分隔" />
              <TextInput label="平台风格" value={platform} onChange={setPlatform} placeholder="番茄 / 晋江 / 小红书..." />

              <Field label="简介（可选）">
                <textarea
                  value={synopsis}
                  onChange={(event) => setSynopsis(event.target.value)}
                  rows={4}
                  placeholder="不填时会根据正文开头自动生成基础简介。"
                  className="w-full resize-y rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 py-2.5 text-sm leading-6 text-[var(--theme-text-primary)] outline-none transition focus:ring-2 focus:ring-emerald-500/15"
                />
              </Field>
            </div>
          </section>

          <section className="flex min-h-[34rem] flex-col rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--theme-border)] p-4">
              <div>
                <h2 className="text-base font-extrabold text-[var(--theme-text-strong)]">
                  正文文本
                </h2>
                <p className="mt-1 text-xs text-[var(--theme-text-muted)]">
                  支持直接粘贴，或读取 .txt / .md 文件
                </p>
              </div>
              <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 text-xs font-bold text-[var(--theme-text-secondary)] shadow-sm transition hover:bg-[var(--theme-surface-hover)]">
                <FileUp className="h-4 w-4" />
                选择文件
                <input
                  type="file"
                  accept=".txt,.md,text/plain,text/markdown"
                  className="hidden"
                  onChange={(event) => void handleFileChange(event.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            {fileName ? (
              <div className="mx-4 mt-3 inline-flex w-fit items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200/80 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-400/20">
                <UploadCloud className="h-3.5 w-3.5" />
                {fileName}
              </div>
            ) : null}

            <div className="min-h-0 flex-1 p-4">
              <textarea
                value={rawText}
                onChange={(event) => setRawText(event.target.value)}
                placeholder={"粘贴作品全文...\n\n第1章 初遇\n正文内容...\n\n第二章 转折\n正文内容..."}
                className="h-full min-h-[30rem] w-full resize-y rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-4 py-3 text-sm leading-7 text-[var(--theme-text-primary)] shadow-inner outline-none transition placeholder:text-zinc-400 focus:ring-2 focus:ring-emerald-500/15"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--theme-border)] p-4">
              <div className="text-xs font-semibold text-[var(--theme-text-muted)]">
                当前文本 {rawText.length.toLocaleString("zh-CN")} 字符
              </div>
              <button
                type="button"
                disabled={!canPreview}
                onClick={() => void handlePreview()}
                className="theme-button-primary inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
              >
                {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardPaste className="h-4 w-4" />}
                {previewing ? "解析中" : "解析预览"}
              </button>
            </div>
          </section>

          <div className="flex min-h-[34rem] flex-col gap-3">
            <ImportPreviewPanel
              preview={preview}
              singleLongImportWarning={singleLongImportWarning}
              shortStoryMergeWarning={shortStoryMergeWarning}
            />
            <button
              type="button"
              disabled={!canConfirm}
              onClick={() => void handleConfirm()}
              className="theme-button-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-5 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {confirming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {confirming
                ? "正在导入"
                : shortStoryMergeWarning
                  ? "合并为短篇并导入"
                  : singleLongImportWarning
                  ? "确认作为单章导入"
                  : "确认导入作品"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-[var(--theme-text-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function TextInput({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <Field label={label}>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 text-sm font-semibold text-[var(--theme-text-primary)] outline-none transition placeholder:text-zinc-400 focus:ring-2 focus:ring-emerald-500/15"
      />
    </Field>
  );
}

"use client";

import { BrainCircuit, Plus, Save, Trash2 } from "lucide-react";

import type { DashboardAdminController } from "@/lib/admin/use-dashboard-admin";

type AdminTemplateSectionProps = {
  admin: DashboardAdminController;
};

export function AdminTemplateSection({ admin }: AdminTemplateSectionProps) {
  const {
    genreForTemplates,
    genreOptions,
    handleCreateTemplate,
    handleDeleteTemplate,
    handleLearnTemplates,
    handleUpdateTemplate,
    learning,
    setGenreForTemplates,
    setTemplates,
    templates,
    templatesLoading,
  } = admin;

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 dark:border-white/10 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">
              预设模板库
            </h2>
            <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
              管理当前类型的热门模板，也可以让 AI 根据真实创作记录学习生成。
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={genreForTemplates}
            onChange={(event) => setGenreForTemplates(event.target.value)}
            className="theme-select h-9 rounded-lg px-3 text-sm font-black"
          >
            {genreOptions.map((genre) => (
              <option key={genre.id} value={genre.id}>
                {genre.name} ({genre.id})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleCreateTemplate}
            className="theme-button-secondary inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-black active:scale-95"
          >
            <Plus className="h-4 w-4" />
            新增模板
          </button>

          <button
            type="button"
            onClick={handleLearnTemplates}
            disabled={learning}
            className="theme-button-primary inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-black active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <BrainCircuit className={learning ? "h-4 w-4 animate-pulse" : "h-4 w-4"} />
            {learning ? "学习中..." : "AI 学习生成"}
          </button>
        </div>
      </div>

      <div className="p-4">
        {templatesLoading ? (
          <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center text-sm font-black text-slate-400 dark:border-white/10">
            正在加载 {genreForTemplates} 的模板库...
          </div>
        ) : templates.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                handleDeleteTemplate={handleDeleteTemplate}
                handleUpdateTemplate={handleUpdateTemplate}
                setTemplates={setTemplates}
                template={template}
                templates={templates}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center dark:border-white/10">
            <div className="text-base font-black text-slate-950 dark:text-slate-50">
              当前类型暂无模板
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
              可以新增模板，或使用 AI 学习生成。
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

type TemplateCardProps = {
  handleDeleteTemplate: DashboardAdminController["handleDeleteTemplate"];
  handleUpdateTemplate: DashboardAdminController["handleUpdateTemplate"];
  setTemplates: DashboardAdminController["setTemplates"];
  template: DashboardAdminController["templates"][number];
  templates: DashboardAdminController["templates"];
};

function TemplateCard({
  handleDeleteTemplate,
  handleUpdateTemplate,
  setTemplates,
  template,
  templates,
}: TemplateCardProps) {
  const sourceClass =
    template.source === "ai" || template.source === "learned"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-200"
      : "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300";

  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-black uppercase ${sourceClass}`}>
            {template.source}
          </span>
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            调用 {template.usageCount} 次
          </span>
        </div>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs font-black text-slate-500 dark:text-slate-400">
          <input
            type="checkbox"
            checked={template.isActive}
            onChange={(event) => {
              const next = templates.map((item) =>
                item.id === template.id ? { ...item, isActive: event.target.checked } : item,
              );
              setTemplates(next);
            }}
            className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/50 dark:border-white/20 dark:bg-white/10"
          />
          上架
        </label>
      </div>

      <textarea
        value={template.content}
        onChange={(event) => {
          const next = templates.map((item) =>
            item.id === template.id ? { ...item, content: event.target.value } : item,
          );
          setTemplates(next);
        }}
        rows={5}
        className="theme-textarea min-h-[120px] w-full resize-y rounded-lg px-3 py-2 text-sm leading-relaxed"
        placeholder="输入预设提示词..."
      />

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => void handleDeleteTemplate(template.id)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-black text-rose-500 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-400/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
          删除
        </button>
        <button
          type="button"
          onClick={() =>
            void handleUpdateTemplate(template.id, {
              content: template.content,
              isActive: template.isActive,
            })
          }
          className="theme-button-primary inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-black active:scale-95"
        >
          <Save className="h-3.5 w-3.5" />
          保存修改
        </button>
      </div>
    </article>
  );
}

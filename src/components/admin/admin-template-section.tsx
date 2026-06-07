"use client";

import { BrainCircuit, Plus, Save, Trash2 } from "lucide-react";

import { Button, SectionCard } from "@/components/design-system";
import { AdminEmptyStateCard, AdminStatusPill } from "@/components/admin/admin-console-primitives";
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
    <SectionCard
      icon={BrainCircuit}
      title="预设模板库"
      description="维护当前类型下的热门模板，也可以让 AI 根据真实创作记录学习生成。"
      variant="elevated"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={genreForTemplates}
            onChange={(event) => setGenreForTemplates(event.target.value)}
            className="theme-select h-10 rounded-[16px] px-3 text-sm font-semibold"
          >
            {genreOptions.map((genre) => (
              <option key={genre.id} value={genre.id}>
                {genre.name} ({genre.id})
              </option>
            ))}
          </select>
          <Button type="button" icon={Plus} onClick={handleCreateTemplate} className="min-h-10 px-3">
            新增模板
          </Button>
          <Button
            type="button"
            tone="ai"
            icon={BrainCircuit}
            busy={learning}
            onClick={handleLearnTemplates}
            className="min-h-10 px-3"
          >
            {learning ? "AI 学习中" : "AI 学习生成"}
          </Button>
        </div>
      }
    >
      {templatesLoading ? (
        <AdminEmptyStateCard
          title={`正在加载 ${genreForTemplates} 的模板库`}
          description="模板数据加载完成后，这里会按卡片方式展示来源、启用状态与内容编辑区。"
        />
      ) : templates.length ? (
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
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
        <AdminEmptyStateCard
          icon={BrainCircuit}
          title="当前类型暂无模板"
          description="可以先手动新增模板，也可以直接使用 AI 学习生成，让页面保持有内容而不是空白区域。"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" icon={Plus} onClick={handleCreateTemplate}>
                新增模板
              </Button>
              <Button
                type="button"
                tone="ai"
                icon={BrainCircuit}
                busy={learning}
                onClick={handleLearnTemplates}
              >
                {learning ? "AI 学习中" : "AI 学习生成"}
              </Button>
            </div>
          }
        />
      )}
    </SectionCard>
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
  const sourceTone =
    template.source === "ai" || template.source === "learned"
      ? "ai"
      : template.source === "user"
        ? "success"
        : "neutral";

  return (
    <article className="rounded-[22px] border border-[var(--theme-border)] bg-[rgba(255,255,255,0.9)] p-4 shadow-[var(--theme-shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <AdminStatusPill tone={sourceTone}>{template.source}</AdminStatusPill>
          <AdminStatusPill tone="neutral">调用 {template.usageCount} 次</AdminStatusPill>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-[var(--theme-text-secondary)]">
          <input
            type="checkbox"
            checked={template.isActive}
            onChange={(event) => {
              const next = templates.map((item) =>
                item.id === template.id ? { ...item, isActive: event.target.checked } : item,
              );
              setTemplates(next);
            }}
            className="h-4 w-4 rounded border-[var(--theme-border)] text-[var(--theme-brand-text)] focus:ring-[var(--theme-brand-500)]/50"
          />
          已启用
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
        rows={6}
        className="theme-textarea mt-4 min-h-[180px] w-full resize-y rounded-[18px] px-4 py-3 text-sm leading-7"
        placeholder="输入预设提示词..."
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-semibold text-[var(--theme-text-muted)]">
          修改后会按当前模板 ID 保存，不会影响其他类型模板。
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            tone="danger"
            icon={Trash2}
            onClick={() => {
              if (window.confirm("确定要删除这个模板吗？")) void handleDeleteTemplate(template.id);
            }}
            className="min-h-9 px-3"
          >
            删除
          </Button>
          <Button
            type="button"
            tone="ai"
            icon={Save}
            onClick={() =>
              void handleUpdateTemplate(template.id, {
                content: template.content,
                isActive: template.isActive,
              })
            }
            className="min-h-9 px-3"
          >
            保存修改
          </Button>
        </div>
      </div>
    </article>
  );
}

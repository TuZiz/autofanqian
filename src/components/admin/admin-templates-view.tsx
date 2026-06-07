"use client";

import { BrainCircuit, FileText, Plus, Save, Sparkles, Trash2 } from "lucide-react";

import { Button, SectionCard } from "@/components/design-system";
import type { AdminTemplatesPageController } from "@/lib/admin/use-admin-templates-page";

import { AdminEmptyStateCard, AdminStatusPill } from "./admin-console-primitives";
import {
  AdminLeftNav,
  AdminWorkspaceLayout,
  AdminWorkspaceShell,
} from "./admin-workspace-shell";

type AdminTemplatesViewProps = {
  templates: AdminTemplatesPageController;
};

export function AdminTemplatesView({ templates }: AdminTemplatesViewProps) {
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
    templates: templateList,
    templatesLoading,
    user,
  } = templates;

  const currentGenre =
    genreOptions.find((genre) => genre.id === genreForTemplates) ?? null;

  const templateNavItems = genreOptions.map((genre) => ({
    description: `分类 ID: ${genre.id}`,
    icon: BrainCircuit,
    id: genre.id,
    title: genre.name,
    badge: `${genre.tags.length} 标签`,
  }));

  return (
    <AdminWorkspaceShell
      breadcrumbs={[{ label: "模板库" }]}
      description="模板 / 预设模板库"
      icon={BrainCircuit}
      subtitle="维护各创作分类下的预设模板，也可以让 AI 根据真实创作记录学习生成。"
      title="预设模板库"
      userEmail={user?.email ?? ""}
      meta={
        <div className="flex flex-wrap items-center gap-2">
          <AdminStatusPill tone="neutral">
            共 {genreOptions.length} 个分类
          </AdminStatusPill>
          <AdminStatusPill tone={currentGenre ? "brand" : "warning"}>
            {currentGenre ? currentGenre.name : "未选择分类"}
          </AdminStatusPill>
          <AdminStatusPill tone={learning ? "brand" : "neutral"}>
            {learning ? "AI 学习中" : `${templateList.length} 条模板`}
          </AdminStatusPill>
          <Button
            type="button"
            icon={Plus}
            onClick={handleCreateTemplate}
            disabled={!genreForTemplates}
            className="min-h-9 px-3"
          >
            新增模板
          </Button>
          <Button
            type="button"
            tone="ai"
            icon={Sparkles}
            busy={learning}
            onClick={handleLearnTemplates}
            disabled={!genreForTemplates}
            className="min-h-9 px-3"
          >
            {learning ? "AI 学习中..." : "AI 学习生成"}
          </Button>
        </div>
      }
    >
      <AdminWorkspaceLayout
        leftNav={
          <AdminLeftNav
            activeId={genreForTemplates}
            items={templateNavItems}
            onSelect={setGenreForTemplates}
            title="模板分类"
          />
        }
      >
        <SectionCard
          title={currentGenre ? `${currentGenre.name} 模板工作区` : "模板工作区"}
          description={
            currentGenre
              ? `当前分类 ID 为 ${currentGenre.id}。模板按单条保存，不会影响其他分类。`
              : "先从左侧选择一个创作分类，再开始维护模板。"
          }
          icon={FileText}
          variant="elevated"
          actions={
            currentGenre ? (
              <div className="flex flex-wrap items-center gap-2">
                <AdminStatusPill tone="neutral">
                  {currentGenre.tags.length} 个标签
                </AdminStatusPill>
                <AdminStatusPill tone="neutral">
                  {templateList.length} 条记录
                </AdminStatusPill>
              </div>
            ) : null
          }
        >
          {!genreForTemplates ? (
            <AdminEmptyStateCard
              icon={BrainCircuit}
              title="还没有选择分类"
              description="左侧分类导航决定当前模板工作区的范围。选择后即可开始新增、学习和保存模板。"
            />
          ) : templatesLoading ? (
            <AdminEmptyStateCard
              title={`正在加载 ${genreForTemplates} 的模板库`}
              description="加载完成后，这里会展示模板标题、来源、启用状态和内容编辑区。"
            />
          ) : templateList.length ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {templateList.map((template, index) => (
                <TemplateCard
                  key={template.id}
                  handleDeleteTemplate={handleDeleteTemplate}
                  handleUpdateTemplate={handleUpdateTemplate}
                  index={index}
                  setTemplates={setTemplates}
                  template={template}
                  templates={templateList}
                />
              ))}
            </div>
          ) : (
            <AdminEmptyStateCard
              icon={BrainCircuit}
              title="当前分类暂无模板"
              description="可以先手动新增模板，也可以直接用 AI 学习生成，先把这个分类的工作区填起来。"
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button type="button" icon={Plus} onClick={handleCreateTemplate}>
                    新增模板
                  </Button>
                  <Button
                    type="button"
                    tone="ai"
                    icon={Sparkles}
                    busy={learning}
                    onClick={handleLearnTemplates}
                  >
                    {learning ? "AI 学习中..." : "AI 学习生成"}
                  </Button>
                </div>
              }
            />
          )}
        </SectionCard>
      </AdminWorkspaceLayout>
    </AdminWorkspaceShell>
  );
}

type TemplateCardProps = {
  handleDeleteTemplate: AdminTemplatesPageController["handleDeleteTemplate"];
  handleUpdateTemplate: AdminTemplatesPageController["handleUpdateTemplate"];
  index: number;
  setTemplates: AdminTemplatesPageController["setTemplates"];
  template: AdminTemplatesPageController["templates"][number];
  templates: AdminTemplatesPageController["templates"];
};

function TemplateCard({
  handleDeleteTemplate,
  handleUpdateTemplate,
  index,
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

  function updateDraft(patch: Partial<(typeof templates)[number]>) {
    const next = templates.map((item) =>
      item.id === template.id ? { ...item, ...patch } : item,
    );
    setTemplates(next);
  }

  return (
    <article className="rounded-[18px] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-4 shadow-[var(--theme-shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <AdminStatusPill tone={sourceTone}>{template.source}</AdminStatusPill>
            <AdminStatusPill tone="neutral">
              调用 {template.usageCount} 次
            </AdminStatusPill>
            <AdminStatusPill tone="neutral">
              {formatDateTime(template.updatedAt)}
            </AdminStatusPill>
          </div>
          <p className="mt-2 text-xs font-semibold text-[var(--theme-text-muted)]">
            模板 ID：{template.id}
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-[var(--theme-text-secondary)]">
          <input
            type="checkbox"
            checked={template.isActive}
            onChange={(event) => updateDraft({ isActive: event.target.checked })}
            className="h-4 w-4 rounded border-[var(--theme-border)] text-[var(--theme-brand-text)] focus:ring-[var(--theme-brand-500)]/50"
          />
          已启用
        </label>
      </div>

      <div className="mt-4 grid gap-4">
        <label className="block min-w-0">
          <span className="mb-1.5 block text-xs font-extrabold text-[var(--theme-text-muted)]">
            模板标题
          </span>
          <input
            value={template.title ?? ""}
            onChange={(event) =>
              updateDraft({ title: event.target.value || null })
            }
            placeholder={`例如：模板 ${index + 1} 的开场写法`}
            className="theme-input h-10 w-full rounded-lg px-3 text-sm font-semibold"
          />
        </label>

        <label className="block min-w-0">
          <span className="mb-1.5 block text-xs font-extrabold text-[var(--theme-text-muted)]">
            模板内容
          </span>
          <textarea
            value={template.content}
            onChange={(event) => updateDraft({ content: event.target.value })}
            rows={7}
            className="theme-textarea min-h-[220px] w-full resize-y rounded-[16px] px-4 py-3 text-sm leading-7"
            placeholder="输入预设提示词..."
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-semibold text-[var(--theme-text-muted)]">
          保存时只提交当前模板草稿，不会改动其他分类模板。
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            tone="danger"
            icon={Trash2}
            onClick={() => void handleDeleteTemplate(template.id)}
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
                title: template.title,
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

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "更新时间未知";

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

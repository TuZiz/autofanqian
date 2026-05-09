"use client";

import { Compass, Sparkles } from "lucide-react";
import { useEffect } from "react";

import type { DashboardCreateController } from "@/lib/create/use-dashboard-create";
import { cn } from "@/lib/utils";

type CreateGenreSectionProps = {
  create: DashboardCreateController;
  mode: "custom" | "template";
  onNavigateToIdea?: () => void;
};

export function CreateGenreSection({ create, mode, onNavigateToIdea }: CreateGenreSectionProps) {
  const {
    customGenre,
    customGenreLabel,
    customGenreValidationMessage,
    customTags,
    customTagsInput,
    customWorldDetails,
    handleSelectGenre,
    handleTemplateUse,
    hotTemplates,
    isCustomGenre,
    selectedGenre,
    setCustomGenreLabel,
    setCustomTagsInput,
    setCustomWorldDetails,
    visibleGenres,
  } = create;

  const hasError = create.formErrorTarget === "genre";
  const activeTemplate = isCustomGenre
    ? null
    : visibleGenres.find((genre) => genre.id === selectedGenre) ?? null;
  const customReadyCount = [
    customGenreLabel.trim().length >= 2,
    customTags.length >= 2,
    customWorldDetails.trim().length >= 18,
  ].filter(Boolean).length;

  useEffect(() => {
    if (customGenre && !selectedGenre) {
      handleSelectGenre(customGenre.id);
    }
  }, [customGenre, handleSelectGenre, selectedGenre]);

  function selectCustom() {
    if (customGenre) handleSelectGenre(customGenre.id);
  }

  return (
    <section
      id="create-genre-section"
      role="group"
      aria-describedby={hasError ? "create-form-error" : undefined}
      data-invalid={hasError ? "true" : undefined}
      className="app-compact-panel overflow-hidden"
    >
      <div className="border-b border-[var(--theme-border)] bg-[linear-gradient(90deg,rgba(16,185,129,0.07),transparent)] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <label className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-[var(--theme-text-strong)]">
              <span className="flex h-7 w-7 items-center justify-center bg-emerald-500 text-[11px] font-black text-white">
                1
              </span>
              {mode === "custom" ? "自定义创作" : "模板起步"}
            </label>
            <p className="mt-1 text-xs font-medium text-[var(--theme-text-secondary)]">
              {mode === "custom"
                ? "把题材名、标签和世界规则先定住，后面的简介与大纲会围绕这套设定展开。"
                : "模板只负责给方向，选中题材后仍要在故事简介里写出你的差异化。"}
            </p>
          </div>

          <div className="border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 py-2 text-xs font-bold text-[var(--theme-text-primary)]">
            {mode === "custom" ? `${customReadyCount}/3` : activeTemplate?.name || "未选模板"}
          </div>
        </div>

        {hasError ? (
          <p className="mt-3 text-xs font-bold tracking-wide text-red-600 dark:text-red-400">
            {create.formError}
          </p>
        ) : null}
      </div>

      <div className="p-3 sm:p-4">
        {mode === "custom" ? (
          <CustomModePanel
            customGenre={customGenre}
            customGenreLabel={customGenreLabel}
            customGenreValidationMessage={customGenreValidationMessage}
            customReadyCount={customReadyCount}
            customTagsInput={customTagsInput}
            customWorldDetails={customWorldDetails}
            isCustomGenre={isCustomGenre}
            onNavigateToIdea={onNavigateToIdea}
            onSelectCustom={selectCustom}
            setCustomGenreLabel={setCustomGenreLabel}
            setCustomTagsInput={setCustomTagsInput}
            setCustomWorldDetails={setCustomWorldDetails}
          />
        ) : (
          <TemplateModePanel
            activeTemplateId={activeTemplate?.id ?? ""}
            genres={visibleGenres}
            hasError={hasError}
            hotTemplates={hotTemplates}
            onNavigateToIdea={onNavigateToIdea}
            onSelectGenre={handleSelectGenre}
            onUseTemplate={handleTemplateUse}
          />
        )}
      </div>
    </section>
  );
}

function CustomModePanel({
  customGenre,
  customGenreLabel,
  customGenreValidationMessage,
  customReadyCount,
  customTagsInput,
  customWorldDetails,
  isCustomGenre,
  onNavigateToIdea,
  onSelectCustom,
  setCustomGenreLabel,
  setCustomTagsInput,
  setCustomWorldDetails,
}: {
  customGenre: DashboardCreateController["customGenre"];
  customGenreLabel: string;
  customGenreValidationMessage: string;
  customReadyCount: number;
  customTagsInput: string;
  customWorldDetails: string;
  isCustomGenre: boolean;
  onNavigateToIdea?: () => void;
  onSelectCustom: () => void;
  setCustomGenreLabel: (value: string) => void;
  setCustomTagsInput: (value: string) => void;
  setCustomWorldDetails: (value: string) => void;
}) {
  return (
    <section className="border border-emerald-200/70 bg-[linear-gradient(180deg,rgba(240,253,247,0.66),rgba(255,255,255,1))] dark:border-emerald-500/20 dark:bg-[var(--theme-surface-solid)]">
      <button
        type="button"
        aria-pressed={isCustomGenre}
        onClick={onSelectCustom}
        className="block w-full cursor-pointer border-b border-emerald-100/80 px-4 py-3 text-left dark:border-emerald-500/15"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-emerald-500 text-xl text-white shadow-sm shadow-emerald-500/20">
            {customGenre?.icon ?? "✍"}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex border border-emerald-200/80 bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                主入口
              </span>
              <span className="inline-flex bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-700 dark:text-emerald-300">
                更适合原创
              </span>
            </div>
            <h3 className="mt-1.5 text-xl font-extrabold tracking-tight text-[var(--theme-text-strong)]">
              自定义
            </h3>
            <p className="mt-0.5 text-xs font-medium leading-5 text-[var(--theme-text-secondary)]">
              适合你已经有自己的世界规则、设定和风格。
            </p>
          </div>

          <div className="hidden shrink-0 border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 py-1.5 text-xs font-bold text-[var(--theme-text-primary)] md:block">
            {isCustomGenre ? "正在编辑" : "点击切换"}
          </div>
        </div>
      </button>

      <div className="px-4 pb-4 pt-3">
        <div className="mb-3 flex items-center justify-between border border-emerald-100/80 bg-white/80 px-3 py-2.5 dark:border-emerald-500/15 dark:bg-emerald-500/5">
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--theme-text-primary)]">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            自定义完成度
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden bg-emerald-100 dark:bg-emerald-500/20">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${(customReadyCount / 3) * 100}%` }}
              />
            </div>
            <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-300">{customReadyCount}/3</span>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <label className="block border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-3">
            <span className="block text-sm font-bold text-[var(--theme-text-primary)]">题材命名</span>
            <input
              value={customGenreLabel}
              onChange={(event) => setCustomGenreLabel(event.target.value)}
              placeholder="例如：赛博修仙"
              className="mt-2 h-10 w-full border-none bg-[var(--theme-surface-overlay)] px-3 text-sm font-bold text-[var(--theme-text-strong)] outline-none ring-1 ring-[var(--theme-border)] focus:ring-2 focus:ring-emerald-500/40"
            />
          </label>

          <label className="block border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-3">
            <span className="block text-sm font-bold text-[var(--theme-text-primary)]">标签</span>
            <input
              value={customTagsInput}
              onChange={(event) => setCustomTagsInput(event.target.value)}
              placeholder="例如：宗门经营 群像"
              className="mt-2 h-10 w-full border-none bg-[var(--theme-surface-overlay)] px-3 text-sm font-bold text-[var(--theme-text-strong)] outline-none ring-1 ring-[var(--theme-border)] focus:ring-2 focus:ring-emerald-500/40"
            />
          </label>

          <label className="block border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-3">
            <span className="block text-sm font-bold text-[var(--theme-text-primary)]">世界规则</span>
            <textarea
              value={customWorldDetails}
              onChange={(event) => setCustomWorldDetails(event.target.value)}
              rows={2}
              placeholder="一句话写清规则或核心冲突"
              className="mt-2 min-h-20 w-full resize-none border-none bg-[var(--theme-surface-overlay)] px-3 py-2.5 text-sm font-medium leading-5 text-[var(--theme-text-strong)] outline-none ring-1 ring-[var(--theme-border)] focus:ring-2 focus:ring-emerald-500/40"
            />
          </label>
        </div>

        {customGenreValidationMessage ? (
          <p className="mt-3 text-xs font-bold tracking-wide text-red-600 dark:text-red-400">
            {customGenreValidationMessage}
          </p>
        ) : null}

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onNavigateToIdea}
            className="border border-zinc-900 bg-zinc-950 px-4 py-2 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white dark:bg-white dark:text-zinc-950"
          >
            继续填写简介
          </button>
        </div>
      </div>
    </section>
  );
}

function TemplateModePanel({
  activeTemplateId,
  genres,
  hasError,
  hotTemplates,
  onNavigateToIdea,
  onSelectGenre,
  onUseTemplate,
}: {
  activeTemplateId: string;
  genres: DashboardCreateController["visibleGenres"];
  hasError: boolean;
  hotTemplates: DashboardCreateController["hotTemplates"];
  onNavigateToIdea?: () => void;
  onSelectGenre: DashboardCreateController["handleSelectGenre"];
  onUseTemplate: DashboardCreateController["handleTemplateUse"];
}) {
  const activeGenre = genres.find((genre) => genre.id === activeTemplateId);

  return (
    <section className="border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-5">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--theme-divider)] pb-4">
        <div className="flex items-center gap-2 text-sm font-bold text-[var(--theme-text-strong)]">
          <Compass className="h-4 w-4 text-[var(--theme-text-muted)]" />
          模板题材
        </div>
        <span className="inline-flex border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] px-3 py-1 text-xs font-semibold text-[var(--theme-text-muted)]">
          辅助入口
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {genres.map((genre) => {
          const active = activeTemplateId === genre.id;
          return (
            <button
              key={genre.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelectGenre(genre.id)}
              className={cn(
                "group relative cursor-pointer overflow-hidden border p-4 text-left transition-all duration-200",
                active
                  ? "border-emerald-300/80 bg-[linear-gradient(180deg,rgba(240,253,247,0.9),rgba(255,255,255,1))] shadow-[inset_4px_0_0_rgba(16,185,129,0.65)] dark:border-emerald-500/25 dark:bg-emerald-500/10"
                  : hasError
                    ? "border-red-200 bg-red-50/60 dark:border-red-500/20 dark:bg-red-500/5"
                    : "border-[var(--theme-border)] bg-[var(--theme-surface-solid)] hover:border-emerald-200 hover:shadow-sm",
              )}
            >
              <div className="relative z-10 flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center border text-2xl shadow-sm",
                    active
                      ? "border-emerald-200/80 bg-emerald-100/70 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                      : "border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] text-[var(--theme-text-strong)]",
                  )}
                >
                  {genre.icon}
                </div>

                <div className="min-w-0">
                  <h4 className="text-base font-extrabold tracking-tight text-[var(--theme-text-strong)]">
                    {genre.name}
                  </h4>
                  <p className="mt-1 text-xs font-semibold leading-5 text-[var(--theme-text-secondary)]">
                    {genre.tags.slice(0, 3).join(" / ")}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] px-4 py-3 text-xs font-medium leading-5 text-[var(--theme-text-muted)]">
        选完模板后，继续去故事简介里写主角、冲突和差异化设定。
      </div>

      <div className="mt-4 overflow-hidden border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--theme-divider)] px-4 py-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">
              快速灵感
            </div>
            <div className="mt-1 text-sm font-extrabold text-[var(--theme-text-strong)]">
              {activeGenre ? `${activeGenre.name} 可用灵感` : "先选择一个模板题材"}
            </div>
          </div>
          <span className="border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-2.5 py-1 text-[11px] font-bold text-[var(--theme-text-muted)]">
            一键填入简介
          </span>
        </div>

        {!activeGenre ? (
          <div className="px-4 py-5 text-sm font-semibold text-[var(--theme-text-secondary)]">
            左侧只负责切换模块，这里才选择具体模板。选中后会出现可直接写入简介的灵感。
          </div>
        ) : hotTemplates.length === 0 ? (
          <div className="px-4 py-5 text-sm font-semibold text-[var(--theme-text-secondary)]">
            当前模板暂无快速灵感，直接在故事简介里写你的主角和冲突即可。
          </div>
        ) : (
          <div className="grid gap-2 p-3 md:grid-cols-2">
            {hotTemplates.slice(0, 4).map((template, index) => (
              <button
                key={template.id}
                type="button"
                onClick={() => {
                  void onUseTemplate(template);
                  onNavigateToIdea?.();
                }}
                className="group border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 py-3 text-left transition-all hover:border-emerald-300 hover:bg-emerald-50/40 dark:hover:border-emerald-500/20 dark:hover:bg-emerald-500/5"
              >
                <div className="mb-2 inline-flex border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                  灵感 {index + 1}
                </div>
                <p className="line-clamp-3 text-xs font-semibold leading-5 text-[var(--theme-text-secondary)] transition-colors group-hover:text-[var(--theme-text-strong)]">
                  {template.content}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onNavigateToIdea}
          className="border border-zinc-900 bg-zinc-950 px-4 py-2 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white dark:bg-white dark:text-zinc-950"
        >
          继续填写简介
        </button>
      </div>
    </section>
  );
}

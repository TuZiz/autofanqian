"use client";

import type { DashboardCreateController } from "@/lib/create/use-dashboard-create";
import { cn } from "@/lib/utils";

type CreateGenreSectionProps = {
  create: DashboardCreateController;
};

export function CreateGenreSection({ create }: CreateGenreSectionProps) {
  const {
    customGenre,
    customGenreLabel,
    customTags,
    customTagsInput,
    handleSelectGenre,
    isCustomGenre,
    selectedGenre,
    setCustomGenreLabel,
    setCustomTagsInput,
    setIdeaAnalysis,
    visibleGenres,
  } = create;
  const hasError = create.formErrorTarget === "genre";

  return (
    <div
      id="create-genre-section"
      role="group"
      aria-describedby={hasError ? "create-form-error" : undefined}
      data-invalid={hasError ? "true" : undefined}
      className="flex flex-col gap-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <label className="text-xl font-black tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <span className="text-blue-500">*</span>
            选择世界类型
          </label>
          <p className="mt-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            选择一个基础框架，AI 会根据类型设定特定的世界观规则
          </p>
        </div>

        {customGenre ? (
          <button
            type="button"
            aria-pressed={selectedGenre === customGenre.id}
            onClick={() => handleSelectGenre(customGenre.id)}
            className={cn(
              "group relative flex h-12 cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-full px-6 font-bold transition-all ring-1",
              selectedGenre === customGenre.id
                ? "bg-blue-500 text-white ring-blue-500 shadow-lg shadow-blue-500/20"
                : hasError
                  ? "bg-red-50 text-red-600 ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20"
                : "bg-white text-zinc-700 ring-zinc-200 hover:bg-zinc-50 hover:shadow-md dark:bg-zinc-800/50 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-zinc-800"
            )}
          >
            <span className="text-lg">{customGenre.icon}</span>
            <span>{customGenre.name}</span>
          </button>
        ) : null}
      </div>

      {isCustomGenre ? (
        <div className="mb-4 grid gap-6 rounded-[24px] border border-blue-100 bg-blue-50/50 p-6 shadow-inner dark:border-blue-500/20 dark:bg-blue-500/5 md:grid-cols-[1fr_1.5fr]">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-zinc-700 dark:text-zinc-300">自定义类型</span>
            <input
              value={customGenreLabel}
              onChange={(event) => {
                setCustomGenreLabel(event.target.value.slice(0, 32));
                setIdeaAnalysis(null);
              }}
              placeholder="例如：修仙、悬疑、末日"
              className="h-12 w-full rounded-xl border-none bg-white px-4 text-sm font-bold text-zinc-900 shadow-sm ring-1 ring-zinc-200 outline-none focus:ring-2 focus:ring-blue-500 dark:bg-black/40 dark:text-white dark:ring-white/10"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-zinc-700 dark:text-zinc-300">核心标签</span>
            <input
              value={customTagsInput}
              onChange={(event) => {
                setCustomTagsInput(event.target.value.slice(0, 160));
                setIdeaAnalysis(null);
              }}
              placeholder="例如：系统 重生 废柴逆袭 (空格分隔)"
              className="h-12 w-full rounded-xl border-none bg-white px-4 text-sm font-bold text-zinc-900 shadow-sm ring-1 ring-zinc-200 outline-none focus:ring-2 focus:ring-blue-500 dark:bg-black/40 dark:text-white dark:ring-white/10"
            />
            <div className="mt-3 flex min-h-6 flex-wrap gap-2">
              {(customTags.length ? customTags : ["系统", "重生", "废柴逆袭"]).map((tag) => (
                <span
                  key={tag}
                  className={cn(
                    "inline-flex rounded-lg px-3 py-1.5 text-xs font-black tracking-wide",
                    customTags.length
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                      : "bg-zinc-100 text-zinc-500 dark:bg-white/5 dark:text-zinc-400"
                  )}
                >
                  {tag}
                </span>
              ))}
            </div>
          </label>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {visibleGenres.map((genre) => {
          const active = selectedGenre === genre.id;
          return (
            <button
              key={genre.id}
              type="button"
              aria-pressed={active}
              onClick={() => handleSelectGenre(genre.id)}
              className={cn(
                "group relative cursor-pointer overflow-hidden rounded-[24px] p-5 text-left transition-all duration-300",
                active
                  ? "bg-blue-500 shadow-lg shadow-blue-500/20 ring-1 ring-blue-500 scale-[1.02]"
                  : hasError
                    ? "bg-red-50 ring-1 ring-red-200 dark:bg-red-500/5 dark:ring-red-500/20"
                  : "bg-zinc-50/80 ring-1 ring-zinc-200 hover:bg-white hover:shadow-xl hover:shadow-black/5 hover:ring-zinc-300 dark:bg-white/5 dark:ring-white/10 dark:hover:bg-white/10"
              )}
            >
              <div className="relative z-10 flex flex-col items-start gap-4">
                <div className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-2xl text-2xl shadow-inner transition-colors",
                  active 
                    ? "bg-white/20 text-white" 
                    : "bg-white text-zinc-900 dark:bg-white/10 dark:text-white"
                )}>
                  {genre.icon}
                </div>
                <div>
                  <h4 className={cn(
                    "text-base font-black tracking-tight",
                    active ? "text-white" : "text-zinc-900 dark:text-white"
                  )}>
                    {genre.name}
                  </h4>
                  <p className={cn(
                    "mt-1.5 text-xs font-semibold leading-relaxed line-clamp-2",
                    active ? "text-blue-100" : "text-zinc-500 dark:text-zinc-400"
                  )}>
                    {genre.tags.slice(0, 3).join(" · ")}
                  </p>
                </div>
              </div>
              
              {active && (
                <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-[20px]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

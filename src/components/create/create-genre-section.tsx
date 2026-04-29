"use client";

import type { DashboardCreateController } from "@/lib/create/use-dashboard-create";

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

  return (
    <div>
      <label className="theme-heading mb-3 block text-sm font-semibold">
        <span className="mr-1 text-rose-500">*</span>
        选择小说类型
      </label>

      {customGenre ? (
        <div className="mb-4 flex justify-center md:-mt-8">
          <button
            type="button"
            aria-pressed={selectedGenre === customGenre.id}
            onClick={() => handleSelectGenre(customGenre.id)}
            className={[
              "glass-card group relative flex min-h-[56px] w-full max-w-[15rem] cursor-pointer items-center justify-center overflow-hidden rounded-lg px-4 text-center",
              "transition-colors duration-200 hover:border-slate-300 hover:bg-slate-50/70",
              selectedGenre === customGenre.id
                ? "ring-1 ring-emerald-400/60 bg-emerald-500/10 dark:ring-emerald-300/40"
                : "hover:ring-1 hover:ring-emerald-300/40",
            ].join(" ")}
          >
            <span className="relative z-10 inline-flex items-center gap-2.5">
              <span className="theme-chip flex h-8 w-8 items-center justify-center rounded-xl text-base">
                {customGenre.icon}
              </span>
              <span className="text-left">
                <span className="theme-heading block text-sm font-semibold">
                  {customGenre.name}
                </span>
                <span className="theme-subheading mt-1 block text-xs">输入类型和标签</span>
              </span>
            </span>
          </button>
        </div>
      ) : null}

      {isCustomGenre ? (
        <div className="mb-5 grid gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm dark:border-emerald-500/20 dark:bg-emerald-500/10 md:grid-cols-[0.8fr_1.2fr]">
          <label className="block">
            <span className="theme-heading mb-1.5 block text-xs font-semibold">类型</span>
            <input
              value={customGenreLabel}
              onChange={(event) => {
                setCustomGenreLabel(event.target.value.slice(0, 32));
                setIdeaAnalysis(null);
              }}
              placeholder="例如：修仙、悬疑、末日"
              className="theme-input w-full rounded-xl px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="theme-heading mb-1.5 block text-xs font-semibold">标签</span>
            <input
              value={customTagsInput}
              onChange={(event) => {
                setCustomTagsInput(event.target.value.slice(0, 160));
                setIdeaAnalysis(null);
              }}
              placeholder="例如：系统 重生 废柴逆袭"
              className="theme-input w-full rounded-xl px-3 py-2 text-sm"
            />
            <div className="mt-2 flex min-h-6 flex-wrap gap-1.5">
              {(customTags.length ? customTags : ["系统", "重生", "废柴逆袭"]).map((tag) => (
                <span
                  key={tag}
                  className={[
                    "inline-flex rounded-md px-2.5 py-1 text-[11px] font-semibold",
                    customTags.length
                      ? "theme-chip-brand"
                      : "theme-chip text-[var(--theme-muted)]",
                  ].join(" ")}
                >
                  {tag}
                </span>
              ))}
            </div>
          </label>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {visibleGenres.map((genre) => {
          const active = selectedGenre === genre.id;
          return (
            <button
              key={genre.id}
              type="button"
              aria-pressed={active}
              onClick={() => handleSelectGenre(genre.id)}
              className={[
                  "glass-card group relative cursor-pointer overflow-hidden rounded-lg p-4 text-left",
                "transition-colors duration-200 hover:border-slate-300 hover:bg-slate-50/70",
                active
                  ? "ring-1 ring-emerald-400/60 bg-emerald-500/10 dark:ring-emerald-300/40"
                  : "hover:ring-1 hover:ring-emerald-300/40",
              ].join(" ")}
            >
              <div className="relative z-10 flex items-start gap-3">
                <div className="theme-chip flex h-10 w-10 items-center justify-center rounded-xl text-lg">
                  {genre.icon}
                </div>
                <div>
                  <h4 className="theme-heading text-sm font-semibold">{genre.name}</h4>
                  <p className="theme-subheading mt-1 text-xs">
                    {genre.tags.slice(0, 4).join(" · ")}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

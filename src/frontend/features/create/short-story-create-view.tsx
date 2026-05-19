"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Feather,
  Loader2,
  PenLine,
  Wand2,
} from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { SHORT_STORY_ENDING_LABELS } from "@/shared/schemas/short-story";
import type { ShortStoryCreateController } from "@/lib/create/use-short-story-create";
import { cn } from "@/lib/utils";

import { CreateModeSwitch } from "./create-mode-switch";

const GENRE_PRESETS = ["都市情感", "悬疑反转", "科幻寓言", "奇幻冒险", "现实故事", "青春成长"];
const SHORT_STEPS = [
  { label: "确定创意", text: "题材、标签和核心钩子" },
  { label: "拆成场景", text: "生成 3-12 个写作段落" },
  { label: "进入正文", text: "复用作品页继续润色" },
];

type ShortStoryCreateViewProps = {
  create: ShortStoryCreateController;
};

export function ShortStoryCreateView({ create }: ShortStoryCreateViewProps) {
  const stageText =
    create.stage === "outline"
      ? "AI 正在整理短篇结构..."
      : create.stage === "work"
        ? "正在创建短篇作品和场景..."
        : create.stage === "done"
          ? "创建完成，即将进入作品页。"
          : "填写创意后，一次生成短篇结构和写作场景。";

  return (
    <main className="create-modern-shell min-h-dvh w-full overflow-x-clip bg-[#f7f8fa] text-slate-900">
      <div className="pointer-events-none fixed inset-0 opacity-[0.14] [background-image:radial-gradient(circle_at_20%_18%,rgba(14,165,233,0.10),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(99,102,241,0.09),transparent_28%),linear-gradient(to_right,rgba(51,65,85,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(51,65,85,0.035)_1px,transparent_1px)] [background-size:auto,auto,56px_56px,56px_56px]" />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-[1480px] flex-col">
        <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/92 backdrop-blur-xl">
          <div className="grid min-h-[68px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-2 sm:px-4 lg:px-[18px]">
            <div className="flex min-w-0 items-center gap-3.5">
              <Link
                href="/dashboard"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/70 bg-white text-slate-500 transition-all duration-200 hover:-translate-x-0.5 hover:border-slate-300 hover:text-slate-900"
                title="返回控制台"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div className="min-w-0">
                <h1 className="truncate text-[22px] font-extrabold tracking-tight text-slate-950">
                  短篇小说
                </h1>
                <p className="hidden truncate text-[13px] font-medium text-slate-500 sm:block">
                  单篇结构、场景拆分、快速进入正文写作
                </p>
              </div>
              <div className="hidden md:block">
                <CreateModeSwitch active="short" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-1.5">
              <ThemeToggle className="h-10 w-10 rounded-full border border-slate-200/70 bg-white text-slate-500 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950" />
            </div>
          </div>
        </header>

        <div className="flex-1 px-3.5 pb-16 pt-3.5 sm:px-4 lg:px-[18px]">
          <div className="mb-3 md:hidden">
            <CreateModeSwitch active="short" />
          </div>

          <form
            onSubmit={create.handleSubmit}
            noValidate
            className="grid gap-3 min-[1080px]:grid-cols-[260px_minmax(0,1fr)_300px] min-[1080px]:items-start min-[1440px]:grid-cols-[270px_minmax(0,1fr)_310px]"
          >
            <aside className="rounded-[18px] border border-slate-200/70 bg-white/88 p-4 shadow-[0_18px_44px_-36px_rgba(20,32,29,0.38)] backdrop-blur-xl">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl create-accent text-white shadow-[0_14px_24px_-18px_rgba(20,32,29,0.78)]">
                  <Feather className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Short Story
                  </div>
                  <h2 className="text-base font-extrabold text-slate-950">短篇模式</h2>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {SHORT_STEPS.map((item, index) => (
                  <div
                    key={item.label}
                    className="flex items-start gap-2.5 rounded-2xl border border-slate-200/70 create-tint px-3 py-2.5"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-black text-slate-500 ring-1 ring-slate-200">
                      {index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-extrabold text-slate-800">
                        {item.label}
                      </span>
                      <span className="mt-0.5 block text-[11px] font-medium leading-4 text-slate-500">
                        {item.text}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </aside>

            <section className="min-w-0 rounded-[20px] border border-slate-200/70 bg-white/94 p-4 shadow-[0_18px_44px_-36px_rgba(20,32,29,0.38)] sm:p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                    01 / 创意设定
                  </div>
                  <h2 className="mt-1 text-[24px] font-extrabold tracking-tight text-slate-950">
                    生成一篇完整短篇
                  </h2>
                </div>
                <div className="inline-flex items-center rounded-full border border-slate-200 create-tint px-3 py-2 text-xs font-bold text-slate-500">
                  {create.ideaCount}/2000
                </div>
              </div>

              <div className="grid gap-4">
                <div>
                  <FieldLabel label="短篇类型" />
                  <div className="flex flex-wrap gap-2">
                    {GENRE_PRESETS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => create.setGenre(item)}
                        className={cn(
                          "h-9 rounded-xl border px-3 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5",
                          create.genre === item
                            ? "border-transparent create-accent text-white shadow-[0_14px_24px_-18px_rgba(20,32,29,0.78)]"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-[var(--create-tint)] hover:text-slate-950",
                        )}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  <input
                    value={create.genre}
                    onChange={(event) => create.setGenre(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 create-tint px-3 text-sm font-bold text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[var(--create-accent)] focus:bg-white focus:ring-4 focus:ring-[var(--create-focus)]"
                    placeholder="也可以手动输入短篇类型"
                    maxLength={64}
                  />
                  <FieldError message={create.fieldErrors.genre} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel label="标签" />
                    <input
                      value={create.tagsText}
                      onChange={(event) => create.setTagsText(event.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 create-tint px-3 text-sm font-bold text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[var(--create-accent)] focus:bg-white focus:ring-4 focus:ring-[var(--create-focus)]"
                      placeholder="例如：反转 治愈 雨夜"
                    />
                    <FieldError message={create.fieldErrors.tags} />
                  </div>

                  <div>
                    <FieldLabel label="目标字数" />
                    <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-2">
                      <select
                        value={create.targetPreset}
                        onChange={(event) => create.setTargetPreset(event.target.value)}
                        className="h-11 rounded-xl border border-slate-200 create-tint px-3 text-sm font-bold text-slate-900 outline-none transition-all duration-200 focus:border-[var(--create-accent)] focus:bg-white focus:ring-4 focus:ring-[var(--create-focus)]"
                      >
                        {create.wordOptions.map((words) => (
                          <option key={words} value={words}>
                            {words.toLocaleString("zh-CN")} 字
                          </option>
                        ))}
                        <option value="custom">自定义</option>
                      </select>
                      <input
                        value={create.customWords}
                        onChange={(event) => create.setCustomWords(event.target.value.replace(/[^\d]/g, "").slice(0, 5))}
                        disabled={create.targetPreset !== "custom"}
                        className="h-11 rounded-xl border border-slate-200 create-tint px-3 text-sm font-bold tabular-nums text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[var(--create-accent)] focus:bg-white focus:ring-4 focus:ring-[var(--create-focus)] disabled:opacity-45"
                        placeholder="1000-50000"
                      />
                    </div>
                    <FieldError message={create.fieldErrors.targetWords || create.fieldErrors.customWords} />
                  </div>
                </div>

                <SegmentGroup
                  label="叙事风格"
                  options={create.styleOptions}
                  value={create.style}
                  onChange={create.setStyle}
                />
                <SegmentGroup
                  label="叙事视角"
                  options={create.povOptions}
                  value={create.pov}
                  onChange={create.setPov}
                />
                <div>
                  <FieldLabel label="结局倾向" />
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {create.endingOptions.map((ending) => (
                      <button
                        key={ending}
                        type="button"
                        onClick={() => create.setEndingType(ending)}
                        className={cn(
                          "h-10 rounded-xl border px-3 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5",
                          create.endingType === ending
                            ? "border-transparent create-accent text-white shadow-[0_14px_24px_-18px_rgba(20,32,29,0.78)]"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-[var(--create-tint)] hover:text-slate-950",
                        )}
                      >
                        {SHORT_STORY_ENDING_LABELS[ending]}
                      </button>
                    ))}
                  </div>
                  <FieldError message={create.fieldErrors.endingType} />
                </div>

                <div>
                  <FieldLabel label="核心创意" />
                  <textarea
                    value={create.idea}
                    onChange={(event) => create.setIdea(event.target.value.slice(0, 2000))}
                    className="min-h-[178px] w-full resize-y rounded-2xl border border-slate-200 create-tint px-4 py-3 text-[15px] font-semibold leading-7 text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[var(--create-accent)] focus:bg-white focus:ring-4 focus:ring-[var(--create-focus)]"
                    placeholder="写清主角、冲突、反转或情绪落点。至少 10 个字。"
                  />
                  <FieldError message={create.fieldErrors.idea} />
                </div>
              </div>
            </section>

            <aside className="rounded-[20px] border border-slate-200/70 bg-white/94 p-4 shadow-[0_18px_44px_-36px_rgba(20,32,29,0.38)] min-[1080px]:sticky min-[1080px]:top-[82px]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl create-tint text-slate-700 ring-1 ring-slate-200">
                  <Wand2 className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Create
                  </div>
                  <h2 className="text-base font-extrabold text-slate-950">生成配置</h2>
                </div>
              </div>

              <div className="mt-4 space-y-2.5 rounded-2xl border border-slate-200 create-tint p-3 text-xs font-bold text-slate-600">
                <SummaryRow label="类型" value={create.genre || "未填写"} />
                <SummaryRow label="字数" value={`${Number.isFinite(create.targetWords) ? create.targetWords.toLocaleString("zh-CN") : "-"} 字`} />
                <SummaryRow label="风格" value={create.style} />
                <SummaryRow label="视角" value={create.pov} />
                <SummaryRow label="结局" value={SHORT_STORY_ENDING_LABELS[create.endingType]} />
              </div>

              {create.formError ? (
                <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-bold leading-6 text-red-600">
                  {create.formError}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={create.busy}
                className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full create-accent px-4 text-sm font-extrabold text-white shadow-[0_16px_28px_-20px_rgba(20,32,29,0.86)] transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-wait disabled:opacity-65"
              >
                {create.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
                {create.busy ? "生成中..." : "生成短篇作品"}
              </button>

              <p className="mt-3 text-center text-xs font-semibold leading-5 text-slate-500">
                {stageText}
              </p>
            </aside>
          </form>
        </div>
      </div>
    </main>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <label className="mb-2 block text-sm font-extrabold text-slate-800">{label}</label>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1.5 rounded-xl bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-500">
      <CheckCircle2 className="h-3.5 w-3.5" />
      {message}
    </p>
  );
}

function SegmentGroup<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: readonly T[];
  value: T;
}) {
  return (
    <div>
      <FieldLabel label={label} />
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              "h-9 rounded-xl border px-3 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5",
              value === option
                ? "border-transparent create-accent text-white shadow-[0_14px_24px_-18px_rgba(20,32,29,0.78)]"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-[var(--create-tint)] hover:text-slate-950",
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-400">{label}</span>
      <span className="truncate text-right text-slate-800">{value}</span>
    </div>
  );
}



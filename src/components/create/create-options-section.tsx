"use client";

import { extractBookName } from "@/lib/create/dashboard-create-utils";
import type { DashboardCreateController } from "@/lib/create/use-dashboard-create";

type CreateOptionsSectionProps = {
  create: DashboardCreateController;
};

export function CreateOptionsSection({ create }: CreateOptionsSectionProps) {
  const {
    dnaBookTitle,
    dnaStyles,
    isAdmin,
    platform,
    platforms,
    setDnaBookTitle,
    setPlatform,
    setWords,
    wordOptions,
    words,
  } = create;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="space-y-8">
        <div>
          <label className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
            目标平台
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              (可选，按平台风格创作)
            </span>
          </label>
          <select
            value={platform}
            onChange={(event) => setPlatform(event.target.value)}
            className="h-14 w-full cursor-pointer appearance-none rounded-[16px] bg-zinc-50 px-5 text-[15px] font-bold text-zinc-900 ring-1 ring-zinc-200 outline-none focus:ring-2 focus:ring-blue-500 dark:bg-black/40 dark:text-white dark:ring-white/10"
          >
            <option value="">选择目标发布平台</option>
            {platforms.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-3 block text-sm font-bold text-zinc-900 dark:text-white">
            目标字数
          </label>
          <select
            value={words}
            onChange={(event) => setWords(event.target.value)}
            className="h-14 w-full cursor-pointer appearance-none rounded-[16px] bg-zinc-50 px-5 text-[15px] font-bold text-zinc-900 ring-1 ring-zinc-200 outline-none focus:ring-2 focus:ring-blue-500 dark:bg-black/40 dark:text-white dark:ring-white/10"
          >
            {wordOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
            仿书 DNA
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
              测试中功能
            </span>
          </label>
          <input
            value={dnaBookTitle}
            list="dna-book-suggestions"
            disabled={!isAdmin}
            onChange={(event) => setDnaBookTitle(event.target.value)}
            placeholder={
              isAdmin
                ? "输入或选择参考书名（例如：诡秘之主）"
                : "内测中：仅管理员可使用"
            }
            className="h-14 w-full rounded-[16px] bg-zinc-50 px-5 text-[15px] font-bold text-zinc-900 ring-1 ring-zinc-200 outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-black/40 dark:text-white dark:ring-white/10"
          />
          <datalist id="dna-book-suggestions">
            {dnaStyles.map((item) => {
              const name = extractBookName(item.label);
              return (
                <option key={item.id} value={name}>
                  {item.label}
                </option>
              );
            })}
          </datalist>
        </div>

        <div className="rounded-[16px] bg-blue-50/50 px-5 py-4 text-[13px] font-medium leading-relaxed text-blue-800 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-200 dark:ring-blue-500/20">
          生成大纲时会尝试进行网络检索，并抽象其写法与结构，不复刻原作剧情。
        </div>
      </div>
    </div>
  );
}

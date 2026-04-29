"use client";

import Link from "next/link";

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
    submitBusy,
    wordOptions,
    words,
  } = create;

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="space-y-6">
          <div>
            <label className="theme-heading mb-2 block text-sm font-semibold">
              目标平台{" "}
              <span className="theme-muted text-xs font-normal">(可选，按平台风格创作)</span>
            </label>
            <select
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
              className="theme-select w-full cursor-pointer appearance-none rounded-lg px-4 py-3"
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
            <label className="theme-heading mb-2 block text-sm font-semibold">目标字数</label>
            <select
              value={words}
              onChange={(event) => setWords(event.target.value)}
              className="theme-select w-full cursor-pointer appearance-none rounded-lg px-4 py-3"
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
            <label className="theme-heading mb-2 block text-sm font-semibold">
              仿书 DNA{" "}
              <span className="theme-muted text-xs font-normal">(内测功能，仅管理员可用)</span>
            </label>
            <input
              value={dnaBookTitle}
              list="dna-book-suggestions"
              disabled={!isAdmin}
              onChange={(event) => setDnaBookTitle(event.target.value)}
              placeholder={
                isAdmin
                  ? "输入或选择参考书名（例如：诡秘之主 / 凡人修仙传 / 庆余年）"
                  : "内测中：仅管理员可使用"
              }
              className="theme-input w-full rounded-lg px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
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

          <div className="theme-inline-note rounded-lg px-4 py-3 text-xs leading-relaxed">
            生成大纲时会尝试进行网络检索，并抽象其写法与结构，不复刻原作剧情。
          </div>
        </div>
      </div>

      <div className="theme-divider flex flex-wrap justify-end gap-3 border-t pt-6">
        <Link
          href="/dashboard"
          className="theme-button-secondary inline-flex items-center justify-center rounded-lg px-6 py-2.5 text-sm font-semibold"
        >
          取消
        </Link>
        <button
          type="submit"
          disabled={submitBusy}
          className="theme-button-primary inline-flex cursor-pointer items-center justify-center rounded-lg px-7 py-2.5 text-sm font-semibold disabled:cursor-not-allowed"
        >
          {submitBusy ? "生成中..." : "生成大纲"}
        </button>
      </div>
    </>
  );
}

"use client";

import { ChevronDown, Settings2 } from "lucide-react";

import { extractBookName } from "@/lib/create/dashboard-create-utils";
import type { DashboardCreateController } from "@/lib/create/use-dashboard-create";
import { cn } from "@/lib/utils";

import { SubmitOutlineButton } from "./submit-outline-button";

export function CreateActionSidebar({
  className,
  create,
}: {
  className?: string;
  create: DashboardCreateController;
}) {
  return (
    <aside
      className={cn(
        "w-full min-w-0 self-start min-[1120px]:sticky min-[1120px]:top-[64px]",
        className,
      )}
    >
      <div className="space-y-3">
        <div className="rounded-2xl border border-slate-200/70 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <SubmitOutlineButton create={create} sidebar />
          <p
            className={cn(
              "mt-2 text-center text-xs font-medium leading-5",
              create.canSubmitOutline ? "text-slate-700" : "text-slate-500",
            )}
          >
            {create.submitBlockedReason || "设定完整后生成可继续编辑的大纲"}
          </p>
        </div>

        <CompactCreateOptions create={create} />
      </div>
    </aside>
  );
}

function CompactCreateOptions({
  create,
}: {
  create: DashboardCreateController;
}) {
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
    <div id="create-options-section" className="rounded-2xl border border-slate-200/70 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
          <Settings2 className="h-3.5 w-3.5" />
        </span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Config
          </p>
          <h2 className="text-sm font-bold text-slate-950">
            生成配置
          </h2>
        </div>
      </div>

      <div className="space-y-2.5">
        <SelectField
          label="目标平台"
          value={platform}
          onChange={setPlatform}
          options={[{ id: "", label: "请选择目标平台" }, ...platforms]}
          selectId="create-platform-select"
        />

        <SelectField
          label="目标字数"
          value={words}
          onChange={setWords}
          options={[{ id: "", label: "请选择目标字数" }, ...wordOptions]}
          selectId="create-words-select"
        />

        <label className="block">
          <span className="text-xs font-bold text-slate-600">
            仿书 DNA
          </span>
          <div className="relative mt-1.5">
            <input
              value={dnaBookTitle}
              list="create-sidebar-dna-book-suggestions"
              disabled={!isAdmin}
              onChange={(event) => setDnaBookTitle(event.target.value)}
              placeholder={
                isAdmin ? "输入参考作品名称" : "仅管理员可用"
              }
              className="h-10 w-full rounded-xl border border-slate-200/80 bg-slate-50 px-3 pr-9 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-950/10 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <datalist id="create-sidebar-dna-book-suggestions">
            {dnaStyles.map((item) => {
              const name = extractBookName(item.label);
              return (
                <option key={item.id} value={name}>
                  {item.label}
                </option>
              );
            })}
          </datalist>
        </label>
      </div>
    </div>
  );
}

function SelectField({
  label,
  onChange,
  options,
  selectId,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ id: string; label: string }>;
  selectId?: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-600">
        {label}
      </span>
      <div className="relative mt-1.5">
        <select
          id={selectId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-slate-200/80 bg-slate-50 px-3 pr-9 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-950/10"
        >
          {options.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      </div>
    </label>
  );
}

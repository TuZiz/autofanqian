"use client";

import { Check, Copy, Search, Settings2, UserRound, Users, X } from "lucide-react";
import { useMemo, useState } from "react";

import { roleToDisplay } from "@/lib/workbench/work-dashboard-format";
import type { WorkDashboardController } from "@/lib/workbench/use-work-dashboard";
import { cn } from "@/lib/utils";

export function WorkCharactersPanel({ dashboard }: { dashboard: WorkDashboardController }) {
  const { outline } = dashboard;
  const charCount = outline?.characters.length ?? 0;
  const [managerOpen, setManagerOpen] = useState(false);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-950 dark:text-white">主要角色</h2>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              角色矩阵 · {charCount}份档案
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={!charCount}
          onClick={() => setManagerOpen(true)}
          title={charCount ? "打开角色管理" : "暂无角色档案"}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-emerald-500/30 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-200"
        >
          <Settings2 className="h-4 w-4" />
          <span>管理角色</span>
        </button>
      </div>

      {charCount > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {outline!.characters.map((char, index) => {
            const displayRole = roleToDisplay(char.role);
            const isMain =
              displayRole === "主角" ||
              displayRole === "女主" ||
              char.role.includes("主") ||
              char.role.toLowerCase().includes("main");

            return (
              <article
                key={index}
                className={cn(
                  "flex h-full min-h-[154px] flex-col rounded-lg border bg-slate-50 p-4 transition-colors hover:bg-white dark:bg-slate-900 dark:hover:bg-slate-900/70",
                  isMain
                    ? "border-emerald-200 dark:border-emerald-500/25"
                    : "border-slate-200 dark:border-slate-800",
                )}
              >
                <div className="mb-3 flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border text-lg font-black",
                      isMain
                        ? "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950"
                        : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300",
                    )}
                  >
                    {(char.name ?? "?").trim().slice(0, 1) || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-black text-slate-950 dark:text-white">
                      {char.name}
                    </h3>
                    <span
                      className={cn(
                        "mt-1.5 inline-flex rounded-md border px-2 py-0.5 text-[11px] font-bold",
                        isMain
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300"
                          : "border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400",
                      )}
                    >
                      {displayRole}
                    </span>
                  </div>
                </div>
                <p className="line-clamp-4 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
                  {char.desc || "暂无人物小传。"}
                </p>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-sm font-semibold text-slate-400 dark:border-slate-700 dark:text-slate-500">
          暂无角色档案数据
        </div>
      )}

      {managerOpen && outline ? (
        <CharacterManagerDialog
          characters={outline.characters}
          onClose={() => setManagerOpen(false)}
        />
      ) : null}
    </section>
  );
}

type CharacterItem = NonNullable<WorkDashboardController["outline"]>["characters"][number];

function CharacterManagerDialog({
  characters,
  onClose,
}: {
  characters: CharacterItem[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("全部");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const roleOptions = useMemo(
    () => ["全部", ...Array.from(new Set(characters.map((char) => roleToDisplay(char.role))))],
    [characters],
  );
  const filteredCharacters = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return characters.filter((char) => {
      const role = roleToDisplay(char.role);
      const matchesRole = roleFilter === "全部" || role === roleFilter;
      const matchesQuery =
        !normalized ||
        [char.name, role, char.desc].join(" ").toLowerCase().includes(normalized);
      return matchesRole && matchesQuery;
    });
  }, [characters, query, roleFilter]);
  const selected = filteredCharacters[selectedIndex] ?? filteredCharacters[0] ?? characters[0];

  async function handleCopy() {
    const content = characters
      .map((char, index) => `${index + 1}. ${char.name}｜${roleToDisplay(char.role)}\n${char.desc}`)
      .join("\n\n");
    await navigator.clipboard?.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="关闭角色管理"
        className="absolute inset-0 cursor-pointer bg-slate-950/35 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative grid max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 dark:border-slate-800 dark:bg-slate-950 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col border-b border-slate-200 bg-[#fbfcf8] dark:border-slate-800 dark:bg-slate-900/80 lg:border-b-0 lg:border-r">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">
                Character Matrix
              </p>
              <h3 className="mt-1 text-xl font-black text-slate-950 dark:text-white">角色管理</h3>
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {characters.length}份角色档案，可搜索、筛选和复制。
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3 border-b border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="搜索姓名、身份或动机"
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {roleOptions.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => {
                    setRoleFilter(role);
                    setSelectedIndex(0);
                  }}
                  className={cn(
                    "rounded-md border px-2.5 py-1.5 text-xs font-black transition-colors active:scale-[0.98]",
                    roleFilter === role
                      ? "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900",
                  )}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {filteredCharacters.length ? (
              filteredCharacters.map((char, index) => {
                const selected = index === selectedIndex;
                return (
                  <button
                    key={`${char.name}-${index}`}
                    type="button"
                    onClick={() => setSelectedIndex(index)}
                    className={cn(
                      "mb-2 flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                      selected
                        ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/25 dark:bg-emerald-500/10"
                        : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900",
                    )}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-sm font-black text-white dark:bg-white dark:text-slate-950">
                      {(char.name ?? "?").trim().slice(0, 1) || "?"}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-slate-950 dark:text-white">
                        {char.name}
                      </span>
                      <span className="mt-1 block truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {roleToDisplay(char.role)}
                      </span>
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm font-semibold text-slate-400 dark:border-slate-700 dark:text-slate-500">
                没有匹配的角色。
              </div>
            )}
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto p-5 dark:bg-slate-950">
          {selected ? (
            <div className="mx-auto max-w-2xl">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-950 text-2xl font-black text-white dark:border-slate-800 dark:bg-white dark:text-slate-950">
                    {(selected.name ?? "?").trim().slice(0, 1) || "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                      Selected Role
                    </p>
                    <h4 className="mt-1 truncate text-3xl font-black text-slate-950 dark:text-white">
                      {selected.name}
                    </h4>
                    <span className="mt-2 inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300">
                      {roleToDisplay(selected.role)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition-colors hover:bg-slate-50 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  {copied ? "已复制" : "复制全部"}
                </button>
              </div>

              <div className="mt-6 rounded-lg border border-slate-200 bg-[#fbfcf8] p-5 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-950 dark:text-white">
                  <UserRound className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                  人物定位与动机
                </div>
                <p className="whitespace-pre-wrap text-sm font-medium leading-7 text-slate-600 dark:text-slate-300">
                  {selected.desc || "暂无人物小传。"}
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <InfoTile label="角色身份" value={roleToDisplay(selected.role)} />
                <InfoTile label="管理状态" value="已接入" accent="emerald" />
                <InfoTile label="档案来源" value="作品大纲" />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InfoTile({
  accent,
  label,
  value,
}: {
  accent?: "emerald";
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p
        className={cn(
          "mt-2 truncate text-sm font-black text-slate-950 dark:text-white",
          accent === "emerald" && "text-emerald-700 dark:text-emerald-300",
        )}
      >
        {value}
      </p>
    </div>
  );
}

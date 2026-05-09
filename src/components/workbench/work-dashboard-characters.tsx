"use client";

import { Check, Copy, Search, Settings2, UserRound, Users, X } from "lucide-react";
import { useMemo, useState } from "react";

import type { WorkDashboardController } from "@/lib/workbench/use-work-dashboard";
import { roleToDisplay } from "@/lib/workbench/work-dashboard-format";
import { cn } from "@/lib/utils";

export function WorkCharactersPanel({ dashboard }: { dashboard: WorkDashboardController }) {
  const { outline } = dashboard;
  const charCount = outline?.characters.length ?? 0;
  const [managerOpen, setManagerOpen] = useState(false);

  return (
    <section className="app-compact-panel p-4 sm:p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 shadow-inner ring-1 ring-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-300/20">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
              Characters
            </div>
            <h2 className="mt-1 text-[1.45rem] font-extrabold tracking-tight text-zinc-950 dark:text-white">主要角色</h2>
          </div>
        </div>

        <button
          type="button"
          disabled={!charCount}
          onClick={() => setManagerOpen(true)}
          title={charCount ? "打开角色管理" : "暂无角色档案"}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--theme-border)] bg-white px-4 text-sm font-bold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-950 hover:shadow-md hover:ring-1 hover:ring-[var(--theme-border)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[var(--theme-border)] dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white dark:hover:ring-[var(--theme-border)]"
        >
          <Settings2 className="h-4 w-4" />
          <span>管理角色</span>
        </button>
      </div>

      {charCount > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
                  "group flex h-full min-h-[168px] flex-col rounded-xl border bg-white/50 p-5 shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:shadow-lg dark:bg-zinc-900/50",
                  isMain
                    ? "border-emerald-200/80 ring-1 ring-emerald-200/50 hover:border-emerald-300 hover:ring-emerald-300/50 dark:border-emerald-500/30 dark:ring-emerald-500/20 dark:hover:border-emerald-400 dark:hover:ring-emerald-400/30"
                    : "border-[var(--theme-border)] hover:border-[var(--theme-border)] hover:ring-1 hover:ring-[var(--theme-border)]/50 dark:border-[var(--theme-border)] dark:hover:border-[var(--theme-border)] dark:hover:ring-[var(--theme-border)]",
                )}
              >
                <div className="mb-4 flex items-start gap-4">
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-xl font-extrabold shadow-inner",
                      isMain
                        ? "border-emerald-400 bg-emerald-500 text-white dark:border-emerald-500 dark:bg-emerald-600"
                        : "border-[var(--theme-border)] bg-zinc-100 text-zinc-600 dark:border-[var(--theme-border)] dark:bg-zinc-800 dark:text-zinc-300",
                    )}
                  >
                    {(char.name ?? "?").trim().slice(0, 1) || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[1rem] font-bold tracking-tight text-zinc-950 dark:text-white">
                      {char.name}
                    </h3>
                    <span
                      className={cn(
                        "mt-2 inline-flex rounded-xl border px-3 py-1 text-[11px] font-bold uppercase tracking-widest shadow-sm",
                        isMain
                          ? "border-emerald-200/80 bg-emerald-50/80 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                          : "border-[var(--theme-border)] bg-zinc-50/80 text-zinc-500 dark:border-[var(--theme-border)] dark:bg-zinc-900/80 dark:text-zinc-400",
                      )}
                    >
                      {displayRole}
                    </span>
                  </div>
                </div>
                <p className="line-clamp-4 text-sm font-medium leading-7 text-zinc-500 dark:text-zinc-400">
                  {char.desc || "暂无人物小传。"}
                </p>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-[var(--theme-border)] bg-zinc-50/50 p-8 text-center shadow-inner dark:border-[var(--theme-border)] dark:bg-zinc-900/50">
          <div className="flex flex-col items-center justify-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100/80 text-zinc-400 shadow-inner ring-1 ring-[var(--theme-border)] dark:bg-zinc-800/80 dark:text-zinc-500 dark:ring-[var(--theme-border)]">
              <UserRound className="h-6 w-6" aria-hidden />
            </div>
            <p className="text-sm font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              暂无角色档案数据
            </p>
          </div>
        </div>
      )}

      {managerOpen && outline ? (
        <CharacterManagerDialog characters={outline.characters} onClose={() => setManagerOpen(false)} />
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
      const matchesQuery = !normalized || [char.name, role, char.desc].join(" ").toLowerCase().includes(normalized);
      return matchesRole && matchesQuery;
    });
  }, [characters, query, roleFilter]);
  const selected = filteredCharacters[selectedIndex] ?? filteredCharacters[0] ?? characters[0];

  async function handleCopy() {
    const content = characters
      .map((char, index) => `${index + 1}. ${char.name} - ${roleToDisplay(char.role)}\n${char.desc}`)
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
        className="absolute inset-0 cursor-pointer bg-zinc-950/40 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative grid max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-[var(--theme-border)] bg-white/90 shadow-lg shadow-zinc-950/20 backdrop-blur-xl dark:border-[var(--theme-border)] dark:bg-zinc-950/90 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col border-b border-[var(--theme-border)] bg-white/50 dark:border-[var(--theme-border)] dark:bg-zinc-900/50 lg:border-b-0 lg:border-r">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--theme-border)] p-5 dark:border-[var(--theme-border)]">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                Character Matrix
              </p>
              <h3 className="mt-1 text-2xl font-extrabold text-zinc-950 dark:text-white">角色管理</h3>
              <p className="mt-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400">
                {characters.length} 份角色档案，可搜索、筛选和复制。
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--theme-border)] bg-white text-zinc-500 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-950 hover:ring-1 hover:ring-[var(--theme-border)] dark:border-[var(--theme-border)] dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white dark:hover:ring-[var(--theme-border)]"
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 border-b border-[var(--theme-border)] p-5 dark:border-[var(--theme-border)]">
            <div className="flex items-center gap-3 rounded-xl border border-[var(--theme-border)] bg-white/80 px-4 py-3 shadow-sm dark:border-[var(--theme-border)] dark:bg-zinc-950/80">
              <Search className="h-4 w-4 shrink-0 text-zinc-500" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="搜索姓名、身份或动机"
                className="min-w-0 flex-1 bg-transparent text-sm font-bold text-zinc-800 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
            </div>
            <div className="flex flex-wrap gap-2.5">
              {roleOptions.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => {
                    setRoleFilter(role);
                    setSelectedIndex(0);
                  }}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs font-bold transition-all active:scale-[0.98]",
                    roleFilter === role
                      ? "border-zinc-950 bg-zinc-950 text-white shadow-md dark:border-white dark:bg-white dark:text-zinc-950"
                      : "border-[var(--theme-border)] bg-white/80 text-zinc-600 shadow-sm hover:bg-zinc-50 hover:text-zinc-900 hover:shadow dark:border-[var(--theme-border)] dark:bg-zinc-950/80 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white",
                  )}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {filteredCharacters.length ? (
              filteredCharacters.map((char, index) => {
                const selected = index === selectedIndex;
                return (
                  <button
                    key={`${char.name}-${index}`}
                    type="button"
                    onClick={() => setSelectedIndex(index)}
                    className={cn(
                      "mb-3 flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all",
                      selected
                        ? "border-emerald-300/80 bg-emerald-50/80 shadow-md ring-1 ring-emerald-300/50 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:ring-emerald-500/20"
                        : "border-[var(--theme-border)] bg-white/80 shadow-sm hover:border-[var(--theme-border)] hover:bg-zinc-50/80 hover:shadow dark:border-[var(--theme-border)] dark:bg-zinc-950/80 dark:hover:border-[var(--theme-border)]",
                    )}
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-base font-semibold text-white shadow-sm dark:bg-white dark:text-zinc-950">
                      {(char.name ?? "?").trim().slice(0, 1) || "?"}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-base font-bold text-zinc-950 dark:text-white">
                        {char.name}
                      </span>
                      <span className="mt-1 block truncate text-xs font-bold text-zinc-500 dark:text-zinc-400">
                        {roleToDisplay(char.role)}
                      </span>
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--theme-border)] p-8 text-center text-sm font-bold text-zinc-500 dark:border-[var(--theme-border)] dark:text-zinc-400">
                没有匹配的角色。
              </div>
            )}
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto p-5 dark:bg-zinc-950/50">
          {selected ? (
            <div className="mx-auto max-w-2xl">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="flex min-w-0 items-center gap-5">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-[var(--theme-border)] bg-zinc-950 text-3xl font-extrabold text-white shadow-lg dark:border-[var(--theme-border)] dark:bg-white dark:text-zinc-950">
                    {(selected.name ?? "?").trim().slice(0, 1) || "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                      Selected Role
                    </p>
                    <h4 className="mt-1 truncate text-4xl font-extrabold text-zinc-950 dark:text-white">
                      {selected.name}
                    </h4>
                    <span className="mt-3 inline-flex rounded-lg border border-emerald-200/80 bg-emerald-50/80 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 shadow-sm dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                      {roleToDisplay(selected.role)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--theme-border)] bg-white px-5 text-sm font-bold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-950 hover:shadow-md hover:ring-1 hover:ring-[var(--theme-border)] active:scale-[0.98] dark:border-[var(--theme-border)] dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white dark:hover:ring-[var(--theme-border)]"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  {copied ? "已复制" : "复制全部"}
                </button>
              </div>

              <div className="mt-8 rounded-2xl border border-[var(--theme-border)] bg-white/50 p-6 shadow-inner dark:border-[var(--theme-border)] dark:bg-zinc-900/50">
                <div className="mb-4 flex items-center gap-3 text-base font-bold text-zinc-950 dark:text-white">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
                    <UserRound className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  人物定位与动机
                </div>
                <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-zinc-600 dark:text-zinc-300">
                  {selected.desc || "暂无人物小传。"}
                </p>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
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
    <div className="rounded-2xl border border-[var(--theme-border)] bg-white/80 p-4 shadow-sm dark:border-[var(--theme-border)] dark:bg-zinc-900/80">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <p
        className={cn(
          "mt-2 truncate text-base font-bold text-zinc-950 dark:text-white",
          accent === "emerald" && "text-emerald-700 dark:text-emerald-300",
        )}
      >
        {value}
      </p>
    </div>
  );
}

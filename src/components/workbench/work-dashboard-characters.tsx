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
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)] shadow-inner ring-1 ring-[var(--theme-brand-border)]/20">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--theme-text-muted)]">
              Characters
            </div>
            <h2 className="mt-1 text-[1.45rem] font-extrabold tracking-tight text-[var(--theme-text-strong)]">主要角色</h2>
          </div>
        </div>

        <button
          type="button"
          disabled={!charCount}
          onClick={() => setManagerOpen(true)}
          title={charCount ? "打开角色管理" : "暂无角色档案"}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-4 text-sm font-bold text-[var(--theme-text-secondary)] shadow-sm transition-all hover:bg-[var(--theme-surface-solid)] hover:text-[var(--theme-text-strong)] hover:shadow-md hover:ring-1 hover:ring-[var(--theme-border)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
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
                  "group flex h-full min-h-[168px] flex-col rounded-xl border bg-[var(--theme-surface-soft)] p-5 shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:shadow-lg",
                  isMain
                    ? "border-[var(--theme-brand-border)] ring-1 ring-[var(--theme-brand-border)] hover:border-[var(--theme-brand-border)] hover:ring-[var(--theme-brand-border)]"
                    : "border-[var(--theme-border)] hover:border-[var(--theme-border)] hover:ring-1 hover:ring-[var(--theme-border)]/50",
                )}
              >
                <div className="mb-4 flex items-start gap-4">
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-xl font-extrabold shadow-inner",
                      isMain
                        ? "theme-brand-gradient-bg border-transparent text-white"
                        : "border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-[var(--theme-text-secondary)]",
                    )}
                  >
                    {(char.name ?? "?").trim().slice(0, 1) || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[1rem] font-bold tracking-tight text-[var(--theme-text-strong)]">
                      {char.name}
                    </h3>
                    <span
                      className={cn(
                        "mt-2 inline-flex rounded-xl border px-3 py-1 text-[11px] font-bold uppercase tracking-widest shadow-sm",
                        isMain
                          ? "border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)]"
                          : "border-[var(--theme-border)] bg-[var(--theme-surface-soft)] text-[var(--theme-text-muted)]",
                      )}
                    >
                      {displayRole}
                    </span>
                  </div>
                </div>
                <p className="line-clamp-4 text-sm font-medium leading-7 text-[var(--theme-text-muted)]">
                  {getCharacterDesc(char) || "暂无人物小传。"}
                </p>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface-soft)] p-8 text-center shadow-inner">
          <div className="flex flex-col items-center justify-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--theme-surface-soft)] text-[var(--theme-text-muted)] shadow-inner ring-1 ring-[var(--theme-border)]">
              <UserRound className="h-6 w-6" aria-hidden />
            </div>
            <p className="text-sm font-bold uppercase tracking-widest text-[var(--theme-text-muted)]">
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

function getCharacterDesc(char: CharacterItem) {
  return "desc" in char ? char.desc : char.description;
}

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
        [char.name, role, getCharacterDesc(char)].join(" ").toLowerCase().includes(normalized);
      return matchesRole && matchesQuery;
    });
  }, [characters, query, roleFilter]);
  const selected = filteredCharacters[selectedIndex] ?? filteredCharacters[0] ?? characters[0];

  async function handleCopy() {
    const content = characters
      .map((char, index) => `${index + 1}. ${char.name} - ${roleToDisplay(char.role)}\n${getCharacterDesc(char)}`)
      .join("\n\n");
    await navigator.clipboard?.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 py-6" role="dialog" aria-modal="true" aria-label="角色管理">
      <button
        type="button"
        aria-label="关闭角色管理"
        className="absolute inset-0 cursor-pointer bg-[var(--theme-surface-solid)]/40 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative grid max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] shadow-lg shadow-zinc-950/20 backdrop-blur-xl lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col border-b border-[var(--theme-border)] bg-[var(--theme-surface-solid)]/50 lg:border-b-0 lg:border-r">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--theme-border)] p-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--theme-brand-text)]">
                Character Matrix
              </p>
              <h3 className="mt-1 text-2xl font-extrabold text-[var(--theme-text-strong)]">角色管理</h3>
              <p className="mt-1.5 text-xs font-bold text-[var(--theme-text-muted)]">
                {characters.length} 份角色档案，可搜索、筛选和复制。
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-[var(--theme-text-muted)] shadow-sm transition-all hover:bg-[var(--theme-surface-solid)] hover:text-[var(--theme-text-strong)] hover:ring-1 hover:ring-[var(--theme-border)]"
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 border-b border-[var(--theme-border)] p-5">
            <div className="flex items-center gap-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] px-4 py-3 shadow-sm">
              <Search className="h-4 w-4 shrink-0 text-[var(--theme-text-muted)]" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="搜索姓名、身份或动机"
                className="min-w-0 flex-1 bg-transparent text-sm font-bold text-[var(--theme-text-strong)] outline-none placeholder:text-[var(--theme-text-muted)]"
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
                      ? "border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)] shadow-md"
                      : "border-[var(--theme-border)] bg-[var(--theme-surface-soft)] text-[var(--theme-text-secondary)] shadow-sm hover:bg-[var(--theme-surface-solid)] hover:text-[var(--theme-text-strong)] hover:shadow",
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
                        ? "border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] shadow-md ring-1 ring-[var(--theme-brand-border)]"
                        : "border-[var(--theme-border)] bg-[var(--theme-surface-soft)] shadow-sm hover:border-[var(--theme-border)] hover:bg-[var(--theme-surface-soft)] hover:shadow",
                    )}
                  >
                    <span className="theme-brand-gradient-bg flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-semibold text-white shadow-sm">
                      {(char.name ?? "?").trim().slice(0, 1) || "?"}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-base font-bold text-[var(--theme-text-strong)]">
                        {char.name}
                      </span>
                      <span className="mt-1 block truncate text-xs font-bold text-[var(--theme-text-muted)]">
                        {roleToDisplay(char.role)}
                      </span>
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--theme-border)] p-8 text-center text-sm font-bold text-[var(--theme-text-muted)]">
                没有匹配的角色。
              </div>
            )}
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto p-5">
          {selected ? (
            <div className="mx-auto max-w-2xl">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="flex min-w-0 items-center gap-5">
                  <div className="theme-brand-gradient-bg flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-transparent text-3xl font-extrabold text-white shadow-lg">
                    {(selected.name ?? "?").trim().slice(0, 1) || "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--theme-text-muted)]">
                      Selected Role
                    </p>
                    <h4 className="mt-1 truncate text-4xl font-extrabold text-[var(--theme-text-strong)]">
                      {selected.name}
                    </h4>
                    <span className="mt-3 inline-flex rounded-lg border border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--theme-brand-text)] shadow-sm">
                      {roleToDisplay(selected.role)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-5 text-sm font-bold text-[var(--theme-text-secondary)] shadow-sm transition-all hover:bg-[var(--theme-surface-solid)] hover:text-[var(--theme-text-strong)] hover:shadow-md hover:ring-1 hover:ring-[var(--theme-border)] active:scale-[0.98]"
                >
                  {copied ? <Check className="h-4 w-4 text-[var(--theme-brand-text)]" /> : <Copy className="h-4 w-4" />}
                  {copied ? "已复制" : "复制全部"}
                </button>
              </div>

              <div className="mt-8 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] p-6 shadow-inner">
                <div className="mb-4 flex items-center gap-3 text-base font-bold text-[var(--theme-text-strong)]">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--theme-brand-soft)]">
                    <UserRound className="h-4 w-4 text-[var(--theme-brand-text)]" />
                  </div>
                  人物定位与动机
                </div>
                <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-[var(--theme-text-secondary)]">
                  {getCharacterDesc(selected) || "暂无人物小传。"}
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
    <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--theme-text-muted)]">{label}</p>
      <p
        className={cn(
          "mt-2 truncate text-base font-bold text-[var(--theme-text-strong)]",
          accent === "emerald" && "text-[var(--theme-brand-text)]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

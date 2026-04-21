"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { apiRequest } from "@/lib/client/auth-api";

type SessionUser = {
  id: string;
  email: string;
  isAdmin?: boolean;
};

type GenreConfig = {
  id: string;
  name: string;
  tags: string[];
  icon: string;
  gradient: string;
  sortOrder: number;
  active: boolean;
};

type OptionConfig = {
  id: string;
  label: string;
  promptHint?: string;
  sortOrder: number;
  active: boolean;
};

type CreateUiConfig = {
  version: 1;
  genres: GenreConfig[];
  platforms: OptionConfig[];
  dnaStyles: OptionConfig[];
  wordOptions: OptionConfig[];
};

type OptionSectionKey = "platforms" | "dnaStyles" | "wordOptions";

type TemplateItem = {
  id: string;
  genreId: string;
  title: string | null;
  content: string;
  source: "seed" | "ai" | "user" | "learned";
  usageCount: number;
  isActive: boolean;
  updatedAt: string;
};

function parseTags(value: string) {
  return value
    .split(/[,，、·]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function stringifyTags(tags: string[]) {
  return (tags ?? []).join("、");
}

export default function DashboardAdminPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);

  const [config, setConfig] = useState<CreateUiConfig | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);

  const [genreForTemplates, setGenreForTemplates] = useState<string>("");
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [learning, setLearning] = useState(false);

  const genreOptions = useMemo(() => config?.genres ?? [], [config]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const session = await apiRequest<{ user: SessionUser }>("/api/auth/session");
      if (cancelled) return;

      if (!session.success || !session.data?.user) {
        window.location.href = "/login";
        return;
      }

      const nextUser = session.data.user;
      if (!nextUser.isAdmin) {
        window.location.href = "/dashboard";
        return;
      }

      setUser(nextUser);

      const configRes = await apiRequest<{ config: CreateUiConfig }>(
        "/api/admin/create-config",
      );

      if (!cancelled && configRes.success && configRes.data?.config) {
        setConfig(configRes.data.config);
        setGenreForTemplates(configRes.data.config.genres[0]?.id ?? "");
      }

      if (!cancelled) setLoading(false);
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadTemplates() {
      if (!genreForTemplates) {
        setTemplates([]);
        return;
      }

      setTemplatesLoading(true);
      const res = await apiRequest<{ templates: TemplateItem[] }>(
        `/api/admin/templates?genreId=${encodeURIComponent(genreForTemplates)}`,
      );

      if (cancelled) return;

      if (res.success && res.data?.templates) {
        setTemplates(res.data.templates);
      } else {
        setTemplates([]);
      }

      setTemplatesLoading(false);
    }

    void loadTemplates();

    return () => {
      cancelled = true;
    };
  }, [genreForTemplates]);

  async function handleLogout() {
    const response = await apiRequest<{ redirectTo: string }>(
      "/api/auth/logout",
      {},
    );

    if (response.success && response.data?.redirectTo) {
      window.location.href = response.data.redirectTo;
    }
  }

  async function handleSaveConfig() {
    if (!config) return;
    setSavingConfig(true);

    const res = await apiRequest<{ config: CreateUiConfig }>(
      "/api/admin/create-config",
      { config },
      { method: "PUT" },
    );

    setSavingConfig(false);

    if (!res.success) {
      window.alert(res.message || "保存失败");
      return;
    }

    if (res.data?.config) {
      setConfig(res.data.config);
    }

    window.alert("配置已保存");
  }

  function handleAddGenre() {
    if (!config) return;

    const id =
      window.prompt("请输入新类型 ID（建议英文/数字，如 fantasy2）", "new_genre")?.trim() ??
      "";
    if (!id) return;

    if (config.genres.some((genre) => genre.id === id)) {
      window.alert("该 ID 已存在，请换一个。");
      return;
    }

    const name = window.prompt("请输入类型名称", "新类型")?.trim() ?? "";
    if (!name) return;

    const nextSortOrder =
      Math.max(0, ...config.genres.map((genre) => genre.sortOrder ?? 0)) + 10;

    setConfig({
      ...config,
      genres: [
        ...config.genres,
        {
          id,
          name,
          tags: [],
          icon: "✨",
          gradient: "from-sky-500 to-teal-500",
          sortOrder: nextSortOrder,
          active: true,
        },
      ],
    });
  }

  function handleDeleteGenre(id: string) {
    if (!config) return;
    if (!window.confirm(`确定删除类型「${id}」吗？`)) return;

    setConfig({
      ...config,
      genres: config.genres.filter((genre) => genre.id !== id),
    });
  }

  function handleAddOption(section: OptionSectionKey) {
    if (!config) return;

    const id =
      window.prompt("请输入新选项 ID（建议英文/数字，如 qidian2）", "new_option")?.trim() ??
      "";
    if (!id) return;

    const items = (config[section] ?? []) as OptionConfig[];
    if (items.some((item) => item.id === id)) {
      window.alert("该 ID 已存在，请换一个。");
      return;
    }

    const label = window.prompt("请输入显示名称", "新选项")?.trim() ?? "";
    if (!label) return;

    const nextSortOrder =
      Math.max(0, ...items.map((item) => item.sortOrder ?? 0)) + 10;

    const nextItems = [
      ...items,
      { id, label, promptHint: "", sortOrder: nextSortOrder, active: true },
    ];

    setConfig({
      ...config,
      [section]: nextItems,
    } as CreateUiConfig);
  }

  function handleDeleteOption(section: OptionSectionKey, id: string) {
    if (!config) return;
    if (!window.confirm(`确定删除选项「${id}」吗？`)) return;

    const items = (config[section] ?? []) as OptionConfig[];
    const nextItems = items.filter((item) => item.id !== id);

    setConfig({
      ...config,
      [section]: nextItems,
    } as CreateUiConfig);
  }

  async function handleUpdateTemplate(id: string, patch: Partial<TemplateItem>) {
    const res = await apiRequest<{ template: TemplateItem }>(
      `/api/admin/templates/${encodeURIComponent(id)}`,
      {
        title: patch.title ?? undefined,
        content: patch.content ?? undefined,
        isActive: patch.isActive ?? undefined,
      },
      { method: "PUT" },
    );

    if (!res.success) {
      window.alert(res.message || "更新失败");
      return;
    }

    if (res.data?.template) {
      setTemplates((prev) =>
        prev.map((item) => (item.id === id ? res.data!.template : item)),
      );
    }
  }

  async function handleDeleteTemplate(id: string) {
    if (!window.confirm("确定要删除这条模板吗？")) return;

    const res = await apiRequest<{ id: string }>(
      `/api/admin/templates/${encodeURIComponent(id)}`,
      {},
      { method: "DELETE" },
    );

    if (!res.success) {
      window.alert(res.message || "删除失败");
      return;
    }

    setTemplates((prev) => prev.filter((item) => item.id !== id));
  }

  async function handleCreateTemplate() {
    if (!genreForTemplates) return;

    const content = window.prompt("请输入新模板内容（建议 100-300 字）");
    if (!content) return;

    const res = await apiRequest<{ template: TemplateItem }>("/api/admin/templates", {
      genreId: genreForTemplates,
      content,
      source: "seed",
      isActive: true,
    });

    if (!res.success || !res.data?.template) {
      window.alert(res.message || "创建失败");
      return;
    }

    setTemplates((prev) => [res.data!.template, ...prev]);
  }

  async function handleLearnTemplates() {
    if (!genreForTemplates) return;

    setLearning(true);
    const res = await apiRequest<{ results: Array<{ genreId: string; created: number }> }>(
      "/api/admin/templates/learn",
      { genreId: genreForTemplates, perGenre: 6 },
    );
    setLearning(false);

    if (!res.success) {
      window.alert(res.message || "学习失败");
      return;
    }

    // Reload templates
    setTemplatesLoading(true);
    const reload = await apiRequest<{ templates: TemplateItem[] }>(
      `/api/admin/templates?genreId=${encodeURIComponent(genreForTemplates)}`,
    );
    setTemplatesLoading(false);
    if (reload.success && reload.data?.templates) {
      setTemplates(reload.data.templates);
    }

    window.alert("学习完成，已更新热门模板");
  }

  if (loading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 text-slate-700 transition-colors dark:bg-[#05070c] dark:text-slate-200">
        <div className="absolute inset-0 bg-[radial-gradient(1100px_circle_at_50%_-10%,rgba(59,130,246,0.10),transparent_55%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_52%,_#f8fafc_100%)] dark:hidden" />
        <div className="absolute inset-0 hidden dark:block app-gradient" />
        <div className="absolute inset-0 hidden dark:block app-vignette" />
        <div className="absolute inset-0 app-noise opacity-[0.04] dark:opacity-[0.12]" />
        <div className="glass-panel relative z-10 rounded-3xl p-8 text-sm font-medium text-slate-500 dark:text-slate-300">
          正在加载管理员控制台…
        </div>
      </main>
    );
  }

  if (!config) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 text-slate-700 transition-colors dark:bg-[#05070c] dark:text-slate-200">
        <div className="glass-panel relative z-10 rounded-3xl p-8 text-sm">
          配置加载失败，请刷新重试。
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 font-sans text-slate-900 transition-colors dark:bg-[#05070c] dark:text-slate-200">
      <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_50%_0%,rgba(59,130,246,0.10),transparent_58%),radial-gradient(900px_circle_at_10%_20%,rgba(56,189,248,0.10),transparent_55%),radial-gradient(900px_circle_at_90%_25%,rgba(20,184,166,0.10),transparent_55%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_52%,_#f8fafc_100%)] dark:hidden" />
      <div className="absolute inset-0 hidden dark:block app-gradient" />
      <div className="absolute inset-0 hidden dark:block app-vignette" />
      <div className="absolute inset-0 app-noise opacity-[0.04] dark:opacity-[0.12]" />

      <header className="relative z-10">
        <div className="sticky top-0 z-50 border-b border-white/10">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0b1220] via-[#070b14] to-[#05070c] opacity-95" />
          <div className="absolute inset-0 app-noise opacity-[0.18]" />

          <div className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div className="leading-tight">
              <div className="text-[11px] tracking-[0.34em] text-slate-400">
                BAYDATA
              </div>
              <div className="text-lg font-semibold text-slate-100">
                管理员控制台
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              <Link
                href="/dashboard"
                className="hidden text-sm font-medium text-slate-200/80 transition hover:text-slate-100 sm:inline"
              >
                返回工作台
              </Link>
              <span className="hidden text-sm text-slate-300/90 md:inline">
                {user?.email ?? ""}
              </span>
              <ThemeToggle className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10" />
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition-all hover:bg-white/10"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-10 lg:py-12">
        <section className="glass-panel rounded-[40px] p-10 shadow-2xl lg:p-12">
          <div className="text-sm font-medium text-sky-600 dark:text-sky-300">
            配置
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            创作页配置与热门模板
          </h1>
          <p className="mt-4 max-w-3xl leading-relaxed text-slate-600 dark:text-slate-300/80">
            这里可以管理类型卡片标签、目标平台风格（promptHint）、仿书 DNA、目标字数选项，并用 AI
            自动学习生成热门模板。
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-600 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-600/15 transition hover:from-sky-500 hover:to-teal-400 disabled:cursor-not-allowed disabled:opacity-70 dark:from-sky-400 dark:to-teal-300 dark:text-slate-900"
            >
              {savingConfig ? "保存中…" : "保存配置"}
            </button>
            <Link
              href="/dashboard/create"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/60 px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
            >
              去创作页预览
            </Link>
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section className="glass-panel rounded-[32px] p-8 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              类型卡片（标签/图标/渐变）
            </h2>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleAddGenre}
                className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
              >
                新增类型
              </button>
            </div>

            <div className="mt-6 space-y-5">
              {config.genres.map((genre, idx) => (
                <div
                  key={genre.id || idx}
                  className="rounded-2xl border border-slate-200/70 bg-white/60 p-5 shadow-sm dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {genre.id || "(未命名ID)"}
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <input
                          type="checkbox"
                          checked={genre.active}
                          onChange={(event) => {
                            const next = [...config.genres];
                            next[idx] = { ...next[idx], active: event.target.checked };
                            setConfig({ ...config, genres: next });
                          }}
                        />
                        启用
                      </label>
                      <button
                        type="button"
                        onClick={() => handleDeleteGenre(genre.id)}
                        className="text-xs font-semibold text-rose-600 transition hover:text-rose-500 dark:text-rose-300 dark:hover:text-rose-200"
                      >
                        删除
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        名称
                      </div>
                      <input
                        value={genre.name}
                        onChange={(event) => {
                          const next = [...config.genres];
                          next[idx] = { ...next[idx], name: event.target.value };
                          setConfig({ ...config, genres: next });
                        }}
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        图标（emoji）
                      </div>
                      <input
                        value={genre.icon}
                        onChange={(event) => {
                          const next = [...config.genres];
                          next[idx] = { ...next[idx], icon: event.target.value };
                          setConfig({ ...config, genres: next });
                        }}
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        标签（用逗号/顿号/中点分隔）
                      </div>
                      <input
                        value={stringifyTags(genre.tags)}
                        onChange={(event) => {
                          const next = [...config.genres];
                          next[idx] = { ...next[idx], tags: parseTags(event.target.value) };
                          setConfig({ ...config, genres: next });
                        }}
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        渐变 class
                      </div>
                      <input
                        value={genre.gradient}
                        onChange={(event) => {
                          const next = [...config.genres];
                          next[idx] = { ...next[idx], gradient: event.target.value };
                          setConfig({ ...config, genres: next });
                        }}
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                        placeholder="from-blue-500 to-indigo-500"
                      />
                    </div>

                    <div>
                      <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        排序
                      </div>
                      <input
                        type="number"
                        value={genre.sortOrder}
                        onChange={(event) => {
                          const next = [...config.genres];
                          next[idx] = { ...next[idx], sortOrder: Number(event.target.value) };
                          setConfig({ ...config, genres: next });
                        }}
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="glass-panel rounded-[32px] p-8 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              目标平台/仿书DNA/字数选项（含风格提示）
            </h2>

            <div className="mt-6 space-y-8">
              {[
                { key: "platforms", title: "目标平台", hint: "promptHint 会参与 AI 生成创意风格" },
                { key: "dnaStyles", title: "仿书 DNA", hint: "promptHint 会参与 AI 生成创意风格" },
                { key: "wordOptions", title: "目标字数", hint: "用于提示 AI 生成的规模" },
              ].map((section) => {
                const items = config[section.key as keyof CreateUiConfig] as OptionConfig[];

                return (
                  <div key={section.key}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {section.title}
                        </h3>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {section.hint}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddOption(section.key as OptionSectionKey)}
                        className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-xs font-semibold text-slate-900 shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
                      >
                        新增选项
                      </button>
                    </div>

                    <div className="mt-4 space-y-4">
                      {items.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="rounded-2xl border border-slate-200/70 bg-white/60 p-5 shadow-sm dark:border-white/10 dark:bg-white/5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {item.id}
                            </div>
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                <input
                                  type="checkbox"
                                  checked={item.active}
                                  onChange={(event) => {
                                    const nextItems = [...items];
                                    nextItems[idx] = {
                                      ...nextItems[idx],
                                      active: event.target.checked,
                                    };
                                    setConfig({
                                      ...config,
                                      [section.key]: nextItems,
                                    } as CreateUiConfig);
                                  }}
                                />
                                启用
                              </label>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteOption(
                                    section.key as OptionSectionKey,
                                    item.id,
                                  )
                                }
                                className="text-xs font-semibold text-rose-600 transition hover:text-rose-500 dark:text-rose-300 dark:hover:text-rose-200"
                              >
                                删除
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <div className="md:col-span-2">
                              <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                显示名称
                              </div>
                              <input
                                value={item.label}
                                onChange={(event) => {
                                  const nextItems = [...items];
                                  nextItems[idx] = {
                                    ...nextItems[idx],
                                    label: event.target.value,
                                  };
                                  setConfig({
                                    ...config,
                                    [section.key]: nextItems,
                                  } as CreateUiConfig);
                                }}
                                className="mt-2 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                promptHint（可选）
                              </div>
                              <textarea
                                value={item.promptHint ?? ""}
                                onChange={(event) => {
                                  const nextItems = [...items];
                                  nextItems[idx] = {
                                    ...nextItems[idx],
                                    promptHint: event.target.value || undefined,
                                  };
                                  setConfig({
                                    ...config,
                                    [section.key]: nextItems,
                                  } as CreateUiConfig);
                                }}
                                className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                                rows={3}
                              />
                            </div>

                            <div>
                              <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                排序
                              </div>
                              <input
                                type="number"
                                value={item.sortOrder}
                                onChange={(event) => {
                                  const nextItems = [...items];
                                  nextItems[idx] = {
                                    ...nextItems[idx],
                                    sortOrder: Number(event.target.value),
                                  };
                                  setConfig({
                                    ...config,
                                    [section.key]: nextItems,
                                  } as CreateUiConfig);
                                }}
                                className="mt-2 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <section className="glass-panel mt-8 rounded-[40px] p-8 shadow-2xl lg:p-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                热门模板（可编辑 + AI 学习）
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300/80">
                选择一个类型，管理该类型的热门模板。AI 学习会基于“用户生成创意日志”和“现有模板”自动生成新的模板。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={genreForTemplates}
                onChange={(event) => setGenreForTemplates(event.target.value)}
                className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              >
                {genreOptions.map((genre) => (
                  <option key={genre.id} value={genre.id}>
                    {genre.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleCreateTemplate}
                className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
              >
                新增模板
              </button>

              <button
                type="button"
                onClick={handleLearnTemplates}
                disabled={learning}
                className="rounded-full bg-gradient-to-r from-sky-600 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-600/15 transition hover:from-sky-500 hover:to-teal-400 disabled:cursor-not-allowed disabled:opacity-70 dark:from-sky-400 dark:to-teal-300 dark:text-slate-900"
              >
                {learning ? "学习中…" : "AI 学习生成"}
              </button>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {templatesLoading ? (
              <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-6 text-sm text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                正在加载模板…
              </div>
            ) : templates.length ? (
              templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="rounded-2xl border border-slate-200/70 bg-white/60 p-6 shadow-sm dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {tpl.source.toUpperCase()} · 使用 {tpl.usageCount} 次
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <input
                          type="checkbox"
                          checked={tpl.isActive}
                          onChange={(event) => {
                            const next = templates.map((item) =>
                              item.id === tpl.id
                                ? { ...item, isActive: event.target.checked }
                                : item,
                            );
                            setTemplates(next);
                          }}
                        />
                        启用
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          void handleUpdateTemplate(tpl.id, {
                            content: tpl.content,
                            isActive: tpl.isActive,
                          })
                        }
                        className="rounded-full border border-slate-200 bg-white/70 px-4 py-1.5 text-xs font-semibold text-slate-900 shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-slate-100"
                      >
                        保存
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteTemplate(tpl.id)}
                        className="rounded-full border border-rose-200 bg-rose-50 px-4 py-1.5 text-xs font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20"
                      >
                        删除
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={tpl.content}
                    onChange={(event) => {
                      const next = templates.map((item) =>
                        item.id === tpl.id
                          ? { ...item, content: event.target.value }
                          : item,
                      );
                      setTemplates(next);
                    }}
                    rows={5}
                    className="mt-4 w-full resize-none rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm leading-relaxed text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                  />
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-6 text-sm text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                暂无模板。你可以先“新增模板”，或者点击“AI 学习生成”。
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

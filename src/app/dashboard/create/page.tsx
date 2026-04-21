"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Flame, Shield, Sparkles, Zap } from "lucide-react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { apiRequest } from "@/lib/client/auth-api";
import { zhCN } from "@/lib/copy/zh-cn";

type GenreId = string;

type Genre = {
  id: GenreId;
  name: string;
  tags: string[];
  gradient: string;
  icon: string;
};

type SessionUser = {
  email: string;
  isAdmin?: boolean;
};

type CreateSelectOption = {
  id: string;
  label: string;
  promptHint?: string;
};

type CreateUiConfig = {
  genres: Genre[];
  platforms: CreateSelectOption[];
  dnaStyles: CreateSelectOption[];
  wordOptions: CreateSelectOption[];
};

type HotTemplate = {
  id: string;
  content: string;
};

const stepTitles = ["输入创意", "确认大纲", "创建成功"];

export default function DashboardCreatePage() {
  const [selectedGenre, setSelectedGenre] = useState<GenreId | "">("");
  const [idea, setIdea] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [aiBusy, setAiBusy] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [platform, setPlatform] = useState("");
  const [dna, setDna] = useState("");
  const [dnaBookTitle, setDnaBookTitle] = useState("");
  const [words, setWords] = useState("100w");
  const [userEmail, setUserEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [config, setConfig] = useState<CreateUiConfig | null>(null);
  const [hotTemplates, setHotTemplates] = useState<HotTemplate[]>([]);
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [outline, setOutline] = useState("");

  const genres = config?.genres ?? [];
  const platforms = config?.platforms ?? [];
  const dnaStyles = config?.dnaStyles ?? [];
  const wordOptions = config?.wordOptions ?? [];

  const selectedTags = useMemo(() => {
    if (!selectedGenre || !config) return [];
    return config.genres.find((item) => item.id === selectedGenre)?.tags ?? [];
  }, [config, selectedGenre]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const response = await apiRequest<{ user: SessionUser }>("/api/auth/session");

      if (cancelled) return;

      if (response.success && response.data?.user?.email) {
        setUserEmail(response.data.user.email);
        const admin = Boolean(response.data.user.isAdmin);
        setIsAdmin(admin);
        if (!admin) {
          setDna("");
          setDnaBookTitle("");
        }
      } else {
        window.location.href = "/login";
        return;
      }

      const configResponse = await apiRequest<{ config: CreateUiConfig }>(
        "/api/config/create",
      );

      if (!cancelled && configResponse.success && configResponse.data?.config) {
        const nextConfig = configResponse.data.config;
        setConfig(nextConfig);

        const defaultWords = nextConfig.wordOptions[0]?.id;
        if (defaultWords) {
          // Avoid capturing stale state in this bootstrap effect.
          setWords((prev) =>
            nextConfig.wordOptions.some((opt) => opt.id === prev) ? prev : defaultWords,
          );
        }
      }

      if (!cancelled) {
        setBootstrapLoading(false);
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadHotTemplates() {
      if (!selectedGenre) {
        setHotTemplates([]);
        return;
      }

      const response = await apiRequest<{ templates: HotTemplate[] }>(
        `/api/create/templates?genreId=${encodeURIComponent(selectedGenre)}`,
      );

      if (cancelled) return;

      if (response.success && response.data?.templates) {
        setHotTemplates(response.data.templates);
        return;
      }

      setHotTemplates([]);
    }

    void loadHotTemplates();

    return () => {
      cancelled = true;
    };
  }, [selectedGenre]);

  function updateIdea(value: string) {
    const nextValue = value.slice(0, 2000);
    setIdea(nextValue);
    setWordCount(nextValue.length);
  }

  async function handleLogout() {
    const response = await apiRequest<{ redirectTo: string }>(
      "/api/auth/logout",
      {},
    );

    if (response.success && response.data?.redirectTo) {
      window.location.href = response.data.redirectTo;
    }
  }

  async function handleGenerateAi() {
    if (!selectedGenre) {
      window.alert("请先在左侧选择小说类型！");
      return;
    }

    setAiBusy(true);

    try {
      const response = await fetch("/api/ai/idea", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
          body: JSON.stringify({
            genre: selectedGenre,
            tags: selectedTags,
            platform: platform.trim() ? platform.trim() : undefined,
            dna: isAdmin && dna.trim() ? dna.trim() : undefined,
            dnaBookTitle:
              isAdmin && dnaBookTitle.trim() ? dnaBookTitle.trim() : undefined,
            words: words.trim() ? words.trim() : undefined,
            existingIdea: idea.trim() ? idea.trim() : undefined,
          }),
        });

      const json = (await response.json().catch(() => null)) as
        | { success: true; data: { idea: string }; message?: string }
        | { success: false; message?: string; fieldErrors?: Record<string, string[]> }
        | null;

      if (json?.success && json.data?.idea) {
        updateIdea(json.data.idea);
        return;
      }

      window.alert(json?.message ?? "AI 生成失败，请稍后重试。");
    } catch {
      window.alert("网络请求异常，请稍后重试。");
    } finally {
      setAiBusy(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedGenre) {
      window.alert("必须选择一个小说类型！");
      return;
    }

    setSubmitBusy(true);

    const response = await apiRequest<{ outline: string }>("/api/ai/outline", {
      genre: selectedGenre,
      tags: selectedTags,
      platform: platform.trim() ? platform.trim() : undefined,
      dna: isAdmin && dna.trim() ? dna.trim() : undefined,
      dnaBookTitle: isAdmin && dnaBookTitle.trim() ? dnaBookTitle.trim() : undefined,
      words: words.trim() ? words.trim() : undefined,
      idea: idea.trim() ? idea.trim() : undefined,
    });

    setSubmitBusy(false);

    if (response.success && response.data?.outline) {
      setOutline(response.data.outline);
      window.setTimeout(() => {
        document
          .getElementById("outline-panel")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
      return;
    }

    window.alert(response.message || "大纲生成失败，请稍后重试。");
  }

  if (bootstrapLoading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 text-slate-700 transition-colors dark:bg-[#05070c] dark:text-slate-200">
        <div className="absolute inset-0 bg-[radial-gradient(1100px_circle_at_50%_-10%,rgba(59,130,246,0.10),transparent_55%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_52%,_#f8fafc_100%)] dark:hidden" />
        <div className="absolute inset-0 hidden dark:block app-gradient" />
        <div className="absolute inset-0 hidden dark:block app-vignette" />
        <div className="absolute inset-0 app-noise opacity-[0.04] dark:opacity-[0.12]" />

        <div className="glass-panel relative z-10 flex flex-col items-center gap-4 rounded-3xl p-8">
          <svg
            className="h-8 w-8 animate-spin text-sky-600/70 dark:text-sky-300/70"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="animate-pulse text-sm font-medium text-slate-400">
            正在加载创作配置...
          </p>
        </div>
      </main>
    );
  }

  if (!config) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 text-slate-700 transition-colors dark:bg-[#05070c] dark:text-slate-200">
        <div className="absolute inset-0 bg-[radial-gradient(1100px_circle_at_50%_-10%,rgba(59,130,246,0.10),transparent_55%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_52%,_#f8fafc_100%)] dark:hidden" />
        <div className="absolute inset-0 hidden dark:block app-gradient" />
        <div className="absolute inset-0 hidden dark:block app-vignette" />
        <div className="absolute inset-0 app-noise opacity-[0.04] dark:opacity-[0.12]" />

        <div className="glass-panel relative z-10 rounded-3xl p-8 text-sm font-medium text-slate-500 dark:text-slate-300">
          创作配置加载失败，请刷新重试。
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
                {zhCN.app.shortName}
              </div>
              <div className="text-lg font-semibold text-slate-100">
                创作工作台
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              <Link
                href="/dashboard"
                className="hidden text-sm font-medium text-slate-200/80 transition hover:text-slate-100 sm:inline"
              >
                返回工作台
              </Link>
              {isAdmin ? (
                <Link
                  href="/dashboard/admin"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 via-orange-300 to-rose-300 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-rose-500/10 transition hover:from-amber-200 hover:via-orange-200 hover:to-rose-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05070c]"
                >
                  <Shield className="h-4 w-4" />
                  管理员
                </Link>
              ) : null}
              <span className="hidden text-sm text-slate-300/90 md:inline">
                {userEmail}
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
            创作
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            创建新作品
          </h1>
          <p className="mt-4 max-w-3xl leading-relaxed text-slate-600 dark:text-slate-300/80">
            描述你的创意，让系统帮你生成完整的小说大纲。
          </p>

          <div className="relative mt-8 flex w-full items-center justify-between overflow-hidden rounded-3xl border border-slate-200/70 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-sky-500/10 to-transparent" />

            {stepTitles.map((title, index) => (
              <div key={title} className="contents">
                <div className="relative z-10 flex flex-1 flex-col items-center">
                  <div
                    className={
                      index === 0
                        ? "flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-sky-600 to-teal-500 font-bold text-white shadow-[0_0_18px_rgba(14,165,233,0.35)] dark:from-sky-400 dark:to-teal-300 dark:text-slate-900"
                        : "flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/70 font-bold text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
                    }
                  >
                    {index + 1}
                  </div>
                  <span
                    className={
                      index === 0
                        ? "mt-2 text-sm font-medium text-slate-900 dark:text-slate-100"
                        : "mt-2 text-sm font-medium text-slate-500 dark:text-slate-400"
                    }
                  >
                    {title}
                  </span>
                </div>

                {index < stepTitles.length - 1 ? (
                  <div
                    className={
                      index === 0
                        ? "relative z-10 h-[2px] flex-1 bg-gradient-to-r from-sky-500/60 to-teal-400/60"
                        : "relative z-10 h-[2px] flex-1 bg-slate-200/80 dark:bg-white/10"
                    }
                  />
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <div className="mt-8 flex flex-col gap-8 lg:flex-row">
          <section className="glass-panel w-full rounded-[40px] p-8 shadow-2xl lg:w-2/3 lg:p-10">
            <form className="space-y-8" onSubmit={handleSubmit}>
              <div>
                <label className="mb-3 block text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <span className="mr-1 text-rose-500">*</span>
                  选择小说类型
                </label>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {genres.map((genre) => {
                    const active = selectedGenre === genre.id;
                    return (
                      <button
                        key={genre.id}
                        type="button"
                        onClick={() => setSelectedGenre(genre.id)}
                        className={[
                          "glass-card group relative overflow-hidden rounded-2xl p-4 text-left",
                          "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl",
                          active
                            ? "ring-1 ring-sky-400/60 bg-sky-500/10 dark:ring-sky-300/40"
                            : "hover:ring-1 hover:ring-sky-300/40",
                        ].join(" ")}
                      >
                        <div
                          className={`pointer-events-none absolute right-0 top-0 h-16 w-16 rounded-bl-full bg-gradient-to-br ${genre.gradient} opacity-15 transition-transform duration-300 group-hover:scale-110`}
                        />
                        <div className="relative z-10 flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/70 bg-white/60 text-lg shadow-sm dark:border-white/10 dark:bg-white/5">
                            {genre.icon}
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {genre.name}
                            </h4>
                            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                              {genre.tags.slice(0, 4).join(" · ")}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                    <span className="mr-1 text-rose-500">*</span>
                    详细描述你的创意
                  </label>
                  <button
                    type="button"
                    disabled={aiBusy}
                    onClick={handleGenerateAi}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/60 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 dark:focus-visible:ring-offset-[#05070c]"
                  >
                    {aiBusy ? (
                      <Sparkles className="h-4 w-4 animate-pulse text-sky-500 dark:text-sky-300" />
                    ) : (
                      <Zap className="h-4 w-4 text-sky-600 dark:text-sky-300" />
                    )}
                    {aiBusy ? "AI 思考中..." : "AI 生成创意"}
                  </button>
                </div>

                <div className="relative">
                  <textarea
                    value={idea}
                    onChange={(event) => updateIdea(event.target.value)}
                    rows={6}
                    required
                    className="w-full resize-y rounded-2xl border border-slate-200/80 bg-white/60 px-5 py-4 text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:ring-offset-2 focus:ring-offset-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-sky-300/50 dark:focus:ring-offset-[#05070c]"
                    placeholder={
                      "描述你的小说创意，例如：\n• 主角的身份背景和特殊能力\n• 故事的主要冲突和爽点\n• 想要的写作风格和氛围\n\n或者点击右侧的模板快速填充..."
                    }
                  />
                  <div className="absolute bottom-3 right-4 text-xs text-slate-400 dark:text-slate-400">
                    <span className={wordCount > 2000 ? "text-rose-500" : ""}>
                      {wordCount}
                    </span>{" "}
                    / 2000
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-100">
                    目标平台{" "}
                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                      (可选，按平台风格创作)
                    </span>
                  </label>
                  <select
                    value={platform}
                    onChange={(event) => setPlatform(event.target.value)}
                    className="w-full cursor-pointer appearance-none rounded-2xl border border-slate-200/80 bg-white/60 px-4 py-3 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:ring-offset-2 focus:ring-offset-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:ring-sky-300/50 dark:focus:ring-offset-[#05070c]"
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
                  <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-100">
                    仿书 DNA{" "}
                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                      (内测功能，仅管理员可用)
                    </span>
                  </label>
                  <select
                    value={dna}
                    onChange={(event) => setDna(event.target.value)}
                    disabled={!isAdmin}
                    className="w-full cursor-pointer appearance-none rounded-2xl border border-slate-200/80 bg-white/60 px-4 py-3 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:ring-sky-300/50 dark:focus:ring-offset-[#05070c]"
                  >
                    <option value="">选择仿书 DNA 风格</option>
                    {dnaStyles.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>

                  <div className="mt-3">
                    <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      自定义书名（可选）
                    </div>
                    <input
                      value={dnaBookTitle}
                      disabled={!isAdmin}
                      onChange={(event) => {
                        const value = event.target.value;
                        setDnaBookTitle(value);
                        if (value.trim()) {
                          setDna("");
                        }
                      }}
                      placeholder={
                        isAdmin
                          ? "例如：诡秘之主 / 凡人修仙传 / 庆余年"
                          : "内测中：仅管理员可使用"
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white/60 px-4 py-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:ring-sky-300/50 dark:focus:ring-offset-[#05070c]"
                    />
                    <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      输入书名后，生成大纲时会尝试进行网络检索并抽象其写法与结构（不复刻原作剧情）。
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-100">
                  目标字数
                </label>
                <select
                  value={words}
                  onChange={(event) => setWords(event.target.value)}
                  className="w-full cursor-pointer appearance-none rounded-2xl border border-slate-200/80 bg-white/60 px-4 py-3 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:ring-offset-2 focus:ring-offset-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:ring-sky-300/50 dark:focus:ring-offset-[#05070c]"
                >
                  {wordOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200/60 pt-6 dark:border-white/10">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/60 px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10 dark:focus-visible:ring-offset-[#05070c]"
                >
                  取消
                </Link>
                <button
                  type="submit"
                  disabled={submitBusy}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-600 to-teal-500 px-7 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-600/15 transition hover:from-sky-500 hover:to-teal-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-70 dark:from-sky-400 dark:to-teal-300 dark:text-slate-900 dark:shadow-sky-500/10 dark:focus-visible:ring-offset-[#05070c]"
                >
                  {submitBusy ? "生成中..." : "生成大纲"}
                </button>
              </div>
            </form>
          </section>

          <aside className="glass-panel sticky top-24 flex h-fit flex-1 flex-col overflow-hidden rounded-[40px] shadow-2xl">
            <div className="flex items-center gap-2 border-b border-slate-200/60 px-6 py-5 dark:border-white/10">
              <Flame className="h-5 w-5 text-sky-600/80 dark:text-sky-300/80" />
              <h3 className="font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                热门模板
              </h3>
            </div>

            <div className="flex min-h-[420px] flex-1 flex-col p-6">
              {!selectedGenre ? (
                <div className="flex flex-1 flex-col items-center justify-center text-center">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-slate-200/70 bg-white/60 dark:border-white/10 dark:bg-white/5">
                    <Sparkles className="h-9 w-9 text-slate-400 dark:text-white/30" />
                  </div>
                  <p className="font-medium text-slate-700 dark:text-slate-200">
                    请先选择小说类型
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    选择后将显示对应的热门模板
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {hotTemplates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => {
                        updateIdea(template.content);
                        void apiRequest("/api/create/templates/use", {
                          templateId: template.id,
                        });
                      }}
                      className="rounded-2xl border border-slate-200/70 bg-white/60 p-4 text-left text-sm leading-relaxed text-slate-700 shadow-sm transition hover:border-sky-300 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-sky-300/30 dark:hover:bg-white/10 dark:focus-visible:ring-offset-[#05070c]"
                    >
                      {template.content}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>

        {outline ? (
          <section
            id="outline-panel"
            className="glass-panel mt-8 rounded-[40px] p-8 shadow-2xl lg:p-10"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-sky-600 dark:text-sky-300">
                  输出
                </div>
                <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
                  AI 生成大纲（预览）
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300/80">
                  你可以在此基础上继续编辑，再进入下一步确认流程。
                </p>
              </div>

              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(outline);
                    window.alert("已复制到剪贴板");
                  } catch {
                    window.alert("复制失败，请手动选择复制");
                  }
                }}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/60 px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
              >
                复制大纲
              </button>
            </div>

            <textarea
              value={outline}
              readOnly
              rows={14}
              className="mt-6 w-full resize-y rounded-3xl border border-slate-200/80 bg-white/60 px-5 py-4 text-sm leading-relaxed text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:ring-offset-2 focus:ring-offset-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:ring-sky-300/30 dark:focus:ring-offset-[#05070c]"
            />
          </section>
        ) : null}
      </div>
    </main>
  );
}

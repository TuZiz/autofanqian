"use client";

import type { DashboardCreateController } from "@/lib/create/use-dashboard-create";
import { AlertCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

import { CreateGenreSection } from "./create-genre-section";
import { CreateIdeaSection } from "./create-idea-section";
import { CreateOptionsSection } from "./create-options-section";
import { CreateSteps } from "./create-steps";
import { CreateTemplateSidebar } from "./create-template-sidebar";
import { ThemeToggle } from "@/components/theme/theme-toggle";

type DashboardCreateViewProps = {
  create: DashboardCreateController;
};

export function DashboardCreateView({ create }: DashboardCreateViewProps) {
  return (
    <main className="relative min-h-screen w-full bg-zinc-50 dark:bg-black font-sans text-zinc-900 dark:text-zinc-50 transition-colors duration-500 selection:bg-blue-500/30">
      
      {/* 沉浸式弥散背景 */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute left-[10%] top-[-10%] h-[600px] w-[600px] rounded-full bg-blue-500/10 blur-[120px] mix-blend-multiply dark:bg-blue-600/10" />
        <div className="absolute right-[10%] top-[20%] h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-[120px] mix-blend-multiply dark:bg-purple-600/10" />
      </div>
      <div className="pointer-events-none absolute inset-0 z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />

      {/* 顶部悬浮导航胶囊 */}
      <div className="relative z-50 flex items-center justify-center pt-6 px-4">
        <header className="flex w-full max-w-5xl items-center justify-between rounded-full border border-white/40 bg-white/70 px-4 py-3 shadow-lg shadow-black/5 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-900/60 transition-all hover:shadow-xl hover:shadow-black/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-inner">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-black text-zinc-900 dark:text-white">创建作品</div>
              <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">CREATOR COCKPIT</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle className="h-10 w-10 rounded-full border border-white/20 bg-white/50 p-2 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-black/20" />
            <Link
              href="/dashboard"
              className="flex h-10 items-center justify-center rounded-full bg-zinc-100 px-5 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-white/10 dark:text-zinc-300 dark:hover:bg-white/20"
            >
              取消
            </Link>
          </div>
        </header>
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-6 pb-32 pt-16 lg:px-8 lg:pb-40">
        
        {/* 巨幕标题区 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-black tracking-widest text-blue-600 dark:bg-blue-400/10 dark:text-blue-400 mb-6 ring-1 ring-blue-500/20">
            <Sparkles className="h-3.5 w-3.5" />
            <span>NEW STORY</span>
          </div>
          <h1 className="text-5xl font-black tracking-tight sm:text-6xl lg:text-[72px] bg-clip-text text-transparent bg-gradient-to-br from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-500">
            构筑新世界
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-medium leading-relaxed text-zinc-500 dark:text-zinc-400">
            不用担心细节，只需写下你最原始的灵感。AI 会在此基础上，为你推演大纲、设计角色、搭建完整的剧情骨架。
          </p>
        </motion.div>

        {/* 进度指示器 */}
        <div className="mb-12">
          <CreateSteps />
        </div>

        {/* 主体表单区 */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col gap-8 lg:flex-row"
        >
          {/* 左侧主表单区域，使用大卡片 */}
          <section className="w-full rounded-[32px] border border-white/40 bg-white/60 p-8 shadow-xl shadow-black/5 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-900/50 sm:p-10 lg:w-[65%]">
            <form
              id="dashboard-create-form"
              className="flex flex-col gap-12"
              onSubmit={create.handleSubmit}
              noValidate
            >
              <CreateFormError message={create.formError} />
              <CreateGenreSection create={create} />
              
              <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-200 to-transparent dark:via-zinc-800" />
              
              <CreateIdeaSection create={create} />
              
              <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-200 to-transparent dark:via-zinc-800" />
              
              <CreateOptionsSection create={create} />
            </form>
          </section>

          {/* 右侧模板建议侧边栏 */}
          <aside className="w-full lg:w-[35%]">
            <div className="sticky top-28">
              <CreateTemplateSidebar create={create} />
            </div>
          </aside>
        </motion.div>

      </div>

      {/* 底部固定操作栏 (悬浮风格) */}
      <div className="fixed bottom-8 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-full border border-white/20 bg-white/80 p-2 shadow-2xl shadow-blue-900/10 backdrop-blur-xl dark:border-white/10 dark:bg-black/60 sm:gap-6 sm:p-3 w-[90%] max-w-lg">
        <Link
          href="/dashboard"
          className="flex h-12 flex-1 items-center justify-center rounded-full bg-zinc-100 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-white/10 dark:text-zinc-300 dark:hover:bg-white/20"
        >
          放弃创建
        </Link>
        <button
          type="submit"
          form="dashboard-create-form"
          disabled={create.submitBusy}
          className="group relative flex h-12 flex-[1.5] items-center justify-center overflow-hidden rounded-full bg-blue-600 px-6 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-70 dark:bg-blue-600"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100 group-hover:animate-[rewrite-button-shine_1.5s_ease-in-out_infinite]" />
          {create.submitBusy ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              AI 推演中...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              生成专属大纲
            </span>
          )}
        </button>
      </div>
    </main>
  );
}

function CreateFormError({ message }: { message: string }) {
  if (!message) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      id="create-form-error"
      role="alert"
      aria-live="polite"
      tabIndex={-1}
      className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold leading-relaxed text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
    >
      <span className="flex items-center gap-3">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <span>{message}</span>
      </span>
    </motion.div>
  );
}

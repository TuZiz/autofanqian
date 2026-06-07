"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpenCheck,
  Brush,
  Lightbulb,
  ListTree,
  Sparkles,
  UserRoundCog,
  WandSparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/design-system";

const ASSISTANT_ACTIONS = [
  { label: "续写方向", icon: Lightbulb },
  { label: "剧情诊断", icon: BookOpenCheck },
  { label: "章节大纲", icon: ListTree },
  { label: "角色塑造", icon: UserRoundCog },
  { label: "爽点设计", icon: WandSparkles },
  { label: "文风调整", icon: Brush },
];

type AIAssistantDrawerProps = {
  activeWorkTitle: string | null;
  open: boolean;
  onClose: () => void;
};

export function AIAssistantDrawer({
  activeWorkTitle,
  open,
  onClose,
}: AIAssistantDrawerProps) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="关闭 AI 创作助手"
            className="fixed inset-0 z-[70] bg-slate-950/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed bottom-0 right-0 top-0 z-[80] flex w-full max-w-[420px] flex-col border-l border-[var(--theme-border)] bg-[var(--theme-panel-strong)] shadow-[var(--theme-shadow-panel)] backdrop-blur-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[var(--theme-divider)] px-5 py-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-bold text-[var(--theme-ai-text)]">
                  <Sparkles className="h-4 w-4" />
                  创作副驾驶
                </div>
                <h2 className="mt-2 text-xl font-extrabold text-[var(--theme-text-strong)]">
                  AI 创作助手
                </h2>
                <p className="mt-1 truncate text-sm font-medium text-[var(--theme-text-muted)]">
                  {activeWorkTitle ? `正在分析《${activeWorkTitle}》` : "选择作品后可获得更精准建议"}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)]"
                aria-label="关闭"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
              <div className="grid grid-cols-2 gap-2">
                {ASSISTANT_ACTIONS.map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.label}
                      type="button"
                      className="flex min-h-20 flex-col items-start justify-between rounded-[4px] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-3 text-left text-sm font-bold text-[var(--theme-text-strong)] transition hover:border-[var(--theme-border-strong)] hover:bg-[var(--theme-surface-hover)]"
                    >
                      <Icon className="h-4 w-4 text-[var(--theme-ai-600)]" />
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <label className="block" htmlFor="dashboard-ai-assistant-input">
                <span className="mb-2 block text-xs font-bold text-[var(--theme-text-muted)]">
                  自定义需求
                </span>
                <textarea
                  id="dashboard-ai-assistant-input"
                  placeholder="让 AI 帮你规划、分析或生成灵感..."
                  className="min-h-36 w-full resize-none rounded-[4px] border border-[var(--theme-border)] bg-[var(--theme-input)] px-4 py-3 text-sm font-medium leading-6 text-[var(--theme-text-primary)] outline-none transition placeholder:text-[var(--theme-text-muted)] focus:border-[var(--theme-ai-border)] focus:ring-4 focus:ring-[var(--theme-ai-subtle)]"
                />
              </label>
            </div>

            <div className="border-t border-[var(--theme-divider)] p-5">
              <Button type="button" tone="ai" icon={Sparkles} className="w-full rounded-[4px]">
                生成灵感建议
              </Button>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

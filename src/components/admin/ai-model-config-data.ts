import {
  BookOpen,
  FileText,
  KeyRound,
  Layers3,
  ListChecks,
  PenLine,
  RefreshCw,
  Route,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import type { AiModelConfigKey } from "@/lib/admin/ai-model-types";

export type AiModelRoute = {
  api: string;
  description: string;
  icon: LucideIcon;
  key: AiModelConfigKey;
  title: string;
};

export type AiModelRouteGroup = {
  accentClass: string;
  description: string;
  routes: AiModelRoute[];
  title: string;
};

export const routeGroups: AiModelRouteGroup[] = [
  {
    title: "创作入口",
    description: "创意、卖点、标题和受众分析。",
    accentClass:
      "border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)]",
    routes: [
      {
        key: "ideaGenerate",
        title: "生成创意",
        api: "/api/ai/idea",
        icon: Sparkles,
        description: "从题材、标签、平台和参考风格生成创意稿。",
      },
      {
        key: "ideaAnalyze",
        title: "创意分析",
        api: "/api/ai/idea/analyze",
        icon: ListChecks,
        description: "输出卖点、标题、关键词和目标读者。",
      },
    ],
  },
  {
    title: "大纲规划",
    description: "作品结构、分卷布局和后续扩展规划。",
    accentClass:
      "border-[var(--theme-info-border)] bg-[var(--theme-info-soft)] text-[var(--theme-info-text)]",
    routes: [
      {
        key: "outlineGenerate",
        title: "生成大纲",
        api: "/api/ai/outline",
        icon: Layers3,
        description: "把创意扩展成全书大纲、分卷结构和章节范围。",
      },
    ],
  },
  {
    title: "正文生产",
    description: "正文生成、润色和重写。",
    accentClass:
      "border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] text-[var(--theme-text-strong)]",
    routes: [
      {
        key: "chapterGenerate",
        title: "生成章节正文",
        api: "/api/ai/chapter",
        icon: PenLine,
        description:
          "正文智能链：xtokenmirror gpt-5.5 -> 99dun gpt-5.5 -> 豆包，生成前自动微探针选路。",
      },
      {
        key: "chapterRewrite",
        title: "章节改写 / 润色",
        api: "/api/ai/chapter/rewrite",
        icon: RefreshCw,
        description: "写作页中的润色、扩写、压缩和冲突检查。",
      },
    ],
  },
  {
    title: "章节辅助",
    description: "摘要、章节纲要和细节设定抽取。",
    accentClass:
      "border-[var(--theme-warning-border)] bg-[var(--theme-warning-soft)] text-[var(--theme-warning-text)]",
    routes: [
      {
        key: "chapterSummary",
        title: "生成章节摘要",
        api: "/api/ai/chapter/summary",
        icon: FileText,
        description: "阅读正文后生成本章摘要，用于连续性回顾。",
      },
      {
        key: "chapterOutline",
        title: "生成章节大纲",
        api: "/api/ai/chapter/outline",
        icon: BookOpen,
        description: "从全书大纲或正文整理本章写作提纲。",
      },
      {
        key: "chapterDetails",
        title: "提取细节设定",
        api: "/api/ai/chapter/details",
        icon: KeyRound,
        description: "抽取人物、地点、道具、组织和规则。",
      },
    ],
  },
  {
    title: "二次生成",
    description: "已有内容的重新生成和统一优化。",
    accentClass:
      "border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)]",
    routes: [
      {
        key: "regenerateAll",
        title: "全部重新生成",
        api: "全局复用：重规划 / 改写 / 元信息重生",
        icon: RefreshCw,
        description: "创意、摘要、章节纲要、细节和扩展统一走这里。",
      },
    ],
  },
  {
    title: "管理工具",
    description: "管理员专用的模板学习能力。",
    accentClass:
      "border-[var(--theme-danger-border)] bg-[var(--theme-danger-soft)] text-[var(--theme-danger-text)]",
    routes: [
      {
        key: "templatesLearn",
        title: "模板库学习生成",
        api: "/api/admin/templates/learn",
        icon: Route,
        description: "根据近期创意和热门模板生成新的预设模板内容。",
      },
    ],
  },
];

export const allRoutes = routeGroups.flatMap((group) => group.routes);

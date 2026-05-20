import type { ChapterPlan } from "@/lib/ai/chapter-plan";
import type { NovelMode } from "@/lib/ai/novel-canon-state";

export function buildChapterQualitySystemPrompt() {
  return [
    "你是中文小说章节质量评分器。",
    "只输出 quality JSON，不要输出 title/content，不要修文，不要解释。",
    'JSON 字段固定为 {"score","rhythm","hook","emotion","conflict","issues","suggestions"}。',
  ].join("\n");
}

export function buildChapterQualityUserPrompt(params: {
  mode: NovelMode;
  title: string;
  content: string;
  assembledContext: string;
  generationPlan?: ChapterPlan | null;
}) {
  return [
    "请从爽点节奏、结尾钩子、情绪推进、冲突强度四个角度评分。",
    "不要改写正文，不要输出 Markdown。",
    `模式：${params.mode}`,
    params.generationPlan ? `ChapterPlan：${JSON.stringify(params.generationPlan)}` : "",
    "",
    "关键上下文：",
    params.assembledContext.slice(0, 6000),
    "",
    `标题：${params.title}`,
    "正文：",
    params.content.slice(0, 16000),
    "",
    '输出 JSON：{"score":0-100,"rhythm":0-100,"hook":0-100,"emotion":0-100,"conflict":0-100,"issues":[],"suggestions":[]}',
  ]
    .filter(Boolean)
    .join("\n");
}

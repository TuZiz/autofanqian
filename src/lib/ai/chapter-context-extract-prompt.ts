export const MAX_CONTENT_CHARS = 14_000;
export const MAX_PROMPT_CHARS = 20_000;

function clampText(value: string | null | undefined, maxChars: number) {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return normalized.length > maxChars ? `${normalized.slice(0, maxChars)}...` : normalized;
}

export function buildContextExtractSystemPrompt() {
  return [
    "你是中文长篇小说的连续性编辑，负责把单章正文提炼成可回写到长期状态库的结构化信息。",
    "请严格只输出合法 JSON，不要 Markdown，不要代码块，不要解释。",
    "",
    "输出目标：",
    "1) summary：本章客观摘要，120-260字。",
    "2) details：8-16条关键细节，优先人物状态、关系变化、地点、时间线、关键道具、规则、承诺、伤势、身份信息。",
    "3) memories：只保留值得跨章节长期记忆的事实/约束/状态，避免重复废话。",
    "4) timelineEvents：只列本章真正推进主线或重要支线的事件。",
    "5) foreshadowings：只列新增或明显推进的伏笔。",
    "6) characterUpdates：只更新本章确实发生变化的角色，name 必须来自已有角色名单。",
    "",
    "JSON schema:",
    '{"summary": string, "details": string[], "memories": [{"kind": "fact|style|constraint|character_state|plot_thread|detail|continuity", "priority": 1-100, "content": string}], "timelineEvents": [{"title": string|null, "summary": string, "description": string|null, "storyTime": string|null, "canonical": true}], "foreshadowings": [{"title": string|null, "hint": string, "payoff": string|null, "importance": 1-100, "status": "open|partial|resolved|dropped"}], "characterUpdates": [{"name": string, "currentState": string|null, "goal": string|null, "notes": string|null}]}',
  ].join("\n");
}

export function buildContextExtractUserPrompt(params: {
  work: { title: string; tag: string; synopsis: string };
  chapter: {
    title: string | null;
    content: string;
    summary: string | null;
    chapterOutline: string | null;
  };
  index: number;
  characters: Array<{
    name: string;
    aliases: string[];
    role: string;
    currentState: string | null;
    goal: string | null;
    desc: string;
  }>;
  memories: Array<{ kind: string; content: string }>;
  timelineEvents: Array<{ chapterIndex: number | null; title: string | null; summary: string }>;
  foreshadowings: Array<{
    plantedChapter: number | null;
    title: string | null;
    hint: string;
    payoff: string | null;
    status: string;
  }>;
}) {
  const characterBlock = params.characters.length
    ? params.characters
        .map((item) =>
          `- ${item.name}（${item.role || "角色"}）: ${clampText(item.currentState || item.goal || item.desc, 160)}`,
        )
        .join("\n")
    : "- 无";

  const memoryBlock = params.memories.length
    ? params.memories
        .map((item) => `- [${item.kind}] ${clampText(item.content, 180)}`)
        .join("\n")
    : "- 无";

  const timelineBlock = params.timelineEvents.length
    ? params.timelineEvents
        .map((item) =>
          `- ${item.chapterIndex ? `第${item.chapterIndex}章 ` : ""}${item.title || item.summary}: ${clampText(item.summary, 180)}`,
        )
        .join("\n")
    : "- 无";

  const foreshadowingBlock = params.foreshadowings.length
    ? params.foreshadowings
        .map((item) =>
          `- ${item.title || "伏笔"}（${item.status}）: ${clampText(item.hint, 120)}${item.payoff ? ` -> ${clampText(item.payoff, 120)}` : ""}`,
        )
        .join("\n")
    : "- 无";

  return [
    `作品标题：${params.work.title}`,
    `题材标签：${params.work.tag || "-"}`,
    `作品简介：${clampText(params.work.synopsis, 500) || "-"}`,
    "",
    `章节：第${params.index}章`,
    `章节标题：${params.chapter.title || "-"}`,
    params.chapter.summary?.trim()
      ? `已有章节摘要：${clampText(params.chapter.summary, 300)}`
      : "已有章节摘要：无",
    params.chapter.chapterOutline?.trim()
      ? `已有章节大纲：${clampText(params.chapter.chapterOutline, 400)}`
      : "已有章节大纲：无",
    "",
    `已有角色状态：\n${characterBlock}`,
    "",
    `已有长期记忆：\n${memoryBlock}`,
    "",
    `已有最近时间线：\n${timelineBlock}`,
    "",
    `已有未回收伏笔：\n${foreshadowingBlock}`,
    "",
    "本章正文：",
    params.chapter.content.slice(0, MAX_CONTENT_CHARS),
  ].join("\n");
}

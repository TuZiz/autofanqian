import type { StoryOutline, StoryOutlineRole } from "@/lib/create/outline-draft";

function roleToChinese(role: StoryOutlineRole) {
  switch (role) {
    case "protagonist":
      return "主角";
    case "heroine":
      return "女主";
    case "antagonist":
      return "反派";
    case "supporting":
      return "配角";
    default:
      return String(role);
  }
}

function formatChapterRange(startChapter?: number, endChapter?: number) {
  if (typeof startChapter !== "number" || typeof endChapter !== "number") return "";
  return startChapter === endChapter
    ? `第${startChapter}章`
    : `第${startChapter}-${endChapter}章`;
}

function formatOutlineVolume(volume: StoryOutline["volumes"][number], index: number) {
  const range = formatChapterRange(volume.startChapter, volume.endChapter);
  const segments =
    volume.segments
      ?.map((segment) => {
        const segmentRange = formatChapterRange(
          segment.startChapter,
          segment.endChapter,
        );
        return `  - ${segment.title}${segmentRange ? `（${segmentRange}）` : ""}：${segment.desc}`;
      })
      .join("\n") ?? "";

  return [
    `${index + 1}. ${volume.name}${range ? `（${range}）` : ""}`,
    `概要：${volume.desc}`,
    segments ? `章节小节：\n${segments}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildChapterSystemPrompt() {
  return [
    "你是一名资深中文网文作者与编辑。",
    "你将根据用户提供的作品信息与分卷大纲，生成指定章节的正文草稿。",
    "",
    "输出要求：",
    "1) 只输出 JSON，不要 Markdown，不要代码块，不要多余解释。",
    '2) JSON 结构固定为：{"title": "...", "content": "..."}',
    "3) title 为本章标题（不要包含书名），必须是 JSON 字符串（用双引号包裹），10-22 字内更好。",
    "4) content 为本章正文（必须是 JSON 字符串）。如需换行/分段，请在字符串中用 \\n 表示，不要输出真实换行。",
    "4.1) 正文对话引号尽量使用中文引号“”或「」，避免使用英文双引号 (\") 造成 JSON 转义错误；如必须出现英文双引号，请用 \\\" 转义。",
    "5) 必须输出严格合法 JSON（引号、反斜杠、换行等都要正确转义），不要输出额外字段。",
    "",
    "写作要求：",
    "1) 中文网文风格，节奏快、冲突直给、短剧化。",
    "2) 结尾必须留钩子，推动读者继续。",
    "3) 避免空泛总结，尽量用场景与动作推动剧情。",
  ].join("\n");
}

export function buildChapterUserPrompt(params: {
  chapterIndex: number;
  work: {
    genreId?: string | null;
    genreLabel?: string | null;
    tags?: string[] | null;
    platformLabel?: string | null;
    words?: string | null;
    dnaBookTitle?: string | null;
    idea: string;
    title: string;
    synopsis: string;
  };
  outline: StoryOutline;
  extraPrompt?: string | null;
}) {
  const tags = (params.work.tags ?? []).filter(Boolean).slice(0, 8);
  const tagLine = tags.length ? `标签：${tags.join("、")}` : "";
  const extraPrompt = typeof params.extraPrompt === "string" ? params.extraPrompt.trim() : "";

  const metaLines = [
    params.work.genreLabel || params.work.genreId ? `类型：${params.work.genreLabel || params.work.genreId}` : "",
    tagLine,
    params.work.platformLabel ? `平台：${params.work.platformLabel}` : "",
    params.work.words ? `目标字数：${params.work.words}` : "",
    params.work.dnaBookTitle ? `参考书名：${params.work.dnaBookTitle}（只抽象写法与结构，不复刻原作剧情）` : "",
  ].filter(Boolean);

  const volumes = params.outline.volumes.map(formatOutlineVolume).join("\n\n");

  const characters = params.outline.characters
    .map((c) => `${c.name}（${roleToChinese(c.role)}）：${c.desc}`)
    .join("\n");

  const chapterIndex = params.chapterIndex;

  return [
    `作品标题：${params.work.title || params.outline.title}`,
    ...metaLines,
    "",
    `创意描述：${params.work.idea}`,
    "",
    `作品简介：${params.work.synopsis}`,
    "",
    `分卷结构：\n${volumes}`,
    "",
    `主要角色：\n${characters}`,
    "",
    `现在请你生成第 ${chapterIndex} 章正文草稿。`,
    "长度建议：约 2800-4500 字（中文字符）。",
    "第 1 章重点：快速开场 + 主角登场 + 明确外部压力/危机 + 埋下主线悬念。",
    ...(extraPrompt ? ["", `补充要求（优先遵循）：${extraPrompt}`] : []),
    "注意：只输出严格合法 JSON（换行用 \\n，需要的双引号要转义）。",
  ].join("\n");
}

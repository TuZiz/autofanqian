import type { StoryOutline, StoryOutlineRole } from "@/lib/create/outline-draft";
import type { ShortStoryOutline } from "@/lib/create/short-story-outline-schema";
import type { ChapterPlan } from "@/lib/ai/chapter-plan";
import type { NovelMode } from "@/lib/ai/novel-canon-state";
import { isShortStoryWork } from "@/shared/work-type";

type ChapterPromptOutline = StoryOutline | ShortStoryOutline;

function clampInline(value: string | null | undefined, maxChars: number) {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return normalized.length > maxChars
    ? `${normalized.slice(0, maxChars)}...`
    : normalized;
}

function roleToChinese(role: StoryOutlineRole | string) {
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

function findFocusVolumeIndex(
  volumes: StoryOutline["volumes"],
  chapterIndex: number,
) {
  const exact = volumes.findIndex((volume) => {
    if (
      typeof volume.startChapter !== "number" ||
      typeof volume.endChapter !== "number"
    ) {
      return false;
    }

    return chapterIndex >= volume.startChapter && chapterIndex <= volume.endChapter;
  });

  if (exact >= 0) return exact;

  const planned = volumes.findIndex(
    (volume) =>
      volume.detailLevel === "detailed" ||
      volume.status === "planned" ||
      volume.status === "active",
  );

  return planned >= 0 ? planned : 0;
}

function isShortStoryOutline(outline: ChapterPromptOutline): outline is ShortStoryOutline {
  return Array.isArray((outline as Partial<ShortStoryOutline>).beats);
}

function getVisibleVolumes(
  outline: StoryOutline,
  chapterIndex: number,
) {
  const volumes = outline.volumes ?? [];
  if (volumes.length <= 2) {
    return volumes.map((volume, index) => ({ volume, outlineIndex: index }));
  }

  const focusIndex = findFocusVolumeIndex(volumes, chapterIndex);
  const start = chapterIndex === 1 ? 0 : Math.max(0, focusIndex - 1);
  const end =
    chapterIndex === 1
      ? Math.min(volumes.length - 1, 1)
      : Math.min(volumes.length - 1, focusIndex + 1);

  return volumes
    .slice(start, end + 1)
    .map((volume, offset) => ({ volume, outlineIndex: start + offset }));
}

function getVisibleSegments(
  volume: StoryOutline["volumes"][number],
  chapterIndex: number,
) {
  const segments = volume.segments ?? [];
  if (segments.length <= 4) return segments;

  const focusIndex = segments.findIndex((segment) => {
    if (
      typeof segment.startChapter !== "number" ||
      typeof segment.endChapter !== "number"
    ) {
      return false;
    }

    return chapterIndex >= segment.startChapter && chapterIndex <= segment.endChapter;
  });

  if (focusIndex < 0) {
    return segments.slice(0, 3);
  }

  const start = Math.max(0, focusIndex - 1);
  return segments.slice(start, Math.min(segments.length, start + 3));
}

function formatOutlineVolume(params: {
  volume: StoryOutline["volumes"][number];
  outlineIndex: number;
  chapterIndex: number;
}) {
  const { volume, outlineIndex, chapterIndex } = params;
  const range = formatChapterRange(volume.startChapter, volume.endChapter);
  const segments =
    getVisibleSegments(volume, chapterIndex)
      ?.map((segment) => {
        const segmentRange = formatChapterRange(
          segment.startChapter,
          segment.endChapter,
        );
        return `  - ${segment.title}${segmentRange ? `（${segmentRange}）` : ""}：${clampInline(segment.desc, 72)}`;
      })
      .join("\n") ?? "";

  return [
    `${outlineIndex + 1}. ${volume.name}${range ? `（${range}）` : ""}`,
    `概要：${clampInline(volume.desc, 96)}`,
    segments ? `章节小节：\n${segments}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function formatShortBeat(beat: ShortStoryOutline["beats"][number]) {
  return [
    `${beat.index}. ${beat.title}（约 ${beat.targetWords} 字）`,
    `目的：${clampInline(beat.purpose, 96)}`,
    `写作提示：${clampInline(beat.writingPrompt, 140)}`,
  ].join("\n");
}

function formatPlanForPrompt(plan?: ChapterPlan | null) {
  return plan ? JSON.stringify(plan, null, 2) : "";
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
    workType?: string | null;
    idea: string;
    title: string;
    synopsis: string;
  };
  outline: ChapterPromptOutline;
  context?: {
    previousSummary?: string | null;
    previousEnding?: string | null;
    recentSummaries?: Array<{ index: number; title?: string | null; summary: string }>;
    writingMemories?: string[];
    characters?: string[];
    worldSettings?: string[];
    timelineEvents?: string[];
    foreshadowings?: string[];
  };
  assembledContext?: string | null;
  generationPlan?: ChapterPlan | null;
  mode?: NovelMode;
  continuityWarnings?: string[];
  legacyContext?: unknown;
  extraPrompt?: string | null;
}) {
  const tags = (params.work.tags ?? []).filter(Boolean).slice(0, 5);
  const tagLine = tags.length ? `标签：${tags.join("、")}` : "";
  const extraPrompt = typeof params.extraPrompt === "string" ? params.extraPrompt.trim() : "";
  const assembledContext =
    typeof params.assembledContext === "string" ? params.assembledContext.trim() : "";
  const useAssembledContext = assembledContext.length > 0;
  const shortStory =
    params.mode === "short" ||
    isShortStoryWork(params.work.workType) ||
    isShortStoryOutline(params.outline);
  const mode: NovelMode = shortStory ? "short" : "long";

  const metaLines = [
    params.work.genreLabel || params.work.genreId ? `类型：${params.work.genreLabel || params.work.genreId}` : "",
    tagLine,
    params.work.platformLabel ? `平台：${params.work.platformLabel}` : "",
    params.work.words ? `目标字数：${params.work.words}` : "",
    params.work.dnaBookTitle ? `参考书名：${params.work.dnaBookTitle}（只抽象写法与结构，不复刻原作剧情）` : "",
  ].filter(Boolean);

  const focusBeat = isShortStoryOutline(params.outline)
    ? params.outline.beats.find((beat) => beat.index === params.chapterIndex)
    : null;
  const structure = isShortStoryOutline(params.outline)
    ? params.outline.beats
        .slice(Math.max(0, params.chapterIndex - 2), params.chapterIndex + 2)
        .map(formatShortBeat)
        .join("\n\n")
    : getVisibleVolumes(params.outline, params.chapterIndex)
        .map(({ volume, outlineIndex }) =>
          formatOutlineVolume({
            volume,
            outlineIndex,
            chapterIndex: params.chapterIndex,
          }),
        )
        .join("\n\n");

  const characters = isShortStoryOutline(params.outline)
    ? params.outline.characters
        .slice(0, 5)
        .map((c) => `${c.name}（${c.role}）：${clampInline(c.description, 72)}`)
        .join("\n")
    : params.outline.characters
        .slice(0, 6)
        .map((c) => `${c.name}（${roleToChinese(c.role)}）：${clampInline(c.desc, 72)}`)
        .join("\n");

  const chapterIndex = params.chapterIndex;
  const previousContext = [
    params.context?.previousSummary
      ? `上一章摘要：${clampInline(params.context.previousSummary, 220)}`
      : "",
    params.context?.previousEnding
      ? `上一章结尾片段：${clampInline(params.context.previousEnding, 320)}`
      : "",
  ].filter(Boolean);
  const recentSummaries = (params.context?.recentSummaries ?? [])
    .slice(0, 3)
    .map(
      (item) =>
        `第${item.index}章${item.title ? `《${item.title}》` : ""}：${clampInline(item.summary, 120)}`,
    )
    .join("\n");
  const writingMemories = (params.context?.writingMemories ?? [])
    .filter(Boolean)
    .slice(0, 6)
    .map((item) => `- ${clampInline(item, 96)}`)
    .join("\n");
  const libraryContext = [
    (params.context?.characters ?? []).length
      ? `角色库重点：\n${(params.context?.characters ?? []).slice(0, 6).map((item) => `- ${clampInline(item, 96)}`).join("\n")}`
      : "",
    (params.context?.worldSettings ?? []).length
      ? `关键设定：\n${(params.context?.worldSettings ?? []).slice(0, 6).map((item) => `- ${clampInline(item, 96)}`).join("\n")}`
      : "",
    (params.context?.timelineEvents ?? []).length
      ? `最近时间线：\n${(params.context?.timelineEvents ?? []).slice(0, 4).map((item) => `- ${clampInline(item, 108)}`).join("\n")}`
      : "",
    (params.context?.foreshadowings ?? []).length
      ? `未回收伏笔：\n${(params.context?.foreshadowings ?? []).slice(0, 4).map((item) => `- ${clampInline(item, 108)}`).join("\n")}`
      : "",
  ].filter(Boolean).join("\n\n");
  const planText = formatPlanForPrompt(params.generationPlan);
  const continuityWarnings = (params.continuityWarnings ?? [])
    .filter(Boolean)
    .slice(0, 8)
    .map((item) => `- ${clampInline(item, 160)}`)
    .join("\n");
  const modeRules =
    mode === "short"
      ? [
          "短篇强制规则：",
          "- 不要写成长篇开头，不要新增无法回收的大坑。",
          "- 当前场景必须完成节点目标；每段都要推进冲突或情绪。",
          "- 结尾必须服务整体短篇落点；如果是最后一个节点，必须收束主题和主要冲突。",
        ].join("\n")
      : [
          "长篇强制规则：",
          "- 必须承接上一章结尾，不允许重置人物状态。",
          "- 不允许重复上一章已完成剧情，不允许随意解决伏笔。",
          "- 必须推进当前卷目标，结尾必须有继续阅读钩子。",
        ].join("\n");

  return [
    `作品标题：${params.work.title || params.outline.title}`,
    ...metaLines,
    "",
    `创意：${clampInline(params.work.idea, 260)}`,
    "",
    `简介：${clampInline(params.work.synopsis, 320)}`,
    "",
    shortStory ? "短篇模式：请写一个完整短篇中的场景/段落，不要写成长篇章节。" : "",
    shortStory ? `相关短篇结构：\n${structure}` : `相关卷纲：\n${structure}`,
    "",
    `主要角色：\n${characters || "-"}`,
    "",
    !useAssembledContext && previousContext.length
      ? [
          "连续性上下文（必须承接，不要重置人物状态或重复上一章动作）：",
          ...previousContext,
        ].join("\n")
      : "",
    !useAssembledContext && recentSummaries ? `最近章节摘要：\n${recentSummaries}` : "",
    !useAssembledContext && writingMemories ? `长期写作记忆与约束：\n${writingMemories}` : "",
    !useAssembledContext ? libraryContext : "",
    useAssembledContext ? `NovelContextEngine 组装上下文：\n${assembledContext}` : "",
    planText ? `ChapterPlan（必须遵守）：\n${planText}` : "",
    continuityWarnings ? `ContinuityWarnings：\n${continuityWarnings}` : "",
    modeRules,
    !useAssembledContext && (previousContext.length || recentSummaries || writingMemories || libraryContext) ? "" : "",
    shortStory
      ? `现在请你生成场景 ${chapterIndex} 的正文草稿。`
      : `现在请你生成第 ${chapterIndex} 章正文草稿。`,
    focusBeat
      ? `长度建议：约 ${focusBeat.targetWords} 字（中文字符），围绕「${focusBeat.title}」完成这一段目的。`
      : shortStory
        ? "长度建议：按短篇节奏写成完整场景，避免灌水和长篇铺设。"
        : "长度建议：约 2800-4500 字（中文字符）。",
    shortStory
      ? "短篇写法重点：场景集中、信息有效、每段都推进冲突或情绪变化；结尾服务整体短篇落点。"
      : chapterIndex === 1
        ? "第 1 章重点：快速开场 + 主角登场 + 明确外部压力/危机 + 埋下主线悬念。"
        : "非第 1 章必须自然承接上一章结尾，保持人物情绪、地点、冲突和未解决问题连续。",
    ...(extraPrompt ? ["", `补充要求（优先遵循）：${extraPrompt}`] : []),
    "注意：只输出严格合法 JSON（换行用 \\n，需要的双引号要转义）。",
  ].join("\n");
}

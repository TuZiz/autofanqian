import "server-only";

import type { ForeshadowingStatus } from "@prisma/client";

import { normalizeNovelCanonState, type NovelMode } from "@/lib/ai/novel-canon-state";
import type { StoryOutline, StoryOutlineSegment, StoryOutlineVolume } from "@/lib/create/outline-draft";
import type { ShortStoryOutline } from "@/lib/create/short-story-outline-schema";
import { prisma } from "@/lib/prisma";
import { isShortStoryWork, type WorkTypeValue } from "@/shared/work-type";

type ChapterContextRow = {
  index: number;
  title: string | null;
  content: string;
  wordCount?: number | null;
  summary: string | null;
};

type MemoryContextRow = {
  content: string;
  priority: number;
  chapterId?: string | null;
  updatedAt?: Date | null;
};

type CharacterContextRow = {
  name: string;
  role?: string | null;
  identity?: string | null;
  currentState?: string | null;
  goal?: string | null;
  desc?: string | null;
  lastChapter?: number | null;
};

type WorldSettingContextRow = {
  kind: string;
  name: string;
  desc: string;
  lastUpdatedChapter?: number | null;
};

type TimelineEventContextRow = {
  title?: string | null;
  summary: string;
  storyTime?: string | null;
  chapterIndex?: number | null;
};

type ForeshadowingContextRow = {
  title?: string | null;
  hint: string;
  payoff?: string | null;
  status: ForeshadowingStatus | string;
  plantedChapter?: number | null;
  resolvedChapter?: number | null;
  importance: number;
};

export type NovelContextInput = {
  work: {
    id: string;
    workType: WorkTypeValue | string | null;
    title: string;
    idea: string;
    synopsis: string;
    outline: StoryOutline | ShortStoryOutline;
    canonState?: unknown;
  };
  chapterIndex: number;
  previousChapters: ChapterContextRow[];
  writingMemories: MemoryContextRow[];
  characters: CharacterContextRow[];
  worldSettings: WorldSettingContextRow[];
  timelineEvents: TimelineEventContextRow[];
  foreshadowings: ForeshadowingContextRow[];
};

export type NovelAssembledContext = {
  mode: NovelMode;
  text: string;
  continuityWarnings: string[];
  context: {
    previousSummary?: string | null;
    previousEnding?: string | null;
    recentSummaries?: Array<{ index: number; title?: string | null; summary: string }>;
    writingMemories?: string[];
    characters?: string[];
    worldSettings?: string[];
    timelineEvents?: string[];
    foreshadowings?: string[];
  };
  sections: Record<string, string[] | string | null>;
};

type ScoredItem<T> = T & { score: number; reason: string[] };

function clampText(value: string | null | undefined, maxChars: number, tail = false) {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= maxChars) return normalized;
  return tail ? normalized.slice(-maxChars) : `${normalized.slice(0, maxChars)}...`;
}

function includesAny(text: string, keywords: string[]) {
  const source = text.toLowerCase();
  return keywords.some((keyword) => keyword && source.includes(keyword.toLowerCase()));
}

function uniqueStrings(items: string[], limit: number) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const normalized = item.replace(/\s+/g, " ").trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
    if (result.length >= limit) break;
  }
  return result;
}

function findFocusVolume(outline: StoryOutline, chapterIndex: number) {
  return (outline.volumes ?? []).find((volume) => {
    if (typeof volume.startChapter !== "number" || typeof volume.endChapter !== "number") {
      return false;
    }
    return chapterIndex >= volume.startChapter && chapterIndex <= volume.endChapter;
  }) ?? outline.volumes?.[0] ?? null;
}

function findFocusSegment(volume: StoryOutlineVolume | null, chapterIndex: number) {
  return (volume?.segments ?? []).find((segment) => {
    if (typeof segment.startChapter !== "number" || typeof segment.endChapter !== "number") {
      return false;
    }
    return chapterIndex >= segment.startChapter && chapterIndex <= segment.endChapter;
  }) ?? volume?.segments?.[0] ?? null;
}

function outlineKeywords(volume: StoryOutlineVolume | null, segment: StoryOutlineSegment | null) {
  return uniqueStrings(
    [
      volume?.name ?? "",
      volume?.desc ?? "",
      segment?.title ?? "",
      segment?.desc ?? "",
    ]
      .join(" ")
      .split(/[，。、“”《》：；,.!?()\s]+/),
    18,
  ).filter((item) => item.length >= 2);
}

function chapterDistanceScore(params: {
  currentIndex: number;
  itemChapterIndex?: number | null;
}) {
  if (typeof params.itemChapterIndex !== "number") return 0;
  const distance = Math.max(0, params.currentIndex - params.itemChapterIndex);
  if (distance <= 0) return 15;
  if (distance <= 5) return Math.max(4, 20 - distance * 3);
  if (distance <= 12) return 4;
  return 0;
}

export function scoreLongContextItem(params: {
  text: string;
  chapterIndex: number;
  itemChapterIndex?: number | null;
  characterNames?: string[];
  outlineKeywords?: string[];
  priority?: number | null;
  foreshadowingStatus?: string | null;
}) {
  const reasons: string[] = [];
  let score = 0;

  if (includesAny(params.text, params.characterNames ?? [])) {
    score += 40;
    reasons.push("character");
  }

  if (includesAny(params.text, params.outlineKeywords ?? [])) {
    score += 30;
    reasons.push("outline");
  }

  if (params.foreshadowingStatus === "open" || params.foreshadowingStatus === "partial") {
    score += 25;
    reasons.push("open_foreshadowing");
  }

  const recency = chapterDistanceScore({
    currentIndex: params.chapterIndex,
    itemChapterIndex: params.itemChapterIndex,
  });
  if (recency > 0) {
    score += recency;
    reasons.push("recent");
  }

  if (typeof params.priority === "number" && Number.isFinite(params.priority)) {
    const priorityScore = Math.max(1, Math.min(30, Math.round(params.priority)));
    score += priorityScore;
    reasons.push("priority");
  }

  return { score, reasons };
}

function sortScored<T>(items: ScoredItem<T>[]) {
  return items
    .slice()
    .sort((left, right) => right.score - left.score)
    .map((item) => {
      const copy = { ...item } as Record<string, unknown>;
      delete copy.score;
      delete copy.reason;
      return copy as T;
    });
}

function buildLongContext(input: NovelContextInput): NovelAssembledContext {
  const outline = input.work.outline as StoryOutline;
  const focusVolume = findFocusVolume(outline, input.chapterIndex);
  const focusSegment = findFocusSegment(focusVolume, input.chapterIndex);
  const keywords = outlineKeywords(focusVolume, focusSegment);
  const characterNames = input.characters.map((item) => item.name).filter(Boolean);
  const canonState = normalizeNovelCanonState(input.work.canonState, "long");

  const previousChapter = input.previousChapters.slice().sort((left, right) => right.index - left.index)[0];
  const recentSummaries = input.previousChapters
    .slice()
    .sort((left, right) => right.index - left.index)
    .filter((chapter) => chapter.summary?.trim() || chapter.content.trim())
    .slice(0, 5)
    .map((chapter) => ({
      index: chapter.index,
      title: chapter.title,
      summary: clampText(chapter.summary || chapter.content, 260),
    }))
    .reverse();

  const scoredCharacters = input.characters.map((item) => {
    const text = `${item.name} ${item.role ?? ""} ${item.identity ?? ""} ${item.currentState ?? ""} ${item.goal ?? ""} ${item.desc ?? ""}`;
    const scored = scoreLongContextItem({
      text,
      chapterIndex: input.chapterIndex,
      itemChapterIndex: item.lastChapter ?? undefined,
      characterNames: [item.name, ...characterNames],
      outlineKeywords: keywords,
      priority: item.role === "protagonist" ? 30 : 12,
    });
    return { ...item, score: scored.score, reason: scored.reasons };
  });

  const scoredWorldSettings = input.worldSettings.map((item) => {
    const text = `${item.kind}/${item.name}：${item.desc}`;
    const scored = scoreLongContextItem({
      text,
      chapterIndex: input.chapterIndex,
      itemChapterIndex: item.lastUpdatedChapter ?? undefined,
      characterNames,
      outlineKeywords: keywords,
      priority: 8,
    });
    return { ...item, score: scored.score, reason: scored.reasons };
  });

  const scoredTimeline = input.timelineEvents.map((item) => {
    const text = `${item.storyTime ?? ""}${item.title ?? ""}${item.summary}`;
    const scored = scoreLongContextItem({
      text,
      chapterIndex: input.chapterIndex,
      itemChapterIndex: item.chapterIndex ?? undefined,
      characterNames,
      outlineKeywords: keywords,
      priority: 12,
    });
    return { ...item, score: scored.score, reason: scored.reasons };
  });

  const scoredForeshadowings = input.foreshadowings
    .filter((item) => {
      if (item.status === "resolved" || item.status === "dropped") {
        return includesAny(`${item.title ?? ""}${item.hint}${item.payoff ?? ""}`, keywords);
      }
      return true;
    })
    .map((item) => {
      const text = `${item.title ?? ""}${item.hint}${item.payoff ?? ""}`;
      const scored = scoreLongContextItem({
        text,
        chapterIndex: input.chapterIndex,
        itemChapterIndex: item.plantedChapter ?? item.resolvedChapter ?? undefined,
        characterNames,
        outlineKeywords: keywords,
        priority: item.importance,
        foreshadowingStatus: item.status,
      });
      return { ...item, score: scored.score, reason: scored.reasons };
    });

  const scoredMemories = input.writingMemories.map((item) => {
    const scored = scoreLongContextItem({
      text: item.content,
      chapterIndex: input.chapterIndex,
      characterNames,
      outlineKeywords: keywords,
      priority: item.priority,
    });
    return { ...item, score: scored.score, reason: scored.reasons };
  });

  const characters = sortScored(scoredCharacters)
    .slice(0, 8)
    .map((item) => clampText(`${item.name}（${item.role || item.identity || "角色"}）：${item.currentState || item.goal || item.desc}`, 180));
  const worldSettings = sortScored(scoredWorldSettings)
    .slice(0, 8)
    .map((item) => clampText(`${item.kind}/${item.name}：${item.desc}`, 180));
  const timelineEvents = sortScored(scoredTimeline)
    .slice(0, 6)
    .map((item) => clampText(`${item.chapterIndex ? `第${item.chapterIndex}章 ` : ""}${item.storyTime ? `${item.storyTime} ` : ""}${item.title || item.summary}：${item.summary}`, 180));
  const foreshadowings = sortScored(scoredForeshadowings)
    .slice(0, 6)
    .map((item) => clampText(`${item.title || "伏笔"}（${item.status}，重要度${item.importance}）：${item.hint}${item.payoff ? `；兑现方向：${item.payoff}` : ""}`, 180));
  const writingMemories = sortScored(scoredMemories)
    .slice(0, 8)
    .map((item) => clampText(item.content, 180));

  const sections = {
    previousSummary: previousChapter?.summary ? clampText(previousChapter.summary, 360) : null,
    previousEnding: previousChapter?.content ? clampText(previousChapter.content, 1200, true) : null,
    recentSummaries: recentSummaries.map((item) => `第${item.index}章${item.title ? `《${item.title}》` : ""}：${item.summary}`),
    currentVolume: focusVolume ? `${focusVolume.name}：${clampText(focusVolume.desc, 260)}` : "",
    currentSegment: focusSegment ? `${focusSegment.title}：${clampText(focusSegment.desc, 260)}` : "",
    characters,
    worldSettings,
    timelineEvents,
    foreshadowings,
    writingMemories,
    canonState: [
      canonState.long.mainPlot ? `主线：${canonState.long.mainPlot}` : "",
      canonState.long.currentVolume ? `当前卷：${canonState.long.currentVolume}` : "",
      ...canonState.long.characterStates.slice(0, 12).map((item) => `角色状态：${item}`),
      ...canonState.long.worldRules.slice(0, 10).map((item) => `世界规则：${item}`),
      ...canonState.long.openForeshadowings.slice(0, 10).map((item) => `未回收伏笔：${item}`),
      ...canonState.long.forbiddenContradictions.slice(0, 8).map((item) => `禁止冲突：${item}`),
    ].filter(Boolean),
  };

  const text = [
    "【长篇连续性上下文】",
    sections.previousSummary ? `上一章摘要：${sections.previousSummary}` : "",
    sections.previousEnding ? `上一章结尾：${sections.previousEnding}` : "",
    sections.recentSummaries.length ? `最近章节摘要：\n${sections.recentSummaries.join("\n")}` : "",
    sections.currentVolume ? `当前卷概要：${sections.currentVolume}` : "",
    sections.currentSegment ? `当前小节概要：${sections.currentSegment}` : "",
    characters.length ? `当前出场角色状态：\n- ${characters.join("\n- ")}` : "",
    worldSettings.length ? `相关世界设定：\n- ${worldSettings.join("\n- ")}` : "",
    timelineEvents.length ? `最近时间线：\n- ${timelineEvents.join("\n- ")}` : "",
    foreshadowings.length ? `open/partial 伏笔：\n- ${foreshadowings.join("\n- ")}` : "",
    writingMemories.length ? `高优先级 WritingMemory：\n- ${writingMemories.join("\n- ")}` : "",
    sections.canonState.length ? `Work.canonState.long：\n- ${(sections.canonState as string[]).join("\n- ")}` : "",
  ].filter(Boolean).join("\n\n");

  return {
    mode: "long",
    text,
    continuityWarnings: [
      "必须承接上一章结尾，不要重置人物状态。",
      "不要重复上一章已完成的剧情动作。",
      "open/partial 伏笔只能推进，不能随意解决或改写。",
      "必须推进当前卷/小节目标，避免设定冲突。",
    ],
    context: {
      previousSummary: sections.previousSummary,
      previousEnding: sections.previousEnding,
      recentSummaries,
      writingMemories,
      characters,
      worldSettings,
      timelineEvents,
      foreshadowings,
    },
    sections,
  };
}

function buildShortContext(input: NovelContextInput): NovelAssembledContext {
  const outline = input.work.outline as ShortStoryOutline;
  const canonState = normalizeNovelCanonState(input.work.canonState, "short");
  const currentBeat = outline.beats.find((beat) => beat.index === input.chapterIndex) ?? outline.beats[0] ?? null;
  const lastBeatIndex = Math.max(...outline.beats.map((beat) => beat.index));
  const isFinalBeat = Boolean(currentBeat && currentBeat.index === lastBeatIndex);
  const previousBeat = input.previousChapters.slice().sort((left, right) => right.index - left.index)[0];
  const completedBeats = input.previousChapters
    .slice()
    .sort((left, right) => left.index - right.index)
    .map((chapter) => `Beat ${chapter.index}${chapter.title ? `《${chapter.title}》` : ""}：${clampText(chapter.summary || chapter.content, 180)}`)
    .slice(-6);
  const protagonist = outline.characters[0] ?? null;
  const mustResolve = uniqueStrings(
    [
      ...canonState.short.mustResolveBeforeEnd,
      ...input.foreshadowings
        .filter((item) => item.status === "open" || item.status === "partial")
        .sort((left, right) => right.importance - left.importance)
        .map((item) => `${item.title || "待回收问题"}：${item.hint}`),
    ],
    5,
  );
  const forbiddenNewThreads = uniqueStrings(
    [
      ...canonState.short.forbiddenNewThreads,
      "不要新增无法在短篇内回收的长期势力、血脉、宏大世界谜团。",
      "不要把当前场景写成长篇第一章式铺垫。",
    ],
    5,
  );

  const sections = {
    coreIdea: input.work.idea,
    theme: canonState.short.theme || outline.theme,
    coreConflict: canonState.short.coreConflict || outline.hook || input.work.synopsis,
    isFinalBeat: isFinalBeat ? "true" : "false",
    currentBeat: currentBeat
      ? `${currentBeat.index}. ${currentBeat.title}：${currentBeat.purpose}；提示：${clampText(currentBeat.writingPrompt, 260)}`
      : "",
    previousBeatEnding: previousBeat?.content ? clampText(previousBeat.content, 800, true) : null,
    completedBeats,
    protagonistState: protagonist
      ? `${protagonist.name}（${protagonist.role}）：${clampText(protagonist.description, 220)}`
      : "",
    mustResolve,
    forbiddenNewThreads,
    canonState: [
      canonState.short.emotionalArc ? `情绪线：${canonState.short.emotionalArc}` : "",
      ...canonState.short.beatsProgress.slice(0, 10).map((item) => `进度：${item}`),
    ].filter(Boolean),
  };

  const text = [
    "【短篇聚焦上下文】",
    `短篇核心创意：${clampText(sections.coreIdea, 280)}`,
    sections.theme ? `短篇主题：${sections.theme}` : "",
    sections.coreConflict ? `核心冲突：${clampText(sections.coreConflict, 260)}` : "",
    isFinalBeat ? "当前是短篇最后 beat：必须回收核心冲突、完成主题落点，并避免留下主要未解释问题。" : "",
    sections.currentBeat ? `当前 beat：${sections.currentBeat}` : "",
    sections.previousBeatEnding ? `前一个 beat 结尾：${sections.previousBeatEnding}` : "",
    completedBeats.length ? `已完成 beat 摘要：\n- ${completedBeats.join("\n- ")}` : "",
    sections.protagonistState ? `主角当前状态：${sections.protagonistState}` : "",
    mustResolve.length ? `必须回收的问题：\n- ${mustResolve.join("\n- ")}` : "",
    forbiddenNewThreads.length ? `禁止新增的大坑：\n- ${forbiddenNewThreads.join("\n- ")}` : "",
    sections.canonState.length ? `Work.canonState.short：\n- ${(sections.canonState as string[]).join("\n- ")}` : "",
  ].filter(Boolean).join("\n\n");

  return {
    mode: "short",
    text,
    continuityWarnings: [
      "不要写成长篇开头，不要铺设无法回收的大坑。",
      "当前场景必须完成 beat 目的。",
      "每段都要推进冲突或情绪线。",
      "结尾必须服务整体短篇落点。",
      isFinalBeat ? "当前是短篇最后 beat，必须完成主题落点并回收主要问题。" : "",
    ].filter(Boolean),
    context: {
      previousSummary: previousBeat?.summary ?? null,
      previousEnding: sections.previousBeatEnding,
      recentSummaries: completedBeats.map((summary, index) => ({
        index: index + 1,
        summary,
      })),
      writingMemories: mustResolve,
      characters: sections.protagonistState ? [sections.protagonistState] : [],
      worldSettings: [],
      timelineEvents: [],
      foreshadowings: mustResolve,
    },
    sections,
  };
}

export function buildNovelContextFromData(input: NovelContextInput): NovelAssembledContext {
  return isShortStoryWork(input.work.workType)
    ? buildShortContext(input)
    : buildLongContext(input);
}

export async function buildNovelContext(params: {
  workId: string;
  chapterIndex: number;
  work?: NovelContextInput["work"];
  previousChapters?: ChapterContextRow[];
  writingMemories?: MemoryContextRow[];
  characters?: CharacterContextRow[];
  worldSettings?: WorldSettingContextRow[];
  timelineEvents?: TimelineEventContextRow[];
  foreshadowings?: ForeshadowingContextRow[];
}): Promise<NovelAssembledContext> {
  const work =
    params.work ??
    (await prisma.work.findUniqueOrThrow({
      where: { id: params.workId },
      select: {
        id: true,
        workType: true,
        title: true,
        idea: true,
        synopsis: true,
        outline: true,
        canonState: true,
      },
    }));

  const [
    previousChapters,
    writingMemories,
    characters,
    worldSettings,
    timelineEvents,
    foreshadowings,
  ] = await Promise.all([
    params.previousChapters ??
      prisma.chapter.findMany({
        where: { workId: work.id, index: { lt: params.chapterIndex }, deletedAt: null },
        orderBy: { index: "asc" },
        select: { index: true, title: true, content: true, wordCount: true, summary: true },
      }),
    params.writingMemories ??
      prisma.writingMemory.findMany({
        where: { novelId: work.id, isActive: true },
        orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
        take: 32,
        select: { content: true, priority: true, chapterId: true, updatedAt: true },
      }),
    params.characters ??
      prisma.character.findMany({
        where: { novelId: work.id, deletedAt: null },
        orderBy: [{ lastChapter: "desc" }, { updatedAt: "desc" }],
        take: 32,
        select: { name: true, role: true, identity: true, currentState: true, goal: true, desc: true, lastChapter: true },
      }),
    params.worldSettings ??
      prisma.worldSetting.findMany({
        where: { novelId: work.id, deletedAt: null },
        orderBy: [{ lastUpdatedChapter: "desc" }, { updatedAt: "desc" }],
        take: 32,
        select: { kind: true, name: true, desc: true, lastUpdatedChapter: true },
      }),
    params.timelineEvents ??
      prisma.timelineEvent.findMany({
        where: { novelId: work.id, deletedAt: null, chapterIndex: { lt: params.chapterIndex } },
        orderBy: [{ chapterIndex: "desc" }, { order: "desc" }],
        take: 24,
        select: { title: true, summary: true, storyTime: true, chapterIndex: true },
      }),
    params.foreshadowings ??
      prisma.foreshadowing.findMany({
        where: { novelId: work.id, deletedAt: null },
        orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
        take: 32,
        select: { title: true, hint: true, payoff: true, status: true, plantedChapter: true, resolvedChapter: true, importance: true },
      }),
  ]);

  return buildNovelContextFromData({
    work: {
      ...work,
      outline: work.outline as StoryOutline | ShortStoryOutline,
      workType: work.workType,
    },
    chapterIndex: params.chapterIndex,
    previousChapters,
    writingMemories,
    characters,
    worldSettings,
    timelineEvents,
    foreshadowings,
  });
}

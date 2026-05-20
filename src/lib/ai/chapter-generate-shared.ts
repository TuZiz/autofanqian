import { buildChapterSystemPrompt, buildChapterUserPrompt } from "@/lib/ai/chapter-prompt";
import { extractChapterDraftFromText } from "@/lib/ai/chapter-draft";
import { getChapterTokenConfig } from "@/lib/ai/chapter-token-config";
import type {
  ChapterGenerateInput,
  PreparedChapterGeneration,
} from "@/lib/ai/chapter-generate-types";
import {
  buildNovelContext,
  type NovelAssembledContext,
} from "@/lib/ai/novel-context-engine";
import {
  buildAiProviderChain,
  getProviderApiKeyEnvName,
  type UpstreamProvider,
} from "@/lib/ai/upstream-text";
import { isAdminUser } from "@/lib/auth/admin";
import { AuthApiError } from "@/lib/auth/errors";
import type { SessionUser } from "@/lib/auth/user";
import { getAiModelConfig } from "@/lib/config/ai-model";
import type { StoryOutline } from "@/lib/create/outline-draft";
import type { ShortStoryOutline } from "@/lib/create/short-story-outline-schema";
import {
  getEffectivePlannedUntil,
  isChapterWithinPlanning,
} from "@/lib/create/progressive-planning";
import { prisma } from "@/lib/prisma";
import { isShortStoryWork } from "@/shared/work-type";

export {
  chapterGenerateBodySchema,
  type ChapterGenerateInput,
  type PreparedChapterGeneration,
} from "@/lib/ai/chapter-generate-types";

export function countWords(text: string) {
  return text.replace(/\s+/g, "").length;
}

export function getDefaultChapterTitle(index: number) {
  if (index === 1) return "第一章";
  return `第${index}章`;
}

function findBlockingPreviousChapter(
  chapters: Array<{ index: number; content: string; wordCount: number }>,
) {
  return chapters
    .filter((chapter) => chapter.index > 0)
    .filter((chapter) => chapter.wordCount <= 0 || !chapter.content.trim())
    .sort((left, right) => right.index - left.index)[0];
}

function clampText(value: string | null | undefined, maxChars: number) {
  const text = (value ?? "").trim().replace(/\s+/g, " ");
  if (!text) return "";
  return text.length > maxChars ? text.slice(-maxChars) : text;
}

export function serializeGeneratedChapter(chapter: {
  id: string;
  index: number;
  title: string | null;
  content: string;
  wordCount: number;
  summary: string | null;
  chapterOutline: string | null;
  details: unknown;
  updatedAt: Date;
  createdAt: Date;
}) {
  return {
    ...chapter,
    createdAt: chapter.createdAt.toISOString(),
    updatedAt: chapter.updatedAt.toISOString(),
  };
}

export function finalizeGeneratedDraft(params: {
  index: number;
  rawText: string;
}) {
  const chapterTitleSchema = (value: string) => value.trim().slice(0, 120);
  const chapterContentSchema = (value: string) => value.trim().slice(0, 200_000);

  const extractedDraft = extractChapterDraftFromText(params.rawText);
  const titleCandidate =
    typeof extractedDraft?.title === "string" ? extractedDraft.title.trim() : "";
  const contentCandidate =
    typeof extractedDraft?.content === "string" ? extractedDraft.content.trim() : "";

  const title = titleCandidate
    ? chapterTitleSchema(titleCandidate)
    : getDefaultChapterTitle(params.index);
  const content = contentCandidate
    ? chapterContentSchema(contentCandidate)
    : chapterContentSchema(params.rawText);

  return {
    title: title || getDefaultChapterTitle(params.index),
    content,
  };
}

export async function prepareChapterGeneration(params: {
  user: SessionUser;
  input: ChapterGenerateInput;
  providersFromEnv: UpstreamProvider[];
}): Promise<PreparedChapterGeneration> {
  const { user, input, providersFromEnv } = params;
  const isAdmin = isAdminUser(user);

  const work = await prisma.work.findUnique({
    where: { id: input.workId },
    select: {
      id: true,
      userId: true,
      workType: true,
      genreId: true,
      genreLabel: true,
      idea: true,
      tags: true,
      platformLabel: true,
      words: true,
      dnaBookTitle: true,
      tag: true,
      title: true,
      synopsis: true,
      outline: true,
      canonState: true,
      targetChapters: true,
      plannedUntilChapter: true,
      deletedAt: true,
    },
  });

  if (!work || work.deletedAt) {
    throw new AuthApiError(404, "作品不存在或已被删除。");
  }

  if (!isAdmin && work.userId !== user.id) {
    throw new AuthApiError(403, "无权限访问该作品。");
  }

  const outline = work.outline as unknown as StoryOutline | ShortStoryOutline;
  const plannedUntilChapter = isShortStoryWork(work.workType)
    ? Math.max(1, work.plannedUntilChapter || 0, work.targetChapters || 0)
    : getEffectivePlannedUntil({
        outline: outline as StoryOutline,
        plannedUntilChapter: work.plannedUntilChapter,
      });

  const planned = isShortStoryWork(work.workType)
    ? input.index <= plannedUntilChapter
    : isChapterWithinPlanning({
        index: input.index,
        outline: outline as StoryOutline,
        plannedUntilChapter,
      });

  if (!planned) {
    const currentLabel = isShortStoryWork(work.workType)
      ? `场景 ${input.index}`
      : `第${input.index}章`;
    const limitLabel = isShortStoryWork(work.workType)
      ? `场景 ${plannedUntilChapter}`
      : `第${plannedUntilChapter}章`;
    throw new AuthApiError(
      423,
      `${currentLabel}尚未规划，当前只开放到${limitLabel}。`,
    );
  }

  let previousChapters: Array<{
    index: number;
    title: string | null;
    content: string;
    wordCount: number;
    summary: string | null;
  }> = [];

  if (input.index > 1) {
    previousChapters = await prisma.chapter.findMany({
      where: {
        workId: work.id,
        index: { lt: input.index },
        deletedAt: null,
      },
      orderBy: { index: "asc" },
      select: {
        index: true,
        title: true,
        content: true,
        wordCount: true,
        summary: true,
      },
    });

    const blockingPreviousChapter = findBlockingPreviousChapter(previousChapters);
    if (blockingPreviousChapter) {
      const previousLabel = isShortStoryWork(work.workType)
        ? `场景 ${blockingPreviousChapter.index}`
        : `第${blockingPreviousChapter.index}章`;
      const currentLabel = isShortStoryWork(work.workType)
        ? `场景 ${input.index}`
        : `第${input.index}章`;
      throw new AuthApiError(
        422,
        `请先完成${previousLabel}正文后，再生成${currentLabel}。`,
      );
    }
  }

  const existingChapter = await prisma.chapter.findUnique({
    where: { workId_index: { workId: work.id, index: input.index } },
    select: { id: true, title: true, content: true, wordCount: true, deletedAt: true },
  });

  if (existingChapter?.deletedAt) {
    throw new AuthApiError(410, "章节已删除，请先恢复后再生成。");
  }

  const aiModelConfig = await getAiModelConfig();
  const target = existingChapter?.content?.trim()
    ? aiModelConfig.regenerateAll
    : aiModelConfig.chapterGenerate;
  const routeId = target.providerId;

  const providers = buildAiProviderChain({
    providers: providersFromEnv,
    preferredProviderId: routeId,
    overrideModel: target.model,
  });

  if (!providers.length) {
    const envKey = getProviderApiKeyEnvName(target.providerId);
    throw new AuthApiError(
      500,
      `AI 未配置：当前“生成正文”使用 ${target.providerId}，但未检测到 ${envKey}。请在 web/.env 或 web/.env.local 中配置后重启，或到后台“AI 模型配置”切换线路。`,
    );
  }

  const previousChapter = previousChapters
    .slice()
    .sort((left, right) => right.index - left.index)[0];
  const recentSummaries = previousChapters
    .slice()
    .filter((chapter) => chapter.summary?.trim() || chapter.content.trim())
    .sort((left, right) => right.index - left.index)
    .slice(0, input.index === 1 ? 0 : 3)
    .map((chapter) => ({
      index: chapter.index,
      title: chapter.title,
      summary: clampText(chapter.summary || chapter.content, 220),
    }))
    .reverse();

  const writingMemories = await prisma.writingMemory.findMany({
    where: { novelId: work.id, isActive: true },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    take: 48,
    select: { content: true, priority: true, chapterId: true, updatedAt: true },
  });

  const [characters, worldSettings, timelineEvents, foreshadowings] = await Promise.all([
    prisma.character.findMany({
      where: { novelId: work.id, deletedAt: null },
      orderBy: [{ lastChapter: "desc" }, { updatedAt: "desc" }],
      take: 64,
      select: {
        name: true,
        role: true,
        identity: true,
        currentState: true,
        goal: true,
        desc: true,
        lastChapter: true,
      },
    }),
    prisma.worldSetting.findMany({
      where: { novelId: work.id, deletedAt: null },
      orderBy: [{ lastUpdatedChapter: "desc" }, { updatedAt: "desc" }],
      take: 64,
      select: { kind: true, name: true, desc: true, lastUpdatedChapter: true },
    }),
    prisma.timelineEvent.findMany({
      where: {
        novelId: work.id,
        deletedAt: null,
        chapterIndex: { lt: input.index },
      },
      orderBy: [{ chapterIndex: "desc" }, { order: "desc" }],
      take: input.index === 1 ? 0 : 64,
      select: { title: true, summary: true, storyTime: true, chapterIndex: true },
    }),
    prisma.foreshadowing.findMany({
      where: {
        novelId: work.id,
        deletedAt: null,
        status: { in: ["open", "partial"] },
      },
      orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
      take: 64,
      select: {
        title: true,
        hint: true,
        payoff: true,
        status: true,
        plantedChapter: true,
        resolvedChapter: true,
        importance: true,
      },
    }),
  ]);

  const fallbackContext = {
    previousSummary: previousChapter?.summary ?? null,
    previousEnding: clampText(previousChapter?.content, 900),
    recentSummaries,
    writingMemories: writingMemories.map((item) => item.content),
    characters: characters.map((item) =>
      clampText(
        `${item.name}（${item.role || item.identity || "角色"}）：${item.currentState || item.goal || item.desc}`,
        120,
      ),
    ),
    worldSettings: worldSettings.map((item) =>
      clampText(`${item.kind}/${item.name}：${item.desc}`, 120),
    ),
    timelineEvents: timelineEvents.map((item) =>
      clampText(
        `${item.chapterIndex ? `第${item.chapterIndex}章 ` : ""}${item.storyTime ? `${item.storyTime} ` : ""}${item.title || item.summary}：${item.summary}`,
        140,
      ),
    ),
    foreshadowings: foreshadowings.map((item) =>
      clampText(
        `${item.title || "伏笔"}（${item.status}，重要度${item.importance}）：${item.hint}${item.payoff ? `；兑现方向：${item.payoff}` : ""}`,
        140,
      ),
    ),
  };
  const mode = isShortStoryWork(work.workType) ? "short" : "long";
  let assembledContext: NovelAssembledContext = {
    mode,
    text: "",
    continuityWarnings: [],
    context: fallbackContext,
    sections: {},
  };

  try {
    assembledContext = await buildNovelContext({
      workId: work.id,
      chapterIndex: input.index,
      work: {
        id: work.id,
        workType: work.workType,
        title: work.title,
        idea: work.idea,
        synopsis: work.synopsis,
        outline,
        canonState: work.canonState,
      },
      previousChapters,
      writingMemories,
      characters,
      worldSettings,
      timelineEvents,
      foreshadowings,
    });
  } catch (error) {
    console.warn("NovelContextEngine fallback to legacy context", error);
  }

  const shortTargetWords =
    isShortStoryWork(work.workType) && "beats" in outline
      ? outline.beats.find((beat) => beat.index === input.index)?.targetWords
      : null;
  const isFinalShortBeat =
    assembledContext.mode === "short" && assembledContext.sections.isFinalBeat === "true";
  const tokenConfig = getChapterTokenConfig({
    mode: assembledContext.mode,
    shortTargetWords,
  });

  const promptSnapshot = buildChapterUserPrompt({
    chapterIndex: input.index,
    work: {
      workType: work.workType,
      genreId: work.genreId,
      genreLabel: work.genreLabel,
      tags: work.tags ?? [],
      platformLabel: work.platformLabel,
      words: work.words,
      dnaBookTitle: work.dnaBookTitle,
      idea: work.idea,
      title: work.title,
      synopsis: work.synopsis,
    },
    outline,
    context: assembledContext.context,
    assembledContext: assembledContext.text,
    mode: assembledContext.mode,
    continuityWarnings: assembledContext.continuityWarnings,
    legacyContext: {
      previousSummary: previousChapter?.summary ?? null,
      previousEnding: clampText(previousChapter?.content, 900),
      recentSummaries,
      writingMemories: writingMemories.map((item) => item.content),
      characters: characters.map((item) =>
        clampText(
          `${item.name}（${item.role || item.identity || "角色"}）：${item.currentState || item.goal || item.desc}`,
          120,
        ),
      ),
      worldSettings: worldSettings.map((item) =>
        clampText(`${item.kind}/${item.name}：${item.desc}`, 120),
      ),
      timelineEvents: timelineEvents.map((item) =>
        clampText(
          `${item.chapterIndex ? `第${item.chapterIndex}章 ` : ""}${item.storyTime ? `${item.storyTime} ` : ""}${item.title || item.summary}：${item.summary}`,
          140,
        ),
      ),
      foreshadowings: foreshadowings.map((item) =>
        clampText(
          `${item.title || "伏笔"}（${item.status}，重要度${item.importance}）：${item.hint}${item.payoff ? `；兑现方向：${item.payoff}` : ""}`,
          140,
        ),
      ),
    },
    extraPrompt: input.extraPrompt,
  });

  return {
    user,
    work: {
      id: work.id,
      userId: work.userId,
      workType: work.workType,
      genreId: work.genreId,
      genreLabel: work.genreLabel,
      idea: work.idea,
      tags: work.tags ?? [],
      platformLabel: work.platformLabel,
      words: work.words,
      dnaBookTitle: work.dnaBookTitle,
      tag: work.tag,
      title: work.title,
      synopsis: work.synopsis,
      outline,
      canonState: work.canonState,
      targetChapters: work.targetChapters,
      plannedUntilChapter,
    },
    existingChapter: existingChapter
      ? {
          id: existingChapter.id,
          title: existingChapter.title,
          content: existingChapter.content,
          wordCount: existingChapter.wordCount,
        }
      : null,
    generationMode: existingChapter?.content?.trim() ? "regenerate" : "generate",
    routeId,
    contextExtractRouteId: aiModelConfig.chapterDetails.providerId,
    providers,
    preferredProvider: providers[0],
    messages: [
      { role: "system", content: buildChapterSystemPrompt() },
      { role: "user", content: promptSnapshot },
    ],
    promptSnapshot,
    promptContext: assembledContext.context,
    assembledContext: assembledContext.text,
    generationPlan: null,
    continuityWarnings: assembledContext.continuityWarnings,
    mode: assembledContext.mode,
    isFinalShortBeat,
    extraPrompt: input.extraPrompt ?? null,
    contextExtractMaxTokens: tokenConfig.contextExtract,
    maxTokens: tokenConfig.chapterGenerate,
    temperature: tokenConfig.temperature,
  };
}

import { after, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import {
  buildShortStoryGenerateSystemPrompt,
  buildShortStoryGenerateUserPrompt,
} from "@/lib/ai/short-story-generate-prompt";
import {
  assertAiQuotaAvailable,
  runWithAiQuotaReservation,
} from "@/lib/ai/quota";
import {
  buildAiProviderChain,
  callAiText,
  getAiProvidersFromEnv,
  getProviderApiKeyEnvName,
  getReadableAiErrorMessage,
} from "@/lib/ai/upstream-text";
import { getActivePromptTemplate } from "@/lib/ai/prompt-templates";
import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import { getCurrentUser } from "@/lib/auth/service";
import { getAiModelConfig } from "@/lib/config/ai-model";
import {
  normalizeShortStoryOutline,
  shortStoryOutlineSchema,
  type ShortStoryBeat,
  type ShortStoryOutline,
  type ShortStoryOutlineInput,
} from "@/lib/create/short-story-outline-schema";
import { assertCanCreateWork, assertCanUseAiAction } from "@/lib/membership/guards";
import { runGenerationJob } from "@/lib/jobs/generation-job-runner";
import { prisma } from "@/lib/prisma";
import { assertSameOriginRequest } from "@/lib/security/origin";
import { AI_ACTIONS } from "@/shared/ai-actions";
import {
  shortStoryGeneratedSchema,
  shortStoryGenerateSchema,
  type ShortStoryGenerateInput,
} from "@/shared/schemas/short-story-generate";
import { SHORT_STORY_ENDING_LABELS } from "@/shared/schemas/short-story";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const SYNC_SHORT_STORY_WORD_LIMIT = 5000;
const SHORT_STORY_CONTEXT_SOURCE = "short_story_generate";
const SHORT_STORY_TIMELINE_MARKER = "[short_story_generate]";

function extractJson(text: string) {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) return null;

  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
  } catch {
    return null;
  }
}

function countWords(text: string) {
  return text.replace(/\s+/g, "").length;
}

function clampText(text: string, max: number) {
  return text.trim().slice(0, max);
}

function formatTags(tags: string[]) {
  return tags.length ? tags.join("、") : "无";
}

function splitOutlineTextIntoBeats(outline: string, targetWords: number): ShortStoryBeat[] {
  const parts = outline
    .split(/\n+|(?<=[。！？!?])\s*/g)
    .map((item) => item.replace(/^\s*[-\d.、）)]+/, "").trim())
    .filter((item) => item.length >= 8)
    .slice(0, 8);
  const fallback = parts.length >= 3 ? parts : [
    "开局抛出主角处境、核心欲望和第一重冲突。",
    "冲突升级，人物选择被迫显露，关键信息逐步反转。",
    "高潮与收束，主角完成选择，结局落在用户要求的情绪方向上。",
  ];
  const beatCount = Math.max(3, Math.min(8, fallback.length));
  const wordsPerBeat = Math.max(100, Math.round(targetWords / beatCount));

  return fallback.slice(0, beatCount).map((text, index) => ({
    index: index + 1,
    title: `段落 ${index + 1}`,
    purpose: text.slice(0, 500),
    targetWords: wordsPerBeat,
    writingPrompt: text.slice(0, 1200),
  }));
}

function buildShortStoryOutlineJson(input: ShortStoryGenerateInput, output: {
  title: string;
  synopsis: string;
  outline: string | ShortStoryOutlineInput;
  content: string;
}): ShortStoryOutline {
  const parsed =
    typeof output.outline === "string"
      ? null
      : shortStoryOutlineSchema.safeParse(output.outline);
  if (parsed?.success) {
    return normalizeShortStoryOutline({
      ...parsed.data,
      title: parsed.data.title || output.title,
      synopsis: parsed.data.synopsis || output.synopsis,
      endingType: input.endingType,
      targetWords: input.targetWords,
      beats: parsed.data.beats.slice(0, 8),
    });
  }

  const outlineText = typeof output.outline === "string" ? output.outline : output.synopsis;
  return normalizeShortStoryOutline({
    tag: (input.tags[0] || input.genre).slice(0, 12),
    title: output.title,
    synopsis: output.synopsis,
    targetWords: input.targetWords,
    theme: `${input.genre} / ${input.structureTemplate} / ${input.style} / ${input.pov} / ${SHORT_STORY_ENDING_LABELS[input.endingType]}`,
    hook: clampText(input.idea, 300),
    endingType: input.endingType,
    characters: [
      {
        name: "主角",
        role: "核心视角",
        description: `围绕“${input.idea.slice(0, 80)}”推进短篇冲突。`,
      },
    ],
    beats: splitOutlineTextIntoBeats(outlineText, input.targetWords),
    fullOutline: clampText(outlineText, 12_000),
  });
}

function normalizeGeneratedOutline(input: ShortStoryGenerateInput, output: {
  title: string;
  synopsis: string;
  outline: string | ShortStoryOutlineInput;
  content: string;
}): ShortStoryOutline {
  return buildShortStoryOutlineJson(input, output);
}

async function persistShortStoryContext(params: {
  input: ShortStoryGenerateInput;
  outline: ShortStoryOutline;
  workId: string;
}) {
  const { input, outline, workId } = params;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.character.createMany({
        data: outline.characters.map((character) => ({
          novelId: workId,
          name: character.name,
          role: character.role,
          desc: character.description,
        })),
        skipDuplicates: true,
      });
      await tx.writingMemory.deleteMany({
        where: { novelId: workId, source: SHORT_STORY_CONTEXT_SOURCE },
      });
      await tx.writingMemory.createMany({
        data: [
          {
            novelId: workId,
            kind: "style",
            priority: 80,
            source: SHORT_STORY_CONTEXT_SOURCE,
            content: `短篇主题：${outline.theme}`,
          },
          {
            novelId: workId,
            kind: "plot_thread",
            priority: 85,
            source: SHORT_STORY_CONTEXT_SOURCE,
            content: `开篇钩子：${outline.hook}`,
          },
          {
            novelId: workId,
            kind: "constraint",
            priority: 75,
            source: SHORT_STORY_CONTEXT_SOURCE,
            content: `结局倾向：${SHORT_STORY_ENDING_LABELS[outline.endingType]}（${outline.endingType}）`,
          },
          {
            novelId: workId,
            kind: "style",
            priority: 72,
            source: SHORT_STORY_CONTEXT_SOURCE,
            content: `短篇标签：${formatTags(input.tags)}`,
          },
          {
            novelId: workId,
            kind: "style",
            priority: 72,
            source: SHORT_STORY_CONTEXT_SOURCE,
            content: `叙事视角：${input.pov}`,
          },
        ],
      });
      await tx.timelineEvent.deleteMany({
        where: {
          novelId: workId,
          chapterIndex: 1,
          description: { startsWith: SHORT_STORY_TIMELINE_MARKER },
        },
      });
      await tx.timelineEvent.createMany({
        data: outline.beats.map((beat) => ({
          novelId: workId,
          chapterIndex: 1,
          order: beat.index,
          title: beat.title,
          summary: beat.purpose,
          description: `${SHORT_STORY_TIMELINE_MARKER}\n${beat.writingPrompt}`,
        })),
      });
    });
  } catch (error) {
    console.warn("Failed to persist short story context", error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);

    const user = await getCurrentUser();
    if (!user) {
      throw new AuthApiError(401, "未登录或登录已失效，请先登录。");
    }

    const input = await parseJsonBody(request, shortStoryGenerateSchema);
    await assertCanCreateWork(user);
    await assertAiQuotaAvailable(user);
    await assertCanUseAiAction(user, AI_ACTIONS.shortStoryGenerate);

    if (input.targetWords > SYNC_SHORT_STORY_WORD_LIMIT) {
      const placeholderOutline = normalizeShortStoryOutline({
        tag: (input.tags[0] || input.genre).slice(0, 12),
        title: `${input.genre}短篇生成中`,
        synopsis: `正在按 ${input.targetWords} 字目标生成长文本短篇。`,
        targetWords: input.targetWords,
        theme: `${input.genre} / ${input.structureTemplate} / ${input.style}`,
        hook: clampText(input.idea, 300),
        endingType: input.endingType,
        characters: [
          {
            name: "主角",
            role: "核心视角",
            description: "后台生成完成后会替换为 AI 提取的人物设定。",
          },
        ],
        beats: splitOutlineTextIntoBeats(input.idea, input.targetWords),
        fullOutline: input.idea,
      });

      const work = await prisma.work.create({
        data: {
          userId: user.id,
          workType: "short_story",
          genreId: "short_story",
          genreLabel: input.genre,
          idea: input.idea,
          tags: input.tags,
          platformId: input.style,
          platformLabel: input.style,
          words: `${input.targetWords} 字`,
          dnaBookTitle: null,
          tag: input.genre,
          title: placeholderOutline.title,
          synopsis: placeholderOutline.synopsis,
          outline: placeholderOutline as unknown as Prisma.InputJsonValue,
          rawOutline: {
            input,
            status: "queued",
            generatedBy: "POST /api/ai/short-story",
          } as Prisma.InputJsonValue,
          targetChapters: 1,
          plannedUntilChapter: 1,
          planningMode: "progressive",
          generationJobs: {
            create: {
              userId: user.id,
              action: AI_ACTIONS.shortStoryGenerate,
              jobType: "short_story.generate.long",
              status: "queued",
              promptTemplateKey: AI_ACTIONS.shortStoryGenerate,
              resultSummary: "长文本短篇已加入后台分段生成队列。",
              resultJson: {
                input,
                outline: null,
                segments: [],
                finalWorkId: null,
              } as Prisma.InputJsonValue,
              heartbeatAt: new Date(),
            },
          },
        },
        select: {
          id: true,
          generationJobs: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true, status: true },
          },
        },
      });
      const jobId = work.generationJobs[0]?.id ?? null;
      if (jobId) {
        after(async () => {
          try {
            await runGenerationJob(jobId);
          } catch (error) {
            console.warn("auto start long short story generation failed", error);
          }
        });
      }

      return successResponse(
        {
          workId: work.id,
          jobId,
          status: "queued",
          async: true,
        },
        { message: "长文本短篇已进入后台分段生成队列，生成完成后会自动写入作品正文。" },
      );
    }

    const aiModelConfig = await getAiModelConfig();
    const target = aiModelConfig.outlineGenerate;
    const providers = buildAiProviderChain({
      providers: getAiProvidersFromEnv(),
      preferredProviderId: target.providerId,
      overrideModel: target.model,
    });

    if (!providers.length) {
      const envKey = getProviderApiKeyEnvName(target.providerId);
      throw new AuthApiError(
        500,
        `AI 未配置：当前短篇生成使用 ${target.providerId}，但未检测到 ${envKey}。请在后台“AI 模型配置”切换线路或配置环境变量。`,
      );
    }

    const systemTemplate = await getActivePromptTemplate(
      AI_ACTIONS.shortStoryGenerate,
      buildShortStoryGenerateSystemPrompt(),
    );
    const prompt = buildShortStoryGenerateUserPrompt(input);
    const result = await runWithAiQuotaReservation(
      user,
      AI_ACTIONS.shortStoryGenerate,
      () =>
        callAiText({
          providers,
          preferredProviderId: target.providerId,
          routeId: target.providerId,
          messages: [
            { role: "system", content: systemTemplate.content },
            { role: "user", content: prompt },
          ],
          temperature: 0.76,
          maxTokens: Math.min(16000, Math.max(2400, Math.ceil(input.targetWords * 1.8))),
          attempts: 1,
        }),
      {
        estimatedOutputChars: input.targetWords,
        estimatedTokens: Math.ceil(input.targetWords * 1.6),
      },
    );

    if (!result.ok || !result.text) {
      return NextResponse.json(
        {
          success: false,
          message: getReadableAiErrorMessage(result, "短篇小说生成失败，请稍后重试。"),
        },
        { status: 502 },
      );
    }

    const parsed = shortStoryGeneratedSchema.safeParse(extractJson(result.text));
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "短篇小说解析失败，请重新生成。" },
        { status: 502 },
      );
    }

    const output = parsed.data;
    const outlineJson = normalizeGeneratedOutline(input, output);
    const contentWordCount = countWords(output.content);

    const work = await prisma.work.create({
      data: {
        userId: user.id,
        workType: "short_story",
        genreId: "short_story",
        genreLabel: input.genre,
        idea: input.idea,
        tags: input.tags,
        platformId: input.style,
        platformLabel: input.style,
        words: `${input.targetWords} 字`,
        dnaBookTitle: null,
        tag: input.genre,
        title: output.title,
        synopsis: output.synopsis,
        outline: outlineJson as unknown as Prisma.InputJsonValue,
        rawOutline: {
          ...outlineJson,
          input,
          contentWordCount,
          generatedBy: "POST /api/ai/short-story",
        } as Prisma.InputJsonValue,
        targetChapters: 1,
        plannedUntilChapter: 1,
        planningMode: "progressive",
        chapters: {
          create: {
            index: 1,
            title: output.title,
            content: output.content,
            wordCount: contentWordCount,
            status: "written",
            chapterOutline: outlineJson.fullOutline,
            details: [
              `短篇类型：${input.genre}`,
              `风格：${input.style}`,
              `结构模板：${input.structureTemplate}`,
              `视角：${input.pov}`,
              `结局：${SHORT_STORY_ENDING_LABELS[input.endingType]}`,
              `标签：${formatTags(input.tags)}`,
              `目标字数：${input.targetWords}`,
            ],
          },
        },
        generationJobs: {
          create: {
            userId: user.id,
            action: AI_ACTIONS.shortStoryGenerate,
            jobType: AI_ACTIONS.shortStoryGenerate,
            status: "succeeded",
            routeId: result.providerId ?? target.providerId,
            providerId: result.providerId ?? null,
            modelUsed: result.modelUsed ?? null,
            promptTemplateKey: AI_ACTIONS.shortStoryGenerate,
            promptTemplateVersion: systemTemplate.version || null,
            promptSnapshot: prompt.slice(0, 20000),
            resultSummary: `${output.title}，正文 ${contentWordCount} 字。`,
            inputTokens: result.usage?.inputTokens ?? null,
            outputTokens: result.usage?.outputTokens ?? null,
            totalTokens: result.usage?.totalTokens ?? null,
            durationMs: result.durationMs ?? null,
            startedAt: new Date(),
            finishedAt: new Date(),
            heartbeatAt: new Date(),
            completedAt: new Date(),
          },
        },
      },
      select: { id: true },
    });

    await persistShortStoryContext({ input, outline: outlineJson, workId: work.id });

    return successResponse(
      {
        workId: work.id,
        title: output.title,
        synopsis: output.synopsis,
        outline: outlineJson,
        content: output.content,
      },
      { message: "短篇小说已生成。" },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      return errorResponse(
        new AuthApiError(
          500,
          "数据表尚未迁移完成：请先运行 start-dev.cmd 或执行 prisma migrate deploy。",
        ),
      );
    }

    return errorResponse(error);
  }
}

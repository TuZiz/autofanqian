import { NextResponse } from "next/server";
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
import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import { getCurrentUser } from "@/lib/auth/service";
import { getAiModelConfig } from "@/lib/config/ai-model";
import { assertCanCreateWork, assertCanUseAiAction } from "@/lib/membership/guards";
import { prisma } from "@/lib/prisma";
import { assertSameOriginRequest } from "@/lib/security/origin";
import {
  shortStoryGeneratedSchema,
  shortStoryGenerateSchema,
  type ShortStoryGenerateInput,
} from "@/shared/schemas/short-story-generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function buildShortStoryOutlineJson(input: ShortStoryGenerateInput, output: {
  title: string;
  synopsis: string;
  outline: string;
  content: string;
}) {
  return {
    tag: input.genre.slice(0, 12),
    title: output.title,
    synopsis: output.synopsis,
    targetWords: input.targetWords,
    theme: `${input.genre} / ${input.style}`,
    hook: input.idea.slice(0, 300),
    endingType: "twist",
    characters: [],
    beats: [
      {
        index: 1,
        title: output.title,
        purpose: "完整短篇正文",
        targetWords: input.targetWords,
        writingPrompt: output.outline,
      },
    ],
    fullOutline: output.outline,
  };
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
    await assertCanUseAiAction(user, "short_story_outline_generate");

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

    const prompt = buildShortStoryGenerateUserPrompt(input);
    const result = await runWithAiQuotaReservation(
      user,
      "short_story_outline_generate",
      () =>
        callAiText({
          providers,
          preferredProviderId: target.providerId,
          routeId: target.providerId,
          messages: [
            { role: "system", content: buildShortStoryGenerateSystemPrompt() },
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
    const outlineJson = buildShortStoryOutlineJson(input, output);
    const contentWordCount = countWords(output.content);

    const work = await prisma.work.create({
      data: {
        userId: user.id,
        workType: "short_story",
        genreId: "short_story",
        genreLabel: input.genre,
        idea: input.idea,
        tags: [input.genre, input.style],
        platformId: input.style,
        platformLabel: input.style,
        words: `${input.targetWords} 字`,
        dnaBookTitle: null,
        tag: input.genre,
        title: output.title,
        synopsis: output.synopsis,
        outline: outlineJson as Prisma.InputJsonValue,
        rawOutline: {
          ...outlineJson,
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
            chapterOutline: output.outline,
            details: [
              `短篇类型：${input.genre}`,
              `风格：${input.style}`,
              `目标字数：${input.targetWords}`,
            ],
          },
        },
        generationJobs: {
          create: {
            userId: user.id,
            action: "short_story.generate",
            jobType: "short_story.generate",
            status: "succeeded",
            routeId: result.providerId ?? target.providerId,
            providerId: result.providerId ?? null,
            modelUsed: result.modelUsed ?? null,
            promptTemplateKey: "short-story.generate",
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

    return successResponse(
      {
        workId: work.id,
        title: output.title,
        synopsis: output.synopsis,
        outline: output.outline,
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

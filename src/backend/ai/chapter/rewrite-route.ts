import { NextResponse } from "next/server";
import { z } from "zod";

import { queueChapterContextExtraction } from "@/lib/ai/chapter-context-extract";
import { assertAiQuotaAvailable } from "@/lib/ai/quota";
import { logAiUsage } from "@/lib/ai/usage-log";
import {
  buildAiProviderChain,
  callAiText,
  getAiProvidersFromEnv,
  getReadableAiErrorMessage,
} from "@/lib/ai/upstream-text";
import { aiZhCN } from "@/lib/copy/ai-zh-cn";
import { AuthApiError } from "@/lib/auth/errors";
import { getAiModelConfig } from "@/lib/config/ai-model";
import { prisma } from "@/lib/prisma";
import { createChapterRevisionSnapshot } from "@/lib/workbench/chapter-revisions";
import { requireWorkAccess } from "@/lib/works/access";
import { assertSameOriginRequest } from "@/lib/security/origin";

export const runtime = "nodejs";

const rewriteActionSchema = z.enum(["polish", "expand", "compress", "conflict", "logic_check"]);

const bodySchema = z.object({
  workId: z.string().min(1).max(64),
  index: z.coerce.number().int().min(1).max(9999),
  action: rewriteActionSchema,
  extraPrompt: z.string().trim().max(2000).optional().nullable(),
  apply: z.boolean().optional(),
  draftContent: z.string().max(200_000).optional().nullable(),
});

type RewriteAction = z.infer<typeof rewriteActionSchema>;

const actionLabel: Record<RewriteAction, string> = {
  polish: "润色本章",
  expand: "扩写本章",
  compress: "压缩本章",
  conflict: "增强冲突",
  logic_check: "检查逻辑矛盾",
};

function countWords(text: string) {
  return text.replace(/\s+/g, "").length;
}

function serializeChapter(chapter: {
  id: string;
  index: number;
  title: string | null;
  content: string;
  wordCount: number;
  summary: string | null;
  chapterOutline: string | null;
  details: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...chapter,
    createdAt: chapter.createdAt.toISOString(),
    updatedAt: chapter.updatedAt.toISOString(),
  };
}

function buildRewritePrompt(params: {
  action: RewriteAction;
  title: string | null;
  content: string;
  extraPrompt?: string | null;
}) {
  const instruction =
    params.action === "logic_check"
      ? "只输出本章逻辑矛盾、人物动机问题、上下文衔接风险和修改建议，不要改写正文。"
      : "直接输出改写后的正文，不要输出解释、标题、Markdown 或额外字段。";

  const actionRule: Record<RewriteAction, string> = {
    polish: "提升语句流畅度、画面感和节奏，但保持剧情事件不变。",
    expand: "增加场景动作、心理变化和冲突推进，保持主线不偏移。",
    compress: "压缩重复表达和拖慢节奏的段落，保留关键剧情。",
    conflict: "增强人物冲突、外部压力和章末钩子，避免生硬反转。",
    logic_check: "检查时间顺序、人物状态、动机、场景连续性和伏笔矛盾。",
  };

  return [
    `动作：${actionLabel[params.action]}`,
    `要求：${actionRule[params.action]}`,
    instruction,
    params.extraPrompt ? `补充要求：${params.extraPrompt}` : "",
    "",
    `章节标题：${params.title || "未命名章节"}`,
    "",
    "原文：",
    params.content,
  ].filter(Boolean).join("\n");
}

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    const raw = await request.json().catch(() => null as unknown);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      throw new AuthApiError(400, "请求参数校验失败，请检查输入内容。");
    }

    const body = parsed.data;
    const { user, work } = await requireWorkAccess(body.workId);
    const chapter = await prisma.chapter.findUnique({
      where: { workId_index: { workId: work.id, index: body.index } },
      select: {
        id: true,
        title: true,
        content: true,
        wordCount: true,
        deletedAt: true,
      },
    });

    if (!chapter || chapter.deletedAt) {
      throw new AuthApiError(404, "章节不存在或已被删除。");
    }

    if (body.apply) {
      if (body.action === "logic_check") {
        throw new AuthApiError(400, "逻辑检查没有可应用的正文内容。");
      }

      const nextContent = (body.draftContent ?? "").trim().slice(0, 200_000);
      if (!nextContent) {
        throw new AuthApiError(400, "请先生成改写预览，再应用到正文。");
      }

      await createChapterRevisionSnapshot({
        workId: work.id,
        index: body.index,
        source: "ai_rewrite",
        reason: body.action,
      });

      const updatedChapter = await prisma.chapter.update({
        where: { id: chapter.id },
        data: {
          content: nextContent,
          wordCount: countWords(nextContent),
          status: "written",
        },
        select: {
          id: true,
          index: true,
          title: true,
          content: true,
          wordCount: true,
          summary: true,
          chapterOutline: true,
          details: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      queueChapterContextExtraction({
        user,
        workId: work.id,
        chapterId: chapter.id,
        index: body.index,
        trigger: "rewrite_apply",
        force: true,
      });

      return NextResponse.json({
        success: true,
        message: aiZhCN.chapterRewrite.applySuccess,
        data: { chapter: serializeChapter(updatedChapter) },
      });
    }

    if (!chapter.content.trim()) {
      throw new AuthApiError(422, "当前章节正文为空，无法执行改写。");
    }

    await assertAiQuotaAvailable(user);

    const providersFromEnv = getAiProvidersFromEnv();
    const aiModelConfig = await getAiModelConfig();
    const target = aiModelConfig.chapterRewrite;
    const routeId = target.providerId;
    const providers = buildAiProviderChain({
      providers: providersFromEnv,
      preferredProviderId: routeId,
      overrideModel: target.model,
    });

    if (!providers.length) {
      throw new AuthApiError(500, "AI 未配置，请先在后台配置可用模型。");
    }
    const primaryProvider = providers[0];
    const prompt = buildRewritePrompt({
      action: body.action,
      title: chapter.title,
      content: chapter.content,
      extraPrompt: body.extraPrompt,
    });

    const generationJob = await prisma.generationJob.create({
      data: {
        novelId: work.id,
        chapterId: chapter.id,
        action: `chapter.rewrite.${body.action}`,
        status: "running",
        routeId,
        providerId: primaryProvider.id,
        modelUsed: primaryProvider.model,
        promptTemplateKey: "chapter.rewrite",
        promptSnapshot: prompt.slice(0, 20000),
      },
    });

    const result = await callAiText({
      providers,
      routeId,
      preferredProviderId: primaryProvider.id,
      messages: [
        { role: "system", content: "你是中文长篇小说编辑，负责在不破坏上下文的前提下改写或检查章节。" },
        { role: "user", content: prompt },
      ],
      temperature: body.action === "logic_check" ? 0.3 : 0.75,
      maxTokens: body.action === "logic_check" ? 1800 : 5200,
    });

    await logAiUsage({
      userId: user.id,
      action: `chapter_rewrite_${body.action}`,
      result,
    });

    if (!result.ok || !result.text) {
      await prisma.generationJob.update({
        where: { id: generationJob.id },
        data: {
          status: "failed",
          routeId,
          error: result.upstreamMessage || "AI 改写失败",
          providerId: result.providerId ?? primaryProvider.id,
          modelUsed: result.modelUsed ?? primaryProvider.model,
          inputTokens: result.usage?.inputTokens ?? null,
          outputTokens: result.usage?.outputTokens ?? null,
          totalTokens: result.usage?.totalTokens ?? null,
          durationMs: result.durationMs ?? null,
          completedAt: new Date(),
        },
      });
      throw new AuthApiError(502, getReadableAiErrorMessage(result, aiZhCN.chapterRewrite.failed));
    }

    const nextText = result.text.trim().slice(0, 200_000);
    const resultSummary =
      body.action === "logic_check"
        ? result.text.slice(0, 2000)
        : `${actionLabel[body.action]}预览完成，${countWords(nextText)}字。`;

    await prisma.generationJob.update({
      where: { id: generationJob.id },
      data: {
        status: "success",
        routeId,
        resultSummary,
        providerId: result.providerId ?? primaryProvider.id,
        modelUsed: result.modelUsed ?? primaryProvider.model,
        inputTokens: result.usage?.inputTokens ?? null,
        outputTokens: result.usage?.outputTokens ?? null,
        totalTokens: result.usage?.totalTokens ?? null,
        durationMs: result.durationMs ?? null,
        completedAt: new Date(),
      },
    });

    if (body.action === "logic_check") {
      return NextResponse.json({
        success: true,
        message: aiZhCN.chapterRewrite.logicDone,
        data: { report: nextText },
      });
    }

    return NextResponse.json({
      success: true,
      message: aiZhCN.chapterRewrite.previewDone,
      data: {
        action: body.action,
        preview: nextText,
        originalWordCount: chapter.wordCount,
        previewWordCount: countWords(nextText),
      },
    });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return NextResponse.json(
        { success: false, message: error.message, fieldErrors: error.fieldErrors },
        { status: error.status },
      );
    }

    console.error(error);
    return NextResponse.json(
      { success: false, message: "服务异常，请稍后重试。" },
      { status: 500 },
    );
  }
}

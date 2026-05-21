import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/auth/api";
import { z } from "zod";

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
import { isAdminUser } from "@/lib/auth/admin";
import { AuthApiError } from "@/lib/auth/errors";
import { getCurrentUser } from "@/lib/auth/service";
import { getAiModelConfig } from "@/lib/config/ai-model";
import { getAiMetaCopy } from "@/lib/copy/ai-zh-cn";
import { assertCanUseAiAction } from "@/lib/membership/guards";
import { prisma } from "@/lib/prisma";
import { createChapterRevisionSnapshot } from "@/lib/workbench/chapter-revisions";
import { assertSameOriginRequest } from "@/lib/security/origin";
import { AI_ACTIONS } from "@/shared/ai-actions";

export const runtime = "nodejs";

const bodySchema = z.object({
  workId: z.string().min(1).max(64),
  index: z.coerce.number().int().min(1).max(999),
  extraPrompt: z.string().trim().max(2000).optional().nullable(),
});

function clampText(value: string, maxChars: number) {
  const normalized = (value ?? "").trim();
  if (!normalized) return "";
  return normalized.length > maxChars ? normalized.slice(0, maxChars) : normalized;
}

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
  } catch (error) {
    return errorResponse(error);
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, message: "未登录或登录已失效，请先登录。" },
      { status: 401 },
    );
  }

  const raw = await request.json().catch(() => null as unknown);
  const parsedBody = bodySchema.safeParse(raw);
  if (!parsedBody.success) {
    return NextResponse.json(
      { success: false, message: "请求参数校验失败，请检查输入内容。" },
      { status: 400 },
    );
  }

  const body = parsedBody.data;
  const isAdmin = isAdminUser(user);
  const extraPrompt = body.extraPrompt?.trim() ?? "";

  try {
    const work = await prisma.work.findUnique({
      where: { id: body.workId },
      select: {
        id: true,
        userId: true,
        tag: true,
        title: true,
        deletedAt: true,
      },
    });

    if (!work || work.deletedAt) {
      return NextResponse.json(
        { success: false, message: "作品不存在或已被删除。" },
        { status: 404 },
      );
    }

    if (!isAdmin && work.userId !== user.id) {
      return NextResponse.json(
        { success: false, message: "无权限访问该作品。" },
        { status: 403 },
      );
    }

    const chapter = await prisma.chapter.findUnique({
      where: { workId_index: { workId: work.id, index: body.index } },
      select: {
        id: true,
        title: true,
        content: true,
        wordCount: true,
        summary: true,
        deletedAt: true,
      },
    });

    if (!chapter || chapter.deletedAt) {
      return NextResponse.json(
        { success: false, message: "章节不存在，请先创建章节。" },
        { status: 404 },
      );
    }

    const content = (chapter.content ?? "").trim();
    if (!content) {
      return NextResponse.json(
        { success: false, message: "章节正文为空，无法生成摘要。" },
        { status: 400 },
      );
    }

    try {
      await assertAiQuotaAvailable(user);
      await assertCanUseAiAction(user, AI_ACTIONS.chapterSummary);
    } catch (error) {
      return errorResponse(error);
    }

    const providersFromEnv = getAiProvidersFromEnv();
    const aiModelConfig = await getAiModelConfig();
    const target = chapter.summary?.trim()
      ? aiModelConfig.regenerateAll
      : aiModelConfig.chapterSummary;

    const providers = buildAiProviderChain({
      providers: providersFromEnv,
      preferredProviderId: target.providerId,
      overrideModel: target.model,
    });

    if (!providers.length) {
      const envKey = getProviderApiKeyEnvName(target.providerId);
      return NextResponse.json(
        {
          success: false,
          message: `AI 未配置：当前“生成摘要”使用 ${target.providerId}，但未检测到 ${envKey}。请在 web/.env 或 web/.env.local 配置后重启，或到后台“AI 模型配置”切换线路。`,
        },
        { status: 500 },
      );
    }

    const primaryProvider = providers[0];

    const result = await runWithAiQuotaReservation(user, AI_ACTIONS.chapterSummary, () =>
      callAiText({
      providers,
      preferredProviderId: primaryProvider.id,
      messages: [
        {
          role: "system",
          content: [
            "你是一名资深中文小说编辑。",
            "请为给定章节正文生成一个【章节摘要】。",
            "",
            "输出要求：",
            "1) 只输出摘要正文（纯文本），不要标题，不要序号，不要 Markdown。",
            "2) 200-350 字为宜，信息密度高，包含核心冲突与转折。",
          ].join("\n"),
        },
        {
          role: "user",
          content: [
            `作品：${work.title}`,
            `标签：${work.tag || "-"}`,
            `章节：第 ${body.index} 章`,
            `章标题：${chapter.title || "-"}`,
            `当前字数：${chapter.wordCount.toLocaleString("zh-CN")}`,
            extraPrompt ? `补充要求（优先遵循）：${extraPrompt}` : "",
            "",
            "章节正文：",
            clampText(content, 14_000),
          ].join("\n"),
        },
      ],
      temperature: 0.4,
        maxTokens: 650,
      }),
    );

    if (!result.ok || !result.text) {
      return NextResponse.json(
        {
          success: false,
          message: getReadableAiErrorMessage(result, getAiMetaCopy("summary").errorFallback),
        },
        { status: 502 },
      );
    }

    const summary = result.text.trim();
    if (!summary) {
      return NextResponse.json(
        { success: false, message: "AI 返回为空，请稍后重试。" },
        { status: 502 },
      );
    }

    await createChapterRevisionSnapshot({
      workId: work.id,
      index: body.index,
      source: "meta_update",
      reason: "chapter_summary",
    }).catch((error) => console.error("create chapter revision failed", error));

    const updated = await prisma.chapter.update({
      where: { id: chapter.id },
      data: { summary },
      select: {
        id: true,
        index: true,
        title: true,
        content: true,
        wordCount: true,
        summary: true,
        chapterOutline: true,
        details: true,
        updatedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "OK",
      data: {
        chapter: {
          ...updated,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
          details: updated.details ?? [],
        },
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "数据库未迁移完成：请先运行 start-dev.cmd 或执行 prisma migrate deploy。",
        },
        { status: 500 },
      );
    }

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

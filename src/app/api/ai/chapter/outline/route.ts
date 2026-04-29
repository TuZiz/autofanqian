import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { logAiUsage } from "@/lib/ai/usage-log";
import { callAiText, getAiProvidersFromEnv } from "@/lib/ai/upstream-text";
import { isAdminEmail } from "@/lib/auth/admin";
import { AuthApiError } from "@/lib/auth/errors";
import { getCurrentUser } from "@/lib/auth/service";
import { getAiModelConfig } from "@/lib/config/ai-model";
import { prisma } from "@/lib/prisma";
import type { StoryOutline } from "@/lib/create/outline-draft";

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
        return `  - ${segment.title}${segmentRange ? `（${segmentRange}）` : ""}：${clampText(segment.desc, 160)}`;
      })
      .join("\n") ?? "";

  return [
    `${index + 1}. ${volume.name}${range ? `（${range}）` : ""}`,
    `概要：${clampText(volume.desc, 260)}`,
    segments ? `章节小节：\n${segments}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(request: Request) {
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
  const isAdmin = isAdminEmail(user.email);
  const extraPrompt = body.extraPrompt?.trim() ?? "";

  try {
    const work = await prisma.work.findUnique({
      where: { id: body.workId },
      select: {
        id: true,
        userId: true,
        tag: true,
        title: true,
        synopsis: true,
        outline: true,
      },
    });

    if (!work) {
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
        chapterOutline: true,
      },
    });

    if (!chapter) {
      return NextResponse.json(
        { success: false, message: "章节不存在，请先创建章节。" },
        { status: 404 },
      );
    }

    const previous =
      body.index > 1
        ? await prisma.chapter.findUnique({
            where: { workId_index: { workId: work.id, index: body.index - 1 } },
            select: { title: true, content: true, summary: true },
          })
        : null;

    const hasContent = Boolean((chapter.content ?? "").trim());
    if (!hasContent) {
      return NextResponse.json(
        { success: false, message: "章节正文为空，无法生成大纲。" },
        { status: 400 },
      );
    }

    const outline = work.outline as unknown as StoryOutline;

    const providersFromEnv = getAiProvidersFromEnv();
    const aiModelConfig = await getAiModelConfig();
    const target = chapter.chapterOutline?.trim()
      ? aiModelConfig.regenerateAll
      : aiModelConfig.chapterOutline;

    const selectedProvider = providersFromEnv.find(
      (provider) => provider.id === target.providerId,
    );

    if (!selectedProvider) {
      const envKey = target.providerId === "primary" ? "AI_API_KEY" : "ARK_API_KEY";
      return NextResponse.json(
        {
          success: false,
          message:
            `AI 未配置：当前“生成章节大纲”使用 ${target.providerId}，但未检测到 ${envKey}。请在 web/.env 或 web/.env.local 配置后重启，或到后台“AI 模型配置”切换线路。`,
        },
        { status: 500 },
      );
    }

    const providers = [
      {
        ...selectedProvider,
        model: target.model ?? selectedProvider.model,
      },
    ];

    const systemPrompt = [
      "你是一名资深小说编剧/编辑。",
      hasContent
        ? "请根据章节正文，提炼出【章节大纲】（也可理解为情节节拍/场景列表）。"
        : "请根据作品信息与全书大纲，为指定章节生成【写作大纲】（本章计划要写什么）。",
      "",
      "输出要求：",
      "1) 只输出要点列表（纯文本），不要标题，不要 Markdown 代码块。",
      "2) 使用短句，每行一条，以“- ”开头。",
      "3) 6-12 条为宜，按发生顺序排列，包含冲突推进与结尾悬念。",
    ].join("\n");

    const userPrompt = [
      `作品：${work.title}`,
      `标签：${work.tag || "-"}`,
      `章节：第 ${body.index} 章`,
      `章标题：${chapter.title || "-"}`,
      "",
      `作品简介：${clampText(work.synopsis ?? "", 600) || "-"}`,
      extraPrompt ? `补充要求（优先遵循）：${extraPrompt}` : "",
      "",
      `全书大纲（卷结构）：\n${outline?.volumes?.map(formatOutlineVolume).join("\n\n") || "-"}`,
      "",
      previous?.summary
        ? `上一章摘要：\n${clampText(previous.summary, 900)}\n`
        : previous?.content
          ? `上一章结尾节选：\n${clampText(previous.content.trim().slice(-1200), 1200)}\n`
          : "",
      hasContent
        ? ["章节正文：", clampText((chapter.content ?? "").trim(), 14_000)].join("\n")
        : "本章正文：暂无（请生成写作大纲）。",
    ]
      .filter(Boolean)
      .join("\n");

    const result = await callAiText({
      providers,
      preferredProviderId: selectedProvider.id,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: hasContent ? 0.35 : 0.55,
      maxTokens: 900,
    });

    await logAiUsage({
      userId: user.id,
      action: `chapter_outline_${body.index}`,
      result,
    });

    if (!result.ok || !result.text) {
      return NextResponse.json(
        { success: false, message: result.upstreamMessage || "AI 生成失败，请稍后重试。" },
        { status: 502 },
      );
    }

    const chapterOutline = result.text.trim();
    if (!chapterOutline) {
      return NextResponse.json(
        { success: false, message: "AI 返回为空，请稍后重试。" },
        { status: 502 },
      );
    }

    const updated = await prisma.chapter.update({
      where: { id: chapter.id },
      data: { chapterOutline },
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

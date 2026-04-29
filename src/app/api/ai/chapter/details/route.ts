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

export const runtime = "nodejs";

const bodySchema = z.object({
  workId: z.string().min(1).max(64),
  index: z.coerce.number().int().min(1).max(999),
});

function clampText(value: string, maxChars: number) {
  const normalized = (value ?? "").trim();
  if (!normalized) return "";
  return normalized.length > maxChars ? normalized.slice(0, maxChars) : normalized;
}

function parseDetailLines(text: string) {
  const lines = (text ?? "")
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);

  const cleaned: string[] = [];
  for (const line of lines) {
    const normalized = line.replace(/^[-*•\d.\s]+/, "").trim();
    if (!normalized) continue;
    cleaned.push(normalized);
  }

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const item of cleaned) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
    if (unique.length >= 60) break;
  }

  return unique;
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

  try {
    const work = await prisma.work.findUnique({
      where: { id: body.workId },
      select: {
        id: true,
        userId: true,
        tag: true,
        title: true,
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
        details: true,
      },
    });

    if (!chapter) {
      return NextResponse.json(
        { success: false, message: "章节不存在，请先创建章节。" },
        { status: 404 },
      );
    }

    const content = (chapter.content ?? "").trim();
    if (!content) {
      return NextResponse.json(
        { success: false, message: "章节正文为空，无法提取设定。" },
        { status: 400 },
      );
    }

    const providersFromEnv = getAiProvidersFromEnv();
    const aiModelConfig = await getAiModelConfig();
    const hasExistingDetails = Array.isArray(chapter.details) && chapter.details.length > 0;
    const target = hasExistingDetails
      ? aiModelConfig.regenerateAll
      : aiModelConfig.chapterDetails;

    const selectedProvider = providersFromEnv.find(
      (provider) => provider.id === target.providerId,
    );

    if (!selectedProvider) {
      const envKey = target.providerId === "primary" ? "AI_API_KEY" : "ARK_API_KEY";
      return NextResponse.json(
        {
          success: false,
          message:
            `AI 未配置：当前“提取设定”使用 ${target.providerId}，但未检测到 ${envKey}。请在 web/.env 或 web/.env.local 配置后重启，或到后台“AI 模型配置”切换线路。`,
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

    const result = await callAiText({
      providers,
      preferredProviderId: selectedProvider.id,
      messages: [
        {
          role: "system",
          content: [
            "你是一名小说编辑，擅长维护设定一致性。",
            "请从给定章节正文中提取【细节设定】与【关键信息】（用于防止前后矛盾）。",
            "",
            "输出要求：",
            "1) 只输出要点列表（纯文本），不要标题，不要序号表格，不要 Markdown 代码块。",
            "2) 每行一条，以“- ”开头。",
            "3) 8-16 条为宜，优先提取：人物关系/身份、地点、时间线、关键道具、组织、规则、承诺、伤势、金钱数额（如有）。",
          ].join("\n"),
        },
        {
          role: "user",
          content: [
            `作品：${work.title}`,
            `标签：${work.tag || "-"}`,
            `章节：第 ${body.index} 章`,
            `章标题：${chapter.title || "-"}`,
            "",
            "章节正文：",
            clampText(content, 14_000),
          ].join("\n"),
        },
      ],
      temperature: 0.3,
      maxTokens: 850,
    });

    await logAiUsage({
      userId: user.id,
      action: `chapter_details_${body.index}`,
      result,
    });

    if (!result.ok || !result.text) {
      return NextResponse.json(
        { success: false, message: result.upstreamMessage || "AI 生成失败，请稍后重试。" },
        { status: 502 },
      );
    }

    const details = parseDetailLines(result.text);
    if (!details.length) {
      return NextResponse.json(
        { success: false, message: "AI 返回为空，请稍后重试。" },
        { status: 502 },
      );
    }

    const updated = await prisma.chapter.update({
      where: { id: chapter.id },
      data: { details },
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

import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminUser } from "@/lib/auth/admin";
import { getCreateUiConfig } from "@/lib/config/create-ui";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const bodySchema = z.object({
  genreId: z.string().min(1).max(64).optional(),
  perGenre: z.number().int().min(1).max(10).optional(),
});

function buildChatCompletionsUrl(baseUrl: string) {
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (trimmed.endsWith("/v1")) {
    return `${trimmed}/chat/completions`;
  }
  return `${trimmed}/v1/chat/completions`;
}

function getFirstContent(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;

  const data = payload as {
    choices?: Array<{
      message?: { content?: string | null };
      text?: string | null;
    }>;
  };

  const choice = data.choices?.[0];
  const content = choice?.message?.content ?? choice?.text ?? null;
  return typeof content === "string" ? content.trim() : null;
}

function normalizeModelName(model: string) {
  const trimmed = model.trim();
  if (trimmed === "gpt5.2") return "gpt-5.2";
  return trimmed;
}

function getUpstreamMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;

  const data = payload as {
    error?: { message?: unknown };
    message?: unknown;
  };

  const message = data.error?.message ?? data.message ?? null;
  return typeof message === "string" ? message : null;
}

function parseStringArrayFromModel(text: string) {
  const trimmed = text.trim();

  try {
    const json = JSON.parse(trimmed) as unknown;
    if (Array.isArray(json)) {
      return json.filter((item) => typeof item === "string") as string[];
    }
  } catch {
    // fallthrough
  }

  // Fallback: split by lines / numbering.
  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const items: string[] = [];
  for (const line of lines) {
    const normalized = line
      .replace(/^[-*]\s+/, "")
      .replace(/^\d+\.\s+/, "")
      .replace(/^（\d+）\s*/, "")
      .trim();
    if (normalized.length >= 20) {
      items.push(normalized);
    }
  }

  return items;
}

async function callChatCompletions(params: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  maxTokens?: number;
  temperature?: number;
}) {
  const response = await fetch(buildChatCompletionsUrl(params.baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      temperature: params.temperature ?? 0.8,
      max_tokens: params.maxTokens ?? 900,
      messages: params.messages,
    }),
  });

  const json = await response.json().catch(() => null as unknown);
  return { ok: response.ok, status: response.status, json };
}

export async function POST(request: Request) {
  await requireAdminUser();

  const apiKey = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL || "https://api.99dun.cc";
  const model = normalizeModelName(process.env.AI_MODEL || "gpt-5.2");

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        message: "AI 未配置：请先设置 AI_API_KEY。",
      },
      { status: 500 },
    );
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { success: false, message: "请求参数错误。" },
      { status: 400 },
    );
  }

  const config = await getCreateUiConfig();
  const perGenre = body.perGenre ?? 6;
  const genreIds = body.genreId
    ? [body.genreId]
    : config.genres.map((genre) => genre.id);

  const results: Array<{ genreId: string; created: number; skipped: number }> = [];

  for (const genreId of genreIds) {
    const meta = config.genres.find((genre) => genre.id === genreId);
    if (!meta) continue;

    const recentIdeas = await prisma.ideaGenerationEvent.findMany({
      where: { genreId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { outputIdea: true },
    });

    const topTemplates = await prisma.createTemplate.findMany({
      where: { genreId, isActive: true },
      orderBy: [{ usageCount: "desc" }, { updatedAt: "desc" }],
      take: 10,
      select: { content: true, usageCount: true },
    });

    const systemPrompt = [
      "你是一名中文网文策划编辑，擅长把零散素材提炼成可复用的热门模板。",
      "请只输出 JSON，不要输出 Markdown，不要输出多余解释。",
      `输出一个 JSON 数组，包含 ${perGenre} 条“热门模板”文本（数组元素为字符串）。`,
      "每条模板 160-280 字左右，结构完整：核心设定 + 世界规则/限制（至少2条）+ 主角目标与阻力 + 3个看点/爽点。",
      "每条模板第一行必须以“标签：”开头，且必须包含给定标签（用顿号或逗号分隔）。",
      "不要直接照抄输入素材，不要出现“AI/模型/提示词”等字样。",
    ].join("\n");

    const userPrompt = [
      `小说类型：${meta.name}`,
      `固定标签：${meta.tags.join("、") || "无"}`,
      "",
      "现有热门模板（供参考，不要照抄）：",
      topTemplates.length
        ? topTemplates
            .map((item, idx) => `${idx + 1})（使用次数${item.usageCount}）${item.content}`)
            .join("\n")
        : "（暂无）",
      "",
      "最近用户创意（供学习，不要照抄）：",
      recentIdeas.length
        ? recentIdeas.map((item, idx) => `${idx + 1}) ${item.outputIdea}`).join("\n")
        : "（暂无）",
      "",
      "请生成新的热门模板数组。",
    ].join("\n");

    const response = await callChatCompletions({
      baseUrl,
      apiKey,
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    if (!response.ok) {
      const upstreamMessage = getUpstreamMessage(response.json);

      return NextResponse.json(
        {
          success: false,
          message:
            typeof upstreamMessage === "string"
              ? `AI 学习失败：${upstreamMessage}（HTTP ${response.status}）`
              : `AI 学习失败（HTTP ${response.status}）`,
        },
        { status: 502 },
      );
    }

    const content = getFirstContent(response.json);
    if (!content) {
      return NextResponse.json(
        { success: false, message: "AI 学习失败：未返回有效内容。" },
        { status: 502 },
      );
    }

    const candidates = parseStringArrayFromModel(content)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => item.slice(0, 1200))
      .filter((item) => item.length >= 60)
      .slice(0, perGenre);

    if (!candidates.length) {
      results.push({ genreId, created: 0, skipped: perGenre });
      continue;
    }

    const existing = await prisma.createTemplate.findMany({
      where: {
        genreId,
        content: { in: candidates },
      },
      select: { content: true },
    });

    const existingSet = new Set(existing.map((item) => item.content));
    const next = candidates.filter((item) => !existingSet.has(item));

    if (!next.length) {
      results.push({ genreId, created: 0, skipped: candidates.length });
      continue;
    }

    await prisma.createTemplate.createMany({
      data: next.map((contentText) => ({
        genreId,
        title: "Learned",
        content: contentText,
        source: "learned",
        usageCount: 0,
        isActive: true,
      })),
    });

    results.push({
      genreId,
      created: next.length,
      skipped: candidates.length - next.length,
    });
  }

  return NextResponse.json({
    success: true,
    message: "热门模板已学习更新。",
    data: { results },
  });
}

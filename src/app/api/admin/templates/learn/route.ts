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

function getAlternateModelName(model: string) {
  if (model === "gpt5.2") return "gpt-5.2";
  if (model === "gpt-5.2") return "gpt5.2";
  return null;
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

function shouldRetryWithAlternateModel(status: number, upstreamMessage: unknown) {
  if (status !== 400 && status !== 404) return false;
  if (typeof upstreamMessage !== "string") return false;
  return /(model|not\s*found|unknown|invalid|不存在|未找到|无效|不支持)/i.test(
    upstreamMessage,
  );
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

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetryableStatus(status: number) {
  return (
    status === 0 ||
    status === 408 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

async function callChatCompletions(params: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  maxTokens?: number;
  temperature?: number;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
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
      signal: controller.signal,
    });

    const json = await response.json().catch(() => null as unknown);
    return { ok: response.ok, status: response.status, json };
  } catch {
    return {
      ok: false,
      status: 0,
      json: { error: { message: "网络异常或上游服务不可达" } },
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function callChatCompletionsWithRetry(params: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  maxTokens?: number;
  temperature?: number;
  attempts?: number;
}) {
  const attempts = Math.max(1, Math.min(3, params.attempts ?? 3));
  let last = await callChatCompletions(params);

  for (let attempt = 1; attempt < attempts; attempt += 1) {
    if (last.ok || !isRetryableStatus(last.status)) {
      return last;
    }

    const baseDelay = 450 * Math.pow(2, attempt - 1);
    const jitter = Math.floor(Math.random() * 150);
    await sleep(baseDelay + jitter);

    last = await callChatCompletions(params);
  }

  return last;
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

  const clampSnippet = (text: string, max = 520) => {
    const normalized = text.replace(/\s+/g, " ").trim();
    return normalized.length > max ? `${normalized.slice(0, max)}…` : normalized;
  };

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

    const templateSamples = topTemplates.slice(0, 8);
    const ideaSamples = recentIdeas.slice(0, 12);

    const systemPrompt = [
      "你是一名中文网文策划编辑，擅长把零散素材提炼成可复用的热门模板。",
      "整体风格偏番茄平台：情绪优先、快节奏、短句短段、对话推进、结尾留钩子，且尽量适配短剧化改编。",
      "请只输出 JSON，不要输出 Markdown，不要输出多余解释。",
      `输出一个 JSON 数组，包含 ${perGenre} 条“热门模板”文本（数组元素为字符串）。`,
      "每条模板 160-280 字左右，结构完整：核心设定 + 世界规则/限制（至少2条）+ 主角目标与阻力 + 3个看点/爽点 + 开篇钩子事件（1句）+ 第一章结尾断章钩子（1句）。",
      "每条模板第一行必须以“标签：”开头，且必须包含给定标签（用顿号或逗号分隔）。",
      "不要直接照抄输入素材，不要出现“AI/模型/提示词”等字样。",
    ].join("\n");

    const userPrompt = [
      `小说类型：${meta.name}`,
      `固定标签：${meta.tags.join("、") || "无"}`,
      "",
      "现有热门模板（供参考，不要照抄）：",
      templateSamples.length
        ? templateSamples
            .map(
              (item, idx) =>
                `${idx + 1})（使用次数${item.usageCount}）${clampSnippet(item.content, 420)}`,
            )
            .join("\n")
        : "（暂无）",
      "",
      "最近用户创意（供学习，不要照抄）：",
      ideaSamples.length
        ? ideaSamples
            .map((item, idx) => `${idx + 1}) ${clampSnippet(item.outputIdea, 480)}`)
            .join("\n")
        : "（暂无）",
      "",
      "请生成新的热门模板数组。",
    ].join("\n");

    let modelUsed = model;
    let response = await callChatCompletionsWithRetry({
      baseUrl,
      apiKey,
      model: modelUsed,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    if (!response.ok) {
      const upstreamMessage = getUpstreamMessage(response.json);
      const alternateModel = getAlternateModelName(modelUsed);

      if (
        alternateModel &&
        shouldRetryWithAlternateModel(response.status, upstreamMessage)
      ) {
        const retry = await callChatCompletionsWithRetry({
          baseUrl,
          apiKey,
          model: alternateModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });

        if (retry.ok) {
          response = retry;
          modelUsed = alternateModel;
        }
      }
    }

    if (!response.ok) {
      const upstreamMessage = getUpstreamMessage(response.json);

      return NextResponse.json(
        {
          success: false,
          message:
            response.status === 401
              ? "AI 学习失败：鉴权失败，请检查 AI_API_KEY。"
              : response.status === 429
                ? "AI 学习失败：上游限流（429），请稍后重试。"
                : response.status === 503
                  ? "AI 学习失败：上游服务暂时不可用（503），请稍后重试。"
                  : response.status === 502
                    ? "AI 学习失败：上游网关异常（502），请稍后重试。"
                    : typeof upstreamMessage === "string"
                      ? `AI 学习失败：${upstreamMessage}${response.status ? `（HTTP ${response.status}）` : ""}`
                      : `AI 学习失败（HTTP ${response.status || 0}）`,
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

import { NextResponse } from "next/server";
import { z } from "zod";

import { buildIdeaSystemPrompt, buildIdeaUserPrompt } from "@/lib/ai/idea-prompt";
import { getSessionUserId } from "@/lib/auth/session";
import { getCreateUiConfig } from "@/lib/config/create-ui";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const requestSchema = z.object({
  genre: z.string().min(1).max(64),
  tags: z.array(z.string()).max(12).optional(),
  platform: z.string().optional(),
  dna: z.string().optional(),
  words: z.string().optional(),
  existingIdea: z.string().optional(),
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

function nonWhitespaceLength(text: string) {
  return text.replace(/\s/g, "").length;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeModelName(model: string) {
  const trimmed = model.trim();
  // Some OpenAI-compatible proxies expose GPT-5.2 as "gpt-5.2" (hyphenated).
  // Accept "gpt5.2" as an alias to reduce config friction.
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

function isRetryableStatus(status: number) {
  return status === 0 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

async function callChatCompletions(params: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
}) {
  const url = buildChatCompletionsUrl(params.baseUrl);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model: params.model,
        temperature: 0.8,
        max_tokens: 700,
        messages: params.messages,
      }),
    });

    const json = await response
      .json()
      .catch(() => null as unknown);

    return { ok: response.ok, status: response.status, json };
  } catch {
    return {
      ok: false,
      status: 0,
      json: { error: { message: "网络异常或上游服务不可达" } },
    };
  }
}

async function callChatCompletionsWithRetry(params: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  attempts?: number;
}) {
  const attempts = Math.max(1, Math.min(3, params.attempts ?? 3));
  let last = await callChatCompletions(params);

  for (let attempt = 1; attempt < attempts; attempt += 1) {
    if (last.ok || !isRetryableStatus(last.status)) {
      return last;
    }

    const baseDelay = 350 * Math.pow(2, attempt - 1);
    const jitter = Math.floor(Math.random() * 120);
    await sleep(baseDelay + jitter);

    last = await callChatCompletions(params);
  }

  return last;
}

export async function POST(request: Request) {
  let body: unknown = null;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "请求格式错误，无法解析提交的数据。" },
      { status: 400 },
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] ? String(issue.path[0]) : "body";
      fieldErrors[key] = fieldErrors[key] ?? [];
      fieldErrors[key].push(issue.message);
    }

    return NextResponse.json(
      { success: false, message: "请求参数校验失败，请检查输入内容。", fieldErrors },
      { status: 400 },
    );
  }

  const baseUrl = process.env.AI_BASE_URL || "https://api.99dun.cc";
  const apiKey = process.env.AI_API_KEY;
  const model = normalizeModelName(process.env.AI_MODEL || "gpt-5.2");

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        message:
          "AI 未配置：请在 web/.env 或 web/.env.local 中设置 AI_API_KEY。",
      },
      { status: 500 },
    );
  }

  const uiConfig = await getCreateUiConfig();
  const genreMeta = uiConfig.genres.find((item) => item.id === parsed.data.genre);

  if (!genreMeta) {
    return NextResponse.json(
      { success: false, message: "小说类型无效，请刷新页面后重试。" },
      { status: 400 },
    );
  }

  const effectiveTags = (parsed.data.tags?.length ? parsed.data.tags : genreMeta.tags)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);

  const platformId = parsed.data.platform?.trim();
  const platformMeta = platformId
    ? uiConfig.platforms.find((item) => item.id === platformId)
    : null;
  const platformText = platformMeta
    ? `${platformMeta.label}${platformMeta.promptHint ? `（${platformMeta.promptHint}）` : ""}`
    : platformId;

  const dnaId = parsed.data.dna?.trim();
  const dnaMeta = dnaId ? uiConfig.dnaStyles.find((item) => item.id === dnaId) : null;
  const dnaText = dnaMeta
    ? `${dnaMeta.label}${dnaMeta.promptHint ? `（${dnaMeta.promptHint}）` : ""}`
    : dnaId;

  const wordsId = parsed.data.words?.trim();
  const wordsMeta = wordsId
    ? uiConfig.wordOptions.find((item) => item.id === wordsId)
    : null;
  const wordsText = wordsMeta ? wordsMeta.label : wordsId;

  const systemPrompt = buildIdeaSystemPrompt();
  const userPrompt = buildIdeaUserPrompt({
    genre: genreMeta.id,
    genreLabel: genreMeta.name,
    tags: effectiveTags.length ? effectiveTags : undefined,
    platform: platformText,
    dna: dnaText,
    words: wordsText,
    existingIdea: parsed.data.existingIdea,
  });

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> =
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

  let modelUsed = model;
  let first = await callChatCompletionsWithRetry({
    baseUrl,
    apiKey,
    model,
    messages,
  });

  if (!first.ok) {
    const upstreamMessage = getUpstreamMessage(first.json);
    const alternateModel = getAlternateModelName(model);

    if (
      alternateModel &&
      shouldRetryWithAlternateModel(first.status, upstreamMessage)
    ) {
      const retry = await callChatCompletionsWithRetry({
        baseUrl,
        apiKey,
        model: alternateModel,
        messages,
      });

      if (retry.ok) {
        first = retry;
        modelUsed = alternateModel;
      }
    }
  }

  if (!first.ok) {
    const upstreamMessage = getUpstreamMessage(first.json);

    return NextResponse.json(
      {
        success: false,
        message:
          first.status === 401
            ? "AI 服务鉴权失败，请检查 AI_API_KEY。"
            : first.status === 429
              ? "AI 服务请求过于频繁（上游限流），请稍后重试。"
              : first.status === 503
                ? "AI 服务暂时不可用（上游拥堵或维护），请稍后重试。"
            : typeof upstreamMessage === "string"
              ? `AI 服务调用失败：${upstreamMessage}${first.status ? `（HTTP ${first.status}）` : ""}`
              : "AI 服务调用失败，请稍后重试。",
      },
      { status: 502 },
    );
  }

  let content = getFirstContent(first.json);
  if (!content) {
    return NextResponse.json(
      { success: false, message: "AI 服务未返回有效内容，请稍后重试。" },
      { status: 502 },
    );
  }

  // Enforce minimum length; retry once with an explicit expansion request.
  if (nonWhitespaceLength(content) < 100) {
    const second = await callChatCompletionsWithRetry({
      baseUrl,
      apiKey,
      model: modelUsed,
      messages: [
        ...messages,
        { role: "assistant", content },
        {
          role: "user",
          content:
            "请在保持逻辑一致的前提下扩写并润色，使内容不少于 120 字，仍然不超过 800 字。",
        },
      ],
    });

    const expanded = second.ok ? getFirstContent(second.json) : null;
    if (expanded && nonWhitespaceLength(expanded) >= 100) {
      content = expanded;
    }
  }

  try {
    const userId = await getSessionUserId();
    await prisma.ideaGenerationEvent.create({
      data: {
        userId,
        genreId: genreMeta.id,
        tags: effectiveTags,
        platformId: platformId || null,
        dnaStyleId: dnaId || null,
        wordsId: wordsId || null,
        inputIdea: parsed.data.existingIdea?.trim() || null,
        outputIdea: content,
      },
      select: { id: true },
    });
  } catch (error) {
    console.warn("Failed to persist IdeaGenerationEvent:", error);
  }

  return NextResponse.json({
    success: true,
    message: "创意生成成功。",
    data: { idea: content },
  });
}

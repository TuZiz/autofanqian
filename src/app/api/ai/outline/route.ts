import { NextResponse } from "next/server";
import { z } from "zod";

import {
  buildOutlineSystemPrompt,
  buildOutlineUserPrompt,
} from "@/lib/ai/outline-prompt";
import { isAdminEmail } from "@/lib/auth/admin";
import { getCurrentUser } from "@/lib/auth/service";
import { getCreateUiConfig } from "@/lib/config/create-ui";

export const runtime = "nodejs";

const requestSchema = z.object({
  genre: z.string().min(1).max(64),
  idea: z.string().min(10).max(2000).optional(),
  tags: z.array(z.string()).max(12).optional(),
  platform: z.string().optional(),
  dna: z.string().optional(),
  dnaBookTitle: z.string().max(120).optional(),
  words: z.string().optional(),
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

async function fetchTextWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number },
) {
  const controller = new AbortController();
  const timeoutMs = init.timeoutMs ?? 12000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text().catch(() => "");
    return { ok: response.ok, status: response.status, text };
  } catch {
    return { ok: false, status: 0, text: "" };
  } finally {
    clearTimeout(timeout);
  }
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
        temperature: params.temperature ?? 0.75,
        max_tokens: params.maxTokens ?? 1200,
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

function parseTopLinksFromBing(html: string, limit: number) {
  const results: string[] = [];
  const regex = /<li class="b_algo"[\s\S]*?<a href="([^"]+)"/g;
  let match: RegExpExecArray | null = null;

  while ((match = regex.exec(html)) && results.length < limit) {
    const url = match[1];
    if (!url) continue;
    if (!/^https?:\/\//i.test(url)) continue;
    if (/^https?:\/\/(www\.)?bing\.com\//i.test(url)) continue;
    results.push(url);
  }

  return Array.from(new Set(results));
}

function clampSnippet(text: string, max = 700) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > max ? `${normalized.slice(0, max)}…` : normalized;
}

async function researchBookFromWeb(title: string) {
  const query = `${title} 小说 简介 世界观 设定 风格`;
  const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;

  const search = await fetchTextWithTimeout(searchUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
      Accept: "text/html",
    },
    timeoutMs: 10000,
  });

  if (!search.ok || !search.text) {
    return [];
  }

  const links = parseTopLinksFromBing(search.text, 3);
  const sources: Array<{ url: string; snippet: string }> = [];

  for (const url of links.slice(0, 2)) {
    // Jina AI reader proxy: returns a readable text view of the page.
    const readerUrl = `https://r.jina.ai/${url}`;
    const page = await fetchTextWithTimeout(readerUrl, {
      headers: {
        Accept: "text/plain",
      },
      timeoutMs: 12000,
    });

    if (!page.ok || !page.text) continue;
    const snippet = clampSnippet(page.text, 780);
    if (snippet.length < 120) continue;
    sources.push({ url, snippet });
  }

  return sources;
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
      {
        success: false,
        message: "请求参数校验失败，请检查输入内容。",
        fieldErrors,
      },
      { status: 400 },
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, message: "未登录或登录已失效，请先登录。" },
      { status: 401 },
    );
  }

  const isAdmin = isAdminEmail(user.email);

  const baseUrl = process.env.AI_BASE_URL || "https://api.99dun.cc";
  const apiKey = process.env.AI_API_KEY;
  const model = normalizeModelName(process.env.AI_MODEL || "gpt-5.2");

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        message: "AI 未配置：请在 web/.env 或 web/.env.local 中设置 AI_API_KEY。",
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

  const effectiveIdea = parsed.data.idea?.trim() || "";
  if (!effectiveIdea) {
    return NextResponse.json(
      { success: false, message: "请先填写创意描述，再生成大纲。" },
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

  const dnaBookTitleRaw = parsed.data.dnaBookTitle?.trim();
  const dnaBookTitle = isAdmin && dnaBookTitleRaw ? dnaBookTitleRaw : null;

  const dnaIdRaw = parsed.data.dna?.trim();
  const dnaId = isAdmin && !dnaBookTitle ? dnaIdRaw : null;
  const dnaMeta = dnaId ? uiConfig.dnaStyles.find((item) => item.id === dnaId) : null;
  const dnaText = dnaBookTitle
    ? `参考书名：${dnaBookTitle}（仅抽象写法与结构，不复刻原作剧情）`
    : dnaMeta
      ? `${dnaMeta.label}${dnaMeta.promptHint ? `（${dnaMeta.promptHint}）` : ""}`
      : null;

  const wordsId = parsed.data.words?.trim();
  const wordsMeta = wordsId ? uiConfig.wordOptions.find((item) => item.id === wordsId) : null;
  const wordsText = wordsMeta ? wordsMeta.label : wordsId;

  const webSources =
    dnaBookTitle && isAdmin ? await researchBookFromWeb(dnaBookTitle) : [];

  const systemPrompt = buildOutlineSystemPrompt();
  const userPrompt = buildOutlineUserPrompt({
    genreLabel: genreMeta.name,
    tags: effectiveTags.length ? effectiveTags : undefined,
    platform: platformText,
    dna: dnaText ?? undefined,
    words: wordsText,
    idea: effectiveIdea,
    webSources,
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
    model: modelUsed,
    messages,
    maxTokens: 1300,
    temperature: 0.75,
  });

  if (!first.ok) {
    const upstreamMessage = getUpstreamMessage(first.json);
    const alternateModel = getAlternateModelName(modelUsed);

    if (
      alternateModel &&
      shouldRetryWithAlternateModel(first.status, upstreamMessage)
    ) {
      const retry = await callChatCompletionsWithRetry({
        baseUrl,
        apiKey,
        model: alternateModel,
        messages,
        maxTokens: 1300,
        temperature: 0.75,
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
                : first.status === 502
                  ? "AI 服务暂时不可用（上游网关异常 502），请稍后重试。"
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

  if (nonWhitespaceLength(content) < 450) {
    const second = await callChatCompletionsWithRetry({
      baseUrl,
      apiKey,
      model: modelUsed,
      messages: [
        ...messages,
        { role: "assistant", content },
        {
          role: "user",
          content: "请在保持逻辑一致的前提下补全细节，使输出不少于 700 字。",
        },
      ],
      maxTokens: 1500,
      temperature: 0.7,
    });

    const expanded = second.ok ? getFirstContent(second.json) : null;
    if (expanded && nonWhitespaceLength(expanded) >= 450) {
      content = expanded;
    }
  }

  return NextResponse.json({
    success: true,
    message: "大纲生成成功。",
    data: { outline: content },
  });
}


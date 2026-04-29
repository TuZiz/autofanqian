import { NextResponse } from "next/server";
import { z } from "zod";

import {
  buildOutlineSystemPrompt,
  buildOutlineUserPrompt,
} from "@/lib/ai/outline-prompt";
import { logAiUsage } from "@/lib/ai/usage-log";
import { callAiText, getAiProvidersFromEnv } from "@/lib/ai/upstream-text";
import { isAdminEmail } from "@/lib/auth/admin";
import { getCurrentUser } from "@/lib/auth/service";
import { getAiModelConfig } from "@/lib/config/ai-model";
import { getCreateUiConfig } from "@/lib/config/create-ui";
import {
  normalizeStoryOutline,
  storyOutlineSchema,
} from "@/lib/create/outline-schema";

export const runtime = "nodejs";

const requestSchema = z.object({
  genre: z.string().min(1).max(64),
  customGenreLabel: z.string().max(80).optional(),
  idea: z.string().min(10).max(2000).optional(),
  tags: z.array(z.string()).max(12).optional(),
  platform: z.string().optional(),
  dna: z.string().optional(),
  dnaBookTitle: z.string().max(120).optional(),
  words: z.string().optional(),
});

function extractJson(text: string) {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) return null;

  const candidate = withoutFence.slice(start, end + 1);
  try {
    return JSON.parse(candidate) as unknown;
  } catch {
    return null;
  }
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
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
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
      headers: { Accept: "text/plain" },
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
      { success: false, message: "请求参数校验失败，请检查输入内容。", fieldErrors },
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

  const providersFromEnv = getAiProvidersFromEnv();
  const aiModelConfig = await getAiModelConfig();
  const target = aiModelConfig.outlineGenerate;

  const selectedProvider = providersFromEnv.find(
    (provider) => provider.id === target.providerId,
  );

  if (!selectedProvider) {
    const envKey = target.providerId === "primary" ? "AI_API_KEY" : "ARK_API_KEY";
    return NextResponse.json(
      {
        success: false,
        message:
          `AI 未配置：当前“生成大纲”配置使用 ${target.providerId}，但未检测到 ${envKey}。请在 web/.env 或 web/.env.local 中配置后重启，或到后台“AI 模型配置”切换线路。`,
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

  const isAdmin = isAdminEmail(user.email);
  const uiConfig = await getCreateUiConfig();
  const genreMeta = uiConfig.genres.find((item) => item.id === parsed.data.genre);
  if (!genreMeta) {
    return NextResponse.json(
      { success: false, message: "小说类型无效，请刷新页面后重试。" },
      { status: 400 },
    );
  }

  const genreLabel =
    genreMeta.id === "custom" && parsed.data.customGenreLabel?.trim()
      ? parsed.data.customGenreLabel.trim()
      : genreMeta.name;

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
  const platformMeta = platformId ? uiConfig.platforms.find((item) => item.id === platformId) : null;
  const platformText = platformMeta
    ? `${platformMeta.label}${platformMeta.promptHint ? `（${platformMeta.promptHint}）` : ""}`
    : platformId;

  const dnaBookTitleRaw = parsed.data.dnaBookTitle?.trim();
  const dnaBookTitle = isAdmin && dnaBookTitleRaw ? dnaBookTitleRaw : null;

  const dnaIdRaw = parsed.data.dna?.trim();
  const dnaId = isAdmin && !dnaBookTitle ? dnaIdRaw : null;
  const dnaMeta = dnaId ? uiConfig.dnaStyles.find((item) => item.id === dnaId) : null;
  const dnaText = dnaBookTitle
    ? `参考书名：${dnaBookTitle}（只抽象写法与结构，不复刻原作剧情）`
    : dnaMeta
      ? `${dnaMeta.label}${dnaMeta.promptHint ? `（${dnaMeta.promptHint}）` : ""}`
      : null;

  const wordsId = parsed.data.words?.trim();
  const wordsMeta = wordsId ? uiConfig.wordOptions.find((item) => item.id === wordsId) : null;
  const wordsText = wordsMeta ? wordsMeta.label : wordsId;

  const webSources = dnaBookTitle && isAdmin ? await researchBookFromWeb(dnaBookTitle) : [];

  const systemPrompt = buildOutlineSystemPrompt();
  const userPrompt = buildOutlineUserPrompt({
    genreLabel,
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

  const first = await callAiText({
    providers,
    messages,
    temperature: 0.78,
    maxTokens: 4200,
    attempts: 3,
    preferredProviderId: target.providerId,
  });

  await logAiUsage({ userId: user.id, action: "outline_generate", result: first });

  if (!first.ok || !first.text) {
    const upstreamMessage = first.upstreamMessage;

    return NextResponse.json(
      {
        success: false,
        message:
          first.status === 401
            ? "AI 服务鉴权失败，请检查 AI_API_KEY / ARK_API_KEY。"
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

  let content = first.text;
  let storyRaw = extractJson(content);

  if (!storyRaw) {
    const second = await callAiText({
      providers,
      preferredProviderId: first.providerId,
      messages: [
        ...messages,
        { role: "assistant", content },
        {
          role: "user",
          content:
            "上一次输出不是合法 JSON。请严格只输出 JSON 对象，且必须符合 schema，不能包含任何多余文字。",
        },
      ],
      temperature: 0.5,
      maxTokens: 4200,
      attempts: 2,
    });

    await logAiUsage({
      userId: user.id,
      action: "outline_generate_retry",
      result: second,
    });

    if (second.ok && second.text) {
      content = second.text;
      storyRaw = extractJson(second.text);
    }
  }

  const validated = storyOutlineSchema.safeParse(storyRaw);
  if (!validated.success) {
    return NextResponse.json(
      { success: false, message: "大纲解析失败，请点击“重新生成”重试。" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    success: true,
    message: "大纲生成成功。",
    data: { story: normalizeStoryOutline(validated.data) },
  });
}

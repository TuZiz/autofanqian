import { NextResponse } from "next/server";
import { z } from "zod";

import {
  buildIdeaExistingIdeaPrompt,
  buildIdeaSystemPrompt,
  buildIdeaUserPrompt,
} from "@/lib/ai/idea-prompt";
import { logAiUsage } from "@/lib/ai/usage-log";
import { callAiText, getAiProvidersFromEnv } from "@/lib/ai/upstream-text";
import { isAdminEmail } from "@/lib/auth/admin";
import { getSessionUserId } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/service";
import { getAiModelConfig } from "@/lib/config/ai-model";
import { getCreateUiConfig } from "@/lib/config/create-ui";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const requestSchema = z.object({
  genre: z.string().min(1).max(64),
  customGenreLabel: z.string().max(80).optional(),
  tags: z.array(z.string()).max(12).optional(),
  platform: z.string().optional(),
  dna: z.string().optional(),
  dnaBookTitle: z.string().max(120).optional(),
  words: z.string().optional(),
  existingIdea: z.string().optional(),
});

function nonWhitespaceLength(text: string) {
  return text.replace(/\s/g, "").length;
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

  const providersFromEnv = getAiProvidersFromEnv();
  const aiModelConfig = await getAiModelConfig();
  const existingIdeaDraft = parsed.data.existingIdea?.trim();
  const target = existingIdeaDraft ? aiModelConfig.regenerateAll : aiModelConfig.ideaGenerate;

  const selectedProvider = providersFromEnv.find(
    (provider) => provider.id === target.providerId,
  );

  if (!selectedProvider) {
    const envKey = target.providerId === "primary" ? "AI_API_KEY" : "ARK_API_KEY";
    return NextResponse.json(
      {
        success: false,
        message:
          `AI 未配置：当前“生成创意”配置使用 ${target.providerId}，但未检测到 ${envKey}。请在 web/.env 或 web/.env.local 中配置后重启，或到后台“AI 模型配置”切换线路。`,
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

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, message: "未登录或登录已失效，请先登录。" },
      { status: 401 },
    );
  }

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
  const isCustomGenre = genreMeta.id === "custom";
  const minIdeaChars = isCustomGenre ? 900 : 420;
  const maxIdeaChars = isCustomGenre ? 1600 : 1500;

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

  const dnaBookTitle = isAdmin ? parsed.data.dnaBookTitle?.trim() : undefined;
  const dnaId = isAdmin ? parsed.data.dna?.trim() : undefined;
  const dnaMeta = dnaId ? uiConfig.dnaStyles.find((item) => item.id === dnaId) : null;
  const dnaText = dnaBookTitle
    ? `参考书名：${dnaBookTitle}（只抽象写法与结构，不复刻原作剧情）`
    : dnaMeta
      ? `${dnaMeta.label}${dnaMeta.promptHint ? `（${dnaMeta.promptHint}）` : ""}`
      : dnaId;

  const wordsId = parsed.data.words?.trim();
  const wordsMeta = wordsId ? uiConfig.wordOptions.find((item) => item.id === wordsId) : null;
  const wordsText = wordsMeta ? wordsMeta.label : wordsId;

  const systemPrompt = buildIdeaSystemPrompt({
    minChars: minIdeaChars,
    maxChars: maxIdeaChars,
  });
  const userPrompt = buildIdeaUserPrompt({
    genre: genreMeta.id,
    genreLabel,
    tags: effectiveTags.length ? effectiveTags : undefined,
    platform: platformText,
    dna: dnaText,
    words: wordsText,
    existingIdea: parsed.data.existingIdea,
    minChars: minIdeaChars,
    maxChars: maxIdeaChars,
  });

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> =
    [{ role: "system", content: systemPrompt }];

  if (existingIdeaDraft) {
    messages.push({ role: "user", content: buildIdeaExistingIdeaPrompt(existingIdeaDraft) });
  }

  messages.push({ role: "user", content: userPrompt });

  const first = await callAiText({
    providers,
    messages,
    temperature: 0.8,
    maxTokens: isCustomGenre ? 1500 : 1200,
    attempts: 3,
    preferredProviderId: target.providerId,
  });

  await logAiUsage({ userId: user.id, action: "idea_generate", result: first });

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
                : typeof upstreamMessage === "string"
                  ? `AI 服务调用失败：${upstreamMessage}${first.status ? `（HTTP ${first.status}）` : ""}`
                  : "AI 服务调用失败，请稍后重试。",
      },
      { status: 502 },
    );
  }

  let content = first.text;

  // Enforce minimum length; retry once with an explicit expansion request.
  if (nonWhitespaceLength(content) < minIdeaChars) {
    const second = await callAiText({
      providers,
      preferredProviderId: first.providerId,
      messages: [
        ...messages,
        { role: "assistant", content },
        {
          role: "user",
          content:
            `请在保持逻辑一致的前提下扩写并润色，使内容不少于 ${minIdeaChars} 字，仍然不超过 ${maxIdeaChars} 字。尤其要把类型、标签、人物困境、世界规则、核心冲突、开篇钩子和前 10 章推进写完整。`,
        },
      ],
      temperature: 0.75,
      maxTokens: isCustomGenre ? 1500 : 1200,
      attempts: 2,
    });

    await logAiUsage({ userId: user.id, action: "idea_generate_expand", result: second });

    if (second.ok && second.text) {
      const expandedLength = nonWhitespaceLength(second.text);
      if (expandedLength >= minIdeaChars || expandedLength > nonWhitespaceLength(content)) {
        content = second.text;
      }
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

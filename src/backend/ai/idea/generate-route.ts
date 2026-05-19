import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/auth/api";
import { z } from "zod";

import {
  assertAiQuotaAvailable,
  runWithAiQuotaReservation,
} from "@/lib/ai/quota";
import {
  buildIdeaExistingIdeaPrompt,
  buildIdeaSystemPrompt,
  buildIdeaUserPrompt,
} from "@/lib/ai/idea-prompt";
import {
  buildAiProviderChain,
  callAiText,
  getAiProvidersFromEnv,
  getProviderApiKeyEnvName,
  getReadableAiErrorMessage,
} from "@/lib/ai/upstream-text";
import { isAdminUser } from "@/lib/auth/admin";
import { getSessionUserId } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/service";
import { getAiModelConfig } from "@/lib/config/ai-model";
import { getCreateUiConfig } from "@/lib/config/create-ui";
import { aiZhCN } from "@/lib/copy/ai-zh-cn";
import { assertCanUseAiAction } from "@/lib/membership/guards";
import { prisma } from "@/lib/prisma";
import { assertSameOriginRequest } from "@/lib/security/origin";

export const runtime = "nodejs";

const PUBLIC_AI_UNAVAILABLE_MESSAGE = "AI 服务暂不可用，请联系管理员。";

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

function normalizeIdeaOutput(raw: string) {
  return raw
    .replace(/\r/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^[ \t]*[#>*-]+\s*/gm, "")
    .replace(/^[ \t]*(标签|卖点|看点|亮点|核心设定|核心看点|故事梗概|创意简介|简介|正文)[：:]\s*/gim, "")
    .replace(/^[ \t]*\d+[.)、]\s*/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function fieldErrorsFromZod(error: z.ZodError) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] ? String(issue.path[0]) : "body";
    fieldErrors[key] = fieldErrors[key] ?? [];
    fieldErrors[key].push(issue.message);
  }
  return fieldErrors;
}

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
  } catch (error) {
    return errorResponse(error);
  }

  const rawBody = await request.json().catch(() => null);
  if (!rawBody) {
    return NextResponse.json(
      { success: false, message: "请求格式错误，无法解析提交的数据。" },
      { status: 400 },
    );
  }

  const parsed = requestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: "请求参数校验失败，请检查输入内容。",
        fieldErrors: fieldErrorsFromZod(parsed.error),
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

  try {
    await assertAiQuotaAvailable(user);
    await assertCanUseAiAction(user, "idea_generate");
  } catch (error) {
    return errorResponse(error);
  }

  const isAdmin = isAdminUser(user);
  const aiModelConfig = await getAiModelConfig();
  const existingIdeaDraft = parsed.data.existingIdea?.trim();
  const target = existingIdeaDraft ? aiModelConfig.regenerateAll : aiModelConfig.ideaGenerate;
  const providers = buildAiProviderChain({
    providers: getAiProvidersFromEnv(),
    preferredProviderId: target.providerId,
    overrideModel: target.model,
  });

  if (!providers.length) {
    const envKey = getProviderApiKeyEnvName(target.providerId);
    console.warn("AI idea generation is not configured", {
      routeId: target.providerId,
      missingEnv: envKey,
    });
    return NextResponse.json(
      {
        success: false,
        message: isAdmin
          ? `AI 未配置：当前生成创意线路缺少 ${envKey}，请到后台 AI 模型配置检查。`
          : PUBLIC_AI_UNAVAILABLE_MESSAGE,
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
    ? `参考书名：${dnaBookTitle}（只抽象写法与结构，不复制原作剧情）`
    : dnaMeta
      ? `${dnaMeta.label}${dnaMeta.promptHint ? `（${dnaMeta.promptHint}）` : ""}`
      : dnaId;
  const wordsId = parsed.data.words?.trim();
  const wordsMeta = wordsId ? uiConfig.wordOptions.find((item) => item.id === wordsId) : null;

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    {
      role: "system",
      content: buildIdeaSystemPrompt({
        minChars: minIdeaChars,
        maxChars: maxIdeaChars,
      }),
    },
  ];

  if (existingIdeaDraft) {
    messages.push({ role: "user", content: buildIdeaExistingIdeaPrompt(existingIdeaDraft) });
  }

  messages.push({
    role: "user",
    content: buildIdeaUserPrompt({
      genre: genreMeta.id,
      genreLabel,
      tags: effectiveTags.length ? effectiveTags : undefined,
      platform: platformText,
      dna: dnaText,
      words: wordsMeta ? wordsMeta.label : wordsId,
      existingIdea: parsed.data.existingIdea,
      minChars: minIdeaChars,
      maxChars: maxIdeaChars,
    }),
  });

  const first = await runWithAiQuotaReservation(user, "idea_generate", () =>
    callAiText({
    providers,
    messages,
    temperature: 0.8,
    maxTokens: isCustomGenre ? 1500 : 1200,
    attempts: 1,
      preferredProviderId: target.providerId,
    }),
  );

  if (!first.ok || !first.text) {
    console.warn("AI idea generation failed", {
      status: first.status,
      routeId: first.routeId,
      providerId: first.providerId,
      modelUsed: first.modelUsed,
    });
    return NextResponse.json(
      {
        success: false,
        message: isAdmin
          ? getReadableAiErrorMessage(first, aiZhCN.idea.generateFailed)
          : PUBLIC_AI_UNAVAILABLE_MESSAGE,
      },
      { status: 502 },
    );
  }

  let content = normalizeIdeaOutput(first.text);
  if (nonWhitespaceLength(content) < minIdeaChars) {
    try {
      await assertAiQuotaAvailable(user);
    } catch (error) {
      return errorResponse(error);
    }

    const second = await runWithAiQuotaReservation(user, "idea_generate_expand", () =>
      callAiText({
      providers,
      preferredProviderId: first.providerId,
      messages: [
        ...messages,
        { role: "assistant", content },
        {
          role: "user",
          content: `请在保持逻辑一致的前提下扩写并润色，使内容不少于 ${minIdeaChars} 字，仍然不超过 ${maxIdeaChars} 字。`,
        },
      ],
      temperature: 0.75,
      maxTokens: isCustomGenre ? 1500 : 1200,
        attempts: 1,
      }),
    );

    if (second.ok && second.text) {
      const expanded = normalizeIdeaOutput(second.text);
      if (nonWhitespaceLength(expanded) > nonWhitespaceLength(content)) {
        content = expanded;
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
    message: aiZhCN.idea.success,
    data: { idea: content },
  });
}

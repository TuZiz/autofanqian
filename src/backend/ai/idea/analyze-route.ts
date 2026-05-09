import { NextResponse } from "next/server";
import { z } from "zod";

import { assertAiQuotaAvailable } from "@/lib/ai/quota";
import {
  buildIdeaAnalysisSystemPrompt,
  buildIdeaAnalysisUserPrompt,
} from "@/lib/ai/idea-analysis-prompt";
import { logAiUsage } from "@/lib/ai/usage-log";
import {
  buildAiProviderChain,
  callAiText,
  getAiProvidersFromEnv,
  getProviderApiKeyEnvName,
  getReadableAiErrorMessage,
} from "@/lib/ai/upstream-text";
import { isAdminUser } from "@/lib/auth/admin";
import { getCurrentUser } from "@/lib/auth/service";
import { getAiModelConfig } from "@/lib/config/ai-model";
import { aiZhCN } from "@/lib/copy/ai-zh-cn";
import { getCreateUiConfig } from "@/lib/config/create-ui";

export const runtime = "nodejs";

const requestSchema = z.object({
  genre: z.string().min(1).max(64),
  customGenreLabel: z.string().max(80).optional(),
  customDetails: z.string().max(1200).optional(),
  idea: z.string().min(10).max(2000),
  tags: z.array(z.string()).max(12).optional(),
  platform: z.string().optional(),
  dnaBookTitle: z.string().max(120).optional(),
  words: z.string().optional(),
});

const analysisSchema = z.object({
  oneLinePitch: z.string().min(1).max(120),
  recommendedTitles: z.array(z.string().min(1).max(40)).min(2).max(6),
  keyPhrases: z.array(z.string().min(1).max(40)).max(8).default([]),
  coreSellingPoints: z.array(z.string().min(1).max(120)).min(2).max(8),
  targetReaders: z.string().min(1).max(160),
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

  const providers = getAiProvidersFromEnv();
  const aiModelConfig = await getAiModelConfig();
  const target = aiModelConfig.ideaAnalyze;

  const analysisProviders = buildAiProviderChain({
    providers,
    preferredProviderId: target.providerId,
    overrideModel: target.model,
  });

  if (!analysisProviders.length) {
    const envKey = getProviderApiKeyEnvName(target.providerId);
    return NextResponse.json(
      {
        success: false,
        message: `AI 未配置：当前“创意分析”配置使用 ${target.providerId}，但未检测到 ${envKey}。请在 web/.env 或 web/.env.local 中配置后重启，或到后台“AI 模型配置”切换线路。`,
      },
      { status: 500 },
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, message: "未登录或登录已失效，请先登录。" },
      { status: 401 },
    );
  }
  await assertAiQuotaAvailable(user);

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
  const customDetails = parsed.data.customDetails?.trim();

  const effectiveTags = (parsed.data.tags?.length ? parsed.data.tags : genreMeta.tags)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);

  const platformId = parsed.data.platform?.trim();
  const platformMeta = platformId ? uiConfig.platforms.find((item) => item.id === platformId) : null;
  const platformText = platformMeta
    ? `${platformMeta.label}${platformMeta.promptHint ? `（${platformMeta.promptHint}）` : ""}`
    : platformId;

  const wordsId = parsed.data.words?.trim();
  const wordsMeta = wordsId ? uiConfig.wordOptions.find((item) => item.id === wordsId) : null;
  const wordsText = wordsMeta ? wordsMeta.label : wordsId;

  const isAdmin = isAdminUser(user);
  const dnaBookTitle = isAdmin ? parsed.data.dnaBookTitle?.trim() : undefined;
  const dnaText = dnaBookTitle
    ? `参考书名：${dnaBookTitle}（只抽象写法与结构，不复刻原作剧情）`
    : undefined;

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> =
    [
      { role: "system", content: buildIdeaAnalysisSystemPrompt() },
      {
        role: "user",
        content: buildIdeaAnalysisUserPrompt({
          genreLabel,
          tags: effectiveTags.length ? effectiveTags : undefined,
          platform: platformText,
          dna: dnaText,
          words: wordsText,
          idea:
            genreMeta.id === "custom" && customDetails
              ? `${parsed.data.idea}\n\n【自定义补充设定】\n${customDetails}`
              : parsed.data.idea,
        }),
      },
    ];

  const first = await callAiText({
    providers: analysisProviders,
    preferredProviderId: target.providerId,
    messages,
    temperature: 0.35,
    maxTokens: 650,
    attempts: 1,
  });

  await logAiUsage({ userId: user.id, action: "idea_analyze", result: first });

  if (!first.ok || !first.text) {
    return NextResponse.json(
      {
        success: false,
        message: getReadableAiErrorMessage(first, aiZhCN.idea.analyzeFailed),
      },
      { status: 502 },
    );
  }

  let content = first.text;
  let analysisRaw = extractJson(content);

  if (!analysisRaw) {
    const second = await callAiText({
      providers: analysisProviders,
      messages: [
        ...messages,
        { role: "assistant", content },
        {
          role: "user",
          content:
            "上一次输出不是合法 JSON。请严格只输出 JSON，且必须符合 schema，不要任何多余文字。",
        },
      ],
      temperature: 0.2,
      maxTokens: 650,
      attempts: 1,
    });

    await logAiUsage({ userId: user.id, action: "idea_analyze_retry", result: second });

    if (second.ok && second.text) {
      content = second.text;
      analysisRaw = extractJson(second.text);
    }
  }

  const validated = analysisSchema.safeParse(analysisRaw);
  if (!validated.success) {
    return NextResponse.json(
      { success: false, message: aiZhCN.idea.parseFailed },
      { status: 502 },
    );
  }

  return NextResponse.json({
    success: true,
    message: aiZhCN.idea.analyzeSuccess,
    data: { analysis: validated.data },
  });
}

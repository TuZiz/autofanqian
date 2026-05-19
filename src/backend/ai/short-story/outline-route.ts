import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { assertAiQuotaAvailable } from "@/lib/ai/quota";
import {
  buildShortStoryOutlineSystemPrompt,
  buildShortStoryOutlineUserPrompt,
} from "@/lib/ai/short-story-outline-prompt";
import { logAiUsage } from "@/lib/ai/usage-log";
import {
  buildAiProviderChain,
  callAiText,
  getAiProvidersFromEnv,
  getProviderApiKeyEnvName,
  getReadableAiErrorMessage,
} from "@/lib/ai/upstream-text";
import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import { getCurrentUser } from "@/lib/auth/service";
import { getAiModelConfig } from "@/lib/config/ai-model";
import { aiZhCN } from "@/lib/copy/ai-zh-cn";
import {
  normalizeShortStoryOutline,
  shortStoryOutlineSchema,
} from "@/lib/create/short-story-outline-schema";
import { assertCanUseAiAction } from "@/lib/membership/guards";
import { assertSameOriginRequest } from "@/lib/security/origin";
import { shortStoryInputSchema } from "@/shared/schemas/short-story";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extractJson(text: string) {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) return null;

  try {
    return JSON.parse(withoutFence.slice(start, end + 1)) as unknown;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);

    const user = await getCurrentUser();
    if (!user) {
      throw new AuthApiError(401, "未登录或登录已失效，请先登录。");
    }

    const input = await parseJsonBody(request, shortStoryInputSchema);
    await assertAiQuotaAvailable(user);
    await assertCanUseAiAction(user, "short_story_outline_generate");

    const aiModelConfig = await getAiModelConfig();
    const target = aiModelConfig.outlineGenerate;
    const providers = buildAiProviderChain({
      providers: getAiProvidersFromEnv(),
      preferredProviderId: target.providerId,
      overrideModel: target.model,
    });

    if (!providers.length) {
      const envKey = getProviderApiKeyEnvName(target.providerId);
      throw new AuthApiError(
        500,
        `AI 未配置：当前“短篇大纲”配置使用 ${target.providerId}，但未检测到 ${envKey}。请在 web/.env 或 web/.env.local 中配置后重启，或到后台“AI 模型配置”切换线路。`,
      );
    }

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: buildShortStoryOutlineSystemPrompt() },
      { role: "user", content: buildShortStoryOutlineUserPrompt(input) },
    ];

    const first = await callAiText({
      providers,
      messages,
      temperature: 0.78,
      maxTokens: 3200,
      attempts: 1,
      preferredProviderId: target.providerId,
    });

    await logAiUsage({
      userId: user.id,
      action: "short_story_outline_generate",
      result: first,
    });

    if (!first.ok || !first.text) {
      return NextResponse.json(
        {
          success: false,
          message: getReadableAiErrorMessage(first, "短篇大纲生成失败，请稍后重试。"),
        },
        { status: 502 },
      );
    }

    let rawOutline = extractJson(first.text);

    if (!rawOutline) {
      const retry = await callAiText({
        providers,
        preferredProviderId: first.providerId,
        messages: [
          ...messages,
          { role: "assistant", content: first.text },
          {
            role: "user",
            content:
              "上一次输出不是合法 JSON。请严格只输出 JSON 对象，不能包含 Markdown、代码块或任何说明文字。",
          },
        ],
        temperature: 0.42,
        maxTokens: 3200,
        attempts: 1,
      });

      await logAiUsage({
        userId: user.id,
        action: "short_story_outline_generate",
        result: retry,
      });

      if (retry.ok && retry.text) {
        rawOutline = extractJson(retry.text);
      }
    }

    const parsedOutline = shortStoryOutlineSchema.safeParse(rawOutline);
    if (!parsedOutline.success) {
      return NextResponse.json(
        { success: false, message: "短篇结构解析失败，请点击重新生成。" },
        { status: 502 },
      );
    }

    const outline = normalizeShortStoryOutline(parsedOutline.data);
    return successResponse({ outline }, { message: aiZhCN.outline.success });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      return errorResponse(
        new AuthApiError(
          500,
          "数据库未迁移完成：请先运行 start-dev.cmd 或执行 prisma migrate deploy。",
        ),
      );
    }

    return errorResponse(error);
  }
}

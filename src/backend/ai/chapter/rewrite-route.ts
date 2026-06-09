import { NextResponse } from "next/server";
import { z } from "zod";

import {
  assertAiQuotaAvailable,
  runWithAiQuotaReservation,
} from "@/lib/ai/quota";
import {
  buildAiProviderChain,
  callAiText,
  getAiProvidersFromEnv,
  getReadableAiErrorMessage,
} from "@/lib/ai/upstream-text";
import { getActivePromptTemplate } from "@/lib/ai/prompt-templates";
import { aiZhCN } from "@/lib/copy/ai-zh-cn";
import { AuthApiError } from "@/lib/auth/errors";
import { getAiModelConfig } from "@/lib/config/ai-model";
import { prisma } from "@/lib/prisma";
import { requireWorkAccess } from "@/lib/works/access";
import { assertSameOriginRequest } from "@/lib/security/origin";
import { assertCanUseAiAction } from "@/lib/membership/guards";
import { AI_ACTIONS } from "@/shared/ai-actions";

export const runtime = "nodejs";

const rewriteModeSchema = z.enum([
  "polish",
  "expand",
  "compress",
  "add_conflict",
  "add_emotion",
  "short_drama",
  "fanqie_style",
  "xiaohongshu_style",
  "爽文化",
  "细腻化",
  "去 AI 味",
  "增强开头钩子",
  "增强结尾追读感",
  "对话自然化",
  "logic_check",
]);
const legacyRewriteActionSchema = z.enum(["polish", "expand", "compress", "conflict", "logic_check"]);

const bodySchema = z.object({
  workId: z.string().min(1).max(64),
  chapterIndex: z.coerce.number().int().min(1).max(9999).optional(),
  index: z.coerce.number().int().min(1).max(9999).optional(),
  rewriteMode: rewriteModeSchema.optional(),
  action: legacyRewriteActionSchema.optional(),
  extraPrompt: z.string().trim().max(2000).optional().nullable(),
  selectedText: z.string().max(80_000).optional().nullable(),
}).superRefine((body, ctx) => {
  if (!body.rewriteMode && !body.action) {
    ctx.addIssue({
      code: "custom",
      path: ["rewriteMode"],
      message: "请选择改写模式。",
    });
  }
  if (!body.chapterIndex && !body.index) {
    ctx.addIssue({
      code: "custom",
      path: ["chapterIndex"],
      message: "请选择章节。",
    });
  }
});

type RewriteAction = z.infer<typeof rewriteModeSchema>;

function normalizeRewriteMode(body: z.infer<typeof bodySchema>): RewriteAction {
  if (body.rewriteMode) return body.rewriteMode;
  if (body.action === "conflict") return "add_conflict";
  return (body.action ?? "polish") as RewriteAction;
}

const actionLabel: Record<RewriteAction, string> = {
  polish: "润色本章",
  expand: "扩写本章",
  compress: "压缩本章",
  add_conflict: "增强冲突",
  add_emotion: "增强情绪",
  short_drama: "短剧化改写",
  fanqie_style: "番茄风改写",
  xiaohongshu_style: "小红书风改写",
  爽文化: "爽文化改写",
  细腻化: "细腻化改写",
  "去 AI 味": "去 AI 味",
  增强开头钩子: "增强开头钩子",
  增强结尾追读感: "增强结尾追读感",
  对话自然化: "对话自然化",
  logic_check: "检查逻辑矛盾",
};

function countWords(text: string) {
  return text.replace(/\s+/g, "").length;
}

function buildRewritePrompt(params: {
  action: RewriteAction;
  title: string | null;
  content: string;
  extraPrompt?: string | null;
  selectedText?: string | null;
}) {
  const instruction =
    params.action === "logic_check"
      ? "只输出本章逻辑矛盾、人物动机问题、上下文衔接风险和修改建议，不要改写正文。"
      : "直接输出改写后的正文，不要输出解释、标题、Markdown 或额外字段。";

  const actionRule: Record<RewriteAction, string> = {
    polish: "提升语句流畅度、画面感和节奏，但保持剧情事件不变。",
    expand: "增加场景动作、心理变化和冲突推进，保持主线不偏移。",
    compress: "压缩重复表达和拖慢节奏的段落，保留关键剧情。",
    add_conflict: "增强人物冲突、外部压力和章末钩子，避免生硬反转。",
    add_emotion: "强化人物情绪、心理变化和情绪落点，让读者更容易共情。",
    short_drama: "改成短剧风表达：对白更密、节奏更快、冲突更直给、反转更清晰。",
    fanqie_style: "改成番茄小说风格：钩子更强、爽点更明确、句子更顺滑、推进更快。",
    xiaohongshu_style:
      "改成小红书故事风：表达更口语，情绪更明显，段落更短，更有共鸣感；适合短篇故事/情绪故事，但不要写成营销文、种草文或带货口吻。",
    爽文化: "强化主角主动性、压迫后的反击、清晰正反馈和读者爽点，但不要无脑开挂。",
    细腻化: "增加感官细节、微表情、心理波动和情绪递进，让人物反应更自然。",
    "去 AI 味": "去掉模板化转折、空泛抒情、重复排比和过度总结，让语言更像作者手写。",
    增强开头钩子: "优先改写开头段落，前三百字内抛出悬念、压力或强情绪，不改变后文事实。",
    增强结尾追读感: "优先改写结尾段落，留下未完成问题、情绪余波或下一章期待，不生硬断章。",
    对话自然化: "优化对白，使人物说话更符合身份和情绪，减少解释型台词和旁白替代。",
    logic_check: "检查时间顺序、人物状态、动机、场景连续性和伏笔矛盾。",
  };
  const rewriteTarget = params.selectedText?.trim() || params.content;

  return [
    `动作：${actionLabel[params.action]}`,
    `要求：${actionRule[params.action]}`,
    params.selectedText?.trim()
      ? "改写范围：只改写用户选中的文本，不要扩展到未选中的上下文。"
      : "改写范围：整章正文。",
    instruction,
    params.extraPrompt ? `补充要求：${params.extraPrompt}` : "",
    "",
    `章节标题：${params.title || "未命名章节"}`,
    "",
    params.selectedText?.trim() ? "选中文本：" : "原文：",
    rewriteTarget,
    params.selectedText?.trim() ? ["", "整章上下文（仅供理解，不要整体改写）：", params.content].join("\n") : "",
  ].filter(Boolean).join("\n");
}

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    const raw = await request.json().catch(() => null as unknown);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      throw new AuthApiError(400, "请求参数校验失败，请检查输入内容。");
    }

    const body = parsed.data;
    const rewriteMode = normalizeRewriteMode(body);
    const chapterIndex = body.chapterIndex ?? body.index ?? 1;
    const { user, work } = await requireWorkAccess(body.workId);
    const chapter = await prisma.chapter.findUnique({
      where: { workId_index: { workId: work.id, index: chapterIndex } },
      select: {
        id: true,
        title: true,
        content: true,
        wordCount: true,
        deletedAt: true,
      },
    });

    if (!chapter || chapter.deletedAt) {
      throw new AuthApiError(404, "章节不存在或已被删除。");
    }

    if (!chapter.content.trim()) {
      throw new AuthApiError(422, "当前章节正文为空，无法执行改写。");
    }

    await assertAiQuotaAvailable(user);
    await assertCanUseAiAction(user, AI_ACTIONS.chapterRewrite);

    const providersFromEnv = await getAiProvidersFromEnv();
    const aiModelConfig = await getAiModelConfig();
    const target = aiModelConfig.chapterRewrite;
    const routeId = target.providerId;
    const providers = buildAiProviderChain({
      providers: providersFromEnv,
      preferredProviderId: routeId,
      overrideModel: target.model,
    });

    if (!providers.length) {
      throw new AuthApiError(500, "AI 未配置，请先在后台配置可用模型。");
    }
    const primaryProvider = providers[0];
    const prompt = buildRewritePrompt({
      action: rewriteMode,
      title: chapter.title,
      content: chapter.content,
      extraPrompt: body.extraPrompt,
      selectedText: body.selectedText,
    });
    const systemTemplate = await getActivePromptTemplate(
      "chapter.rewrite",
      "你是中文小说编辑，负责在不破坏上下文的前提下改写、润色或检查正文。",
    );

    const generationJob = await prisma.generationJob.create({
      data: {
        novelId: work.id,
        userId: user.id,
        workId: work.id,
        chapterId: chapter.id,
        chapterIndex,
        action: AI_ACTIONS.chapterRewrite,
        jobType: AI_ACTIONS.chapterRewrite,
        status: "running",
        routeId,
        providerId: primaryProvider.id,
        modelUsed: primaryProvider.model,
        promptTemplateKey: "chapter.rewrite",
        promptTemplateVersion: systemTemplate.version || null,
        promptSnapshot: prompt.slice(0, 20000),
        startedAt: new Date(),
        heartbeatAt: new Date(),
      },
    });

    const usageAction = AI_ACTIONS.chapterRewrite;
    const result = await runWithAiQuotaReservation(user, usageAction, () =>
      callAiText({
      providers,
      routeId,
      preferredProviderId: primaryProvider.id,
      messages: [
        { role: "system", content: systemTemplate.content },
        { role: "user", content: prompt },
      ],
      temperature: rewriteMode === "logic_check" ? 0.3 : 0.75,
        maxTokens: rewriteMode === "logic_check" ? 1800 : 5200,
      }),
    );

    if (!result.ok || !result.text) {
      await prisma.generationJob.update({
        where: { id: generationJob.id },
        data: {
          status: "failed",
          routeId,
          error: result.upstreamMessage || "AI 改写失败",
          errorMessage: result.upstreamMessage || "AI 改写失败",
          providerId: result.providerId ?? primaryProvider.id,
          modelUsed: result.modelUsed ?? primaryProvider.model,
          inputTokens: result.usage?.inputTokens ?? null,
          outputTokens: result.usage?.outputTokens ?? null,
          totalTokens: result.usage?.totalTokens ?? null,
          durationMs: result.durationMs ?? null,
          finishedAt: new Date(),
          heartbeatAt: new Date(),
          completedAt: new Date(),
        },
      });
      throw new AuthApiError(502, getReadableAiErrorMessage(result, aiZhCN.chapterRewrite.failed));
    }

    const nextText = result.text.trim().slice(0, 200_000);
    const resultSummary =
      rewriteMode === "logic_check"
        ? result.text.slice(0, 2000)
        : `${actionLabel[rewriteMode]}预览完成，${countWords(nextText)}字。`;

    await prisma.generationJob.update({
      where: { id: generationJob.id },
      data: {
        status: "succeeded",
        routeId,
        resultSummary,
        providerId: result.providerId ?? primaryProvider.id,
        modelUsed: result.modelUsed ?? primaryProvider.model,
        inputTokens: result.usage?.inputTokens ?? null,
        outputTokens: result.usage?.outputTokens ?? null,
        totalTokens: result.usage?.totalTokens ?? null,
        durationMs: result.durationMs ?? null,
        finishedAt: new Date(),
        heartbeatAt: new Date(),
        completedAt: new Date(),
      },
    });

    if (rewriteMode === "logic_check") {
      return NextResponse.json({
        success: true,
        message: aiZhCN.chapterRewrite.logicDone,
        data: { report: nextText },
      });
    }

    return NextResponse.json({
        success: true,
        message: aiZhCN.chapterRewrite.previewDone,
        data: {
        action: rewriteMode,
        rewriteMode,
        preview: nextText,
        rewrittenText: nextText,
        originalWordCount: chapter.wordCount,
        previewWordCount: countWords(nextText),
      },
    });
  } catch (error) {
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

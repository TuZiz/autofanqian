import { queueChapterContextExtraction } from "@/lib/ai/chapter-context-extract";
import {
  combineTextResultUsage,
  repairChapterLengthIfNeeded,
} from "@/lib/ai/chapter-length-repair";
import {
  finalizeGeneratedDraft,
  prepareChapterGeneration,
  serializeGeneratedChapter,
  type ChapterGenerateInput,
} from "@/lib/ai/chapter-generate-shared";
import {
  beginChapterGenerationLock,
  endChapterGenerationLock,
} from "@/lib/ai/chapter-generation-lock";
import {
  assertAiQuotaAvailable,
  runWithAiQuotaReservation,
} from "@/lib/ai/quota";
import { logAiUsage } from "@/lib/ai/usage-log";
import {
  buildChapterSmartProviderChain,
  callAiText,
  getReadableAiErrorMessage,
  selectHealthyProviderForChapter,
  type UpstreamProvider,
} from "@/lib/ai/upstream-text";
import { AuthApiError } from "@/lib/auth/errors";
import type { SessionUser } from "@/lib/auth/user";
import { aiZhCN } from "@/lib/copy/ai-zh-cn";
import { prisma } from "@/lib/prisma";
import { createChapterRevisionSnapshot } from "@/lib/workbench/chapter-revisions";

export async function generateChapterForUser(params: {
  input: ChapterGenerateInput;
  providersFromEnv: UpstreamProvider[];
  user: SessionUser;
}) {
  const { input, providersFromEnv, user } = params;
  const prepared = await prepareChapterGeneration({
    user,
    input,
    providersFromEnv,
  });
  const providers = buildChapterSmartProviderChain({
    providers: providersFromEnv,
    overrideModel:
      prepared.routeId === "gpt"
        ? prepared.preferredProvider.model || "gpt-5.5"
        : "gpt-5.5",
  });
  const primaryProvider = providers[0] ?? prepared.preferredProvider;

  const generationLock = beginChapterGenerationLock({
    userId: user.id,
    workId: prepared.work.id,
    index: input.index,
  });

  if (!generationLock.acquired) {
    throw new AuthApiError(409, "该章节正在生成中，请等待生成结束后再操作。");
  }

  try {
    const generationJob = await prisma.generationJob.create({
      data: {
        novelId: prepared.work.id,
        chapterId: prepared.existingChapter?.id ?? null,
        action:
          prepared.generationMode === "regenerate"
            ? "regenerate.all"
            : "chapter.generate",
        status: "running",
        routeId: prepared.routeId,
        providerId: primaryProvider.id,
        modelUsed: primaryProvider.model ?? null,
        promptTemplateKey:
          prepared.generationMode === "regenerate"
            ? "regenerate.all"
            : "chapter.generate",
        promptSnapshot: prepared.promptSnapshot.slice(0, 20000),
      },
    });

    const selected = await selectHealthyProviderForChapter({
      providers,
      routeId: "gpt",
      preferredProviderId: primaryProvider.id,
      reasoningEffort: "low",
    });

    await logAiUsage({
      userId: user.id,
      action: `chapter_generate_${input.index}_probe`,
      result: {
        ok: Boolean(selected.provider),
        status: selected.provider
          ? 200
          : (selected.failures[selected.failures.length - 1]?.status ?? 503),
        routeId: "gpt",
        providerId:
          selected.provider?.id ??
          selected.failures[selected.failures.length - 1]?.providerId,
        modelUsed: selected.provider?.model,
        durationMs:
          selected.probeDurationMs ??
          selected.failures[selected.failures.length - 1]?.durationMs,
        fallbackCount: selected.fallbackCount,
      },
    });

    if (!selected.provider) {
      const lastFailure = selected.failures[selected.failures.length - 1];
      const message = lastFailure?.upstreamMessage ?? "所有正文线路探针都失败了";

      await prisma.generationJob.update({
        where: { id: generationJob.id },
        data: {
          status: "failed",
          routeId: "gpt",
          error: message,
          providerId: lastFailure?.providerId ?? primaryProvider.id,
          modelUsed: null,
          durationMs: lastFailure?.durationMs ?? null,
          completedAt: new Date(),
        },
      });

      throw new AuthApiError(
        502,
        getReadableAiErrorMessage(
          {
            status: lastFailure?.status ?? 503,
            upstreamMessage: message,
          },
          "正文主线路当前都不可用，请稍后重试。",
        ),
      );
    }

    const orderedProviders = [
      selected.provider,
      ...providers.filter((provider) => provider.id !== selected.provider?.id),
    ];
    const result = await runWithAiQuotaReservation(user, "chapter_generate", async () => {
      const generated = await callAiText({
        providers: orderedProviders,
        routeId: "gpt",
        preferredProviderId: selected.provider.id,
        messages: prepared.messages,
        temperature: prepared.temperature,
        maxTokens: prepared.maxTokens,
        attempts: 1,
        reasoningEffort: "low",
      });

      generated.selectedProviderId = selected.provider.id;
      generated.probeDurationMs = selected.probeDurationMs;
      generated.fallbackCount = selected.fallbackCount;
      return generated;
    });

    if (!result.ok || !result.text) {
      await prisma.generationJob.update({
        where: { id: generationJob.id },
        data: {
          status: "failed",
          routeId: "gpt",
          error: result.upstreamMessage || "AI 生成失败",
          providerId: result.providerId ?? selected.provider.id,
          modelUsed: result.modelUsed ?? selected.provider.model ?? null,
          inputTokens: result.usage?.inputTokens ?? null,
          outputTokens: result.usage?.outputTokens ?? null,
          totalTokens: result.usage?.totalTokens ?? null,
          durationMs: result.durationMs ?? null,
          completedAt: new Date(),
        },
      });
      throw new AuthApiError(
        502,
        getReadableAiErrorMessage(result, aiZhCN.chapterGenerate.failed),
      );
    }

    const draft = finalizeGeneratedDraft({
      index: input.index,
      rawText: result.text,
    });
    const lengthRepair = await repairChapterLengthIfNeeded({
      index: input.index,
      draft,
      promptSnapshot: prepared.promptSnapshot,
      providers,
      routeId: prepared.routeId,
      preferredProviderId: primaryProvider.id,
      generationMode: prepared.generationMode,
      workWords: prepared.work.words,
      targetChapters: prepared.work.targetChapters,
      beforeRepairAiCall: () => assertAiQuotaAvailable(user),
      runRepairAiCall: (execute) =>
        runWithAiQuotaReservation(user, "chapter_generate_length_repair", execute),
    });

    if (prepared.existingChapter?.content?.trim()) {
      try {
        await createChapterRevisionSnapshot({
          workId: prepared.work.id,
          index: input.index,
          source: "ai_regenerate",
        });
      } catch (revisionError) {
        console.error("create chapter revision failed", revisionError);
      }
    }

    const chapter = await prisma.chapter.upsert({
      where: { workId_index: { workId: prepared.work.id, index: input.index } },
      create: {
        workId: prepared.work.id,
        index: input.index,
        title: lengthRepair.draft.title,
        content: lengthRepair.draft.content,
        wordCount: lengthRepair.wordCount,
        status: "written",
        details: [],
      },
      update: {
        title: lengthRepair.draft.title,
        content: lengthRepair.draft.content,
        wordCount: lengthRepair.wordCount,
        status: "written",
      },
      select: {
        id: true,
        index: true,
        title: true,
        content: true,
        wordCount: true,
        summary: true,
        chapterOutline: true,
        details: true,
        updatedAt: true,
        createdAt: true,
      },
    });

    const combinedUsage = combineTextResultUsage([result, lengthRepair.repairResult]);

    await prisma.generationJob.update({
      where: { id: generationJob.id },
      data: {
        chapterId: chapter.id,
        status: "success",
        routeId: "gpt",
        providerId: result.providerId ?? selected.provider.id,
        modelUsed: result.modelUsed ?? selected.provider.model ?? null,
        resultSummary: lengthRepair.repairApplied
          ? `已生成第${input.index}章，${lengthRepair.wordCount}字。${lengthRepair.repairNote ?? "已自动校正字数。"}`
          : `已生成第${input.index}章，${lengthRepair.wordCount}字。`,
        inputTokens: combinedUsage.inputTokens,
        outputTokens: combinedUsage.outputTokens,
        totalTokens: combinedUsage.totalTokens,
        durationMs: combinedUsage.durationMs,
        completedAt: new Date(),
      },
    });

    await prisma.generationJob.create({
      data: {
        novelId: prepared.work.id,
        chapterId: chapter.id,
        action: "context.extract",
        status: "queued",
        routeId: prepared.contextExtractRouteId,
        resultSummary: "章节生成后等待后台提取上下文记忆。",
      },
    });

    queueChapterContextExtraction({
      user,
      workId: prepared.work.id,
      chapterId: chapter.id,
      index: input.index,
      trigger: "generate",
      force: true,
    });

    return {
      work: {
        id: prepared.work.id,
        workType: prepared.work.workType,
        title: prepared.work.title,
        tag: prepared.work.tag,
      },
      chapter: {
        ...serializeGeneratedChapter(chapter),
        details: chapter.details ?? [],
      },
    };
  } finally {
    endChapterGenerationLock(generationLock.key);
  }
}

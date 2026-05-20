import { queueChapterContextExtraction } from "@/lib/ai/chapter-context-extract";
import { runChapterConsistencyCheck } from "@/lib/ai/chapter-consistency-check";
import {
  combineTextResultUsage,
  repairChapterLengthIfNeeded,
} from "@/lib/ai/chapter-length-repair";
import {
  buildChapterPlan,
  formatChapterPlanForPrompt,
  type ChapterPlan,
} from "@/lib/ai/chapter-plan";
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
  beginGenerationJob,
  failGenerationJob,
  normalizeGenerationJobSuccessStatus,
} from "@/lib/ai/generation-jobs";
import {
  assertAiQuotaAvailable,
  runWithAiQuotaReservation,
} from "@/lib/ai/quota";
import { logAiUsage } from "@/lib/ai/usage-log";
import { mergeNovelCanonState } from "@/lib/ai/novel-canon-state";
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
import type { WorkTypeValue } from "@/shared/work-type";

type GeneratedChapterResponse = {
  work: {
    id: string;
    workType: WorkTypeValue;
    title: string;
    tag: string;
  };
  chapter: ReturnType<typeof serializeGeneratedChapter> & { details: unknown };
};

function buildMessagesWithPlan(
  prepared: Awaited<ReturnType<typeof prepareChapterGeneration>>,
  generationPlan: ChapterPlan,
) {
  const planBlock = [
    "",
    "【ChapterPlan：必须遵守】",
    formatChapterPlanForPrompt(generationPlan),
  ].join("\n");

  return [
    prepared.messages[0],
    {
      role: "user" as const,
      content: `${prepared.promptSnapshot}${planBlock}`,
    },
  ];
}

export async function getCompletedChapterGenerationResult(params: {
  userId: string;
  workId: string;
  index: number;
  action?: string | string[] | null;
  idempotencyKey?: string | null;
}): Promise<GeneratedChapterResponse | null> {
  const idempotencyKey = params.idempotencyKey?.trim();
  if (!idempotencyKey) return null;
  const actions =
    typeof params.action === "string"
      ? [params.action]
      : params.action?.length
        ? params.action
        : ["chapter.generate", "regenerate.all"];

  const generationJob = await prisma.generationJob.findFirst({
    where: {
      userId: params.userId,
      action: { in: actions },
      idempotencyKey,
    },
    select: {
      status: true,
      novelId: true,
      chapterId: true,
      chapterIndex: true,
    },
  });

  if (
    !generationJob ||
    normalizeGenerationJobSuccessStatus(generationJob.status) !== "succeeded" ||
    generationJob.novelId !== params.workId ||
    generationJob.chapterIndex !== params.index
  ) {
    return null;
  }

  const work = await prisma.work.findFirst({
    where: { id: params.workId, deletedAt: null },
    select: { id: true, workType: true, title: true, tag: true },
  });
  if (!work) return null;

  const chapter = await prisma.chapter.findFirst({
    where: {
      workId: params.workId,
      index: params.index,
      id: generationJob.chapterId ?? undefined,
      deletedAt: null,
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
  if (!chapter) return null;

  return {
    work,
    chapter: {
      ...serializeGeneratedChapter(chapter),
      details: chapter.details ?? [],
    },
  };
}

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

  let generationJobFinalized = false;
  let generationJobId: string | null = null;

  try {
    const generationAction =
      prepared.generationMode === "regenerate"
        ? "regenerate.all"
        : "chapter.generate";
    const generationJobResult = await beginGenerationJob({
      userId: user.id,
      workId: prepared.work.id,
      chapterId: prepared.existingChapter?.id ?? null,
      chapterIndex: input.index,
      action: generationAction,
      idempotencyKey: input.idempotencyKey ?? null,
      routeId: prepared.routeId,
      providerId: primaryProvider.id,
      modelUsed: primaryProvider.model ?? null,
      promptTemplateKey:
        prepared.generationMode === "regenerate"
          ? "regenerate.all"
          : "chapter.generate",
      promptSnapshot: prepared.promptSnapshot,
    });
    if (generationJobResult.kind === "completed") {
      const completed = await getCompletedChapterGenerationResult({
        userId: user.id,
        workId: prepared.work.id,
        index: input.index,
        action: generationAction,
        idempotencyKey: input.idempotencyKey ?? null,
      });
      if (completed) return completed;
      throw new AuthApiError(409, "该生成请求已经处理过，请刷新章节查看最新结果。");
    }

    const generationJob = generationJobResult.job;
    generationJobId = generationJob.id;

    const selected = await selectHealthyProviderForChapter({
      providers,
      routeId: "gpt",
      preferredProviderId: primaryProvider.id,
      reasoningEffort: "low",
    });

    await logAiUsage({
      userId: null,
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
          activeLockKey: null,
          routeId: "gpt",
          error: message,
          errorMessage: message,
          providerId: lastFailure?.providerId ?? primaryProvider.id,
          modelUsed: null,
          durationMs: lastFailure?.durationMs ?? null,
          finishedAt: new Date(),
          heartbeatAt: new Date(),
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
    const generationPlan = await buildChapterPlan({
      mode: prepared.mode,
      chapterIndex: input.index,
      assembledContext: prepared.assembledContext,
      userId: user.id,
      workId: prepared.work.id,
      chapterId: prepared.existingChapter?.id ?? null,
      providers: orderedProviders,
      routeId: prepared.routeId,
      preferredProviderId: selected.provider.id,
      continuityWarnings: prepared.continuityWarnings,
    });
    const generationMessages = buildMessagesWithPlan(prepared, generationPlan);
    const promptSnapshotWithPlan = generationMessages[1]?.content ?? prepared.promptSnapshot;

    await prisma.generationJob
      .update({
        where: { id: generationJob.id },
        data: {
          promptSnapshot: promptSnapshotWithPlan.slice(0, 20000),
          heartbeatAt: new Date(),
        },
      })
      .catch(() => undefined);

    const result = await runWithAiQuotaReservation(
      user,
      "chapter_generate",
      async () => {
        const generated = await callAiText({
          providers: orderedProviders,
          routeId: "gpt",
          preferredProviderId: selected.provider.id,
          messages: generationMessages,
          temperature: prepared.temperature,
          maxTokens: prepared.maxTokens,
          attempts: 1,
          reasoningEffort: "low",
        });

        generated.selectedProviderId = selected.provider.id;
        generated.probeDurationMs = selected.probeDurationMs;
        generated.fallbackCount = selected.fallbackCount;
        return generated;
      },
      {
        idempotencyKey: input.idempotencyKey ?? null,
        excludeGenerationJobId: generationJob.id,
      },
    );

    if (!result.ok || !result.text) {
      await prisma.generationJob.update({
        where: { id: generationJob.id },
        data: {
          status: "failed",
          activeLockKey: null,
          routeId: "gpt",
          error: result.upstreamMessage || "AI 生成失败",
          errorMessage: result.upstreamMessage || "AI 生成失败",
          providerId: result.providerId ?? selected.provider.id,
          modelUsed: result.modelUsed ?? selected.provider.model ?? null,
          inputTokens: result.usage?.inputTokens ?? null,
          outputTokens: result.usage?.outputTokens ?? null,
          totalTokens: result.usage?.totalTokens ?? null,
          durationMs: result.durationMs ?? null,
          finishedAt: new Date(),
          heartbeatAt: new Date(),
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
    const consistency = await runChapterConsistencyCheck({
      mode: prepared.mode,
      userId: user.id,
      workId: prepared.work.id,
      chapterId: prepared.existingChapter?.id ?? null,
      chapterIndex: input.index,
      title: draft.title,
      content: draft.content,
      assembledContext: prepared.assembledContext,
      generationPlan,
      providers: orderedProviders,
      routeId: prepared.routeId,
      preferredProviderId: result.providerId ?? selected.provider.id,
    });
    const checkedDraft = consistency.repairedContent
      ? { ...draft, content: consistency.repairedContent }
      : draft;
    const lengthRepair = await repairChapterLengthIfNeeded({
      index: input.index,
      draft: checkedDraft,
      promptSnapshot: promptSnapshotWithPlan,
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

    try {
      await prisma.work.update({
        where: { id: prepared.work.id },
        data: {
          canonState: mergeNovelCanonState({
            current: prepared.work.canonState,
            mode: prepared.mode,
            chapterIndex: input.index,
            chapterTitle: lengthRepair.draft.title,
            chapterSummary: chapter.summary,
            chapterContent: lengthRepair.draft.content,
            generationPlan,
            consistencyIssues: consistency.check?.issues ?? [],
          }),
        },
      });
    } catch (canonError) {
      console.warn("update canonState failed", canonError);
    }

    const combinedUsage = combineTextResultUsage([result, lengthRepair.repairResult]);

    await prisma.generationJob.update({
      where: { id: generationJob.id },
      data: {
        chapterId: chapter.id,
        status: "succeeded",
        activeLockKey: null,
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
        finishedAt: new Date(),
        heartbeatAt: new Date(),
        completedAt: new Date(),
      },
    });
    generationJobFinalized = true;

    await prisma.generationJob.create({
      data: {
        novelId: prepared.work.id,
        userId: user.id,
        workId: prepared.work.id,
        chapterId: chapter.id,
        chapterIndex: input.index,
        action: "context.extract",
        jobType: "context.extract",
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
  } catch (error) {
    if (generationJobId && !generationJobFinalized) {
      await failGenerationJob(
        generationJobId,
        error instanceof Error ? error.message : "chapter_generation_failed",
        { routeId: prepared.routeId },
      );
    }
    throw error;
  } finally {
    endChapterGenerationLock(generationLock.key);
  }
}

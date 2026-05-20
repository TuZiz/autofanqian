import {
  combineTextResultUsage,
  repairChapterLengthIfNeeded,
} from "@/lib/ai/chapter-length-repair";
import {
  finalizeGeneratedDraft,
  type PreparedChapterGeneration,
} from "@/lib/ai/chapter-generate-shared";
import {
  assertAiQuotaAvailable,
  runWithAiQuotaReservation,
} from "@/lib/ai/quota";
import {
  beginGenerationJob,
  completeGenerationJob,
  failGenerationJob,
} from "@/lib/ai/generation-jobs";
import {
  getReadableAiErrorMessage,
  type UpstreamProvider,
  type UpstreamRouteId,
  type UpstreamTextResult,
} from "@/lib/ai/upstream-text";
import { prisma } from "@/lib/prisma";
import { createChapterRevisionSnapshot } from "@/lib/workbench/chapter-revisions";
import { extractTitleAndContentFromStream, saveDraftPreview } from "./stream-draft";
import type { ChapterStreamEvent } from "./stream-events";
import { getCompletedChapterGenerationResult } from "./generate-service";

export async function createStreamGenerationJob(params: {
  prepared: PreparedChapterGeneration;
  provider: UpstreamProvider;
  chapterIndex: number;
  idempotencyKey?: string | null;
}) {
  const { prepared, provider } = params;
  const action =
    prepared.generationMode === "regenerate"
      ? "regenerate.all.stream"
      : "chapter.generate.stream";

  const jobResult = await beginGenerationJob({
    userId: prepared.user.id,
    workId: prepared.work.id,
    chapterId: prepared.existingChapter?.id ?? null,
    chapterIndex: params.chapterIndex,
    action,
    idempotencyKey: params.idempotencyKey ?? null,
    routeId: "gpt",
    providerId: provider.id,
    modelUsed: provider.model,
    promptTemplateKey:
      prepared.generationMode === "regenerate"
        ? "regenerate.all"
        : "chapter.generate",
    promptSnapshot: prepared.promptSnapshot,
  });

  if (jobResult.kind === "completed") {
    const completed = await getCompletedChapterGenerationResult({
      userId: prepared.user.id,
      workId: prepared.work.id,
      index: params.chapterIndex,
      action,
      idempotencyKey: params.idempotencyKey ?? null,
    });
    if (!completed) {
      throw new Error("completed_stream_generation_result_missing");
    }

    return { kind: "completed" as const, data: completed };
  }

  return { kind: "started" as const, jobId: jobResult.job.id };
}

export async function failStreamGenerationJob(params: {
  error: string;
  generationJobId: string;
  routeId: UpstreamRouteId;
}) {
  await failGenerationJob(params.generationJobId, params.error, {
    routeId: params.routeId,
  });
}

export async function completeFailedStreamGeneration(params: {
  generationJobId: string;
  index: number;
  prepared: PreparedChapterGeneration;
  selectedProvider: UpstreamProvider;
  streamedText: string;
  usageResult: UpstreamTextResult;
}): Promise<ChapterStreamEvent> {
  const {
    generationJobId,
    index,
    prepared,
    selectedProvider,
    streamedText,
    usageResult,
  } = params;

  if (usageResult.status === 499) {
    const preview = extractTitleAndContentFromStream(streamedText);
    const savedDraft = await saveDraftPreview({
      workId: prepared.work.id,
      chapterId: prepared.existingChapter?.id ?? null,
      index,
      title: preview.title,
      content: preview.content,
    });

    await failGenerationJob(generationJobId, "stream_aborted", {
      routeId: "gpt",
      providerId: usageResult.providerId ?? selectedProvider.id,
      modelUsed: usageResult.modelUsed ?? selectedProvider.model,
      inputTokens: usageResult.usage?.inputTokens ?? null,
      outputTokens: usageResult.usage?.outputTokens ?? null,
      totalTokens: usageResult.usage?.totalTokens ?? null,
      durationMs: usageResult.durationMs ?? null,
    });

    return {
      type: "aborted",
      savedDraft,
      message: savedDraft ? "已停止生成，并将当前内容保存到草稿。" : "已停止生成。",
    };
  }

  let savedDraft = false;
  if (streamedText.trim()) {
    const preview = extractTitleAndContentFromStream(streamedText);
    savedDraft = await saveDraftPreview({
      workId: prepared.work.id,
      chapterId: prepared.existingChapter?.id ?? null,
      index,
      title: preview.title,
      content: preview.content,
    });
  }

  await failGenerationJob(
    generationJobId,
    usageResult.upstreamMessage || "AI 生成失败",
    {
      routeId: "gpt",
      providerId: usageResult.providerId ?? selectedProvider.id,
      modelUsed: usageResult.modelUsed ?? selectedProvider.model,
      inputTokens: usageResult.usage?.inputTokens ?? null,
      outputTokens: usageResult.usage?.outputTokens ?? null,
      totalTokens: usageResult.usage?.totalTokens ?? null,
      durationMs: usageResult.durationMs ?? null,
    },
  );

  const message = getReadableAiErrorMessage(usageResult, "AI 生成失败，请稍后重试。");
  return {
    type: "error",
    message: savedDraft ? `${message} 已收到的内容已保存到草稿。` : message,
  };
}

export async function completeSuccessfulStreamGeneration(params: {
  generationJobId: string;
  index: number;
  prepared: PreparedChapterGeneration;
  selectedProvider: UpstreamProvider;
  usageResult: UpstreamTextResult & { text: string };
}) {
  const { generationJobId, index, prepared, selectedProvider, usageResult } = params;
  const finalized = finalizeGeneratedDraft({
    index,
    rawText: usageResult.text,
  });
  const lengthRepair = await repairChapterLengthIfNeeded({
    index,
    draft: finalized,
    promptSnapshot: prepared.promptSnapshot,
    providers: prepared.providers,
    routeId: prepared.routeId,
    preferredProviderId: prepared.preferredProvider.id,
    generationMode: prepared.generationMode,
    workWords: prepared.work.words,
    targetChapters: prepared.work.targetChapters,
    beforeRepairAiCall: () => assertAiQuotaAvailable(prepared.user),
    runRepairAiCall: (execute) =>
      runWithAiQuotaReservation(
        prepared.user,
        "chapter_generate_stream_length_repair",
        execute,
      ),
  });
  const finalDraft = lengthRepair.draft;
  const finalWordCount = lengthRepair.wordCount;
  const combinedUsage = combineTextResultUsage([
    usageResult,
    lengthRepair.repairResult,
  ]);

  if (prepared.existingChapter?.content?.trim()) {
    try {
      await createChapterRevisionSnapshot({
        workId: prepared.work.id,
        index,
        source: "ai_regenerate",
      });
    } catch (revisionError) {
      console.error("create chapter revision failed", revisionError);
    }
  }

  const chapter = await prisma.chapter.upsert({
    where: {
      workId_index: { workId: prepared.work.id, index },
    },
    create: {
      workId: prepared.work.id,
      index,
      title: finalDraft.title,
      content: finalDraft.content,
      wordCount: finalWordCount,
      status: "written",
      details: [],
    },
    update: {
      title: finalDraft.title,
      content: finalDraft.content,
      wordCount: finalWordCount,
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

  await prisma.chapterDraft.deleteMany({
    where: { workId: prepared.work.id, index },
  });

  await completeGenerationJob(generationJobId, {
    chapterId: chapter.id,
    routeId: "gpt",
    providerId: usageResult.providerId ?? selectedProvider.id,
    modelUsed: usageResult.modelUsed ?? selectedProvider.model,
    resultSummary: lengthRepair.repairApplied
      ? `已生成第${index}章，${finalWordCount}字。${lengthRepair.repairNote ?? "已自动校正字数。"}`
      : `已生成第${index}章，${finalWordCount}字。`,
    inputTokens: combinedUsage.inputTokens,
    outputTokens: combinedUsage.outputTokens,
    totalTokens: combinedUsage.totalTokens,
    durationMs: combinedUsage.durationMs,
  });

  await prisma.generationJob.create({
    data: {
      novelId: prepared.work.id,
      userId: prepared.user.id,
      workId: prepared.work.id,
      chapterId: chapter.id,
      chapterIndex: index,
      action: "context.extract",
      jobType: "context.extract",
      status: "queued",
      routeId: prepared.contextExtractRouteId,
      resultSummary: "章节生成后等待后台提取上下文记忆。",
    },
  });

  return {
    chapter,
    contextExtraction: {
      workId: prepared.work.id,
      chapterId: chapter.id,
      index,
    },
  };
}

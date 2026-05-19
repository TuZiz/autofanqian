import { after, NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/lib/auth/api";
import { assertAiQuotaAvailable } from "@/lib/ai/quota";
import { runChapterContextExtraction } from "@/lib/ai/chapter-context-extract";
import {
  prepareChapterGeneration,
  serializeGeneratedChapter,
  chapterGenerateBodySchema,
} from "@/lib/ai/chapter-generate-shared";
import {
  beginChapterGenerationLock,
  clearChapterGenerationAbortHandler,
  endChapterGenerationLock,
  registerChapterGenerationAbortHandler,
} from "@/lib/ai/chapter-generation-lock";
import { logAiUsage } from "@/lib/ai/usage-log";
import {
  buildChapterSmartProviderChain,
  getAiProvidersFromEnv,
  getReadableAiErrorMessage,
  selectHealthyProviderForChapter,
  streamAiText,
} from "@/lib/ai/upstream-text";
import { AuthApiError } from "@/lib/auth/errors";
import { getCurrentUser } from "@/lib/auth/service";
import {
  buildStreamMessages,
  extractTitleAndContentFromStream,
} from "./stream-draft";
import {
  createSseHeaders,
  encodeSse,
  type ChapterStreamEvent,
} from "./stream-events";
import {
  completeFailedStreamGeneration,
  completeSuccessfulStreamGeneration,
  createStreamGenerationJob,
  failStreamGenerationJob,
} from "./stream-persistence";
import { assertSameOriginRequest } from "@/lib/security/origin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
  } catch (error) {
    return errorResponse(error);
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, message: "未登录或登录已失效，请先登录。" },
      { status: 401 },
    );
  }

  const raw = await request.json().catch(() => null as unknown);
  const parsedBody = chapterGenerateBodySchema.safeParse(raw);
  if (!parsedBody.success) {
    return NextResponse.json(
      { success: false, message: "请求参数校验失败，请检查输入内容。" },
      { status: 400 },
    );
  }
  await assertAiQuotaAvailable(user);

  try {
    const prepared = await prepareChapterGeneration({
      user,
      input: parsedBody.data,
      providersFromEnv: getAiProvidersFromEnv(),
    });
    const smartProviders = buildChapterSmartProviderChain({
      providers: prepared.providers,
      overrideModel:
        prepared.routeId === "gpt" ? prepared.preferredProvider.model || "gpt-5.5" : "gpt-5.5",
    });
    let postResponseContextExtraction:
      | { workId: string; chapterId: string; index: number }
      | null = null;

    after(async () => {
      if (!postResponseContextExtraction) return;
      await runChapterContextExtraction({
        user,
        workId: postResponseContextExtraction.workId,
        chapterId: postResponseContextExtraction.chapterId,
        index: postResponseContextExtraction.index,
        trigger: "stream_generate",
        force: true,
      });
    });

    const generationLock = beginChapterGenerationLock({
      userId: user.id,
      workId: prepared.work.id,
      index: parsedBody.data.index,
    });

    if (!generationLock.acquired) {
      return NextResponse.json(
        { success: false, message: "该章节正在生成中，请等待生成结束后再操作。" },
        { status: 409 },
      );
    }

    const encoder = new TextEncoder();
    const abortController = new AbortController();
    let generationJobId = "";
    registerChapterGenerationAbortHandler(generationLock.key, () => {
      abortController.abort();
    });

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let streamedText = "";
        let emittedTitle = "";
        let emittedContentLength = 0;
        let usageResult:
          | Awaited<ReturnType<typeof streamAiText>>
          | null = null;

        const writeEvent = (event: ChapterStreamEvent) => {
          controller.enqueue(encoder.encode(encodeSse(event)));
        };

        const flushPreviewDelta = (force = false) => {
          const { title, content } = extractTitleAndContentFromStream(streamedText);
          const nextTitle = title && title !== emittedTitle ? title : undefined;
          const nextContent = content.slice(emittedContentLength);
          if (!force && !nextTitle && !nextContent) return;

          if (nextTitle) emittedTitle = nextTitle;
          if (nextContent) emittedContentLength = content.length;

          writeEvent({
            type: "delta",
            title: nextTitle,
            contentDelta: nextContent || undefined,
            receivedChars: content.length,
          });
        };

        request.signal.addEventListener("abort", () => {
          abortController.abort();
        });

        try {
          const selected = await selectHealthyProviderForChapter({
            providers: smartProviders,
            routeId: "gpt",
            preferredProviderId: smartProviders[0]?.id,
            reasoningEffort: "low",
          });

          await logAiUsage({
            userId: prepared.user.id,
            action: `chapter_generate_stream_${parsedBody.data.index}_probe`,
            result: {
              ok: Boolean(selected.provider),
              status: selected.provider ? 200 : (selected.failures[selected.failures.length - 1]?.status ?? 503),
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
            writeEvent({
              type: "error",
              message: getReadableAiErrorMessage(
                {
                  status: lastFailure?.status ?? 503,
                  upstreamMessage:
                    lastFailure?.upstreamMessage ?? "所有正文线路探针都失败了",
                },
                "正文主线路当前都不可用，请稍后重试。",
              ),
            });
            controller.close();
            return;
          }

          const orderedProviders = [
            selected.provider,
            ...smartProviders.filter((provider) => provider.id !== selected.provider.id),
          ];

          generationJobId = await createStreamGenerationJob({
            prepared,
            provider: selected.provider,
          });

          writeEvent({
            type: "start",
            key: `${prepared.work.id}:${parsedBody.data.index}`,
            workId: prepared.work.id,
            index: parsedBody.data.index,
            mode: prepared.generationMode,
          });
          writeEvent({ type: "progress", progress: 8, message: "已开始生成正文…" });

          usageResult = await streamAiText({
            providers: orderedProviders,
            routeId: "gpt",
            preferredProviderId: selected.provider.id,
            messages: buildStreamMessages({
              baseUserPrompt: prepared.promptSnapshot,
              generationMode: prepared.generationMode,
            }),
            temperature: prepared.temperature,
            maxTokens: prepared.maxTokens,
            signal: abortController.signal,
            reasoningEffort: "low",
            onChunk: async (chunk) => {
              if (chunk.deltaText) {
                streamedText += chunk.deltaText;
                flushPreviewDelta();
              }
            },
          });

          if (usageResult) {
            usageResult.selectedProviderId = selected.provider.id;
            usageResult.probeDurationMs = selected.probeDurationMs;
            usageResult.fallbackCount = selected.fallbackCount;
          }

          await logAiUsage({
            userId: prepared.user.id,
            action: `chapter_generate_stream_${parsedBody.data.index}`,
            result: usageResult,
          });

          if (!usageResult.ok || !usageResult.text) {
            writeEvent(
              await completeFailedStreamGeneration({
                generationJobId,
                index: parsedBody.data.index,
                prepared,
                selectedProvider: selected.provider,
                streamedText,
                usageResult,
              }),
            );
            controller.close();
            return;
          }

          flushPreviewDelta(true);

          const completed = await completeSuccessfulStreamGeneration({
            generationJobId,
            index: parsedBody.data.index,
            prepared,
            selectedProvider: selected.provider,
            usageResult: { ...usageResult, text: usageResult.text },
          });
          postResponseContextExtraction = completed.contextExtraction;

          writeEvent({
            type: "done",
            work: {
              id: prepared.work.id,
              workType: prepared.work.workType,
              title: prepared.work.title,
              tag: prepared.work.tag,
            },
            chapter: serializeGeneratedChapter(completed.chapter),
          });
          controller.close();
        } catch (error) {
          console.error(error);
          if (generationJobId) {
            await failStreamGenerationJob({
              generationJobId,
              routeId: prepared.routeId,
              error: error instanceof Error ? error.message : "stream_failed",
            });
          }
          writeEvent({
            type: "error",
            message:
              error instanceof AuthApiError
                ? error.message
                : "服务异常，请稍后重试。",
          });
          controller.close();
        } finally {
          clearChapterGenerationAbortHandler(generationLock.key);
          endChapterGenerationLock(generationLock.key);
        }
      },
      cancel() {
        abortController.abort();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: createSseHeaders(),
    });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return NextResponse.json(
        { success: false, message: error.message, fieldErrors: error.fieldErrors },
        { status: error.status },
      );
    }

    if (
      error instanceof z.ZodError
    ) {
      return NextResponse.json(
        { success: false, message: "请求参数校验失败，请检查输入内容。" },
        { status: 400 },
      );
    }

    console.error(error);
    return NextResponse.json(
      { success: false, message: "服务异常，请稍后重试。" },
      { status: 500 },
    );
  }
}

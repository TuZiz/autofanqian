import { NextResponse } from "next/server";
import { z } from "zod";

import {
  countWords,
  finalizeGeneratedDraft,
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
  getAiProvidersFromEnv,
  getReadableAiErrorMessage,
  streamAiText,
} from "@/lib/ai/upstream-text";
import { AuthApiError } from "@/lib/auth/errors";
import { getCurrentUser } from "@/lib/auth/service";
import { prisma } from "@/lib/prisma";
import { createChapterRevisionSnapshot } from "@/lib/workbench/chapter-revisions";

export const runtime = "nodejs";

type StreamEvent =
  | { type: "start"; key: string; workId: string; index: number; mode: "generate" | "regenerate" }
  | { type: "progress"; progress: number; message: string }
  | { type: "delta"; title?: string; contentDelta?: string; receivedChars: number }
  | {
      type: "done";
      chapter: {
        id: string;
        index: number;
        title: string | null;
        content: string;
        wordCount: number;
        summary?: string | null;
        chapterOutline?: string | null;
        details?: unknown;
        updatedAt: string;
        createdAt: string;
      };
      work: { id: string; title: string; tag: string };
    }
  | { type: "aborted"; savedDraft: boolean; message: string }
  | { type: "error"; message: string };

function encodeSse(event: StreamEvent) {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

function createSseHeaders() {
  return {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  };
}

function extractTitleAndContentFromStream(raw: string) {
  let title = "";
  let content = raw;
  const normalized = raw.replace(/\r\n/g, "\n");
  const titleMatch = normalized.match(/^\s*标题[:：]\s*(.+)\n+/);
  if (titleMatch) {
    title = titleMatch[1]?.trim() ?? "";
    content = normalized.slice(titleMatch[0].length);
  }

  return {
    title: title || undefined,
    content: content.replace(/^\s*正文[:：]\s*/i, "").trimStart(),
  };
}

function buildStreamMessages(input: {
  baseUserPrompt: string;
  generationMode: "generate" | "regenerate";
}) {
  const system = [
    "你是一名资深中文网文作者与编辑。",
    "现在要流式输出章节结果，方便前端实时展示。",
    "",
    "输出规则：",
    "1) 不要输出 JSON，不要 Markdown，不要代码块。",
    "2) 第一行必须是：标题：<本章标题>",
    "3) 从第二行开始直接输出正文。",
    "4) 正文自然分段，允许真实换行。",
    "5) 不要写解释、备注、前言或结尾说明。",
  ].join("\n");

  const user = [
    input.baseUserPrompt,
    "",
    input.generationMode === "regenerate"
      ? "请在保留核心剧情连续性的前提下重新生成本章，按“标题 + 正文”的纯文本格式直接输出。"
      : "请直接开始生成本章，按“标题 + 正文”的纯文本格式直接输出。",
  ].join("\n");

  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];
}

async function saveDraftPreview(params: {
  workId: string;
  chapterId: string | null;
  index: number;
  title?: string;
  content: string;
}) {
  const content = params.content.trim();
  if (!content) return false;

  await prisma.chapterDraft.upsert({
    where: { workId_index: { workId: params.workId, index: params.index } },
    create: {
      workId: params.workId,
      chapterId: params.chapterId,
      index: params.index,
      title: params.title?.trim() || null,
      content,
      wordCount: countWords(content),
      isSynced: false,
    },
    update: {
      chapterId: params.chapterId,
      title: params.title?.trim() || null,
      content,
      wordCount: countWords(content),
      isSynced: false,
    },
  });

  return true;
}

export async function POST(request: Request) {
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

  try {
    const prepared = await prepareChapterGeneration({
      user,
      input: parsedBody.data,
      providersFromEnv: getAiProvidersFromEnv(),
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

        const writeEvent = (event: StreamEvent) => {
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
          generationJobId = (
            await prisma.generationJob.create({
              data: {
                novelId: prepared.work.id,
                chapterId: prepared.existingChapter?.id ?? null,
                action:
                  prepared.generationMode === "regenerate"
                    ? "regenerate.all.stream"
                    : "chapter.generate.stream",
                status: "running",
                providerId: prepared.preferredProvider.id,
                modelUsed: prepared.preferredProvider.model,
                promptTemplateKey:
                  prepared.generationMode === "regenerate"
                    ? "regenerate.all"
                    : "chapter.generate",
                promptSnapshot: prepared.promptSnapshot.slice(0, 20000),
              },
              select: { id: true },
            })
          ).id;

          writeEvent({
            type: "start",
            key: `${prepared.work.id}:${parsedBody.data.index}`,
            workId: prepared.work.id,
            index: parsedBody.data.index,
            mode: prepared.generationMode,
          });
          writeEvent({ type: "progress", progress: 8, message: "已开始生成正文…" });

          usageResult = await streamAiText({
            providers: prepared.providers,
            preferredProviderId: prepared.preferredProvider.id,
            messages: buildStreamMessages({
              baseUserPrompt: prepared.promptSnapshot,
              generationMode: prepared.generationMode,
            }),
            temperature: prepared.temperature,
            maxTokens: prepared.maxTokens,
            signal: abortController.signal,
            onChunk: async (chunk) => {
              if (chunk.deltaText) {
                streamedText += chunk.deltaText;
                flushPreviewDelta();
              }
            },
          });

          await logAiUsage({
            userId: prepared.user.id,
            action: `chapter_generate_stream_${parsedBody.data.index}`,
            result: usageResult,
          });

          if (!usageResult.ok || !usageResult.text) {
            if (usageResult.status === 499) {
              const preview = extractTitleAndContentFromStream(streamedText);
              const savedDraft = await saveDraftPreview({
                workId: prepared.work.id,
                chapterId: prepared.existingChapter?.id ?? null,
                index: parsedBody.data.index,
                title: preview.title,
                content: preview.content,
              });

              await prisma.generationJob.update({
                where: { id: generationJobId },
                data: {
                  status: "failed",
                  error: "stream_aborted",
                  providerId: usageResult.providerId ?? prepared.preferredProvider.id,
                  modelUsed: usageResult.modelUsed ?? prepared.preferredProvider.model,
                  inputTokens: usageResult.usage?.inputTokens ?? null,
                  outputTokens: usageResult.usage?.outputTokens ?? null,
                  totalTokens: usageResult.usage?.totalTokens ?? null,
                  durationMs: usageResult.durationMs ?? null,
                  completedAt: new Date(),
                },
              });

              writeEvent({
                type: "aborted",
                savedDraft,
                message: savedDraft ? "已停止生成，并将当前内容保存到草稿。" : "已停止生成。",
              });
              controller.close();
              return;
            }

            let savedDraft = false;
            if (streamedText.trim()) {
              const preview = extractTitleAndContentFromStream(streamedText);
              savedDraft = await saveDraftPreview({
                workId: prepared.work.id,
                chapterId: prepared.existingChapter?.id ?? null,
                index: parsedBody.data.index,
                title: preview.title,
                content: preview.content,
              });
            }

            await prisma.generationJob.update({
              where: { id: generationJobId },
              data: {
                status: "failed",
                error: usageResult.upstreamMessage || "AI 生成失败",
                providerId: usageResult.providerId ?? prepared.preferredProvider.id,
                modelUsed: usageResult.modelUsed ?? prepared.preferredProvider.model,
                inputTokens: usageResult.usage?.inputTokens ?? null,
                outputTokens: usageResult.usage?.outputTokens ?? null,
                totalTokens: usageResult.usage?.totalTokens ?? null,
                durationMs: usageResult.durationMs ?? null,
                completedAt: new Date(),
              },
            });

            writeEvent({
              type: "error",
              message: savedDraft
                ? `${getReadableAiErrorMessage(usageResult, "AI 生成失败，请稍后重试。")} 已收到的内容已保存到草稿。`
                : getReadableAiErrorMessage(usageResult, "AI 生成失败，请稍后重试。"),
            });
            controller.close();
            return;
          }

          flushPreviewDelta(true);

          const finalized = finalizeGeneratedDraft({
            index: parsedBody.data.index,
            rawText: usageResult.text,
          });

          if (prepared.existingChapter?.content?.trim()) {
            try {
              await createChapterRevisionSnapshot({
                workId: prepared.work.id,
                index: parsedBody.data.index,
                source: "ai_regenerate",
              });
            } catch (revisionError) {
              console.error("create chapter revision failed", revisionError);
            }
          }

          const chapter = await prisma.chapter.upsert({
            where: {
              workId_index: { workId: prepared.work.id, index: parsedBody.data.index },
            },
            create: {
              workId: prepared.work.id,
              index: parsedBody.data.index,
              title: finalized.title,
              content: finalized.content,
              wordCount: countWords(finalized.content),
              status: "written",
              details: [],
            },
            update: {
              title: finalized.title,
              content: finalized.content,
              wordCount: countWords(finalized.content),
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
            where: { workId: prepared.work.id, index: parsedBody.data.index },
          });

          await prisma.generationJob.update({
            where: { id: generationJobId },
            data: {
              chapterId: chapter.id,
              status: "success",
              providerId: usageResult.providerId ?? prepared.preferredProvider.id,
              modelUsed: usageResult.modelUsed ?? prepared.preferredProvider.model,
              resultSummary: `已生成第${parsedBody.data.index}章，${countWords(finalized.content)}字。`,
              inputTokens: usageResult.usage?.inputTokens ?? null,
              outputTokens: usageResult.usage?.outputTokens ?? null,
              totalTokens: usageResult.usage?.totalTokens ?? null,
              durationMs: usageResult.durationMs ?? null,
              completedAt: new Date(),
            },
          });

          await prisma.generationJob.create({
            data: {
              novelId: prepared.work.id,
              chapterId: chapter.id,
              action: "context.extract",
              status: "queued",
              resultSummary: "章节生成后等待后台提取上下文记忆。",
            },
          });

          writeEvent({
            type: "done",
            work: {
              id: prepared.work.id,
              title: prepared.work.title,
              tag: prepared.work.tag,
            },
            chapter: serializeGeneratedChapter(chapter),
          });
          controller.close();
        } catch (error) {
          console.error(error);
          if (generationJobId) {
            await prisma.generationJob.update({
              where: { id: generationJobId },
              data: {
                status: "failed",
                error: error instanceof Error ? error.message : "stream_failed",
                completedAt: new Date(),
              },
            }).catch(() => undefined);
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

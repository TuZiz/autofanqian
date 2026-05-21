import "server-only";

import { Prisma, type GenerationJob, type GenerationJobStatus } from "@prisma/client";
import { z } from "zod";

import { runChapterContextExtraction } from "@/lib/ai/chapter-context-extract";
import {
  generateChapterForUser,
  getCompletedChapterGenerationResult,
} from "@/backend/ai/chapter/generate-service";
import {
  buildShortStoryGenerateSystemPrompt,
} from "@/lib/ai/short-story-generate-prompt";
import {
  buildAiProviderChain,
  callAiText,
  getAiProvidersFromEnv,
  getReadableAiErrorMessage,
  type UpstreamTextResult,
} from "@/lib/ai/upstream-text";
import {
  markStaleGenerationJobs,
} from "@/lib/ai/generation-jobs";
import { runWithAiQuotaReservation } from "@/lib/ai/quota";
import { sessionUserSelect, type SessionUser } from "@/lib/auth/user";
import { getAiModelConfig } from "@/lib/config/ai-model";
import {
  normalizeShortStoryOutline,
  shortStoryOutlineSchema,
  type ShortStoryBeat,
  type ShortStoryOutline,
} from "@/lib/create/short-story-outline-schema";
import { assertCanCreateChapter } from "@/lib/membership/guards";
import { prisma } from "@/lib/prisma";
import { getActivePromptTemplate } from "@/lib/ai/prompt-templates";
import {
  getGenerationJobFailureCount,
  shouldAutoRunGenerationJob,
  withGenerationJobFailureCount,
} from "@/lib/jobs/generation-job-progress";
import { shouldSkipLongShortStoryJobForExistingChapter } from "@/lib/jobs/long-short-story-job-state";
import {
  chapterConsistencyResultSchema,
  type ChapterConsistencyResult,
} from "@/shared/schemas/chapter-consistency";
import { shortStoryGenerateSchema, type ShortStoryGenerateInput } from "@/shared/schemas/short-story-generate";
import { SHORT_STORY_ENDING_LABELS } from "@/shared/schemas/short-story";
import { AI_ACTIONS } from "@/shared/ai-actions";

const SUPPORTED_JOB_TYPES = [
  "chapter.consistency.book",
  "short_story.generate.long",
  "chapter.batch_generate",
  "bible.extract",
] as const;
const SHORT_STORY_CONTEXT_SOURCE = "short_story_generate";
const SHORT_STORY_TIMELINE_MARKER = "[short_story_generate]";
export const GENERATION_JOB_STALE_MS = 30 * 60 * 1000;
export const GENERATION_JOB_MAX_AUTO_FAILURES = 3;

const runJobOptionsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).optional().default(5),
  jobId: z.string().trim().min(1).max(64).optional().nullable(),
  status: z
    .enum(["all", "queued", "running", "succeeded", "success", "failed", "cancelled", "stale"])
    .optional()
    .default("all"),
  includeFailed: z.boolean().optional().default(false),
});

const shortStoryLongJobJsonSchema = z
  .object({
    input: shortStoryGenerateSchema,
    outline: shortStoryOutlineSchema.optional().nullable(),
    segments: z
      .array(
        z.object({
          index: z.coerce.number().int().min(1),
          title: z.string().trim().min(1).max(120),
          content: z.string().trim().min(1).max(120_000),
          wordCount: z.coerce.number().int().min(0),
        }),
      )
      .default([]),
    finalWorkId: z.string().optional().nullable(),
  })
  .passthrough();

const batchGenerateJobJsonSchema = z
  .object({
    indexes: z.array(z.coerce.number().int().min(1).max(9999)).max(100).optional(),
    startIndex: z.coerce.number().int().min(1).max(9999).optional(),
    count: z.coerce.number().int().min(1).max(100).optional(),
    extraPrompt: z.string().trim().max(2000).optional().nullable(),
    generated: z.array(z.coerce.number().int().min(1).max(9999)).default([]),
  })
  .passthrough();

type SupportedJobType = (typeof SUPPORTED_JOB_TYPES)[number];
type RunJobOptions = z.input<typeof runJobOptionsSchema>;
type JobUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  durationMs: number;
};

function isSupportedJobType(value?: string | null): value is SupportedJobType {
  return SUPPORTED_JOB_TYPES.includes(value as SupportedJobType);
}

function countWords(text: string) {
  return text.replace(/\s+/g, "").length;
}

function extractJson(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as unknown;
  } catch {
    return null;
  }
}

function formatTags(tags: string[]) {
  return tags.length ? tags.join("、") : "无";
}

function addUsage(current: JobUsage, result: UpstreamTextResult): JobUsage {
  return {
    inputTokens: current.inputTokens + Math.max(0, result.usage?.inputTokens ?? 0),
    outputTokens: current.outputTokens + Math.max(0, result.usage?.outputTokens ?? 0),
    totalTokens: current.totalTokens + Math.max(0, result.usage?.totalTokens ?? 0),
    durationMs: current.durationMs + Math.max(0, result.durationMs ?? 0),
  };
}

function usageFromJob(job: GenerationJob): JobUsage {
  return {
    inputTokens: job.inputTokens ?? 0,
    outputTokens: job.outputTokens ?? 0,
    totalTokens: job.totalTokens ?? 0,
    durationMs: job.durationMs ?? 0,
  };
}

async function markSupportedStaleGenerationJobs(now = new Date()) {
  const staleBefore = new Date(now.getTime() - GENERATION_JOB_STALE_MS);
  const staleJobs = await prisma.generationJob.findMany({
    where: {
      status: "running",
      heartbeatAt: { lt: staleBefore },
      jobType: { in: [...SUPPORTED_JOB_TYPES] },
    },
    select: { id: true, resultJson: true },
  });

  for (const job of staleJobs) {
    const failureCount = getGenerationJobFailureCount(job.resultJson) + 1;
    await prisma.generationJob.update({
      where: { id: job.id },
      data: {
        status: "stale",
        error: "generation_job_stale",
        errorMessage: "生成任务超过 30 分钟未更新心跳，已自动标记为过期。",
        resultJson: withGenerationJobFailureCount(job.resultJson, failureCount) as Prisma.InputJsonValue,
        resultSummary:
          failureCount >= GENERATION_JOB_MAX_AUTO_FAILURES
            ? "任务连续失败次数过多，已停止自动重试，请手动重试。"
            : "任务心跳过期，等待 worker 自动恢复。",
        finishedAt: now,
        completedAt: now,
        heartbeatAt: now,
        activeLockKey: null,
      },
    });
  }

  return staleJobs.length;
}

async function loadJobUser(job: GenerationJob) {
  if (!job.userId) return null;
  return prisma.user.findUnique({
    where: { id: job.userId },
    select: sessionUserSelect,
  });
}

async function runAiForJob(params: {
  user: SessionUser | null;
  job: GenerationJob;
  estimatedOutputChars?: number;
  estimatedTokens?: number;
  execute: () => Promise<UpstreamTextResult>;
}) {
  if (!params.user) return params.execute();
  return runWithAiQuotaReservation(
    params.user,
    params.job.action || params.job.jobType || "generation.job",
    params.execute,
    {
      estimatedOutputChars: params.estimatedOutputChars,
      estimatedTokens: params.estimatedTokens,
      excludeGenerationJobId: params.job.id,
    },
  );
}

async function updateJobProgress(params: {
  jobId: string;
  resultJson?: Prisma.InputJsonValue;
  resultSummary?: string;
  usage?: JobUsage;
}) {
  await prisma.generationJob.update({
    where: { id: params.jobId },
    data: {
      heartbeatAt: new Date(),
      resultJson: params.resultJson,
      resultSummary: params.resultSummary,
      inputTokens: params.usage?.inputTokens,
      outputTokens: params.usage?.outputTokens,
      totalTokens: params.usage?.totalTokens,
      durationMs: params.usage?.durationMs,
    },
  });
}

function buildLongShortStoryOutlinePrompt(input: ShortStoryGenerateInput) {
  return [
    "请先只生成长文本短篇小说的结构化大纲 JSON，不要输出正文。",
    "JSON 字段必须是 tag/title/synopsis/targetWords/theme/hook/endingType/characters/beats/fullOutline。",
    "beats 需要 5-10 个，后续会按 beat 分段写正文；每个 beat 必须包含 index/title/purpose/targetWords/writingPrompt。",
    "",
    `类型：${input.genre}`,
    `标签：${formatTags(input.tags)}`,
    `目标字数：${input.targetWords}`,
    `结构模板：${input.structureTemplate}`,
    `风格：${input.style}`,
    `叙事视角：${input.pov}`,
    `结局倾向：${SHORT_STORY_ENDING_LABELS[input.endingType]}（${input.endingType}）`,
    `核心创意：${input.idea}`,
    "",
    "硬性要求：正文后续必须按用户选择的视角和结局倾向写；不要默认写成反转结局；不要套长篇分卷流程。",
  ].join("\n");
}

function buildLongShortStoryOutlineSystemPrompt(basePrompt: string) {
  return [
    basePrompt,
    "",
    "本次是长文本短篇的第一阶段：只做结构化大纲规划，不生成正文 content。",
    "只输出严格 JSON 对象，字段为 tag/title/synopsis/targetWords/theme/hook/endingType/characters/beats/fullOutline。",
    "不要输出 title/synopsis/outline/content 这种一次性成稿结构；不要把 8000 字以上正文塞进 JSON。",
  ].join("\n");
}

function parseOutlineFromAi(text: string) {
  const raw = extractJson(text);
  const direct = shortStoryOutlineSchema.safeParse(raw);
  if (direct.success) return normalizeShortStoryOutline(direct.data);

  const wrapped = z.object({ outline: shortStoryOutlineSchema }).safeParse(raw);
  if (wrapped.success) return normalizeShortStoryOutline(wrapped.data.outline);

  throw new Error("AI 短篇结构解析失败，请稍后重试。");
}

function buildSegmentPrompt(params: {
  input: ShortStoryGenerateInput;
  outline: ShortStoryOutline;
  beat: ShortStoryBeat;
  previousSegments: Array<{ index: number; title: string; content: string }>;
}) {
  const previous = params.previousSegments
    .slice(-2)
    .map((segment) => `【${segment.index}. ${segment.title}】\n${segment.content.slice(-1600)}`)
    .join("\n\n");
  return [
    "请根据短篇结构分段创作正文。只输出本段正文，不要标题、解释、Markdown 或 JSON。",
    `作品标题：${params.outline.title}`,
    `简介：${params.outline.synopsis}`,
    `主题：${params.outline.theme}`,
    `钩子：${params.outline.hook}`,
    `叙事视角：${params.input.pov}`,
    `风格：${params.input.style}`,
    `结局倾向：${SHORT_STORY_ENDING_LABELS[params.input.endingType]}（${params.input.endingType}）`,
    `标签：${formatTags(params.input.tags)}`,
    "",
    "人物：",
    ...params.outline.characters.map((character) => `- ${character.name}（${character.role}）：${character.description}`),
    "",
    previous ? `前文衔接：\n${previous}` : "前文衔接：无，本段是开篇。",
    "",
    `当前 beat：${params.beat.index}. ${params.beat.title}`,
    `剧情目的：${params.beat.purpose}`,
    `写作提示：${params.beat.writingPrompt}`,
    `本段目标字数：${params.beat.targetWords}`,
    "",
    "硬性要求：按当前视角写，段落自然，承接前文；只写本 beat，不提前写后续 beat 的结局。",
  ].join("\n");
}

async function persistShortStoryContext(params: {
  input: ShortStoryGenerateInput;
  outline: ShortStoryOutline;
  workId: string;
}) {
  const { input, outline, workId } = params;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.character.createMany({
        data: outline.characters.map((character) => ({
          novelId: workId,
          name: character.name,
          role: character.role,
          desc: character.description,
        })),
        skipDuplicates: true,
      });

      await tx.writingMemory.deleteMany({
        where: { novelId: workId, source: SHORT_STORY_CONTEXT_SOURCE },
      });
      await tx.writingMemory.createMany({
        data: [
          {
            novelId: workId,
            kind: "style",
            priority: 80,
            source: SHORT_STORY_CONTEXT_SOURCE,
            content: `短篇主题：${outline.theme}`,
          },
          {
            novelId: workId,
            kind: "plot_thread",
            priority: 85,
            source: SHORT_STORY_CONTEXT_SOURCE,
            content: `开篇钩子：${outline.hook}`,
          },
          {
            novelId: workId,
            kind: "constraint",
            priority: 75,
            source: SHORT_STORY_CONTEXT_SOURCE,
            content: `结局倾向：${SHORT_STORY_ENDING_LABELS[outline.endingType]}（${outline.endingType}）`,
          },
          {
            novelId: workId,
            kind: "style",
            priority: 72,
            source: SHORT_STORY_CONTEXT_SOURCE,
            content: `短篇标签：${formatTags(input.tags)}`,
          },
          {
            novelId: workId,
            kind: "style",
            priority: 72,
            source: SHORT_STORY_CONTEXT_SOURCE,
            content: `叙事视角：${input.pov}`,
          },
        ],
      });

      await tx.timelineEvent.deleteMany({
        where: {
          novelId: workId,
          chapterIndex: 1,
          description: { startsWith: SHORT_STORY_TIMELINE_MARKER },
        },
      });
      await tx.timelineEvent.createMany({
        data: outline.beats.map((beat) => ({
          novelId: workId,
          chapterIndex: 1,
          order: beat.index,
          title: beat.title,
          summary: beat.purpose,
          description: `${SHORT_STORY_TIMELINE_MARKER}\n${beat.writingPrompt}`,
        })),
      });
    });
  } catch (error) {
    console.warn("persist short story context failed", error);
  }
}

async function runLongShortStoryJob(job: GenerationJob) {
  const user = await loadJobUser(job);
  const work = await prisma.work.findUnique({
    where: { id: job.novelId },
    select: { id: true, rawOutline: true },
  });
  const rawState = shortStoryLongJobJsonSchema.safeParse(job.resultJson);
  const fallbackInput = shortStoryGenerateSchema.safeParse(
    typeof work?.rawOutline === "object" && work.rawOutline
      ? (work.rawOutline as { input?: unknown }).input
      : null,
  );
  const rawInput = rawState.success
    ? rawState.data.input
    : fallbackInput.success
      ? fallbackInput.data
      : null;

  if (!rawInput) throw new Error("长文本短篇任务缺少生成输入。");
  if (rawState.success && rawState.data.finalWorkId) {
    const existingChapter = await prisma.chapter.findUnique({
      where: { workId_index: { workId: rawState.data.finalWorkId, index: 1 } },
      select: { status: true, content: true, wordCount: true },
    });
    if (shouldSkipLongShortStoryJobForExistingChapter(rawState.data, existingChapter)) {
      return {
        resultJson: (job.resultJson ?? {}) as Prisma.InputJsonValue,
        resultSummary: `长文本短篇已完成，正文 ${existingChapter?.wordCount ?? 0} 字。`,
        usage: usageFromJob(job),
      };
    }
  }

  let usage = usageFromJob(job);
  let outline = rawState.success && rawState.data.outline
    ? normalizeShortStoryOutline(rawState.data.outline)
    : null;
  const segments = rawState.success ? [...rawState.data.segments] : [];

  const aiModelConfig = await getAiModelConfig();
  const target = aiModelConfig.outlineGenerate;
  const providers = buildAiProviderChain({
    providers: getAiProvidersFromEnv(),
    preferredProviderId: target.providerId,
    overrideModel: target.model,
  });
  if (!providers.length) throw new Error("AI 未配置，无法执行长文本短篇生成。");

  if (!outline) {
    const systemTemplate = await getActivePromptTemplate(
      AI_ACTIONS.shortStoryGenerate,
      buildShortStoryGenerateSystemPrompt(),
    );
    const prompt = buildLongShortStoryOutlinePrompt(rawInput);
    const result = await runAiForJob({
      user,
      job,
      estimatedOutputChars: 3500,
      estimatedTokens: 3200,
      execute: () =>
        callAiText({
          providers,
          preferredProviderId: target.providerId,
          routeId: target.providerId,
          messages: [
            { role: "system", content: buildLongShortStoryOutlineSystemPrompt(systemTemplate.content) },
            { role: "user", content: prompt },
          ],
          temperature: 0.68,
          maxTokens: 4200,
          attempts: 1,
        }),
    });
    if (!result.ok || !result.text) {
      throw new Error(getReadableAiErrorMessage(result, "短篇结构生成失败。"));
    }
    usage = addUsage(usage, result);
    outline = parseOutlineFromAi(result.text);
    await updateJobProgress({
      jobId: job.id,
      usage,
      resultJson: {
        input: rawInput,
        outline,
        segments,
        finalWorkId: null,
      } as Prisma.InputJsonValue,
      resultSummary: `短篇结构已生成，共 ${outline.beats.length} 个 beats。`,
    });
  }

  for (const beat of outline.beats) {
    if (segments.some((segment) => segment.index === beat.index && segment.content.trim())) {
      continue;
    }

    const prompt = buildSegmentPrompt({
      input: rawInput,
      outline,
      beat,
      previousSegments: segments,
    });
    const result = await runAiForJob({
      user,
      job,
      estimatedOutputChars: beat.targetWords,
      estimatedTokens: Math.ceil(beat.targetWords * 1.7),
      execute: () =>
        callAiText({
          providers,
          preferredProviderId: target.providerId,
          routeId: target.providerId,
          messages: [
            { role: "system", content: "你是中文短篇小说作者。只输出本段正文。" },
            { role: "user", content: prompt },
          ],
          temperature: 0.74,
          maxTokens: Math.min(7000, Math.max(1800, Math.ceil(beat.targetWords * 1.8))),
          attempts: 1,
        }),
    });

    if (!result.ok || !result.text) {
      throw new Error(getReadableAiErrorMessage(result, `第 ${beat.index} 段生成失败。`));
    }

    const content = result.text.trim();
    usage = addUsage(usage, result);
    segments.push({
      index: beat.index,
      title: beat.title,
      content,
      wordCount: countWords(content),
    });
    segments.sort((left, right) => left.index - right.index);

    await updateJobProgress({
      jobId: job.id,
      usage,
      resultJson: {
        input: rawInput,
        outline,
        segments,
        finalWorkId: null,
      } as Prisma.InputJsonValue,
      resultSummary: `短篇正文已生成 ${segments.length}/${outline.beats.length} 段。`,
    });
  }

  const content = segments.map((segment) => segment.content.trim()).filter(Boolean).join("\n\n");
  const wordCount = countWords(content);
  await prisma.$transaction(async (tx) => {
    await tx.work.update({
      where: { id: job.novelId },
      data: {
        title: outline.title,
        synopsis: outline.synopsis,
        outline: outline as unknown as Prisma.InputJsonValue,
        rawOutline: {
          input: rawInput,
          outline,
          segments,
          contentWordCount: wordCount,
          generatedBy: "GenerationJob short_story.generate.long",
        } as Prisma.InputJsonValue,
        targetChapters: 1,
        plannedUntilChapter: 1,
      },
    });
    await tx.chapter.upsert({
      where: { workId_index: { workId: job.novelId, index: 1 } },
      create: {
        workId: job.novelId,
        index: 1,
        title: outline.title,
        content,
        wordCount,
        status: "written",
        chapterOutline: outline.fullOutline,
        details: [
          `短篇类型：${rawInput.genre}`,
          `风格：${rawInput.style}`,
          `结构模板：${rawInput.structureTemplate}`,
          `视角：${rawInput.pov}`,
          `结局：${SHORT_STORY_ENDING_LABELS[rawInput.endingType]}`,
          `标签：${formatTags(rawInput.tags)}`,
          `目标字数：${rawInput.targetWords}`,
        ],
      },
      update: {
        title: outline.title,
        content,
        wordCount,
        status: "written",
        chapterOutline: outline.fullOutline,
      },
    });
  });

  await persistShortStoryContext({ input: rawInput, outline, workId: job.novelId });

  return {
    resultJson: {
      input: rawInput,
      outline,
      segments,
      finalWorkId: job.novelId,
      contentWordCount: wordCount,
    } as Prisma.InputJsonValue,
    resultSummary: `长文本短篇生成完成：${outline.title}，正文 ${wordCount} 字。`,
    usage,
  };
}

function buildBookConsistencyPrompt(params: {
  work: {
    title: string;
    workType: string;
    tag: string;
    outline: unknown;
    canonState: unknown;
  };
  chapters: Array<{ index: number; title: string | null; content: string; summary: string | null }>;
  characters: Array<{ name: string; role: string; desc: string; currentState: string | null }>;
  memories: Array<{ kind: string; priority: number; content: string }>;
  timelineEvents: Array<{ chapterIndex: number | null; title: string | null; summary: string }>;
}) {
  const chapterBlock = params.chapters
    .map((chapter) => [
      `第${chapter.index}章 ${chapter.title ?? ""}`,
      chapter.summary ? `摘要：${chapter.summary}` : "",
      `正文节选：${chapter.content.slice(0, 1800)}${chapter.content.length > 1800 ? "\n...\n" + chapter.content.slice(-900) : ""}`,
    ].filter(Boolean).join("\n"))
    .join("\n\n");

  return [
    "请对全书做剧情一致性检查，只输出严格 JSON，不要 Markdown。",
    '输出格式：{"score":0-100,"issues":[{"severity":"low|medium|high","type":"character|timeline|setting|plot|style|other","title":"问题标题","description":"具体问题","suggestion":"修改建议"}],"severeProblems":["高危问题"],"mediumProblems":["中危问题"],"suggestions":["建议"],"autoFixPrompt":"修复提示词","scope":"book"}',
    "重点检查：人名错误、设定冲突、人物性格崩坏、时间线冲突、地点冲突、伏笔未回收、上下章衔接问题、重复剧情、注水废话。",
    "",
    `作品：${params.work.title}`,
    `类型：${params.work.workType}`,
    `题材：${params.work.tag}`,
    `大纲：${JSON.stringify(params.work.outline).slice(0, 6000)}`,
    `CanonState：${JSON.stringify(params.work.canonState).slice(0, 4000)}`,
    "",
    "角色：",
    params.characters.map((item) => `- ${item.name}（${item.role}）：${item.desc}${item.currentState ? `；当前状态：${item.currentState}` : ""}`).join("\n") || "无",
    "",
    "写作记忆：",
    params.memories.map((item) => `- [${item.kind}/${item.priority}] ${item.content}`).join("\n") || "无",
    "",
    "时间线：",
    params.timelineEvents.map((item) => `- 第${item.chapterIndex ?? "全局"}章 ${item.title ?? ""}：${item.summary}`).join("\n") || "无",
    "",
    "章节：",
    chapterBlock.slice(0, 42_000),
  ].join("\n");
}

async function runBookConsistencyJob(job: GenerationJob) {
  const user = await loadJobUser(job);
  const [work, chapters, characters, memories, timelineEvents] = await Promise.all([
    prisma.work.findUnique({
      where: { id: job.novelId },
      select: { title: true, workType: true, tag: true, outline: true, canonState: true, deletedAt: true },
    }),
    prisma.chapter.findMany({
      where: { workId: job.novelId, deletedAt: null, content: { not: "" } },
      orderBy: { index: "asc" },
      take: 240,
      select: { index: true, title: true, content: true, summary: true },
    }),
    prisma.character.findMany({
      where: { novelId: job.novelId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 40,
      select: { name: true, role: true, desc: true, currentState: true },
    }),
    prisma.writingMemory.findMany({
      where: { novelId: job.novelId, isActive: true },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      take: 60,
      select: { kind: true, priority: true, content: true },
    }),
    prisma.timelineEvent.findMany({
      where: { novelId: job.novelId, deletedAt: null },
      orderBy: [{ chapterIndex: "asc" }, { order: "asc" }],
      take: 120,
      select: { chapterIndex: true, title: true, summary: true },
    }),
  ]);

  if (!work || work.deletedAt) throw new Error("作品不存在或已删除。");
  if (!chapters.length) throw new Error("作品正文为空，无法执行全书一致性检查。");

  const aiModelConfig = await getAiModelConfig();
  const target = aiModelConfig.chapterRewrite;
  const providers = buildAiProviderChain({
    providers: getAiProvidersFromEnv(),
    preferredProviderId: target.providerId,
    overrideModel: target.model,
  });
  if (!providers.length) throw new Error("AI 未配置，无法执行一致性检查。");

  const systemTemplate = await getActivePromptTemplate(
    AI_ACTIONS.chapterConsistency,
    "你是中文小说连续性审校编辑，只返回可解析的一致性检查 JSON。",
  );
  const prompt = buildBookConsistencyPrompt({
    work,
    chapters,
    characters,
    memories,
    timelineEvents,
  });
  const result = await runAiForJob({
    user,
    job,
    estimatedTokens: 4200,
    estimatedOutputChars: 6000,
    execute: () =>
      callAiText({
        providers,
        routeId: target.providerId,
        preferredProviderId: providers[0]?.id,
        messages: [
          { role: "system", content: systemTemplate.content },
          { role: "user", content: prompt },
        ],
        temperature: 0.18,
        maxTokens: 4200,
        attempts: 1,
        reasoningEffort: "low",
      }),
  });
  if (!result.ok || !result.text) {
    throw new Error(getReadableAiErrorMessage(result, "全书一致性检查失败。"));
  }

  const parsed = chapterConsistencyResultSchema.safeParse(extractJson(result.text));
  if (!parsed.success) throw new Error("AI 一致性检查结果解析失败，请稍后重试。");
  const output: ChapterConsistencyResult = { ...parsed.data, scope: "book" };
  const usage = addUsage(usageFromJob(job), result);
  return {
    resultJson: output as Prisma.InputJsonValue,
    resultSummary: `全书一致性检查完成，score=${output.score}，issues=${output.issues.length}`,
    usage,
  };
}

function resolveBatchIndexes(value: z.infer<typeof batchGenerateJobJsonSchema>) {
  if (value.indexes?.length) return Array.from(new Set(value.indexes)).sort((a, b) => a - b);
  const start = value.startIndex ?? 1;
  const count = value.count ?? 1;
  return Array.from({ length: count }, (_, offset) => start + offset);
}

async function runBatchGenerateJob(job: GenerationJob) {
  const user = await loadJobUser(job);
  if (!user) throw new Error("批量章节生成任务缺少用户。");
  const parsed = batchGenerateJobJsonSchema.parse(job.resultJson ?? {});
  const indexes = resolveBatchIndexes(parsed);
  const generated = new Set(parsed.generated);
  const providersFromEnv = getAiProvidersFromEnv();

  for (const index of indexes) {
    if (generated.has(index)) continue;
    await assertCanCreateChapter(user, job.novelId, { index });
    const cached = await getCompletedChapterGenerationResult({
      userId: user.id,
      workId: job.novelId,
      index,
      idempotencyKey: `batch-${job.id}-${index}`,
    });
    if (!cached) {
      await generateChapterForUser({
        input: {
          workId: job.novelId,
          index,
          extraPrompt: parsed.extraPrompt,
          idempotencyKey: `batch-${job.id}-${index}`,
        },
        providersFromEnv,
        user,
      });
    }
    generated.add(index);
    await updateJobProgress({
      jobId: job.id,
      resultJson: {
        ...parsed,
        generated: Array.from(generated).sort((a, b) => a - b),
      } as Prisma.InputJsonValue,
      resultSummary: `批量章节生成进度：${generated.size}/${indexes.length}`,
    });
  }

  const childJobs = await prisma.generationJob.aggregate({
    where: {
      novelId: job.novelId,
      idempotencyKey: { in: indexes.map((index) => `batch-${job.id}-${index}`) },
    },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      totalTokens: true,
      durationMs: true,
    },
  });

  return {
    resultJson: {
      ...parsed,
      indexes,
      generated: Array.from(generated).sort((a, b) => a - b),
    } as Prisma.InputJsonValue,
    resultSummary: `批量章节生成完成：${generated.size}/${indexes.length}`,
    usage: {
      inputTokens: childJobs._sum.inputTokens ?? 0,
      outputTokens: childJobs._sum.outputTokens ?? 0,
      totalTokens: childJobs._sum.totalTokens ?? 0,
      durationMs: childJobs._sum.durationMs ?? 0,
    },
  };
}

async function runBibleExtractJob(job: GenerationJob) {
  const user = await loadJobUser(job);
  if (!user) throw new Error("故事圣经提取任务缺少用户。");
  if (!job.chapterId || !job.chapterIndex) throw new Error("故事圣经提取任务缺少章节信息。");

  const ok = await runChapterContextExtraction({
    user,
    workId: job.novelId,
    chapterId: job.chapterId,
    index: job.chapterIndex,
    trigger: "save",
    force: true,
    generationJobId: job.id,
  });

  return {
    resultJson: { extracted: ok, chapterIndex: job.chapterIndex } as Prisma.InputJsonValue,
    resultSummary: ok ? `已提取第 ${job.chapterIndex} 章故事圣经。` : "故事圣经提取被节流或跳过。",
    usage: usageFromJob(job),
  };
}

async function runClaimedJob(job: GenerationJob) {
  switch (job.jobType) {
    case "chapter.consistency.book":
      return runBookConsistencyJob(job);
    case "short_story.generate.long":
      return runLongShortStoryJob(job);
    case "chapter.batch_generate":
      return runBatchGenerateJob(job);
    case "bible.extract":
      return runBibleExtractJob(job);
    default:
      throw new Error(`不支持的 GenerationJob 类型：${job.jobType || "unknown"}`);
  }
}

export async function runGenerationJob(
  jobId: string,
  options: { retryFailed?: boolean } = {},
) {
  const existing = await prisma.generationJob.findUnique({
    where: { id: jobId },
    select: { resultJson: true, status: true },
  });
  if (
    existing &&
    !options.retryFailed &&
    !shouldAutoRunGenerationJob(existing.resultJson, GENERATION_JOB_MAX_AUTO_FAILURES)
  ) {
    return { jobId, status: "skipped" as const, message: "failure_limit_reached" };
  }

  const now = new Date();
  const runnableStatuses: GenerationJobStatus[] = options.retryFailed
    ? ["queued", "stale", "failed"]
    : ["queued", "stale"];
  const claimed = await prisma.generationJob.updateMany({
    where: {
      id: jobId,
      status: { in: runnableStatuses },
      jobType: { in: [...SUPPORTED_JOB_TYPES] },
    },
    data: {
      status: "running",
      startedAt: now,
      heartbeatAt: now,
      finishedAt: null,
      completedAt: null,
      error: null,
      errorMessage: null,
    },
  });

  if (claimed.count === 0) return { jobId, status: "skipped" as const };

  const job = await prisma.generationJob.findUnique({ where: { id: jobId } });
  if (!job || !isSupportedJobType(job.jobType)) return { jobId, status: "skipped" as const };

  try {
    const result = await runClaimedJob(job);
    const finishedAt = new Date();
    await prisma.generationJob.update({
      where: { id: job.id },
      data: {
        status: "succeeded",
        resultJson: result.resultJson,
        resultSummary: result.resultSummary,
        inputTokens: result.usage.inputTokens || null,
        outputTokens: result.usage.outputTokens || null,
        totalTokens: result.usage.totalTokens || null,
        durationMs: result.usage.durationMs || null,
        heartbeatAt: finishedAt,
        finishedAt,
        completedAt: finishedAt,
        error: null,
        errorMessage: null,
      },
    });
    return { jobId, status: "succeeded" as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "GenerationJob 执行失败。";
    const finishedAt = new Date();
    const failureCount = getGenerationJobFailureCount(job.resultJson) + 1;
    await prisma.generationJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        error: message,
        errorMessage: message,
        resultJson: withGenerationJobFailureCount(job.resultJson, failureCount) as Prisma.InputJsonValue,
        resultSummary:
          failureCount >= GENERATION_JOB_MAX_AUTO_FAILURES
            ? `${message}（已连续失败 ${failureCount} 次，停止自动重试）`
            : message,
        heartbeatAt: finishedAt,
        finishedAt,
        completedAt: finishedAt,
      },
    });
    return { jobId, status: "failed" as const, message };
  }
}

export async function runPendingGenerationJobs(options?: RunJobOptions) {
  const parsed = runJobOptionsSchema.parse(options ?? {});
  await markSupportedStaleGenerationJobs();
  await markStaleGenerationJobs();
  const executableStatuses: GenerationJobStatus[] = parsed.jobId
    ? ["queued", "stale", "failed"]
    : parsed.includeFailed
      ? ["queued", "stale", "failed"]
      : ["queued", "stale"];
  const filteredStatuses =
    parsed.status === "all"
      ? executableStatuses
      : executableStatuses.includes(parsed.status as GenerationJobStatus)
        ? [parsed.status as GenerationJobStatus]
        : [];
  if (!filteredStatuses.length) {
    return {
      scanned: 0,
      results: [],
    };
  }
  const jobs = await prisma.generationJob.findMany({
    where: {
      ...(parsed.jobId ? { id: parsed.jobId } : {}),
      status: { in: filteredStatuses },
      jobType: { in: [...SUPPORTED_JOB_TYPES] },
    },
    orderBy: [{ createdAt: "asc" }],
    take: parsed.jobId ? 1 : parsed.limit,
  });

  const results = [];
  for (const job of jobs) {
    const retryFailed = Boolean(parsed.jobId || (parsed.includeFailed && job.status === "failed"));
    results.push(await runGenerationJob(job.id, { retryFailed }));
  }

  return {
    scanned: jobs.length,
    results,
  };
}

export { SUPPORTED_JOB_TYPES };

"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { apiRequest, firstFieldErrors } from "@/lib/client/auth-api";
import {
  SHORT_STORY_ENDING_TYPES,
  SHORT_STORY_POV_OPTIONS,
  SHORT_STORY_STRUCTURE_TEMPLATES,
  SHORT_STORY_STYLE_OPTIONS,
  SHORT_STORY_WORD_OPTIONS,
  shortStoryInputSchema,
  type ShortStoryEndingType,
  type ShortStoryInput,
} from "@/shared/schemas/short-story";
import type { SerializedGenerationJob } from "@/shared/schemas/generation-job";

type ShortStoryStage = "idle" | "outline" | "work" | "queued" | "failed" | "done";
type ShortStoryGenerateResponse = {
  workId: string;
  jobId?: string | null;
  status?: string;
  async?: boolean;
};

type FieldErrors = Partial<Record<keyof ShortStoryInput | "tagsText" | "customWords", string>>;

const DEFAULT_WORDS = SHORT_STORY_WORD_OPTIONS[1];

function splitTags(value: string) {
  return value
    .split(/[\s,，、/]+/g)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function zodFieldErrors(input: unknown) {
  const parsed = shortStoryInputSchema.safeParse(input);
  if (parsed.success) return { input: parsed.data, errors: {} as FieldErrors };

  const errors: FieldErrors = {};
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? "idea") as keyof FieldErrors;
    if (!errors[key]) errors[key] = issue.message;
  }

  return { input: null, errors };
}

export function useShortStoryCreate() {
  const router = useRouter();
  const [genre, setGenre] = useState("悬疑");
  const [tagsText, setTagsText] = useState("");
  const [targetPreset, setTargetPreset] = useState(String(DEFAULT_WORDS));
  const [customWords, setCustomWords] = useState(String(DEFAULT_WORDS));
  const [style, setStyle] = useState<(typeof SHORT_STORY_STYLE_OPTIONS)[number]>("番茄");
  const [structureTemplate, setStructureTemplate] =
    useState<(typeof SHORT_STORY_STRUCTURE_TEMPLATES)[number]>("三幕式");
  const [pov, setPov] = useState<(typeof SHORT_STORY_POV_OPTIONS)[number]>("第三人称");
  const [endingType, setEndingType] = useState<ShortStoryEndingType>("twist");
  const [idea, setIdea] = useState("");
  const [stage, setStage] = useState<ShortStoryStage>("idle");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [asyncJobId, setAsyncJobId] = useState<string | null>(null);
  const [asyncWorkId, setAsyncWorkId] = useState<string | null>(null);
  const [asyncJob, setAsyncJob] = useState<SerializedGenerationJob | null>(null);
  const [retrying, setRetrying] = useState(false);

  const busy = stage === "outline" || stage === "work" || stage === "queued" || retrying;
  const targetWords = targetPreset === "custom" ? Number(customWords) : Number(targetPreset);
  const tags = useMemo(() => splitTags(tagsText), [tagsText]);
  const ideaCount = idea.trim().length;
  const asyncProgress = useMemo(() => {
    const progress = asyncJob?.progress;
    if (!progress) return null;
    return {
      generatedSegments: progress.generatedSegments,
      totalSegments: progress.totalSegments,
      label:
        typeof progress.totalSegments === "number"
          ? `${progress.generatedSegments}/${progress.totalSegments}`
          : progress.generatedSegments
            ? `${progress.generatedSegments}`
            : null,
    };
  }, [asyncJob]);

  const input = useMemo(
    () => ({
      genre,
      tags,
      targetWords,
      style,
      structureTemplate,
      pov,
      endingType,
      idea,
    }),
    [endingType, genre, idea, pov, structureTemplate, style, tags, targetWords],
  );

  const validation = useMemo(() => zodFieldErrors(input), [input]);

  const loadAsyncJob = useCallback(
    async (jobId: string) => {
      const jobRes = await apiRequest<SerializedGenerationJob>(
        `/api/jobs/${encodeURIComponent(jobId)}`,
        undefined,
        { redirectOnUnauthorized: true },
      );
      if (!jobRes.success || !jobRes.data) {
        setFormError(jobRes.message || "任务状态读取失败，请稍后刷新。");
        return null;
      }

      const job = jobRes.data;
      setAsyncJob(job);
      setAsyncWorkId(job.workId || job.progress?.finalWorkId || asyncWorkId);

      if (job.status === "succeeded" || job.status === "success") {
        setStage("done");
        router.replace(`/dashboard/work/${job.progress?.finalWorkId || job.workId || asyncWorkId}`);
      } else if (job.status === "failed") {
        setStage("failed");
        setFormError(job.errorMessage || "后台生成失败，可以点击重试继续执行。");
      } else {
        setStage("queued");
        setFormError("");
      }

      return job;
    },
    [asyncWorkId, router],
  );

  useEffect(() => {
    if (!asyncJobId) return;
    const shouldPoll =
      !asyncJob || asyncJob.status === "queued" || asyncJob.status === "running" || asyncJob.status === "stale";
    if (!shouldPoll) return;

    const firstTimer = window.setTimeout(() => {
      void loadAsyncJob(asyncJobId);
    }, 300);
    const timer = window.setInterval(() => {
      void loadAsyncJob(asyncJobId);
    }, 2500);

    return () => {
      window.clearTimeout(firstTimer);
      window.clearInterval(timer);
    };
  }, [asyncJob, asyncJobId, loadAsyncJob]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const localValidation = zodFieldErrors(input);
    if (!localValidation.input) {
      setFieldErrors(localValidation.errors);
      setFormError("请先补齐短篇创作参数。");
      return;
    }

    setFieldErrors({});
    setFormError("");
    setAsyncJob(null);
    setAsyncJobId(null);
    setAsyncWorkId(null);
    setStage("outline");

    setStage("work");
    const workRes = await apiRequest<ShortStoryGenerateResponse>("/api/ai/short-story", localValidation.input);

    if (!workRes.success || !workRes.data?.workId) {
      setStage("idle");
      setFieldErrors(firstFieldErrors(workRes.fieldErrors) as FieldErrors);
      setFormError(workRes.message || "短篇作品生成失败，请稍后重试。");
      return;
    }

    if (workRes.data.async && workRes.data.jobId) {
      setAsyncWorkId(workRes.data.workId);
      setAsyncJobId(workRes.data.jobId);
      setAsyncJob({
        id: workRes.data.jobId,
        workId: workRes.data.workId,
        action: "short_story.generate",
        jobType: "short_story.generate.long",
        status: "queued",
        resultSummary: "后台生成任务已排队，正在等待执行。",
        errorMessage: null,
        resultJson: null,
        progress: { generatedSegments: 0, totalSegments: null, finalWorkId: null },
        chapterIndex: null,
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        durationMs: null,
        createdAt: new Date().toISOString(),
        startedAt: null,
        heartbeatAt: null,
        finishedAt: null,
        completedAt: null,
        work: null,
      });
      setStage("queued");
      return;
    }

    setStage("done");
    router.replace(`/dashboard/work/${workRes.data.workId}`);
  }

  async function retryAsyncJob() {
    if (!asyncJobId || retrying) return;
    setRetrying(true);
    setFormError("");
    const retryRes = await apiRequest<SerializedGenerationJob>(
      `/api/jobs/${encodeURIComponent(asyncJobId)}/retry`,
      {},
      { redirectOnUnauthorized: true },
    );
    setRetrying(false);

    if (!retryRes.success || !retryRes.data) {
      setStage("failed");
      setFormError(retryRes.message || "任务重试失败，请稍后再试。");
      return;
    }

    setAsyncJob(retryRes.data);
    setAsyncWorkId(retryRes.data.workId || asyncWorkId);
    setStage("queued");
  }

  return {
    asyncJob,
    asyncJobId,
    asyncProgress,
    asyncWorkId,
    busy,
    customWords,
    endingType,
    fieldErrors,
    formError,
    genre,
    handleSubmit,
    idea,
    ideaCount,
    inputValid: Boolean(validation.input),
    pov,
    retryAsyncJob,
    retrying,
    setCustomWords,
    setEndingType,
    setFormError,
    setGenre,
    setIdea,
    setPov,
    setStructureTemplate,
    setStyle,
    setTagsText,
    setTargetPreset,
    stage,
    style,
    structureTemplate,
    tags,
    tagsText,
    targetPreset,
    targetWords,
    wordOptions: SHORT_STORY_WORD_OPTIONS,
    structureTemplateOptions: SHORT_STORY_STRUCTURE_TEMPLATES,
    styleOptions: SHORT_STORY_STYLE_OPTIONS,
    povOptions: SHORT_STORY_POV_OPTIONS,
    endingOptions: SHORT_STORY_ENDING_TYPES,
  };
}

export type ShortStoryCreateController = ReturnType<typeof useShortStoryCreate>;

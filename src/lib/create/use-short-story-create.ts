"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";

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

type ShortStoryStage = "idle" | "outline" | "work" | "done";

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

  const busy = stage === "outline" || stage === "work";
  const targetWords = targetPreset === "custom" ? Number(customWords) : Number(targetPreset);
  const tags = useMemo(() => splitTags(tagsText), [tagsText]);
  const ideaCount = idea.trim().length;

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
    setStage("outline");

    setStage("work");
    const workRes = await apiRequest<{ workId: string }>("/api/ai/short-story", localValidation.input);

    if (!workRes.success || !workRes.data?.workId) {
      setStage("idle");
      setFieldErrors(firstFieldErrors(workRes.fieldErrors) as FieldErrors);
      setFormError(workRes.message || "短篇作品生成失败，请稍后重试。");
      return;
    }

    setStage("done");
    router.replace(`/dashboard/work/${workRes.data.workId}`);
  }

  return {
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

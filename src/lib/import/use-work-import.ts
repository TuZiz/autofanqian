"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { apiRequest } from "@/lib/client/auth-api";
import type { ImportedChapter, ImportedNovelParseResult } from "@/lib/import/novel-import-parser";
import type { WorkTypeValue } from "@/shared/work-type";

type ImportStage = "idle" | "previewing" | "ready" | "confirming" | "done";

function splitTags(value: string) {
  return value
    .split(/[\s,，、]+/g)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function extensionOf(filename: string) {
  const index = filename.lastIndexOf(".");
  return index >= 0 ? filename.slice(index).toLowerCase() : "";
}

export function useWorkImport() {
  const router = useRouter();
  const [workType, setWorkType] = useState<WorkTypeValue>("long_novel");
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [platform, setPlatform] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [rawText, setRawText] = useState("");
  const [preview, setPreview] = useState<ImportedNovelParseResult | null>(null);
  const [stage, setStage] = useState<ImportStage>("idle");
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  const tags = useMemo(() => splitTags(tagsText), [tagsText]);
  const busy = stage === "previewing" || stage === "confirming";
  const totalPreviewWords = preview?.totalWords ?? 0;
  const singleLongImportWarning = Boolean(
    workType === "long_novel" &&
      preview?.warnings.some((warning) => warning.includes("单章长篇导入")),
  );

  function clearPreview() {
    setPreview(null);
    setStage("idle");
  }

  async function handleFileChange(file: File | null) {
    if (!file) return;
    const extension = extensionOf(file.name);
    if (extension !== ".txt" && extension !== ".md") {
      setError("只支持导入 .txt 或 .md 文件。");
      return;
    }

    setError("");
    setFileName(file.name);
    const text = await file.text();
    setRawText(text);
    clearPreview();
    if (!title.trim()) {
      setTitle(file.name.replace(/\.(txt|md)$/i, "").slice(0, 120));
    }
  }

  async function handlePreview() {
    if (busy) return;
    setError("");
    setStage("previewing");

    const res = await apiRequest<ImportedNovelParseResult>(
      "/api/works/import/preview",
      {
        workType,
        title,
        genre,
        tags,
        platform,
        synopsis,
        rawText,
      },
      { method: "POST" },
    );

    if (!res.success || !res.data) {
      setError(res.message || "导入预览失败，请检查文本格式。");
      setStage("idle");
      return;
    }

    setPreview(res.data);
    setStage("ready");
  }

  async function handleConfirm() {
    if (busy || !preview?.chapters.length) return;
    setError("");
    setStage("confirming");

    const res = await apiRequest<{ workId: string }>(
      "/api/works/import/confirm",
      {
        workType,
        title,
        genre,
        tags,
        platform,
        synopsis,
        chapters: preview.chapters.map((chapter: ImportedChapter) => ({
          index: chapter.index,
          title: chapter.title,
          content: chapter.content,
        })),
      },
      { method: "POST" },
    );

    if (!res.success || !res.data?.workId) {
      setError(res.message || "导入失败，请稍后重试。");
      setStage("ready");
      return;
    }

    setStage("done");
    router.replace(`/dashboard/work/${res.data.workId}`);
  }

  return {
    busy,
    clearPreview,
    error,
    fileName,
    genre,
    handleConfirm,
    handleFileChange,
    handlePreview,
    platform,
    preview,
    rawText,
    setError,
    setGenre: (value: string) => {
      setGenre(value);
      clearPreview();
    },
    setPlatform: (value: string) => {
      setPlatform(value);
      clearPreview();
    },
    setRawText: (value: string) => {
      setRawText(value);
      clearPreview();
    },
    setSynopsis: (value: string) => {
      setSynopsis(value);
      clearPreview();
    },
    setTagsText: (value: string) => {
      setTagsText(value);
      clearPreview();
    },
    setTitle: (value: string) => {
      setTitle(value);
      clearPreview();
    },
    setWorkType: (value: WorkTypeValue) => {
      setWorkType(value);
      clearPreview();
    },
    singleLongImportWarning,
    stage,
    synopsis,
    tags,
    tagsText,
    title,
    totalPreviewWords,
    workType,
  };
}

export type WorkImportController = ReturnType<typeof useWorkImport>;

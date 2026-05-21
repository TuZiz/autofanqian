"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { apiRequest } from "@/lib/client/auth-api";
import { cn } from "@/lib/utils";
import type {
  WorkExportFormat,
  WorkExportPreview,
  WorkExportScope,
} from "@/shared/schemas/work-export";

type ExportDownloadButtonProps = {
  workId: string;
  scope: WorkExportScope;
  format: WorkExportFormat;
  chapterIndex?: number;
  ariaLabel?: string;
  className?: string;
  title?: string;
  children: ReactNode;
};

function buildQuery(scope: WorkExportScope, chapterIndex?: number, format?: WorkExportFormat) {
  const query = new URLSearchParams({ scope });
  if (format) query.set("format", format);
  if (chapterIndex) query.set("chapterIndex", String(chapterIndex));
  return query.toString();
}

function formatPreviewMessage(preview: WorkExportPreview) {
  return [
    "导出预检发现以下提醒：",
    ...preview.warnings,
    "",
    `章节数：${preview.chapterCount}`,
    `总字数：${preview.totalWordCount.toLocaleString("zh-CN")}`,
    "",
    "仍然继续下载吗？",
  ].join("\n");
}

export function ExportDownloadButton({
  chapterIndex,
  ariaLabel,
  children,
  className,
  format,
  scope,
  title,
  workId,
}: ExportDownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const urls = useMemo(() => {
    const base = `/api/works/${encodeURIComponent(workId)}/export`;
    return {
      preview: `${base}/preview?${buildQuery(scope, chapterIndex)}`,
      download: `${base}?${buildQuery(scope, chapterIndex, format)}`,
    };
  }, [chapterIndex, format, scope, workId]);

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    const previewRes = await apiRequest<WorkExportPreview>(urls.preview, undefined, {
      redirectOnUnauthorized: true,
    });
    setLoading(false);

    if (!previewRes.success || !previewRes.data) {
      window.alert(previewRes.message || "导出预检失败，请稍后再试。");
      return;
    }

    if (previewRes.data.warnings.length && !window.confirm(formatPreviewMessage(previewRes.data))) {
      return;
    }

    window.location.href = urls.download;
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={loading}
      aria-busy={loading}
      aria-label={ariaLabel ?? title}
      className={cn(className, loading ? "cursor-wait opacity-70" : "")}
      title={title}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : children}
    </button>
  );
}

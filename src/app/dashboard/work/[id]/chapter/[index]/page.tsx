"use client";

import { useParams, useSearchParams } from "next/navigation";

import { ChapterEditorView } from "@/components/workbench/chapter-editor-view";
import { WorkLoadingScreen } from "@/components/workbench/work-loading-screen";
import { useWorkChapterEditor } from "@/lib/workbench/use-work-chapter-editor";

export default function DashboardWorkChapterPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const workId = typeof params?.id === "string" ? params.id : "";
  const indexRaw = typeof params?.index === "string" ? params.index : "";
  const chapterIndex = Number.parseInt(indexRaw, 10);
  const editor = useWorkChapterEditor({
    autoAi: searchParams.get("ai") === "1",
    chapterIndex,
    workId,
  });

  if (editor.bootstrapLoading) {
    return <WorkLoadingScreen label="正在加载章节..." />;
  }

  return <ChapterEditorView editor={editor} />;
}

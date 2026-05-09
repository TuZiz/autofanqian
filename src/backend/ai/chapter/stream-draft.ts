import { countWords } from "@/lib/ai/chapter-generate-shared";
import { prisma } from "@/lib/prisma";

export function extractTitleAndContentFromStream(raw: string) {
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

export function buildStreamMessages(input: {
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

export async function saveDraftPreview(params: {
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

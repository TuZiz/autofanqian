import { Prisma } from "@prisma/client";

import { parseImportedNovelText } from "@/lib/import/novel-import-parser";
import { prisma } from "@/lib/prisma";
import {
  IMPORT_CHAPTER_CONTENT_MAX_LENGTH,
  IMPORT_MAX_CHAPTERS,
  type WorkImportConfirmInput,
  type WorkImportPreviewInput,
} from "@/shared/schemas/work-import";
import { isShortStoryWork } from "@/shared/work-type";
import { AuthApiError } from "@/lib/auth/errors";

function countWords(text: string) {
  return text.replace(/\s+/g, "").length;
}

function normalizeTags(tags: string[]) {
  return tags.map((tag) => tag.trim()).filter(Boolean).slice(0, 12);
}

function buildSynopsis(input: {
  synopsis?: string | null;
  title: string;
  content: string;
}) {
  const explicit = input.synopsis?.trim();
  if (explicit) return explicit;

  const preview = input.content.replace(/\s+/g, " ").trim().slice(0, 180);
  return preview
    ? `导入作品《${input.title}》：${preview}`
    : `导入作品《${input.title}》。`;
}

function buildLongOutline(body: WorkImportConfirmInput, totalWords: number) {
  const chapterCount = body.chapters.length;
  return {
    tag: (body.tags[0] || body.genre).slice(0, 12),
    title: body.title,
    synopsis: buildSynopsis({
      synopsis: body.synopsis,
      title: body.title,
      content: body.chapters[0]?.content ?? "",
    }),
    totalChapters: chapterCount,
    targetChapters: chapterCount,
    plannedUntilChapter: chapterCount,
    planningMode: "progressive",
    importMeta: {
      source: "import",
      platform: body.platform,
      totalWords,
    },
    volumes: [
      {
        name: "导入正文",
        desc: `从本地文本导入，共 ${chapterCount} 章，约 ${totalWords} 字。`,
        startChapter: 1,
        endChapter: chapterCount,
        detailLevel: "detailed",
        status: "completed",
        segments: [
          {
            title: "导入章节",
            startChapter: 1,
            endChapter: chapterCount,
            desc: "导入时自动生成的基础章节结构，可在后续写作中继续整理细纲。",
            status: "written",
          },
        ],
      },
    ],
    characters: [],
  };
}

function buildShortOutline(body: WorkImportConfirmInput, totalWords: number) {
  const chapter = body.chapters[0];
  return {
    tag: (body.tags[0] || body.genre).slice(0, 12),
    title: body.title,
    synopsis: buildSynopsis({
      synopsis: body.synopsis,
      title: body.title,
      content: chapter?.content ?? "",
    }),
    targetWords: totalWords,
    theme: body.genre,
    hook: (chapter?.content ?? body.title).slice(0, 200),
    endingType: "open",
    characters: [
      {
        name: "主角",
        role: "导入短篇核心视角",
        description: "由导入正文自动生成的基础角色占位，可在人物档案中继续整理。",
      },
    ],
    beats: [
      {
        index: 1,
        title: chapter?.title || "导入短篇",
        purpose: "承载导入短篇全文。",
        targetWords: totalWords,
        writingPrompt: "导入正文已作为完整短篇保存。",
      },
    ],
    fullOutline: `导入短篇《${body.title}》，题材：${body.genre}，标签：${normalizeTags(body.tags).join("、") || "无"}。`,
    importMeta: {
      source: "import",
      platform: body.platform,
      totalWords,
    },
  };
}

function buildOutline(body: WorkImportConfirmInput, totalWords: number) {
  return isShortStoryWork(body.workType)
    ? buildShortOutline(body, totalWords)
    : buildLongOutline(body, totalWords);
}

function validateParsedPreview(chapters: Array<{ content: string }>) {
  if (chapters.length > IMPORT_MAX_CHAPTERS) {
    throw new AuthApiError(400, "单次最多导入 1000 章，请拆分后再导入。");
  }

  const oversized = chapters.find(
    (chapter) => chapter.content.length > IMPORT_CHAPTER_CONTENT_MAX_LENGTH,
  );
  if (oversized) {
    throw new AuthApiError(400, "单章正文不能超过 200000 字符，请拆分后再导入。");
  }
}

export function previewImportedWork(body: WorkImportPreviewInput) {
  const parsed = parseImportedNovelText({
    rawText: body.rawText,
    workType: body.workType,
  });
  validateParsedPreview(parsed.chapters);

  if (!parsed.chapters.length) {
    throw new AuthApiError(400, "没有识别到可导入的正文内容。");
  }

  return parsed;
}

export async function confirmImportedWork(params: {
  body: WorkImportConfirmInput;
  userId: string;
}) {
  const { body, userId } = params;
  const tags = normalizeTags(body.tags);
  const parsedChapters = body.chapters
    .slice()
    .sort((left, right) => left.index - right.index)
    .map((chapter) => ({
      ...chapter,
      title: chapter.title.trim() || `第 ${chapter.index} 章`,
      content: chapter.content.trim(),
      wordCount: countWords(chapter.content),
    }));
  const chapters = isShortStoryWork(body.workType)
    ? [
        {
          index: 1,
          title: body.title,
          content: parsedChapters
            .map((chapter) => `# ${chapter.title}\n\n${chapter.content}`)
            .join("\n\n")
            .trim(),
          wordCount: countWords(parsedChapters.map((chapter) => chapter.content).join("\n")),
        },
      ]
    : parsedChapters;

  if (chapters.some((chapter) => !chapter.content)) {
    throw new AuthApiError(400, "不能导入空正文章节。");
  }

  const totalWords = chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0);
  const targetChapters = isShortStoryWork(body.workType) ? 1 : chapters.length;
  const synopsis = buildSynopsis({
    synopsis: body.synopsis,
    title: body.title,
    content: chapters[0]?.content ?? "",
  });
  const outline = buildOutline({ ...body, tags, chapters }, totalWords);

  const work = await prisma.$transaction(async (tx) => {
    const created = await tx.work.create({
      data: {
        userId,
        workType: body.workType,
        genreId: body.genre,
        genreLabel: body.genre,
        idea: `导入作品：${body.title}`,
        tags,
        platformId: body.platform || null,
        platformLabel: body.platform || null,
        words: `${totalWords} 字`,
        dnaBookTitle: null,
        tag: (tags[0] || body.genre).slice(0, 12),
        title: body.title,
        synopsis,
        outline: outline as Prisma.InputJsonValue,
        rawOutline: {
          ...outline,
          importedAt: new Date().toISOString(),
          importSource: "POST /api/works/import/confirm",
        } as Prisma.InputJsonValue,
        targetChapters,
        plannedUntilChapter: targetChapters,
        planningMode: "progressive",
      },
      select: { id: true },
    });

    await tx.chapter.createMany({
      data: chapters.map((chapter) => ({
        workId: created.id,
        index: chapter.index,
        title: chapter.title,
        content: chapter.content,
        wordCount: chapter.wordCount,
        status: "written",
        details: ["导入作品正文"],
      })),
    });

    await tx.writingMemory.createMany({
      data: [
        {
          novelId: created.id,
          kind: "fact",
          priority: 80,
          source: "work_import",
          content: "作品来源：用户导入全文。",
        },
        {
          novelId: created.id,
          kind: "style",
          priority: 70,
          source: "work_import",
          content: `标签：${tags.join("、") || "无"}`,
        },
        {
          novelId: created.id,
          kind: "style",
          priority: 70,
          source: "work_import",
          content: `平台风格：${body.platform || "未指定"}`,
        },
        {
          novelId: created.id,
          kind: "continuity",
          priority: 75,
          source: "work_import",
          content: `导入总字数：${totalWords} 字，共 ${chapters.length} 章。`,
        },
      ],
    });

    return created;
  });

  return { workId: work.id };
}

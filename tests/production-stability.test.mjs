import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getAiActionAliases, normalizeAiAction, AI_ACTIONS } from "../src/shared/ai-actions.ts";
import { shouldCreateChapterRevisionSnapshot } from "../src/lib/workbench/chapter-revision-policy.ts";
import { inspectExportChapters } from "../src/lib/export/work-export.ts";
import { buildDocxBuffer } from "../src/lib/export/docx.ts";
import {
  getGenerationJobFailureCount,
  shouldAutoRunGenerationJob,
  withGenerationJobFailureCount,
} from "../src/lib/jobs/generation-job-progress.ts";
import { shouldSkipLongShortStoryJobForExistingChapter } from "../src/lib/jobs/long-short-story-job-state.ts";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("AI action helpers normalize legacy keys and expose aliases", () => {
  assert.equal(normalizeAiAction("short-story.generate"), AI_ACTIONS.shortStoryGenerate);
  assert.equal(normalizeAiAction("chapter_consistency_check"), AI_ACTIONS.chapterConsistency);
  assert.equal(normalizeAiAction("chapter_rewrite_polish"), AI_ACTIONS.chapterRewrite);
  assert.ok(getAiActionAliases(AI_ACTIONS.shortStoryGenerate).includes("short_story_outline_generate"));
});

test("chapter revision policy throttles autosave snapshots and preserves AI snapshots", () => {
  const now = new Date("2026-05-21T00:10:00.000Z");
  assert.equal(
    shouldCreateChapterRevisionSnapshot({
      previousContent: "旧正文",
      nextContent: "新正文",
      revisionSource: "ai_rewrite",
      now,
    }).shouldSnapshot,
    true,
  );
  assert.equal(
    shouldCreateChapterRevisionSnapshot({
      previousContent: "a".repeat(20),
      nextContent: "a".repeat(25),
      revisionSource: "manual_save",
      lastRevisionAt: new Date("2026-05-21T00:08:00.000Z"),
      now,
    }).shouldSnapshot,
    false,
  );
  assert.equal(
    shouldCreateChapterRevisionSnapshot({
      previousContent: "a".repeat(20),
      nextContent: "b".repeat(360),
      revisionSource: "manual_save",
      lastRevisionAt: new Date("2026-05-21T00:09:00.000Z"),
      now,
    }).shouldSnapshot,
    true,
  );
});

test("inspectExportChapters reports empty chapters and missing indexes", () => {
  const preview = inspectExportChapters(
    [
      { index: 1, title: "一", content: "正文", wordCount: 2 },
      { index: 3, title: "三", content: "   ", wordCount: 0 },
    ],
    "book",
  );

  assert.equal(preview.chapterCount, 2);
  assert.equal(preview.totalWordCount, 2);
  assert.deepEqual(preview.emptyChapters, [3]);
  assert.deepEqual(preview.missingIndexes, [2]);
  assert.ok(preview.availableFormats.includes("docx"));
  assert.ok(preview.warnings.some((item) => item.includes("空章节")));
});

test("buildDocxBuffer emits a usable OOXML zip skeleton", () => {
  const buffer = buildDocxBuffer({
    title: "测试作品",
    synopsis: "简介",
    workType: "long_novel",
    chapters: [
      { index: 1, title: "开端", content: "第一段\n\n第二段" },
      { index: 2, title: "推进", content: "x".repeat(9000) },
    ],
  });
  const raw = buffer.toString("utf8");

  assert.equal(buffer.readUInt32LE(0), 0x04034b50);
  assert.ok(raw.includes("[Content_Types].xml"));
  assert.ok(raw.includes("word/document.xml"));
  assert.ok(raw.includes("word/styles.xml"));
  assert.ok(raw.includes("word/settings.xml"));
  assert.ok(raw.includes("docProps/core.xml"));
  assert.ok(raw.includes("BlankLine"));
  assert.ok(raw.includes("pageBreakBefore"));
});

test("serializeGenerationJob parses segmented progress", async () => {
  process.env.DATABASE_URL ??= "postgresql://user:pass@localhost:5432/autofanqian_test";
  const { serializeGenerationJob } = await import("../src/lib/jobs/generation-job-view.ts");
  const now = new Date("2026-05-21T00:00:00.000Z");
  const job = serializeGenerationJob({
    id: "job_1",
    userId: "user_1",
    novelId: "work_1",
    workId: "work_1",
    action: AI_ACTIONS.shortStoryGenerate,
    jobType: "short_story.generate.long",
    status: "running",
    resultSummary: "生成中",
    errorMessage: null,
    resultJson: {
      outline: { beats: [{ index: 1 }, { index: 2 }, { index: 3 }] },
      segments: [{ index: 1, content: "a" }, { index: 2, content: "b" }],
      finalWorkId: "work_1",
    },
    chapterIndex: null,
    inputTokens: 1,
    outputTokens: 2,
    totalTokens: 3,
    durationMs: 4,
    createdAt: now,
    startedAt: now,
    heartbeatAt: now,
    finishedAt: null,
    completedAt: null,
    novel: {
      id: "work_1",
      userId: "user_1",
      title: "长短篇",
      workType: "short_story",
    },
  });

  assert.equal(job.progress?.generatedSegments, 2);
  assert.equal(job.progress?.totalSegments, 3);
  assert.equal(job.progress?.finalWorkId, "work_1");
});

test("long short story idempotency helper skips already written final work", () => {
  assert.equal(
    shouldSkipLongShortStoryJobForExistingChapter(
      { finalWorkId: "work_1" },
      { status: "written", content: "已经写好的正文" },
    ),
    true,
  );
  assert.equal(
    shouldSkipLongShortStoryJobForExistingChapter(
      { finalWorkId: "work_1" },
      { status: "draft", content: "草稿" },
    ),
    false,
  );
});

test("generation job failure count gates automatic retries", () => {
  const twice = withGenerationJobFailureCount({ segments: [] }, 2);
  const third = withGenerationJobFailureCount(twice, 3);

  assert.equal(getGenerationJobFailureCount(twice), 2);
  assert.equal(shouldAutoRunGenerationJob(twice, 3), true);
  assert.equal(shouldAutoRunGenerationJob(third, 3), false);
});

test("generation worker script and package command are wired", () => {
  const packageJson = read("package.json");
  const worker = read("scripts/run-generation-worker.mjs");

  assert.match(packageJson, /"worker:generation"/);
  assert.match(worker, /GENERATION_WORKER_INTERVAL_MS/);
  assert.match(worker, /GENERATION_WORKER_BATCH_SIZE/);
  assert.match(worker, /SIGINT/);
  assert.match(worker, /SIGTERM/);
  assert.match(worker, /runPendingGenerationJobs/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildDocxBuffer } from "../src/lib/export/docx.ts";
import { inspectExportChapters } from "../src/lib/export/work-export.ts";
import {
  getGenerationJobFailureCount,
  parseGenerationJobProgress,
  shouldAutoRunGenerationJob,
  withGenerationJobFailureCount,
} from "../src/lib/jobs/generation-job-progress.ts";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function listZipEntries(buffer) {
  const names = [];
  let offset = 0;
  while (offset < buffer.length - 4) {
    const signature = buffer.readUInt32LE(offset);
    if (signature !== 0x04034b50) break;
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const nameEnd = nameStart + fileNameLength;
    names.push(buffer.subarray(nameStart, nameEnd).toString("utf8"));
    offset = nameEnd + extraLength + compressedSize;
  }
  return names;
}

test("release regression: generation job progress and retry helpers stay stable", () => {
  const resultJson = {
    outline: { beats: [{ index: 1 }, { index: 2 }, { index: 3 }] },
    segments: [{ index: 1, content: "a" }, { index: 2, content: "b" }],
    finalWorkId: "work_final",
  };

  const progress = parseGenerationJobProgress(resultJson);
  assert.deepEqual(progress, {
    generatedSegments: 2,
    totalSegments: 3,
    finalWorkId: "work_final",
  });

  assert.equal(getGenerationJobFailureCount(null), 0);
  assert.equal(getGenerationJobFailureCount({ failureCount: 2.8 }), 2);

  const failedTwice = withGenerationJobFailureCount(resultJson, 2);
  const failedThreeTimes = withGenerationJobFailureCount(failedTwice, 3);
  assert.equal(getGenerationJobFailureCount(failedTwice), 2);
  assert.equal(shouldAutoRunGenerationJob(failedTwice, 3), true);
  assert.equal(shouldAutoRunGenerationJob(failedThreeTimes, 3), false);
});

test("release regression: export inspection reports warnings and docx availability", () => {
  const preview = inspectExportChapters(
    [
      { index: 1, title: "第一章", content: "正文", wordCount: 2 },
      { index: 3, title: "第三章", content: "  ", wordCount: 0 },
    ],
    "book",
  );

  assert.equal(preview.chapterCount, 2);
  assert.equal(preview.totalWordCount, 2);
  assert.deepEqual(preview.emptyChapters, [3]);
  assert.deepEqual(preview.missingIndexes, [2]);
  assert.ok(preview.availableFormats.includes("docx"));
  assert.ok(preview.warnings.length >= 2);
});

test("release regression: docx export keeps required OOXML zip parts", () => {
  const buffer = buildDocxBuffer({
    title: "测试作品",
    synopsis: "简介",
    workType: "long_novel",
    chapters: [
      { index: 1, title: "开始", content: "第一段\n\n第二段" },
      { index: 2, title: "推进", content: "x".repeat(10_000) },
    ],
  });
  const entries = listZipEntries(buffer);

  assert.equal(buffer.readUInt32LE(0), 0x04034b50);
  assert.ok(entries.includes("[Content_Types].xml"));
  assert.ok(entries.includes("word/document.xml"));
  assert.ok(entries.includes("word/styles.xml"));
  assert.ok(entries.includes("docProps/core.xml"));
  assert.ok(buffer.toString("utf8").includes("word/document.xml"));
  assert.ok(buffer.toString("utf8").includes("word/styles.xml"));
  assert.ok(buffer.toString("utf8").includes("docProps/core.xml"));
});

test("release regression: ExportDownloadButton previews before download", () => {
  const source = read("src/components/workbench/export-download-button.tsx");
  const previewUrlIndex = source.indexOf("/preview?");
  const previewRequestIndex = source.indexOf("apiRequest<WorkExportPreview>(urls.preview");
  const downloadIndex = source.indexOf("window.location.href = urls.download");

  assert.ok(previewUrlIndex > 0);
  assert.ok(previewRequestIndex > previewUrlIndex);
  assert.ok(downloadIndex > previewRequestIndex);
  assert.match(source, /window\.confirm\(formatPreviewMessage\(previewRes\.data\)\)/);
});

test("release regression: admin jobs view exposes required observability labels", () => {
  const source = read("src/components/admin/admin-jobs-view.tsx");

  assert.ok(source.includes("已停止自动重试"));
  assert.ok(source.includes("等待恢复"));
  assert.ok(source.includes("可能已卡住"));
  assert.ok(source.includes("最近耗时"));
  assert.ok(source.includes("分段进度"));
  assert.ok(source.includes("连续失败"));
});

import test from "node:test";
import assert from "node:assert/strict";

import { parseImportedNovelText } from "../src/lib/import/novel-import-parser.ts";

test("import parser recognizes Arabic Chinese chapter heading", () => {
  const result = parseImportedNovelText({
    workType: "long_novel",
    rawText: "第1章 初遇\n雨声落下。\n\n第2章 离城\n他推门而出。",
  });

  assert.equal(result.chapters.length, 2);
  assert.equal(result.chapters[0].index, 1);
  assert.equal(result.chapters[0].title, "初遇");
  assert.match(result.chapters[0].content, /雨声落下/);
});

test("import parser recognizes Chinese numeral chapter heading", () => {
  const result = parseImportedNovelText({
    workType: "long_novel",
    rawText: "第一章 风起\n她听见钟声。\n第二章 夜行\n城门开了。",
  });

  assert.equal(result.chapters.length, 2);
  assert.equal(result.chapters[1].title, "夜行");
});

test("import parser recognizes English Chapter heading", () => {
  const result = parseImportedNovelText({
    workType: "long_novel",
    rawText: "Chapter 1 The Call\nThe phone rang.\nChapter 2 Dawn\nMorning came.",
  });

  assert.equal(result.chapters.length, 2);
  assert.equal(result.chapters[0].title, "The Call");
});

test("import parser recognizes Markdown chapter heading", () => {
  const result = parseImportedNovelText({
    workType: "long_novel",
    rawText: "# 第001章 雨夜\n电话响起。\n## 第002章 真相\n她沉默了。",
  });

  assert.equal(result.chapters.length, 2);
  assert.equal(result.chapters[0].title, "雨夜");
  assert.equal(result.chapters[1].index, 2);
});

test("import parser falls back to one short story chapter without headings", () => {
  const result = parseImportedNovelText({
    workType: "short_story",
    rawText: "一整个短篇故事。\n它没有章节标题。",
  });

  assert.equal(result.chapters.length, 1);
  assert.equal(result.chapters[0].index, 1);
  assert.equal(result.warnings.length, 0);
});

test("import parser warns when long novel has no headings", () => {
  const result = parseImportedNovelText({
    workType: "long_novel",
    rawText: "这是长篇正文，但没有章节标题。",
  });

  assert.equal(result.chapters.length, 1);
  assert.match(result.warnings.join("\n"), /未识别到章节标题/);
});

test("import parser reorders duplicate chapter numbers by appearance and warns", () => {
  const result = parseImportedNovelText({
    workType: "long_novel",
    rawText: "第1章 A\n正文A\n第1章 B\n正文B",
  });

  assert.equal(result.chapters.length, 2);
  assert.deepEqual(result.chapters.map((chapter) => chapter.index), [1, 2]);
  assert.match(result.warnings.join("\n"), /重复章节序号/);
});

test("import parser warns on skipped chapter numbers", () => {
  const result = parseImportedNovelText({
    workType: "long_novel",
    rawText: "第1章 A\n正文A\n第3章 C\n正文C",
  });

  assert.equal(result.chapters.length, 2);
  assert.match(result.warnings.join("\n"), /章节跳号/);
});

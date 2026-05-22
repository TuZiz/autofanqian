import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  getWorkTypeBadgeCopy,
  matchesWorkLibraryTypeFilter,
} from "../src/shared/work-type.ts";
import { getWorkLibraryEmptyCopy } from "../src/lib/dashboard/work-library-filter.ts";
import { buildShortStoryOutlineViewModel } from "../src/lib/workbench/short-story-outline-view-model.ts";
import { formatWorkbenchDocumentLabel } from "../src/lib/workbench/work-document-label.ts";

const rootDir = process.cwd();

function read(relativePath) {
  return readFileSync(path.join(rootDir, relativePath), "utf8");
}

function createFilters(overrides = {}) {
  return {
    q: "",
    genreId: "",
    tag: "",
    owner: "",
    type: "all",
    sort: "updated_desc",
    page: 1,
    pageSize: 80,
    ...overrides,
  };
}

test("work library marks short stories and keeps long-form copy distinct", () => {
  assert.deepEqual(getWorkTypeBadgeCopy("short_story"), {
    primary: "短篇",
    secondary: "一篇完结",
    libraryLabel: "短篇故事",
  });
  assert.deepEqual(getWorkTypeBadgeCopy("long_novel"), {
    primary: "长篇",
    secondary: "连载作品",
    libraryLabel: "长篇小说",
  });
});

test("work library type filter separates short stories from long-form works", () => {
  const works = [
    { id: "long-1", workType: "long_novel" },
    { id: "legacy-1", workType: null },
    { id: "short-1", workType: "short_story" },
  ];

  assert.deepEqual(
    works.filter((work) => matchesWorkLibraryTypeFilter(work.workType, "short")).map((work) => work.id),
    ["short-1"],
  );
  assert.deepEqual(
    works.filter((work) => matchesWorkLibraryTypeFilter(work.workType, "long")).map((work) => work.id),
    ["long-1", "legacy-1"],
  );
  assert.equal(works.filter((work) => matchesWorkLibraryTypeFilter(work.workType, "all")).length, 3);
});

test("work library empty states distinguish no works from no long or short works", () => {
  assert.equal(getWorkLibraryEmptyCopy(createFilters()).title, "这里还没有作品");
  assert.equal(getWorkLibraryEmptyCopy(createFilters({ type: "long" })).title, "当前筛选下没有长篇");
  assert.equal(getWorkLibraryEmptyCopy(createFilters({ type: "short" })).title, "当前筛选下没有短篇");
  assert.equal(getWorkLibraryEmptyCopy(createFilters({ q: "雨夜" })).title, "没有匹配的作品");
});

test("short story outline view model tolerates invalid JSON and missing fields", () => {
  const invalid = buildShortStoryOutlineViewModel("{not-json", "");

  assert.equal(invalid.parseFailed, true);
  assert.equal(invalid.beats.length, 0);
  assert.equal(invalid.characters.length, 0);
  assert.match(invalid.fallbackText, /\{not-json/);

  const parsed = buildShortStoryOutlineViewModel(
    JSON.stringify({
      theme: "告别",
      hook: "雨夜电话",
      endingType: "twist",
      characters: [{ name: "林晚", role: "主角" }],
      beats: [{ index: 2, title: "回到旧屋", purpose: "揭开误会" }],
      fullOutline: "开端、反转、余味。",
    }),
  );

  assert.equal(parsed.parseFailed, false);
  assert.equal(parsed.theme, "告别");
  assert.equal(parsed.hook, "雨夜电话");
  assert.equal(parsed.endingLabel, "反转式");
  assert.equal(parsed.characters[0]?.name, "林晚");
  assert.equal(parsed.beats[0]?.title, "回到旧屋");
});

test("short story editor labels body as short story text instead of chapter one", () => {
  assert.equal(formatWorkbenchDocumentLabel(1, "short_story"), "短篇正文");
  assert.equal(formatWorkbenchDocumentLabel(2, "short_story"), "Beat 2");
  assert.equal(formatWorkbenchDocumentLabel(1, "long_novel"), "第1章");
});

test("long-form editor does not render the short story action panel", () => {
  const sidebar = read("src/components/workbench/chapter-editor-sidebar.tsx");
  const panel = read("src/components/workbench/short-story-action-panel.tsx");

  assert.match(sidebar, /\{isShortStory \? <ShortStoryActionPanel editor=\{editor\} \/> : null\}/);
  assert.match(panel, /增强反转/);
  assert.match(panel, /改成更番茄风/);
  assert.match(panel, /压缩到 3000 字/);
  assert.match(panel, /扩写到 8000 字/);
  assert.match(panel, /生成投稿简介/);
  assert.match(panel, /生成短剧分镜/);
  assert.match(panel, /正在接入中/);
});

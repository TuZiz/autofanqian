import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { getWorkLibraryEmptyCopy } from "../src/lib/dashboard/work-library-filter.ts";
import { buildShortStoryOutlineViewModel } from "../src/lib/workbench/short-story-outline-view-model.ts";
import {
  isShortStoryWork,
  matchesWorkLibraryTypeFilter,
} from "../src/shared/work-type.ts";

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

test("work-type helper identifies short story library filters", () => {
  assert.equal(isShortStoryWork("short_story"), true);
  assert.equal(isShortStoryWork("long_novel"), false);
  assert.equal(matchesWorkLibraryTypeFilter("short_story", "short"), true);
  assert.equal(matchesWorkLibraryTypeFilter("long_novel", "short"), false);
  assert.equal(matchesWorkLibraryTypeFilter("long_novel", "long"), true);
  assert.equal(matchesWorkLibraryTypeFilter("short_story", "long"), false);
  assert.equal(matchesWorkLibraryTypeFilter(null, "long"), true);
  assert.equal(matchesWorkLibraryTypeFilter(undefined, "all"), true);
});

test("work-library-filter empty copy distinguishes short and long filters", () => {
  assert.equal(getWorkLibraryEmptyCopy(createFilters()).title, "这里还没有作品");
  assert.match(getWorkLibraryEmptyCopy(createFilters({ type: "long" })).title, /没有长篇/);
  assert.match(getWorkLibraryEmptyCopy(createFilters({ type: "short" })).title, /没有短篇/);
  assert.equal(getWorkLibraryEmptyCopy(createFilters({ q: "雨夜", type: "all" })).title, "没有匹配的作品");
});

test("short story outline view model parses valid strings and objects safely", () => {
  const parsedString = buildShortStoryOutlineViewModel(
    JSON.stringify({
      beats: [
        { index: 3, title: "回到旧屋", purpose: "揭开误会", targetWords: 1200 },
      ],
    }),
  );

  assert.equal(parsedString.parseFailed, false);
  assert.equal(parsedString.beats.length, 1);
  assert.equal(parsedString.beats[0]?.index, 3);
  assert.equal(parsedString.beats[0]?.title, "回到旧屋");

  const parsedObject = buildShortStoryOutlineViewModel({
    characters: [{ name: "林晚", role: "主角", description: "旧屋继承人" }],
    beats: [{ title: "雨夜电话", summary: "收到陌生来电" }],
  });

  assert.equal(parsedObject.characters[0]?.name, "林晚");
  assert.equal(parsedObject.beats[0]?.purpose, "收到陌生来电");

  const invalid = buildShortStoryOutlineViewModel("{not-json");
  assert.equal(invalid.parseFailed, true);
  assert.deepEqual(invalid.beats, []);
  assert.deepEqual(invalid.characters, []);

  const missingFields = buildShortStoryOutlineViewModel({ title: "无数组字段" });
  assert.deepEqual(missingFields.beats, []);
  assert.deepEqual(missingFields.characters, []);
});

test("short story action panel is gated to short story editor pages", () => {
  const sidebar = read("src/components/workbench/chapter-editor-sidebar.tsx");

  assert.match(sidebar, /import \{ isShortStoryWork \} from "@\/shared\/work-type"/);
  assert.match(sidebar, /import \{ ShortStoryActionPanel \} from "\.\/short-story-action-panel"/);
  assert.match(sidebar, /const isShortStory = isShortStoryWork\(work\?\.workType\)/);
  assert.match(sidebar, /\{isShortStory \? <ShortStoryActionPanel editor=\{editor\} \/> : null\}/);
  assert.doesNotMatch(sidebar, /(?<!\?)\s<ShortStoryActionPanel editor=\{editor\} \/>/);
});

test("short story beats open the single body chapter instead of beat indexes", () => {
  const hero = read("src/components/workbench/work-dashboard-hero.tsx");
  const outlinePanel = read("src/components/workbench/work-dashboard-outline.tsx");
  const outlineView = read("src/components/workbench/short-story-outline-view.tsx");
  const dashboardHook = read("src/lib/workbench/use-work-dashboard.ts");

  assert.doesNotMatch(outlineView, />\s*打开正文\s*</);
  assert.match(outlineView, />\s*查看正文\s*</);
  assert.doesNotMatch(hero, /onOpenBeat=\{\(index\) => dashboard\.goToChapter\(index\)\}/);
  assert.match(hero, /dashboard\.goToChapter\(1, \{ beatIndex: index \}\)/);
  assert.match(outlinePanel, /dashboard\.goToChapter\(1, \{ beatIndex: index \}\)/);
  assert.match(dashboardHook, /type GoToChapterOptions = \{[\s\S]*autoAi\?: boolean;[\s\S]*beatIndex\?: number;/);
  assert.match(dashboardHook, /new URLSearchParams\(\)/);
  assert.match(dashboardHook, /params\.set\("ai", "1"\)/);
  assert.match(dashboardHook, /params\.set\("beat", String\(options\.beatIndex\)\)/);
});

test("work library type filter is pushed into the database where clause", () => {
  const service = read("src/backend/works/work-list-service.ts");

  assert.match(service, /if \(query\.type === "short"\) \{[\s\S]*and\.push\(\{ workType: "short_story" \}\)/);
  assert.match(service, /if \(query\.type === "long"\) \{[\s\S]*and\.push\(\{ workType: \{ not: "short_story" \} \}\)/);
  assert.doesNotMatch(service, /filteredSummaries\s*=\s*workSummaries\.filter/);
  assert.match(service, /const \[statsRows, total, activeChapter, fallbackWork\] = await Promise\.all/);
  assert.match(service, /buildStatsSql\(params\)/);
  assert.match(service, /prisma\.work\.count\(\{ where: listWhere \}\)/);
  assert.match(service, /buildWorkIdPageSql\(params, skip\)/);
  assert.match(service, /skip,\s*take: query\.pageSize/);
  assert.match(service, /total,/);
  assert.doesNotMatch(service, /matchesWorkLibraryTypeFilter/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const rootDir = process.cwd();

function read(relativePath) {
  return readFileSync(path.join(rootDir, relativePath), "utf8");
}

test("short story mode exposes structure templates and no long-volume flow", () => {
  const schema = read("src/shared/schemas/short-story.ts");
  const view = read("src/frontend/features/create/short-story-create-view.tsx");
  const prompt = read("src/lib/ai/short-story-generate-prompt.ts");

  for (const template of ["三幕式", "反转式", "悬疑式", "爽文式", "虐恋式", "治愈式"]) {
    assert.match(schema, new RegExp(template));
  }
  for (const words of ["3000", "5000", "8000", "12000", "20000"]) {
    assert.match(schema, new RegExp(words));
  }
  assert.match(view, /创意输入 → 短篇结构 → 全文生成 → 润色导出/);
  assert.match(prompt, /不要套用长篇分卷分章流程/);
});

test("chapter rewrite includes requested new rewrite modes", () => {
  const route = read("src/backend/ai/chapter/rewrite-route.ts");
  const hook = read("src/lib/workbench/use-chapter-editor-rewrite.ts");
  const dialog = read("src/components/workbench/chapter-rewrite-dialog.tsx");

  for (const mode of ["爽文化", "细腻化", "去 AI 味", "增强开头钩子", "增强结尾追读感", "对话自然化"]) {
    assert.match(route + hook + dialog, new RegExp(mode));
  }
  assert.match(route, /promptTemplateKey:\s*"chapter\.rewrite"/);
  assert.match(route, /promptTemplateVersion/);
});

test("story bible routes and page cover six context models", () => {
  const route = read("src/backend/works/story-bible-route.ts");
  const view = read("src/components/workbench/story-bible-view.tsx");
  const header = read("src/components/workbench/work-dashboard-header.tsx");

  for (const section of [
    "characters",
    "worldSettings",
    "timelineEvents",
    "foreshadowings",
    "relationships",
    "writingMemories",
  ]) {
    assert.match(route + view, new RegExp(section));
  }
  assert.match(view, /从章节提取/);
  assert.match(header, /故事圣经/);
});

test("consistency check supports current, recent5 and book job output", () => {
  const schema = read("src/shared/schemas/chapter-consistency.ts");
  const route = read("src/backend/ai/chapter/consistency-route.ts");
  const panel = read("src/components/workbench/chapter-consistency-panel.tsx");
  const dashboardHook = read("src/lib/workbench/use-work-dashboard.ts");

  assert.match(schema, /"current", "recent5", "book"/);
  assert.match(schema, /severeProblems/);
  assert.match(schema, /mediumProblems/);
  assert.match(schema, /autoFixPrompt/);
  assert.match(route, /chapter\.consistency_check\.book/);
  assert.match(route, /status:\s*"queued"/);
  assert.match(panel, /最近 5 章/);
  assert.match(dashboardHook, /handleBookConsistencyCheck/);
});

test("export API supports chapter, book and short story markdown/txt", () => {
  const route = read("src/app/api/works/[id]/export/route.ts");
  const main = read("src/components/workbench/chapter-editor-main.tsx");
  const header = read("src/components/workbench/work-dashboard-header.tsx");

  assert.match(route, /scope:\s*z\.enum\(\["book", "chapter", "short_story"\]\)/);
  assert.match(route, /chapterIndex/);
  assert.match(route, /deletedAt:\s*null/);
  assert.match(route, /formatDateForFilename/);
  assert.match(main, /scope=chapter/);
  assert.match(header, /scope=\$\{isShortStory \? "short_story" : "book"\}/);
});

test("prompt template center routes and AI fallback are wired", () => {
  const adminRoute = read("src/backend/admin/prompt-templates-route.ts");
  const adminView = read("src/components/admin/admin-prompts-view.tsx");
  const helper = read("src/lib/ai/prompt-templates.ts");
  const shortRoute = read("src/backend/ai/short-story/generate-route.ts");
  const rewriteRoute = read("src/backend/ai/chapter/rewrite-route.ts");
  const consistencyRoute = read("src/backend/ai/chapter/consistency-route.ts");

  assert.match(adminRoute, /promptTemplate\.findMany/);
  assert.match(adminRoute, /createVersion/);
  assert.match(adminRoute, /isActive:\s*false/);
  assert.match(adminView, /创建新版本/);
  assert.match(helper, /getActivePromptTemplate/);
  assert.match(shortRoute, /short-story\.generate/);
  assert.match(rewriteRoute, /chapter\.rewrite/);
  assert.match(consistencyRoute, /chapter\.consistency/);
});

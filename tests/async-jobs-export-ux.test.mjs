import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("short story create page polls async jobs and exposes retry", () => {
  const hook = read("src/lib/create/use-short-story-create.ts");
  const view = read("src/frontend/features/create/short-story-create-view.tsx");

  assert.match(hook, /type ShortStoryStage = "idle" \| "outline" \| "work" \| "queued" \| "failed" \| "done"/);
  assert.match(hook, /apiRequest<SerializedGenerationJob>\(\s*`\/api\/jobs\/\$\{encodeURIComponent\(jobId\)\}`/s);
  assert.match(hook, /apiRequest<SerializedGenerationJob>\(\s*`\/api\/jobs\/\$\{encodeURIComponent\(asyncJobId\)\}\/retry`/s);
  assert.match(hook, /router\.replace\(`\/dashboard\/work\/\$\{job\.progress\?\.finalWorkId \|\| job\.workId \|\| asyncWorkId\}`\)/);
  assert.match(view, /function AsyncJobPanel/);
  assert.match(view, /已生成段落：\{progressLabel\}/);
  assert.match(view, /重试后台生成/);
});

test("user job APIs require access and use safe retry execution", () => {
  const getRoute = read("src/app/api/jobs/[id]/route.ts");
  const retryRoute = read("src/app/api/jobs/[id]/retry/route.ts");
  const schema = read("src/shared/schemas/generation-job.ts");

  assert.match(getRoute, /requireGenerationJobAccess\(params\.id\)/);
  assert.match(retryRoute, /assertSameOriginRequest\(request\)/);
  assert.match(retryRoute, /USER_RETRYABLE_JOB_TYPES\.includes/);
  assert.match(retryRoute, /runGenerationJob\(job\.id, \{ retryFailed: true \}\)/);
  for (const jobType of [
    "short_story.generate.long",
    "chapter.batch_generate",
    "bible.extract",
    "chapter.consistency.book",
  ]) {
    assert.match(schema, new RegExp(jobType.replaceAll(".", "\\.")));
  }
});

test("long short story job and context persistence are idempotent", () => {
  const runner = read("src/lib/jobs/generation-job-runner.ts");
  const route = read("src/backend/ai/short-story/generate-route.ts");

  assert.match(runner, /rawState\.success && rawState\.data\.finalWorkId/);
  assert.match(runner, /existingChapter\?\.status === "written"/);
  assert.match(runner, /writingMemory\.deleteMany\(\{[\s\S]*source: SHORT_STORY_CONTEXT_SOURCE/);
  assert.match(runner, /timelineEvent\.deleteMany\(\{[\s\S]*startsWith: SHORT_STORY_TIMELINE_MARKER/);
  assert.match(route, /after\(async \(\) => \{[\s\S]*runGenerationJob\(jobId\)/);
  assert.match(route, /writingMemory\.deleteMany\(\{[\s\S]*source: SHORT_STORY_CONTEXT_SOURCE/);
});

test("export preview is wired before user-facing downloads", () => {
  const previewRoute = read("src/app/api/works/[id]/export/preview/route.ts");
  const exportButton = read("src/components/workbench/export-download-button.tsx");
  const header = read("src/components/workbench/work-dashboard-header.tsx");
  const editor = read("src/components/workbench/chapter-editor-main.tsx");
  const dashboardCard = read("src/components/dashboard/dashboard-work-card.tsx");

  assert.match(previewRoute, /workExportPreviewQuerySchema/);
  assert.match(previewRoute, /requireWorkAccess\(params\.id\)/);
  assert.match(previewRoute, /没有可导出的章节/);
  assert.match(exportButton, /preview: `\$\{base\}\/preview\?/);
  assert.match(exportButton, /window\.confirm\(formatPreviewMessage\(previewRes\.data\)\)/);
  assert.match(header, /<ExportDownloadButton[\s\S]*format="docx"/);
  assert.match(editor, /<ExportDownloadButton[\s\S]*format="txt"/);
  assert.match(editor, /<ExportDownloadButton[\s\S]*format="docx"/);
  assert.match(dashboardCard, /<ExportDownloadButton/);
});

test("docx export includes styles and document properties", () => {
  const docx = read("src/lib/export/docx.ts");

  assert.match(docx, /word\/styles\.xml/);
  assert.match(docx, /docProps\/core\.xml/);
  assert.match(docx, /docProps\/app\.xml/);
  assert.match(docx, /宋体/);
  assert.match(docx, /w:firstLineChars="200"/);
  assert.match(docx, /w:pageBreakBefore/);
  assert.match(docx, /w:styleId="Heading1"/);
});

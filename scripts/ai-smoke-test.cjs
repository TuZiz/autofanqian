/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");

const ts = require("typescript");
const dotenv = require("dotenv");

// Keep shell-provided overrides intact while still loading local defaults.
if (!process.env.AI_SMOKE_SKIP_DOTENV) {
  dotenv.config({ path: path.join(process.cwd(), ".env.local") });
  dotenv.config({ path: path.join(process.cwd(), ".env") });
}

process.env.NODE_ENV = process.env.NODE_ENV || "development";

const originalLoad = Module._load;
const originalResolveFilename = Module._resolveFilename;

function resolveAlias(specifier) {
  const relative = specifier.slice(2);
  const base = path.join(process.cwd(), "src", relative);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.mjs`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
    path.join(base, "index.js"),
    path.join(base, "index.mjs"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error(`Unable to resolve alias: ${specifier}`);
}

Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "server-only") {
    return {};
  }

  return originalLoad.call(this, request, parent, isMain);
};

Module._resolveFilename = function patchedResolve(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    return originalResolveFilename.call(
      this,
      resolveAlias(request),
      parent,
      isMain,
      options,
    );
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

function compileTs(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      resolveJsonModule: true,
    },
    fileName: filename,
  });

  module._compile(output.outputText, filename);
}

require.extensions[".ts"] = compileTs;
require.extensions[".tsx"] = compileTs;

function buildStreamMessages(input) {
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
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

function getSmokeStamp() {
  return new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
}

function getSmokeEndpointPreference() {
  const raw = process.env.AI_SMOKE_PREFER_ENDPOINT?.trim().toLowerCase();
  if (raw === "chat" || raw === "responses") return raw;
  return null;
}

async function main() {
  const { prisma } = require("../src/lib/prisma.ts");
  const { sessionUserSelect } = require("../src/lib/auth/user.ts");
  const {
    prepareChapterGeneration,
    finalizeGeneratedDraft,
    countWords,
  } = require("../src/lib/ai/chapter-generate-shared.ts");
  const {
    callAiText,
    getAiProvidersFromEnv,
    streamAiText,
    getReadableAiErrorMessage,
  } = require("../src/lib/ai/upstream-text.ts");
  const { repairChapterLengthIfNeeded } = require("../src/lib/ai/chapter-length-repair.ts");
  const { runChapterContextExtraction } = require("../src/lib/ai/chapter-context-extract.ts");

  const auditUser = await prisma.user.findFirst({
    where: { email: "codex-audit@example.local" },
    select: sessionUserSelect,
  });

  if (!auditUser) {
    throw new Error("Missing audit user codex-audit@example.local");
  }

  const sourceWork = await prisma.work.findFirst({
    where: {
      deletedAt: null,
      NOT: {
        title: {
          startsWith: "【AI冒烟 ",
        },
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      userId: true,
      genreId: true,
      genreLabel: true,
      idea: true,
      tags: true,
      platformId: true,
      platformLabel: true,
      words: true,
      dnaBookTitle: true,
      tag: true,
      title: true,
      synopsis: true,
      outline: true,
      outlineState: true,
      canonState: true,
      rawOutline: true,
      targetChapters: true,
      plannedUntilChapter: true,
      planningMode: true,
    },
  });

  if (!sourceWork) {
    throw new Error("No source work found for smoke test");
  }

  const sourceCharacters = await prisma.character.findMany({
    where: { novelId: sourceWork.id, deletedAt: null },
    select: {
      name: true,
      aliases: true,
      identity: true,
      role: true,
      desc: true,
      personality: true,
      goal: true,
      secret: true,
      appearance: true,
      relations: true,
      notes: true,
      arc: true,
      currentState: true,
      firstChapter: true,
      lastChapter: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const outlineCharacters = Array.isArray(sourceWork.outline?.characters)
    ? sourceWork.outline.characters
    : [];

  const smokeWork = await prisma.work.create({
    data: {
      userId: auditUser.id,
      genreId: sourceWork.genreId,
      genreLabel: sourceWork.genreLabel,
      idea: sourceWork.idea,
      tags: [...(sourceWork.tags || []), "AI冒烟"],
      platformId: sourceWork.platformId,
      platformLabel: sourceWork.platformLabel,
      words: sourceWork.words,
      dnaBookTitle: sourceWork.dnaBookTitle,
      tag: sourceWork.tag,
      title: `【AI冒烟 ${getSmokeStamp()}】${sourceWork.title}`,
      synopsis: sourceWork.synopsis,
      outline: sourceWork.outline,
      outlineState: sourceWork.outlineState,
      canonState: sourceWork.canonState,
      rawOutline: sourceWork.rawOutline,
      targetChapters: sourceWork.targetChapters,
      plannedUntilChapter: Math.max(sourceWork.plannedUntilChapter || 0, 8),
      planningMode: sourceWork.planningMode,
    },
    select: {
      id: true,
      title: true,
      words: true,
      targetChapters: true,
      plannedUntilChapter: true,
    },
  });

  const characterSeedData = sourceCharacters.length
    ? sourceCharacters.map((item) => ({
        novelId: smokeWork.id,
        name: item.name,
        aliases: item.aliases || [],
        identity: item.identity,
        role: item.role,
        desc: item.desc,
        personality: item.personality,
        goal: item.goal,
        secret: item.secret,
        appearance: item.appearance,
        relations: item.relations,
        notes: item.notes,
        arc: item.arc,
        currentState: item.currentState,
        firstChapter: item.firstChapter,
        lastChapter: item.lastChapter,
      }))
    : outlineCharacters.map((item) => ({
        novelId: smokeWork.id,
        name: item.name,
        aliases: [],
        identity: null,
        role: item.role,
        desc: item.desc,
        personality: null,
        goal: null,
        secret: null,
        appearance: null,
        relations: null,
        notes: null,
        arc: null,
        currentState: null,
        firstChapter: null,
        lastChapter: null,
      }));

  if (characterSeedData.length) {
    await prisma.character.createMany({ data: characterSeedData });
  }

  const smokeOnlyProviderId = process.env.AI_SMOKE_ONLY_PROVIDER?.trim().toLowerCase() || null;
  const smokeEndpointPreference = getSmokeEndpointPreference();
  const providersFromEnv = getAiProvidersFromEnv()
    .filter((provider) => !smokeOnlyProviderId || provider.id === smokeOnlyProviderId)
    .map((provider) =>
      smokeEndpointPreference && provider.id !== "anthropic"
        ? { ...provider, prefer: smokeEndpointPreference }
        : provider,
    );
  if (!providersFromEnv.length) {
    throw new Error("No AI providers available from env");
  }

  const generatePrepared = await prepareChapterGeneration({
    user: auditUser,
    input: { workId: smokeWork.id, index: 1 },
    providersFromEnv,
  });

  const generationStartedAt = Date.now();
  const generationResult = await callAiText({
    providers: generatePrepared.providers,
    preferredProviderId: generatePrepared.preferredProvider.id,
    messages: generatePrepared.messages,
    temperature: generatePrepared.temperature,
    maxTokens: generatePrepared.maxTokens,
    attempts: 1,
    reasoningEffort: "low",
  });
  const generationWallMs = Date.now() - generationStartedAt;

  if (!generationResult.ok || !generationResult.text) {
    throw new Error(getReadableAiErrorMessage(generationResult, "章节生成失败"));
  }

  const generatedDraft = finalizeGeneratedDraft({
    index: 1,
    rawText: generationResult.text,
  });
  const generatedInitialWordCount = countWords(generatedDraft.content);
  const generationRepair = await repairChapterLengthIfNeeded({
    index: 1,
    draft: generatedDraft,
    promptSnapshot: generatePrepared.promptSnapshot,
    providers: generatePrepared.providers,
    preferredProviderId: generatePrepared.preferredProvider.id,
    generationMode: generatePrepared.generationMode,
    workWords: generatePrepared.work.words,
    targetChapters: generatePrepared.work.targetChapters,
  });

  const chapterOne = await prisma.chapter.upsert({
    where: { workId_index: { workId: smokeWork.id, index: 1 } },
    create: {
      workId: smokeWork.id,
      index: 1,
      title: generationRepair.draft.title,
      content: generationRepair.draft.content,
      wordCount: generationRepair.wordCount,
      status: "written",
      details: [],
    },
    update: {
      title: generationRepair.draft.title,
      content: generationRepair.draft.content,
      wordCount: generationRepair.wordCount,
      status: "written",
    },
    select: {
      id: true,
      index: true,
      title: true,
      wordCount: true,
    },
  });

  await runChapterContextExtraction({
    user: auditUser,
    workId: smokeWork.id,
    chapterId: chapterOne.id,
    index: 1,
    trigger: "generate",
    force: true,
  });

  const chapterAfterExtract = await prisma.chapter.findUnique({
    where: { id: chapterOne.id },
    select: { summary: true, details: true },
  });
  const extractedMemoryCount = await prisma.writingMemory.count({
    where: {
      novelId: smokeWork.id,
      chapterId: chapterOne.id,
      source: "context_extract",
    },
  });
  const extractedTimeline = await prisma.timelineEvent.findMany({
    where: { novelId: smokeWork.id, chapterId: chapterOne.id, deletedAt: null },
    select: { title: true, summary: true, storyTime: true },
    orderBy: [{ chapterIndex: "asc" }, { order: "asc" }, { createdAt: "asc" }],
  });
  const extractedForeshadowings = await prisma.foreshadowing.findMany({
    where: { novelId: smokeWork.id, plantedChapter: 1, deletedAt: null },
    select: { title: true, hint: true, status: true },
    orderBy: [{ importance: "desc" }, { createdAt: "asc" }],
  });
  const updatedCharacters = await prisma.character.findMany({
    where: { novelId: smokeWork.id, lastChapter: 1 },
    select: { name: true, currentState: true, goal: true },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });

  const streamPrepared = await prepareChapterGeneration({
    user: auditUser,
    input: { workId: smokeWork.id, index: 2 },
    providersFromEnv,
  });

  let streamFirstChunkMs = null;
  let streamChunkCount = 0;
  let streamReceivedChars = 0;
  const streamStartedAt = Date.now();
  const streamResult = await streamAiText({
    providers: streamPrepared.providers,
    preferredProviderId: streamPrepared.preferredProvider.id,
    messages: buildStreamMessages({
      baseUserPrompt: streamPrepared.promptSnapshot,
      generationMode: streamPrepared.generationMode,
    }),
    temperature: streamPrepared.temperature,
    maxTokens: streamPrepared.maxTokens,
    reasoningEffort: "low",
    onChunk: async (chunk) => {
      if (!chunk.deltaText) return;
      streamChunkCount += 1;
      streamReceivedChars += chunk.deltaText.length;
      if (streamFirstChunkMs === null) {
        streamFirstChunkMs = Date.now() - streamStartedAt;
      }
    },
  });
  const streamWallMs = Date.now() - streamStartedAt;

  if (!streamResult.ok || !streamResult.text) {
    throw new Error(getReadableAiErrorMessage(streamResult, "流式生成失败"));
  }

  const streamedDraft = finalizeGeneratedDraft({
    index: 2,
    rawText: streamResult.text,
  });
  const streamedInitialWordCount = countWords(streamedDraft.content);
  const streamRepair = await repairChapterLengthIfNeeded({
    index: 2,
    draft: streamedDraft,
    promptSnapshot: streamPrepared.promptSnapshot,
    providers: streamPrepared.providers,
    preferredProviderId: streamPrepared.preferredProvider.id,
    generationMode: streamPrepared.generationMode,
    workWords: streamPrepared.work.words,
    targetChapters: streamPrepared.work.targetChapters,
  });

  const generationJobs = await prisma.generationJob.findMany({
    where: { novelId: smokeWork.id },
    select: {
      action: true,
      status: true,
      resultSummary: true,
      createdAt: true,
      completedAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const result = {
    smokeWork: {
      id: smokeWork.id,
      title: smokeWork.title,
      plannedUntilChapter: smokeWork.plannedUntilChapter,
    },
    chapterGenerate: {
      index: 1,
      providerId: generationResult.providerId,
      modelUsed: generationResult.modelUsed,
      wallMs: generationWallMs,
      providerDurationMs: generationResult.durationMs ?? null,
      initialWordCount: generatedInitialWordCount,
      finalWordCount: generationRepair.wordCount,
      repairAttempted: generationRepair.repairAttempted,
      repairApplied: generationRepair.repairApplied,
      repairNote: generationRepair.repairNote ?? null,
      chapterTitle: generationRepair.draft.title,
    },
    streamSmoke: {
      index: 2,
      providerId: streamResult.providerId,
      modelUsed: streamResult.modelUsed,
      wallMs: streamWallMs,
      providerDurationMs: streamResult.durationMs ?? null,
      firstChunkMs: streamFirstChunkMs,
      chunkCount: streamChunkCount,
      receivedChars: streamReceivedChars,
      initialWordCount: streamedInitialWordCount,
      finalWordCount: streamRepair.wordCount,
      repairAttempted: streamRepair.repairAttempted,
      repairApplied: streamRepair.repairApplied,
      repairNote: streamRepair.repairNote ?? null,
      chapterTitle: streamRepair.draft.title,
    },
    contextExtract: {
      chapterId: chapterOne.id,
      summaryPresent: Boolean(chapterAfterExtract?.summary?.trim()),
      detailCount: Array.isArray(chapterAfterExtract?.details)
        ? chapterAfterExtract.details.length
        : 0,
      memoryCount: extractedMemoryCount,
      timelineEventCount: extractedTimeline.length,
      timelineSample: extractedTimeline.slice(0, 3),
      foreshadowingCount: extractedForeshadowings.length,
      foreshadowingSample: extractedForeshadowings.slice(0, 3),
      updatedCharacterCount: updatedCharacters.length,
      updatedCharacters: updatedCharacters.slice(0, 5),
    },
    generationJobs,
  };

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      const { prisma } = require("../src/lib/prisma.ts");
      await prisma.$disconnect();
    } catch {
      // ignore cleanup errors
    }
  });

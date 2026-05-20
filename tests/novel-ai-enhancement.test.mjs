import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/test";

const rootDir = process.cwd();

function read(relativePath) {
  return readFileSync(path.join(rootDir, relativePath), "utf8");
}

test("LongStoryContextStrategy scoring prefers relevant open foreshadowing", async () => {
  const { scoreLongContextItem, buildNovelContextFromData } = await import(
    "../src/lib/ai/novel-context-engine.ts"
  );

  const relevant = scoreLongContextItem({
    text: "林舟在青岚城发现命灯裂纹，旧誓约仍未兑现",
    chapterIndex: 12,
    itemChapterIndex: 9,
    characterNames: ["林舟"],
    outlineKeywords: ["青岚城", "命灯"],
    priority: 80,
    foreshadowingStatus: "open",
  });
  const stale = scoreLongContextItem({
    text: "很久以前的宴会闲谈",
    chapterIndex: 12,
    itemChapterIndex: 1,
    characterNames: ["林舟"],
    outlineKeywords: ["青岚城", "命灯"],
    priority: 3,
    foreshadowingStatus: "resolved",
  });

  assert.ok(relevant.score > stale.score);

  const context = buildNovelContextFromData({
    work: {
      id: "work-1",
      workType: "long_novel",
      title: "命灯",
      idea: "少年修复命灯",
      synopsis: "青岚城危机",
      canonState: null,
      outline: {
        tag: "玄幻",
        title: "命灯",
        synopsis: "青岚城危机",
        volumes: [
          {
            name: "青岚城卷",
            desc: "命灯碎裂，旧誓约浮现",
            startChapter: 1,
            endChapter: 20,
            segments: [
              {
                title: "命灯裂纹",
                desc: "林舟追查青岚城命灯",
                startChapter: 10,
                endChapter: 15,
              },
            ],
          },
        ],
        characters: [{ name: "林舟", role: "protagonist", desc: "执灯人" }],
      },
    },
    chapterIndex: 12,
    previousChapters: [
      { index: 11, title: "裂纹", content: "林舟听见命灯裂开。", wordCount: 10, summary: "命灯裂开" },
    ],
    writingMemories: [{ content: "林舟不能忘记旧誓约", priority: 90 }],
    characters: [{ name: "林舟", role: "protagonist", currentState: "受伤但清醒" }],
    worldSettings: [{ kind: "规则", name: "命灯", desc: "命灯代表城民寿数" }],
    timelineEvents: [{ chapterIndex: 11, title: "裂纹", summary: "命灯出现裂纹" }],
    foreshadowings: [
      { title: "旧誓约", hint: "林舟欠青岚城一个誓言", status: "open", importance: 90, plantedChapter: 3 },
      { title: "旧宴会", hint: "宴会闲谈", status: "resolved", importance: 10, plantedChapter: 1 },
    ],
  });

  assert.equal(context.mode, "long");
  assert.match(context.text, /上一章/);
  assert.match(context.text, /旧誓约/);
  assert.doesNotMatch(context.text, /旧宴会/);
});

test("LongStoryContextStrategy can select relevant foreshadowing from larger candidate pool", async () => {
  const { buildNovelContextFromData } = await import("../src/lib/ai/novel-context-engine.ts");
  const foreshadowings = [
    ...Array.from({ length: 19 }, (_, index) => ({
      title: `普通伏笔${index}`,
      hint: `路人线索${index}`,
      status: "open",
      importance: 20,
      plantedChapter: index + 1,
    })),
    {
      title: "青岚命灯",
      hint: "林舟必须在青岚城修复命灯",
      payoff: "与当前卷目标直接相关",
      status: "open",
      importance: 95,
      plantedChapter: 2,
    },
  ];

  const context = buildNovelContextFromData({
    work: {
      id: "work-large",
      workType: "long_novel",
      title: "命灯",
      idea: "少年修复命灯",
      synopsis: "青岚城危机",
      canonState: null,
      outline: {
        tag: "玄幻",
        title: "命灯",
        synopsis: "青岚城危机",
        volumes: [
          {
            name: "青岚城卷",
            desc: "命灯危机",
            startChapter: 1,
            endChapter: 20,
            segments: [
              {
                title: "修复命灯",
                desc: "林舟必须在青岚城修复命灯",
                startChapter: 8,
                endChapter: 12,
              },
            ],
          },
        ],
        characters: [{ name: "林舟", role: "protagonist", desc: "执灯人" }],
      },
    },
    chapterIndex: 10,
    previousChapters: [],
    writingMemories: [],
    characters: [{ name: "林舟", role: "protagonist", currentState: "追查命灯" }],
    worldSettings: [],
    timelineEvents: [],
    foreshadowings,
  });

  assert.match(context.text, /青岚命灯/);
});

test("ShortStoryContextStrategy keeps context focused and capped", async () => {
  const { buildNovelContextFromData } = await import("../src/lib/ai/novel-context-engine.ts");
  const foreshadowings = Array.from({ length: 12 }, (_, index) => ({
    title: `问题${index}`,
    hint: `必须回收的问题${index}`,
    status: "open",
    importance: 100 - index,
    plantedChapter: 1,
  }));

  const context = buildNovelContextFromData({
    work: {
      id: "short-1",
      workType: "short_story",
      title: "雨夜电话",
      idea: "一个雨夜电话改变道别",
      synopsis: "主角必须在天亮前说出真相",
      canonState: {
        mode: "short",
        short: {
          theme: "告别",
          coreConflict: "说真相还是保持沉默",
          emotionalArc: "逃避到面对",
          beatsProgress: [],
          mustResolveBeforeEnd: ["电话另一端是谁"],
          forbiddenNewThreads: ["不要新增家族阴谋"],
        },
      },
      outline: {
        tag: "现实",
        title: "雨夜电话",
        synopsis: "主角必须在天亮前说出真相",
        targetWords: 6000,
        theme: "告别",
        hook: "电话另一端传来已故好友声音",
        endingType: "open",
        characters: [{ name: "许眠", role: "主角", description: "逃避告别的人" }],
        beats: [
          { index: 1, title: "来电", purpose: "建立冲突", targetWords: 1500, writingPrompt: "雨夜电话响起" },
          { index: 2, title: "真相", purpose: "面对真相", targetWords: 1800, writingPrompt: "说出隐瞒之事" },
          { index: 3, title: "道别", purpose: "完成收束", targetWords: 1500, writingPrompt: "天亮前道别" },
        ],
      },
    },
    chapterIndex: 2,
    previousChapters: [
      { index: 1, title: "来电", content: "电话响起，许眠没有接。", wordCount: 20, summary: "许眠拒接电话" },
    ],
    writingMemories: [],
    characters: [],
    worldSettings: [{ kind: "城市", name: "旧城", desc: "短篇不应过量展开" }],
    timelineEvents: [],
    foreshadowings,
  });

  assert.equal(context.mode, "short");
  assert.ok((context.context.foreshadowings ?? []).length <= 5);
  assert.doesNotMatch(context.text, /相关世界设定/);
  assert.match(context.text, /不要新增家族阴谋/);
});

test("fallbackContext templates are readable and free of mojibake fragments", () => {
  const source = read("src/lib/ai/chapter-generate-shared.ts");
  const start = source.indexOf("const fallbackContext =");
  const end = source.indexOf("const mode =", start);
  const block = source.slice(start, end);

  assert.match(block, /角色/);
  assert.match(block, /伏笔/);
  assert.match(block, /第\$\{item\.chapterIndex\}章/);
  assert.doesNotMatch(block, /锛|瑙|绗|浼|閿|鐟|娴/);
});

test("prepareChapterGeneration provides enough candidates for NovelContextEngine", () => {
  const source = read("src/lib/ai/chapter-generate-shared.ts");
  assert.match(source, /take:\s*48/);
  assert.match(source, /take:\s*64/);
  assert.match(source, /take:\s*input\.index === 1 \? 0 : 64/);
});

test("ChapterPlan long fallback does not block generation", async () => {
  const { buildChapterPlan } = await import("../src/lib/ai/chapter-plan.ts");
  const plan = await buildChapterPlan({
    mode: "long",
    chapterIndex: 8,
    assembledContext: "上一章结尾：主角被围困。",
    callText: async () => {
      throw new Error("upstream down");
    },
  });

  assert.equal(plan.mode, "long");
  assert.ok(plan.chapterGoal.length > 0);
  assert.ok(plan.mustAvoid.length > 0);
});

test("ChapterPlan short fallback does not block generation", async () => {
  const { buildChapterPlan } = await import("../src/lib/ai/chapter-plan.ts");
  const plan = await buildChapterPlan({
    mode: "short",
    chapterIndex: 2,
    assembledContext: "当前 beat：真相",
    callText: async () => ({ ok: true, text: "not json" }),
  });

  assert.equal(plan.mode, "short");
  assert.ok(plan.beatGoal.length > 0);
  assert.ok(plan.mustNotOpen.some((item) => item.includes("长期") || item.includes("大坑")));
});

test("plan and consistency prompts avoid chapter body schema conflicts", async () => {
  const { buildChapterPlanSystemPrompt } = await import("../src/lib/ai/chapter-plan-prompt.ts");
  const {
    buildChapterConsistencySystemPrompt,
    buildChapterRepairSystemPrompt,
  } = await import("../src/lib/ai/chapter-consistency-prompt.ts");

  const planPrompt = buildChapterPlanSystemPrompt("long");
  const consistencyPrompt = buildChapterConsistencySystemPrompt();
  const repairPrompt = buildChapterRepairSystemPrompt();

  assert.doesNotMatch(planPrompt, /\{"title": "\.\.\.", "content": "\.\.\."\}/);
  assert.doesNotMatch(consistencyPrompt, /\{"title": "\.\.\.", "content": "\.\.\."\}/);
  assert.doesNotMatch(planPrompt, /正文草稿/);
  assert.doesNotMatch(consistencyPrompt, /正文草稿/);
  assert.match(repairPrompt, /title/);
  assert.match(repairPrompt, /content/);
});

test("normal and stream generation both carry ChapterPlan and ConsistencyCheck", () => {
  const generateSource = read("src/backend/ai/chapter/generate-service.ts");
  const streamRouteSource = read("src/backend/ai/chapter/stream-route.ts");
  const streamPersistenceSource = read("src/backend/ai/chapter/stream-persistence.ts");

  assert.match(generateSource, /buildChapterPlan\(\{/);
  assert.match(streamRouteSource, /buildChapterPlan\(\{/);
  assert.match(generateSource, /runChapterConsistencyCheck\(\{/);
  assert.match(streamPersistenceSource, /runChapterConsistencyCheck\(\{/);
  assert.match(streamPersistenceSource, /checkedDraft/);
  assert.match(streamPersistenceSource, /已自动修复连续性问题/);
  assert.match(streamRouteSource, /providers:\s*orderedProviders/);
  assert.match(streamRouteSource, /preferredProvider:\s*selected\.provider/);
  assert.match(streamPersistenceSource, /providers:\s*prepared\.providers/);
});

test("AI step jobs are recorded for plan, check and repair", () => {
  const jobSource = read("src/lib/ai/chapter-ai-step-job.ts");
  const genericJobSource = read("src/lib/ai/ai-step-job.ts");
  const planSource = read("src/lib/ai/chapter-plan.ts");
  const consistencySource = read("src/lib/ai/chapter-consistency-check.ts");
  const qualitySource = read("src/lib/ai/chapter-quality-check.ts");

  for (const action of [
    "chapter.plan",
    "chapter.consistency_check",
    "chapter.consistency_repair",
    "chapter.quality_check",
  ]) {
    assert.match(
      jobSource + genericJobSource + planSource + consistencySource + qualitySource,
      new RegExp(action),
    );
  }
  assert.match(genericJobSource, /promptSnapshot.*slice\(0, 20000\)/s);
  assert.match(genericJobSource, /inputTokens/);
  assert.match(genericJobSource, /durationMs/);
});

test("plan/check/repair support quota wrapper actions", () => {
  const planSource = read("src/lib/ai/chapter-plan.ts");
  const consistencySource = read("src/lib/ai/chapter-consistency-check.ts");
  const generateSource = read("src/backend/ai/chapter/generate-service.ts");
  const streamRouteSource = read("src/backend/ai/chapter/stream-route.ts");
  const streamPersistenceSource = read("src/backend/ai/chapter/stream-persistence.ts");

  assert.match(planSource, /runAiCall\?: ChapterAuxiliaryAiCallRunner/);
  assert.match(planSource, /params\.runAiCall\("chapter_plan"/);
  assert.match(consistencySource, /params\.runAiCall\("chapter_consistency_check"/);
  assert.match(consistencySource, /params\.runAiCall\("chapter_consistency_repair"/);
  assert.match(generateSource, /runAiCall: \(action, execute\) =>[\s\S]*runWithAiQuotaReservation\(user, action, execute/);
  assert.match(streamRouteSource, /runAiCall: \(action, execute\) =>[\s\S]*runWithAiQuotaReservation\(prepared\.user, action, execute/);
  assert.match(streamPersistenceSource, /runAiCall: \(action, execute\) =>[\s\S]*runWithAiQuotaReservation\(prepared\.user, action, execute/);
});

test("consistency exception fails active step job instead of leaving it running", () => {
  const consistencySource = read("src/lib/ai/chapter-consistency-check.ts");
  assert.match(consistencySource, /let checkJob/);
  assert.match(consistencySource, /let repairJob/);
  assert.match(consistencySource, /activeStep/);
  assert.match(consistencySource, /一致性校验异常，已降级跳过/);
  assert.match(consistencySource, /一致性修复异常，已降级使用原文/);
  assert.match(consistencySource, /额度不足，跳过校验/);
  assert.match(consistencySource, /failAiStepJob\(\{[\s\S]*jobId: checkJob\.id/);
  assert.match(consistencySource, /failAiStepJob\(\{[\s\S]*jobId: repairJob\.id/);
});

test("assembledContext suppresses legacy prompt context while fallback remains", async () => {
  const { buildChapterUserPrompt } = await import("../src/lib/ai/chapter-prompt.ts");
  const outline = {
    tag: "玄幻",
    title: "命灯",
    synopsis: "少年修复命灯",
    volumes: [{ name: "青岚卷", desc: "命灯危机", startChapter: 1, endChapter: 20, segments: [] }],
    characters: [{ name: "林舷", role: "protagonist", desc: "执灯人" }],
  };
  const base = {
    chapterIndex: 2,
    work: {
      title: "命灯",
      idea: "少年修复命灯",
      synopsis: "青岚城危机",
      tags: [],
      workType: "long_novel",
    },
    outline,
    context: {
      previousSummary: "旧摘要",
      recentSummaries: [{ index: 1, title: "旧章", summary: "旧章摘要" }],
      writingMemories: ["长期写作记忆"],
      characters: ["角色库条目"],
    },
  };

  const assembled = buildChapterUserPrompt({
    ...base,
    assembledContext: "引擎上下文",
  });
  assert.match(assembled, /NovelContextEngine 组装上下文/);
  assert.doesNotMatch(assembled, /长期写作记忆与约束/);
  assert.doesNotMatch(assembled, /最近章节摘要/);
  assert.doesNotMatch(assembled, /角色库条目/);

  const fallback = buildChapterUserPrompt(base);
  assert.match(fallback, /长期写作记忆与约束/);
  assert.match(fallback, /最近章节摘要/);
});

test("ConsistencyCheck long parser accepts valid JSON", async () => {
  const { parseChapterConsistencyCheck } = await import(
    "../src/lib/ai/chapter-consistency-check.ts"
  );
  const parsed = parseChapterConsistencyCheck(
    '{"passed":true,"score":88,"issues":[],"repairPrompt":""}',
  );
  assert.deepEqual(parsed, {
    passed: true,
    score: 88,
    issues: [],
    repairPrompt: "",
  });
});

test("ConsistencyCheck short parser normalizes low score to failed", async () => {
  const { parseChapterConsistencyCheck } = await import(
    "../src/lib/ai/chapter-consistency-check.ts"
  );
  const parsed = parseChapterConsistencyCheck(
    '{"passed":true,"score":62,"issues":["节奏拖沓"],"repairPrompt":"压缩铺垫"}',
  );
  assert.equal(parsed?.passed, false);
  assert.equal(parsed?.score, 62);
  assert.deepEqual(parsed?.issues, ["节奏拖沓"]);
});

test("canonState long merge caps and dedupes arrays", async () => {
  const { mergeNovelCanonState, CANON_STATE_LIMITS } = await import(
    "../src/lib/ai/novel-canon-state.ts"
  );
  const state = mergeNovelCanonState({
    current: {
      mode: "long",
      long: {
        characterStates: Array.from({ length: 220 }, (_, index) => `角色状态${index}`),
        worldRules: [],
        openForeshadowings: ["旧誓约"],
      },
    },
    mode: "long",
    chapterIndex: 12,
    chapterTitle: "命灯裂开",
    chapterContent: "林舟决定履行旧誓约。",
    generationPlan: {
      mode: "long",
      mustUseMemories: ["林舟受伤但清醒", "林舟受伤但清醒"],
      mustAdvanceForeshadowings: ["旧誓约"],
      mustAvoid: ["不要忘记伤势"],
    },
  });

  assert.equal(state.mode, "long");
  assert.ok(state.long.characterStates.length <= CANON_STATE_LIMITS.longCharacterStates);
  assert.equal(state.long.openForeshadowings.filter((item) => item === "旧誓约").length, 1);
  assert.equal(state.updatedAtChapter, 12);
});

test("canonState short merge stays compact", async () => {
  const { mergeNovelCanonState, CANON_STATE_LIMITS } = await import(
    "../src/lib/ai/novel-canon-state.ts"
  );
  const state = mergeNovelCanonState({
    current: {
      mode: "short",
      short: {
        beatsProgress: Array.from({ length: 40 }, (_, index) => `beat${index}`),
        mustResolveBeforeEnd: Array.from({ length: 20 }, (_, index) => `问题${index}`),
        forbiddenNewThreads: Array.from({ length: 20 }, (_, index) => `禁止${index}`),
      },
    },
    mode: "short",
    chapterIndex: 3,
    chapterTitle: "道别",
    chapterContent: "许眠终于说出真相。",
    generationPlan: {
      mode: "short",
      beatGoal: "完成告别",
      emotionalTurn: "逃避到面对",
      mustResolve: ["电话另一端是谁"],
      mustNotOpen: ["不要新增家族阴谋"],
    },
  });

  assert.equal(state.mode, "short");
  assert.ok(state.short.beatsProgress.length <= CANON_STATE_LIMITS.shortBeatsProgress);
  assert.ok(state.short.mustResolveBeforeEnd.length <= CANON_STATE_LIMITS.shortMustResolveBeforeEnd);
  assert.ok(state.short.forbiddenNewThreads.length <= CANON_STATE_LIMITS.shortForbiddenNewThreads);
});

test("context extraction payload merges into long canonState", async () => {
  const { mergeCanonStateFromExtractionPayload } = await import(
    "../src/lib/ai/novel-canon-state.ts"
  );
  const state = mergeCanonStateFromExtractionPayload({
    current: null,
    mode: "long",
    chapterIndex: 5,
    chapterTitle: "灯下誓言",
    payload: {
      summary: "林舟确认命灯规则。",
      memories: [
        { kind: "constraint", priority: 90, content: "命灯不可被外人触碰" },
        { kind: "continuity", priority: 80, content: "林舟左臂仍有伤" },
      ],
      timelineEvents: [{ title: "确认规则", summary: "命灯规则被确认" }],
      foreshadowings: [
        { title: "旧誓约", hint: "青岚城旧誓约", status: "open" },
        { title: "黑伞", hint: "黑伞来历", payoff: "已揭示", status: "resolved" },
      ],
      characterUpdates: [{ name: "林舟", currentState: "左臂受伤" }],
    },
  });

  assert.match(state.long.characterStates.join("\n"), /林舟/);
  assert.match(state.long.worldRules.join("\n"), /命灯不可/);
  assert.match(state.long.openForeshadowings.join("\n"), /旧誓约/);
  assert.match(state.long.resolvedForeshadowings.join("\n"), /黑伞/);
});

test("context extraction payload merges into short canonState compactly", async () => {
  const { mergeCanonStateFromExtractionPayload, CANON_STATE_LIMITS } = await import(
    "../src/lib/ai/novel-canon-state.ts"
  );
  const state = mergeCanonStateFromExtractionPayload({
    current: {
      mode: "short",
      short: {
        mustResolveBeforeEnd: ["电话另一端是谁"],
      },
    },
    mode: "short",
    chapterIndex: 2,
    chapterTitle: "真相",
    payload: {
      summary: "许眠接起电话。",
      memories: [{ kind: "plot_thread", priority: 80, content: "必须解释电话来源" }],
      foreshadowings: [{ title: "电话", hint: "电话另一端是谁", status: "resolved" }],
    },
  });

  assert.match(state.short.beatsProgress.join("\n"), /许眠接起电话/);
  assert.doesNotMatch(state.short.mustResolveBeforeEnd.join("\n"), /电话另一端是谁/);
  assert.ok(state.short.mustResolveBeforeEnd.length <= CANON_STATE_LIMITS.shortMustResolveBeforeEnd);
});

test("canonState compression groups character states and caps short beats", async () => {
  const { compressNovelCanonState } = await import("../src/lib/ai/novel-canon-compression.ts");
  const compressed = compressNovelCanonState({
    mode: "long",
    long: {
      mainPlot: "",
      currentVolume: "",
      volumeSummaries: Array.from({ length: 100 }, (_, index) => `第${index}章摘要`),
      characterStates: [
        ...Array.from({ length: 80 }, (_, index) => `林舷：状态${index}`),
        ...Array.from({ length: 80 }, (_, index) => `许眠：状态${index}`),
        ...Array.from({ length: 80 }, (_, index) => `沈河：状态${index}`),
      ],
      relationships: [],
      worldRules: Array.from({ length: 130 }, (_, index) => `规则${index}`),
      openForeshadowings: Array.from({ length: 80 }, (_, index) => `伏笔${index}`),
      resolvedForeshadowings: Array.from({ length: 120 }, (_, index) => `已解${index}`),
      forbiddenContradictions: [],
    },
    short: {
      theme: "",
      coreConflict: "",
      emotionalArc: "",
      beatsProgress: Array.from({ length: 30 }, (_, index) => `beat${index}`),
      mustResolveBeforeEnd: Array.from({ length: 12 }, (_, index) => `问题${index}`),
      forbiddenNewThreads: Array.from({ length: 12 }, (_, index) => `禁止${index}`),
    },
    updatedAtChapter: 100,
  });

  assert.ok(compressed.long.volumeSummaries.length <= 40);
  assert.ok(compressed.long.characterStates.length <= 120);
  assert.ok(compressed.long.characterStates.filter((item) => item.startsWith("林舷")).length <= 3);
  assert.ok(compressed.long.worldRules.length <= 80);
  assert.ok(compressed.long.openForeshadowings.length <= 50);
  assert.ok(compressed.short.beatsProgress.length <= 10);
  assert.ok(compressed.short.mustResolveBeforeEnd.length <= 8);
});

test("non-stream length repair and quality check use final ordered provider flow", () => {
  const generateSource = read("src/backend/ai/chapter/generate-service.ts");
  const repairIndex = generateSource.indexOf("const lengthRepair = await repairChapterLengthIfNeeded");
  const qualityIndex = generateSource.indexOf("const quality = await runChapterQualityCheck");

  assert.ok(repairIndex > 0, "length repair call should exist");
  assert.ok(qualityIndex > repairIndex, "quality check should run after length repair");

  const repairBlock = generateSource.slice(repairIndex, qualityIndex);
  assert.match(repairBlock, /providers:\s*orderedProviders/);
  assert.match(repairBlock, /preferredProviderId:\s*result\.providerId \?\? selected\.provider\.id/);
  assert.doesNotMatch(repairBlock, /providers,\s*\n/);
  assert.doesNotMatch(repairBlock, /preferredProviderId:\s*primaryProvider\.id/);

  const qualityBlock = generateSource.slice(qualityIndex, generateSource.indexOf("if (prepared.existingChapter", qualityIndex));
  assert.match(qualityBlock, /title:\s*lengthRepair\.draft\.title/);
  assert.match(qualityBlock, /content:\s*lengthRepair\.draft\.content/);
});

test("chapter auxiliary flags default by membership and respect env overrides", async () => {
  const { getChapterAuxiliaryFlags } = await import("../src/lib/ai/chapter-auxiliary-flags.ts");
  const keys = [
    "AI_ENABLE_CHAPTER_PLAN",
    "AI_ENABLE_CONSISTENCY_CHECK",
    "AI_ENABLE_CONSISTENCY_REPAIR",
    "AI_ENABLE_QUALITY_CHECK",
  ];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];

  try {
    assert.equal(getChapterAuxiliaryFlags({ email: "free@example.com", membershipTier: "default" }).qualityCheck, false);
    assert.equal(getChapterAuxiliaryFlags({ email: "plus@example.com", membershipTier: "plus" }).qualityCheck, true);
    assert.equal(getChapterAuxiliaryFlags({ email: "pro@example.com", membershipTier: "pro" }).qualityCheck, true);
    assert.equal(getChapterAuxiliaryFlags({ email: "max@example.com", membershipTier: "max" }).qualityCheck, true);
    assert.equal(getChapterAuxiliaryFlags({ email: "admin@example.com", role: "admin" }).qualityCheck, true);

    process.env.AI_ENABLE_CONSISTENCY_REPAIR = "false";
    assert.equal(getChapterAuxiliaryFlags({ email: "plus@example.com", membershipTier: "plus" }).consistencyRepair, false);
    process.env.AI_ENABLE_QUALITY_CHECK = "false";
    assert.equal(getChapterAuxiliaryFlags({ email: "max@example.com", membershipTier: "max" }).qualityCheck, false);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("quality prompt is modular and does not conflict with chapter body schema", async () => {
  const {
    buildChapterQualitySystemPrompt,
    buildChapterQualityUserPrompt,
  } = await import("../src/lib/ai/chapter-quality-prompt.ts");
  const systemPrompt = buildChapterQualitySystemPrompt();
  const userPrompt = buildChapterQualityUserPrompt({
    mode: "long",
    title: "裂纹",
    content: "林舟继续追查命灯。",
    assembledContext: "上一章：命灯裂开。",
    generationPlan: null,
  });

  assert.match(systemPrompt, /quality JSON/);
  assert.match(systemPrompt, /不要修文/);
  assert.doesNotMatch(systemPrompt, /\{"title"/);
  assert.doesNotMatch(systemPrompt, /"content"\}/);
  assert.match(userPrompt, /输出 JSON/);
});

test("quality check parser accepts bounded score JSON", async () => {
  const { parseChapterQualityCheck } = await import("../src/lib/ai/chapter-quality-check.ts");
  const parsed = parseChapterQualityCheck(
    '{"score":86,"rhythm":82,"hook":90,"emotion":84,"conflict":88,"issues":["节奏略慢"],"suggestions":["压缩铺垫"]}',
  );

  assert.deepEqual(parsed, {
    score: 86,
    rhythm: 82,
    hook: 90,
    emotion: 84,
    conflict: 88,
    issues: ["节奏略慢"],
    suggestions: ["压缩铺垫"],
  });
});

test("auxiliary timeout signal aborts and throws explicit action errors", async () => {
  const { withAuxiliaryTimeoutSignal, isAuxiliaryTimeoutError } = await import(
    "../src/lib/ai/chapter-auxiliary-timeout.ts"
  );
  const previous = process.env.AI_QUALITY_CHECK_TIMEOUT_MS;
  process.env.AI_QUALITY_CHECK_TIMEOUT_MS = "1";
  let aborted = false;

  try {
    await assert.rejects(
      () =>
        withAuxiliaryTimeoutSignal(
          "chapter_quality_check",
          (signal) =>
            new Promise((resolve) => {
              signal.addEventListener("abort", () => {
                aborted = true;
              });
              setTimeout(() => resolve("late"), 30);
            }),
        ),
      (error) =>
        error instanceof Error &&
        error.message === "auxiliary_timeout:chapter_quality_check" &&
        isAuxiliaryTimeoutError(error, "chapter_quality_check"),
    );
    assert.equal(aborted, true);
  } finally {
    if (previous === undefined) delete process.env.AI_QUALITY_CHECK_TIMEOUT_MS;
    else process.env.AI_QUALITY_CHECK_TIMEOUT_MS = previous;
  }
});

test("ChapterPlan and QualityCheck timeout degrade safely", async () => {
  const { buildChapterPlan } = await import("../src/lib/ai/chapter-plan.ts");
  const { runChapterQualityCheck } = await import("../src/lib/ai/chapter-quality-check.ts");
  const previousPlan = process.env.AI_CHAPTER_PLAN_TIMEOUT_MS;
  const previousQuality = process.env.AI_QUALITY_CHECK_TIMEOUT_MS;
  process.env.AI_CHAPTER_PLAN_TIMEOUT_MS = "1";
  process.env.AI_QUALITY_CHECK_TIMEOUT_MS = "1";

  try {
    const plan = await buildChapterPlan({
      mode: "long",
      chapterIndex: 3,
      assembledContext: "上一章结尾：命灯裂开。",
      user: { email: "plus@example.com", membershipTier: "plus" },
      callText: ({ signal }) =>
        new Promise((resolve) => {
          assert.ok(signal instanceof AbortSignal);
          setTimeout(() => resolve({ ok: true, text: "{}" }), 30);
        }),
    });
    assert.equal(plan.mode, "long");
    assert.ok(plan.chapterGoal.length > 0);

    const quality = await runChapterQualityCheck({
      mode: "long",
      title: "裂纹",
      content: "林舟继续追查命灯。",
      assembledContext: "上一章：命灯裂开。",
      user: { email: "plus@example.com", membershipTier: "plus" },
      callText: ({ signal }) =>
        new Promise((resolve) => {
          assert.ok(signal instanceof AbortSignal);
          setTimeout(() => resolve({ ok: true, text: "{}" }), 30);
        }),
    });
    assert.equal(quality, null);
  } finally {
    if (previousPlan === undefined) delete process.env.AI_CHAPTER_PLAN_TIMEOUT_MS;
    else process.env.AI_CHAPTER_PLAN_TIMEOUT_MS = previousPlan;
    if (previousQuality === undefined) delete process.env.AI_QUALITY_CHECK_TIMEOUT_MS;
    else process.env.AI_QUALITY_CHECK_TIMEOUT_MS = previousQuality;
  }
});

test("quality check records step job and is wired into non-stream generation", () => {
  const qualitySource = read("src/lib/ai/chapter-quality-check.ts");
  const generateSource = read("src/backend/ai/chapter/generate-service.ts");
  assert.match(qualitySource, /action: "chapter\.quality_check"/);
  assert.match(qualitySource, /parseChapterQualityCheck/);
  assert.match(generateSource, /runChapterQualityCheck\(\{/);
  assert.match(generateSource, /质量评分/);
  assert.match(qualitySource, /JSON=\$\{JSON\.stringify/);
  assert.match(qualitySource, /resultJson:\s*quality/);
});

test("auxiliary AI quota shortage degrades without blocking save", () => {
  const planSource = read("src/lib/ai/chapter-plan.ts");
  const consistencySource = read("src/lib/ai/chapter-consistency-check.ts");
  const qualitySource = read("src/lib/ai/chapter-quality-check.ts");

  assert.match(planSource, /额度不足，使用规则计划/);
  assert.match(consistencySource, /额度不足，跳过修复/);
  assert.match(qualitySource, /额度不足，跳过质量评分/);
  assert.match(planSource + consistencySource + qualitySource, /error instanceof AuthApiError && error\.status === 429/);
});

test("canon AI compression is optional and background-only", async () => {
  const { shouldRunCanonAiCompression } = await import("../src/lib/ai/novel-canon-ai-compression.ts");
  const contextExtractSource = read("src/lib/ai/chapter-context-extract.ts");
  const previous = process.env.AI_ENABLE_CANON_AI_COMPRESSION;
  delete process.env.AI_ENABLE_CANON_AI_COMPRESSION;

  const largeState = {
    mode: "long",
    long: {
      mainPlot: "",
      currentVolume: "",
      volumeSummaries: Array.from({ length: 120 }, (_, index) => `卷摘要${index}`),
      characterStates: Array.from({ length: 160 }, (_, index) => `角色：状态${index}`),
      relationships: [],
      worldRules: [],
      openForeshadowings: [],
      resolvedForeshadowings: [],
      forbiddenContradictions: [],
    },
    short: {
      theme: "",
      coreConflict: "",
      emotionalArc: "",
      beatsProgress: [],
      mustResolveBeforeEnd: [],
      forbiddenNewThreads: [],
    },
    updatedAtChapter: 120,
  };

  try {
    assert.equal(shouldRunCanonAiCompression(largeState), false);
    process.env.AI_ENABLE_CANON_AI_COMPRESSION = "true";
    assert.equal(shouldRunCanonAiCompression(largeState), true);
    assert.match(contextExtractSource, /runCanonAiCompression\(\{/);
    assert.match(read("src/lib/ai/novel-canon-ai-compression.ts"), /action:\s*"canon\.compress"/);
  } finally {
    if (previous === undefined) delete process.env.AI_ENABLE_CANON_AI_COMPRESSION;
    else process.env.AI_ENABLE_CANON_AI_COMPRESSION = previous;
  }
});

test("canon compress uses unified AI step job and timeout fallback", () => {
  const source = read("src/lib/ai/novel-canon-ai-compression.ts");
  assert.match(source, /from "@\/lib\/ai\/ai-step-job"/);
  assert.match(source, /withAuxiliaryTimeoutSignal\("canon_compress"/);
  assert.match(source, /canonState AI 压缩超时，已跳过/);
  assert.match(source, /resultJson:\s*\{/);
  assert.doesNotMatch(source, /prisma\.generationJob\s*\.\s*create/);
});

test("chapter quality report prefers resultJson and never promptSnapshot", async () => {
  const {
    parseQualityReportPayload,
    parseQualityReportResultJson,
    parseQualityReportScore,
  } = await import("../src/lib/ai/chapter-quality-report.ts");
  const reportSource = read("src/lib/ai/chapter-quality-report.ts");

  const resultJson = parseQualityReportResultJson({
    score: 91,
    rhythm: 88,
    hook: 90,
    emotion: 92,
    conflict: 89,
    issues: ["钩子稍弱"],
    suggestions: ["加强结尾压力"],
  });
  assert.equal(resultJson?.score, 91);
  assert.deepEqual(resultJson?.issues, ["钩子稍弱"]);

  const parsed = parseQualityReportPayload(
    '章节质量评分完成，score=86 JSON={"issues":["节奏略慢"],"suggestions":["压缩铺垫"],"rhythm":82,"hook":90,"emotion":84,"conflict":88}',
  );
  assert.equal(parsed?.score, 86);
  assert.deepEqual(parsed?.issues, ["节奏略慢"]);
  assert.deepEqual(parsed?.suggestions, ["压缩铺垫"]);
  assert.equal(parseQualityReportScore("章节质量评分完成，score=73"), 73);
  assert.equal(parseQualityReportPayload('promptSnapshot 示例 {"issues":["不应读取"]}'), null);
  assert.doesNotMatch(reportSource, /promptSnapshot/);
  assert.match(reportSource, /resultJson:\s*true/);
});

test("short final beat context enables final closure consistency checks", async () => {
  const { buildNovelContextFromData } = await import("../src/lib/ai/novel-context-engine.ts");
  const shortInput = {
    work: {
      id: "short-final",
      workType: "short_story",
      title: "雨夜电话",
      idea: "雨夜电话让主角完成告别",
      synopsis: "必须在天亮前说出真相",
      canonState: null,
      outline: {
        tag: "现实",
        title: "雨夜电话",
        synopsis: "必须在天亮前说出真相",
        targetWords: 6000,
        theme: "告别",
        hook: "电话另一端传来已故好友声音",
        endingType: "closed",
        characters: [{ name: "许眠", role: "主角", description: "逃避告别的人" }],
        beats: [
          { index: 1, title: "来电", purpose: "建立冲突", targetWords: 1500, writingPrompt: "电话响起" },
          { index: 2, title: "真相", purpose: "面对真相", targetWords: 1800, writingPrompt: "说出隐瞒之事" },
          { index: 3, title: "道别", purpose: "完成收束", targetWords: 1500, writingPrompt: "天亮前道别" },
        ],
      },
    },
    chapterIndex: 3,
    previousChapters: [
      { index: 1, title: "来电", content: "电话响起。", wordCount: 20, summary: "许眠拒接电话" },
      { index: 2, title: "真相", content: "许眠说出隐瞒。", wordCount: 20, summary: "许眠面对真相" },
    ],
    writingMemories: [],
    characters: [],
    worldSettings: [],
    timelineEvents: [],
    foreshadowings: [],
  };
  const context = buildNovelContextFromData(shortInput);
  const consistencySource = read("src/lib/ai/chapter-consistency-check.ts");

  assert.match(context.text, /当前是短篇最后 beat/);
  assert.equal(context.sections.isFinalBeat, "true");
  assert.match(consistencySource, /是否回收核心冲突/);
  assert.match(consistencySource, /是否完成主题落点/);
  assert.doesNotMatch(consistencySource, /如果是最后 beat，是否完成收束/);

  const nonFinal = buildNovelContextFromData({
    ...shortInput,
    chapterIndex: 2,
  });
  assert.equal(nonFinal.mode, "short");
  assert.doesNotMatch(nonFinal.text, /当前是短篇最后 beat/);
});

test("consistency check uses structured final beat flag instead of context regex", async () => {
  const { runChapterConsistencyCheck } = await import("../src/lib/ai/chapter-consistency-check.ts");
  const consistencySource = read("src/lib/ai/chapter-consistency-check.ts");
  let prompt = "";

  await runChapterConsistencyCheck({
    mode: "short",
    title: "道别",
    content: "许眠完成告别。",
    assembledContext: "这里没有最后 beat 文字。",
    isFinalShortBeat: true,
    callText: async ({ messages }) => {
      prompt = messages.map((message) => message.content).join("\n");
      return {
        ok: true,
        text: '{"passed":true,"score":88,"issues":[],"repairPrompt":""}',
      };
    },
  });

  assert.match(prompt, /是否回收核心冲突/);
  assert.match(prompt, /是否完成主题落点/);
  assert.match(consistencySource, /params\.isFinalShortBeat === true/);
  assert.doesNotMatch(consistencySource, /assembledContext\).*最后/);
});

test("chapter quality report reads scores and quality issue payloads", () => {
  const reportSource = read("src/lib/ai/chapter-quality-report.ts");
  assert.match(reportSource, /export async function getChapterQualityReport/);
  assert.match(reportSource, /action:\s*"chapter\.consistency_check"/);
  assert.match(reportSource, /action:\s*"chapter\.quality_check"/);
  assert.match(reportSource, /consistencyIssues/);
  assert.match(reportSource, /consistencyProviderId/);
  assert.match(reportSource, /consistencyModelUsed/);
  assert.match(reportSource, /consistencyTokens/);
  assert.match(reportSource, /consistencyDurationMs/);
  assert.match(reportSource, /qualityProviderId/);
  assert.match(reportSource, /qualityModelUsed/);
  assert.match(reportSource, /qualityTokens/);
  assert.match(reportSource, /qualityDurationMs/);
  assert.match(reportSource, /qualityIssues/);
  assert.match(reportSource, /qualitySuggestions/);
  assert.match(reportSource, /score=\(\\d\{1,3\}\)/);
  assert.match(reportSource, /invalid generationJob\.resultJson/);
  assert.match(reportSource, /\\bJSON=/);
  assert.doesNotMatch(reportSource, /promptSnapshot/);
});

test("work quality trend aggregates latest chapter jobs in ascending order", () => {
  const trendSource = read("src/lib/ai/work-quality-trend.ts");
  assert.match(trendSource, /export async function getWorkQualityTrend/);
  assert.match(trendSource, /chapter\.consistency_check/);
  assert.match(trendSource, /chapter\.quality_check/);
  assert.match(trendSource, /keepLatestByChapterAndAction/);
  assert.match(trendSource, /\.sort\(\(left, right\) => left - right\)/);
  assert.match(trendSource, /parseQualityReportPayload/);
  assert.match(trendSource, /prisma\.generationJob\.groupBy\(\{/);
  assert.match(trendSource, /by:\s*\["chapterIndex"\]/);
  assert.match(trendSource, /orderBy:\s*\[\{ chapterIndex: "desc" \}\]/);
  assert.doesNotMatch(trendSource, /distinct:\s*\["chapterIndex"\]/);
  assert.match(trendSource, /orderBy\?: "chapterIndex" \| "updatedAt"/);
  assert.match(trendSource, /getRecentChapterIndexesByUpdatedAt/);
  assert.match(trendSource, /consistencyIssues/);
  assert.match(trendSource, /consistencyProviderId/);
  assert.match(trendSource, /qualityProviderId/);
  assert.match(trendSource, /consistencyDurationMs/);
  assert.match(trendSource, /qualityDurationMs/);
  assert.doesNotMatch(trendSource, /safeLimit\s*\*\s*6/);
});

test("ai step jobs support resultJson and quality API enforces work access", () => {
  const stepJobSource = read("src/lib/ai/ai-step-job.ts");
  const schemaSource = read("prisma/schema.prisma");
  const apiSource = read("src/app/api/workbench/works/[workId]/chapters/[index]/quality/route.ts");
  const trendApiSource = read("src/app/api/workbench/works/[workId]/quality-trend/route.ts");
  const costApiSource = read("src/app/api/workbench/works/[workId]/auxiliary-cost/route.ts");
  const adminCostApiSource = read("src/app/api/admin/ai/auxiliary-cost/route.ts");
  const modelQualityApiSource = read("src/app/api/workbench/works/[workId]/model-quality-report/route.ts");
  const dateRangeSource = read("src/lib/http/date-range.ts");
  const upstreamText = read("src/backend/ai/upstream/text-service.ts");
  const upstreamRequest = read("src/backend/ai/upstream/request.ts");
  const upstreamStreamRequest = read("src/backend/ai/upstream/stream-request.ts");

  assert.match(schemaSource, /resultJson\s+Json\?/);
  assert.match(stepJobSource, /resultJson\?: Prisma\.InputJsonValue/);
  assert.match(stepJobSource, /resultJson: params\.resultJson/);
  assert.match(apiSource, /requireWorkAccess\(params\.workId\)/);
  assert.match(apiSource, /getChapterQualityReport\(params\.workId, params\.index\)/);
  assert.match(trendApiSource, /requireWorkAccess\(params\.workId\)/);
  assert.match(trendApiSource, /getWorkQualityTrend\(params\.workId/);
  assert.match(costApiSource, /requireWorkAccess\(params\.workId\)/);
  assert.match(costApiSource, /parseDateRangeFromSearchParams/);
  assert.match(costApiSource, /getAuxiliaryAiCostReport\(params\.workId/);
  assert.match(adminCostApiSource, /requireAdminUser\(\)/);
  assert.match(adminCostApiSource, /parseDateRangeFromSearchParams/);
  assert.match(adminCostApiSource, /getGlobalAuxiliaryAiCostReport\(\{/);
  assert.match(modelQualityApiSource, /requireWorkAccess\(params\.workId\)/);
  assert.match(modelQualityApiSource, /parseDateRangeFromSearchParams/);
  assert.match(modelQualityApiSource, /getModelQualityReport\(params\.workId/);
  assert.match(modelQualityApiSource, /minJobs/);
  assert.match(dateRangeSource, /parseOptionalDate/);
  assert.match(dateRangeSource, /assertValidDateRange/);
  assert.match(dateRangeSource, /parseDateRangeFromSearchParams/);
  assert.match(dateRangeSource, /must be a valid ISO date/);
  assert.match(dateRangeSource, /from must be earlier than to\./);
  assert.match(upstreamText, /signal\?: AbortSignal/);
  assert.match(upstreamRequest, /signal: requestTimeout\.signal/);
  assert.match(upstreamRequest, /upstream_aborted/);
  assert.match(upstreamStreamRequest, /upstream_aborted/);
  assert.doesNotMatch(upstreamStreamRequest, /用户已取消生成/);
});

test("backfill and auxiliary cost report cover quality persistence", () => {
  const backfillSource = read("scripts/backfill-generation-job-result-json.mjs");
  const costSource = read("src/lib/ai/auxiliary-cost-report.ts");

  assert.match(backfillSource, /--dry-run/);
  assert.match(backfillSource, /--apply/);
  assert.match(backfillSource, /--limit/);
  assert.match(backfillSource, /--action/);
  assert.match(backfillSource, /chapter\.consistency_check/);
  assert.match(backfillSource, /resultJson:\s*\{\s*equals:\s*null\s*\}/s);
  assert.match(backfillSource, /JSON=\(\\\{/);
  assert.match(backfillSource, /stringArray\(marker\?\.issues\)/);
  assert.match(backfillSource, /mode === "dry-run"/);
  assert.match(backfillSource, /batchSize = 100/);

  for (const action of [
    "chapter.plan",
    "chapter.consistency_check",
    "chapter.consistency_repair",
    "chapter.quality_check",
    "canon.compress",
  ]) {
    assert.match(costSource, new RegExp(action.replace(".", "\\.")));
  }
  assert.match(costSource, /groupBy\(\{/);
  assert.match(costSource, /totalTokens/);
  assert.match(costSource, /avgTokensPerJob/);
  assert.match(costSource, /avgInputTokensPerJob/);
  assert.match(costSource, /avgOutputTokensPerJob/);
  assert.match(costSource, /jobCount/);
  assert.match(costSource, /getGlobalAuxiliaryAiCostReport/);
  assert.match(costSource, /byUser/);
  assert.match(costSource, /byWork/);
  assert.match(costSource, /byProvider/);
  assert.match(costSource, /byModel/);
  assert.match(costSource, /by:\s*\["providerId"\]/);
  assert.match(costSource, /by:\s*\["providerId", "modelUsed"\]/);
});

test("model quality report aggregates provider model quality observability", () => {
  const modelQualitySource = read("src/lib/ai/model-quality-report.ts");

  assert.match(modelQualitySource, /export async function getModelQualityReport/);
  assert.match(modelQualitySource, /providerId/);
  assert.match(modelQualitySource, /modelUsed/);
  assert.match(modelQualitySource, /avgConsistencyScore/);
  assert.match(modelQualitySource, /avgQualityScore/);
  assert.match(modelQualitySource, /consistencyJobCount/);
  assert.match(modelQualitySource, /qualityJobCount/);
  assert.match(modelQualitySource, /consistencyTokens/);
  assert.match(modelQualitySource, /qualityTokens/);
  assert.match(modelQualitySource, /avgConsistencyDurationMs/);
  assert.match(modelQualitySource, /avgQualityDurationMs/);
  assert.match(modelQualitySource, /sampleWarning/);
  assert.match(modelQualitySource, /样本量过低/);
  assert.match(modelQualitySource, /评分数据不完整/);
  assert.match(modelQualitySource, /minJobs/);
  assert.match(modelQualitySource, /jobCount/);
  assert.match(modelQualitySource, /totalTokens/);
  assert.match(modelQualitySource, /avgDurationMs/);
  assert.match(modelQualitySource, /parseConsistencyReportResultJson/);
  assert.match(modelQualitySource, /parseQualityReportScore/);
});

test("work AI observability dashboard aggregates quality and cost reports", () => {
  const source = read("src/lib/ai/work-ai-observability.ts");
  const apiSource = read("src/app/api/workbench/works/[workId]/ai-observability/route.ts");

  assert.match(source, /export async function getWorkAiObservability/);
  assert.match(source, /getGenerationCostReport/);
  assert.match(source, /getChapterGenerationObservability/);
  assert.match(source, /buildModelRecommendationReport/);
  assert.match(source, /getWorkQualityTrend/);
  assert.match(source, /getModelQualityReport/);
  assert.match(source, /getAuxiliaryAiCostReport/);
  assert.match(source, /getChapterQualityReport/);
  assert.match(source, /summary/);
  assert.match(source, /modelRecommendation/);
  assert.match(source, /generationCost/);
  assert.match(source, /chapterGeneration/);
  assert.match(source, /latestChapterReport/);
  assert.match(source, /avgQualityScore/);
  assert.match(source, /avgConsistencyScore/);
  assert.match(source, /totalGenerationTokens/);
  assert.match(source, /totalAuxiliaryTokens/);
  assert.match(source, /repairedChapterCount/);
  assert.match(source, /lengthRepairedChapterCount/);
  assert.match(source, /bestQualityModel/);
  assert.match(source, /bestValueModel/);
  assert.match(source, /fastestModel/);
  assert.match(source, /chapterLimit/);
  assert.match(apiSource, /requireWorkAccess\(params\.workId\)/);
  assert.match(apiSource, /parseDateRangeFromSearchParams/);
  assert.match(apiSource, /getWorkAiObservability\(params\.workId/);
  assert.match(apiSource, /trendLimit/);
  assert.match(apiSource, /modelMinJobs/);
  assert.match(apiSource, /chapterLimit/);
  assert.match(apiSource, /max\(300\)/);
});

test("model recommendation report exposes quality value speed and exclusions", () => {
  const source = read("src/lib/ai/model-recommendation-report.ts");

  assert.match(source, /bestQuality/);
  assert.match(source, /bestValue/);
  assert.match(source, /fastest/);
  assert.match(source, /notRecommended/);
  assert.match(source, /reason/);
  assert.match(source, /sampleWarning/);
  assert.match(source, /质量与 token 成本比例较优/);
});

test("generation cost and chapter observability include main generation actions", () => {
  const costSource = read("src/lib/ai/generation-cost-report.ts");
  const auxiliaryCostSource = read("src/lib/ai/auxiliary-cost-report.ts");
  const chapterSource = read("src/lib/ai/chapter-generation-observability.ts");

  for (const action of [
    "chapter.generate",
    "chapter.generate.stream",
    "chapter_generate",
    "chapter_regenerate",
    "chapter_generate_length_repair",
    "chapter.plan",
    "chapter.consistency_check",
    "chapter.quality_check",
    "canon.compress",
  ]) {
    assert.match(costSource + auxiliaryCostSource + chapterSource, new RegExp(action.replaceAll(".", "\\.")));
  }
  assert.match(costSource, /getGenerationCostReport/);
  assert.match(costSource, /getGlobalAuxiliaryAiCostReport/);
  assert.match(chapterSource, /getChapterGenerationObservability/);
  assert.match(chapterSource, /generateProviderId/);
  assert.match(chapterSource, /generateModelUsed/);
  assert.match(chapterSource, /generateTokens/);
  assert.match(chapterSource, /generateDurationMs/);
  assert.match(chapterSource, /repaired/);
  assert.match(chapterSource, /lengthRepaired/);
  assert.match(chapterSource, /ChapterGenerationObservabilityOptions/);
  assert.match(chapterSource, /from\?: Date/);
  assert.match(chapterSource, /to\?: Date/);
  assert.match(chapterSource, /limit\?: number/);
  assert.match(chapterSource, /Math\.min\(300/);
  assert.match(chapterSource, /prisma\.generationJob\.groupBy\(\{/);
  assert.match(chapterSource, /_max:\s*\{ createdAt: true \}/);
  assert.match(chapterSource, /chapterIndex:\s*\{ in: chapterIndexes \}/);
  assert.match(chapterSource, /createdAt: buildCreatedAtWhere\(options\)/);
  assert.match(chapterSource, /generateSucceeded/);
  assert.match(chapterSource, /generateFailed/);
  assert.match(chapterSource, /repairSucceeded/);
  assert.match(chapterSource, /lengthRepairSucceeded/);
});

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

test("auxiliary timeout throws explicit action errors", async () => {
  const { withAuxiliaryTimeout, isAuxiliaryTimeoutError } = await import(
    "../src/lib/ai/chapter-auxiliary-timeout.ts"
  );
  const previous = process.env.AI_QUALITY_CHECK_TIMEOUT_MS;
  process.env.AI_QUALITY_CHECK_TIMEOUT_MS = "1";

  try {
    await assert.rejects(
      () =>
        withAuxiliaryTimeout(
          "chapter_quality_check",
          () => new Promise((resolve) => setTimeout(() => resolve("late"), 30)),
        ),
      (error) =>
        error instanceof Error &&
        error.message === "auxiliary_timeout:chapter_quality_check" &&
        isAuxiliaryTimeoutError(error, "chapter_quality_check"),
    );
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
      callText: () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, text: "{}" }), 30)),
    });
    assert.equal(plan.mode, "long");
    assert.ok(plan.chapterGoal.length > 0);

    const quality = await runChapterQualityCheck({
      mode: "long",
      title: "裂纹",
      content: "林舟继续追查命灯。",
      assembledContext: "上一章：命灯裂开。",
      user: { email: "plus@example.com", membershipTier: "plus" },
      callText: () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, text: "{}" }), 30)),
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
  assert.match(source, /withAuxiliaryTimeout\("canon_compress"/);
  assert.match(source, /canonState AI 压缩超时，已跳过/);
  assert.doesNotMatch(source, /prisma\.generationJob\s*\.\s*create/);
});

test("chapter quality report parses resultSummary but never promptSnapshot", async () => {
  const {
    parseQualityReportPayload,
    parseQualityReportScore,
  } = await import("../src/lib/ai/chapter-quality-report.ts");
  const reportSource = read("src/lib/ai/chapter-quality-report.ts");

  const parsed = parseQualityReportPayload(
    '章节质量评分完成，score=86 JSON={"issues":["节奏略慢"],"suggestions":["压缩铺垫"],"rhythm":82,"hook":90,"emotion":84,"conflict":88}',
  );
  assert.equal(parsed?.score, 86);
  assert.deepEqual(parsed?.issues, ["节奏略慢"]);
  assert.deepEqual(parsed?.suggestions, ["压缩铺垫"]);
  assert.equal(parseQualityReportScore("章节质量评分完成，score=73"), 73);
  assert.equal(parseQualityReportPayload('promptSnapshot 示例 {"issues":["不应读取"]}'), null);
  assert.doesNotMatch(reportSource, /promptSnapshot/);
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

test("chapter quality report reads scores and quality issue payloads", () => {
  const reportSource = read("src/lib/ai/chapter-quality-report.ts");
  assert.match(reportSource, /export async function getChapterQualityReport/);
  assert.match(reportSource, /action:\s*"chapter\.consistency_check"/);
  assert.match(reportSource, /action:\s*"chapter\.quality_check"/);
  assert.match(reportSource, /qualityIssues/);
  assert.match(reportSource, /qualitySuggestions/);
  assert.match(reportSource, /score=\(\\d\{1,3\}\)/);
});

test("work quality trend aggregates latest chapter jobs in ascending order", () => {
  const trendSource = read("src/lib/ai/work-quality-trend.ts");
  assert.match(trendSource, /export async function getWorkQualityTrend/);
  assert.match(trendSource, /chapter\.consistency_check/);
  assert.match(trendSource, /chapter\.quality_check/);
  assert.match(trendSource, /keepLatestByChapterAndAction/);
  assert.match(trendSource, /\.sort\(\(left, right\) => left - right\)/);
  assert.match(trendSource, /parseQualityReportPayload/);
});

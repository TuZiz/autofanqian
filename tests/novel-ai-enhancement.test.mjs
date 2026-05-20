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
});

test("AI step jobs are recorded for plan, check and repair", () => {
  const jobSource = read("src/lib/ai/chapter-ai-step-job.ts");
  const planSource = read("src/lib/ai/chapter-plan.ts");
  const consistencySource = read("src/lib/ai/chapter-consistency-check.ts");

  for (const action of [
    "chapter.plan",
    "chapter.consistency_check",
    "chapter.consistency_repair",
  ]) {
    assert.match(jobSource + planSource + consistencySource, new RegExp(action));
  }
  assert.match(jobSource, /promptSnapshot.*slice\(0, 20000\)/s);
  assert.match(jobSource, /inputTokens/);
  assert.match(jobSource, /durationMs/);
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

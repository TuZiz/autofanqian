import test from "node:test";
import assert from "node:assert/strict";

import { shortStoryGenerateSchema } from "../src/shared/schemas/short-story-generate.ts";

const validInput = {
  genre: "自定义情绪悬疑",
  tags: ["雨夜", "反转"],
  targetWords: 3000,
  style: "小红书",
  structureTemplate: "悬疑式",
  pov: "第一人称",
  endingType: "open",
  idea: "一个雨夜电话让主角重新面对多年前没有说出口的告别。",
};

test("short story generate schema accepts custom genre and full frontend fields", () => {
  const parsed = shortStoryGenerateSchema.safeParse(validInput);

  assert.equal(parsed.success, true);
  assert.equal(parsed.success ? parsed.data.genre : "", "自定义情绪悬疑");
  assert.deepEqual(parsed.success ? parsed.data.tags : [], ["雨夜", "反转"]);
  assert.equal(parsed.success ? parsed.data.pov : "", "第一人称");
  assert.equal(parsed.success ? parsed.data.structureTemplate : "", "悬疑式");
  assert.equal(parsed.success ? parsed.data.endingType : "", "open");
});

test("short story generate schema rejects illegal endingType", () => {
  const parsed = shortStoryGenerateSchema.safeParse({
    ...validInput,
    endingType: "closed",
  });

  assert.equal(parsed.success, false);
});

test("short story generate schema rejects targetWords over limit", () => {
  const parsed = shortStoryGenerateSchema.safeParse({
    ...validInput,
    targetWords: 50001,
  });

  assert.equal(parsed.success, false);
});

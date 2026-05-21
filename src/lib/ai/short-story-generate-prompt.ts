import type { ShortStoryGenerateInput } from "@/shared/schemas/short-story-generate";
import { SHORT_STORY_ENDING_LABELS } from "@/shared/schemas/short-story";

function formatTags(tags: string[]) {
  return tags.length ? tags.join("、") : "无";
}

export function buildShortStoryGenerateSystemPrompt() {
  return [
    "你是一名中文短篇小说主编和成稿作者。",
    "你需要根据用户创意，一次生成可发布的短篇小说作品。",
    "",
    "硬性输出要求：",
    "1) 只输出严格 JSON 对象，不要 Markdown，不要代码块，不要解释。",
    "2) JSON 字段只能包含 title、synopsis、outline、content。",
    "3) outline 优先输出结构化对象，字段为 tag/title/synopsis/targetWords/theme/hook/endingType/characters/beats/fullOutline。",
    "4) content 是完整正文，不是大纲，不要留待续写。",
    "5) 内容必须原创、连贯、可读，有开端、冲突、转折和收束。",
  ].join("\n");
}

export function buildShortStoryGenerateUserPrompt(input: ShortStoryGenerateInput) {
  const endingLabel = SHORT_STORY_ENDING_LABELS[input.endingType];

  return [
    "请生成一篇完整短篇小说：",
    `短篇类型：${input.genre}`,
    `标签：${formatTags(input.tags)}`,
    `目标字数：${input.targetWords}`,
    `结构模板：${input.structureTemplate}`,
    `风格：${input.style}`,
    `叙事视角：${input.pov}`,
    `结局倾向：${endingLabel}（${input.endingType}）`,
    `硬性视角要求：正文必须按“${input.pov}”叙述，不要自动改成其他视角。`,
    `硬性结局要求：结局必须按“${endingLabel}（${input.endingType}）”收束，不要默认写成反转式。`,
    "",
    `创意：${input.idea}`,
    "",
    "请严格输出 JSON：",
    "{",
    '  "title": "短篇标题",',
    '  "synopsis": "简介，交代主角、核心冲突、卖点和情绪落点",',
    '  "outline": {',
    '    "tag": "12字以内短标签",',
    '    "title": "短篇标题",',
    '    "synopsis": "短篇简介",',
    '    "targetWords": 目标字数数字,',
    '    "theme": "主题或情绪内核",',
    '    "hook": "开篇钩子",',
    `    "endingType": "${input.endingType}",`,
    '    "characters": [{ "name": "角色名", "role": "角色定位", "description": "动机、秘密或人物功能" }],',
    '    "beats": [{ "index": 1, "title": "场景标题", "purpose": "剧情目的", "targetWords": 段落字数, "writingPrompt": "这一段如何写" }],',
    '    "fullOutline": "完整短篇大纲，按 3-8 个 beats 串起人物、冲突、情绪递进和结局落点"',
    "  },",
    '  "content": "完整正文"',
    "}",
    "",
    "写作要求：",
    "- 标题要有传播感，不要空泛。",
    "- 简介要像作品详情页可直接展示的简介。",
    "- 大纲要清楚标出开局、推进、反转或高潮、结尾。",
    `- 结构必须优先遵循“${input.structureTemplate}”短篇模板，不要套用长篇分卷分章流程。`,
    "- outline.beats 必须 3-8 个，按短篇节奏拆成开局、推进、反转/高潮、收束。",
    "- characters 必须 1-5 个，只保留真正推动冲突的人。",
    "- 正文按目标字数尽量贴近，但不需要机械凑字。",
    "- 风格要贴合用户选择；视角必须全篇一致；标签要体现在人物、场景、反转或情绪里。",
    `- 叙事视角必须使用“${input.pov}”，结局倾向必须使用“${endingLabel}（${input.endingType}）”。`,
    "- 结局必须遵守用户选择，不要固定、默认或隐式写成反转式。",
    "- fullOutline 要完整概括 3-8 个 beats 的推进关系，便于后续上下文追踪。",
    "- 只输出 JSON。",
  ].join("\n");
}

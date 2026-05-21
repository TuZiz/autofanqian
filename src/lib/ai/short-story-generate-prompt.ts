import type { ShortStoryGenerateInput } from "@/shared/schemas/short-story-generate";

export function buildShortStoryGenerateSystemPrompt() {
  return [
    "你是一名中文短篇小说主编和成稿作者。",
    "你需要根据用户创意，一次生成可发布的短篇小说作品。",
    "",
    "硬性输出要求：",
    "1) 只输出严格 JSON 对象，不要 Markdown，不要代码块，不要解释。",
    "2) JSON 字段只能包含 title、synopsis、outline、content。",
    "3) content 是完整正文，不是大纲，不要留待续写。",
    "4) 内容必须原创、连贯、可读，有开端、冲突、转折和收束。",
  ].join("\n");
}

export function buildShortStoryGenerateUserPrompt(input: ShortStoryGenerateInput) {
  return [
    "请生成一篇完整短篇小说：",
    `短篇类型：${input.genre}`,
    `目标字数：${input.targetWords}`,
    `风格：${input.style}`,
    "",
    `创意：${input.idea}`,
    "",
    "请严格输出 JSON：",
    "{",
    '  "title": "短篇标题",',
    '  "synopsis": "简介，交代主角、核心冲突、卖点和情绪落点",',
    '  "outline": "短篇大纲，用 5-8 个自然段概括剧情推进",',
    '  "content": "完整正文"',
    "}",
    "",
    "写作要求：",
    "- 标题要有传播感，不要空泛。",
    "- 简介要像作品详情页可直接展示的简介。",
    "- 大纲要清楚标出开局、推进、反转或高潮、结尾。",
    "- 正文按目标字数尽量贴近，但不需要机械凑字。",
    "- 风格要贴合用户选择，不要写成后台说明文。",
    "- 只输出 JSON。",
  ].join("\n");
}

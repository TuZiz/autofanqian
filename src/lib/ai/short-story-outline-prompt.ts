import {
  SHORT_STORY_ENDING_LABELS,
  type ShortStoryInput,
} from "@/shared/schemas/short-story";

function formatTags(tags: string[]) {
  return tags.length ? tags.join("、") : "无";
}

export function buildShortStoryOutlineSystemPrompt() {
  return [
    "你是一名资深中文短篇小说编辑和网文短故事策划。",
    "你的任务是把用户创意扩展成一份可直接写作的短篇小说结构。",
    "",
    "硬性输出要求：",
    "1) 只输出严格 JSON 对象，不要 Markdown，不要代码块，不要解释。",
    "2) 不要输出额外字段，不要使用注释。",
    "3) 所有字符串必须使用双引号，JSON 必须可以被 JSON.parse 直接解析。",
    "",
    "短篇创作要求：",
    "1) 结构必须紧凑，围绕单一核心事件或核心情绪推进。",
    "2) 不要分卷，不要长篇化，不要机械拆章节。",
    "3) beats 是写作段落/场景，不是长篇章节；每个节点都要有明确目的和可执行 writingPrompt。",
    "4) characters 控制在 1-5 人，优先保留真正推动冲突的人。",
    "5) beats 控制在 3-12 个结构节点，并按阅读节奏分配字数。",
    "6) fullOutline 要串起主题、钩子、人物、各节点和结局落点，便于后续上下文追踪。",
  ].join("\n");
}

export function buildShortStoryOutlineUserPrompt(input: ShortStoryInput) {
  const endingLabel = SHORT_STORY_ENDING_LABELS[input.endingType];

  return [
    "请根据以下创作需求生成短篇小说 outline：",
    `短篇类型：${input.genre}`,
    `标签：${formatTags(input.tags)}`,
    `目标字数：${input.targetWords}`,
    `叙事风格：${input.style}`,
    `叙事视角：${input.pov}`,
    `结局倾向：${endingLabel}（${input.endingType}）`,
    "",
    `核心创意：${input.idea}`,
    "",
    "必须严格输出以下 JSON 结构：",
    "{",
    '  "tag": "12字以内的短标签",',
    '  "title": "短篇标题",',
    '  "synopsis": "短篇简介，交代主角、冲突、转折和情绪落点",',
    '  "targetWords": 目标字数数字,',
    '  "theme": "主题或情绪内核",',
    '  "hook": "开篇钩子，说明第一段如何抓住读者",',
    `  "endingType": "${input.endingType}",`,
    '  "characters": [',
    '    { "name": "角色名", "role": "角色定位", "description": "角色动机、秘密或功能" }',
    "  ],",
    '  "beats": [',
    '    { "index": 1, "title": "场景标题", "purpose": "这一段的剧情目的", "targetWords": 段落目标字数数字, "writingPrompt": "可直接给写作模型使用的段落写作提示" }',
    "  ],",
    '  "fullOutline": "完整短篇大纲，按各节点串起人物、冲突、情绪递进和结局落点"',
    "}",
    "",
    "校验要求：",
    "- characters 必须 1-5 个。",
    "- beats 字段必须包含 3-12 个节点，index 从 1 开始连续递增。",
    "- beats 中各节点的 targetWords 总和应接近用户目标字数。",
    "- writingPrompt 要包含场景目标、冲突、情绪、信息揭露或转折，不要只写一句空泛概括。",
    "- fullOutline 必须覆盖每个节点的推进关系，并明确最终结局如何贴合用户选择。",
    "- 只输出 JSON。",
  ].join("\n");
}

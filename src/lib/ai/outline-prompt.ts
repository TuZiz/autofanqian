type OutlinePromptInput = {
  genreLabel: string;
  tags?: string[];
  platform?: string;
  dna?: string;
  words?: string;
  idea: string;
  webSources?: Array<{ url: string; snippet: string }>;
};

export function buildOutlineSystemPrompt() {
  return [
    "你是一名中文网文总编与短剧化策划，擅长把创意需求转成可执行的大纲与分卷结构。",
    "请用简体中文输出，语气专业、克制、有说服力。",
    "不要提到“AI/模型/提示词/系统消息”等字样。",
    "输出必须是严格 JSON（只输出一个 JSON 对象），不要输出 Markdown、不要输出代码块、不要包含任何额外文字。",
    "如果输入包含“仿书 DNA/参考书名”，只抽象写法与结构，不复刻原作剧情、设定、角色名与专有名词。",
  ].join("\n");
}

function normalizeTags(tags?: string[]) {
  return (tags ?? [])
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);
}

export function buildOutlineUserPrompt(input: OutlinePromptInput) {
  const tags = normalizeTags(input.tags);
  const constraints: string[] = [];

  if (input.platform?.trim()) constraints.push(`目标平台：${input.platform.trim()}`);
  if (input.dna?.trim()) constraints.push(`仿书DNA/风格：${input.dna.trim()}`);
  if (input.words?.trim()) constraints.push(`目标字数：${input.words.trim()}`);
  if (tags.length)
    constraints.push(`题材标签：${tags.join("、")}（需全部体现，可按语义自然改写）`);

  const webBlock = (input.webSources ?? []).length
    ? [
        "",
        "外部检索摘录（仅用于抽象风格/结构，不要复刻原作剧情）：",
        ...(input.webSources ?? []).map(
          (item, idx) =>
            `${idx + 1}) ${item.url}\n${item.snippet}`.trim(),
        ),
      ].join("\n")
    : "";

  return [
    "请根据以下信息，为作品生成一份“可直接拿去开写”的分卷大纲。",
    `小说类型：${input.genreLabel}`,
    constraints.length ? `补充约束：${constraints.join("；")}` : "补充约束：无",
    "",
    "用户创意（核心素材）：",
    input.idea.trim(),
    webBlock,
    "",
    "请只输出一个 JSON 对象，schema 如下（字段必须齐全，字符串不要带多余引号/括号）：",
    "{",
    '  "tag": "2-6个字的题材标签，如：游戏/机甲/末日/玄幻/悬疑（可参考题材标签或小说类型）",',
    '  "title": "作品标题（中文网文风格，8-22字）",',
    '  "synopsis": "作品简介（200-450字，节奏快、冲突直给、短剧化）",',
    '  "totalChapters": 由你根据目标字数、平台节奏、故事体量估算出的总章数（数字，不要写字符串）,',
    '  "volumes": [',
    '    {',
    '      "name": "卷名（2-10字，不要套用固定模板）",',
    '      "startChapter": 卷起始章（数字）,',
    '      "endChapter": 卷结束章（数字）,',
    '      "desc": "本卷主线作用与情绪推进（60-180字）",',
    '      "segments": [',
    '        { "title": "小节名（2-12字）", "startChapter": 小节起始章（数字）, "endChapter": 小节结束章（数字）, "desc": "2-3句可执行剧情推进，不要空泛总结" }',
    '      ]',
    '    }',
    "  ],",
    '  "characters": [',
    '    { "name": "角色名（2-6字）", "role": "protagonist|heroine|antagonist|supporting", "desc": "人物定位+动机+可视化特征（60-140字）" }',
    "  ]",
    "}",
    "",
    "要求：",
    "1) 不要固定 400 章一卷，也不要机械平均分段；totalChapters、卷数、卷长、小节长度都由你按故事效率动态决定。",
    "2) 卷数通常 2-10 卷，越短越集中，越长越分阶段；每卷至少 1 个 segments，小节可长可短，但必须连续覆盖卷范围且不重叠不跳号。",
    "3) 如果有目标字数，可按单章约 2500-4500 字估算总章数，但要优先服从平台节奏与剧情密度。",
    "4) characters 3-8 人，至少包含 protagonist、heroine、antagonist。",
    "5) 不要复刻仿书原作剧情；只抽象风格与结构。",
    "6) desc/segments[].desc 需要换行时，请在 JSON 字符串内使用 \\n 表示换行，不能输出未转义的真实换行。",
  ].join("\n");
}

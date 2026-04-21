type IdeaPromptInput = {
  genre: string;
  genreLabel?: string;
  tags?: string[];
  platform?: string;
  dna?: string;
  words?: string;
  existingIdea?: string;
};

const genreName: Record<string, string> = {
  fantasy: "玄幻修仙",
  urban: "都市爽文",
  scifi: "科幻未来",
  history: "历史架空",
  xianxia: "仙侠世界",
  game: "游戏竞技",
};

export function buildIdeaSystemPrompt() {
  return [
    "你是一名中文网文小说策划与编辑，擅长把零散需求整理成可执行、逻辑自洽的故事创意。",
    "请用简体中文输出，语气专业、克制、有说服力。",
    "输出内容必须不少于 120 字，且不超过 800 字。",
    "不要提到“AI”“提示词”“模型”“系统消息”等字样。",
    "不要输出代码块或 Markdown 标题符号（例如 #、```）。",
  ].join("\n");
}

export function buildIdeaUserPrompt(input: IdeaPromptInput) {
  const resolvedGenre = input.genreLabel ?? genreName[input.genre] ?? input.genre;
  const tags = (input.tags ?? [])
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);
  const platform = input.platform?.trim();
  const dna = input.dna?.trim();
  const words = input.words?.trim();
  const existingIdea = input.existingIdea?.trim();

  const constraints: string[] = [];
  if (platform) constraints.push(`目标平台：${platform}`);
  if (dna) constraints.push(`仿书DNA/风格：${dna}`);
  if (words) constraints.push(`目标字数：${words}`);
  if (tags.length)
    constraints.push(`题材标签：${tags.join("、")}（需全部体现，可按语义自然改写）`);

  return [
    "请为“创建新作品”的创意描述输入框生成一段可直接粘贴的创意文本。",
    `小说类型：${resolvedGenre}`,
    constraints.length ? `补充约束：${constraints.join("；")}` : "补充约束：无",
    existingIdea ? `用户已有草稿（请润色并补全）：${existingIdea}` : "用户已有草稿：无",
    "",
    "要求：",
    tags.length
      ? `0) 文案首行先输出：标签：${tags.join("、")}（必须包含全部标签，使用顿号或逗号分隔）。`
      : "0) 可选：文案首行用“标签：…”列出 3-6 个关键词（不强制）。",
    "1) 先用 1-2 句给出清晰的核心设定（谁 + 在什么世界 + 遇到什么关键问题）。",
    "2) 补充世界观与规则（至少 2 条具体规则或限制，保证“有理有据”）。",
    "3) 补充主角目标、核心冲突与反派/阻力来源（必须具体，避免空泛）。",
    "4) 给出 3 个“爽点/看点”或反转点（用短句列出）。",
    "5) 最后给出 1 段展开建议：开篇 300 字的钩子事件是什么、第一章结尾的断章钩子是什么、前 10 章的大高潮/大反转是什么、第一阶段如何升级与阶段目标是什么。",
    "6) 语言偏通俗直白，短句短段，避免大段抒情和空泛形容词。",
  ].join("\n");
}

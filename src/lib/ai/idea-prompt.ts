type IdeaPromptInput = {
  genre: string;
  genreLabel?: string;
  tags?: string[];
  platform?: string;
  dna?: string;
  words?: string;
  existingIdea?: string;
  minChars?: number;
  maxChars?: number;
};

const genreName: Record<string, string> = {
  fantasy: "玄幻修仙",
  urban: "都市爽文",
  scifi: "科幻未来",
  history: "历史架空",
  xianxia: "仙侠世界",
  game: "游戏竞技",
};

export function buildIdeaSystemPrompt(options?: { minChars?: number; maxChars?: number }) {
  const minChars = options?.minChars ?? 420;
  const maxChars = options?.maxChars ?? 1500;

  return [
    "你是一名中文网文小说策划与编辑，擅长把零散需求整理成可执行、逻辑自洽的故事创意。",
    "请用简体中文输出，语气专业、克制、有说服力。",
    `输出内容必须不少于 ${minChars} 字，且不超过 ${maxChars} 字。`,
    "不要提到“AI”“提示词”“模型”“系统消息”等字样。",
    "不要输出代码块或 Markdown 标题符号（例如 #、```）。",
  ].join("\n");
}

export function buildIdeaExistingIdeaPrompt(existingIdea: string) {
  const trimmed = (existingIdea ?? "").trim();
  const clipped = trimmed.length > 1800 ? trimmed.slice(0, 1800) : trimmed;

  return [
    "下面是用户在「创意输入框」里已经写好的草稿，请先完整阅读并理解：",
    "【用户草稿开始】",
    clipped,
    "【用户草稿结束】",
    "",
    "要求：",
    "1) 你必须以该草稿为核心设定，不要改写成另一个完全不同的故事。",
    "2) 你要做的是：润色、补充、结构化、增强冲突与爽点，让它更适合直接粘贴到创意输入框。",
    "3) 接下来我会给你小说类型/标签/平台/风格等约束，你必须同时遵守。",
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
  const minChars = input.minChars ?? 420;
  const maxChars = input.maxChars ?? 1500;
  const isCustomGenre = input.genre === "custom";

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
    existingIdea
      ? "用户已有草稿：见上文（请基于草稿润色扩写，保持核心设定不变）。"
      : "用户已有草稿：无",
    "",
    "要求：",
    `- 长度要求：正文不少于 ${minChars} 字，不超过 ${maxChars} 字；不要因为标签少就写短。`,
    isCustomGenre
      ? "- 自定义题材要求：必须把用户输入的“类型”和每一个标签都扩展成剧情规则、人物处境、核心谜团或爽点，不要只复述标签。"
      : "- 已有题材要求：题材套路可以参考，但必须落到具体人物、规则和冲突。",
    tags.length
      ? `0) 文案首行先输出：标签：${tags.join("、")}（必须包含全部标签，使用顿号或逗号分隔）。`
      : "0) 可选：文案首行用“标签：…”列出 3-6 个关键词（不强制）。",
    "1) 先用 1-2 句给出清晰的核心设定（谁 + 在什么世界 + 遇到什么关键问题）。",
    "2) 补充世界观与规则（至少 2 条具体规则或限制，保证“有理有据”）。",
    "3) 补充主角目标、核心冲突与反派/阻力来源（必须具体，避免空泛）。",
    "4) 给出 3 个“爽点/看点”或反转点（用短句列出）。",
    "5) 最后给出 1 段展开建议：开篇 300 字的钩子事件是什么、第一章结尾的断章钩子是什么、前 10 章的大高潮/大反转是什么；并用“压抑-铺垫-爆发-余韵”的情绪闭环说明前 10 章怎么跑一轮；最后补充第一阶段如何升级与阶段目标是什么。",
    "6) 语言偏通俗直白，短句短段，避免大段抒情和空泛形容词。",
  ].join("\n");
}

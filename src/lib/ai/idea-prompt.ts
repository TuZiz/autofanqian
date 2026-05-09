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
    "你是一名中文网文策划编辑，擅长把零散设定整理成可直接展示、也可继续生成大纲的“作品简介型创意稿”。",
    "请使用简体中文，语气成熟、明确、有画面感，像真正给读者看的小说简介，而不是策划备忘录。",
    `输出正文必须不少于 ${minChars} 字，且不超过 ${maxChars} 字。`,
    "输出必须是成稿，不要写成提纲、卖点清单、标签清单、章节计划、编辑批注或作者备注。",
    "默认写成 2 到 4 段自然正文，信息密度高、节奏快、冲突明确、悬念要强。",
    "不要提到“AI”“提示词”“模型”“系统消息”等字样。",
    "不要输出 Markdown 标题、代码块、编号列表或项目符号。",
  ].join("\n");
}

export function buildIdeaExistingIdeaPrompt(existingIdea: string) {
  const trimmed = (existingIdea ?? "").trim();
  const clipped = trimmed.length > 1800 ? trimmed.slice(0, 1800) : trimmed;

  return [
    "下面是用户在创意输入框里已经写好的草稿，请先完整阅读并理解：",
    "【用户草稿开始】",
    clipped,
    "【用户草稿结束】",
    "",
    "要求：",
    "1) 你必须以这份草稿为核心，不要改写成另一个完全不同的故事。",
    "2) 你的任务是：润色、补全、增强冲突与钩子，并改写成更成熟的简介型成稿。",
    "3) 去掉提纲味、备注味、列表味，让它读起来像正式作品简介。",
    "4) 后续我会再给你题材、标签、平台、风格等限制，你必须同时满足。",
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
  if (dna) constraints.push(`风格参考：${dna}`);
  if (words) constraints.push(`目标字数：${words}`);
  if (tags.length) constraints.push(`题材标签：${tags.join("、")}（必须自然融入正文）`);

  return [
    "请为“创建新作品”的创意输入框生成一段可直接粘贴的简介型创意稿。",
    `小说类型：${resolvedGenre}`,
    constraints.length ? `补充约束：${constraints.join("；")}` : "补充约束：无",
    existingIdea ? "已有草稿：见上文，请保留其核心设定并重写成简介体成稿。" : "已有草稿：无",
    "",
    "写作要求：",
    `- 长度要求：正文不少于 ${minChars} 字，不超过 ${maxChars} 字。`,
    "- 整体形式：输出 2 到 4 段连贯正文，不要小标题，不要列表，不要“标签：”“卖点：”“看点：”这类前缀。",
    "- 首段要迅速交代主角是谁、身处什么处境、核心设定是什么，以及最抓人的第一钩子。",
    "- 中段要写清世界规则、主角目标、主要阻力、关键矛盾和升级方向，让故事逻辑站得住。",
    "- 结尾要落在一个强悬念、反转、爆点或阶段性目标上，让人自然想继续看下去。",
    "- 所有爽点、卖点和反差都要藏在叙述里，不要单独列清单。",
    isCustomGenre
      ? "- 自定义题材时，必须把用户输入的类型和每一个标签都扩展成真实剧情规则、人物困境和冲突来源，不要机械堆词。"
      : "- 已有题材可以参考常见套路，但必须落到具体人物、具体规则和具体冲突，不能空泛。",      
    "- 如果原草稿信息不完整，优先补全主角身份、能力代价、世界限制、外部压力、阶段目标和前期推进逻辑。",
    "- 语言风格参考网文简介：信息密、节奏快、画面感强、读起来顺滑，能直接用于后续大纲生成。",
  ].join("\n");
}

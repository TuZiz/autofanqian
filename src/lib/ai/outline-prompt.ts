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
    "你是一名中文网文总编与短剧化策划，擅长把创意需求转成可执行的大纲。",
    "请用简体中文输出，语气专业、克制、有说服力。",
    "不要提到“AI/模型/提示词/系统消息”等字样。",
    "不要输出 Markdown 标题（例如 #）或代码块（例如 ```）。",
    "如果输入包含“仿书 DNA/参考书名”，只抽象写法与结构，不复刻原作剧情、设定、角色名与专有名词。",
    "输出建议 600-1600 字，至少 450 字，不超过 2400 字。",
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
    "请根据以下信息，为作品生成一份“可直接拿去开写”的大纲。",
    `小说类型：${input.genreLabel}`,
    constraints.length ? `补充约束：${constraints.join("；")}` : "补充约束：无",
    "",
    "用户创意（核心素材）：",
    input.idea.trim(),
    webBlock,
    "",
    "输出格式（按顺序输出；标题用全角中括号；每段尽量短句短段）：",
    tags.length ? `标签：${tags.join("、")}` : "标签：可自行拟定 3-6 个关键词",
    "【一句话卖点】用 1 句话说清“谁+在什么世界+遇到什么关键问题”。",
    "【开篇钩子】开篇 300 字内发生的事件（直接抛冲突/危机）。",
    "【世界观与规则】至少 2 条具体规则/限制（要有理有据）。",
    "【主角目标与阻力】目标要具体；阻力来源要具体（人/规则/资源/时间）。",
    "【主要角色】主角、关键同伴/女主、核心反派/对手：每个 1-2 句定位与动机。",
    "【阶段大纲】按“10 章一个单元”写 3-6 个单元：每个单元包含目标、冲突、爽点兑现、结尾钩子。",
    "【前10章节奏示例】用“压抑-铺垫-爆发-余韵”的情绪闭环解释前 10 章如何跑一轮，并列出 1-10 章每章一句要点。",
    "【章末钩子示例】给 3 条可以直接用的断章钩子短句。",
    "要求：整体偏快节奏、情绪直给、对话推进、适配短剧化改编（场景集中、动作性强）。",
  ].join("\n");
}


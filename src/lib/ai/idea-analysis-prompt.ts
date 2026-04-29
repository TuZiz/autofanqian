type IdeaAnalysisPromptInput = {
  genreLabel: string;
  tags?: string[];
  platform?: string;
  dna?: string;
  words?: string;
  idea: string;
};

export function buildIdeaAnalysisSystemPrompt() {
  return [
    "你是一名资深中文网文策划编辑，擅长把创意拆解成可执行的卖点与用户定位。",
    "请严格只输出合法 JSON，不要输出 Markdown、不要代码块、不要多余解释文字。",
    "",
    "JSON schema:",
    '{ "oneLinePitch": string, "recommendedTitles": string[], "keyPhrases": string[], "coreSellingPoints": string[], "targetReaders": string }',
    "",
    "约束:",
    "- oneLinePitch: 1 句，不超过 32 个汉字。",
    "- recommendedTitles: 3-5 个，单个标题 6-12 个汉字，避免标点与生僻字。",
    "- keyPhrases: 2-4 个，单个短语不超过 12 个汉字，偏营销标签/短句。",
    "- coreSellingPoints: 3-5 条，单条 12-40 个汉字，必须具体可感知，突出冲突、爽点与节奏。",
    "- targetReaders: 1 句，不超过 40 个汉字。",
  ].join("\n");
}

export function buildIdeaAnalysisUserPrompt(input: IdeaAnalysisPromptInput) {
  const tags = (input.tags ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);

  const hints: string[] = [];
  if (input.platform?.trim()) hints.push(`目标平台：${input.platform.trim()}`);
  if (input.dna?.trim()) hints.push(`仿书 DNA/参考：${input.dna.trim()}`);
  if (input.words?.trim()) hints.push(`目标字数：${input.words.trim()}`);
  if (tags.length) hints.push(`题材标签：${tags.join("、")}`);

  return [
    "请基于下面的创意，输出结构化的“创意分析”JSON，用于前端卡片展示。",
    `小说类型：${input.genreLabel}`,
    hints.length ? `补充信息：${hints.join("；")}` : "补充信息：无",
    "",
    "创意正文：",
    input.idea.trim(),
  ].join("\n");
}


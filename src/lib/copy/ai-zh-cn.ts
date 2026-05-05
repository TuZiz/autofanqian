export type AiOutlineStage = "outline" | "work" | "done" | "error";

export type AiMetaKind = "summary" | "outline" | "details";

export type AiRewriteAction =
  | "polish"
  | "expand"
  | "compress"
  | "conflict"
  | "logic_check";

const chapterMetaCopy = {
  summary: {
    noun: "摘要",
    generate: "生成摘要",
    regenerate: "重生成摘要",
    generating: "摘要生成中",
    generated: "摘要已生成",
    emptyBody: "先写正文",
    promptPlaceholder: "例如：突出商业冲突，保留关键人名，摘要更短。",
    busyReason: "摘要生成中，请等这一轮结束。",
    errorFallback: "摘要生成失败，请稍后重试。",
  },
  outline: {
    noun: "大纲",
    generate: "生成大纲",
    regenerate: "重生成大纲",
    generating: "大纲生成中",
    generated: "大纲已生成",
    emptyBody: "先写正文",
    promptPlaceholder: "例如：强化爽点，列出反转节点，结尾钩子更强。",
    busyReason: "大纲生成中，请等这一轮结束。",
    errorFallback: "大纲生成失败，请稍后重试。",
  },
  details: {
    noun: "细节设定",
    generate: "提取设定",
    regenerate: "重新提取",
    generating: "正在提取设定",
    generated: "细节设定已更新",
    emptyBody: "先写正文",
    promptPlaceholder: "",
    busyReason: "细节设定处理中，请等这一轮结束。",
    errorFallback: "设定提取失败，请稍后重试。",
  },
} as const;

export const aiZhCN = {
  common: {
    title: "AI",
    generating: "AI 生成中",
    wait: "请稍候",
    waitEllipsis: "请稍候...",
    startGenerate: "开始生成",
    generated: "已生成",
    generateFailed: "生成失败，请稍后重试。",
    applyFailed: "应用失败，请稍后重试。",
    networkFailed: "网络请求异常，请稍后重试。",
    serviceFailed: "服务异常，请稍后重试。",
    chapterBusy: "AI 正在处理当前章节，请等这一轮结束。",
    chapterRunning: "当前章节生成中，请等这一轮结束。",
  },
  idea: {
    thinking: [
      "AI 思考中...",
      "正在打磨创意...",
      "正在换一种写法...",
    ] as const,
    optimize: "AI 优化创意",
    needInput: "先写创意",
    analyzeTitle: "AI 创意分析",
    analyzeStart: "开始分析",
    analyzeRetry: "重新分析",
    analyzeBusy: "分析中...",
    analyzeWait: "请稍候...",
    analyzePanelBusy: "正在分析创意...",
    analyzePanelEmpty:
      "点击上方“开始分析”生成创意分析。想换一条创意可点右侧“换一个”。",
    swap: "换一个",
    success: "创意已生成。",
    analyzeSuccess: "分析已生成。",
    generateFailed: "创意生成失败，请稍后重试。",
    analyzeFailed: "分析失败，请稍后重试。",
    parseFailed: "分析结果解析失败，请点“换一个”再试。",
  },
  outline: {
    thinking: [
      "AI 规划中...",
      "正在收拢卷纲...",
      "正在铺开可写段落...",
    ] as const,
    stageTitle: {
      outline: "AI 正在规划大纲",
      work: "正在落作品",
      done: "马上进入作品页",
      error: "生成失败",
    } as const satisfies Record<AiOutlineStage, string>,
    preparing: "AI 正在准备...",
    generatingStatus: "正在生成大纲，请不要关闭页面。",
    creatingWorkStatus: "正在写入作品信息...",
    doneStatus: "已完成，马上进入作品页。",
    success: "大纲已生成。",
    generateFailed: "大纲生成失败，请稍后重试。",
    extendBusy: "规划中...",
    extendConfirm: "确认规划",
  },
  chapterGenerate: {
    thinking: [
      "AI 生成中",
      "正在组织本章结构",
      "正在补正文细节",
    ] as const,
    stages: {
      prepare: "AI 生成中",
      context: "正在梳理前文衔接",
      draft: "正在铺写本章正文",
      polish: "正在润顺语气",
      finalize: "正在整理正文结果",
    } as const,
    done: "本章已生成完成",
    doneApplied: "本章已生成完成，正文已更新。",
    blockedPrevious: (index: number) => `先补第${index}章`,
    generateButton: (index: number) =>
      index === 1 ? "AI 生成第1章" : "AI 生成本章",
    regenerateButton: (index: number) =>
      index === 1 ? "重写第1章" : "重写本章",
    modalTitle: (index: number, hasDraft: boolean) =>
      `${hasDraft ? "重写" : "生成"}第${index}章`,
    modalKicker: (hasDraft: boolean) =>
      hasDraft ? "AI 重写正文" : "AI 生成正文",
    modalDescription: (hasDraft: boolean) =>
      hasDraft
        ? "可补一句要求；确认后会覆盖当前正文。"
        : "可补一句要求；确认后开始生成本章正文。",
    promptPlaceholder:
      "补充要求（可选）：例如强化悬念、减少旁白、让冲突更直接。",
    failed: "生成失败，请稍后重试。",
  },
  chapterMeta: chapterMetaCopy,
  chapterRewrite: {
    title: "AI 改写正文",
    subtitle: "先看预览，再决定是否落到正文。",
    previewTitle: "改写预览",
    reportTitle: "检查报告",
    previewReady: "预览已就绪",
    resultEmpty: "选择动作并生成后，这里会显示结果。",
    loadingTitle: "AI 正在处理本章",
    loadingDescription: "正在调整句子、节奏和细节...",
    blockedEmpty: "当前正文为空，不能改写。",
    blockedDraft: "当前正文还只是草稿，请先点“正式保存”后再改写。",
    blockedSaving: "保存完成后再改写。",
    blockedBusy: "AI 正在处理，请稍后再试。",
    failed: "改写失败，请稍后重试。",
    applyFailed: "应用改写失败，请稍后重试。",
    applySuccess: "改写已应用，原正文已存入历史版本。",
    previewMissing: "请先生成预览。",
    previewDone: "改写预览已生成，确认后再应用到正文。",
    logicDone: "逻辑检查已完成。",
    actions: {
      polish: {
        label: "润色",
        description: "保持剧情不变，润顺句子和节奏。",
      },
      expand: {
        label: "扩写",
        description: "补足动作、心理和场景推进。",
      },
      compress: {
        label: "压缩",
        description: "删减重复表达，让节奏更紧。",
      },
      conflict: {
        label: "增强冲突",
        description: "强化压力、冲突和章末钩子。",
      },
      logic_check: {
        label: "逻辑检查",
        description: "只检查矛盾和衔接，不覆盖正文。",
      },
    } as const satisfies Record<
      AiRewriteAction,
      { label: string; description: string }
    >,
    buttons: {
      preview: "生成预览",
      check: "开始检查",
      generating: "生成中",
      applying: "应用中",
      apply: "应用到正文",
      recheck: "重新检查",
    },
  },
} as const;

export function getAiOutlineStageTitle(stage: AiOutlineStage) {
  return aiZhCN.outline.stageTitle[stage];
}

export function getAiMetaCopy(kind: AiMetaKind) {
  return aiZhCN.chapterMeta[kind];
}

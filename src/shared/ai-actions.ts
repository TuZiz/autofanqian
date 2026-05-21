export const AI_ACTIONS = {
  outlineGenerate: "outline.generate",
  shortStoryGenerate: "short_story.generate",
  chapterGenerate: "chapter.generate",
  chapterSummary: "chapter.summary",
  chapterOutline: "chapter.outline",
  chapterDetails: "chapter.details",
  chapterRewrite: "chapter.rewrite",
  chapterConsistency: "chapter.consistency",
  bibleExtract: "bible.extract",
} as const;

export type AiActionKey = (typeof AI_ACTIONS)[keyof typeof AI_ACTIONS];

export const LEGACY_AI_ACTION_ALIASES = {
  [AI_ACTIONS.outlineGenerate]: [
    "outline_generate",
    "outline_generate_retry",
    "outline_extend",
    "outline_extend_retry",
  ],
  [AI_ACTIONS.shortStoryGenerate]: [
    "short_story_outline_generate",
    "short_story_outline_generate_retry",
    "short-story.generate",
    "short_story.generate",
  ],
  [AI_ACTIONS.chapterGenerate]: [
    "chapter_generate",
    "chapter_generate_stream",
    "chapter_generate_length_repair",
    "chapter_generate_stream_length_repair",
    "regenerate.all",
    "regenerate.all.stream",
  ],
  [AI_ACTIONS.chapterSummary]: ["chapter_summary"],
  [AI_ACTIONS.chapterOutline]: ["chapter_outline"],
  [AI_ACTIONS.chapterDetails]: ["chapter_details"],
  [AI_ACTIONS.chapterRewrite]: ["chapter_rewrite"],
  [AI_ACTIONS.chapterConsistency]: [
    "chapter_consistency_check",
    "chapter.consistency_check",
    "chapter.consistency_check.book",
  ],
  [AI_ACTIONS.bibleExtract]: ["context.extract"],
} satisfies Record<AiActionKey, string[]>;

export function getAiActionAliases(action: string) {
  const aliases =
    LEGACY_AI_ACTION_ALIASES[action as AiActionKey] ??
    Object.entries(LEGACY_AI_ACTION_ALIASES).find(([, values]) =>
      values.includes(action),
    )?.[1] ??
    [];

  return Array.from(new Set([action, ...aliases]));
}

export function normalizeAiAction(action: string): string {
  for (const [canonical, aliases] of Object.entries(LEGACY_AI_ACTION_ALIASES)) {
    if (action === canonical || aliases.includes(action)) return canonical;
  }
  if (action.startsWith("chapter_rewrite_")) return AI_ACTIONS.chapterRewrite;
  if (action.startsWith("chapter.generate.")) return AI_ACTIONS.chapterGenerate;
  if (action.startsWith("chapter_generate_")) return AI_ACTIONS.chapterGenerate;
  if (action.startsWith("context_extract")) return AI_ACTIONS.bibleExtract;
  return action;
}

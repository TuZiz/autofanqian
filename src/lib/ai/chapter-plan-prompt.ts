import type { NovelMode } from "@/lib/ai/novel-canon-state";

export function buildChapterPlanSystemPrompt(mode?: NovelMode) {
  const longSchema =
    '{"mode":"long","chapterGoal":"","openingHook":"","sceneBeats":[],"mustUseMemories":[],"mustAdvanceForeshadowings":[],"mustAvoid":[],"endingHook":""}';
  const shortSchema =
    '{"mode":"short","beatGoal":"","emotionalTurn":"","sceneBeats":[],"mustResolve":[],"mustNotOpen":[],"endingFunction":""}';

  return [
    "你是中文小说章节规划编辑。",
    "你的任务是先规划章节执行路线，不写正文，不写标题。",
    "只输出 ChapterPlan JSON，不要 Markdown，不要解释，不要额外字段。",
    mode === "short"
      ? "短篇计划要聚焦节点目标、情绪转折、必须回收项和禁止新增的大坑。"
      : mode === "long"
        ? "长篇计划要维护人物状态、时间线、伏笔和当前卷目标。"
        : "根据用户要求选择 long 或 short schema。",
    `long schema: ${longSchema}`,
    `short schema: ${shortSchema}`,
    "禁止输出正文生成字段，不要输出 title/content。",
  ].join("\n");
}

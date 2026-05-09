import { z } from "zod";

const contextMemoryKindSchema = z.enum([
  "fact",
  "style",
  "constraint",
  "character_state",
  "plot_thread",
  "detail",
  "continuity",
]);

const contextForeshadowingStatusSchema = z.enum([
  "open",
  "partial",
  "resolved",
  "dropped",
]);

export const contextExtractionSchema = z.object({
  summary: z.string().trim().max(1200).optional().nullable(),
  details: z.array(z.string().trim().min(1).max(400)).max(24).optional().default([]),
  memories: z.array(
    z.object({
      kind: contextMemoryKindSchema.default("fact"),
      priority: z.coerce.number().int().min(1).max(100).default(60),
      content: z.string().trim().min(1).max(400),
    }),
  ).max(16).optional().default([]),
  timelineEvents: z.array(
    z.object({
      title: z.string().trim().max(120).optional().nullable(),
      summary: z.string().trim().min(1).max(600),
      description: z.string().trim().max(2000).optional().nullable(),
      storyTime: z.string().trim().max(120).optional().nullable(),
      canonical: z.boolean().optional().default(true),
    }),
  ).max(8).optional().default([]),
  foreshadowings: z.array(
    z.object({
      title: z.string().trim().max(120).optional().nullable(),
      hint: z.string().trim().min(1).max(300),
      payoff: z.string().trim().max(600).optional().nullable(),
      importance: z.coerce.number().int().min(1).max(100).default(60),
      status: contextForeshadowingStatusSchema.default("open"),
    }),
  ).max(8).optional().default([]),
  characterUpdates: z.array(
    z.object({
      name: z.string().trim().min(1).max(80),
      currentState: z.string().trim().max(400).optional().nullable(),
      goal: z.string().trim().max(400).optional().nullable(),
      notes: z.string().trim().max(400).optional().nullable(),
    }),
  ).max(12).optional().default([]),
});

export type ContextExtractionPayload = z.infer<typeof contextExtractionSchema>;

function extractJson(text: string) {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) return null;

  const candidate = withoutFence.slice(start, end + 1);
  try {
    return JSON.parse(candidate) as unknown;
  } catch {
    return null;
  }
}

function normalizeDetailLines(lines: string[]) {
  return Array.from(
    new Set(
      lines
        .map((line) => line.replace(/^[\s*\\-]+/, "").trim())
        .filter(Boolean)
        .slice(0, 18),
    ),
  );
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = (value ?? "").trim();
  return normalized || null;
}

export function summarizeContextExtractionResult(payload: ContextExtractionPayload) {
  return `上下文提取完成：记忆${payload.memories.length}条，时间线${payload.timelineEvents.length}条，伏笔${payload.foreshadowings.length}条，角色更新${payload.characterUpdates.length}条。`;
}

export async function parseContextExtractionResponse(
  content: string,
): Promise<ContextExtractionPayload | null> {
  const raw = extractJson(content);
  if (!raw) return null;

  const parsed = contextExtractionSchema.safeParse(raw);
  if (!parsed.success) return null;

  return {
    ...parsed.data,
    summary: normalizeOptionalText(parsed.data.summary ?? null),
    details: normalizeDetailLines(parsed.data.details ?? []),
    memories: (parsed.data.memories ?? []).map((item) => ({
      kind: item.kind,
      priority: item.priority,
      content: item.content.trim(),
    })),
    timelineEvents: (parsed.data.timelineEvents ?? []).map((item) => ({
      ...item,
      title: normalizeOptionalText(item.title ?? null),
      description: normalizeOptionalText(item.description ?? null),
      storyTime: normalizeOptionalText(item.storyTime ?? null),
    })),
    foreshadowings: (parsed.data.foreshadowings ?? []).map((item) => ({
      ...item,
      title: normalizeOptionalText(item.title ?? null),
      payoff: normalizeOptionalText(item.payoff ?? null),
    })),
    characterUpdates: (parsed.data.characterUpdates ?? []).map((item) => ({
      ...item,
      currentState: normalizeOptionalText(item.currentState ?? null),
      goal: normalizeOptionalText(item.goal ?? null),
      notes: normalizeOptionalText(item.notes ?? null),
    })),
  };
}

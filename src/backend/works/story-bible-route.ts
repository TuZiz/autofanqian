import { Prisma, type MemoryKind, type ForeshadowingStatus } from "@prisma/client";
import { z } from "zod";

import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import { getCurrentUser } from "@/lib/auth/service";
import { runChapterContextExtraction } from "@/lib/ai/chapter-context-extract";
import { prisma } from "@/lib/prisma";
import { assertSameOriginRequest } from "@/lib/security/origin";
import { requireWorkAccess } from "@/lib/works/access";
import {
  storyBibleExtractSchema,
  storyBibleListQuerySchema,
  storyBiblePayloadSchema,
  storyBibleSectionSchema,
  type StoryBiblePayload,
  type StoryBibleSection,
} from "@/shared/schemas/story-bible";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paramsSchema = z.object({ id: z.string().min(1).max(64) });
const itemParamsSchema = paramsSchema.extend({ section: storyBibleSectionSchema, itemId: z.string().min(1).max(64) });

type DateStamped = { createdAt: Date; updatedAt: Date };
type RouteContext = { params: Promise<{ id?: string; section?: string; itemId?: string }> };

function serialize<T extends DateStamped>(item: T) {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function textContains(values: Array<string | number | null | undefined>, q: string) {
  if (!q) return true;
  const normalized = q.toLowerCase();
  return values.join(" ").toLowerCase().includes(normalized);
}

function inChapterRange(chapter: number | null | undefined, from?: number, to?: number) {
  if (!from && !to) return true;
  if (chapter == null) return true;
  if (from && chapter < from) return false;
  if (to && chapter > to) return false;
  return true;
}

async function loadStoryBible(workId: string, query: { q?: string; fromChapter?: number; toChapter?: number }) {
  const [characters, worldSettings, timelineEvents, foreshadowings, relationships, writingMemories] =
    await Promise.all([
      prisma.character.findMany({
        where: { novelId: workId, deletedAt: null },
        orderBy: [{ updatedAt: "desc" }],
      }),
      prisma.worldSetting.findMany({
        where: { novelId: workId, deletedAt: null },
        orderBy: [{ kind: "asc" }, { updatedAt: "desc" }],
      }),
      prisma.timelineEvent.findMany({
        where: { novelId: workId, deletedAt: null },
        orderBy: [{ chapterIndex: "asc" }, { order: "asc" }, { createdAt: "asc" }],
      }),
      prisma.foreshadowing.findMany({
        where: { novelId: workId, deletedAt: null },
        orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
      }),
      prisma.relationship.findMany({
        where: { novelId: workId },
        orderBy: [{ updatedAt: "desc" }],
      }),
      prisma.writingMemory.findMany({
        where: { novelId: workId },
        orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      }),
    ]);

  const q = query.q ?? "";
  const from = query.fromChapter;
  const to = query.toChapter;

  return {
    characters: characters
      .filter((item) => inChapterRange(item.firstChapter, from, to) || inChapterRange(item.lastChapter, from, to))
      .filter((item) => textContains([item.name, item.role, item.desc, item.currentState], q))
      .map(serialize),
    worldSettings: worldSettings
      .filter((item) => inChapterRange(item.firstChapter, from, to) || inChapterRange(item.lastUpdatedChapter, from, to))
      .filter((item) => textContains([item.kind, item.name, item.desc], q))
      .map(serialize),
    timelineEvents: timelineEvents
      .filter((item) => inChapterRange(item.chapterIndex, from, to))
      .filter((item) => textContains([item.title, item.summary, item.description, item.storyTime], q))
      .map(serialize),
    foreshadowings: foreshadowings
      .filter((item) => inChapterRange(item.plantedChapter, from, to) || inChapterRange(item.resolvedChapter, from, to))
      .filter((item) => textContains([item.title, item.hint, item.payoff, item.status], q))
      .map(serialize),
    relationships: relationships
      .filter((item) => inChapterRange(item.recentChangeChapter, from, to))
      .filter((item) => textContains([item.characterAName, item.characterBName, item.status, item.conflict], q))
      .map(serialize),
    writingMemories: writingMemories
      .filter((item) => textContains([item.kind, item.content, item.source, item.priority], q))
      .map(serialize),
  };
}

function requireText(value: string | undefined, field: string) {
  const text = value?.trim();
  if (!text) throw new AuthApiError(400, `请填写${field}。`);
  return text;
}

async function createStoryBibleItem(section: StoryBibleSection, workId: string, body: StoryBiblePayload) {
  switch (section) {
    case "characters":
      return {
        character: serialize(await prisma.character.create({
          data: {
            novelId: workId,
            name: requireText(body.name, "角色名"),
            aliases: body.aliases ?? [],
            identity: body.identity || null,
            role: body.role || "supporting",
            desc: body.desc || "",
            personality: body.personality || null,
            goal: body.goal || null,
            secret: body.secret || null,
            appearance: body.appearance || null,
            notes: body.notes || null,
            arc: body.arc || null,
            currentState: body.currentState || null,
            firstChapter: body.firstChapter ?? null,
            lastChapter: body.lastChapter ?? null,
          },
        })),
      };
    case "worldSettings":
      return {
        setting: serialize(await prisma.worldSetting.create({
          data: {
            novelId: workId,
            kind: body.kind || "设定",
            name: requireText(body.name, "设定名称"),
            desc: body.desc || body.description || "",
            firstChapter: body.firstChapter ?? null,
            lastUpdatedChapter: body.lastUpdatedChapter ?? null,
          },
        })),
      };
    case "timelineEvents":
      return {
        event: serialize(await prisma.timelineEvent.create({
          data: {
            novelId: workId,
            title: body.title || body.name || null,
            summary: body.summary || body.description || body.title || body.name || "未命名事件",
            description: body.description || null,
            chapterIndex: body.chapterIndex ?? null,
            storyTime: body.storyTime || null,
            order: body.order ?? 0,
            canonical: body.canonical ?? true,
          },
        })),
      };
    case "foreshadowings":
      return {
        foreshadowing: serialize(await prisma.foreshadowing.create({
          data: {
            novelId: workId,
            title: body.title || body.name || null,
            description: body.description || null,
            hint: requireText(body.hint || body.summary || body.desc, "伏笔提示"),
            payoff: body.payoff || null,
            status: (body.status || "open") as ForeshadowingStatus,
            importance: body.priority ?? 50,
            plantedChapter: body.plantedChapter ?? null,
            resolvedChapter: body.resolvedChapter ?? null,
          },
        })),
      };
    case "relationships":
      return {
        relationship: serialize(await prisma.relationship.create({
          data: {
            novelId: workId,
            characterAName: requireText(body.characterAName || body.name, "人物 A"),
            characterBName: requireText(body.characterBName || body.title || undefined, "人物 B"),
            status: body.status || "关联",
            conflict: body.conflict || body.description || null,
            recentChangeChapter: body.recentChangeChapter ?? null,
          },
        })),
      };
    case "writingMemories":
      return {
        memory: serialize(await prisma.writingMemory.create({
          data: {
            novelId: workId,
            kind: (body.kind || "fact") as MemoryKind,
            priority: body.priority ?? 50,
            content: requireText(body.content || body.summary || body.desc, "记忆内容"),
            source: body.source || "story_bible",
            isActive: body.isActive ?? true,
          },
        })),
      };
  }
}

async function updateStoryBibleItem(params: {
  section: StoryBibleSection;
  workId: string;
  itemId: string;
  body: StoryBiblePayload;
}) {
  const { body, itemId, section, workId } = params;
  switch (section) {
    case "characters":
      return prisma.character.updateMany({ where: { id: itemId, novelId: workId, deletedAt: null }, data: { name: body.name, aliases: body.aliases, identity: body.identity, role: body.role, desc: body.desc, personality: body.personality, goal: body.goal, secret: body.secret, appearance: body.appearance, notes: body.notes, arc: body.arc, currentState: body.currentState, firstChapter: body.firstChapter, lastChapter: body.lastChapter } });
    case "worldSettings":
      return prisma.worldSetting.updateMany({ where: { id: itemId, novelId: workId, deletedAt: null }, data: { kind: body.kind, name: body.name, desc: body.desc ?? body.description ?? undefined, firstChapter: body.firstChapter, lastUpdatedChapter: body.lastUpdatedChapter } });
    case "timelineEvents":
      return prisma.timelineEvent.updateMany({ where: { id: itemId, novelId: workId, deletedAt: null }, data: { title: body.title ?? body.name, summary: body.summary, description: body.description, chapterIndex: body.chapterIndex, storyTime: body.storyTime, order: body.order, canonical: body.canonical } });
    case "foreshadowings":
      return prisma.foreshadowing.updateMany({ where: { id: itemId, novelId: workId, deletedAt: null }, data: { title: body.title ?? body.name, description: body.description, hint: body.hint, payoff: body.payoff, status: body.status as ForeshadowingStatus | undefined, importance: body.priority, plantedChapter: body.plantedChapter, resolvedChapter: body.resolvedChapter } });
    case "relationships":
      return prisma.relationship.updateMany({ where: { id: itemId, novelId: workId }, data: { characterAName: body.characterAName ?? body.name, characterBName: body.characterBName ?? body.title ?? undefined, status: body.status, conflict: body.conflict ?? body.description, recentChangeChapter: body.recentChangeChapter } });
    case "writingMemories":
      return prisma.writingMemory.updateMany({ where: { id: itemId, novelId: workId }, data: { kind: body.kind as MemoryKind | undefined, priority: body.priority, content: body.content ?? body.summary ?? body.desc, source: body.source, isActive: body.isActive } });
  }
}

async function deleteStoryBibleItem(section: StoryBibleSection, workId: string, itemId: string) {
  switch (section) {
    case "characters":
      return prisma.character.updateMany({ where: { id: itemId, novelId: workId, deletedAt: null }, data: { deletedAt: new Date() } });
    case "worldSettings":
      return prisma.worldSetting.updateMany({ where: { id: itemId, novelId: workId, deletedAt: null }, data: { deletedAt: new Date() } });
    case "timelineEvents":
      return prisma.timelineEvent.updateMany({ where: { id: itemId, novelId: workId, deletedAt: null }, data: { deletedAt: new Date() } });
    case "foreshadowings":
      return prisma.foreshadowing.updateMany({ where: { id: itemId, novelId: workId, deletedAt: null }, data: { deletedAt: new Date() } });
    case "relationships":
      return prisma.relationship.deleteMany({ where: { id: itemId, novelId: workId } });
    case "writingMemories":
      return prisma.writingMemory.updateMany({ where: { id: itemId, novelId: workId }, data: { isActive: false } });
  }
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "" });
    const query = storyBibleListQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const { work } = await requireWorkAccess(params.id);
    return successResponse(await loadStoryBible(work.id, query), { message: "OK" });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "" });
    const section = storyBibleSectionSchema.parse(new URL(request.url).searchParams.get("section"));
    const body = await parseJsonBody(request, storyBiblePayloadSchema);
    const { work } = await requireWorkAccess(params.id);
    return successResponse(await createStoryBibleItem(section, work.id, body), { message: "故事圣经已更新。" });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const rawParams = await context.params;
    const params = itemParamsSchema.parse({ id: rawParams.id ?? "", section: rawParams.section ?? "", itemId: rawParams.itemId ?? "" });
    const body = await parseJsonBody(request, storyBiblePayloadSchema);
    const { work } = await requireWorkAccess(params.id);
    const result = await updateStoryBibleItem({ section: params.section, workId: work.id, itemId: params.itemId, body });
    if (result.count === 0) throw new AuthApiError(404, "条目不存在。");
    return successResponse({ id: params.itemId }, { message: "故事圣经条目已更新。" });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const rawParams = await context.params;
    const params = itemParamsSchema.parse({ id: rawParams.id ?? "", section: rawParams.section ?? "", itemId: rawParams.itemId ?? "" });
    const { work } = await requireWorkAccess(params.id);
    const result = await deleteStoryBibleItem(params.section, work.id, params.itemId);
    if (result.count === 0) throw new AuthApiError(404, "条目不存在。");
    return successResponse({ id: params.itemId }, { message: "故事圣经条目已删除。" });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function EXTRACT(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await getCurrentUser();
    if (!user) throw new AuthApiError(401, "未登录或登录已失效，请先登录。");
    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "" });
    const body = await parseJsonBody(request, storyBibleExtractSchema);
    const { work } = await requireWorkAccess(params.id);
    const chapter = await prisma.chapter.findUnique({
      where: { workId_index: { workId: work.id, index: body.chapterIndex } },
      select: { id: true, deletedAt: true },
    });
    if (!chapter || chapter.deletedAt) throw new AuthApiError(404, "章节不存在。");
    const queued = await runChapterContextExtraction({
      user,
      workId: work.id,
      chapterId: chapter.id,
      index: body.chapterIndex,
      trigger: "save",
      force: body.force,
    });
    return successResponse({ queued }, { message: queued ? "已从当前章节提取故事圣经。" : "本章刚提取过，请稍后再试。" });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2021" || error.code === "P2022")) {
      return errorResponse(new AuthApiError(500, "数据表尚未迁移完成，请先执行 Prisma 迁移。"));
    }
    return errorResponse(error);
  }
}

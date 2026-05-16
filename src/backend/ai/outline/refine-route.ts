import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/auth/api";
import { z } from "zod";

import { assertAiQuotaAvailable } from "@/lib/ai/quota";
import { logAiUsage } from "@/lib/ai/usage-log";
import {
  buildAiProviderChain,
  callAiText,
  getAiProvidersFromEnv,
  getProviderApiKeyEnvName,
  getReadableAiErrorMessage,
} from "@/lib/ai/upstream-text";
import { buildOutlineSystemPrompt } from "@/lib/ai/outline-prompt";
import { isAdminUser } from "@/lib/auth/admin";
import { getCurrentUser } from "@/lib/auth/service";
import { getAiModelConfig } from "@/lib/config/ai-model";
import { getPlanningConfig } from "@/lib/config/planning";
import type { StoryOutline } from "@/lib/create/outline-draft";
import {
  normalizeStoryOutline,
  storyOutlineSchema,
} from "@/lib/create/outline-schema";
import {
  canExtendPlanningWindow,
  getEffectivePlannedUntil,
  getNextPlannedUntil,
  normalizeProgressiveOutline,
  type PlanningPreset,
} from "@/lib/create/progressive-planning";
import { prisma } from "@/lib/prisma";
import { assertSameOriginRequest } from "@/lib/security/origin";

export const runtime = "nodejs";

const bodySchema = z.object({
  workId: z.string().min(1).max(64),
  supplement: z.string().max(1200).optional(),
  preset: z.enum(["short", "smart", "long"]).optional(),
});

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

function clampText(value: string, maxChars: number) {
  const normalized = (value ?? "").trim();
  if (!normalized) return "";
  return normalized.length > maxChars ? normalized.slice(0, maxChars) : normalized;
}

function formatChapterRange(start?: number, end?: number) {
  if (typeof start !== "number" || typeof end !== "number") return "";
  return start === end ? `第${start}章` : `第${start}-${end}章`;
}

function formatVolumeHint(volume: StoryOutline["volumes"][number], index: number) {
  const range = formatChapterRange(volume.startChapter, volume.endChapter);
  const segments =
    volume.segments
      ?.map((segment) => {
        const segmentRange = formatChapterRange(
          segment.startChapter,
          segment.endChapter,
        );
        return `  - ${segment.title}${segmentRange ? `（${segmentRange}）` : ""}：${clampText(segment.desc, 120)}`;
      })
      .join("\n") ?? "";

  return [
    `${index + 1}) 卷名：${volume.name}${range ? `（${range}）` : ""}`,
    `当前层级：${volume.detailLevel ?? "detailed"} / ${volume.status ?? "planned"}`,
    `原 desc：${clampText(volume.desc ?? "", 420) || "-"}`,
    segments ? `原小节：\n${segments}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function getWrittenUntilChapter(chapters: Array<{ index: number; wordCount: number }>) {
  const byIndex = new Map(chapters.map((chapter) => [chapter.index, chapter.wordCount]));
  const maxIndex = Math.max(0, ...chapters.map((chapter) => chapter.index));

  for (let index = 1; index <= maxIndex; index += 1) {
    if ((byIndex.get(index) ?? 0) <= 0) return index - 1;
  }

  return maxIndex;
}

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
  } catch (error) {
    return errorResponse(error);
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, message: "未登录或登录已失效，请先登录。" },
      { status: 401 },
    );
  }

  await assertAiQuotaAvailable(user);

  const raw = await request.json().catch(() => null as unknown);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "请求参数校验失败，请检查输入内容。" },
      { status: 400 },
    );
  }

  const isAdmin = isAdminUser(user);
  const work = await prisma.work.findUnique({
    where: { id: parsed.data.workId },
    select: {
      id: true,
      userId: true,
      genreId: true,
      genreLabel: true,
      tags: true,
      words: true,
      tag: true,
      title: true,
      synopsis: true,
      outline: true,
      targetChapters: true,
      plannedUntilChapter: true,
      rawOutline: true,
      deletedAt: true,
    },
  });

  if (!work || work.deletedAt) {
    return NextResponse.json(
      { success: false, message: "作品不存在或已被删除。" },
      { status: 404 },
    );
  }

  if (!isAdmin && work.userId !== user.id) {
    return NextResponse.json({ success: false, message: "无权限访问该作品。" }, { status: 403 });
  }

  const outline = work.outline as unknown as StoryOutline;
  if (!outline?.volumes?.length) {
    return NextResponse.json(
      { success: false, message: "当前作品缺少大纲数据，无法规划下一段。" },
      { status: 400 },
    );
  }

  const chapters = await prisma.chapter.findMany({
    where: { workId: work.id, deletedAt: null },
    select: { index: true, wordCount: true },
  });
  const planningConfig = await getPlanningConfig();
  const preset = (parsed.data.preset ?? "smart") as PlanningPreset;
  const targetChapters =
    work.targetChapters ?? outline.targetChapters ?? outline.totalChapters ?? 0;
  const plannedUntilChapter = getEffectivePlannedUntil({
    outline,
    plannedUntilChapter: work.plannedUntilChapter,
  });
  const writtenUntilChapter = getWrittenUntilChapter(chapters);
  const extensionState = canExtendPlanningWindow({
    targetChapters: targetChapters || plannedUntilChapter,
    plannedUntilChapter,
    writtenUntilChapter,
    threshold: planningConfig.unlockThreshold,
  });

  if (!extensionState.allowed) {
    return NextResponse.json(
      { success: false, message: extensionState.reason },
      { status: 423 },
    );
  }

  const nextPlannedUntil = getNextPlannedUntil({
    targetChapters: targetChapters || plannedUntilChapter,
    plannedUntilChapter,
    preset,
    config: planningConfig,
  });

  const providersFromEnv = getAiProvidersFromEnv();
  const aiModelConfig = await getAiModelConfig();
  const target = aiModelConfig.regenerateAll;

  const providers = buildAiProviderChain({
    providers: providersFromEnv,
    preferredProviderId: target.providerId,
    overrideModel: target.model,
  });

  if (!providers.length) {
    const envKey = getProviderApiKeyEnvName(target.providerId);
    return NextResponse.json(
      {
        success: false,
        message: `AI 未配置：当前“规划下一段”使用 ${target.providerId}，但未检测到 ${envKey}。请在 web/.env 或 web/.env.local 配置后重启，或到后台切换线路。`,
      },
      { status: 500 },
    );
  }

  const volumeHints = outline.volumes.map(formatVolumeHint).join("\n\n");
  const supplement = clampText(parsed.data.supplement ?? "", 1200);

  const systemPrompt = [
    buildOutlineSystemPrompt(),
    "",
    "你将接收一份渐进式长篇大纲。你的任务是：只规划下一段可写窗口，不一次性展开全书章节。",
    `当前详细规划到第 ${plannedUntilChapter} 章，本次只允许追加规划到第 ${nextPlannedUntil} 章。`,
    "不能改写已写章节，不能删除或大幅改动既有核心设定；未来未到窗口的卷仍保持 macro/locked。",
    "请务必遵守输出 schema 与格式约束。",
  ].join("\n");

  const userPrompt = [
    `作品标题：${outline.title || work.title}`,
    `题材标签：${outline.tag || work.tag || "-"}`,
    work.genreLabel || work.genreId ? `类型：${work.genreLabel || work.genreId}` : "",
    work.words ? `目标字数：${work.words}` : "",
    "",
    `作品简介：${clampText(outline.synopsis || work.synopsis || "", 900) || "-"}`,
    "",
    `当前进度：已写到第 ${writtenUntilChapter} 章；已规划到第 ${plannedUntilChapter} 章；本次规划到第 ${nextPlannedUntil} 章。`,
    "",
    "现有分卷（已规划窗口内请保留，只追加未来窗口）：",
    volumeHints || "-",
    supplement
      ? [
          "",
          "本次规划下一段的补充要求：",
          supplement,
          "请优先吸收这些补充要求，但不要破坏作品既有核心设定。",
        ].join("\n")
      : "",
    "",
    "输出要求：",
    "1) 只输出严格 JSON（仅一个对象），不要 Markdown，不要多余文字。",
    "2) 保持故事核心、主角动机、主线冲突不变；第 1 章到当前已规划窗口不做重写，只补下一段详细规划。",
    `3) totalChapters/targetChapters 保持长期目标；plannedUntilChapter 必须等于 ${nextPlannedUntil}。`,
    "4) segments 只能覆盖 plannedUntilChapter 以内的章节，未来章节只保留 macro 卷方向，不展开海量小节。",
    "5) 已规划窗口与新增窗口的小节必须连续覆盖且不重叠不跳号；desc 语言要克制、可执行、易扫读。",
    "6) desc 需要换行时，请在 JSON 字符串内使用 \\n 表示换行，不能输出未转义的真实换行。",
    "",
    "schema：",
    "{",
    '  "tag": "...",',
    '  "title": "...",',
    '  "synopsis": "...",',
    '  "totalChapters": 长期目标章数（数字）,',
    '  "targetChapters": 长期目标章数（数字）,',
    `  "plannedUntilChapter": ${nextPlannedUntil},`,
    '  "planningMode": "progressive",',
    '  "volumes": [',
    '    {',
    '      "name": "...",',
    '      "startChapter": 卷起始章（数字）,',
    '      "endChapter": 卷结束章（数字）,',
    '      "detailLevel": "macro|detailed",',
    '      "status": "planned|locked",',
    '      "desc": "本卷主线作用与情绪推进",',
    '      "segments": [',
    '        { "title": "...", "startChapter": 小节起始章（数字）, "endChapter": 小节结束章（数字）, "desc": "2-3句可执行剧情推进" }',
    '      ]',
    '    }',
    '  ],',
    '  "characters": [ { "name": "...", "role": "protagonist|heroine|antagonist|supporting", "desc": "..." } ]',
    "}",
  ]
    .filter(Boolean)
    .join("\n");

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const first = await callAiText({
    providers,
    preferredProviderId: target.providerId,
    messages,
    temperature: 0.68,
    maxTokens: 4200,
    attempts: 1,
  });

  await logAiUsage({ userId: user.id, action: "outline_extend", result: first });

  if (!first.ok || !first.text) {
    return NextResponse.json(
      {
        success: false,
        message: getReadableAiErrorMessage(first, "AI 服务调用失败，请稍后重试。"),
      },
      { status: 502 },
    );
  }

  let content = first.text;
  let storyRaw = extractJson(content);

  if (!storyRaw) {
    const second = await callAiText({
      providers,
      preferredProviderId: first.providerId ?? target.providerId,
      messages: [
        ...messages,
        { role: "assistant", content },
        {
          role: "user",
          content:
            "上一轮输出不是合法 JSON。请严格只输出 JSON 对象，并确保完全符合 schema，不能包含任何多余文字。",
        },
      ],
      temperature: 0.45,
      maxTokens: 4200,
      attempts: 1,
    });

    await logAiUsage({ userId: user.id, action: "outline_extend_retry", result: second });

    if (second.ok && second.text) {
      content = second.text;
      storyRaw = extractJson(second.text);
    }
  }

  const validated = storyOutlineSchema.safeParse(storyRaw);
  if (!validated.success) {
    return NextResponse.json(
      { success: false, message: "大纲优化解析失败，请稍后重试。" },
      { status: 502 },
    );
  }

  const normalizedCandidate = normalizeStoryOutline(validated.data);
  const progressive = normalizeProgressiveOutline(normalizedCandidate, {
    config: planningConfig,
    preset,
    targetChapters: targetChapters || normalizedCandidate.totalChapters,
    plannedUntilChapter: nextPlannedUntil,
    maxWrittenChapter: writtenUntilChapter,
  });
  const nextOutline: StoryOutline = {
    ...progressive.outline,
    title: outline.title || progressive.outline.title,
    tag: outline.tag || progressive.outline.tag,
    synopsis: outline.synopsis || progressive.outline.synopsis,
  };

  await prisma.work.update({
    where: { id: work.id },
    data: {
      outline: nextOutline as unknown as Prisma.InputJsonValue,
      targetChapters: progressive.targetChapters,
      plannedUntilChapter: progressive.plannedUntilChapter,
      planningMode: "progressive",
      rawOutline: (work.rawOutline ?? work.outline) as Prisma.InputJsonValue,
    },
    select: { id: true },
  });

  return NextResponse.json({
    success: true,
    message: "OK",
    data: {
      outline: nextOutline,
      targetChapters: progressive.targetChapters,
      plannedUntilChapter: progressive.plannedUntilChapter,
    },
  });
}

import { NextResponse } from "next/server";
import { z } from "zod";

import { logAiUsage } from "@/lib/ai/usage-log";
import { callAiText, getAiProvidersFromEnv } from "@/lib/ai/upstream-text";
import { buildOutlineSystemPrompt } from "@/lib/ai/outline-prompt";
import { isAdminEmail } from "@/lib/auth/admin";
import { getCurrentUser } from "@/lib/auth/service";
import { getAiModelConfig } from "@/lib/config/ai-model";
import { prisma } from "@/lib/prisma";
import type { StoryOutline } from "@/lib/create/outline-draft";
import {
  normalizeStoryOutline,
  storyOutlineSchema,
} from "@/lib/create/outline-schema";

export const runtime = "nodejs";

const bodySchema = z.object({
  workId: z.string().min(1).max(64),
  supplement: z.string().max(1200).optional(),
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
    `原 desc：${clampText(volume.desc ?? "", 420) || "-"}`,
    segments ? `原小节：\n${segments}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, message: "未登录或登录已失效，请先登录。" },
      { status: 401 },
    );
  }

  const raw = await request.json().catch(() => null as unknown);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "请求参数校验失败，请检查输入内容。" },
      { status: 400 },
    );
  }

  const isAdmin = isAdminEmail(user.email);
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
    },
  });

  if (!work) {
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
      { success: false, message: "当前作品缺少大纲数据，无法优化。" },
      { status: 400 },
    );
  }

  const providersFromEnv = getAiProvidersFromEnv();
  const aiModelConfig = await getAiModelConfig();
  const target = aiModelConfig.regenerateAll;

  const selectedProvider = providersFromEnv.find(
    (provider) => provider.id === target.providerId,
  );

  if (!selectedProvider) {
    const envKey = target.providerId === "primary" ? "AI_API_KEY" : "ARK_API_KEY";
    return NextResponse.json(
      {
        success: false,
        message:
          `AI 未配置：当前“优化大纲”使用 ${target.providerId}，但未检测到 ${envKey}。请在 web/.env 或 web/.env.local 配置后重启，或到后台切换线路。`,
      },
      { status: 500 },
    );
  }

  const providers = [
    {
      ...selectedProvider,
      model: target.model ?? selectedProvider.model,
    },
  ];

  const volumeHints = outline.volumes.map(formatVolumeHint).join("\n\n");
  const supplement = clampText(parsed.data.supplement ?? "", 1200);

  const systemPrompt = [
    buildOutlineSystemPrompt(),
    "",
    "你将接收一份已生成的作品大纲。你的任务是：在不改变故事核心信息的前提下，重新规划更高效、更好写的动态分卷与章节结构。",
    "你可以合并、拆分、改名、调整卷数、调整起止章、调整小节范围；不要被旧的卷名、卷数、章数绑定。",
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
    "现有分卷（仅作为参考；如更合理，可以重排卷数、卷名、章数和小节）：",
    volumeHints || "-",
    supplement
      ? [
          "",
          "本次重写的补充要求：",
          supplement,
          "请优先吸收这些补充要求，但不要破坏作品既有核心设定。",
        ].join("\n")
      : "",
    "",
    "输出要求：",
    "1) 只输出严格 JSON（仅一个对象），不要 Markdown，不要多余文字。",
    "2) 保持故事核心、主角动机、主线冲突不变，但允许重写 volumes 的 name/startChapter/endChapter/desc/segments。",
    "3) totalChapters、卷数、卷长、小节长度都由你动态决定；不要固定 400 章一卷，也不要机械平均分段。",
    "4) 每卷至少 1 个 segments，小节必须连续覆盖卷范围且不重叠不跳号；desc 语言要克制、可执行、易扫读。",
    "5) desc 需要换行时，请在 JSON 字符串内使用 \\n 表示换行，不能输出未转义的真实换行。",
    "",
    "schema：",
    "{",
    '  "tag": "...",',
    '  "title": "...",',
    '  "synopsis": "...",',
    '  "totalChapters": 由你估算出的总章数（数字）,',
    '  "volumes": [',
    '    {',
    '      "name": "...",',
    '      "startChapter": 卷起始章（数字）,',
    '      "endChapter": 卷结束章（数字）,',
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
    attempts: 3,
  });

  await logAiUsage({ userId: user.id, action: "outline_refine", result: first });

  if (!first.ok || !first.text) {
    const upstreamMessage = first.upstreamMessage;

    return NextResponse.json(
      {
        success: false,
        message:
          first.status === 401
            ? "AI 服务鉴权失败，请检查 AI_API_KEY / ARK_API_KEY。"
            : first.status === 429
              ? "AI 服务请求过于频繁（上游限流），请稍后重试。"
              : first.status === 503
                ? "AI 服务暂时不可用（上游拥堵或维护），请稍后重试。"
                : first.status === 502
                  ? "AI 服务暂时不可用（上游网关异常 502），请稍后重试。"
                  : typeof upstreamMessage === "string"
                    ? `AI 服务调用失败：${upstreamMessage}${first.status ? `（HTTP ${first.status}）` : ""}`
                    : "AI 服务调用失败，请稍后重试。",
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
      attempts: 2,
    });

    await logAiUsage({ userId: user.id, action: "outline_refine_retry", result: second });

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

  const nextOutline: StoryOutline = normalizeStoryOutline(validated.data);

  await prisma.work.update({
    where: { id: work.id },
    data: { outline: nextOutline },
    select: { id: true },
  });

  return NextResponse.json({
    success: true,
    message: "OK",
    data: { outline: nextOutline },
  });
}

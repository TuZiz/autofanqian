import { NextResponse } from "next/server";
import { z } from "zod";

import { callAiText, getAiProvidersFromEnv } from "@/lib/ai/upstream-text";
import { logAiUsage } from "@/lib/ai/usage-log";
import { requireAdminUser } from "@/lib/auth/admin";
import { getAiModelConfig } from "@/lib/config/ai-model";
import { getCreateUiConfig } from "@/lib/config/create-ui";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const bodySchema = z.object({
  genreId: z.string().min(1).max(64).optional(),
  perGenre: z.number().int().min(1).max(10).optional(),
});

function parseStringArrayFromModel(text: string) {
  const trimmed = text.trim();

  try {
    const json = JSON.parse(trimmed) as unknown;

    if (Array.isArray(json)) {
      return json
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object") {
            const content = (item as { content?: unknown }).content;
            if (typeof content === "string") return content;
          }
          return null;
        })
        .filter((item): item is string => typeof item === "string");
    }

    if (json && typeof json === "object") {
      const templates = (json as { templates?: unknown }).templates;
      if (Array.isArray(templates)) {
        return templates
          .map((item) => (typeof item === "string" ? item : null))
          .filter((item): item is string => typeof item === "string");
      }
    }
  } catch {
    // fallthrough
  }

  // Fallback: split by lines / numbering.
  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const items: string[] = [];
  for (const line of lines) {
    const normalized = line
      .replace(/^[-*]\s+/, "")
      .replace(/^\d+\.\s+/, "")
      .replace(/^\(\d+\)\s*/, "")
      .trim();
    if (normalized.length >= 20) {
      items.push(normalized);
    }
  }

  return items;
}

function sanitizeTemplateText(raw: string, fallbackTitle: string) {
  let text = raw.trim();

  text = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();

  // Strip wrapping quotes.
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("“") && text.endsWith("”"))
  ) {
    text = text.slice(1, -1).trim();
  }

  // Convert literal "\n"/"\\n" sequences into newlines, then flatten.
  text = text
    .replace(/\\\\r\\\\n/g, "\n")
    .replace(/\\\\n/g, "\n")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  // Remove blueprint labels if they appear.
  text = text.replace(
    /(标签|核心设定|设定|世界规则|主角目标|阻力|爽点|开篇钩子|断章钩子|钩子)\s*[:：]\s*/g,
    "",
  );

  // Flatten to a single paragraph to match existing UI cards.
  text = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");

  text = text.replace(/\s+/g, " ").trim();
  text = text.replace(/^["“”'‘’]+/, "").replace(/["“”'‘’]+$/, "").trim();

  if (!text) return null;

  // Ensure starts with 【标题】 for consistent template cards.
  if (!/^【[^】]{1,12}】/.test(text)) {
    const title = (fallbackTitle || "热门模板").trim().slice(0, 8) || "热门模板";
    text = `【${title}】${text}`;
  }

  // Clamp length so templates stay compact.
  const maxLen = 240;
  if (text.length > maxLen) {
    let sliced = text.slice(0, maxLen);
    const lastPunct = Math.max(
      sliced.lastIndexOf("。"),
      sliced.lastIndexOf("！"),
      sliced.lastIndexOf("？"),
      sliced.lastIndexOf("…"),
    );
    if (lastPunct > 80) {
      sliced = sliced.slice(0, lastPunct + 1);
    }
    text = sliced;
  }

  if (text.length < 50) return null;

  return text;
}

export async function POST(request: Request) {
  const adminUser = await requireAdminUser();

  const providersFromEnv = getAiProvidersFromEnv();
  const aiModelConfig = await getAiModelConfig();
  const target = aiModelConfig.templatesLearn;

  const selectedProvider = providersFromEnv.find(
    (provider) => provider.id === target.providerId,
  );

  if (!selectedProvider) {
    const envKey = target.providerId === "primary" ? "AI_API_KEY" : "ARK_API_KEY";
    return NextResponse.json(
      {
        success: false,
        message:
          `AI 未配置：当前“AI 学习生成（预设模板库）”配置使用 ${target.providerId}，但未检测到 ${envKey}。请在 web/.env 或 web/.env.local 中配置后重启，或到后台“AI 模型配置”切换线路。`,
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

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { success: false, message: "请求参数错误。" },
      { status: 400 },
    );
  }

  const config = await getCreateUiConfig();
  const perGenre = body.perGenre ?? 6;
  const genreIds = body.genreId
    ? [body.genreId]
    : config.genres.map((genre) => genre.id);

  const results: Array<{ genreId: string; created: number; skipped: number }> = [];

  const clampSnippet = (text: string, max = 320) => {
    const normalized = text.replace(/\s+/g, " ").trim();
    return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
  };

  for (const genreId of genreIds) {
    const meta = config.genres.find((genre) => genre.id === genreId);
    if (!meta) continue;

    const recentIdeas = await prisma.ideaGenerationEvent.findMany({
      where: { genreId },
      orderBy: { createdAt: "desc" },
      take: 16,
      select: { outputIdea: true },
    });

    const topTemplates = await prisma.createTemplate.findMany({
      where: { genreId, isActive: true },
      orderBy: [{ usageCount: "desc" }, { updatedAt: "desc" }],
      take: 10,
      select: { content: true, usageCount: true },
    });

    const templateSamples = topTemplates.slice(0, 6);
    const ideaSamples = recentIdeas.slice(0, 10);

    const systemPrompt = [
      "你是中文网文平台的爆款编辑，负责产出“热门模板”短文案。",
      "风格偏番茄：情绪直给、节奏快、短句、强冲突、适配短剧化。",
      "请只输出 JSON 数组（不要 Markdown / 不要多余解释），数组长度等于要求条数。",
      `每条模板 80-180 字（最多 240 字），必须以【模板名】开头（8 字以内）。`,
      "结构建议：一句设定 + 一句冲突/爽点 + 一句结尾钩子（例如“就在这时……”）。",
      "严格禁止：编号列表、字段名冒号（如“标签：/世界规则：”）、出现“\\n”字样、整段被引号包裹。",
    ].join("\n");

    const userPrompt = [
      `小说类型：${meta.name}`,
      `常用标签：${meta.tags.join("、") || "无"}`,
      "",
      "参考模板（仅参考风格，不要抄袭/不要太像）：",
      templateSamples.length
        ? templateSamples
            .map(
              (item, idx) =>
                `${idx + 1}) ${clampSnippet(item.content)}（使用：${item.usageCount}）`,
            )
            .join("\n")
        : "（暂无）",
      "",
      "近期用户创意（仅参考热点，不要照抄）：",
      ideaSamples.length
        ? ideaSamples
            .map((item, idx) => `${idx + 1}) ${clampSnippet(item.outputIdea)}`)
            .join("\n")
        : "（暂无）",
      "",
      `请生成 ${perGenre} 条新的热门模板（JSON 数组）。`,
    ].join("\n");

    const response = await callAiText({
      providers,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 800,
      attempts: 3,
      preferredProviderId: target.providerId,
    });

    await logAiUsage({
      userId: adminUser.id,
      action: "templates_learn",
      result: response,
    });

    if (!response.ok || !response.text) {
      const upstreamMessage = response.upstreamMessage;

      return NextResponse.json(
        {
          success: false,
          message:
            response.status === 401
              ? "AI 学习失败：鉴权失败，请检查 AI_API_KEY / ARK_API_KEY。"
              : response.status === 429
                ? "AI 学习失败：上游限流（429），请稍后重试。"
                : response.status === 503
                  ? "AI 学习失败：上游服务暂不可用（503），请稍后重试。"
                  : response.status === 502
                    ? "AI 学习失败：上游网关异常（502），请稍后重试。"
                    : typeof upstreamMessage === "string"
                      ? `AI 学习失败：${upstreamMessage}${
                          response.status ? `（HTTP ${response.status}）` : ""
                        }`
                      : `AI 学习失败（HTTP ${response.status || 0}）。`,
        },
        { status: 502 },
      );
    }

    const content = response.text;

    const candidates = Array.from(
      new Set(
        parseStringArrayFromModel(content)
          .map((item) => sanitizeTemplateText(item, meta.name))
          .filter((item): item is string => typeof item === "string" && Boolean(item)),
      ),
    )
      .map((item) => item.slice(0, 420))
      .filter((item) => item.length >= 50)
      .slice(0, perGenre);

    if (!candidates.length) {
      results.push({ genreId, created: 0, skipped: perGenre });
      continue;
    }

    const existing = await prisma.createTemplate.findMany({
      where: {
        genreId,
        content: { in: candidates },
      },
      select: { content: true },
    });

    const existingSet = new Set(existing.map((item) => item.content));
    const next = candidates.filter((item) => !existingSet.has(item));

    if (!next.length) {
      results.push({ genreId, created: 0, skipped: candidates.length });
      continue;
    }

    await prisma.createTemplate.createMany({
      data: next.map((contentText) => ({
        genreId,
        title: null,
        content: contentText,
        source: "learned",
        usageCount: 0,
        isActive: true,
      })),
    });

    results.push({
      genreId,
      created: next.length,
      skipped: candidates.length - next.length,
    });
  }

  return NextResponse.json({
    success: true,
    message: "热门模板已学习更新。",
    data: { results },
  });
}

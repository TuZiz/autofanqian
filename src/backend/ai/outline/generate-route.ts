import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/auth/api";
import { randomInt, randomUUID } from "crypto";
import { z } from "zod";

import { assertAiQuotaAvailable } from "@/lib/ai/quota";
import {
  buildOutlineSystemPrompt,
  buildOutlineUserPrompt,
} from "@/lib/ai/outline-prompt";
import { logAiUsage } from "@/lib/ai/usage-log";
import {
  buildAiProviderChain,
  callAiText,
  getAiProvidersFromEnv,
  getProviderApiKeyEnvName,
  getReadableAiErrorMessage,
} from "@/lib/ai/upstream-text";
import { isAdminUser } from "@/lib/auth/admin";
import { getCurrentUser } from "@/lib/auth/service";
import { getAiModelConfig } from "@/lib/config/ai-model";
import { aiZhCN } from "@/lib/copy/ai-zh-cn";
import { getCreateUiConfig } from "@/lib/config/create-ui";
import { getPlanningConfig } from "@/lib/config/planning";
import {
  normalizeStoryOutline,
  storyOutlineSchema,
} from "@/lib/create/outline-schema";
import { normalizeProgressiveOutline } from "@/lib/create/progressive-planning";
import { assertSameOriginRequest } from "@/lib/security/origin";

export const runtime = "nodejs";

const requestSchema = z.object({
  genre: z.string().min(1).max(64),
  customGenreLabel: z.string().max(80).optional(),
  customDetails: z.string().max(1200).optional(),
  idea: z.string().min(10).max(2000).optional(),
  tags: z.array(z.string()).max(12).optional(),
  platform: z.string().optional(),
  dna: z.string().optional(),
  dnaBookTitle: z.string().max(120).optional(),
  words: z.string().optional(),
});

const POV_VARIANTS = [
  "主角从底层误入核心局，先靠一次小胜打开局面，再逐步卷入更大的势力棋局。",
  "主角一开始拥有局部优势，但这个优势伴随明显代价，必须在收益和反噬之间做选择。",
  "主角被迫背锅或顶替身份，开局目标不是变强，而是先活下来并洗清关键误会。",
  "主角掌握一条别人不重视的信息差，前期爽点来自低成本反杀和反向布局。",
  "主角和关键女主/搭档从互相利用开始，关系推进必须服务主线冲突。",
  "主角的初始目标很小，但每次解决问题都会暴露更深层规则，形成滚雪球式升级。",
] as const;

const CONFLICT_VARIANTS = [
  "核心矛盾优先落在资源分配和规则漏洞上，不要只写单纯打脸。",
  "核心矛盾优先落在身份秘密和阵营站队上，让敌我关系有反转空间。",
  "核心矛盾优先落在旧制度与新打法冲突上，主角用非常规方案破局。",
  "核心矛盾优先落在亲密关系、利益绑定和背叛风险上，让情绪线参与推进。",
  "核心矛盾优先落在限时任务和公开竞争上，开局就给出清晰倒计时压力。",
  "核心矛盾优先落在认知差上，读者比部分角色更早知道危险，但不知道代价。",
] as const;

const OPENING_VARIANTS = [
  "开局事件用一场失败、处罚或被逐出作为触发点，随后给出反转机会。",
  "开局事件用一次公开考核、招募、拍卖或试炼作为触发点，冲突当场爆发。",
  "开局事件用一桩看似小事的委托/案件作为触发点，牵出第一层主线。",
  "开局事件用主角发现系统/规则漏洞作为触发点，但不能让能力无代价无上限。",
  "开局事件用关键人物求助或威胁作为触发点，让主角被迫进入局中。",
  "开局事件用主角主动设局作为触发点，第一卷要展示他方法论的独特性。",
] as const;

const PLEASURE_VARIANTS = [
  "爽点以反向预判、信息差和局中局为主，少写机械升级。",
  "爽点以资源经营、滚雪球收益和公开验收为主，每一段都要有可见成果。",
  "爽点以身份揭露、误会反转和群体态度变化为主，打脸要有铺垫。",
  "爽点以强敌压迫下的极限翻盘为主，但每次翻盘必须付出代价或埋新问题。",
  "爽点以人物羁绊、搭档配合和情绪回收为主，不要只有主角单刷。",
  "爽点以规则创新和体系改造为主，让读者看到主角改变玩法。",
] as const;

const STRUCTURE_VARIANTS = [
  "第一卷结构：危机入局 -> 小胜立足 -> 更大敌人现身 -> 阶段性胜利但留下隐患。",
  "第一卷结构：误判开局 -> 发现漏洞 -> 反向利用 -> 公开验证 -> 敌人改变打法。",
  "第一卷结构：被动求生 -> 组建临时同盟 -> 夺取关键资源 -> 关系破裂或升级。",
  "第一卷结构：隐藏身份 -> 连续试探 -> 局部曝光 -> 借曝光完成反杀。",
  "第一卷结构：接到任务 -> 调查真相 -> 发现幕后规则 -> 用规则反制规则。",
  "第一卷结构：主动创业/建势力 -> 首次失败 -> 调整模式 -> 打出样板案例。",
] as const;

function pickVariant(list: readonly string[]) {
  return list[randomInt(list.length)];
}

function buildOutlineVariationSeed(params: {
  genreLabel: string;
  tags: string[];
  idea: string;
}) {
  const nonce = randomUUID().slice(0, 8);
  const tagHint = params.tags.length ? `题材标签参考：${params.tags.join("、")}` : "";

  return [
    `差异化编号：${nonce}`,
    "即使用户创意来自常用模板，也必须生成一套新的作品方案，避免与同模板其他作品在标题、主角身份、关键人物关系、开局事件、第一卷主线和反派动机上高度相似。",
    `类型锚点：${params.genreLabel}`,
    tagHint,
    `主角切入角度：${pickVariant(POV_VARIANTS)}`,
    `核心矛盾角度：${pickVariant(CONFLICT_VARIANTS)}`,
    `开局触发事件：${pickVariant(OPENING_VARIANTS)}`,
    `主要爽点结构：${pickVariant(PLEASURE_VARIANTS)}`,
    `第一卷节奏骨架：${pickVariant(STRUCTURE_VARIANTS)}`,
    "生成要求：保留用户创意的核心卖点，但必须重新设计人物姓名、势力名称、第一卷事件链、阶段目标和关键反转；不要照抄模板句式，不要沿用模板里暗示的固定桥段顺序。",
  ]
    .filter(Boolean)
    .join("\n");
}

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

async function fetchTextWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number },
) {
  const controller = new AbortController();
  const timeoutMs = init.timeoutMs ?? 12000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text().catch(() => "");
    return { ok: response.ok, status: response.status, text };
  } catch {
    return { ok: false, status: 0, text: "" };
  } finally {
    clearTimeout(timeout);
  }
}

function parseTopLinksFromBing(html: string, limit: number) {
  const results: string[] = [];
  const regex = /<li class="b_algo"[\s\S]*?<a href="([^"]+)"/g;
  let match: RegExpExecArray | null = null;

  while ((match = regex.exec(html)) && results.length < limit) {
    const url = match[1];
    if (!url) continue;
    if (!/^https?:\/\//i.test(url)) continue;
    if (/^https?:\/\/(www\.)?bing\.com\//i.test(url)) continue;
    results.push(url);
  }

  return Array.from(new Set(results));
}

function clampSnippet(text: string, max = 700) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

async function researchBookFromWeb(title: string) {
  const query = `${title} 小说 简介 世界观 设定 风格`;
  const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;

  const search = await fetchTextWithTimeout(searchUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
      Accept: "text/html",
    },
    timeoutMs: 10000,
  });

  if (!search.ok || !search.text) {
    return [];
  }

  const links = parseTopLinksFromBing(search.text, 3);
  const sources: Array<{ url: string; snippet: string }> = [];

  for (const url of links.slice(0, 2)) {
    const readerUrl = `https://r.jina.ai/${url}`;
    const page = await fetchTextWithTimeout(readerUrl, {
      headers: { Accept: "text/plain" },
      timeoutMs: 12000,
    });

    if (!page.ok || !page.text) continue;
    const snippet = clampSnippet(page.text, 780);
    if (snippet.length < 120) continue;
    sources.push({ url, snippet });
  }

  return sources;
}

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
  } catch (error) {
    return errorResponse(error);
  }
  let body: unknown = null;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "请求格式错误，无法解析提交的数据。" },
      { status: 400 },
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] ? String(issue.path[0]) : "body";
      fieldErrors[key] = fieldErrors[key] ?? [];
      fieldErrors[key].push(issue.message);
    }

    return NextResponse.json(
      { success: false, message: "请求参数校验失败，请检查输入内容。", fieldErrors },
      { status: 400 },
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, message: "未登录或登录已失效，请先登录。" },
      { status: 401 },
    );
  }
  await assertAiQuotaAvailable(user);

  const providersFromEnv = getAiProvidersFromEnv();
  const aiModelConfig = await getAiModelConfig();
  const target = aiModelConfig.outlineGenerate;

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
        message: `AI 未配置：当前“生成大纲”配置使用 ${target.providerId}，但未检测到 ${envKey}。请在 web/.env 或 web/.env.local 中配置后重启，或到后台“AI 模型配置”切换线路。`,
      },
      { status: 500 },
    );
  }

  const isAdmin = isAdminUser(user);
  const uiConfig = await getCreateUiConfig();
  const genreMeta = uiConfig.genres.find((item) => item.id === parsed.data.genre);
  if (!genreMeta) {
    return NextResponse.json(
      { success: false, message: "小说类型无效，请刷新页面后重试。" },
      { status: 400 },
    );
  }

  const genreLabel =
    genreMeta.id === "custom" && parsed.data.customGenreLabel?.trim()
      ? parsed.data.customGenreLabel.trim()
      : genreMeta.name;
  const customDetails = parsed.data.customDetails?.trim();

  const effectiveIdea = parsed.data.idea?.trim() || "";
  if (!effectiveIdea) {
    return NextResponse.json(
      { success: false, message: "请先填写创意描述，再生成大纲。" },
      { status: 400 },
    );
  }

  const effectiveTags = (parsed.data.tags?.length ? parsed.data.tags : genreMeta.tags)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);

  const platformId = parsed.data.platform?.trim();
  const platformMeta = platformId ? uiConfig.platforms.find((item) => item.id === platformId) : null;
  const platformText = platformMeta
    ? `${platformMeta.label}${platformMeta.promptHint ? `（${platformMeta.promptHint}）` : ""}`
    : platformId;

  const dnaBookTitleRaw = parsed.data.dnaBookTitle?.trim();
  const dnaBookTitle = isAdmin && dnaBookTitleRaw ? dnaBookTitleRaw : null;

  const dnaIdRaw = parsed.data.dna?.trim();
  const dnaId = isAdmin && !dnaBookTitle ? dnaIdRaw : null;
  const dnaMeta = dnaId ? uiConfig.dnaStyles.find((item) => item.id === dnaId) : null;
  const dnaText = dnaBookTitle
    ? `参考书名：${dnaBookTitle}（只抽象写法与结构，不复刻原作剧情）`
    : dnaMeta
      ? `${dnaMeta.label}${dnaMeta.promptHint ? `（${dnaMeta.promptHint}）` : ""}`
      : null;

  const wordsId = parsed.data.words?.trim();
  const wordsMeta = wordsId ? uiConfig.wordOptions.find((item) => item.id === wordsId) : null;
  const wordsText = wordsMeta ? wordsMeta.label : wordsId;

  const webSources = dnaBookTitle && isAdmin ? await researchBookFromWeb(dnaBookTitle) : [];
  const variationSeed = buildOutlineVariationSeed({
    genreLabel,
    tags: effectiveTags,
    idea: effectiveIdea,
  });

  const systemPrompt = [
    buildOutlineSystemPrompt(),
    "",
    "重要约束：只生成全书宏观卷纲和首个可写窗口，不要一次性展开长期目标的全部章节。",
    "首个详细窗口默认控制在 20-40 章内，单次详细规划绝对不能超过 60 章；后续章节只保留宏观卷方向。",
  ].join("\n");
  const userPrompt = buildOutlineUserPrompt({
    genreLabel,
    tags: effectiveTags.length ? effectiveTags : undefined,
    platform: platformText,
    dna: dnaText ?? undefined,
    words: wordsText,
    idea:
      genreMeta.id === "custom" && customDetails
        ? `${effectiveIdea}\n\n【自定义补充设定】\n${customDetails}`
        : effectiveIdea,
    variationSeed,
    webSources,
  });

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> =
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

  const first = await callAiText({
    providers,
    messages,
    temperature: 0.86,
    maxTokens: 4200,
    attempts: 1,
    preferredProviderId: target.providerId,
  });

  await logAiUsage({ userId: user.id, action: "outline_generate", result: first });

  if (!first.ok || !first.text) {
    return NextResponse.json(
      {
        success: false,
        message: getReadableAiErrorMessage(first, aiZhCN.outline.generateFailed),
      },
      { status: 502 },
    );
  }

  let content = first.text;
  let storyRaw = extractJson(content);

  if (!storyRaw) {
    const second = await callAiText({
      providers,
      preferredProviderId: first.providerId,
      messages: [
        ...messages,
        { role: "assistant", content },
        {
          role: "user",
          content:
            "上一次输出不是合法 JSON。请严格只输出 JSON 对象，且必须符合 schema，不能包含任何多余文字。",
        },
      ],
      temperature: 0.5,
      maxTokens: 4200,
      attempts: 1,
    });

    await logAiUsage({
      userId: user.id,
      action: "outline_generate_retry",
      result: second,
    });

    if (second.ok && second.text) {
      content = second.text;
      storyRaw = extractJson(second.text);
    }
  }

  const validated = storyOutlineSchema.safeParse(storyRaw);
  if (!validated.success) {
    return NextResponse.json(
      { success: false, message: "大纲解析失败，请点击“重新生成”重试。" },
      { status: 502 },
    );
  }

  const planningConfig = await getPlanningConfig();
  const progressive = normalizeProgressiveOutline(normalizeStoryOutline(validated.data), {
    config: planningConfig,
    preset: "smart",
  });

  return NextResponse.json({
    success: true,
    message: aiZhCN.outline.success,
    data: { story: progressive.outline },
  });
}

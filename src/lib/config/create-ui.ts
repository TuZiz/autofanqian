import "server-only";

import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const CREATE_UI_CONFIG_KEY = "create_ui_v1";

const TOMATO_PROMPT_HINT_V1 =
  "开篇强钩子、冲突密度高，短期目标明确，爽点快速兑现。";

// Refined, implementation-friendly “Tomato style” summary (no hard numbers).
const TOMATO_PROMPT_HINT_RECOMMENDED =
  "情绪优先、开篇就抛冲突；第一章完成“危机-绝境-转机”闭环；每章结尾留钩子；三章一个小爽点、十章一个大高潮；短句短段、对话推进；场景集中，便于短剧化。";

const genreSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(80),
  tags: z.array(z.string().min(1).max(24)).max(12),
  icon: z.string().min(1).max(8),
  gradient: z.string().min(1).max(64),
  sortOrder: z.number().int().min(0).max(1000).default(0),
  active: z.boolean().default(true),
});

const optionSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(120),
  promptHint: z.string().max(800).optional(),
  sortOrder: z.number().int().min(0).max(1000).default(0),
  active: z.boolean().default(true),
});

const createUiConfigSchema = z.object({
  version: z.literal(1),
  genres: z.array(genreSchema).min(1),
  platforms: z.array(optionSchema),
  dnaStyles: z.array(optionSchema),
  wordOptions: z.array(optionSchema),
});

export type CreateUiConfig = z.infer<typeof createUiConfigSchema>;

export function getDefaultCreateUiConfig(): CreateUiConfig {
  return {
    version: 1,
    genres: [
      {
        id: "custom",
        name: "自定义",
        tags: ["自由题材", "混合设定", "原创类型"],
        icon: "✍️",
        gradient: "from-emerald-500 to-teal-500",
        sortOrder: 5,
        active: true,
      },
      {
        id: "fantasy",
        name: "玄幻修仙",
        tags: ["系统", "重生", "废材逆袭"],
        icon: "⚡",
        gradient: "from-slate-700 to-emerald-600",
        sortOrder: 10,
        active: true,
      },
      {
        id: "urban",
        name: "都市爽文",
        tags: ["赘婿", "神医", "兵王"],
        icon: "🏙️",
        gradient: "from-teal-500 to-emerald-600",
        sortOrder: 20,
        active: true,
      },
      {
        id: "scifi",
        name: "科幻未来",
        tags: ["星际", "机甲", "末日"],
        icon: "🛸",
        gradient: "from-stone-500 to-slate-700",
        sortOrder: 30,
        active: true,
      },
      {
        id: "history",
        name: "历史架空",
        tags: ["穿越", "争霸", "谋士"],
        icon: "📜",
        gradient: "from-amber-500 to-orange-500",
        sortOrder: 40,
        active: true,
      },
      {
        id: "xianxia",
        name: "仙侠世界",
        tags: ["剑修", "丹修", "宗门"],
        icon: "⚔️",
        gradient: "from-emerald-500 to-teal-500",
        sortOrder: 50,
        active: true,
      },
      {
        id: "game",
        name: "游戏竞技",
        tags: ["电竞", "游戏世界", "职业"],
        icon: "🎮",
        gradient: "from-rose-500 to-red-500",
        sortOrder: 60,
        active: true,
      },
    ],
    platforms: [
      {
        id: "qidian",
        label: "起点中文网",
        promptHint: "偏长线升级与宏大世界观，节奏递进清晰，爽点集中但逻辑自洽。",
        sortOrder: 10,
        active: true,
      },
      {
        id: "tomato",
        label: "番茄小说",
        promptHint: TOMATO_PROMPT_HINT_RECOMMENDED,
        sortOrder: 20,
        active: true,
      },
      {
        id: "fanqie",
        label: "七猫免费小说",
        promptHint: "主线明确、人物动机清楚，情绪带动强，反转频率适中。",
        sortOrder: 30,
        active: true,
      },
    ],
    dnaStyles: [
      {
        id: "style1",
        label: "诡秘之主（克苏鲁 + 蒸汽朋克）",
        promptHint: "神秘学体系、仪式感、克制叙事与层层铺垫，氛围压迫但节奏稳定。",
        sortOrder: 10,
        active: true,
      },
      {
        id: "style2",
        label: "斗破苍穹（传统废柴退婚流）",
        promptHint: "退婚打脸、升级路线清晰，势力层级分明，热血对抗与师徒传承。",
        sortOrder: 20,
        active: true,
      },
      {
        id: "style3",
        label: "大奉打更人（悬疑探案 + 修仙）",
        promptHint: "探案推进主线，线索闭环，笑点与悬念并存，修行体系服务案件升级。",
        sortOrder: 30,
        active: true,
      },
      {
        id: "style4",
        label: "凡人修仙传（凡人流 + 资源经营）",
        promptHint: "修行逻辑偏务实，资源与门槛清晰，危机来自规则与人心，升级靠积累与选择。",
        sortOrder: 40,
        active: true,
      },
      {
        id: "style5",
        label: "庆余年（权谋反转 + 轻喜）",
        promptHint: "权谋博弈、多线反转，笑点与紧张交替，信息差推动剧情，角色动机强。",
        sortOrder: 50,
        active: true,
      },
      {
        id: "style6",
        label: "雪中悍刀行（江湖群像 + 意境刀光）",
        promptHint: "群像推进，江湖规矩与家国权谋并行，战斗强调人物立场与意境表达。",
        sortOrder: 60,
        active: true,
      },
      {
        id: "style7",
        label: "全职高手（电竞群像 + 热血逆袭）",
        promptHint: "团队成长线清晰，比赛节奏密，爽点来自逆风翻盘与细节操作，群像鲜明。",
        sortOrder: 70,
        active: true,
      },
    ],
    wordOptions: [
      { id: "100w", label: "100 万字（中篇）", sortOrder: 10, active: true },
      { id: "300w", label: "300 万字（长篇）", sortOrder: 20, active: true },
      { id: "500w", label: "500 万字以上（超长篇）", sortOrder: 30, active: true },
    ],
  };
}

export async function getCreateUiConfig() {
  const existing = await prisma.appConfig.findUnique({
    where: { key: CREATE_UI_CONFIG_KEY },
    select: { value: true },
  });

  if (!existing) {
    const seeded = getDefaultCreateUiConfig();
    await prisma.appConfig.create({
      data: {
        key: CREATE_UI_CONFIG_KEY,
        value: seeded,
      },
    });
    return seeded;
  }

  const parsed = createUiConfigSchema.safeParse(existing.value);
  if (!parsed.success) {
    const fallback = getDefaultCreateUiConfig();
    // Keep the invalid value in DB for manual inspection, but still return a safe fallback.
    return fallback;
  }

  const config = parsed.data;

  config.genres = [...config.genres].sort((a, b) => a.sortOrder - b.sortOrder);
  config.platforms = [...config.platforms].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  config.dnaStyles = [...config.dnaStyles].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  config.wordOptions = [...config.wordOptions].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  // Gentle config upgrade: only auto-update Tomato promptHint if the user still uses the old default
  // (or left it empty). This avoids overwriting manual customizations.
  let changed = false;
  const tomato = config.platforms.find((item) => item.id === "tomato");
  if (tomato) {
    const current = tomato.promptHint?.trim() ?? "";
    if (!current || current === TOMATO_PROMPT_HINT_V1) {
      tomato.promptHint = TOMATO_PROMPT_HINT_RECOMMENDED;
      changed = true;
    }
  }

  // Seed the standalone custom entry without restoring any genre the admin removed.
  const recommendedCustomGenre = getDefaultCreateUiConfig().genres.find(
    (item) => item.id === "custom",
  );
  if (
    recommendedCustomGenre &&
    !config.genres.some((item) => item.id === recommendedCustomGenre.id)
  ) {
    config.genres.push(recommendedCustomGenre);
    changed = true;
  }

  // Seed more DNA style examples if the DB config is missing newly added defaults.
  const recommendedDnaStyles = getDefaultCreateUiConfig().dnaStyles;
  for (const recommended of recommendedDnaStyles) {
    if (!config.dnaStyles.some((item) => item.id === recommended.id)) {
      config.dnaStyles.push(recommended);
      changed = true;
    }
  }

  if (changed) {
    config.genres = [...config.genres].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    config.dnaStyles = [...config.dnaStyles].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
  }

  if (changed) {
    try {
      await prisma.appConfig.update({
        where: { key: CREATE_UI_CONFIG_KEY },
        data: { value: config },
        select: { key: true },
      });
    } catch {
      // Non-fatal: still return the in-memory upgraded config.
    }
  }

  return config;
}

export async function getCreateUiConfigPublic() {
  const config = await getCreateUiConfig();

  return {
    ...config,
    genres: config.genres.filter((item) => item.active),
    platforms: config.platforms.filter((item) => item.active),
    dnaStyles: config.dnaStyles.filter((item) => item.active),
    wordOptions: config.wordOptions.filter((item) => item.active),
  };
}

export async function updateCreateUiConfig(nextConfig: unknown) {
  const parsed = createUiConfigSchema.parse(nextConfig);

  await prisma.appConfig.upsert({
    where: { key: CREATE_UI_CONFIG_KEY },
    create: { key: CREATE_UI_CONFIG_KEY, value: parsed },
    update: { value: parsed },
  });

  return parsed;
}

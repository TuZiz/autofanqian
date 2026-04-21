import "server-only";

import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const CREATE_UI_CONFIG_KEY = "create_ui_v1";

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
        id: "fantasy",
        name: "玄幻修仙",
        tags: ["系统", "重生", "废材逆袭"],
        icon: "⚡",
        gradient: "from-blue-500 to-indigo-500",
        sortOrder: 10,
        active: true,
      },
      {
        id: "urban",
        name: "都市爽文",
        tags: ["赘婿", "神医", "兵王"],
        icon: "🏙️",
        gradient: "from-cyan-500 to-blue-500",
        sortOrder: 20,
        active: true,
      },
      {
        id: "scifi",
        name: "科幻未来",
        tags: ["星际", "机甲", "末日"],
        icon: "🛸",
        gradient: "from-purple-500 to-pink-500",
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
        promptHint: "开篇强钩子、冲突密度高，短期目标明确，爽点快速兑现。",
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

import "server-only";

import { prisma } from "@/lib/prisma";

function sanitizeTemplateContent(text: string) {
  let value = text.trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("“") && value.endsWith("”"))
  ) {
    value = value.slice(1, -1).trim();
  }

  value = value.replace(/^["“”'‘’]+/, "").replace(/["“”'‘’]+$/, "").trim();

  value = value
    .replace(/\\\\r\\\\n/g, "\n")
    .replace(/\\\\n/g, "\n")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  value = value.replace(
    /(标签|核心设定|设定|世界规则|主角目标|阻力|爽点|开篇钩子|断章钩子|钩子)\s*[:：]\s*/g,
    "",
  );

  value = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");

  value = value.replace(/\s+/g, " ").trim();

  return value || text;
}

const seedTemplates: Record<string, string[]> = {
  fantasy: [
    "【经典废材流】主角本是家族天才，突遭变故修为全失，被未婚妻退婚。偶得神秘戒指，内藏远古大能灵魂，从此开启逆袭之路……",
    "【系统签到流】穿越玄幻世界，成为魔教扫地杂役。开启签到系统，在镇魔塔签到获得《吞天魔功》，苟在后山十年，出山即无敌。",
  ],
  urban: [
    "【神豪系统】普通大学生被相恋多年的女友嫌弃没钱分手，意外绑定无限神豪系统，每呼吸一次都能入账 100 元，从此开启打脸人生。",
  ],
  scifi: [
    "【赛博修仙】未来社会里，人类通过芯片强化灵根。主角意外得到失控中的古老修真源代码，成为唯一能用飞剑入侵超级系统的人。",
  ],
  history: [
    "【乱世谋臣】现代历史系学生穿越乱世小国，从军粮账房做起，在权谋与战火之间一步步搅动天下格局。",
  ],
  xianxia: [
    "【宗门群像】主角被迫进入没落宗门，在师门重建、秘境历练与飞升之谜中成长，逐步找回属于自己的大道。",
  ],
  game: [
    "【电竞重生】天才职业选手因事故退役，重回青训时期后决定重写自己的职业生涯，并带领一支濒临解散的战队冲击世界赛。",
  ],
};

async function ensureSeedTemplates(genreId: string) {
  const existingCount = await prisma.createTemplate.count({
    where: {
      genreId,
      isActive: true,
    },
  });

  if (existingCount > 0) {
    return;
  }

  const seeds = seedTemplates[genreId] ?? [];
  if (!seeds.length) return;

  await prisma.createTemplate.createMany({
    data: seeds.map((content, index) => ({
      genreId,
      title: `Seed ${index + 1}`,
      content,
      source: "seed",
      usageCount: 0,
      isActive: true,
    })),
  });
}

export async function listHotTemplates(params: {
  genreId: string;
  take?: number;
}) {
  const take = Math.max(1, Math.min(20, params.take ?? 10));
  await ensureSeedTemplates(params.genreId);

  const templates = await prisma.createTemplate.findMany({
    where: {
      genreId: params.genreId,
      isActive: true,
    },
    orderBy: [{ usageCount: "desc" }, { updatedAt: "desc" }],
    take,
    select: {
      id: true,
      content: true,
      usageCount: true,
      source: true,
      updatedAt: true,
    },
  });

  return templates.map((item) => ({
    ...item,
    content: sanitizeTemplateContent(item.content),
  }));
}

export async function listHotTemplatesShowcase(params: {
  genreId: string;
  hotCount?: number;
  randomCount?: number;
}) {
  const hotCount = Math.max(0, Math.min(6, params.hotCount ?? 2));
  const randomCount = Math.max(0, Math.min(6, params.randomCount ?? 2));

  await ensureSeedTemplates(params.genreId);

  const select = {
    id: true,
    content: true,
    usageCount: true,
    source: true,
    updatedAt: true,
  } as const;

  const hotTemplates = hotCount
    ? await prisma.createTemplate.findMany({
        where: {
          genreId: params.genreId,
          isActive: true,
        },
        orderBy: [{ usageCount: "desc" }, { updatedAt: "desc" }],
        take: hotCount,
        select,
      })
    : [];

  const selected = [...hotTemplates];
  const selectedIds = new Set(selected.map((item) => item.id));

  let remainingCount = randomCount
    ? await prisma.createTemplate.count({
        where: {
          genreId: params.genreId,
          isActive: true,
          id: { notIn: Array.from(selectedIds) },
        },
      })
    : 0;

  for (let index = 0; index < randomCount && remainingCount > 0; index++) {
    const skip = Math.floor(Math.random() * remainingCount);

    const templates = await prisma.createTemplate.findMany({
      where: {
        genreId: params.genreId,
        isActive: true,
        id: { notIn: Array.from(selectedIds) },
      },
      orderBy: { id: "asc" },
      skip,
      take: 1,
      select,
    });

    const template = templates[0];
    if (!template) {
      break;
    }

    selected.push(template);
    selectedIds.add(template.id);
    remainingCount -= 1;
  }

  return selected.map((item) => ({
    ...item,
    content: sanitizeTemplateContent(item.content),
  }));
}

export async function recordTemplateUsage(params: {
  templateId: string;
  userId?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const template = await tx.createTemplate.update({
      where: { id: params.templateId },
      data: {
        usageCount: { increment: 1 },
      },
      select: {
        id: true,
        genreId: true,
        usageCount: true,
      },
    });

    await tx.createTemplateUsage.create({
      data: {
        templateId: params.templateId,
        userId: params.userId ?? null,
      },
      select: { id: true },
    });

    return template;
  });
}

import "server-only";

import { prisma } from "@/lib/prisma";

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

  return prisma.createTemplate.findMany({
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


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

const SEED_TEMPLATE_VERSION = "seed-v2";

const seedTemplates: Record<string, string[]> = {
  fantasy: [
    "【债修宗门】没落少宗主继承的不是洞天福地，而是三百张宗门欠条。这个世界的灵气由信用流通，欠债越多越能借天地之力，但每次突破都会引来债主宗门追杀。主角带着一群不靠谱弟子，一边开灵田、修债契、抢回失落账册，一边把讨债现场变成公开打脸大会。前期钩子是宗门即将被拍卖，主角必须在七天内用一场假破产反吞并三大债主。",
    "【天命售后】主角是仙盟最低级的命格修补师，专门给失败天才处理退婚、废脉、走火入魔等售后事故。他发现所谓天命之子都是被上界批量投放的剧情商品，而自己的工单系统可以回收废弃主角光环。每修好一个崩坏命格，他就能临时借用对方的一项能力。开篇他接到一单必死任务：修复一个已经黑化并屠城的前任天命之子。",
    "【禁术档案馆】宗门藏经阁最底层封着九万卷禁术，每卷都会污染读者记忆。主角天生没有灵根，却能把污染记忆整理成可用注释。他靠给长老翻译禁术换资源，逐步发现宗门飞升失败的真相：所有功法都在喂养同一座天外道标。开篇钩子是师姐修炼禁术后忘了自己是谁，只记得三天后要亲手杀掉主角。",
  ],
  urban: [
    "【退伍兵王开小店】退伍五年的兵王萧烈只想守着恩人的小超市当保安，却天天被商圈纨绔上门找事。他无意中救下被夺权的上市集团总裁，对方当场开年薪千万挖他，之前嘲讽他的邻居全都傻眼。主线不是单纯装富，而是萧烈用战场上的情报、人脉和狠准判断，帮恩人夺回旧案真相，同时把小超市做成地下情报枢纽。",
    "【神医欠条】实习医生林照被医院背锅开除，父亲手术费也被人卡住。绝境时他继承外公留下的旧诊所，发现每治好一个疑难病人，就能获得一张写着对方未来人情的欠条。病人从外卖骑手到隐退大佬都有，主角靠治病收人情，在医闹、豪门夺产和黑诊所围堵中翻盘。开篇冲突是他必须在一小时内救活被医院宣布放弃的病人。",
    "【社畜鉴宝】普通运营被老板当众羞辱裁员，意外觉醒“物品履历”能力，摸到任何旧物都能看见它经历过的关键事件。他从跳蚤市场捡漏起步，却发现一批赝品背后牵出父亲当年破产的骗局。爽点是每次鉴宝都能当场反杀质疑者，主线是用一件件旧物拼出商业犯罪链，最后把资本大佬送上审判席。",
  ],
  scifi: [
    "【失控灵根代码】未来社会用芯片强化灵根，修士等级由企业算法评定。底层维修工沈砚捡到一段失控的古老修真源代码，发现它能让飞剑像病毒一样入侵城市系统。企业追杀他，地下修士想利用他，官方把他列为网络邪修。开篇他为了救妹妹黑入医院生命舱，却意外让整座城的修炼排行榜归零。",
    "【星舰坟场拾荒者】银河边境的废弃星舰坟场每晚都会广播死者遗言，拾荒少年靠拆零件养活妹妹。一次事故中，他唤醒一艘旧旗舰的残缺舰灵，得到能读取战场因果的导航图。各大财团以为他找到古文明跃迁核心，开始围猎。故事主线是主角从拾荒者变成舰队指挥官，靠破烂船队打穿封锁线。",
    "【末日天气公司】末日后，天气被七家巨企承包，穷人只能购买廉价阳光和二手雨水。主角是被开除的云层调度员，发现父亲死亡并非事故，而是因为他掌握了免费恢复自然气候的算法。开篇城市连续三十天高温，主角偷开一场违规暴雨救下贫民区，却让自己成为所有天气公司的通缉目标。",
  ],
  history: [
    "【账房谋国】现代审计师穿越成边军账房，开局发现军粮账册被主帅和豪族一起做空，三日后全营断粮必败。他没有武力，只能用账本、税契和谣言拆掉豪族粮仓联盟。第一卷主线是从保住一支残军开始，靠财政改革、盐铁暗线和战场信息差，把一个濒死小城变成乱世棋眼。",
    "【替身世子】主角穿成侯府替身世子，真世子在敌国做人质，自己只是用来稳住朝局的假货。朝堂、侯府、敌国密探都想利用他，他却发现真世子早已投敌。开篇皇帝突然赐婚公主，要他三日内入宫受封；主角必须一边扮演完美世子，一边查清侯府为何宁愿扶假也不接真。",
    "【女帝的假钦差】小吏误拿女帝密旨，被各地官员当成巡查钦差供起来。他本想逃命，却发现沿途百姓被税吏逼到卖子，索性借假身份查案。每破一案，他离真相越近，也越可能被朝廷问斩。主线是从县城赈灾案一路查到京城军费黑洞，最后让假钦差成为女帝最锋利的刀。",
  ],
  xianxia: [
    "【破宗收徒】主角接手只剩三个人的破宗门，山门漏雨、灵脉枯竭、仇家还堵在门口要地契。他觉醒宗门经营面板，但奖励只给弟子不给宗主。于是他必须把废柴弟子教成怪物：怕血剑修、社恐丹师、只会种田的阵法天才。爽点是弟子每次出山都被低估，回宗后反哺宗门一步步重建仙门。",
    "【凡人渡劫铺】仙城里有一家替人准备渡劫方案的小铺，老板主角是不能修炼的凡人，却能看见每个人天劫的失败原因。他靠卖避雷阵、心魔剧本和遗书模板赚钱，直到某天看见自己的天劫倒计时只有七日。主线是他帮各路修士渡劫攒因果，同时追查为什么一个凡人会被天道判定必须渡劫。",
    "【剑冢管理员】主角是剑冢看门人，职责是每天安抚那些死去剑仙留下的疯剑。他发现每把剑都记得主人临死前的遗憾，完成遗憾就能借剑一招。开篇魔修攻山，所有长老闭关不出，主角只能带着一把话痨断剑守山门。后续从替剑仙还愿开始，揭开当年正魔大战被篡改的真相。",
  ],
  game: [
    "【退役指挥重回青训】前世界冠军指挥因伤退役，被俱乐部当作过气招牌消费。醒来后他回到青训试训当天，发现未来会解散的草台班子此刻还没人看好。他不再追求个人高光，而是用十年版本理解训练队友，把替补射手、暴躁上单和怯场辅助磨成冠军阵容。开篇是他必须在一场试训赛里用冷门体系打服教练。",
    "【游戏降临补丁师】全民被卷入真实游戏世界，别人刷怪升级，主角却觉醒了“补丁师”职业，只能修复地图 bug。没人看得起他，直到他修好第一个副本漏洞后，隐藏 boss 直接认他为管理员。主线是主角用修 bug 的方式改写副本机制，带队在规则漏洞和玩家公会围剿中抢占版本答案。",
    "【主播战队】过气游戏主播为了还债，接手一支被联盟挂牌出售的垫底战队。队员有人气没纪律、有天赋没心态、有操作没脑子。主角靠直播训练、数据复盘和反套路 BP，把每场比赛都做成公开打脸现场。开篇他们被安排和冠军队打表演赛，所有人等着看笑话，主角却准备了一套没人敢选的偷家阵容。",
  ],
};

async function ensureSeedTemplates(genreId: string) {
  const seeds = seedTemplates[genreId] ?? [];
  if (!seeds.length) return;

  await prisma.createTemplate.updateMany({
    where: {
      genreId,
      source: "seed",
      isActive: true,
      title: { not: { startsWith: SEED_TEMPLATE_VERSION } },
    },
    data: { isActive: false },
  });

  const existingCount = await prisma.createTemplate.count({
    where: {
      genreId,
      source: "seed",
      isActive: true,
      title: { startsWith: SEED_TEMPLATE_VERSION },
    },
  });

  if (existingCount > 0) {
    return;
  }

  await prisma.createTemplate.createMany({
    data: seeds.map((content, index) => ({
      genreId,
      title: `${SEED_TEMPLATE_VERSION}-${index + 1}`,
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

export async function listUsedTemplatesShowcase(params: {
  genreId: string;
  take?: number;
}) {
  const take = Math.max(1, Math.min(12, params.take ?? 4));

  await ensureSeedTemplates(params.genreId);

  const usageTemplates = await prisma.createTemplateUsage.findMany({
    where: {
      template: {
        genreId: params.genreId,
        isActive: true,
      },
    },
    orderBy: { createdAt: "desc" },
    take: take * 4,
    select: {
      template: {
        select: {
          id: true,
          content: true,
          usageCount: true,
          source: true,
          updatedAt: true,
        },
      },
    },
  });

  const uniqueTemplates = Array.from(
    new Map(
      usageTemplates.map((item) => [
        item.template.id,
        {
          ...item.template,
          content: sanitizeTemplateContent(item.template.content),
        },
      ]),
    ).values(),
  );

  const selected = uniqueTemplates.slice(0, take);
  const selectedIds = new Set(selected.map((item) => item.id));
  const remaining = Math.max(0, take - selected.length);

  if (!remaining) {
    return selected;
  }

  const fallbackTemplates = await listHotTemplatesShowcase({
    genreId: params.genreId,
    hotCount: 0,
    randomCount: remaining + 2,
  });

  for (const template of fallbackTemplates) {
    if (selectedIds.has(template.id)) {
      continue;
    }

    selected.push(template);
    selectedIds.add(template.id);

    if (selected.length >= take) {
      break;
    }
  }

  return selected;
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

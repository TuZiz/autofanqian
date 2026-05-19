export type PublicMembershipTier = "default" | "plus" | "pro" | "max";

export type PublicMembershipPlan = {
  tier: PublicMembershipTier;
  name: string;
  subtitle: string;
  badge?: string;
  accent: "gray" | "blue" | "purple" | "amber";
  price: string;
  priceSubtext: string;
  dailyGeneratedChars: number | -1;
  monthlyGeneratedChars: number | -1;
  maxWorks: number | -1;
  maxChaptersPerWork: number | -1;
  priority: string;
  features: string[];
  highlights: string[];
};

export const PUBLIC_MEMBERSHIP_PLANS: PublicMembershipPlan[] = [
  {
    tier: "default",
    name: "免费版",
    subtitle: "体验 AI 小说创作",
    accent: "gray",
    price: "免费",
    priceSubtext: "永久免费使用",
    dailyGeneratedChars: 5000,
    monthlyGeneratedChars: 50000,
    maxWorks: 1,
    maxChaptersPerWork: 20,
    priority: "普通队列",
    features: [
      "每日 5000 字生成额度",
      "最多创建 1 本小说",
      "每日 3 次大纲生成",
      "基础章节生成",
    ],
    highlights: ["适合体验", "免费使用"],
  },
  {
    tier: "plus",
    name: "基础版",
    subtitle: "轻度创作者首选",
    accent: "blue",
    price: "¥5",
    priceSubtext: "基础会员 1 天体验",
    dailyGeneratedChars: 30000,
    monthlyGeneratedChars: 1000000,
    maxWorks: 20,
    maxChaptersPerWork: 200,
    priority: "标准队列",
    features: [
      "每日 30000 字生成额度",
      "最多创建 20 本小说",
      "无限大纲生成",
      "每日 10 次作品导入",
      "批量生成章节（最多 5 章）",
      "智能导入功能",
    ],
    highlights: ["轻度写作", "性价比体验"],
  },
  {
    tier: "pro",
    name: "专业版",
    subtitle: "主力创作者推荐",
    badge: "推荐",
    accent: "purple",
    price: "¥49",
    priceSubtext: "专业会员月套餐",
    dailyGeneratedChars: 120000,
    monthlyGeneratedChars: 5000000,
    maxWorks: 100,
    maxChaptersPerWork: 1000,
    priority: "优先队列",
    features: [
      "每日 120000 字生成额度",
      "最多创建 100 本小说",
      "批量生成章节（最多 20 章）",
      "批量生成大纲",
      "伏笔扫描功能",
      "智能导入功能",
      "大纲对比功能",
      "优先队列",
    ],
    highlights: ["推荐", "高强度连载", "功能完整"],
  },
  {
    tier: "max",
    name: "无限版",
    subtitle: "重度作者与工作室",
    badge: "最强",
    accent: "amber",
    price: "联系购买",
    priceSubtext: "适合团队和高频生成",
    dailyGeneratedChars: -1,
    monthlyGeneratedChars: -1,
    maxWorks: -1,
    maxChaptersPerWork: -1,
    priority: "最高优先队列",
    features: [
      "无限字数生成",
      "无限小说数量",
      "批量生成章节（最多 20 章）",
      "批量生成大纲",
      "伏笔扫描功能",
      "智能导入功能",
      "质量自检功能",
      "最高优先队列",
    ],
    highlights: ["无限额度", "工作室级别", "最高优先级"],
  },
];

export const PUBLIC_MEMBERSHIP_PLAN_MAP = Object.fromEntries(
  PUBLIC_MEMBERSHIP_PLANS.map((plan) => [plan.tier, plan]),
) as Record<PublicMembershipTier, PublicMembershipPlan>;

export function getPublicMembershipPlan(
  tier?: PublicMembershipTier | string | null,
) {
  if (!tier) return PUBLIC_MEMBERSHIP_PLAN_MAP.default;

  return (
    PUBLIC_MEMBERSHIP_PLAN_MAP[tier as PublicMembershipTier] ??
    PUBLIC_MEMBERSHIP_PLAN_MAP.default
  );
}

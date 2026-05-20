export type PurchasablePlanId = "plus_day" | "plus_month" | "pro_month";

export type PurchasablePlan = {
  id: PurchasablePlanId;
  tier: "plus" | "pro";
  durationDays: number;
  amountCents: number;
  subject: string;
};

export const PAYMENT_PLANS = {
  plus_day: {
    id: "plus_day",
    tier: "plus",
    durationDays: 1,
    amountCents: 500,
    subject: "基础会员 1 天体验",
  },
  plus_month: {
    id: "plus_month",
    tier: "plus",
    durationDays: 30,
    amountCents: 1900,
    subject: "基础会员月套餐",
  },
  pro_month: {
    id: "pro_month",
    tier: "pro",
    durationDays: 30,
    amountCents: 4900,
    subject: "专业会员月套餐",
  },
} as const satisfies Record<PurchasablePlanId, PurchasablePlan>;

export const purchasablePlanIds = Object.keys(PAYMENT_PLANS) as PurchasablePlanId[];

export function getPaymentPlan(planId: string): PurchasablePlan | null {
  if (!purchasablePlanIds.includes(planId as PurchasablePlanId)) {
    return null;
  }

  return PAYMENT_PLANS[planId as PurchasablePlanId];
}

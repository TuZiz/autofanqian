"use client";

import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Check,
  Crown,
  Flame,
  Infinity,
  Layers,
  Rocket,
  Sparkles,
  WandSparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/client/auth-api";
import { cn } from "@/lib/utils";
import {
  getPublicMembershipPlan,
  PUBLIC_MEMBERSHIP_PLANS,
  type PublicMembershipPlan,
  type PublicMembershipTier,
} from "@/shared/membership-public-plans";

type DashboardUpgradeModalProps = {
  isOpen: boolean;
  currentTier?: "default" | "plus" | "pro" | "max";
  isAdmin?: boolean;
  onClose: () => void;
};

const tierRank: Record<PublicMembershipTier, number> = {
  default: 0,
  plus: 1,
  pro: 2,
  max: 3,
};

const planIcons: Record<PublicMembershipTier, LucideIcon> = {
  default: Crown,
  plus: Sparkles,
  pro: Rocket,
  max: Flame,
};

const accentStyles: Record<PublicMembershipPlan["accent"], {
  shell: string;
  icon: string;
  pill: string;
  price: string;
}> = {
  gray: {
    shell: "bg-[var(--theme-border)]",
    icon: "bg-[var(--theme-surface-overlay)] text-[var(--theme-text-secondary)]",
    pill: "border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] text-[var(--theme-text-secondary)]",
    price: "text-[var(--theme-text-strong)]",
  },
  blue: {
    shell: "bg-gradient-to-br from-[#60a5fa]/80 via-[#2f80ed]/70 to-[#1f6ed4]",
    icon: "bg-[var(--theme-info-soft)] text-[var(--theme-info-text)]",
    pill: "border-[var(--theme-info-border)] bg-[var(--theme-info-soft)] text-[var(--theme-info-text)]",
    price: "text-[var(--theme-info-text)]",
  },
  purple: {
    shell: "bg-gradient-to-br from-[#38bdf8]/70 via-[#0ea5e9]/75 to-[#0284c7]",
    icon: "bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)]",
    pill: "border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)]",
    price: "text-[var(--theme-brand-text)]",
  },
  amber: {
    shell: "bg-gradient-to-br from-amber-300/90 via-orange-400/80 to-amber-600/90",
    icon: "bg-[var(--theme-warning-soft)] text-[var(--theme-warning-text)]",
    pill: "border-[var(--theme-warning-border)] bg-[var(--theme-warning-soft)] text-[var(--theme-warning-text)]",
    price: "text-[var(--theme-warning-text)]",
  },
};

const simulatedUsage = {
  todayUsedChars: 2400,
  monthUsedChars: 18000,
  workCount: 1,
};

type AlipayStatus = {
  enabled: boolean;
  configured: boolean;
};

type UpgradePaymentOption = {
  label: string;
  planId: "plus_day" | "plus_month" | "pro_month";
};

const paymentOptionsByTier: Partial<Record<PublicMembershipTier, UpgradePaymentOption[]>> = {
  plus: [
    { label: "1 天体验 ¥5", planId: "plus_day" },
    { label: "月套餐 ¥19", planId: "plus_month" },
  ],
  pro: [
    { label: "专业月卡 ¥49", planId: "pro_month" },
  ],
};

const matrixRows = [
  {
    label: "每日生成字数",
    getValue: (plan: PublicMembershipPlan) => formatChars(plan.dailyGeneratedChars),
  },
  {
    label: "本月生成字数",
    getValue: (plan: PublicMembershipPlan) => formatChars(plan.monthlyGeneratedChars),
  },
  {
    label: "最大小说数",
    getValue: (plan: PublicMembershipPlan) => formatCount(plan.maxWorks, "本"),
  },
  {
    label: "单本章节数",
    getValue: (plan: PublicMembershipPlan) => formatCount(plan.maxChaptersPerWork, "章"),
  },
  {
    label: "批量生成章节",
    getValue: (plan: PublicMembershipPlan) => {
      if (plan.tier === "plus") return "最多 5 章";
      if (plan.tier === "pro" || plan.tier === "max") return "最多 20 章";
      return "—";
    },
  },
  {
    label: "批量生成大纲",
    getValue: (plan: PublicMembershipPlan) => plan.tier === "pro" || plan.tier === "max",
  },
  {
    label: "伏笔扫描",
    getValue: (plan: PublicMembershipPlan) => plan.tier === "pro" || plan.tier === "max",
  },
  {
    label: "智能导入",
    getValue: (plan: PublicMembershipPlan) => plan.tier !== "default",
  },
  {
    label: "质量自检",
    getValue: (plan: PublicMembershipPlan) => plan.tier === "max",
  },
  {
    label: "队列优先级",
    getValue: (plan: PublicMembershipPlan) => plan.priority,
  },
];

export function DashboardUpgradeModal({
  isOpen,
  currentTier = "default",
  isAdmin = false,
  onClose,
}: DashboardUpgradeModalProps) {
  const [previewTier, setPreviewTier] = useState<PublicMembershipTier | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<AlipayStatus | null>(null);
  const [paymentBusyPlanId, setPaymentBusyPlanId] = useState<string | null>(null);
  const [paymentMessage, setPaymentMessage] = useState("");
  const currentPlan = getPublicMembershipPlan(currentTier);
  const currentRank = tierRank[currentPlan.tier];
  const previewPlan = previewTier ? getPublicMembershipPlan(previewTier) : null;

  const quotaCards = useMemo(() => [
    {
      label: "今日生成额度",
      icon: WandSparkles,
      used: simulatedUsage.todayUsedChars,
      limit: currentPlan.dailyGeneratedChars,
      unit: "字",
    },
    {
      label: "本月生成额度",
      icon: Infinity,
      used: simulatedUsage.monthUsedChars,
      limit: currentPlan.monthlyGeneratedChars,
      unit: "字",
    },
    {
      label: "小说数量",
      icon: Layers,
      used: simulatedUsage.workCount,
      limit: currentPlan.maxWorks,
      unit: "本",
    },
  ], [currentPlan]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    async function loadPaymentStatus() {
      const response = await apiRequest<AlipayStatus>(
        "/api/payments/alipay/status",
        undefined,
        { redirectOnUnauthorized: false },
      );
      if (cancelled) return;

      if (response.success && response.data) {
        setPaymentStatus(response.data);
      } else {
        setPaymentStatus({ enabled: false, configured: false });
      }
    }

    void loadPaymentStatus();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  async function handlePlanPreview(plan: PublicMembershipPlan, planId?: UpgradePaymentOption["planId"]) {
    setPreviewTier(plan.tier);

    if (!planId) {
      setPaymentMessage(plan.tier === "max" ? "无限版暂未开放在线支付，请联系管理员购买。" : "当前套餐无需购买。");
      return;
    }

    if (!paymentStatus?.enabled || !paymentStatus.configured) {
      setPaymentMessage("支付功能暂未开启，请联系管理员。");
      return;
    }

    setPaymentBusyPlanId(planId);
    const response = await apiRequest<{ paymentUrl: string }>(
      "/api/payments/alipay/create",
      { planId },
      { method: "POST", redirectOnUnauthorized: true },
    );
    setPaymentBusyPlanId(null);

    if (response.success && response.data?.paymentUrl) {
      window.location.href = response.data.paymentUrl;
      return;
    }

    setPaymentMessage(response.message || "支付功能暂未开启，请联系管理员。");
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-1rem)] overflow-y-auto p-0 sm:max-w-6xl lg:max-w-7xl">
        <div className="relative min-w-0 overflow-hidden rounded-xl bg-[var(--theme-surface-solid)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--theme-brand-soft),transparent_34%)]" />
          <div className="relative space-y-5 p-5 sm:p-6">
            <DialogHeader className="pr-10">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] px-3 py-1 text-[11px] font-bold text-[var(--theme-brand-text)]">
                    <Sparkles className="h-3.5 w-3.5" />
                    AUTOFANQIAN PRO STUDIO
                  </div>
                  <DialogTitle className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                    升级会员
                  </DialogTitle>
                  <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--theme-text-muted)]">
                    解锁更高字数额度、批量生成和高级创作工具，让连载节奏更稳、更快、更可控。
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] p-4 shadow-sm">
                  <div className="text-[11px] font-bold uppercase tracking-widest text-[var(--theme-text-muted)]">
                    当前方案
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-lg font-extrabold text-[var(--theme-text-strong)]">
                    <Crown className="h-4 w-4 text-[var(--theme-brand-600)]" />
                    {currentPlan.name}
                  </div>
                </div>
              </div>
            </DialogHeader>

            {isAdmin ? (
              <div className="rounded-2xl border border-[var(--theme-warning-border)] bg-[var(--theme-warning-soft)] px-4 py-3 text-sm font-semibold text-[var(--theme-warning-text)]">
                管理员账号默认不受会员限制；可在此页面发起测试支付，支付成功不会改变管理员使用限制。
              </div>
            ) : null}

            <section className="grid min-w-0 gap-3 md:grid-cols-3">
              {quotaCards.map((item) => (
                <QuotaPreviewCard key={item.label} {...item} />
              ))}
            </section>

            <section className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {PUBLIC_MEMBERSHIP_PLANS.map((plan) => (
                <PlanCard
                  key={plan.tier}
                  currentRank={currentRank}
                  isAdmin={isAdmin}
                  isCurrent={plan.tier === currentPlan.tier}
                  busyPlanId={paymentBusyPlanId}
                  plan={plan}
                  onPreview={handlePlanPreview}
                />
              ))}
            </section>

            {previewPlan ? (
              <div
                className="rounded-2xl border border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] px-4 py-3 text-sm font-semibold text-[var(--theme-brand-text)]"
                aria-live="polite"
              >
                {paymentMessage || `已选择预览「${previewPlan.name}」。`}
              </div>
            ) : null}

            <section className="min-w-0 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] p-4 shadow-sm">
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-[var(--theme-text-strong)]">权益矩阵</h3>
                  <p className="text-xs font-semibold text-[var(--theme-text-muted)]">
                    横向对比额度、批量能力和高级工具，当前套餐列已高亮。
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full border-separate border-spacing-0 text-left text-sm">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 bg-[var(--theme-surface-strong)] px-3 py-3 text-xs font-extrabold text-[var(--theme-text-muted)]">
                        权益
                      </th>
                      {PUBLIC_MEMBERSHIP_PLANS.map((plan) => (
                        <th
                          key={plan.tier}
                          className={cn(
                            "px-3 py-3 text-xs font-extrabold text-[var(--theme-text-strong)]",
                            plan.tier === currentPlan.tier && "rounded-t-xl bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)]",
                          )}
                        >
                          {plan.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixRows.map((row) => (
                      <tr key={row.label}>
                        <td className="sticky left-0 z-10 border-t border-[var(--theme-border)] bg-[var(--theme-surface-strong)] px-3 py-3 text-xs font-bold text-[var(--theme-text-muted)]">
                          {row.label}
                        </td>
                        {PUBLIC_MEMBERSHIP_PLANS.map((plan) => (
                          <td
                            key={plan.tier}
                            className={cn(
                              "border-t border-[var(--theme-border)] px-3 py-3 font-semibold text-[var(--theme-text-strong)]",
                              plan.tier === currentPlan.tier && "bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)]",
                            )}
                          >
                            {renderMatrixValue(row.getValue(plan))}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function QuotaPreviewCard({
  icon: Icon,
  label,
  limit,
  unit,
  used,
}: {
  icon: LucideIcon;
  label: string;
  limit: number;
  unit: string;
  used: number;
}) {
  const unlimited = limit === -1;
  const percent = unlimited ? 100 : Math.min(100, Math.round((used / limit) * 100));

  return (
    <div className="min-w-0 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-bold text-[var(--theme-text-muted)]">{label}</div>
          <div className="mt-1 text-lg font-extrabold text-[var(--theme-text-strong)]">
            {unlimited ? "不限" : `${formatNumber(used)} / ${formatCount(limit, unit)}`}
          </div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--theme-brand-soft)] text-[var(--theme-brand-600)]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--theme-surface-overlay)]">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            unlimited ? "bg-[var(--theme-brand-600)]" : "bg-[var(--theme-brand-600)]",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-2 text-[11px] font-semibold text-[var(--theme-text-muted)]">
        {unlimited ? "无限额度" : `已使用 ${percent}%`}
      </div>
    </div>
  );
}

function PlanCard({
  busyPlanId,
  currentRank,
  isAdmin,
  isCurrent,
  onPreview,
  plan,
}: {
  busyPlanId: string | null;
  currentRank: number;
  isAdmin: boolean;
  isCurrent: boolean;
  onPreview: (plan: PublicMembershipPlan, planId?: UpgradePaymentOption["planId"]) => void;
  plan: PublicMembershipPlan;
}) {
  const Icon = planIcons[plan.tier];
  const accent = accentStyles[plan.accent];
  const isIncluded = tierRank[plan.tier] < currentRank;
  const disabled = !isAdmin && (isCurrent || isIncluded);
  const buttonLabel = getPlanButtonLabel({ isCurrent, isIncluded, tier: plan.tier });
  const paymentOptions = paymentOptionsByTier[plan.tier] ?? [];

  return (
    <article
      className={cn(
        "group min-w-0 rounded-2xl p-[1px] transition-all duration-200 hover:-translate-y-1 hover:shadow-xl",
        accent.shell,
        isCurrent && "ring-1 ring-[var(--theme-brand-border)]",
      )}
    >
      <div className="flex h-full flex-col rounded-[calc(1rem-1px)] bg-[var(--theme-surface-solid)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", accent.icon)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            {isCurrent ? (
              <span className="rounded-full bg-[var(--theme-brand-soft)] px-2 py-1 text-[10px] font-extrabold text-[var(--theme-brand-text)]">
                当前
              </span>
            ) : null}
            {plan.badge ? (
              <span className={cn("rounded-full border px-2 py-1 text-[10px] font-extrabold", accent.pill)}>
                {plan.badge}
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-lg font-extrabold text-[var(--theme-text-strong)]">{plan.name}</h3>
          <p className="mt-1 text-xs font-semibold text-[var(--theme-text-muted)]">{plan.subtitle}</p>
        </div>

        <div className="mt-4">
          <div className={cn("text-2xl font-black tracking-tight", accent.price)}>{plan.price}</div>
          <div className="mt-1 text-xs font-semibold text-[var(--theme-text-muted)]">{plan.priceSubtext}</div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {plan.highlights.map((highlight) => (
            <span key={highlight} className={cn("rounded-full border px-2 py-1 text-[10px] font-bold", accent.pill)}>
              {highlight}
            </span>
          ))}
        </div>

        <ul className="mt-4 flex flex-1 flex-col gap-2 text-xs font-semibold text-[var(--theme-text-secondary)]">
          {plan.features.map((feature) => (
            <li key={feature} className="flex gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--theme-brand-600)]" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 space-y-2">
          {paymentOptions.length > 0 && !disabled ? (
            paymentOptions.map((option) => (
              <Button
                key={option.planId}
                className="w-full bg-[var(--theme-brand-600)] text-white hover:brightness-105 dark:text-[var(--theme-brand-contrast)]"
                disabled={Boolean(busyPlanId)}
                onClick={() => onPreview(plan, option.planId)}
              >
                {busyPlanId === option.planId ? "跳转支付..." : option.label}
              </Button>
            ))
          ) : (
            <Button
              className={cn(
                "w-full",
                !disabled && "bg-[var(--theme-brand-600)] text-white hover:brightness-105 dark:text-[var(--theme-brand-contrast)]",
              )}
              disabled={disabled}
              onClick={() => onPreview(plan)}
              variant={disabled ? "outline" : "default"}
            >
              {buttonLabel}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

function getPlanButtonLabel({
  isCurrent,
  isIncluded,
  tier,
}: {
  isCurrent: boolean;
  isIncluded: boolean;
  tier: PublicMembershipTier;
}) {
  if (isCurrent) return "当前方案";
  if (isIncluded) return "已包含";
  if (tier === "max") return "联系购买";
  return "预览升级";
}

function renderMatrixValue(value: string | boolean) {
  if (typeof value === "boolean") {
    return value ? (
      <span className="inline-flex items-center gap-1 text-[var(--theme-brand-text)]">
        <Check className="h-4 w-4" />
        支持
      </span>
    ) : (
      <span className="text-[var(--theme-text-muted)]">—</span>
    );
  }

  return value;
}

function formatChars(value: number) {
  return value === -1 ? "不限" : `${formatNumber(value)} 字`;
}

function formatCount(value: number, unit: string) {
  return value === -1 ? "不限" : `${formatNumber(value)} ${unit}`;
}

function formatNumber(value: number) {
  return value.toLocaleString("zh-CN");
}

import "server-only";

import { Prisma } from "@prisma/client";

import { AuthApiError } from "@/lib/auth/errors";
import { prisma } from "@/lib/prisma";
import { amountYuanToCents, type AlipayNotifyParams } from "@/lib/payments/alipay-client";

export function createOutTradeNo() {
  const timestamp = new Date()
    .toISOString()
    .replace(/\D/g, "")
    .slice(0, 14);
  const random = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `AFQ${timestamp}${random}`;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toJsonObject(params: AlipayNotifyParams): Prisma.InputJsonObject {
  return Object.fromEntries(Object.entries(params)) as Prisma.InputJsonObject;
}

export async function applyPaidAlipayOrder(params: {
  outTradeNo: string;
  providerTradeNo?: string;
  totalAmount: string;
  rawNotify: AlipayNotifyParams;
}) {
  const order = await prisma.paymentOrder.findUnique({
    where: { outTradeNo: params.outTradeNo },
    select: {
      id: true,
      userId: true,
      status: true,
      amountCents: true,
      tier: true,
      durationDays: true,
    },
  });

  if (!order) {
    throw new AuthApiError(404, "支付订单不存在。");
  }

  const paidAmountCents = amountYuanToCents(params.totalAmount);
  if (paidAmountCents !== order.amountCents) {
    throw new AuthApiError(400, "支付金额与订单金额不一致。");
  }

  if (order.status === "paid") {
    return { alreadyPaid: true, orderId: order.id };
  }

  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const lockedOrder = await tx.paymentOrder.findUnique({
      where: { id: order.id },
      select: {
        id: true,
        userId: true,
        status: true,
        amountCents: true,
        tier: true,
        durationDays: true,
      },
    });

    if (!lockedOrder) {
      throw new AuthApiError(404, "支付订单不存在。");
    }

    if (lockedOrder.status === "paid") {
      return { alreadyPaid: true, orderId: lockedOrder.id };
    }

    if (lockedOrder.status !== "pending") {
      throw new AuthApiError(400, "支付订单状态不可发放会员。");
    }

    if (lockedOrder.amountCents !== paidAmountCents) {
      throw new AuthApiError(400, "支付金额与订单金额不一致。");
    }

    const user = await tx.user.findUnique({
      where: { id: lockedOrder.userId },
      select: { membershipExpiresAt: true },
    });

    if (!user) {
      throw new AuthApiError(404, "订单用户不存在。");
    }

    const baseTime =
      user.membershipExpiresAt && user.membershipExpiresAt.getTime() > now.getTime()
        ? user.membershipExpiresAt
        : now;
    const nextExpiresAt = addDays(baseTime, lockedOrder.durationDays);

    const claimed = await tx.paymentOrder.updateMany({
      where: { id: lockedOrder.id, status: "pending" },
      data: {
        status: "paid",
        providerTradeNo: params.providerTradeNo,
        paidAt: now,
        rawNotify: toJsonObject(params.rawNotify),
        expiresAt: nextExpiresAt,
      },
    });

    if (claimed.count === 0) {
      return { alreadyPaid: true, orderId: lockedOrder.id };
    }

    await tx.user.update({
      where: { id: lockedOrder.userId },
      data: {
        membershipTier: lockedOrder.tier,
        membershipExpiresAt: nextExpiresAt,
      },
    });

    return {
      alreadyPaid: false,
      orderId: lockedOrder.id,
      membershipExpiresAt: nextExpiresAt,
    };
  });
}

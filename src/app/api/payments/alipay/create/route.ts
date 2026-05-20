import { z } from "zod";

import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import { getCurrentUser } from "@/lib/auth/service";
import { createAlipayPagePayUrl } from "@/lib/payments/alipay-client";
import { createOutTradeNo } from "@/lib/payments/orders";
import { getPaymentPlan } from "@/lib/payments/plans";
import { prisma } from "@/lib/prisma";
import { assertSameOriginRequest } from "@/lib/security/origin";

export const runtime = "nodejs";

const bodySchema = z.object({
  planId: z.string(),
});

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthApiError(401, "未登录或登录已失效，请先登录。");
    }

    const body = await parseJsonBody(request, bodySchema);
    const plan = getPaymentPlan(body.planId);
    if (!plan) {
      throw new AuthApiError(400, "无效的支付套餐。");
    }

    const outTradeNo = createOutTradeNo();
    const order = await prisma.paymentOrder.create({
      data: {
        userId: user.id,
        outTradeNo,
        planId: plan.id,
        tier: plan.tier,
        durationDays: plan.durationDays,
        amountCents: plan.amountCents,
        subject: plan.subject,
      },
      select: {
        id: true,
        outTradeNo: true,
      },
    });
    const paymentUrl = await createAlipayPagePayUrl({
      outTradeNo,
      subject: plan.subject,
      amountCents: plan.amountCents,
    });

    return successResponse(
      {
        orderId: order.id,
        outTradeNo: order.outTradeNo,
        paymentUrl,
      },
      { message: "支付宝订单已创建。" },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

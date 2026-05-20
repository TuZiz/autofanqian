import { NextResponse } from "next/server";

import { verifyAlipayNotify } from "@/lib/payments/alipay-client";
import { applyPaidAlipayOrder } from "@/lib/payments/orders";

export const runtime = "nodejs";

function textResponse(text: "success" | "failure") {
  return new NextResponse(text, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

function formDataToParams(formData: FormData) {
  const params: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    params[key] = typeof value === "string" ? value : value.name;
  }
  return params;
}

export async function POST(request: Request) {
  try {
    const params = formDataToParams(await request.formData());
    const verified = await verifyAlipayNotify(params);
    if (!verified) {
      return textResponse("failure");
    }

    const outTradeNo = params.out_trade_no;
    const tradeStatus = params.trade_status;
    const totalAmount = params.total_amount;
    if (!outTradeNo || !totalAmount) {
      return textResponse("failure");
    }

    if (tradeStatus !== "TRADE_SUCCESS" && tradeStatus !== "TRADE_FINISHED") {
      return textResponse("success");
    }

    await applyPaidAlipayOrder({
      outTradeNo,
      providerTradeNo: params.trade_no,
      totalAmount,
      rawNotify: params,
    });

    return textResponse("success");
  } catch {
    return textResponse("failure");
  }
}

import { NextResponse } from "next/server";

import { verifyAlipayNotify } from "@/lib/payments/alipay-client";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const verified = await verifyAlipayNotify(params).catch(() => false);
  const redirectUrl = new URL("/dashboard", url.origin);
  redirectUrl.searchParams.set("payment", verified ? "success" : "pending");

  return NextResponse.redirect(redirectUrl);
}

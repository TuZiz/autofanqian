import { successResponse } from "@/lib/auth/api";
import { getSafeAlipayPaymentConfig } from "@/lib/payments/alipay-config";

export const runtime = "nodejs";

export async function GET() {
  const config = await getSafeAlipayPaymentConfig();

  return successResponse(
    {
      enabled: config.enabled,
      configured: config.enabled && config.appId.trim().length > 0 && config.privateKeyConfigured && config.alipayPublicKeyConfigured,
    },
    { message: "支付宝支付状态已加载。" },
  );
}

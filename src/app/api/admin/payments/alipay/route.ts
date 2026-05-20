import { z } from "zod";

import { recordAdminAuditLog } from "@/lib/admin/audit-log";
import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { isSuperAdminUser, requireAdminUser } from "@/lib/auth/admin";
import { AuthApiError } from "@/lib/auth/errors";
import {
  getAlipayPaymentConfig,
  getSafeAlipayPaymentConfig,
  toSafeAlipayPaymentConfig,
  updateAlipayPaymentConfig,
} from "@/lib/payments/alipay-config";
import { assertSameOriginRequest } from "@/lib/security/origin";

export const runtime = "nodejs";

const patchSchema = z.object({
  enabled: z.boolean(),
  sandbox: z.boolean(),
  appId: z.string(),
  gateway: z.string(),
  returnUrl: z.string(),
  notifyUrl: z.string(),
  signType: z.literal("RSA2"),
  alipayPublicKey: z.string().optional(),
  privateKey: z.string().optional(),
});

async function requirePaymentSettingsAdmin() {
  const adminUser = await requireAdminUser();
  if (!isSuperAdminUser(adminUser)) {
    throw new AuthApiError(403, "只有根管理员或超级管理员可以管理支付设置。");
  }

  return adminUser;
}

export async function GET() {
  try {
    await requirePaymentSettingsAdmin();
    const config = await getSafeAlipayPaymentConfig();

    return successResponse({ config }, { message: "支付宝支付设置已加载。" });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOriginRequest(request);
    const adminUser = await requirePaymentSettingsAdmin();
    const before = await getAlipayPaymentConfig();
    const body = await parseJsonBody(request, patchSchema);
    const config = await updateAlipayPaymentConfig(body);
    const safeConfig = toSafeAlipayPaymentConfig(config);

    await recordAdminAuditLog({
      request,
      adminUser,
      action: "payment_alipay.update",
      targetType: "AppConfig",
      targetId: "payment_alipay_v1",
      before: toSafeAlipayPaymentConfig(before),
      after: safeConfig,
    });

    return successResponse({ config: safeConfig }, { message: "支付宝支付设置已保存。" });
  } catch (error) {
    return errorResponse(error);
  }
}

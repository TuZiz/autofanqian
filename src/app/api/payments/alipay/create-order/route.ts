import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import { getCurrentUser } from "@/lib/auth/service";
import { createAlipayOrderPreview } from "@/lib/payments/alipay-client";
import { assertSameOriginRequest } from "@/lib/security/origin";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  tier: z.enum(["plus", "pro", "max"]),
});

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthApiError(401, "未登录或登录已失效，请先登录。");
    }

    const body = await parseJsonBody(request, bodySchema);
    const order = await createAlipayOrderPreview();

    return successResponse(
      {
        order,
        tier: body.tier,
      },
      { message: "支付宝支付已启用，真实下单接口已预留，当前不会发放会员。" },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

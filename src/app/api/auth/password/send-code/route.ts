import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { sendCodeSchema } from "@/lib/auth/schemas";
import { zhCN } from "@/lib/copy/zh-cn";
import { sendPasswordResetCode } from "@/lib/auth/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { email } = await parseJsonBody(request, sendCodeSchema);
    const data = await sendPasswordResetCode(email);

    return successResponse(data, {
      message: zhCN.auth.response.resetCodeSent,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

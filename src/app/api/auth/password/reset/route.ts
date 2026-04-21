import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { passwordResetSchema } from "@/lib/auth/schemas";
import { zhCN } from "@/lib/copy/zh-cn";
import { resetPasswordWithCode } from "@/lib/auth/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { email, code, newPassword } = await parseJsonBody(
      request,
      passwordResetSchema
    );
    const user = await resetPasswordWithCode(email, code, newPassword);

    return successResponse(
      {
        redirectTo: "/login",
        user,
      },
      {
        message: zhCN.auth.response.resetSuccess,
      }
    );
  } catch (error) {
    return errorResponse(error);
  }
}

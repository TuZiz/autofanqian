import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { getRequestMeta } from "@/lib/auth/request";
import { passwordResetSchema } from "@/lib/auth/schemas";
import { zhCN } from "@/lib/copy/zh-cn";
import { createSessionCookie } from "@/lib/auth/session";
import { resetPasswordWithCode } from "@/lib/auth/service";
import { getUserAccessSnapshot } from "@/lib/auth/admin";
import { assertSameOriginRequest } from "@/lib/security/origin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  assertSameOriginRequest(request);
  try {
    const { email, code, newPassword } = await parseJsonBody(
      request,
      passwordResetSchema
    );
    const user = await resetPasswordWithCode(email, code, newPassword);
    const sessionCookie = await createSessionCookie(
      user.id,
      getRequestMeta(request)
    );

    const response = successResponse(
      {
        redirectTo: "/dashboard",
        user: {
          ...user,
          ...getUserAccessSnapshot(user),
        },
      },
      {
        message: zhCN.auth.response.resetSuccess,
      }
    );

    response.cookies.set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.options
    );

    return response;
  } catch (error) {
    return errorResponse(error);
  }
}

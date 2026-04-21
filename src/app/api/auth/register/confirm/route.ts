import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { registerConfirmSchema } from "@/lib/auth/schemas";
import { zhCN } from "@/lib/copy/zh-cn";
import { createSessionCookie } from "@/lib/auth/session";
import { registerWithCode } from "@/lib/auth/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { email, code, password } = await parseJsonBody(
      request,
      registerConfirmSchema
    );
    const user = await registerWithCode(email, code, password);
    const sessionCookie = await createSessionCookie(user.id);

    const response = successResponse(
      {
        redirectTo: "/dashboard",
        user,
      },
      {
        message: zhCN.auth.response.registerSuccess,
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

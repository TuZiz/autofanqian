import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { loginSchema } from "@/lib/auth/schemas";
import { zhCN } from "@/lib/copy/zh-cn";
import { createSessionCookie } from "@/lib/auth/session";
import { loginWithPassword } from "@/lib/auth/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { email, password } = await parseJsonBody(request, loginSchema);
    const user = await loginWithPassword(email, password);
    const sessionCookie = await createSessionCookie(user.id);

    const response = successResponse(
      {
        redirectTo: "/dashboard",
        user,
      },
      {
        message: zhCN.auth.response.loginSuccess,
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

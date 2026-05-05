import { AuthApiError } from "@/lib/auth/errors";
import { errorResponse, successResponse } from "@/lib/auth/api";
import { zhCN } from "@/lib/copy/zh-cn";
import { getCurrentUser } from "@/lib/auth/service";
import { getUserAccessSnapshot } from "@/lib/auth/admin";
import { createClearedSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      const response = errorResponse(
        new AuthApiError(401, zhCN.auth.response.unauthenticated)
      );
      const clearedCookie = createClearedSessionCookie();
      response.cookies.set(
        clearedCookie.name,
        clearedCookie.value,
        clearedCookie.options
      );
      return response;
    }

    return successResponse(
      {
        user: {
          ...user,
          ...getUserAccessSnapshot(user),
        },
      },
      {
        message: zhCN.auth.response.sessionLoaded,
      }
    );
  } catch (error) {
    return errorResponse(error);
  }
}

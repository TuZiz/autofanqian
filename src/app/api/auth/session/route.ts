import { AuthApiError } from "@/lib/auth/errors";
import { errorResponse, successResponse } from "@/lib/auth/api";
import { zhCN } from "@/lib/copy/zh-cn";
import { getCurrentUser } from "@/lib/auth/service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new AuthApiError(401, zhCN.auth.response.unauthenticated);
    }

    return successResponse(
      {
        user,
      },
      {
        message: zhCN.auth.response.sessionLoaded,
      }
    );
  } catch (error) {
    return errorResponse(error);
  }
}

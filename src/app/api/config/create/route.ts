import { AuthApiError } from "@/lib/auth/errors";
import { errorResponse, successResponse } from "@/lib/auth/api";
import { getCurrentUser } from "@/lib/auth/service";
import { getCreateUiConfigPublic } from "@/lib/config/create-ui";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthApiError(401, "未登录或登录已失效，请先登录。");
    }

    const config = await getCreateUiConfigPublic();

    return successResponse(
      {
        config,
      },
      { message: "配置已加载。" },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

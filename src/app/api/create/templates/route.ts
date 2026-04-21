import { z } from "zod";

import { AuthApiError } from "@/lib/auth/errors";
import { errorResponse, successResponse } from "@/lib/auth/api";
import { getCurrentUser } from "@/lib/auth/service";
import { listHotTemplates } from "@/lib/create/templates";

export const runtime = "nodejs";

const querySchema = z.object({
  genreId: z.string().min(1).max(64),
});

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthApiError(401, "未登录或登录已失效，请先登录。");
    }

    const url = new URL(request.url);
    const query = querySchema.parse({
      genreId: url.searchParams.get("genreId") ?? "",
    });

    const templates = await listHotTemplates({ genreId: query.genreId, take: 10 });

    return successResponse(
      { templates },
      { message: "热门模板已加载。" },
    );
  } catch (error) {
    return errorResponse(error);
  }
}


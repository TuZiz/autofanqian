import { z } from "zod";

import { AuthApiError } from "@/lib/auth/errors";
import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { getCurrentUser } from "@/lib/auth/service";
import { recordTemplateUsage } from "@/lib/create/templates";

export const runtime = "nodejs";

const bodySchema = z.object({
  templateId: z.string().min(1).max(64),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthApiError(401, "未登录或登录已失效，请先登录。");
    }

    const body = await parseJsonBody(request, bodySchema);
    const template = await recordTemplateUsage({
      templateId: body.templateId,
      userId: user.id,
    });

    return successResponse(
      { template },
      { message: "已记录模板使用。" },
    );
  } catch (error) {
    return errorResponse(error);
  }
}


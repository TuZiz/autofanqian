import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { chapterGenerateBodySchema } from "@/lib/ai/chapter-generate-shared";
import { assertAiQuotaAvailable } from "@/lib/ai/quota";
import { getAiProvidersFromEnv } from "@/lib/ai/upstream-text";
import { AuthApiError } from "@/lib/auth/errors";
import { getCurrentUser } from "@/lib/auth/service";
import { generateChapterForUser } from "./generate-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, message: "未登录或登录已失效，请先登录。" },
      { status: 401 },
    );
  }

  const raw = await request.json().catch(() => null as unknown);
  const parsedBody = chapterGenerateBodySchema.safeParse(raw);
  if (!parsedBody.success) {
    return NextResponse.json(
      { success: false, message: "请求参数校验失败，请检查输入内容。" },
      { status: 400 },
    );
  }

  try {
    await assertAiQuotaAvailable(user);
    const data = await generateChapterForUser({
      input: parsedBody.data,
      providersFromEnv: getAiProvidersFromEnv(),
      user,
    });

    return NextResponse.json({
      success: true,
      message: "OK",
      data,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "数据库未迁移完成：请先运行 start-dev.cmd 或执行 prisma migrate deploy。",
        },
        { status: 500 },
      );
    }

    if (error instanceof AuthApiError) {
      const shouldHideAiInternalError =
        error.status >= 500 && error.message.includes("AI");
      if (shouldHideAiInternalError) {
        console.warn("AI chapter generation failed", {
          status: error.status,
          reason: error.internalReason ?? error.message,
        });
      }

      return NextResponse.json(
        {
          success: false,
          message: shouldHideAiInternalError
            ? "AI 服务暂不可用，请联系管理员。"
            : error.message,
          fieldErrors: error.fieldErrors,
        },
        { status: error.status },
      );
    }

    console.error(error);
    return NextResponse.json(
      { success: false, message: "服务异常，请稍后重试。" },
      { status: 500 },
    );
  }
}

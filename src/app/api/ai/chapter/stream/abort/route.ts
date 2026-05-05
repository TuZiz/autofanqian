import { NextResponse } from "next/server";

import {
  chapterGenerateBodySchema,
} from "@/lib/ai/chapter-generate-shared";
import {
  getChapterGenerationLockKey,
  requestChapterGenerationAbort,
} from "@/lib/ai/chapter-generation-lock";
import { getCurrentUser } from "@/lib/auth/service";

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

  const key = getChapterGenerationLockKey({
    userId: user.id,
    workId: parsedBody.data.workId,
    index: parsedBody.data.index,
  });
  const requested = requestChapterGenerationAbort(key);

  if (!requested) {
    return NextResponse.json(
      { success: false, message: "当前章节没有正在运行的生成任务。" },
      { status: 409 },
    );
  }

  return NextResponse.json({
    success: true,
    message: "已请求停止生成。",
    data: { requested: true },
  });
}

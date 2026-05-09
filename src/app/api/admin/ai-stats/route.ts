import { NextResponse } from "next/server";

import { getAdminAiStats } from "@/backend/admin/ai-stats-service";
import { requireAdminUser } from "@/lib/auth/admin";

export const runtime = "nodejs";

export async function GET() {
  await requireAdminUser();

  try {
    const data = await getAdminAiStats();
    return NextResponse.json({
      success: true,
      message: "OK",
      data,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        success: false,
        message:
          "统计服务未初始化或数据库未迁移完成。请先运行一键启动脚本（start-dev.cmd）或执行 prisma migrate deploy。",
      },
      { status: 500 },
    );
  }
}

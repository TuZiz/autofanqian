import { NextResponse } from "next/server";

import { AuthApiError } from "@/lib/auth/errors";
import { requireAdminUser } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdminUser();
    const searchParams = new URL(request.url).searchParams;
    const take = Math.max(1, Math.min(100, Number(searchParams.get("take") || 50)));

    const logs = await prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        adminUserId: true,
        adminEmail: true,
        action: true,
        targetType: true,
        targetId: true,
        before: true,
        after: true,
        ip: true,
        userAgent: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "OK",
      data: {
        logs: logs.map((log) => ({
          ...log,
          createdAt: log.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "审计日志加载失败。";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

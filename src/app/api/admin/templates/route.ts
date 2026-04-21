import { z } from "zod";

import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const querySchema = z.object({
  genreId: z.string().min(1).max(64).optional(),
});

const createSchema = z.object({
  genreId: z.string().min(1).max(64),
  content: z.string().min(10).max(4000),
  title: z.string().max(120).optional(),
  source: z.enum(["seed", "ai", "user", "learned"]).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    await requireAdminUser();

    const url = new URL(request.url);
    const query = querySchema.parse({
      genreId: url.searchParams.get("genreId") ?? undefined,
    });

    const templates = await prisma.createTemplate.findMany({
      where: query.genreId ? { genreId: query.genreId } : undefined,
      orderBy: [{ updatedAt: "desc" }],
      take: 200,
      select: {
        id: true,
        genreId: true,
        title: true,
        content: true,
        source: true,
        usageCount: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return successResponse({ templates }, { message: "模板已加载。" });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();
    const body = await parseJsonBody(request, createSchema);

    const template = await prisma.createTemplate.create({
      data: {
        genreId: body.genreId,
        title: body.title,
        content: body.content,
        source: body.source ?? "seed",
        isActive: body.isActive ?? true,
      },
      select: {
        id: true,
        genreId: true,
        title: true,
        content: true,
        source: true,
        usageCount: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return successResponse({ template }, { message: "模板已创建。" });
  } catch (error) {
    return errorResponse(error);
  }
}

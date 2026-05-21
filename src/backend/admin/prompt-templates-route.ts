import { PromptTemplateCategory, Prisma } from "@prisma/client";
import { z } from "zod";

import { recordAdminAuditLog } from "@/lib/admin/audit-log";
import { requireAdminUser } from "@/lib/auth/admin";
import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import { prisma } from "@/lib/prisma";
import { assertSameOriginRequest } from "@/lib/security/origin";
import {
  promptTemplateCreateSchema,
  promptTemplateListQuerySchema,
  promptTemplateUpdateSchema,
} from "@/shared/schemas/prompt-template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paramsSchema = z.object({ id: z.string().min(1).max(64) });
type RouteContext = { params: Promise<{ id?: string }> };

function serialize<T extends { createdAt: Date; updatedAt: Date }>(template: T) {
  return {
    ...template,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

async function getNextVersion(key: string) {
  const latest = await prisma.promptTemplate.findFirst({
    where: { key },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  return (latest?.version ?? 0) + 1;
}

export async function GET(request: Request) {
  try {
    await requireAdminUser();
    const query = promptTemplateListQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const templates = await prisma.promptTemplate.findMany({
      where: query.category ? { category: query.category } : undefined,
      orderBy: [{ category: "asc" }, { key: "asc" }, { version: "desc" }],
      take: 500,
    });

    return successResponse(
      {
        templates: templates.map(serialize),
        categories: Object.values(PromptTemplateCategory),
      },
      { message: "提示词模板已加载。" },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    const adminUser = await requireAdminUser();
    const body = await parseJsonBody(request, promptTemplateCreateSchema);
    const version = await getNextVersion(body.key);

    const template = await prisma.$transaction(async (tx) => {
      if (body.isActive) {
        await tx.promptTemplate.updateMany({
          where: { key: body.key },
          data: { isActive: false },
        });
      }

      return tx.promptTemplate.create({
        data: {
          key: body.key,
          category: body.category,
          name: body.name,
          content: body.content,
          version,
          isActive: body.isActive,
        },
      });
    });

    await recordAdminAuditLog({
      request,
      adminUser,
      action: "prompt_template.create",
      targetType: "PromptTemplate",
      targetId: template.id,
      after: template,
    });

    return successResponse({ template: serialize(template) }, { message: "提示词模板已创建。" });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return errorResponse(new AuthApiError(409, "同一 key 和版本的提示词模板已存在。"));
    }
    return errorResponse(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const adminUser = await requireAdminUser();
    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "" });
    const body = await parseJsonBody(request, promptTemplateUpdateSchema);
    const before = await prisma.promptTemplate.findUnique({ where: { id: params.id } });
    if (!before) throw new AuthApiError(404, "提示词模板不存在。");

    const template = await prisma.$transaction(async (tx) => {
      if (body.createVersion) {
        const version = await getNextVersion(before.key);
        if (body.isActive ?? true) {
          await tx.promptTemplate.updateMany({
            where: { key: before.key },
            data: { isActive: false },
          });
        }
        return tx.promptTemplate.create({
          data: {
            key: before.key,
            category: before.category,
            name: body.name ?? before.name,
            content: body.content ?? before.content,
            version,
            isActive: body.isActive ?? true,
          },
        });
      }

      if (body.isActive) {
        await tx.promptTemplate.updateMany({
          where: { key: before.key, id: { not: before.id } },
          data: { isActive: false },
        });
      }

      return tx.promptTemplate.update({
        where: { id: before.id },
        data: {
          name: body.name,
          content: body.content,
          isActive: body.isActive,
        },
      });
    });

    await recordAdminAuditLog({
      request,
      adminUser,
      action: body.createVersion ? "prompt_template.version" : "prompt_template.update",
      targetType: "PromptTemplate",
      targetId: template.id,
      before,
      after: template,
    });

    return successResponse({ template: serialize(template) }, { message: "提示词模板已保存。" });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const adminUser = await requireAdminUser();
    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "" });
    const before = await prisma.promptTemplate.findUnique({ where: { id: params.id } });
    if (!before) throw new AuthApiError(404, "提示词模板不存在。");

    const template = await prisma.promptTemplate.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    await recordAdminAuditLog({
      request,
      adminUser,
      action: "prompt_template.deactivate",
      targetType: "PromptTemplate",
      targetId: params.id,
      before,
      after: template,
    });

    return successResponse({ id: params.id }, { message: "提示词模板已停用。" });
  } catch (error) {
    return errorResponse(error);
  }
}

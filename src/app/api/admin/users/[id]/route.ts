import { z } from "zod";

import {
  getAdminUserDetail,
  updateAdminUser,
} from "@/backend/admin/admin-users-lite-service";
import {
  adminEditableUserRoles,
  adminMembershipTiers,
  adminUserStatuses,
} from "@/lib/admin/admin-user-types";
import { requireAdminUser } from "@/lib/auth/admin";
import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import { assertSameOriginRequest } from "@/lib/security/origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export { DELETE, PUT } from "@/backend/admin/user-detail-route";

const paramsSchema = z.object({
  id: z.string().trim().min(1).max(128),
});

const updateSchema = z.object({
  bannedReason: z.string().max(500).nullable().optional(),
  emailVerified: z.boolean().optional(),
  membershipExpiresAt: z.string().max(64).nullable().optional(),
  membershipTier: z.enum(adminMembershipTiers).optional(),
  name: z.string().max(64).nullable().optional(),
  role: z.enum(adminEditableUserRoles).optional(),
  status: z.enum(adminUserStatuses).optional(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id?: string }> },
) {
  try {
    await requireAdminUser();
    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "" });
    const data = await getAdminUserDetail(params.id);

    if (!data) {
      throw new AuthApiError(404, "用户不存在。");
    }

    return successResponse(data, { message: "OK" });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id?: string }> },
) {
  try {
    assertSameOriginRequest(request);
    const adminUser = await requireAdminUser();
    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "" });
    const body = await parseJsonBody(request, updateSchema);
    const data = await updateAdminUser(request, adminUser, params.id, body);

    if (!data) {
      throw new AuthApiError(404, "用户不存在。");
    }

    return successResponse(data, { message: "用户已更新。" });
  } catch (error) {
    return errorResponse(error);
  }
}

import { z } from "zod";

import { listAdminUsers } from "@/backend/admin/admin-users-lite-service";
import {
  adminEmailVerifiedFilters,
  adminMembershipTierFilters,
  adminUserRoleFilters,
  adminUserSorts,
  adminUserStatusFilters,
} from "@/lib/admin/admin-user-types";
import { requireAdminUser } from "@/lib/auth/admin";
import { errorResponse, successResponse } from "@/lib/auth/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  cursor: z.string().trim().min(1).max(128).optional(),
  emailVerified: z.enum(adminEmailVerifiedFilters).optional().default("all"),
  membershipTier: z.enum(adminMembershipTierFilters).optional().default("all"),
  q: z.string().trim().max(200).optional(),
  role: z.enum(adminUserRoleFilters).optional().default("all"),
  sort: z.enum(adminUserSorts).optional().default("createdAt_desc"),
  status: z.enum(adminUserStatusFilters).optional().default("all"),
  take: z.coerce.number().int().refine((value) => [20, 50, 100].includes(value), {
    message: "take 只能是 20、50 或 100。",
  }).optional().default(20),
});

export async function GET(request: Request) {
  try {
    await requireAdminUser();
    const url = new URL(request.url);
    const query = querySchema.parse({
      cursor: url.searchParams.get("cursor") ?? undefined,
      emailVerified: url.searchParams.get("emailVerified") ?? undefined,
      membershipTier: url.searchParams.get("membershipTier") ?? undefined,
      q: url.searchParams.get("q") ?? undefined,
      role: url.searchParams.get("role") ?? undefined,
      sort: url.searchParams.get("sort") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      take: url.searchParams.get("take") ?? undefined,
    });
    const data = await listAdminUsers(query);

    return successResponse(data, { message: "OK" });
  } catch (error) {
    return errorResponse(error);
  }
}

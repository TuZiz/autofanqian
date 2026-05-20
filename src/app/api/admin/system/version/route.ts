import { errorResponse, successResponse } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import { getVersionStatus } from "@/lib/system/version";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdminUser();
    const version = await getVersionStatus();
    return successResponse({ version }, { message: "版本信息已加载。" });
  } catch (error) {
    return errorResponse(error);
  }
}

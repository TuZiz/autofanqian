import { recordAdminAuditLog } from "@/lib/admin/audit-log";
import { errorResponse, successResponse } from "@/lib/auth/api";
import { isSuperAdminUser, requireAdminUser } from "@/lib/auth/admin";
import { AuthApiError } from "@/lib/auth/errors";
import { prisma } from "@/lib/prisma";
import { assertSameOriginRequest } from "@/lib/security/origin";
import { hasRunningDeployJob, startDeployJob } from "@/lib/system/deploy";
import { getVersionStatus } from "@/lib/system/version";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    const adminUser = await requireAdminUser();
    if (!isSuperAdminUser(adminUser)) {
      throw new AuthApiError(403, "只有根管理员或超级管理员可以执行云端更新。");
    }

    const running = await hasRunningDeployJob();
    if (running) {
      throw new AuthApiError(409, "已有云端更新任务正在执行，请稍后再试。");
    }

    const version = await getVersionStatus();
    const job = await prisma.deployJob.create({
      data: {
        status: "running",
        startedById: adminUser.id,
        startedByEmail: adminUser.email,
        currentVersion: version.currentVersion,
        targetVersion: version.latestVersion,
        commitBefore: version.currentCommit,
        log: "",
      },
    });

    await recordAdminAuditLog({
      request,
      adminUser,
      action: "system.deploy.start",
      targetType: "DeployJob",
      targetId: job.id,
      after: {
        currentVersion: version.currentVersion,
        targetVersion: version.latestVersion,
        commitBefore: version.currentCommit,
        latestCommit: version.latestCommit,
      },
    });

    void startDeployJob(job);

    return successResponse({ jobId: job.id }, { message: "云端更新已开始。" });
  } catch (error) {
    return errorResponse(error);
  }
}

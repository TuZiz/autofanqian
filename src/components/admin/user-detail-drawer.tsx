"use client";

import { Loader2, X } from "lucide-react";

import {
  formatDateTime,
  formatDuration,
  formatTokens,
  getMembershipMeta,
  getUserRoleMeta,
  getUserStatusMeta,
} from "@/lib/admin/admin-format";
import { useAdminUserDetail } from "@/lib/admin/use-admin-user-detail";
import { cn } from "@/lib/utils";

export function UserDetailDrawer({
  onClose,
  userId,
}: {
  onClose: () => void;
  userId: string | null;
}) {
  const detail = useAdminUserDetail(userId);
  const data = detail.data;

  if (!userId) return null;

  return (
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        aria-label="关闭用户详情"
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-hidden rounded-t-[18px] border border-[#d9e5f2] bg-white shadow-[0_-24px_70px_rgba(15,64,116,0.18)] md:inset-y-0 md:left-auto md:right-0 md:h-full md:max-h-none md:w-[560px] md:rounded-none">
        <div className="flex h-full min-h-0 flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-[#eef3f8] px-5 py-4">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7b8ca5]">
                用户详情
              </p>
              <h2 className="mt-1 truncate text-lg font-black text-[#172033]">
                {data?.user.email || "加载中"}
              </h2>
              {data?.user ? <UserMetaBadges user={data.user} /> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#64748b] transition hover:bg-[#f3f7fc] hover:text-[#172033]"
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {detail.loading ? (
              <div className="flex min-h-[260px] items-center justify-center gap-2 text-sm font-bold text-[#7b8ca5]">
                <Loader2 className="h-4 w-4 animate-spin" />
                正在加载用户详情...
              </div>
            ) : detail.error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {detail.error}
              </div>
            ) : data ? (
              <div className="space-y-4">
                <DetailSection title="账号信息">
                  <InfoGrid
                    items={[
                      ["用户 ID", data.user.id],
                      ["code", String(data.user.code)],
                      ["email", data.user.email],
                      ["name", data.user.name || "-"],
                      ["role", data.user.role],
                      ["status", data.user.status],
                      ["membershipTier", data.user.membershipTier],
                      ["membershipExpiresAt", formatDateTime(data.user.membershipExpiresAt)],
                      ["emailVerified", data.user.emailVerified ? "true" : "false"],
                      ["bannedReason", data.user.bannedReason || "-"],
                      ["bannedAt", formatDateTime(data.user.bannedAt)],
                      ["lastLoginAt", formatDateTime(data.user.lastLoginAt)],
                      ["createdAt", formatDateTime(data.user.createdAt)],
                      ["updatedAt", formatDateTime(data.user.updatedAt)],
                    ]}
                  />
                </DetailSection>

                <DetailSection title="统计">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Stat label="作品总数" value={data.stats.works} />
                    <Stat label="长篇作品" value={data.stats.longWorks} />
                    <Stat label="短篇作品" value={data.stats.shortWorks} />
                    <Stat label="生成任务" value={data.stats.generationJobs} />
                    <Stat label="成功任务" value={data.stats.successfulGenerationJobs} />
                    <Stat label="失败任务" value={data.stats.failedGenerationJobs} />
                    <Stat label="今日 AI 调用" value={data.stats.todayAiCalls} />
                    <Stat label="今日 Token" value={formatTokens(data.stats.todayTokens)} />
                    <Stat label="总 AI 调用" value={data.stats.totalAiCalls} />
                    <Stat label="总 Token" value={formatTokens(data.stats.totalTokens)} />
                    <Stat label="有效会话" value={data.stats.activeSessions} />
                  </div>
                </DetailSection>

                <DetailSection title="最近 10 条生成任务">
                  <div className="space-y-2">
                    {data.recentGenerationJobs.length ? data.recentGenerationJobs.map((job) => (
                      <div key={job.id} className="rounded-lg bg-white px-3 py-2 text-xs ring-1 ring-[#eef3f8]">
                        <p className="font-black text-[#172033]">{job.action} · {job.status}</p>
                        <p className="mt-1 text-[#52647e]">
                          {job.novel?.title || "无作品"} · {formatTokens(job.totalTokens)} · {formatDuration(job.durationMs)}
                        </p>
                        {job.errorMessage ? (
                          <p className="mt-1 line-clamp-2 text-red-700">{job.errorMessage}</p>
                        ) : null}
                      </div>
                    )) : <EmptyLine text="暂无生成任务" />}
                  </div>
                </DetailSection>

                <DetailSection title="最近 10 条登录尝试">
                  <div className="space-y-2">
                    {data.recentLoginAttempts.length ? data.recentLoginAttempts.map((attempt) => (
                      <div key={attempt.id} className="rounded-lg bg-white px-3 py-2 text-xs ring-1 ring-[#eef3f8]">
                        <p className={cn("font-black", attempt.success ? "text-emerald-700" : "text-red-700")}>
                          {attempt.success ? "成功" : "失败"} · {formatDateTime(attempt.createdAt)}
                        </p>
                        <p className="mt-1 break-words text-[#52647e]">
                          {attempt.ip || "-"} · {attempt.failureReason || "无失败原因"}
                        </p>
                        {attempt.userAgent ? (
                          <p className="mt-1 line-clamp-2 text-[#7b8ca5]">{attempt.userAgent}</p>
                        ) : null}
                      </div>
                    )) : <EmptyLine text="暂无登录尝试" />}
                  </div>
                </DetailSection>

                <DetailSection title="最近 5 个作品">
                  <div className="space-y-2">
                    {data.recentWorks.length ? data.recentWorks.map((work) => (
                      <div key={work.id} className="rounded-lg bg-white px-3 py-2 text-xs ring-1 ring-[#eef3f8]">
                        <p className="font-black text-[#172033]">{work.title}</p>
                        <p className="mt-1 text-[#52647e]">
                          {work.workType} · 更新 {formatDateTime(work.updatedAt)}
                        </p>
                      </div>
                    )) : <EmptyLine text="暂无作品" />}
                  </div>
                </DetailSection>
              </div>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}

function UserMetaBadges({
  user,
}: {
  user: {
    membershipTier: string;
    role: string;
    status: string;
  };
}) {
  const roleMeta = getUserRoleMeta(user.role);
  const statusMeta = getUserStatusMeta(user.status);
  const tierMeta = getMembershipMeta(user.membershipTier);

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {[roleMeta, statusMeta, tierMeta].map((meta) => (
        <span
          key={`${meta.label}-${meta.className}`}
          className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-black", meta.className)}
        >
          {meta.label}
        </span>
      ))}
    </div>
  );
}

function DetailSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-xl border border-[#d9e5f2] bg-[#fbfdff] p-3">
      <h3 className="text-xs font-black text-[#172033]">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function InfoGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <dl className="grid gap-2">
      {items.map(([label, value]) => (
        <div key={label} className="grid gap-1 rounded-lg bg-white px-3 py-2 sm:grid-cols-[150px_minmax(0,1fr)]">
          <dt className="text-xs font-black text-[#7b8ca5]">{label}</dt>
          <dd className="min-w-0 break-words text-xs font-semibold leading-5 text-[#172033]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-[#eef3f8]">
      <p className="text-[11px] font-black text-[#7b8ca5]">{label}</p>
      <p className="mt-1 text-lg font-black text-[#172033]">{value}</p>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[#d9e5f2] bg-white px-3 py-6 text-center text-xs font-bold text-[#7b8ca5]">
      {text}
    </div>
  );
}

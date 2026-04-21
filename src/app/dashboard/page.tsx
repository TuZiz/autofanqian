import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/dashboard/logout-button";
import { zhCN } from "@/lib/copy/zh-cn";
import { getCurrentUser } from "@/lib/auth/service";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(129,140,248,0.15),transparent_24%),linear-gradient(180deg,#edf2ff_0%,#f8fafc_42%,#eef2ff_100%)] text-slate-900">
      <nav className="border-b border-slate-200/70 bg-slate-950 text-white shadow-[0_20px_60px_rgba(15,23,42,0.16)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-200/60">
              {zhCN.app.shortName}
            </p>
            <h1 className="mt-1 font-heading text-xl font-semibold">
              {zhCN.dashboard.navTitle}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <p className="hidden text-sm text-slate-300 sm:block">{user.email}</p>
            <LogoutButton />
          </div>
        </div>
      </nav>

      <section className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
        <div className="glass-panel rounded-[2rem] bg-white/80 p-8 text-slate-900 backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.32em] text-indigo-500/70">
            {zhCN.dashboard.welcomeTag}
          </p>
          <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight">
            {zhCN.dashboard.welcomeTitle}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            {zhCN.dashboard.welcomeDescription}
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <section className="rounded-[1.75rem] border border-slate-200/70 bg-white/80 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-sm text-slate-500">{zhCN.dashboard.userId}</p>
            <p className="mt-3 break-all text-sm font-semibold text-slate-900">
              {user.id}
            </p>
          </section>
          <section className="rounded-[1.75rem] border border-slate-200/70 bg-white/80 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-sm text-slate-500">{zhCN.dashboard.email}</p>
            <p className="mt-3 text-sm font-semibold text-slate-900">
              {user.email}
            </p>
          </section>
          <section className="rounded-[1.75rem] border border-slate-200/70 bg-white/80 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-sm text-slate-500">{zhCN.dashboard.verified}</p>
            <p className="mt-3 text-sm font-semibold text-slate-900">
              {user.emailVerified
                ? zhCN.dashboard.verifiedYes
                : zhCN.dashboard.verifiedNo}
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}

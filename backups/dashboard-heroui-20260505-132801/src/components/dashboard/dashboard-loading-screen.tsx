"use client";

import { Loader2 } from "lucide-react";

export function DashboardLoadingScreen() {
  return (
    <main className="theme-page flex min-h-screen items-center justify-center bg-[var(--theme-bg)]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600 dark:text-emerald-400" />
        <p className="text-sm font-medium text-[var(--theme-text-muted)]">正在验证身份信息...</p>
      </div>
    </main>
  );
}

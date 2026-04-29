"use client";

export function DashboardLoadingScreen() {
  return (
    <main className="theme-page relative flex min-h-screen items-center justify-center overflow-hidden transition-[background-color,color]">
      <div className="pointer-events-none absolute inset-0 theme-app-surface" />
      <div className="pointer-events-none absolute inset-0 theme-app-grid" />
      <div className="pointer-events-none absolute inset-0 theme-app-vignette" />
      <div className="pointer-events-none absolute inset-0 app-noise theme-app-noise" />

      <div className="glass-panel relative z-10 flex flex-col items-center gap-4 rounded-lg p-8 shadow-sm">
        <svg
          className="h-8 w-8 animate-spin text-emerald-600/80 dark:text-emerald-300/80"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p className="theme-muted animate-pulse text-sm font-medium">正在验证身份信息...</p>
      </div>
    </main>
  );
}

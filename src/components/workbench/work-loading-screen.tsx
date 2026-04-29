export function WorkLoadingScreen({ label }: { label: string }) {
  return (
    <main className="theme-page relative flex min-h-screen items-center justify-center transition-[background-color,color]">
      <div className="pointer-events-none absolute inset-0 theme-app-surface" />
      <div className="pointer-events-none absolute inset-0 theme-app-grid" />
      <div className="pointer-events-none absolute inset-0 theme-app-vignette" />
      <div className="pointer-events-none absolute inset-0 app-noise theme-app-noise" />
      <div className="glass-panel relative z-10 rounded-3xl p-8 text-sm font-medium shadow-xl">
        {label}
      </div>
    </main>
  );
}

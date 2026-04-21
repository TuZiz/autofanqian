type AuthToastProps = {
  message?: string;
  success?: boolean;
};

export function AuthToast({ message, success = true }: AuthToastProps) {
  const isVisible = Boolean(message);

  return (
    <div
      aria-live="polite"
      className={`pointer-events-none fixed left-1/2 top-5 z-50 w-[min(92vw,28rem)] -translate-x-1/2 rounded-2xl px-5 py-3 text-sm font-medium text-white shadow-2xl transition-all duration-300 ${
        success
          ? "bg-emerald-500/90 shadow-emerald-950/30"
          : "bg-rose-500/90 shadow-rose-950/30"
      } ${isVisible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"}`}
    >
      {message}
    </div>
  );
}

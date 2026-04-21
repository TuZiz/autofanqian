"use client";

type AuthToastProps = {
  message: string;
  success: boolean;
};

export function AuthToast({ message, success }: AuthToastProps) {
  return (
    <div
      className={`fixed left-1/2 top-5 z-50 -translate-x-1/2 rounded-lg px-6 py-3 text-sm font-medium text-white shadow-lg transition-all duration-300 ${
        success ? "bg-emerald-500/90" : "bg-rose-500/90"
      }`}
    >
      {message}
    </div>
  );
}

"use client";

type AuthToastProps = {
  message: string;
  success: boolean;
};

export function AuthToast({ message, success }: AuthToastProps) {
  return (
    <div
      data-success={success}
      className="theme-toast fixed left-1/2 top-5 z-50 -translate-x-1/2 rounded-lg px-6 py-3 text-sm font-medium transition-all duration-300"
    >
      {message}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiRequest } from "@/lib/client/auth-api";
import { zhCN } from "@/lib/copy/zh-cn";

type LogoutResponse = {
  redirectTo: string;
};

export function LogoutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    setIsSubmitting(true);
    const response = await apiRequest<LogoutResponse>("/api/auth/logout", {});

    if (response.success && response.data?.redirectTo) {
      router.replace(response.data.redirectTo);
      router.refresh();
      return;
    }

    setIsSubmitting(false);
  }

  return (
    <button
      className="rounded-full border border-white/18 bg-white/12 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-70"
      disabled={isSubmitting}
      type="button"
      onClick={handleLogout}
    >
      {isSubmitting ? zhCN.dashboard.loggingOut : zhCN.dashboard.logout}
    </button>
  );
}

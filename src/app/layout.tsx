import type { Metadata } from "next";
import { cookies } from "next/headers";

import "./globals.css";
import { ThemeProvider, type Theme } from "@/components/theme/theme-provider";
import { zhCN } from "@/lib/copy/zh-cn";

export const metadata: Metadata = {
  title: zhCN.app.name,
  description: zhCN.app.description,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const persistedTheme = cookieStore.get("theme")?.value;
  const initialTheme: Theme = persistedTheme === "light" ? "light" : "dark";
  const htmlThemeClass = initialTheme === "dark" ? "dark" : "";

  return (
    <html lang="zh-CN" suppressHydrationWarning className={htmlThemeClass}>
      <body className="bg-slate-50 text-slate-900 dark:bg-[#05070c] dark:text-slate-50 transition-colors">
        <ThemeProvider initialTheme={initialTheme}>{children}</ThemeProvider>
      </body>
    </html>
  );
}

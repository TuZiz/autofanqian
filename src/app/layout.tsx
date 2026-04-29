import type { Metadata } from "next";
import { cookies } from "next/headers";

import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import {
  THEME_INIT_SCRIPT,
  isTheme,
  type Theme,
} from "@/components/theme/theme-config";
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
  const initialTheme: Theme | null = isTheme(persistedTheme) ? persistedTheme : null;
  const htmlThemeClass = initialTheme === "dark" ? "dark" : undefined;

  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={htmlThemeClass}
      data-theme={initialTheme ?? undefined}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="theme-page transition-[background-color,color] duration-300">
        <ThemeProvider initialTheme={initialTheme}>{children}</ThemeProvider>
      </body>
    </html>
  );
}

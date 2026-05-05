"use client";

import {
  FluentProvider,
  webDarkTheme,
  webLightTheme,
  type Theme as FluentTheme,
} from "@fluentui/react-components";
import { useMemo, type ReactNode } from "react";

import { useTheme } from "@/components/theme/theme-provider";

const fluentBrandTokens = {
  10: "#06170f",
  20: "#082419",
  30: "#0a3324",
  40: "#0c4631",
  50: "#0e5d41",
  60: "#0f7651",
  70: "#119364",
  80: "#13aa76",
  90: "#26bd87",
  100: "#43cc9a",
  110: "#67d8ad",
  120: "#8ce4c2",
  130: "#b7efd9",
  140: "#ddf8ee",
  150: "#eefcf6",
  160: "#f7fefa",
};

function createFluentTheme(mode: "dark" | "light"): FluentTheme {
  const base = mode === "dark" ? webDarkTheme : webLightTheme;

  return {
    ...base,
    colorBrandBackground: mode === "dark" ? "#0f7651" : "#107c5a",
    colorBrandBackgroundHover: mode === "dark" ? "#119364" : "#0f6f50",
    colorBrandBackgroundPressed: mode === "dark" ? "#0c4631" : "#0d5f45",
    colorBrandForeground1: mode === "dark" ? "#8ce4c2" : "#107c5a",
    colorCompoundBrandForeground1: mode === "dark" ? "#8ce4c2" : "#107c5a",
    colorCompoundBrandStroke: mode === "dark" ? "#43cc9a" : "#107c5a",
    colorNeutralBackground1: mode === "dark" ? "#171514" : "#fffdf8",
    colorNeutralBackground2: mode === "dark" ? "#1f1d1b" : "#faf8f2",
    colorNeutralBackground3: mode === "dark" ? "#292623" : "#f4f1ea",
    colorNeutralForeground1: mode === "dark" ? "#fafaf9" : "#1c1917",
    colorNeutralForeground2: mode === "dark" ? "#d6d3d1" : "#44403c",
    colorNeutralForeground3: mode === "dark" ? "#a8a29e" : "#78716c",
    colorNeutralStroke1: mode === "dark" ? "#3d3834" : "#e7e2d8",
    colorNeutralStroke2: mode === "dark" ? "#2f2a27" : "#eee9df",
    colorNeutralShadowAmbient: "rgba(0, 0, 0, 0.12)",
    colorNeutralShadowKey: "rgba(0, 0, 0, 0.16)",
    colorPaletteGreenBackground2: mode === "dark" ? "#092f24" : "#dff7ed",
    colorPaletteGreenForeground2: mode === "dark" ? "#8ce4c2" : "#0f6f50",
    colorPaletteRedBackground2: mode === "dark" ? "#4f1518" : "#fde7e9",
    colorPaletteRedForeground1: mode === "dark" ? "#ffb3ba" : "#bc2f32",
    fontFamilyBase:
      '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", "Segoe UI", system-ui, sans-serif',
    fontFamilyNumeric: '"DIN Alternate", "Segoe UI", system-ui, sans-serif',
    ...Object.fromEntries(
      Object.entries(fluentBrandTokens).map(([step, value]) => [`colorBrand${step}`, value]),
    ),
  } as FluentTheme;
}

export function FluentThemeProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const fluentTheme = useMemo(() => createFluentTheme(theme), [theme]);

  return (
    <FluentProvider className="min-h-screen bg-transparent" theme={fluentTheme}>
      {children}
    </FluentProvider>
  );
}

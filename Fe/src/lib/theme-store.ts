"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ColorTheme } from "./themes";
import { applyTheme, getTheme } from "./themes";

interface ThemeState {
  themeId: ColorTheme;
  setTheme: (id: ColorTheme) => void;
  initTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      themeId: "indigo",
      setTheme: (id) => {
        applyTheme(getTheme(id));
        set({ themeId: id });
      },
      initTheme: () => {
        applyTheme(getTheme(get().themeId));
      },
    }),
    { name: "pc-theme" }
  )
);

export function useChartColors() {
  const themeId = useThemeStore((s) => s.themeId);
  const theme = getTheme(themeId);
  return { primary: theme.chartPrimary, secondary: theme.chartSecondary };
}

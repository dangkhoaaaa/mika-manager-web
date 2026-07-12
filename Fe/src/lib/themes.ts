export type ColorTheme = "indigo" | "pastel-green" | "rose" | "amber" | "cyan";

export interface ThemeConfig {
  id: ColorTheme;
  name: string;
  description: string;
  preview: [string, string, string];
  cssVars: Record<string, string>;
  chartPrimary: string;
  chartSecondary: string;
  gradientText: string;
  heatmapClass: string;
}

export const COLOR_THEMES: ThemeConfig[] = [
  {
    id: "indigo",
    name: "Indigo Ocean",
    description: "Xanh biển tím — mặc định",
    preview: ["#6366f1", "#8b5cf6", "#ec4899"],
    cssVars: {
      "--primary": "239 84% 67%",
      "--ring": "239 84% 67%",
      "--bg-glow-1": "239 84% 67%",
      "--bg-glow-2": "280 84% 67%",
    },
    chartPrimary: "#6366f1",
    chartSecondary: "#8b5cf6",
    gradientText: "from-indigo-400 via-purple-400 to-pink-400",
    heatmapClass: "indigo",
  },
  {
    id: "pastel-green",
    name: "Pastel Green",
    description: "Xanh lá pastel dịu mắt",
    preview: ["#86efac", "#6ee7b7", "#a7f3d0"],
    cssVars: {
      "--primary": "142 71% 73%",
      "--ring": "142 71% 73%",
      "--bg-glow-1": "142 60% 65%",
      "--bg-glow-2": "160 55% 60%",
    },
    chartPrimary: "#86efac",
    chartSecondary: "#6ee7b7",
    gradientText: "from-green-300 via-emerald-300 to-teal-300",
    heatmapClass: "green",
  },
  {
    id: "rose",
    name: "Rose Sunset",
    description: "Hồng cam ấm áp",
    preview: ["#fb7185", "#f472b6", "#fda4af"],
    cssVars: {
      "--primary": "350 89% 70%",
      "--ring": "350 89% 70%",
      "--bg-glow-1": "350 80% 65%",
      "--bg-glow-2": "330 75% 60%",
    },
    chartPrimary: "#fb7185",
    chartSecondary: "#f472b6",
    gradientText: "from-rose-400 via-pink-400 to-orange-300",
    heatmapClass: "rose",
  },
  {
    id: "amber",
    name: "Golden Hour",
    description: "Vàng cam năng lượng",
    preview: ["#fbbf24", "#fb923c", "#fcd34d"],
    cssVars: {
      "--primary": "38 92% 60%",
      "--ring": "38 92% 60%",
      "--bg-glow-1": "38 85% 55%",
      "--bg-glow-2": "25 80% 50%",
    },
    chartPrimary: "#fbbf24",
    chartSecondary: "#fb923c",
    gradientText: "from-amber-400 via-orange-400 to-yellow-300",
    heatmapClass: "amber",
  },
  {
    id: "cyan",
    name: "Arctic Cyan",
    description: "Xanh cyan lạnh",
    preview: ["#22d3ee", "#38bdf8", "#67e8f9"],
    cssVars: {
      "--primary": "187 85% 53%",
      "--ring": "187 85% 53%",
      "--bg-glow-1": "187 80% 50%",
      "--bg-glow-2": "199 75% 55%",
    },
    chartPrimary: "#22d3ee",
    chartSecondary: "#38bdf8",
    gradientText: "from-cyan-400 via-sky-400 to-blue-300",
    heatmapClass: "cyan",
  },
];

export function getTheme(id: ColorTheme): ThemeConfig {
  return COLOR_THEMES.find((t) => t.id === id) ?? COLOR_THEMES[0];
}

export function applyTheme(theme: ThemeConfig) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  Object.entries(theme.cssVars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  root.setAttribute("data-theme", theme.id);
  root.setAttribute("data-heatmap", theme.heatmapClass);
}

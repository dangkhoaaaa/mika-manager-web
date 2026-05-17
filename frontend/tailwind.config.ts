import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0a0a0f",
          card: "#12121a",
          elevated: "#1a1a26",
          border: "#2a2a3a",
        },
        accent: {
          DEFAULT: "#818cf8",
          muted: "#6366f1",
          glow: "#a5b4fc",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(129, 140, 248, 0.15)",
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.5)",
        "glass-sm": "0 2px 12px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.4)",
        "glass-lg": "0 16px 48px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)",
        "glass-dark": "0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        "glass-dark-sm": "0 2px 12px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.03)",
      },
    },
  },
  plugins: [],
};

export default config;

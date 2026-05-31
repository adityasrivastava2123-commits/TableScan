import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sora)", "sans-serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        os: {
          bg: "var(--bg)",
          panel: "var(--bg1)",
          hover: "var(--bg2)",
          border: "var(--border)",
          text: "var(--text)",
          muted: "var(--text2)",
          dim: "var(--text3)",
        },
      },
    },
  },
  plugins: [],
};
export default config;


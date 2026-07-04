import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: "#f6f3f1",
        "lake-blue": "#2b59d1",
        "periwinkle-mist": "#cfdaf5",
        "sky-blue": "#a0b5eb",
        mint: "#a7fccd",
        coral: "#ff9473",
        gold: "#ecda98",
        crimson: "#f37a0a",
        "off-black": "#242424",
        ink: "#000000",
        graphite: "#4e4d4d",
        smoke: "#797776",
        ash: "#cecac8",
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", '"Times New Roman"', "Times", "serif"],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        card: "40px",
        pill: "100px",
        tag: "9999px",
      },
      maxWidth: {
        page: "1432px",
      },
      spacing: {
        "card-padding": "40px",
        "section-gap": "64px",
      },
    },
  },
  plugins: [],
};

export default config;
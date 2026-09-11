import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#25221d",
        paper: "#f7f1e6",
        wash: "#ece1d0",
        graphite: "#5f5a51",
        clay: "#9b5f43",
        moss: "#526b54",
        dusk: "#415a77"
      },
      boxShadow: {
        sketch: "0 18px 50px rgba(37, 34, 29, 0.12)"
      },
      fontFamily: {
        display: ["Satisfy", "cursive"],
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;

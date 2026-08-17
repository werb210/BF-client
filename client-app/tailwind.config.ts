import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Libre Caslon Text'", "Georgia", "serif"],
        sans: ["'Public Sans'", "system-ui", "sans-serif"],
      },
      colors: {
        boreal: {
          ink: "#0B1F3A",
          inkDeep: "#081729",
          gold: "#BF9B49",
          mist: "#F5F8FC",
          line: "#E4EAF2",
          body: "#51617D",
          muted: "#8593aa",
        },
        brand: {
          bg: "#081729",
          surface: "#0B1F3A",
          accent: "#BF9B49",
          accentHover: "#cfa953"
        },
        subtle: "rgba(255,255,255,0.08)"
      }
    }
  },
  plugins: []
} satisfies Config;

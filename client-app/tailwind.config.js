export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Libre Caslon Text'", "Georgia", "serif"],
        sans: ["'Public Sans'", "system-ui", "sans-serif"],
      },
      colors: {
        // BF_CLIENT_BRAND_v167 - BF-Website palette. The old accent was orange,
        // which appears nowhere on the marketing site.
        boreal: {
          ink: "#0B1F3A",
          inkDeep: "#081729",
          gold: "#BF9B49",
          mist: "#F5F8FC",
          line: "#E4EAF2",
          body: "#51617D",
          muted: "#8593aa",
        },
        primary: "#0B1F3A",
        accent: "#BF9B49",
        gray: {
          50: "#F9FAFB",
          100: "#F3F4F6",
          200: "#E5E7EB",
          500: "#6B7280",
          600: "#4B5563",
          900: "#111827"
        }
      }
    }
  },
  plugins: []
};

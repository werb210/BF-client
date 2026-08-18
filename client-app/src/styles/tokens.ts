export const tokens = {
  colors: {
    // BF_CLIENT_UI_v169 - BF-Website palette. primary is the navy used for
    // focus rings, borders and secondary text; accent is the gold used on the
    // primary call to action, matching the Apply button on the marketing site.
    primary: "#0B1F3A",
    primaryDark: "#081729",
    primaryLight: "#F5F8FC",
    accent: "#BF9B49",
    accentHover: "#cfa953",
    success: "rgb(22 163 74)",
    warning: "rgb(245 158 11)",
    error: "rgb(220 38 38)",
    background: "#F5F8FC",
    surface: "rgb(255 255 255)",
    border: "#E4EAF2",
    textPrimary: "#0B1F3A",
    textSecondary: "#51617D",
    disabled: "rgb(203 213 225)",
  },
  typography: {
    // BF_CLIENT_DESIGN_v172 - the marketing site's faces. Both are already
    // loaded non-blocking in index.html, so this adds no request. displayFamily
    // is the serif used for headings on every page of boreal.financial.
    fontFamily: "'Public Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    displayFamily: "'Libre Caslon Text', Georgia, 'Times New Roman', serif",
    h1: {
      fontSize: "36px",
      fontWeight: 700,
      lineHeight: "1.2",
    },
    h2: {
      fontSize: "24px",
      fontWeight: 600,
      lineHeight: "1.3",
    },
    body: {
      fontSize: "16px",
      fontWeight: 400,
      lineHeight: "1.5",
    },
    label: {
      fontSize: "14px",
      fontWeight: 500,
      lineHeight: "1.4",
    },
    helper: {
      fontSize: "12px",
      fontWeight: 400,
      lineHeight: "1.4",
    },
    error: {
      fontSize: "12px",
      fontWeight: 600,
      lineHeight: "1.4",
    },
  },
  spacing: {
    base: 8,
    xs: "8px",
    sm: "12px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    xxl: "40px",
  },
  radii: {
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "20px",
    pill: "999px",
  },
  shadows: {
    focus: "0 0 0 3px rgba(11, 42, 74, 0.2)",
    errorFocus: "0 0 0 3px rgba(220, 38, 38, 0.2)",
    card: "0 10px 30px rgba(15, 23, 42, 0.10)",
  },
};

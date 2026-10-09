// BF_CLIENT_AUDIT_v748 - the config had no TypeScript parser, so every .ts/.tsx file failed to parse and lint
// checked nothing. TypeScript parsing plus the rules-of-hooks check (it found a wizard crash in Step 5).
module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  parser: "@typescript-eslint/parser",
  plugins: ["react-hooks"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  rules: {
    "react-hooks/rules-of-hooks": "error",
    "no-restricted-globals": "off",
  },
};

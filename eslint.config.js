import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
    linterOptions: {
      reportUnusedDisableDirectives: "warn",
    },
  },
  {
    ignores: [
      "node_modules/",
      ".git/",
      ".cursor/",
      "docs/",
      ".husky/",
      "**/.git.bak/",
      "*.config.js",
      "*.config.mjs",
      "*.config.ts",
      "**/.gitkeep",
    ],
  },
  {
    files: [
      "skincareconsultant/**/*.ts",
      "skincareconsultant/**/*.tsx",
      "skincareconsultant/**/*.js",
      "skincareconsultant/**/*.jsx",
    ],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
];

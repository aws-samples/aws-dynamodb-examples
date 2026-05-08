import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    files: ["**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        URL: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        fetch: "readonly",
      },
    },
    rules: {
      // Prefer explicit intent in this codebase (keeps PR noise low).
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
];


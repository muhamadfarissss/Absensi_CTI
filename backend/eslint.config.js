import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        process: "readonly",
        console: "readonly",
        global: "writable",
        setInterval: "readonly",
        clearInterval: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
      },
    },
    rules: {
      // Peringatan untuk variabel/import yang tidak digunakan
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_|next|err" }],
      // console.log/error diizinkan untuk backend logging
      "no-console": "off",
      // Preferensikan const daripada let jika tidak ada reassignment
      "prefer-const": "warn",
      // Tidak perlu eval
      "no-eval": "error",
    },
  },
  {
    ignores: ["node_modules/", "uploads/", "tests/"],
  },
];

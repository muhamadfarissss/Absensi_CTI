import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Peringatan untuk any types (tidak blocking build)
      "@typescript-eslint/no-explicit-any": "warn",
      // Peringatan untuk variabel yang tidak digunakan
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      // console diizinkan
      "no-console": "off",
    },
  },
  {
    ignores: ["dist/", "node_modules/"],
  }
);

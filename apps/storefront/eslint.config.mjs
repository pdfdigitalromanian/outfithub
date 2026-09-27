import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Medusa's HTTP types don't model every requested relation/field
      // (e.g. categories, calculated prices on nested fields), so narrow
      // `any` casts are used at those boundaries.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "public/sw.js", "playwright-report/**", "test-results/**"]),
]);

export default eslintConfig;

import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      // Generated Worker bundle. Linting it means linting a minified copy of
      // Next.js and every dependency.
      ".open-next/**",
      ".wrangler/**",
    ],
  },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    /**
     * The domain module carries stricter rules than the UI. CLAUDE.md §10.
     *
     * The purity rules are the interesting ones: `lib/ledger` takes time as an
     * argument and derives identifiers from a counter, which is what makes it
     * deterministic enough to property-test. These rules stop that eroding.
     * Converting a caller-supplied `nowMs` with `new Date(nowMs)` is still
     * allowed — it is only the zero-argument form that reads a clock.
     */
    files: ["lib/ledger/**/*.ts"],
    ignores: ["lib/ledger/__tests__/**"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message:
            "The ledger must not read the clock. Take nowMs as an argument instead.",
        },
        {
          selector:
            "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message:
            "The ledger must not read the clock. Take nowMs as an argument instead.",
        },
        {
          selector:
            "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message:
            "The ledger must be deterministic. Identifiers come from the state counter.",
        },
      ],
    },
  },
];

export default config;

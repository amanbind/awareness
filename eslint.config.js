const js = require("@eslint/js");
const globals = require("globals");
const security = require("eslint-plugin-security");
const noUnsanitized = require("eslint-plugin-no-unsanitized");

// Security plugins are configured as WARNINGS (not errors) so existing
// legitimate uses (e.g., the editor iframe restore in js/editor.js) don't
// break the `npm run verify` gate, but new code gets flagged immediately.
// See docs/SECURITY.md for the deferred work items these surface.
module.exports = [
  {
    ignores: [
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "dist/**",
      // Installed agent-skill tooling (e.g. the `impeccable` skill scripts);
      // not application source and not part of this project's lint surface.
      ".agents/**",
      "baseline-critical-path-audit-results.json",
    ],
  },
  js.configs.recommended,
  {
    files: ["*.js", "js/**/*.js", "scripts/**/*.js", "tests/**/*.js", "experiments/**/*.js"],
    plugins: {
      security,
      "no-unsanitized": noUnsanitized,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...globals.browser,
        ...globals.node,
        App: "readonly",
        QRCode: "readonly",
        JSZip: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", caughtErrors: "none" }],
      "no-undef": "error",
      "no-empty": "off",
      "no-irregular-whitespace": "off",
      "no-useless-assignment": "off",
      "no-useless-escape": "off",
      "preserve-caught-error": "off",
      // Security plugin — warnings only, never errors.
      "security/detect-eval-with-expression": "warn",
      "security/detect-non-literal-fs-filename": "off",
      "security/detect-non-literal-regexp": "off",
      "security/detect-non-literal-require": "off",
      "security/detect-object-injection": "off",
      "security/detect-possible-timing-attacks": "off",
      "security/detect-pseudoRandomBytes": "warn",
      "security/detect-unsafe-regex": "warn",
      "security/detect-buffer-noassert": "warn",
      "security/detect-child-process": "warn",
      "security/detect-disable-mustache-escape": "warn",
      "security/detect-new-buffer": "warn",
      "security/detect-no-csrf-before-method-override": "warn",
      // no-unsanitized — warnings only.
      "no-unsanitized/method": "warn",
      "no-unsanitized/property": "warn",
    },
  },
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", caughtErrors: "none" }],
      "no-useless-assignment": "off",
    },
  },
];


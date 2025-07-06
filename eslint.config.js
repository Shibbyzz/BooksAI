// Simple ESLint configuration for v9
export default [
  {
    ignores: [
      "node_modules/",
      ".next/",
      "dist/",
      "build/",
      "coverage/",
      "storybook-static/"
    ]
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      // Basic rules that should work without complex plugin setup
      "prefer-const": "error",
      "no-var": "error",
      "no-console": ["warn", { "allow": ["warn", "error"] }],
      "no-unused-vars": "off"
    }
  }
]; 
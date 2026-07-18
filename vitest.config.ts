import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/tests/**/*.test.ts", "src/architecture-tests/**/*.test.ts"],
    typecheck: {
      enabled: true,
      include: ["src/**/tests/**/*.test.ts", "src/architecture-tests/**/*.test.ts"],
    },
  },
});

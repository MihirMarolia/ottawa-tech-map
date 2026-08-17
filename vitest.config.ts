import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: [
      "src/**/tests/**/*.test.ts",
      "src/architecture-tests/**/*.test.ts",
      "src/application-tests/**/*.test.ts",
    ],
    typecheck: {
      enabled: false,
    },
    fileParallelism: false,
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
});

import { execSync } from "node:child_process";
import { rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const repoRoot = process.cwd();

function runBoundaries(): { exitCode: number; output: string } {
  try {
    const stdout = execSync("npm run lint:boundaries", {
      cwd: repoRoot,
      stdio: "pipe",
      encoding: "utf8",
    });
    return { exitCode: 0, output: stdout };
  } catch (error) {
    const execError = error as {
      status?: number;
      stdout?: string;
      stderr?: string;
    };
    return {
      exitCode: execError.status ?? 1,
      output: `${execError.stdout ?? ""}${execError.stderr ?? ""}`,
    };
  }
}

describe("dependency-cruiser boundary enforcement", () => {
  const probeId = `${process.pid}-${Date.now()}`;
  const deepImportProbe = join(
    repoRoot,
    `src/packages/privacy-gateway/tests/__dependency-cruiser-probe-${probeId}.ts`,
  );
  const webImportProbe = join(
    repoRoot,
    `src/apps/web/__dependency-cruiser-probe-${probeId}.ts`,
  );

  afterEach(async () => {
    await Promise.all(
      [deepImportProbe, webImportProbe].map((probe) =>
        rm(probe, { force: true }),
      ),
    );
  });

  it("passes on the clean repository", () => {
    const result = runBoundaries();
    expect(result.exitCode).toBe(0);
  });

  it("fails when a package test deep-imports its own lib/", async () => {
    try {
      await writeFile(
        deepImportProbe,
        [
          'import { PRIVACY_GATEWAY_IMPL_MARKER } from "../lib/impl-marker.js";',
          "void PRIVACY_GATEWAY_IMPL_MARKER;",
          "",
        ].join("\n"),
        "utf8",
      );

      const result = runBoundaries();
      expect(result.exitCode).not.toBe(0);
      expect(result.output).toContain("tests-through-entrypoints");
    } finally {
      await rm(deepImportProbe, { force: true });
    }
  });

  it("fails when web imports a privileged ingestion package", async () => {
    try {
      await writeFile(
        webImportProbe,
        [
          'import "../../packages/signal-ingestion/index.js";',
          "export {};",
          "",
        ].join("\n"),
        "utf8",
      );

      const result = runBoundaries();
      expect(result.exitCode).not.toBe(0);
      expect(result.output).toContain("forbidden-web-to-ingestion-import");
    } finally {
      await rm(webImportProbe, { force: true });
    }
  });
});

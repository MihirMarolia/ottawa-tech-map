import { execSync } from "node:child_process";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();

function runBoundaries(): { status: number; stderr: string } {
  try {
    execSync("npm run lint:boundaries", {
      cwd: repoRoot,
      stdio: "pipe",
      encoding: "utf8",
    });
    return { status: 0, stderr: "" };
  } catch (error) {
    const execError = error as { status?: number; stderr?: string };
    return {
      status: execError.status ?? 1,
      stderr: execError.stderr ?? "",
    };
  }
}

describe("dependency-cruiser boundary enforcement", () => {
  const deepImportProbe = join(
    repoRoot,
    "src/packages/privacy-gateway/tests/__probe-violation.ts",
  );
  const webImportProbe = join(repoRoot, "src/apps/web/__probe-violation.ts");

  afterEach(() => {
    for (const probe of [deepImportProbe, webImportProbe]) {
      if (existsSync(probe)) {
        unlinkSync(probe);
      }
    }
  });

  it("passes on the clean repository", () => {
    const result = runBoundaries();
    expect(result.status).toBe(0);
  });

  it("fails when a package test deep-imports its own lib/", () => {
    writeFileSync(
      deepImportProbe,
      [
        'import { PRIVACY_GATEWAY_IMPL_MARKER } from "../lib/impl-marker.js";',
        "void PRIVACY_GATEWAY_IMPL_MARKER;",
        "",
      ].join("\n"),
    );

    const result = runBoundaries();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("tests-through-entrypoints");
  });

  it("fails when web imports a privileged ingestion package", () => {
    writeFileSync(
      webImportProbe,
      [
        'import type { SignalIngestionService } from "../../packages/signal-ingestion/index.js";',
        "const _service: SignalIngestionService | undefined = undefined;",
        "void _service;",
        "",
      ].join("\n"),
    );

    const result = runBoundaries();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("web-cannot-import-privileged-modules");
  });
});

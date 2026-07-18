# Deep modules

Packages under `src/packages/` are **deep modules**: a lot of behaviour behind a small interface.

## Layout

```
src/packages/<name>/
  index.ts        ← entry point (public). Import this from outside.
  extraction.ts   ← optional additional entry point
  lib/            ← implementation (private — never import from outside)
  tests/          ← co-located tests (private except to other tests in tests/)
```

Import only through a package's **entry points** (root `.ts` files). Do not import from `lib/` or `tests/`.

**Discourage barrel files.** Expose several small entry points instead of re-exporting a whole subtree through one `index.ts`.

## Rules (enforced by dependency-cruiser)

1. **Entry-point boundary** — code outside a package may import only entry points, never subfolders.
2. **Intra-package freedom** — a package's own files import each other freely.
3. **Tests through entry points** — tests import packages only through entry points, never internals.
4. **No cycles** — no dependency cycles.
5. **Web isolation** — `src/apps/web/` must not import ingestion, scoring, or privileged database modules.

Run boundary checks:

```bash
npm run lint:boundaries
```

## Copy-me snippet

```typescript
// src/packages/example/index.ts
export type ExampleResult = { ok: true };

export interface ExampleGateway {
  run(input: string): ExampleResult;
}
```

```typescript
// src/packages/example/tests/example.test.ts
import type { ExampleGateway } from "../index.js";

it("accepts the public interface shape", () => {
  const gateway: ExampleGateway = {
    run: () => ({ ok: true }),
  };
  expect(gateway.run("x").ok).toBe(true);
});
```

## Five core modules

| Package | Entry seam |
|---------|------------|
| `privacy-gateway` | `PrivacyGateway` — sanitization trust boundary |
| `entity-resolver` | `EntityResolver` — Company identity resolution |
| `signal-ingestion` | `SignalIngestionService` — ingestion orchestration |
| `company-intelligence-scorer` | `CompanyIntelligenceScorer` — explainable scores |
| `institutional-import` | `InstitutionalImportService` — CSV import |

See `docs/architecture/deep-modules.md` for interface contracts.

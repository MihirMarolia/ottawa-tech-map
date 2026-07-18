# 01 — Scaffold deep modules and TypeScript project

**What to build:** A runnable TypeScript monorepo with dependency-cruiser boundary rules, an architecture-test harness, and the five deep-module packages exposing their public interfaces (no behaviour yet beyond type exports and stub tests).

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

**Feature spec:** `docs/features/government-contract-fixture-to-company-evidence.md`

- [ ] `dependency-cruiser` enforces entry-point-only imports across packages
- [ ] Packages exist for `privacy-gateway`, `entity-resolver`, `signal-ingestion`, `company-intelligence-scorer`, `institutional-import` with interfaces from `docs/architecture/deep-modules.md`
- [ ] Architecture tests exist for: frontend/service-role import ban (stub paths until apps exist), branded `SanitizedCorporateText` vs `RawSourceText` compile-time separation
- [ ] `check` script runs typecheck and `lint:boundaries`
- [ ] Example package pattern documented in `src/packages/README.md` and linked from CLAUDE.md

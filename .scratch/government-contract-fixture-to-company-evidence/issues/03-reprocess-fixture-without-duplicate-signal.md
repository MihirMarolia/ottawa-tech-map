# 03 — Reprocess fixture without duplicate Signal

**What to build:** Re-running ingestion on the same government contract fixture produces no duplicate Signal and reports a stable idempotent outcome.

**Blocked by:** 02 — Ingest contract fixture to Company profile evidence

**Status:** ready-for-agent

**Feature spec:** `docs/features/government-contract-fixture-to-company-evidence.md`

- [ ] Reprocessing the same fixture creates no duplicate Signal row
- [ ] Ingestion outcome indicates idempotent acceptance (same Signal, no second insert)
- [ ] Source deduplication is handled inside Signal Ingestion — callers do not implement dedup logic
- [ ] Test proves row count and Signal identity remain stable across two ingest calls

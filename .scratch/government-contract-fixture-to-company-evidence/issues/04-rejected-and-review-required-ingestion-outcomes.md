# 04 — Rejected and review-required ingestion outcomes

**What to build:** Ingestion reports `rejected` when sanitization cannot be verified, and `review_required` when entity resolution is ambiguous — without persisting an unsafe or unresolved Signal.

**Blocked by:** 02 — Ingest contract fixture to Company profile evidence

**Status:** ready-for-agent

**Feature spec:** `docs/features/government-contract-fixture-to-company-evidence.md`

- [ ] Fixture that fails Privacy Gateway verification yields `rejected` outcome and no Signal persisted
- [ ] Conflicting name/domain evidence yields `review_required` with candidates and reason; no Signal persisted until resolved
- [ ] Review-required records are routable to the Review Queue surface (minimal operator list entry is sufficient)
- [ ] No raw or unsafe content appears in logs or persisted rows for rejected cases

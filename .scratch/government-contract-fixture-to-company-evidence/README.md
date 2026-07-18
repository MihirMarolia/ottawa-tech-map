# Government Contract Fixture to Company Evidence

Parent feature spec: `docs/features/government-contract-fixture-to-company-evidence.md`

## Tickets (dependency order)

| # | Title | Blocked by |
|---|-------|------------|
| 01 | Scaffold deep modules and TypeScript project | — |
| 02 | Ingest contract fixture to Company profile evidence | 01 |
| 03 | Reprocess fixture without duplicate Signal | 02 |
| 04 | Rejected and review-required ingestion outcomes | 02 |

## Frontier

**Start with ticket 01.** Tickets 03 and 04 can run in parallel after 02 completes.

## Tracker note

Published locally under `.scratch/` because `gh` is not available in this environment. To publish to GitHub Issues, install the GitHub CLI and re-run `/to-tickets` or create issues manually with native blocking links.

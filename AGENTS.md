# AGENTS.md

Shared agent instructions for this repository. Applies to Codex, Claude, Cursor, and any other coding agent working here.

## Terminology

Use the exact terminology in `docs/domain/ubiquitous-language.md`.
Do not introduce synonyms for defined domain concepts.

## Agent skills

### Issue tracker

Issues live in GitHub Issues; use the `gh` CLI for all operations. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles using default label strings (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — `CONTEXT.md` at the repo root, ADRs under `docs/architecture/decisions/`. See `docs/agents/domain.md`.

### Deep modules

Five deep modules hide core complexity — see `docs/architecture/deep-modules.md` and `src/packages/README.md` before adding or importing a package.

### Implementation

Tracer-bullet tickets use the brief in `docs/agents/implementation-brief.md`.

## Definition of Done

A ticket is not complete unless:

- every acceptance criterion has a corresponding test or explicit verification
- targeted tests pass
- complete test suite passes
- TypeScript strict typecheck passes
- production build passes
- no dependency version changed
- no new use of `any` exists
- no unresolved TODO was introduced
- no raw or personal source content appears in logs, fixtures, or snapshots
- all new domain concepts appear in the ubiquitous language
- all intelligence outputs retain evidence provenance
- the feature can be demonstrated through its intended entry point
- changed files and deviations are reported

Do not accept "implemented successfully" as evidence.

## Multi-agent tool policy

This repository may be accessed by multiple AI development environments,
including Codex, Cursor, Lovable, Bolt, Replit, and Manus.

GitHub is the canonical source of truth.

### Tool roles

| Tool | Job | Authority |
|------|-----|-----------|
| **Codex** | Architecture, core implementation, refactoring, tests | Highest |
| **Cursor** | Local development, debugging, surgical edits | High |
| **Lovable** | UI/product experiments, layouts, interaction prototypes | Medium |
| **Bolt** | Disposable prototypes, alternative UI concepts, proof-of-concept frontend | Medium |
| **Replit** | Isolated experiments, demonstrations, temporary prototypes | Medium/Low |
| **Manus** | Research, data gathering, source collection, dataset preparation, documentation | Low for core code |
| **GitHub** | Source control, tickets, PRs, history | Single source of truth |

### Promotion rule

Experiments created in Lovable, Bolt, or Replit are **prototypes** until explicitly promoted.

Prototype code must be reviewed before entering the canonical repository.

The canonical repository determines:
- architecture
- domain contracts
- database schema
- API contracts
- testing requirements
- production behavior

### No parallel production editing

Only **one** agent may own an implementation task at a time.

Do not simultaneously modify the same production branch from multiple tools.

If two tools need to work on related areas, they must use separate branches and merge through GitHub.

### Prototype-to-production flow

```text
Idea → Prototype (Lovable/Bolt/Replit) → Evaluate → GitHub Issue
→ Specification → Implementation (Codex/Cursor) → Tests → PR → Review → Merge
```

Never: Idea → AI generates application → overwrite production repository.

### Architectural authority

AI-generated code does not override existing architecture.

Before adopting generated code, verify:
- domain boundaries
- interfaces
- persistence contracts
- security model
- test requirements
- dependency constraints

The fastest implementation is not necessarily the correct implementation.

### Evidence over inference

No inferred company intelligence may be persisted as fact.
Every factual company attribute must have attributable evidence.
Derived signals must identify the underlying evidence and methodology.
Inferences must be explicitly classified as inferences, confidence-scored, and must never overwrite factual company records.

### Public Data Boundary

Client-facing applications and prototypes must consume approved privacy-safe Supabase projections or controlled read functions, never internal tables directly. They must not request broader anonymous privileges as a convenience. Privileged ingestion, setup, and apply operations require the controlled ingestion client; the public client is limited to approved read contracts. If a required public field is unavailable, propose the smallest new privacy-safe projection or controlled read contract with tests; do not broaden base-table grants as a shortcut.

### External agent boundary

External AI development platforms may inspect and prototype against this repository, but no external agent may introduce architectural, schema, persistence, security, or domain-contract changes without following the repository's defined implementation workflow.

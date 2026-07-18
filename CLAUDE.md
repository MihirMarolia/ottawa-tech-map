# CLAUDE.md

Instructions for Claude Code when working in this repository.

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

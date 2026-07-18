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

Single-context layout — `CONTEXT.md` at the repo root, ADRs under `docs/adr/`. See `docs/agents/domain.md`.

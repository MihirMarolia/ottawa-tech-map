# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root — an index into the layered docs under `docs/`. Start here, then follow the link most relevant to your task.
- **`docs/architecture/decisions/`** — read ADRs that touch the area you're about to work in. (This repo uses `docs/architecture/decisions/` rather than `docs/adr/`; both are accepted by the skills.)
- **`docs/ENGINEERING.md`** — the engineering constitution. Every change is reviewed against its seven principles.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

Single-context repo (most repos):

```
/
├── CONTEXT.md
├── docs/
│   ├── vision/
│   ├── domain/
│   ├── architecture/
│   │   └── decisions/
│   ├── features/
│   ├── agents/
│   └── out-of-scope/
└── src/
```

Multi-context repo (presence of `CONTEXT-MAP.md` at the root):

```
/
├── CONTEXT-MAP.md
├── docs/architecture/decisions/      ← system-wide decisions
└── src/
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── docs/architecture/decisions/  ← context-specific decisions
    └── billing/
        ├── CONTEXT.md
        └── docs/architecture/decisions/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_

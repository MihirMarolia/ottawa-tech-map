# AGENTS.md

Shared agent instructions for this repository. Applies to Codex, Claude, Cursor, and any other coding agent working here.

## Source of truth

GitHub is the canonical source of truth for the project. Local agent state, chat history, generated files, and external workspaces must not override the repository state.

Before making changes:

1. Fetch/pull the latest repository state.
2. Read this file.
3. Read the relevant ticket/specification.
4. Inspect the current implementation before modifying it.

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

## Multi-agent tool policy

This repository may be accessed by Codex, Cursor, Lovable, Bolt, Replit, Manus, Claude, and other AI development environments.

### Tool roles

**Codex — primary implementation agent**

Use for domain implementation, backend implementation, database integration, architecture-sensitive changes, tests, and refactoring. Codex normally owns implementation tickets.

**Cursor — local engineering environment**

Use for debugging, investigation, small fixes, local testing, and targeted implementation. Cursor must follow the same repository architecture and ticket boundaries.

**Lovable — UI prototyping environment**

Use primarily for UI exploration, layouts, interaction prototypes, and frontend experimentation. Lovable-generated changes must not redefine domain architecture, database architecture, or application contracts. Promote useful UI work into the canonical repository only after review.

**Bolt — rapid prototyping environment**

Use primarily for disposable prototypes, alternative UI concepts, interaction experiments, and proof-of-concept frontend work. Bolt output must not automatically become production architecture.

**Replit — experimental/demo environment**

Use for isolated experiments, demonstrations, temporary prototypes, and testing ideas before committing them to the canonical repository. Do not use Replit as an independent source of truth for production code.

**Manus — research and analysis agent**

Use for market research, company research, source collection, dataset preparation, competitive research, documentation, and exploratory analysis. Manus should not independently alter production architecture.

### Prototype promotion rule

Experiments created in Lovable, Bolt, or Replit are considered **PROTOTYPES** until explicitly promoted.

The canonical repository determines architecture, domain contracts, database schema, API contracts, testing requirements, and production behavior.

Preferred flow:

`Idea → Prototype → Evaluate → Ticket → Specification → Implementation → Tests → Pull Request → Review → Merge`

Do not overwrite production code with generated prototype output without review.

### Single active implementation owner

One implementation task = one branch = one primary implementing agent.

Never have two agents independently modify the same production branch at the same time.

If another tool needs to work on a related area, use a separate branch and merge through GitHub.

Before editing, an agent must identify the current branch, current commit, relevant ticket/specification, intended files, and whether another agent owns the task.

If ownership is unclear, stop and report the conflict rather than overwriting work.

### Ticket discipline

Do not implement speculative features. Every production implementation change must correspond to an existing ticket, approved specification, or explicitly authorized task.

Prefer the smallest change that satisfies the requirement. Do not silently expand scope.

### Architecture authority

AI-generated code does not override existing architecture. Before adopting generated code, verify domain boundaries, interfaces, persistence contracts, security model, test requirements, and dependency constraints.

Do not bypass application services or persistence interfaces merely because a direct implementation is faster.

Before introducing a new abstraction, verify that an existing abstraction cannot satisfy the requirement.

### Database

Database schema changes must be migration-based, reproducible from a clean database, and tested independently. Prefer additive changes. Never modify production data manually as part of development.

### Git safety

Agents must not force-push, rewrite shared history, delete another agent's branch, or reset/discard another agent's uncommitted work.

Never commit unrelated changes. Before committing, inspect `git status`, `git diff`, and `git diff --cached`.

### Handoff

When an agent finishes work, it must report:

- branch
- commit
- files changed
- tests run
- tests passed/failed
- known deviations
- remaining work
- whether the branch is ready for review

### Conflict protocol

If another agent has modified the same files or architectural area, do not blindly merge or overwrite. Determine whether the changes are complementary, conflicting, obsolete, or superseded. Ask for coordination when ownership cannot be determined.

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

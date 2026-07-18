# Implementation brief template

Use this pattern when assigning a tracer-bullet ticket to an implementation agent.

```
Implement GitHub issue #NN (or `.scratch/<feature>/issues/NN-<slug>.md`).

Read:
- CLAUDE.md (or AGENTS.md)
- docs/domain/ubiquitous-language.md
- the linked feature specification
- all files explicitly referenced in the issue

Before editing:
1. restate the acceptance criteria in at most eight lines
2. identify the deep-module interface being changed
3. identify the tests that will prove the behaviour

Implementation rules:
- use TDD
- change only files necessary for this tracer bullet
- do not update dependencies
- do not add synonyms for defined domain concepts
- do not calculate intelligence scores in UI components
- do not bypass the Privacy Gateway
- do not persist unproven Company Facts
- do not reverse an accepted ADR — propose a superseding ADR instead
- stop if the specification contradicts the codebase

Completion:
- run targeted tests
- run typecheck
- run full tests
- run build
- list changed files
- state any deviations
```

Do not accept "implemented successfully" as evidence. See Definition of Done in CLAUDE.md.

## Review authority (Claude)

After an implementation diff is produced, review against the issue acceptance criteria, feature spec, ubiquitous language, CLAUDE.md, and ADRs — in this order:

1. Does it implement the correct domain behaviour?
2. Does it preserve the deep-module boundary?
3. Can unsafe or unproven data cross a trust boundary?
4. Are tests asserting behaviour rather than implementation detail?
5. Is the change idempotent (when applicable)?
6. Is every intelligence claim traceable to evidence?
7. Has unnecessary abstraction been added?
8. Are names consistent with the ubiquitous language?

Return only: blockers, high-severity findings, optional improvements, verdict (merge or do not merge). Do not edit the diff during review.

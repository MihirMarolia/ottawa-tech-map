# Engineering Constitution

Living reference for code review and architectural decisions. If a change violates a principle below, it must be justified in the PR description.

---

## 1. Modularity

- Every module has **one responsibility** and a **typed public interface**.
- Modules expose only their public API. No importing from another module's `internal/`, private helpers, or implementation files.
- Cross-module communication goes through defined interfaces (types, functions, events)—never through shared mutable state.

**Review check:** Can this import be replaced with a public export? If not, the dependency belongs inside the module.

---

## 2. Data Flow

Data moves **unidirectionally**. No step mutates output from a prior step in place.

```
collectors → validators → enrichers → agent actions → approval → apply
   (raw)      (confidence)  (proposals)   (audit log)   (human/auto)
```

| Stage | Responsibility |
|-------|----------------|
| **Collectors** | Ingest raw signals from external sources |
| **Validators** | Assign confidence scores; flag anomalies |
| **Enrichers** | Propose field updates; never write directly |
| **Agent actions** | Log proposals to the audit trail |
| **Approval** | Human or automated gate before any production write |
| **Apply** | Persist approved changes only |

**Review check:** Does this function mutate data it received from an upstream stage? Refactor to return new objects.

---

## 3. Dependency Justification

- Every package in `package.json` requires a **one-line comment** explaining why it is included.
- No "nice to have" or speculative dependencies.
- Prefer stdlib and existing project utilities before adding a package.
- Remove unused dependencies in the same PR that stops using them.

**Review check:** Is there a comment? Could native APIs or an existing dependency cover this?

---

## 4. Database as Source of Truth

- Application logic stays **thin**. Orchestrate; do not embed business rules in service code.
- Business rules live in **constraints, triggers, and views** where possible.
- The service layer coordinates reads/writes; it does not hold hidden policy.
- Schema changes require a migration in `supabase/migrations/`.

**Review check:** Is this rule enforceable in SQL? If yes, it belongs in the database.

---

## 5. Agent First

- The agent is a **first-class system component** with its own schema, audit trail, and processing queue.
- The agent **proposes**; it never directly mutates production data.
- Every agent-driven change requires an **audit log entry** before application.
- Agent tables and queues are versioned and migrated like any other schema.

**Review check:** Does this write bypass the proposal → audit → approval path?

---

## 6. Search Readiness

- Every schema design must consider **full-text search** from day one.
- Every stored signal must be **queryable** (indexed, typed, filterable).
- The system is a **search engine that renders a map**—not a map with search bolted on.
- New entities need: searchable text fields, appropriate indexes, and a documented query pattern.

**Review check:** Can a user find this record by keyword, filter, or geo query without a full table scan?

---

## 7. Stability Over Velocity

- Code is written once and read many times. **Clarity beats brevity.**
- **TypeScript strict mode** is enabled everywhere. No `@ts-ignore` without a linked issue and expiry.
- Prefer explicit types over `any`. Prefer named constants over magic values.
- Breaking changes require a migration plan and changelog entry.

**Review check:** Would a new contributor understand this in five minutes? Is strict mode satisfied?

---

## Enforcement

| Principle | Primary owner in review |
|-----------|---------------------------|
| Modularity | Module author + consumer |
| Data flow | Agent pipeline reviewer |
| Dependencies | PR author (comment in `package.json`) |
| Database truth | Schema/migration reviewer |
| Agent first | Agent service reviewer |
| Search readiness | Schema + API reviewer |
| Stability | All reviewers |

Violations block merge unless the PR documents a deliberate exception and a follow-up issue to reconcile.

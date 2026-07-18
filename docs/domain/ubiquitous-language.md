# Ubiquitous Language

The shared vocabulary used across code, docs, issues, and conversation. Use these terms exactly; do not drift to synonyms.

## Core nouns

- **Signal** — a raw observation from an external source (a news mention, a job posting, a tweet, a filing). Signals are immutable once written.
- **Entity** — a real-world thing the map cares about: a **Company**, **Person**, **Product**, or **Location**. Entities have stable IDs and resolve across multiple signals.
- **Proposal** — a structured suggestion to create or update a field on an Entity, produced by an enricher. Never applied directly.
- **Audit entry** — the persisted record of a proposal being made, evaluated, and either approved or rejected. Every agent-driven change has one.
- **Approval** — the gate (human or automated) between a proposal and a production write.
- **Apply** — the only path that mutates production data. Runs after approval.

## Pipeline stages

```
collectors → validators → enrichers → agent actions → approval → apply
   (raw)      (confidence)  (proposals)   (audit log)   (human/auto)
```

- **Collector** — ingests raw signals from external sources.
- **Validator** — assigns a confidence score to a signal; flags anomalies.
- **Enricher** — proposes field updates from validated signals; never writes directly.
- **Agent action** — logs proposals to the audit trail.
- **Approval** — human or automated gate before any production write.
- **Apply** — persists approved changes only.

## Properties

- **Confidence** — a number attached to a signal or proposal by a validator, used by the approval gate.
- **Provenance** — the upstream source of a signal, preserved end-to-end so any rendered pin can be traced back.
- **Search readiness** — a schema property: a record is searchable when it has indexed text fields, typed attributes, and a documented query pattern.

## Roles

- **Maintainer** — evaluates `needs-triage` issues.
- **Reporter** — supplies information for `needs-info` issues.
- **AFK agent** — implements `ready-for-agent` issues without interactive human input.

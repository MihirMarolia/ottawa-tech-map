# Ingestion Pipeline

The agent-driven data flow. Mirrors the data-flow principle in `docs/ENGINEERING.md`.

## Stages

```
collectors → validators → enrichers → agent actions → approval → apply
   (raw)      (confidence)  (proposals)   (audit log)   (human/auto)
```

### Collectors
- Pull raw signals from external sources on a schedule or webhook.
- Write the raw payload + provenance (see `docs/domain/signal-provenance.md`) to the `signals` table.
- Never interpret the payload — that's a validator's job.

### Validators
- Read raw signals, assign a confidence score (see `docs/domain/scoring.md`).
- Flag anomalies (e.g. a Company with no domain, a Person with a personal email).
- Write `validated_signals` rows. Do not mutate the original `signals` row.

### Enrichers
- Read validated signals, propose field updates on Entities.
- Write `proposals` rows. **Never write directly to Entity tables.**
- May also propose entity-resolution merges (see `docs/domain/entity-resolution.md`).

### Agent actions
- Log proposals to the audit trail (`audit_entries`).
- For auto-approvable proposals, set `auto_approved = true` and the rule that fired.
- For human-approvable proposals, leave `approved = null` and surface to the approver.

### Approval
- Human approver reviews pending proposals; sets `approved = true/false` with a comment.
- Automated rules (confidence ≥ threshold, non-identity field) auto-approve without human input.
- No proposal is applied without an approval decision.

### Apply
- Reads approved proposals in order, applies them to Entity tables inside a transaction.
- Writes `applied_at`, `applied_by` (code version), and the audit entry ID to the Entity row's field metadata.
- On failure, the proposal is marked `apply_failed` with the error; the Entity is untouched.

## Invariants

- **Unidirectional**: no stage mutates the output of a prior stage in place. Each stage writes new rows.
- **Auditable**: every applied change has a chain back to its proposals and signals.
- **Replayable**: because raw signals are immutable, we can re-run validators and enrichers against history after a code change.

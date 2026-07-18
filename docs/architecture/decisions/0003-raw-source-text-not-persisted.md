# ADR-0003: Raw source text does not enter persistent storage

Date: 2026-07-18
Status: Accepted

## Context

Corporate sources may contain personal contact information or candidate-facing metadata. The intelligence platform requires firmographic evidence but does not require persistent raw source content.

`docs/domain/privacy-boundary.md` forbids collecting personal contact info and login-gated content. `docs/domain/ubiquitous-language.md` defines a **Source Document** as a privacy-sanitized representation — raw unsanitized source content must not be persisted as a Source Document.

## Decision

Raw source content is processed only in a short-lived ingestion boundary.

Only privacy-sanitized source documents may be persisted or sent to an enrichment model.

Provenance stores source metadata and content hashes — not raw bytes.

## Rationale

- Persistent raw payloads create an unbounded privacy liability and contradict the privacy boundary.
- Sanitized content is sufficient for replay of validators and enrichers when combined with source metadata and schema version.
- A fail-closed sanitization gate (`PrivacyGateway.assertSafe`) makes unsafe persistence a compile-time and runtime impossibility.

## Consequences

- Ingestion must fail closed when sanitization cannot be verified.
- Debugging cannot rely on raw production payloads; use synthetic sanitized fixtures.
- Evidence excerpts require a second privacy scan before display.
- Test fixtures, logs, and snapshots must contain only sanitized content.

## Agent instruction

Do not reverse this ADR inside a feature ticket. Propose a new superseding ADR instead.

## Revisit trigger

A proven operational need for encrypted, access-controlled raw retention with explicit legal review — requires a new ADR and privacy-boundary update.

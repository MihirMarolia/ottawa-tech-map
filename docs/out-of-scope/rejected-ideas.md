# Out of Scope

Explicitly rejected ideas. Each entry says what was rejected, why, and what would make us revisit.

## A generic LLM chatbot over the data

**Rejected**: the product is a search engine that renders a map, not a chatbot. A chat interface invites ungrounded answers; our value is provenance and auditability.

**Revisit if**: a chat UX can be built that only ever answers from approved proposals with linked provenance, and there's user demand we can't meet with search.

## Auto-mutation without an approval gate

**Rejected**: every agent-driven change requires an audit log entry before application (engineering constitution, principle 5). Removing the gate destroys the audit chain.

**Revisit if**: a class of changes is provably safe to apply without approval (e.g. a fully-trusted internal source) — would be a new ADR carving out a fast path, not a removal of the gate.

## A map-first product

**Rejected**: the map is a rendering surface, not the product. Building the map first inverts the dependency and leads to schema decisions that hurt search readiness.

**Revisit if**: never — this is the thesis, not a tactic.

## Collecting private individual data

**Rejected**: see `docs/domain/privacy-boundary.md`. Personal contact info, family, relationships, and anything behind a login are out of bounds.

**Revisit if**: never for the categories listed there. New categories require a privacy-boundary update and a legal review.

## A separate search cluster (Elasticsearch / OpenSearch)

**Rejected**: see ADR-0001. Postgres FTS + PostGIS serves our query patterns at expected scale.

**Revisit if**: a user-facing query can't be served without a full table scan at expected data volume.

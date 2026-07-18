# Deep Modules

Five deep modules hide the system's hardest complexity behind small, stable interfaces. Callers import only package entry points — see `src/packages/README.md` once scaffolded.

Do not add deep modules for formatters, badge components, or thin database mappers. The goal is maximum hidden complexity behind minimum stable surface area.

## A. Privacy Gateway

```typescript
export interface PrivacyGateway {
  sanitize(input: CorporateSourceInput): SanitizationResult;
  assertSafe(result: SanitizationResult): SanitizedCorporateText;
}
```

Complexity hidden inside: email removal, phone removal, social-profile detection, applicant URL filtering, name-risk detection, redaction reporting, versioning, logging restrictions.

The rest of the application must not know how those rules work. See ADR-0003.

## B. Entity Resolver

```typescript
export interface EntityResolver {
  resolve(input: CompanyReference): Promise<EntityResolutionResult>;
}
```

```typescript
type EntityResolutionResult =
  | {
      status: "resolved";
      companyId: CompanyId;
      resolutionMethod: ResolutionMethod;
      confidence: number;
    }
  | {
      status: "new_company";
      proposedCompany: ProposedCompany;
    }
  | {
      status: "review_required";
      candidates: ResolutionCandidate[];
      reason: ReviewReason;
    };
```

The ingestion pipeline must not manipulate aliases, domains, similarity scores, or merge rules directly.

## C. Signal Ingestion

```typescript
export interface SignalIngestionService {
  ingest(command: IngestCorporateSource): Promise<IngestionOutcome>;
}
```

Hides: source deduplication, privacy sanitization, extraction, schema validation, entity resolution, persistence, audit events, score recalculation, review creation.

One stable method represents a large amount of functionality. This is the primary seam for ingestion tracer bullets.

## D. Intelligence Scoring

```typescript
export interface CompanyIntelligenceScorer {
  calculate(
    companyId: CompanyId,
    evidence: CompanyEvidenceSet
  ): Promise<ExplainableCompanyScore>;
}
```

```typescript
type ExplainableCompanyScore = {
  score: number;
  version: string;
  components: ScoreComponent[];
  penalties: ScorePenalty[];
  evidenceSignalIds: SignalId[];
  calculatedAt: string;
};
```

UI code must never calculate score weights. Every component must retain evidence (see architecture tests).

## E. Institutional CSV Import

```typescript
export interface InstitutionalImportService {
  inspect(file: ImportFile): Promise<ImportInspection>;
  preview(mapping: ColumnMapping): Promise<ImportPreview>;
  commit(previewId: PreviewId): Promise<ImportOutcome>;
}
```

Keeps CSV parsing, validation, field mapping, review creation, and bulk upserts out of React components.

## Interface-first TDD

For each ticket, establish the outer contract before implementing internals. Tests assert behaviour through the public interface — not internal helpers.

Implementation rules per ticket:

- Implement the minimum code required to pass the tests.
- Do not broaden the interface.
- Do not add capability until a failing test requires it.
- Do not alter expected result types.

The human-owned artifact is the contract, not the generated implementation.

## Architecture tests

Core engineering rules are executable, not prose-only. Examples:

- Frontend cannot import service-role code or intelligence-service internals.
- LLM and enricher code accept only `SanitizedCorporateText`, never `RawSourceText` (branded types enforce this at compile time).
- Every score component lists `evidenceSignalIds`; empty evidence is invalid.
- Signals require provenance at the database level (`source_id UUID NOT NULL REFERENCES sources(id)`).

These guardrails stop agents from quietly bypassing the architecture.

import { createHash } from "node:crypto";
import { createExactCanonicalDomainEntityResolver, type Company } from "../../entity-resolver/index.js";
import { createPrivacyGateway, type SanitizedCorporateText } from "../../privacy-gateway/index.js";
import type { EmploymentType, ExternalReference, IngestionOutcome, JobPostingFixture, JobPostingSignal, ReviewQueueItemId, SignalId, Source, SourceId } from "../index.js";
import type { JobPostingEvidenceQuery, JobPostingFixtureApplication } from "../job-posting-application.js";

type JobPostingSourceDocument = {
  companyName: string; companyDomain: string; jurisdiction: string;
  jobTitle: string; location: string; postingDate: string; technologies: string[];
  securityClearanceRequired: boolean; bilingualRequired: boolean;
  employmentType: EmploymentType; expansionEvidence: boolean;
  observedAt: string; confidence: number; schemaVersion: "job-posting-signal/v1";
  externalReference: ExternalReference | null;
};

const EMPLOYMENT_TYPES = new Set<EmploymentType>(["full_time", "part_time", "contract", "temporary", "unknown"]);
const EXTERNAL_REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseSourceDocument(text: SanitizedCorporateText):
  | { status: "valid"; value: JobPostingSourceDocument }
  | { status: "invalid"; reason: "invalid_source_document" | "invalid_external_reference" } {
  try {
    const value: unknown = JSON.parse(text);
    if (typeof value !== "object" || value === null) return { status: "invalid", reason: "invalid_source_document" };
    const candidate = value as Record<string, unknown>;
    const externalReference = candidate.externalReference;
    if (externalReference !== null && externalReference !== undefined &&
      (typeof externalReference !== "string" || !EXTERNAL_REFERENCE_PATTERN.test(externalReference))) {
      return { status: "invalid", reason: "invalid_external_reference" };
    }
    if (
      typeof candidate.companyName !== "string" || candidate.companyName.trim() === "" ||
      typeof candidate.companyDomain !== "string" || candidate.companyDomain.trim() === "" ||
      typeof candidate.jurisdiction !== "string" || candidate.jurisdiction.trim() === "" ||
      typeof candidate.jobTitle !== "string" || candidate.jobTitle.trim() === "" ||
      typeof candidate.location !== "string" || candidate.location.trim() === "" ||
      typeof candidate.postingDate !== "string" || !ISO_DATE_PATTERN.test(candidate.postingDate) ||
      !Array.isArray(candidate.technologies) || !candidate.technologies.every((item) => typeof item === "string" && item.trim() !== "") ||
      typeof candidate.securityClearanceRequired !== "boolean" ||
      typeof candidate.bilingualRequired !== "boolean" ||
      typeof candidate.employmentType !== "string" || !EMPLOYMENT_TYPES.has(candidate.employmentType as EmploymentType) ||
      typeof candidate.expansionEvidence !== "boolean" ||
      typeof candidate.observedAt !== "string" || !ISO_DATE_PATTERN.test(candidate.observedAt) ||
      typeof candidate.confidence !== "number" || candidate.confidence < 0 || candidate.confidence > 1 ||
      candidate.schemaVersion !== "job-posting-signal/v1"
    ) return { status: "invalid", reason: "invalid_source_document" };
    return { status: "valid", value: {
      companyName: candidate.companyName, companyDomain: candidate.companyDomain.toLowerCase(),
      jurisdiction: candidate.jurisdiction, jobTitle: candidate.jobTitle, location: candidate.location,
      postingDate: candidate.postingDate, technologies: [...candidate.technologies] as string[],
      securityClearanceRequired: candidate.securityClearanceRequired, bilingualRequired: candidate.bilingualRequired,
      employmentType: candidate.employmentType as EmploymentType, expansionEvidence: candidate.expansionEvidence,
      observedAt: candidate.observedAt, confidence: candidate.confidence, schemaVersion: "job-posting-signal/v1",
      externalReference: externalReference == null ? null : externalReference as ExternalReference,
    }};
  } catch { return { status: "invalid", reason: "invalid_source_document" }; }
}

function normalizeSourceUrl(sourceUrl: string): string {
  const url = new URL(sourceUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("invalid URL");
  url.hash = ""; url.hostname = url.hostname.toLowerCase(); url.pathname = url.pathname.replace(/\/$/, "");
  return url.toString();
}
const hash = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");

export function createJobPostingFixtureApplication(input: { companies: ReadonlyArray<Company> }): JobPostingFixtureApplication {
  const companies = [...input.companies];
  const resolver = createExactCanonicalDomainEntityResolver(companies);
  const privacyGateway = createPrivacyGateway();
  const sourcesByIdentity = new Map<string, Source>();
  const signalsByFingerprint = new Map<string, JobPostingSignal>();
  const companyEvidenceQuery: JobPostingEvidenceQuery = {
    async findCompanyProfile(companyId) {
      const company = companies.find((candidate) => candidate.id === companyId);
      if (!company) return null;
      const evidence = [...signalsByFingerprint.values()].filter((signal) => signal.companyId === companyId).map((signal) => {
        const source = [...sourcesByIdentity.values()].find((candidate) => candidate.id === signal.sourceId);
        if (!source) throw new Error("Signal provenance Source is missing");
        const { companyId: _companyId, sourceId: _sourceId, ...item } = signal;
        return { ...item, source: { id: source.id, name: source.name, url: source.url } };
      });
      return { company, evidence };
    },
  };
  return {
    companyEvidenceQuery,
    inspectInMemoryPersistence: () => ({ companyCount: companies.length, sourceCount: sourcesByIdentity.size, signalCount: signalsByFingerprint.size, evidenceCount: signalsByFingerprint.size }),
    async ingestJobPostingFixture(fixture: JobPostingFixture): Promise<IngestionOutcome> {
      const sanitized = privacyGateway.sanitize({ rawText: fixture.rawText, sourceUrl: fixture.source.url });
      let sanitizedText: SanitizedCorporateText;
      try { sanitizedText = privacyGateway.assertSafe(sanitized); }
      catch { return { status: "rejected", reason: "privacy_rejected" }; }
      const parsed = parseSourceDocument(sanitizedText);
      if (parsed.status === "invalid") return { status: "rejected", reason: parsed.reason };
      if (parsed.value.observedAt !== fixture.observedAt) return { status: "rejected", reason: "invalid_source_document" };
      let normalizedUrl: string;
      try { normalizedUrl = normalizeSourceUrl(fixture.source.url); }
      catch { return { status: "rejected", reason: "invalid_source_url" }; }
      const resolution = await resolver.resolve({ observedName: parsed.value.companyName, observedDomain: parsed.value.companyDomain, jurisdiction: parsed.value.jurisdiction });
      if (resolution.status !== "resolved") {
        const reason = resolution.status === "review_required" ? resolution.reason : "low_confidence";
        return { status: "review_required", reviewItemId: `review:${hash(normalizedUrl).slice(0, 24)}` as ReviewQueueItemId, reason, candidates: resolution.status === "review_required" ? resolution.candidates : [] };
      }
      const contentHash = hash(String(sanitizedText).replace(/\r\n?/g, "\n").trim());
      const sourceIdentity = `${normalizedUrl}|${contentHash}`;
      let source = sourcesByIdentity.get(sourceIdentity);
      if (!source) {
        source = { id: `source:${hash(sourceIdentity).slice(0, 24)}` as SourceId, name: fixture.source.name, url: fixture.source.url, contentHash };
        sourcesByIdentity.set(sourceIdentity, source);
      }
      const discriminator = parsed.value.externalReference?.trim() ?? [parsed.value.jobTitle.toLowerCase().trim(), parsed.value.location.toLowerCase().trim(), parsed.value.postingDate].join("|");
      const fingerprint = hash(JSON.stringify({ companyId: resolution.companyId, signalType: "job_posting_observed", sourceId: source.id, observedDate: parsed.value.observedAt, externalReference: parsed.value.externalReference?.trim() ?? null, discriminator: parsed.value.externalReference === null ? discriminator : null }));
      const existing = signalsByFingerprint.get(fingerprint);
      if (existing) return { status: "accepted", disposition: "already_processed", companyId: existing.companyId, sourceId: existing.sourceId, signalId: existing.id };
      const signal: JobPostingSignal = {
        id: `signal:${fingerprint.slice(0, 24)}` as SignalId, sourceId: source.id, companyId: resolution.companyId,
        signalType: "job_posting_observed", jobTitle: parsed.value.jobTitle, location: parsed.value.location,
        postingDate: parsed.value.postingDate, technologies: parsed.value.technologies,
        securityClearanceRequired: parsed.value.securityClearanceRequired, bilingualRequired: parsed.value.bilingualRequired,
        employmentType: parsed.value.employmentType, expansionEvidence: parsed.value.expansionEvidence,
        observedAt: parsed.value.observedAt, confidence: parsed.value.confidence, schemaVersion: parsed.value.schemaVersion,
        externalReference: parsed.value.externalReference,
      };
      signalsByFingerprint.set(fingerprint, signal);
      return { status: "accepted", disposition: "created", companyId: signal.companyId, sourceId: signal.sourceId, signalId: signal.id };
    },
  };
}

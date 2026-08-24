import type { Company, CompanyId } from "../../entity-resolver/index.js";
import type { CompanyEvidenceQuery, CompanyProfile, CompanySearchQuery } from "../company-evidence.js";
import type {
  ExternalReference,
  GovernmentContractSignal,
  ReviewQueueItem,
  ReviewQueueItemId,
  SignalId,
  Source,
  SourceId,
} from "../index.js";

export class InMemoryCompanyRepository {
  constructor(private readonly companies: ReadonlyArray<Company>) {}

  findById(companyId: CompanyId): Company | undefined {
    return this.companies.find((company) => company.id === companyId);
  }

  all(): ReadonlyArray<Company> {
    return [...this.companies];
  }
}

export class InMemorySourceRepository {
  private readonly sources = new Map<SourceId, Source>();

  save(source: Source): void {
    this.sources.set(source.id, source);
  }

  findById(sourceId: SourceId): Source | undefined {
    return this.sources.get(sourceId);
  }

  findByIdentity(normalizedUrl: string, contentHash: string): Source | undefined {
    return [...this.sources.values()].find(
      (source) =>
        normalizeSourceUrl(source.url) === normalizedUrl &&
        source.contentHash === contentHash,
    );
  }

  all(): ReadonlyArray<Source> {
    return [...this.sources.values()];
  }
}

export class InMemorySignalRepository {
  private readonly signals = new Map<SignalId, GovernmentContractSignal>();

  save(signal: GovernmentContractSignal): void {
    this.signals.set(signal.id, signal);
  }

  findGovernmentContract(input: {
    companyId: CompanyId;
    sourceId: SourceId;
    observedAt: string;
    externalReference: ExternalReference;
  }): GovernmentContractSignal | undefined {
    return [...this.signals.values()].find(
      (signal) =>
        signal.companyId === input.companyId &&
        signal.signalType === "government_contract_awarded" &&
        signal.sourceId === input.sourceId &&
        signal.observedAt === input.observedAt &&
        signal.externalReference === input.externalReference,
    );
  }

  findByCompanyId(companyId: CompanyId): ReadonlyArray<GovernmentContractSignal> {
    return [...this.signals.values()].filter(
      (signal) => signal.companyId === companyId,
    );
  }

  count(): number {
    return this.signals.size;
  }

  all(): ReadonlyArray<GovernmentContractSignal> {
    return [...this.signals.values()];
  }
}

export class InMemoryReviewQueueRepository {
  private readonly items = new Map<ReviewQueueItemId, ReviewQueueItem>();

  save(item: ReviewQueueItem): void {
    this.items.set(item.id, item);
  }

  all(): ReadonlyArray<ReviewQueueItem> {
    return [...this.items.values()];
  }

  count(): number {
    return this.items.size;
  }
}

export function normalizeSourceUrl(sourceUrl: string): string {
  const url = new URL(sourceUrl);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  url.pathname = url.pathname.replace(/\/$/, "");
  return url.toString();
}

export type InMemoryRepositories = {
  companies: InMemoryCompanyRepository;
  sources: InMemorySourceRepository;
  signals: InMemorySignalRepository;
  reviewQueue: InMemoryReviewQueueRepository;
  snapshot(): {
    companies: ReadonlyArray<Company>;
    sources: ReadonlyArray<Source>;
    signals: ReadonlyArray<GovernmentContractSignal>;
  };
};

export function createInMemoryRepositories(
  companies: ReadonlyArray<Company>,
): InMemoryRepositories {
  const companyRepository = new InMemoryCompanyRepository(companies);
  const sourceRepository = new InMemorySourceRepository();
  const signalRepository = new InMemorySignalRepository();

  const reviewQueueRepository = new InMemoryReviewQueueRepository();
  return {
    companies: companyRepository,
    sources: sourceRepository,
    signals: signalRepository,
    reviewQueue: reviewQueueRepository,
    snapshot: () => ({
      companies: companyRepository.all(),
      sources: sourceRepository.all(),
      signals: signalRepository.all(),
    }),
  };
}

export function createCompanySearchQuery(
  repositories: InMemoryRepositories,
): CompanySearchQuery {
  return {
    async searchCompanies(query: string) {
      const normalizedQuery = query.trim().toLowerCase();
      if (normalizedQuery === "") {
        return [];
      }
      return repositories.companies
        .all()
        .filter((company) => company.canonicalName.toLowerCase().includes(normalizedQuery) || company.canonicalDomain.toLowerCase().includes(normalizedQuery))
        .map((company) => ({
          company: {
            canonicalName: company.canonicalName,
            canonicalDomain: company.canonicalDomain,
            jurisdiction: company.jurisdiction,
          },
          evidenceCount: repositories.signals.findByCompanyId(company.id).length,
          offeringCount: 0,
        }));
    },
  };
}

export function createCompanyEvidenceQuery(
  repositories: InMemoryRepositories,
): CompanyEvidenceQuery {
  return {
    async findCompanyProfile(companyId: CompanyId): Promise<CompanyProfile | null> {
      const company = repositories.companies.findById(companyId);
      if (company === undefined) {
        return null;
      }

      const evidence = repositories.signals
        .findByCompanyId(companyId)
        .map((signal) => {
          const source = repositories.sources.findById(signal.sourceId);
          if (source === undefined) {
            throw new Error("Signal provenance Source is missing");
          }

          return {
            signalId: signal.id,
            signalType: signal.signalType,
            contractType: signal.contractType,
            observedAt: signal.observedAt,
            confidence: signal.confidence,
            schemaVersion: signal.schemaVersion,
            source: {
              id: source.id,
              name: source.name,
              url: source.url,
            },
          };
        });

      return { company, products: [], services: [], evidence };
    },
  };
}

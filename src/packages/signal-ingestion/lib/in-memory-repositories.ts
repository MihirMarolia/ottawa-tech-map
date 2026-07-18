import type { Company, CompanyId } from "../../entity-resolver/index.js";
import type { CompanyEvidenceQuery, CompanyProfile } from "../company-evidence.js";
import type {
  GovernmentContractSignal,
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

  all(): ReadonlyArray<Source> {
    return [...this.sources.values()];
  }
}

export class InMemorySignalRepository {
  private readonly signals = new Map<SignalId, GovernmentContractSignal>();

  save(signal: GovernmentContractSignal): void {
    this.signals.set(signal.id, signal);
  }

  findBySourceId(sourceId: SourceId): GovernmentContractSignal | undefined {
    return [...this.signals.values()].find(
      (signal) => signal.sourceId === sourceId,
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

export type InMemoryRepositories = {
  companies: InMemoryCompanyRepository;
  sources: InMemorySourceRepository;
  signals: InMemorySignalRepository;
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

  return {
    companies: companyRepository,
    sources: sourceRepository,
    signals: signalRepository,
    snapshot: () => ({
      companies: companyRepository.all(),
      sources: sourceRepository.all(),
      signals: signalRepository.all(),
    }),
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

      return { company, evidence };
    },
  };
}

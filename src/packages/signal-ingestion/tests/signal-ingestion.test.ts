import type {
  IngestCorporateSource,
  IngestionOutcome,
  SignalId,
  SignalIngestionService,
} from "../index.js";
import type { CompanyId } from "../../entity-resolver/index.js";

describe("SignalIngestionService contract", () => {
  it("accepts the public interface shape", () => {
    const service: SignalIngestionService = {
      ingest: async (
        _command: IngestCorporateSource,
      ): Promise<IngestionOutcome> => ({
        status: "accepted",
        signalId: "signal-1" as SignalId,
        companyId: "company-1" as CompanyId,
      }),
    };

    expect(service.ingest).toBeDefined();
  });
});

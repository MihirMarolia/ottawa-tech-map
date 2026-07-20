import { describe, expect, it, vi } from "vitest";
import {
  existingFixtureCompany,
  fictionalGovernmentContractFixture,
} from "../fixtures/government-contract.js";
import {
  createSupabaseGovernmentContractFixtureApplication,
  GovernmentContractPersistenceError,
} from "../packages/signal-ingestion/supabase-government-contract-application.js";

describe("Supabase persistence response contract", () => {
  it("does not record recovery after a successful but malformed RPC result", async () => {
    const fetchImplementation = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify([{ outcome: "accepted_created" }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const application = createSupabaseGovernmentContractFixtureApplication({
      companies: [existingFixtureCompany],
      supabaseUrl: "http://127.0.0.1:54321",
      serviceRoleKey: "local-test-service-role-key",
      fetchImplementation,
    });

    await expect(
      application.ingestGovernmentContractFixture(
        fictionalGovernmentContractFixture,
      ),
    ).rejects.toEqual(
      expect.objectContaining<Partial<GovernmentContractPersistenceError>>({
        category: "function_contract_violation",
      }),
    );
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
    expect(fetchImplementation.mock.calls[0]?.[0]).toEqual(
      new URL(
        "http://127.0.0.1:54321/rest/v1/rpc/persist_government_contract_application_item",
      ),
    );
  });
});

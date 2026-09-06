import type { AdminDatabaseRpcClient } from "../../database/admin.js";
import {
  CANADABUYS_AWARD_NOTICE_RESOURCE_URL,
  CANADABUYS_DRY_RUN_RANGE_HEADER,
  createCanadaBuysDryRunReport,
  fetchCanadaBuysDryRunReport,
  normalizeCanadaBuysAwardNotice,
  persistCanadaBuysReviewCandidate,
} from "../index.js";

const eligibleRow = {
  "referenceNumber-numeroReference": "PWGSC-100",
  "contractNumber-numeroContrat": "",
  "amendmentNumber-numeroModification": "000",
  "publicationDate-datePublication": "2026-08-21",
  "awardStatus-attributionStatut-eng": "Active",
  "procurementCategory-categorieApprovisionnement": "*SRV\n*GD",
  "supplierLegalName-nomLegalFournisseur-eng": "Unresolved Supplier Inc.",
  "supplierAddressLine-ligneAdresseFournisseur-eng": "Must not be retained",
  "contactInfoEmail-informationsContactCourriel": "must-not-be-retained@example.test",
  "awardDescription-descriptionAttribution-eng": "Must not be retained",
};

describe("CanadaBuys award-notice dry run", () => {
  it("creates a review-only candidate from an active original service award without copying contact or free-text fields", () => {
    const candidate = normalizeCanadaBuysAwardNotice(eligibleRow);

    expect(candidate).toMatchObject({
      status: "review_candidate",
      externalReference: "canadabuys:PWGSC-100:000",
      supplierName: "Unresolved Supplier Inc.",
      observedAt: "2026-08-21",
    });
    if (candidate.status === "review_candidate") {
      expect(JSON.stringify(candidate.sanitizedProposal)).not.toContain("must-not-be-retained");
      expect(candidate.sanitizedProposal).toMatchObject({ awardStatus: "active", procurementCategory: "SRV" });
    }
  });

  it("holds inactive, amended, or non-service records instead of treating them as government-contract signals", () => {
    expect(normalizeCanadaBuysAwardNotice({ ...eligibleRow, "awardStatus-attributionStatut-eng": "Cancelled" })).toMatchObject({ status: "held", reason: "unsupported_award_status" });
    expect(normalizeCanadaBuysAwardNotice({ ...eligibleRow, "amendmentNumber-numeroModification": "2" })).toMatchObject({ status: "held", reason: "amendment_requires_review" });
    expect(normalizeCanadaBuysAwardNotice({ ...eligibleRow, "procurementCategory-categorieApprovisionnement": "*GD" })).toMatchObject({ status: "held", reason: "unsupported_procurement_category" });
  });

  it("enforces the approved 20–50 record dry-run cap", () => {
    expect(() => createCanadaBuysDryRunReport([eligibleRow], 19)).toThrow("20 through 50");
    const report = createCanadaBuysDryRunReport(Array.from({ length: 25 }, () => eligibleRow), 20);
    expect(report).toMatchObject({ cap: 20, inspected: 20 });
    expect(report.reviewCandidates).toHaveLength(20);
  });

  it("requests only the capped CSV range and parses a supplied official-record stream", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const csv = [
      "referenceNumber-numeroReference,amendmentNumber-numeroModification,publicationDate-datePublication,awardStatus-attributionStatut-eng,procurementCategory-categorieApprovisionnement,supplierLegalName-nomLegalFournisseur-eng",
      "PWGSC-101,000,2026-08-21,Active,*SRV,Unresolved Supplier Inc.",
    ].join("\n");
    const report = await fetchCanadaBuysDryRunReport({
      cap: 20,
      fetcher: async (url, init) => {
        requests.push({ url, init });
        return {
          ok: true,
          status: 206,
          body: new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(csv));
              controller.close();
            },
          }),
        };
      },
    });

    expect(report).toMatchObject({ inspected: 1, cap: 20 });
    expect(report.reviewCandidates).toHaveLength(1);
    expect(requests).toEqual([
      {
        url: CANADABUYS_AWARD_NOTICE_RESOURCE_URL,
        init: {
          headers: expect.objectContaining({
            Accept: "text/csv",
            Range: CANADABUYS_DRY_RUN_RANGE_HEADER,
          }),
        },
      },
    ]);
  });

  it("calls only the service-role review application RPC and never supplies a company identifier", async () => {
    const candidate = normalizeCanadaBuysAwardNotice(eligibleRow);
    if (candidate.status !== "review_candidate") throw new Error("fixture must be eligible");
    const calls: Array<{ name: string; parameters: Record<string, unknown> }> = [];
    const client = {
      call: async <T>(name: string, parameters: Record<string, unknown>) => {
        calls.push({ name, parameters });
        return [{ review_item_id: "review-canadabuys-1" }] as T;
      },
    } as unknown as AdminDatabaseRpcClient;

    await expect(persistCanadaBuysReviewCandidate(client, candidate)).resolves.toEqual({
      status: "review_required",
      reviewItemId: "review-canadabuys-1",
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.name).toBe("persist_government_contract_unresolved_review_application_item");
    expect(calls[0]?.parameters).not.toHaveProperty("candidate_company_id");
    expect(calls[0]?.parameters.candidate_sanitized_proposal).toEqual(candidate.sanitizedProposal);
  });
});

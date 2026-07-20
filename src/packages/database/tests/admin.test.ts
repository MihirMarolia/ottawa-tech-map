import { describe, expect, it, vi } from "vitest";
import {
  createAdminDatabaseRpcClient,
  DatabaseRpcError,
} from "../admin.js";

describe("Admin database RPC client", () => {
  it("calls only the named RPC with service-role authorization", async () => {
    const fetchImplementation = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify([{ outcome: "accepted_created" }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const client = createAdminDatabaseRpcClient({
      supabaseUrl: "http://127.0.0.1:54321",
      serviceRoleKey: "local-test-service-role-key",
      fetchImplementation,
    });

    await expect(client.call("example_rpc", { candidate: "safe" })).resolves.toEqual([
      { outcome: "accepted_created" },
    ]);
    expect(fetchImplementation).toHaveBeenCalledWith(
      new URL("http://127.0.0.1:54321/rest/v1/rpc/example_rpc"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          apikey: "local-test-service-role-key",
          authorization: "Bearer local-test-service-role-key",
        }),
        body: JSON.stringify({ candidate: "safe" }),
      }),
    );
  });

  it("classifies unavailable and rejected calls without exposing response content", async () => {
    const unavailable = createAdminDatabaseRpcClient({
      supabaseUrl: "http://127.0.0.1:54321",
      serviceRoleKey: "local-test-service-role-key",
      fetchImplementation: async () => {
        throw new Error("raw upstream content must not escape");
      },
    });
    await expect(unavailable.call("example_rpc", {})).rejects.toEqual(
      expect.objectContaining<Partial<DatabaseRpcError>>({
        category: "database_unavailable",
        message: "Database RPC is unavailable",
      }),
    );

    const rejected = createAdminDatabaseRpcClient({
      supabaseUrl: "http://127.0.0.1:54321",
      serviceRoleKey: "local-test-service-role-key",
      fetchImplementation: async () =>
        new Response("unsafe database detail", { status: 400 }),
    });
    await expect(rejected.call("example_rpc", {})).rejects.toEqual(
      expect.objectContaining<Partial<DatabaseRpcError>>({
        category: "constraint_violation",
        message: "Database RPC failed with HTTP 400",
      }),
    );
  });

  it("distinguishes timeouts and rejects malformed successful responses", async () => {
    const timeout = createAdminDatabaseRpcClient({
      supabaseUrl: "http://127.0.0.1:54321",
      serviceRoleKey: "local-test-service-role-key",
      timeoutMs: 1,
      fetchImplementation: async (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    });
    await expect(timeout.call("example_rpc", {})).rejects.toEqual(
      expect.objectContaining<Partial<DatabaseRpcError>>({
        category: "transaction_timeout",
        message: "Database RPC timed out",
        recoveryEligible: true,
      }),
    );

    const malformed = createAdminDatabaseRpcClient({
      supabaseUrl: "http://127.0.0.1:54321",
      serviceRoleKey: "local-test-service-role-key",
      fetchImplementation: async () =>
        new Response("not-json", {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    });
    await expect(malformed.call("example_rpc", {})).rejects.toEqual(
      expect.objectContaining<Partial<DatabaseRpcError>>({
        category: "function_contract_violation",
        message: "Database RPC returned malformed JSON",
        recoveryEligible: false,
      }),
    );

    await expect(
      malformed.call("../outside_rpc_namespace", {}),
    ).rejects.toEqual(
      expect.objectContaining<Partial<DatabaseRpcError>>({
        category: "function_contract_violation",
        message: "Database RPC function name is invalid",
        recoveryEligible: false,
      }),
    );
  });
});

/** Privileged database access — not importable from the web app. */
export const SUPABASE_SERVICE_ROLE_KEY = "SUPABASE_SERVICE_ROLE_KEY";

export type AdminDatabaseClient = {
  role: "service";
};

export function createAdminDatabaseClient(): AdminDatabaseClient {
  return { role: "service" };
}

export type DatabaseFailureCategory =
  | "database_unavailable"
  | "transaction_timeout"
  | "constraint_violation"
  | "authorization_failure"
  | "function_contract_violation"
  | "unexpected_internal_error";

export class DatabaseRpcError extends Error {
  constructor(
    message: string,
    readonly category: DatabaseFailureCategory,
    readonly recoveryEligible = true,
  ) {
    super(message);
    this.name = "DatabaseRpcError";
  }
}

export interface AdminDatabaseRpcClient {
  call<TResult>(functionName: string, parameters: object): Promise<TResult>;
}

function classifyHttpFailure(status: number): DatabaseFailureCategory {
  if (status === 401 || status === 403) {
    return "authorization_failure";
  }
  if (status === 400 || status === 409 || status === 422) {
    return "constraint_violation";
  }
  return status >= 500
    ? "unexpected_internal_error"
    : "function_contract_violation";
}

export function createAdminDatabaseRpcClient(input: {
  supabaseUrl: string;
  serviceRoleKey: string;
  fetchImplementation?: typeof fetch;
  timeoutMs?: number;
}): AdminDatabaseRpcClient {
  const endpoint = new URL(input.supabaseUrl);
  if (endpoint.protocol !== "http:" && endpoint.protocol !== "https:") {
    throw new Error("Supabase URL must use HTTP or HTTPS");
  }
  if (input.serviceRoleKey.trim() === "") {
    throw new Error("Supabase service-role key is required");
  }
  const fetchImplementation = input.fetchImplementation ?? fetch;
  const timeoutMs = input.timeoutMs ?? 10_000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error("Database RPC timeout must be a positive integer");
  }

  return {
    async call<TResult>(functionName: string, parameters: object): Promise<TResult> {
      if (!/^[a-z][a-z0-9_]*$/.test(functionName)) {
        throw new DatabaseRpcError(
          "Database RPC function name is invalid",
          "function_contract_violation",
          false,
        );
      }
      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), timeoutMs);
      let response: Response;
      try {
        response = await fetchImplementation(
          new URL(`/rest/v1/rpc/${functionName}`, endpoint),
          {
            method: "POST",
            headers: {
              apikey: input.serviceRoleKey,
              authorization: `Bearer ${input.serviceRoleKey}`,
              "content-type": "application/json",
            },
            body: JSON.stringify(parameters),
            signal: abortController.signal,
          },
        );
      } catch {
        throw new DatabaseRpcError(
          abortController.signal.aborted
            ? "Database RPC timed out"
            : "Database RPC is unavailable",
          abortController.signal.aborted
            ? "transaction_timeout"
            : "database_unavailable",
        );
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        throw new DatabaseRpcError(
          `Database RPC failed with HTTP ${response.status}`,
          classifyHttpFailure(response.status),
        );
      }

      try {
        return (await response.json()) as TResult;
      } catch {
        throw new DatabaseRpcError(
          "Database RPC returned malformed JSON",
          "function_contract_violation",
          false,
        );
      }
    },
  };
}

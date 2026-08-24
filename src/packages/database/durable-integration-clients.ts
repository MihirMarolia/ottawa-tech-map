import {
  createAnonClient,
  createServiceRoleClient,
  type SupabaseClient,
} from "./supabase-client.js";

export type DurableIntegrationClients = {
  publicClient: SupabaseClient;
  ingestionClient: SupabaseClient;
};

/**
 * Server-only test helper. The service-role credential stays within the
 * database package; callers receive clients rather than a raw credential.
 */
export function createDurableIntegrationClientsFromEnvironment(): DurableIntegrationClients | null {
  const url = process.env.VITE_SUPABASE_URL ?? "";
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (url === "" || anonKey === "" || serviceRoleKey === "") {
    return null;
  }

  const config = { url, anonKey, serviceRoleKey };
  return {
    publicClient: createAnonClient(config),
    ingestionClient: createServiceRoleClient(config),
  };
}

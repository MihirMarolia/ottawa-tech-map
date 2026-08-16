import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type { SupabaseClient };

export type SupabaseClientConfig = {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
};

export function createAnonClient(config: SupabaseClientConfig): SupabaseClient {
  return createClient(config.url, config.anonKey);
}

export function createServiceRoleClient(
  config: SupabaseClientConfig,
): SupabaseClient {
  return createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

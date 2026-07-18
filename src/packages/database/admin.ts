/** Privileged database access — not importable from the web app. */
export const SUPABASE_SERVICE_ROLE_KEY = "SUPABASE_SERVICE_ROLE_KEY";

export type AdminDatabaseClient = {
  role: "service";
};

export function createAdminDatabaseClient(): AdminDatabaseClient {
  return { role: "service" };
}

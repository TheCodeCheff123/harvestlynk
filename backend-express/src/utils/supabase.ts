import { createClient, type SupabaseClient, type User as SupabaseUser } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for Supabase Auth`);
  return value;
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(
      requiredEnv("SUPABASE_URL"),
      requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
          flowType: "implicit",
        },
      },
    );
  }

  return adminClient;
}

export function getAuthRedirectUrl(path: string): string {
  const frontendUrl = process.env["FRONTEND_URL"] ?? "http://localhost:3000";
  return `${frontendUrl}${path}`;
}

export function isSupabaseEmailVerified(user: SupabaseUser): boolean {
  return !!(user.email_confirmed_at ?? user.confirmed_at);
}

export function getSupabaseUserNameParts(user: SupabaseUser): { firstName: string; lastName: string } {
  const metadata = user.user_metadata ?? {};
  const firstName = typeof metadata["firstName"] === "string"
    ? metadata["firstName"]
    : typeof metadata["first_name"] === "string"
      ? metadata["first_name"]
      : undefined;
  const lastName = typeof metadata["lastName"] === "string"
    ? metadata["lastName"]
    : typeof metadata["last_name"] === "string"
      ? metadata["last_name"]
      : undefined;

  if (firstName && lastName) return { firstName, lastName };

  const fullName = typeof metadata["full_name"] === "string"
    ? metadata["full_name"]
    : typeof metadata["name"] === "string"
      ? metadata["name"]
      : user.email?.split("@")[0] ?? "HarvestLynk User";
  const [first, ...rest] = fullName.trim().split(/\s+/);

  return {
    firstName: first || "HarvestLynk",
    lastName: rest.join(" ") || "User",
  };
}


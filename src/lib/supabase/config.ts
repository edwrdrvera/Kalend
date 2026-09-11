export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export const SUPABASE_CONFIGURATION_ERROR_MESSAGE =
  "Sign-in is temporarily unavailable because authentication is not configured.";

export class SupabaseConfigurationError extends Error {
  constructor() {
    super(SUPABASE_CONFIGURATION_ERROR_MESSAGE);
    this.name = "SupabaseConfigurationError";
  }
}

export function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new SupabaseConfigurationError();
  }

  return {
    url,
    anonKey,
  };
}

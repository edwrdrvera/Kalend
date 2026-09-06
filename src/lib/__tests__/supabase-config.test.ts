import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import {
  getSupabaseConfig,
  SupabaseConfigurationError,
} from "../supabase/config";

const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

describe("Supabase configuration", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalSupabaseAnonKey;
  });

  it("provides the configured project URL and public key", () => {
    expect(getSupabaseConfig()).toEqual({
      url: "https://example.supabase.co",
      anonKey: "test-anon-key",
    });
  });

  it("reports an app-owned configuration error when the project URL is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    expect(() => getSupabaseConfig()).toThrow(SupabaseConfigurationError);
    expect(() => getSupabaseConfig()).toThrow(
      "Sign-in is temporarily unavailable because authentication is not configured."
    );
  });

  it("reports an app-owned configuration error when the public key is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(() => getSupabaseConfig()).toThrow(SupabaseConfigurationError);
  });
});

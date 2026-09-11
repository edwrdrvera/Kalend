export interface AuthValidationResult {
  valid: boolean;
  error?: string;
  trimmedEmail?: string;
}

/**
 * Validates the login form's fields: a well-formed email and a non-empty
 * password. There's no signup in this MVP (single demo account, see
 * src/db/CLAUDE.md), so there's no password-strength rule to enforce here.
 */
export function validateAuthForm(email: string, password: string): AuthValidationResult {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    return { valid: false, error: "Please enter your email address." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return { valid: false, error: "Please enter a valid email address." };
  }

  if (!password) {
    return { valid: false, error: "Please enter your password." };
  }

  return { valid: true, trimmedEmail };
}

export interface AuthValidationResult {
  valid: boolean;
  error?: string;
  trimmedEmail?: string;
}

/**
 * Validates auth input fields (email and password) according to application
 * and Supabase requirements.
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

  if (password.length < 6) {
    return { valid: false, error: "Password must be at least 6 characters long." };
  }

  return { valid: true, trimmedEmail };
}

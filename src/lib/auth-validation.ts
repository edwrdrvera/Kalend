export interface AuthValidationResult {
  valid: boolean;
  error?: string;
  trimmedEmail?: string;
}

export type AuthMode = "login" | "signup";

const MIN_SIGNUP_PASSWORD_LENGTH = 8;

// A short list of the most commonly used (and most commonly breached)
// passwords. Not exhaustive, just enough to catch the obvious ones that
// length alone wouldn't. Matched case-insensitively.
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "12345678", "123456789",
  "1234567890", "qwerty123", "qwertyuiop", "letmein", "welcome",
  "welcome1", "monkey123", "dragon123", "football", "iloveyou",
  "admin1234", "abc123456", "passw0rd", "123123123", "1q2w3e4r",
  "sunshine1", "trustno1", "superman1", "michael1", "starwars1",
]);

export const PASSWORD_REQUIREMENTS_HINT =
  `At least ${MIN_SIGNUP_PASSWORD_LENGTH} characters. Avoid common passwords like "password" or "12345678".`;

/**
 * Validates auth input fields (email and password) according to application
 * and Supabase requirements. Password strength is only enforced on signup:
 * login just needs a non-empty password, so a user's existing password
 * (set before this rule existed) still works.
 */
export function validateAuthForm(
  email: string,
  password: string,
  mode: AuthMode = "signup"
): AuthValidationResult {
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

  if (mode === "login") {
    return { valid: true, trimmedEmail };
  }

  if (password.length < MIN_SIGNUP_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: `Password must be at least ${MIN_SIGNUP_PASSWORD_LENGTH} characters long.`,
    };
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return {
      valid: false,
      error: "That password is too common. Please choose a less predictable one.",
    };
  }

  return { valid: true, trimmedEmail };
}

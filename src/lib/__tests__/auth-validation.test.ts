import { describe, expect, it } from "bun:test";
import { validateAuthForm } from "../auth-validation";

describe("validateAuthForm", () => {
  describe("email validation", () => {
    it("rejects an empty email", () => {
      const result = validateAuthForm("", "password123");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Please enter your email address.");
    });

    it("rejects whitespace-only email", () => {
      const result = validateAuthForm("   ", "password123");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Please enter your email address.");
    });

    it("rejects an email without @ symbol", () => {
      const result = validateAuthForm("student.university.edu", "password123");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Please enter a valid email address.");
    });

    it("rejects an email without domain extension", () => {
      const result = validateAuthForm("student@university", "password123");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Please enter a valid email address.");
    });

    it("trims leading and trailing whitespace from valid email", () => {
      const result = validateAuthForm("  user@example.com  ", "password123");
      expect(result.valid).toBe(true);
      expect(result.trimmedEmail).toBe("user@example.com");
      expect(result.error).toBeUndefined();
    });
  });

  describe("password validation", () => {
    it("rejects an empty password", () => {
      const result = validateAuthForm("user@example.com", "");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Please enter your password.");
    });

    it("rejects a password shorter than 6 characters", () => {
      const result = validateAuthForm("user@example.com", "12345");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Password must be at least 6 characters long.");
    });

    it("accepts a password with exactly 6 characters", () => {
      const result = validateAuthForm("user@example.com", "123456");
      expect(result.valid).toBe(true);
      expect(result.trimmedEmail).toBe("user@example.com");
      expect(result.error).toBeUndefined();
    });

    it("accepts a strong, long password", () => {
      const result = validateAuthForm("user@example.com", "superSecureP@ssw0rd!#");
      expect(result.valid).toBe(true);
      expect(result.trimmedEmail).toBe("user@example.com");
      expect(result.error).toBeUndefined();
    });
  });
});

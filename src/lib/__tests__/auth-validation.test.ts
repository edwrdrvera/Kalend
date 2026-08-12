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
      const result = validateAuthForm("  user@example.com  ", "grapefruit19");
      expect(result.valid).toBe(true);
      expect(result.trimmedEmail).toBe("user@example.com");
      expect(result.error).toBeUndefined();
    });
  });

  describe("password validation (signup, default mode)", () => {
    it("rejects an empty password", () => {
      const result = validateAuthForm("user@example.com", "");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Please enter your password.");
    });

    it("rejects a password shorter than 8 characters", () => {
      const result = validateAuthForm("user@example.com", "abc1234");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Password must be at least 8 characters long.");
    });

    it("rejects a password that used to pass the old 6-character rule but not the new one", () => {
      const result = validateAuthForm("user@example.com", "123456");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Password must be at least 8 characters long.");
    });

    it("accepts a password with exactly 8 characters", () => {
      const result = validateAuthForm("user@example.com", "grapefru");
      expect(result.valid).toBe(true);
      expect(result.trimmedEmail).toBe("user@example.com");
      expect(result.error).toBeUndefined();
    });

    it("rejects a common password even if it meets the length requirement", () => {
      const result = validateAuthForm("user@example.com", "password123");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("That password is too common. Please choose a less predictable one.");
    });

    it("rejects a common password regardless of letter casing", () => {
      const result = validateAuthForm("user@example.com", "WELCOME1");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("That password is too common. Please choose a less predictable one.");
    });

    it("accepts a strong, long password", () => {
      const result = validateAuthForm("user@example.com", "superSecureP@ssw0rd!#");
      expect(result.valid).toBe(true);
      expect(result.trimmedEmail).toBe("user@example.com");
      expect(result.error).toBeUndefined();
    });
  });

  describe("password validation (login mode)", () => {
    it("accepts a short password that would fail the signup length rule", () => {
      const result = validateAuthForm("user@example.com", "abc123", "login");
      expect(result.valid).toBe(true);
      expect(result.trimmedEmail).toBe("user@example.com");
      expect(result.error).toBeUndefined();
    });

    it("accepts a password from the common-password list", () => {
      const result = validateAuthForm("user@example.com", "password1", "login");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("still rejects an empty password", () => {
      const result = validateAuthForm("user@example.com", "", "login");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Please enter your password.");
    });
  });
});

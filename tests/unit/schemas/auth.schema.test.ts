import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema, changePasswordSchema, deleteAccountSchema } from "@/lib/schemas/auth.schema";

describe("registerSchema", () => {
  it("should validate correct registration data", () => {
    const validData = {
      email: "test@example.com",
      password: "password123",
      passwordConfirm: "password123",
    };

    const result = registerSchema.safeParse(validData);

    expect(result.success).toBe(true);
  });

  it("should reject invalid email format", () => {
    const invalidData = {
      email: "invalid-email",
      password: "password123",
      passwordConfirm: "password123",
    };

    const result = registerSchema.safeParse(invalidData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Invalid email format");
    }
  });

  it("should reject password shorter than 8 characters", () => {
    const invalidData = {
      email: "test@example.com",
      password: "short",
      passwordConfirm: "short",
    };

    const result = registerSchema.safeParse(invalidData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Password must be at least 8 characters");
    }
  });

  it("should reject mismatched passwords", () => {
    const invalidData = {
      email: "test@example.com",
      password: "password123",
      passwordConfirm: "different123",
    };

    const result = registerSchema.safeParse(invalidData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Passwords do not match");
    }
  });
});

describe("loginSchema", () => {
  it("should validate correct login data", () => {
    const validData = {
      email: "test@example.com",
      password: "anypassword",
    };

    const result = loginSchema.safeParse(validData);

    expect(result.success).toBe(true);
  });

  it("should reject empty password", () => {
    const invalidData = {
      email: "test@example.com",
      password: "",
    };

    const result = loginSchema.safeParse(invalidData);

    expect(result.success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("should validate correct password change data", () => {
    const validData = {
      currentPassword: "oldpassword",
      newPassword: "newpassword123",
      newPasswordConfirm: "newpassword123",
    };

    const result = changePasswordSchema.safeParse(validData);

    expect(result.success).toBe(true);
  });

  it("should reject when new password matches current password", () => {
    const invalidData = {
      currentPassword: "samepassword",
      newPassword: "samepassword",
      newPasswordConfirm: "samepassword",
    };

    const result = changePasswordSchema.safeParse(invalidData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("New password must be different from current password");
    }
  });
});

describe("deleteAccountSchema", () => {
  it('should validate when confirmation is "DELETE"', () => {
    const validData = { confirmation: "DELETE" };

    const result = deleteAccountSchema.safeParse(validData);

    expect(result.success).toBe(true);
  });

  it('should reject when confirmation is not "DELETE"', () => {
    const invalidData = { confirmation: "delete" };

    const result = deleteAccountSchema.safeParse(invalidData);

    expect(result.success).toBe(false);
  });
});

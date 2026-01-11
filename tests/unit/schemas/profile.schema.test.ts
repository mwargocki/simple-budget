import { describe, it, expect } from "vitest";
import { updateProfileSchema } from "@/lib/schemas/profile.schema";

describe("updateProfileSchema", () => {
  describe("valid data", () => {
    it("should validate correct timezone", () => {
      const result = updateProfileSchema.safeParse({ timezone: "Europe/Warsaw" });

      expect(result.success).toBe(true);
    });

    it("should accept UTC timezone", () => {
      const result = updateProfileSchema.safeParse({ timezone: "UTC" });

      expect(result.success).toBe(true);
    });

    it("should accept timezone with long name", () => {
      const result = updateProfileSchema.safeParse({ timezone: "America/Argentina/Buenos_Aires" });

      expect(result.success).toBe(true);
    });

    it("should accept timezone at maximum length (64 characters)", () => {
      const result = updateProfileSchema.safeParse({ timezone: "a".repeat(64) });

      expect(result.success).toBe(true);
    });

    it("should accept timezone with minimum length (1 character)", () => {
      const result = updateProfileSchema.safeParse({ timezone: "X" });

      expect(result.success).toBe(true);
    });

    it("should accept common timezones", () => {
      const timezones = [
        "America/New_York",
        "America/Los_Angeles",
        "Europe/London",
        "Europe/Paris",
        "Asia/Tokyo",
        "Asia/Shanghai",
        "Australia/Sydney",
        "Pacific/Auckland",
      ];

      timezones.forEach((tz) => {
        const result = updateProfileSchema.safeParse({ timezone: tz });
        expect(result.success).toBe(true);
      });
    });
  });

  describe("timezone validation - empty and whitespace", () => {
    it("should reject empty timezone", () => {
      const result = updateProfileSchema.safeParse({ timezone: "" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Timezone is required");
      }
    });
  });

  describe("timezone validation - length", () => {
    it("should reject timezone longer than 64 characters", () => {
      const result = updateProfileSchema.safeParse({ timezone: "a".repeat(65) });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Timezone must be at most 64 characters");
      }
    });

    it("should reject very long timezone", () => {
      const result = updateProfileSchema.safeParse({ timezone: "a".repeat(100) });

      expect(result.success).toBe(false);
    });
  });

  describe("missing required field", () => {
    it("should reject missing timezone field", () => {
      const result = updateProfileSchema.safeParse({});

      expect(result.success).toBe(false);
    });

    it("should reject null timezone", () => {
      const result = updateProfileSchema.safeParse({ timezone: null });

      expect(result.success).toBe(false);
    });

    it("should reject undefined timezone", () => {
      const result = updateProfileSchema.safeParse({ timezone: undefined });

      expect(result.success).toBe(false);
    });
  });
});

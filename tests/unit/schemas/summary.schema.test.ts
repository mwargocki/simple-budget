import { describe, it, expect } from "vitest";
import { summaryQuerySchema } from "@/lib/schemas/summary.schema";

describe("summaryQuerySchema", () => {
  describe("valid data", () => {
    it("should accept valid month format YYYY-MM", () => {
      const result = summaryQuerySchema.safeParse({ month: "2024-01" });

      expect(result.success).toBe(true);
    });

    it("should accept all valid months (01-12)", () => {
      const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

      months.forEach((month) => {
        const result = summaryQuerySchema.safeParse({ month: `2024-${month}` });
        expect(result.success).toBe(true);
      });
    });

    it("should allow empty query (month is optional)", () => {
      const result = summaryQuerySchema.safeParse({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.month).toBeUndefined();
      }
    });

    it("should accept different years", () => {
      const years = ["2020", "2021", "2022", "2023", "2024", "2025", "2030"];

      years.forEach((year) => {
        const result = summaryQuerySchema.safeParse({ month: `${year}-06` });
        expect(result.success).toBe(true);
      });
    });

    it("should accept boundary months (January and December)", () => {
      const january = summaryQuerySchema.safeParse({ month: "2024-01" });
      const december = summaryQuerySchema.safeParse({ month: "2024-12" });

      expect(january.success).toBe(true);
      expect(december.success).toBe(true);
    });
  });

  describe("invalid month format", () => {
    it("should reject month without leading zero", () => {
      const result = summaryQuerySchema.safeParse({ month: "2024-1" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Invalid month format. Use YYYY-MM");
      }
    });

    it("should reject two-digit year", () => {
      const result = summaryQuerySchema.safeParse({ month: "24-01" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Invalid month format. Use YYYY-MM");
      }
    });

    it("should reject slash separator", () => {
      const result = summaryQuerySchema.safeParse({ month: "2024/01" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Invalid month format. Use YYYY-MM");
      }
    });

    it("should reject month 00", () => {
      const result = summaryQuerySchema.safeParse({ month: "2024-00" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Invalid month format. Use YYYY-MM");
      }
    });

    it("should reject month 13", () => {
      const result = summaryQuerySchema.safeParse({ month: "2024-13" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Invalid month format. Use YYYY-MM");
      }
    });

    it("should reject text month name", () => {
      const result = summaryQuerySchema.safeParse({ month: "January 2024" });

      expect(result.success).toBe(false);
    });

    it("should reject full date format", () => {
      const result = summaryQuerySchema.safeParse({ month: "2024-01-15" });

      expect(result.success).toBe(false);
    });

    it("should reject empty month string", () => {
      const result = summaryQuerySchema.safeParse({ month: "" });

      expect(result.success).toBe(false);
    });

    it("should reject reversed format MM-YYYY", () => {
      const result = summaryQuerySchema.safeParse({ month: "01-2024" });

      expect(result.success).toBe(false);
    });

    it("should reject whitespace", () => {
      const result = summaryQuerySchema.safeParse({ month: " 2024-01" });

      expect(result.success).toBe(false);
    });

    it("should reject month with extra characters", () => {
      const result = summaryQuerySchema.safeParse({ month: "2024-01-" });

      expect(result.success).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should accept far future year", () => {
      const result = summaryQuerySchema.safeParse({ month: "2099-12" });

      expect(result.success).toBe(true);
    });

    it("should accept past year", () => {
      const result = summaryQuerySchema.safeParse({ month: "1999-01" });

      expect(result.success).toBe(true);
    });

    it("should reject non-string month", () => {
      const result = summaryQuerySchema.safeParse({ month: 202401 });

      expect(result.success).toBe(false);
    });

    it("should reject null month", () => {
      const result = summaryQuerySchema.safeParse({ month: null });

      expect(result.success).toBe(false);
    });
  });
});

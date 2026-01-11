import { describe, it, expect } from "vitest";
import { createCategorySchema, updateCategorySchema, categoryIdSchema } from "@/lib/schemas/category.schema";

describe("createCategorySchema", () => {
  describe("valid data", () => {
    it("should validate correct category name", () => {
      const result = createCategorySchema.safeParse({ name: "Groceries" });

      expect(result.success).toBe(true);
    });

    it("should accept name with minimum length (1 character)", () => {
      const result = createCategorySchema.safeParse({ name: "A" });

      expect(result.success).toBe(true);
    });

    it("should accept name with maximum length (40 characters)", () => {
      const result = createCategorySchema.safeParse({ name: "a".repeat(40) });

      expect(result.success).toBe(true);
    });

    it("should accept name with spaces in the middle", () => {
      const result = createCategorySchema.safeParse({ name: "Food and Drinks" });

      expect(result.success).toBe(true);
    });

    it("should accept name with special characters", () => {
      const result = createCategorySchema.safeParse({ name: "Bills & Utilities" });

      expect(result.success).toBe(true);
    });

    it("should accept name with Polish characters", () => {
      const result = createCategorySchema.safeParse({ name: "Żywność" });

      expect(result.success).toBe(true);
    });
  });

  describe("name validation - empty and whitespace", () => {
    it("should reject empty name", () => {
      const result = createCategorySchema.safeParse({ name: "" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Name cannot be empty");
      }
    });

    it("should reject whitespace-only name", () => {
      const result = createCategorySchema.safeParse({ name: "   " });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Name cannot be empty or whitespace-only");
      }
    });

    it("should reject name with leading spaces", () => {
      const result = createCategorySchema.safeParse({ name: "  Groceries" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Name must not have leading or trailing spaces");
      }
    });

    it("should reject name with trailing spaces", () => {
      const result = createCategorySchema.safeParse({ name: "Groceries  " });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Name must not have leading or trailing spaces");
      }
    });

    it("should reject name with both leading and trailing spaces", () => {
      const result = createCategorySchema.safeParse({ name: "  Groceries  " });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Name must not have leading or trailing spaces");
      }
    });
  });

  describe("name validation - length", () => {
    it("should reject name longer than 40 characters", () => {
      const result = createCategorySchema.safeParse({ name: "a".repeat(41) });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Name must not exceed 40 characters");
      }
    });

    it("should reject very long name", () => {
      const result = createCategorySchema.safeParse({ name: "a".repeat(100) });

      expect(result.success).toBe(false);
    });
  });

  describe("missing required field", () => {
    it("should reject missing name field", () => {
      const result = createCategorySchema.safeParse({});

      expect(result.success).toBe(false);
    });

    it("should reject null name", () => {
      const result = createCategorySchema.safeParse({ name: null });

      expect(result.success).toBe(false);
    });

    it("should reject undefined name", () => {
      const result = createCategorySchema.safeParse({ name: undefined });

      expect(result.success).toBe(false);
    });
  });
});

describe("updateCategorySchema", () => {
  describe("valid data", () => {
    it("should validate correct category name", () => {
      const result = updateCategorySchema.safeParse({ name: "Updated Name" });

      expect(result.success).toBe(true);
    });

    it("should accept name with minimum length (1 character)", () => {
      const result = updateCategorySchema.safeParse({ name: "X" });

      expect(result.success).toBe(true);
    });

    it("should accept name with maximum length (40 characters)", () => {
      const result = updateCategorySchema.safeParse({ name: "b".repeat(40) });

      expect(result.success).toBe(true);
    });
  });

  describe("applies same validation rules as create", () => {
    it("should reject empty name", () => {
      const result = updateCategorySchema.safeParse({ name: "" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Name cannot be empty");
      }
    });

    it("should reject whitespace-only name", () => {
      const result = updateCategorySchema.safeParse({ name: "   " });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Name cannot be empty or whitespace-only");
      }
    });

    it("should reject name with leading spaces", () => {
      const result = updateCategorySchema.safeParse({ name: " Name" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Name must not have leading or trailing spaces");
      }
    });

    it("should reject name with trailing spaces", () => {
      const result = updateCategorySchema.safeParse({ name: "Name " });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Name must not have leading or trailing spaces");
      }
    });

    it("should reject name longer than 40 characters", () => {
      const result = updateCategorySchema.safeParse({ name: "c".repeat(41) });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Name must not exceed 40 characters");
      }
    });
  });

  describe("missing required field", () => {
    it("should reject missing name field", () => {
      const result = updateCategorySchema.safeParse({});

      expect(result.success).toBe(false);
    });
  });
});

describe("categoryIdSchema", () => {
  it("should validate correct UUID", () => {
    const validUUID = "550e8400-e29b-41d4-a716-446655440000";

    const result = categoryIdSchema.safeParse(validUUID);

    expect(result.success).toBe(true);
  });

  it("should validate another valid UUID format", () => {
    const validUUID = "123e4567-e89b-12d3-a456-426614174000";

    const result = categoryIdSchema.safeParse(validUUID);

    expect(result.success).toBe(true);
  });

  it("should reject invalid UUID format", () => {
    const result = categoryIdSchema.safeParse("invalid-uuid");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Invalid category ID format");
    }
  });

  it("should reject empty string", () => {
    const result = categoryIdSchema.safeParse("");

    expect(result.success).toBe(false);
  });

  it("should reject partial UUID", () => {
    const result = categoryIdSchema.safeParse("550e8400-e29b-41d4");

    expect(result.success).toBe(false);
  });

  it("should reject UUID with invalid characters", () => {
    const result = categoryIdSchema.safeParse("550e8400-e29b-41d4-a716-44665544ZZZZ");

    expect(result.success).toBe(false);
  });
});

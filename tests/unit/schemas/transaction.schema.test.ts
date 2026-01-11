import { describe, it, expect } from "vitest";
import {
  createTransactionSchema,
  transactionIdSchema,
  transactionsQuerySchema,
  updateTransactionSchema,
} from "@/lib/schemas/transaction.schema";

describe("createTransactionSchema", () => {
  const validUUID = "550e8400-e29b-41d4-a716-446655440000";

  describe("valid data", () => {
    it("should validate correct transaction data with all fields", () => {
      const validData = {
        amount: 100.5,
        type: "expense",
        category_id: validUUID,
        description: "Grocery shopping",
        occurred_at: "2024-01-15T10:30:00Z",
      };

      const result = createTransactionSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it("should validate transaction without optional occurred_at", () => {
      const validData = {
        amount: 50,
        type: "income",
        category_id: validUUID,
        description: "Salary",
      };

      const result = createTransactionSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it("should accept amount as string and transform to number", () => {
      const validData = {
        amount: "99.99",
        type: "expense",
        category_id: validUUID,
        description: "Test",
      };

      const result = createTransactionSchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.amount).toBe(99.99);
      }
    });

    it("should accept minimum amount 0.01", () => {
      const validData = {
        amount: 0.01,
        type: "expense",
        category_id: validUUID,
        description: "Minimum transaction",
      };

      const result = createTransactionSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it("should accept maximum amount 1000000", () => {
      const validData = {
        amount: 1000000,
        type: "income",
        category_id: validUUID,
        description: "Maximum transaction",
      };

      const result = createTransactionSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });
  });

  describe("amount validation", () => {
    it("should reject amount below 0.01", () => {
      const invalidData = {
        amount: 0.001,
        type: "expense",
        category_id: validUUID,
        description: "Too small",
      };

      const result = createTransactionSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Amount must be between 0.01 and 1,000,000.00");
      }
    });

    it("should reject amount above 1000000", () => {
      const invalidData = {
        amount: 1000000.01,
        type: "expense",
        category_id: validUUID,
        description: "Too large",
      };

      const result = createTransactionSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Amount must be between 0.01 and 1,000,000.00");
      }
    });

    it("should reject zero amount", () => {
      const invalidData = {
        amount: 0,
        type: "expense",
        category_id: validUUID,
        description: "Zero amount",
      };

      const result = createTransactionSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it("should reject negative amount", () => {
      const invalidData = {
        amount: -50,
        type: "expense",
        category_id: validUUID,
        description: "Negative amount",
      };

      const result = createTransactionSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it("should reject non-numeric string amount", () => {
      const invalidData = {
        amount: "abc",
        type: "expense",
        category_id: validUUID,
        description: "Invalid amount",
      };

      const result = createTransactionSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });
  });

  describe("type validation", () => {
    it("should accept 'expense' type", () => {
      const validData = {
        amount: 100,
        type: "expense",
        category_id: validUUID,
        description: "Test",
      };

      const result = createTransactionSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it("should accept 'income' type", () => {
      const validData = {
        amount: 100,
        type: "income",
        category_id: validUUID,
        description: "Test",
      };

      const result = createTransactionSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it("should reject invalid type", () => {
      const invalidData = {
        amount: 100,
        type: "transfer",
        category_id: validUUID,
        description: "Test",
      };

      const result = createTransactionSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Type must be 'expense' or 'income'");
      }
    });
  });

  describe("category_id validation", () => {
    it("should reject invalid UUID format", () => {
      const invalidData = {
        amount: 100,
        type: "expense",
        category_id: "not-a-uuid",
        description: "Test",
      };

      const result = createTransactionSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Invalid category ID format");
      }
    });

    it("should reject empty category_id", () => {
      const invalidData = {
        amount: 100,
        type: "expense",
        category_id: "",
        description: "Test",
      };

      const result = createTransactionSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });
  });

  describe("description validation", () => {
    it("should reject empty description", () => {
      const invalidData = {
        amount: 100,
        type: "expense",
        category_id: validUUID,
        description: "",
      };

      const result = createTransactionSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Description is required");
      }
    });

    it("should reject whitespace-only description", () => {
      const invalidData = {
        amount: 100,
        type: "expense",
        category_id: validUUID,
        description: "   ",
      };

      const result = createTransactionSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Description cannot be whitespace-only");
      }
    });

    it("should reject description longer than 255 characters", () => {
      const invalidData = {
        amount: 100,
        type: "expense",
        category_id: validUUID,
        description: "a".repeat(256),
      };

      const result = createTransactionSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Description must not exceed 255 characters");
      }
    });

    it("should accept description at max length (255 characters)", () => {
      const validData = {
        amount: 100,
        type: "expense",
        category_id: validUUID,
        description: "a".repeat(255),
      };

      const result = createTransactionSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });
  });

  describe("occurred_at validation", () => {
    it("should reject invalid ISO datetime format", () => {
      const invalidData = {
        amount: 100,
        type: "expense",
        category_id: validUUID,
        description: "Test",
        occurred_at: "2024-01-15",
      };

      const result = createTransactionSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Invalid ISO 8601 datetime format");
      }
    });

    it("should accept valid ISO datetime with UTC timezone (Z)", () => {
      const validData = {
        amount: 100,
        type: "expense",
        category_id: validUUID,
        description: "Test",
        occurred_at: "2024-01-15T10:30:00Z",
      };

      const result = createTransactionSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it("should reject ISO datetime with offset timezone", () => {
      const invalidData = {
        amount: 100,
        type: "expense",
        category_id: validUUID,
        description: "Test",
        occurred_at: "2024-01-15T10:30:00+02:00",
      };

      const result = createTransactionSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });
  });
});

describe("transactionIdSchema", () => {
  it("should validate correct UUID", () => {
    const validUUID = "550e8400-e29b-41d4-a716-446655440000";

    const result = transactionIdSchema.safeParse(validUUID);

    expect(result.success).toBe(true);
  });

  it("should reject invalid UUID format", () => {
    const result = transactionIdSchema.safeParse("invalid-id");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Invalid transaction ID format");
    }
  });

  it("should reject empty string", () => {
    const result = transactionIdSchema.safeParse("");

    expect(result.success).toBe(false);
  });
});

describe("transactionsQuerySchema", () => {
  describe("month validation", () => {
    it("should accept valid month format YYYY-MM", () => {
      const result = transactionsQuerySchema.safeParse({ month: "2024-01" });

      expect(result.success).toBe(true);
    });

    it("should accept month 01 to 12", () => {
      const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

      months.forEach((month) => {
        const result = transactionsQuerySchema.safeParse({ month: `2024-${month}` });
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid month format", () => {
      const invalidFormats = ["2024-1", "24-01", "2024/01", "January 2024", "2024-13", "2024-00"];

      invalidFormats.forEach((format) => {
        const result = transactionsQuerySchema.safeParse({ month: format });
        expect(result.success).toBe(false);
      });
    });

    it("should allow empty query (month is optional)", () => {
      const result = transactionsQuerySchema.safeParse({});

      expect(result.success).toBe(true);
    });
  });

  describe("category_id validation", () => {
    it("should accept valid UUID for category_id", () => {
      const result = transactionsQuerySchema.safeParse({
        category_id: "550e8400-e29b-41d4-a716-446655440000",
      });

      expect(result.success).toBe(true);
    });

    it("should reject invalid category_id format", () => {
      const result = transactionsQuerySchema.safeParse({
        category_id: "invalid",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Invalid category ID format");
      }
    });
  });

  describe("limit validation", () => {
    it("should default limit to 20", () => {
      const result = transactionsQuerySchema.safeParse({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
      }
    });

    it("should accept limit between 1 and 100", () => {
      const result1 = transactionsQuerySchema.safeParse({ limit: 1 });
      const result100 = transactionsQuerySchema.safeParse({ limit: 100 });

      expect(result1.success).toBe(true);
      expect(result100.success).toBe(true);
    });

    it("should reject limit below 1", () => {
      const result = transactionsQuerySchema.safeParse({ limit: 0 });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Limit must be at least 1");
      }
    });

    it("should reject limit above 100", () => {
      const result = transactionsQuerySchema.safeParse({ limit: 101 });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Limit cannot exceed 100");
      }
    });

    it("should coerce string to number for limit", () => {
      const result = transactionsQuerySchema.safeParse({ limit: "50" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
      }
    });

    it("should reject non-integer limit", () => {
      const result = transactionsQuerySchema.safeParse({ limit: 10.5 });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Limit must be an integer");
      }
    });
  });

  describe("offset validation", () => {
    it("should default offset to 0", () => {
      const result = transactionsQuerySchema.safeParse({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.offset).toBe(0);
      }
    });

    it("should accept offset >= 0", () => {
      const result0 = transactionsQuerySchema.safeParse({ offset: 0 });
      const result100 = transactionsQuerySchema.safeParse({ offset: 100 });

      expect(result0.success).toBe(true);
      expect(result100.success).toBe(true);
    });

    it("should reject negative offset", () => {
      const result = transactionsQuerySchema.safeParse({ offset: -1 });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Offset cannot be negative");
      }
    });

    it("should coerce string to number for offset", () => {
      const result = transactionsQuerySchema.safeParse({ offset: "20" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.offset).toBe(20);
      }
    });

    it("should reject non-integer offset", () => {
      const result = transactionsQuerySchema.safeParse({ offset: 5.5 });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Offset must be an integer");
      }
    });
  });
});

describe("updateTransactionSchema", () => {
  const validUUID = "550e8400-e29b-41d4-a716-446655440000";

  it("should validate partial update with only amount", () => {
    const result = updateTransactionSchema.safeParse({ amount: 150 });

    expect(result.success).toBe(true);
  });

  it("should validate partial update with only type", () => {
    const result = updateTransactionSchema.safeParse({ type: "income" });

    expect(result.success).toBe(true);
  });

  it("should validate partial update with only category_id", () => {
    const result = updateTransactionSchema.safeParse({ category_id: validUUID });

    expect(result.success).toBe(true);
  });

  it("should validate partial update with only description", () => {
    const result = updateTransactionSchema.safeParse({ description: "Updated description" });

    expect(result.success).toBe(true);
  });

  it("should validate partial update with only occurred_at", () => {
    const result = updateTransactionSchema.safeParse({ occurred_at: "2024-02-20T15:00:00Z" });

    expect(result.success).toBe(true);
  });

  it("should validate full update with all fields", () => {
    const validData = {
      amount: 200,
      type: "expense",
      category_id: validUUID,
      description: "Full update",
      occurred_at: "2024-03-01T12:00:00Z",
    };

    const result = updateTransactionSchema.safeParse(validData);

    expect(result.success).toBe(true);
  });

  it("should reject empty update (no fields provided)", () => {
    const result = updateTransactionSchema.safeParse({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("At least one field must be provided for update");
    }
  });

  it("should apply same amount validation rules as create", () => {
    const result = updateTransactionSchema.safeParse({ amount: 0 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Amount must be between 0.01 and 1,000,000.00");
    }
  });

  it("should apply same type validation rules as create", () => {
    const result = updateTransactionSchema.safeParse({ type: "invalid" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Type must be 'expense' or 'income'");
    }
  });

  it("should apply same description validation rules as create", () => {
    const result = updateTransactionSchema.safeParse({ description: "   " });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Description cannot be whitespace-only");
    }
  });
});

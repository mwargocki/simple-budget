import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { SupabaseClient } from "@/db/supabase.client";
import { SummaryService } from "@/lib/services/summary.service";
import { createMockSupabaseClient, resetMockSupabaseClient, type MockSupabaseClient } from "../../mocks/supabase.mock";

describe("SummaryService", () => {
  let mockClient: MockSupabaseClient;
  let service: SummaryService;

  const testUserId = "550e8400-e29b-41d4-a716-446655440000";

  // Sample transactions data for testing
  const sampleTransactions = [
    {
      category_id: "cat-1",
      amount: 1000.0,
      type: "income",
      categories: { name: "Salary" },
    },
    {
      category_id: "cat-1",
      amount: 500.0,
      type: "income",
      categories: { name: "Salary" },
    },
    {
      category_id: "cat-2",
      amount: 200.5,
      type: "expense",
      categories: { name: "Food" },
    },
    {
      category_id: "cat-2",
      amount: 150.25,
      type: "expense",
      categories: { name: "Food" },
    },
    {
      category_id: "cat-3",
      amount: 50.0,
      type: "expense",
      categories: { name: "Transport" },
    },
  ];

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    service = new SummaryService(mockClient as unknown as SupabaseClient);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Helper to setup profile mock response
   */
  function mockProfileResponse(timezone: string | null, error: unknown = null) {
    // Create a separate chain for profiles query
    const profileChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: timezone ? { timezone } : null,
        error,
      }),
    };

    // Create a separate chain for transactions query
    const transactionChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    mockClient.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return profileChain;
      }
      return transactionChain;
    });

    return { profileChain, transactionChain };
  }

  /**
   * Helper to setup full mock for getMonthlySummary
   */
  function setupMonthlySummaryMock(timezone: string, transactions: unknown[]) {
    const profileChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { timezone },
        error: null,
      }),
    };

    const transactionChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockResolvedValue({
        data: transactions,
        error: null,
      }),
    };

    mockClient.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return profileChain;
      }
      return transactionChain;
    });

    return { profileChain, transactionChain };
  }

  describe("getMonthlySummary", () => {
    describe("category aggregation", () => {
      it("should aggregate transactions by category", async () => {
        // Arrange
        setupMonthlySummaryMock("UTC", sampleTransactions);

        // Act
        const result = await service.getMonthlySummary("2024-01", testUserId);

        // Assert
        expect(result.categories).toHaveLength(3);

        const salaryCategory = result.categories.find((c) => c.category_name === "Salary");
        expect(salaryCategory).toBeDefined();
        expect(salaryCategory?.transaction_count).toBe(2);

        const foodCategory = result.categories.find((c) => c.category_name === "Food");
        expect(foodCategory).toBeDefined();
        expect(foodCategory?.transaction_count).toBe(2);

        const transportCategory = result.categories.find((c) => c.category_name === "Transport");
        expect(transportCategory).toBeDefined();
        expect(transportCategory?.transaction_count).toBe(1);
      });

      it("should return empty categories array when no transactions", async () => {
        // Arrange
        setupMonthlySummaryMock("UTC", []);

        // Act
        const result = await service.getMonthlySummary("2024-01", testUserId);

        // Assert
        expect(result.categories).toEqual([]);
        expect(result.total_income).toBe("0.00");
        expect(result.total_expenses).toBe("0.00");
        expect(result.balance).toBe("0.00");
      });

      it("should correctly separate income and expenses within same category", async () => {
        // Arrange
        const mixedCategoryTransactions = [
          { category_id: "cat-1", amount: 100, type: "income", categories: { name: "Mixed" } },
          { category_id: "cat-1", amount: 30, type: "expense", categories: { name: "Mixed" } },
        ];
        setupMonthlySummaryMock("UTC", mixedCategoryTransactions);

        // Act
        const result = await service.getMonthlySummary("2024-01", testUserId);

        // Assert
        expect(result.categories).toHaveLength(1);
        const mixedCategory = result.categories[0];
        expect(mixedCategory.income).toBe("100.00");
        expect(mixedCategory.expenses).toBe("30.00");
        expect(mixedCategory.balance).toBe("70.00");
        expect(mixedCategory.transaction_count).toBe(2);
      });
    });

    describe("totals calculation", () => {
      it("should calculate total_income correctly", async () => {
        // Arrange
        setupMonthlySummaryMock("UTC", sampleTransactions);

        // Act
        const result = await service.getMonthlySummary("2024-01", testUserId);

        // Assert
        // 1000 + 500 = 1500
        expect(result.total_income).toBe("1500.00");
      });

      it("should calculate total_expenses correctly", async () => {
        // Arrange
        setupMonthlySummaryMock("UTC", sampleTransactions);

        // Act
        const result = await service.getMonthlySummary("2024-01", testUserId);

        // Assert
        // 200.5 + 150.25 + 50 = 400.75
        expect(result.total_expenses).toBe("400.75");
      });

      it("should calculate balance correctly (income - expenses)", async () => {
        // Arrange
        setupMonthlySummaryMock("UTC", sampleTransactions);

        // Act
        const result = await service.getMonthlySummary("2024-01", testUserId);

        // Assert
        // 1500 - 400.75 = 1099.25
        expect(result.balance).toBe("1099.25");
      });

      it("should handle negative balance (expenses > income)", async () => {
        // Arrange
        const expensiveTransactions = [
          { category_id: "cat-1", amount: 100, type: "income", categories: { name: "Salary" } },
          { category_id: "cat-2", amount: 500, type: "expense", categories: { name: "Rent" } },
        ];
        setupMonthlySummaryMock("UTC", expensiveTransactions);

        // Act
        const result = await service.getMonthlySummary("2024-01", testUserId);

        // Assert
        expect(result.total_income).toBe("100.00");
        expect(result.total_expenses).toBe("500.00");
        expect(result.balance).toBe("-400.00");
      });

      it("should handle only income transactions", async () => {
        // Arrange
        const incomeOnly = [
          { category_id: "cat-1", amount: 1000, type: "income", categories: { name: "Salary" } },
          { category_id: "cat-2", amount: 200, type: "income", categories: { name: "Bonus" } },
        ];
        setupMonthlySummaryMock("UTC", incomeOnly);

        // Act
        const result = await service.getMonthlySummary("2024-01", testUserId);

        // Assert
        expect(result.total_income).toBe("1200.00");
        expect(result.total_expenses).toBe("0.00");
        expect(result.balance).toBe("1200.00");
      });

      it("should handle only expense transactions", async () => {
        // Arrange
        const expenseOnly = [
          { category_id: "cat-1", amount: 100, type: "expense", categories: { name: "Food" } },
          { category_id: "cat-2", amount: 50, type: "expense", categories: { name: "Transport" } },
        ];
        setupMonthlySummaryMock("UTC", expenseOnly);

        // Act
        const result = await service.getMonthlySummary("2024-01", testUserId);

        // Assert
        expect(result.total_income).toBe("0.00");
        expect(result.total_expenses).toBe("150.00");
        expect(result.balance).toBe("-150.00");
      });
    });

    describe("amount formatting", () => {
      it("should format amounts with exactly 2 decimal places", async () => {
        // Arrange
        setupMonthlySummaryMock("UTC", sampleTransactions);

        // Act
        const result = await service.getMonthlySummary("2024-01", testUserId);

        // Assert
        expect(result.total_income).toMatch(/^\d+\.\d{2}$/);
        expect(result.total_expenses).toMatch(/^\d+\.\d{2}$/);
        expect(result.balance).toMatch(/^-?\d+\.\d{2}$/);

        result.categories.forEach((category) => {
          expect(category.income).toMatch(/^\d+\.\d{2}$/);
          expect(category.expenses).toMatch(/^\d+\.\d{2}$/);
          expect(category.balance).toMatch(/^-?\d+\.\d{2}$/);
        });
      });

      it("should handle integer amounts with .00 formatting", async () => {
        // Arrange
        const integerAmounts = [
          { category_id: "cat-1", amount: 100, type: "income", categories: { name: "Salary" } },
        ];
        setupMonthlySummaryMock("UTC", integerAmounts);

        // Act
        const result = await service.getMonthlySummary("2024-01", testUserId);

        // Assert
        expect(result.total_income).toBe("100.00");
        expect(result.categories[0].income).toBe("100.00");
      });

      it("should handle amounts with more than 2 decimal places", async () => {
        // Arrange - JavaScript floating point can cause precision issues
        const preciseAmounts = [
          { category_id: "cat-1", amount: 10.999, type: "income", categories: { name: "Test" } },
        ];
        setupMonthlySummaryMock("UTC", preciseAmounts);

        // Act
        const result = await service.getMonthlySummary("2024-01", testUserId);

        // Assert - toFixed(2) rounds 10.999 to "11.00"
        expect(result.total_income).toBe("11.00");
      });

      it("should handle very small amounts", async () => {
        // Arrange
        const smallAmounts = [
          { category_id: "cat-1", amount: 0.01, type: "expense", categories: { name: "Fee" } },
        ];
        setupMonthlySummaryMock("UTC", smallAmounts);

        // Act
        const result = await service.getMonthlySummary("2024-01", testUserId);

        // Assert
        expect(result.total_expenses).toBe("0.01");
      });

      it("should handle large amounts", async () => {
        // Arrange
        const largeAmounts = [
          { category_id: "cat-1", amount: 999999.99, type: "income", categories: { name: "Jackpot" } },
        ];
        setupMonthlySummaryMock("UTC", largeAmounts);

        // Act
        const result = await service.getMonthlySummary("2024-01", testUserId);

        // Assert
        expect(result.total_income).toBe("999999.99");
      });
    });

    describe("month parameter handling", () => {
      it("should return correct month string when month is provided", async () => {
        // Arrange
        setupMonthlySummaryMock("UTC", []);

        // Act
        const result = await service.getMonthlySummary("2024-03", testUserId);

        // Assert
        expect(result.month).toBe("2024-03");
      });

      it("should handle single-digit month correctly", async () => {
        // Arrange
        setupMonthlySummaryMock("UTC", []);

        // Act
        const result = await service.getMonthlySummary("2024-01", testUserId);

        // Assert
        expect(result.month).toBe("2024-01");
      });

      it("should use current month when month parameter is undefined", async () => {
        // Arrange
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
        setupMonthlySummaryMock("UTC", []);

        // Act
        const result = await service.getMonthlySummary(undefined, testUserId);

        // Assert
        expect(result.month).toBe("2024-06");
      });
    });
  });

  describe("timezone handling (via getMonthlySummary)", () => {
    it("should default to UTC when profile does not exist", async () => {
      // Arrange
      const profileChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "No rows found" },
        }),
      };

      const transactionChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      mockClient.from.mockImplementation((table: string) => {
        if (table === "profiles") {
          return profileChain;
        }
        return transactionChain;
      });

      // Act
      const result = await service.getMonthlySummary("2024-01", testUserId);

      // Assert - should not throw, uses UTC as default
      expect(result.month).toBe("2024-01");
    });

    it("should use profile timezone when available", async () => {
      // Arrange
      const { transactionChain } = setupMonthlySummaryMock("Europe/Warsaw", []);

      // Act
      await service.getMonthlySummary("2024-01", testUserId);

      // Assert - verify the transaction chain was called with date filters
      expect(transactionChain.gte).toHaveBeenCalled();
      expect(transactionChain.lt).toHaveBeenCalled();
    });

    it("should handle various timezones correctly", async () => {
      // Arrange
      const timezones = ["UTC", "Europe/Warsaw", "America/New_York", "Asia/Tokyo", "Pacific/Auckland"];

      for (const tz of timezones) {
        resetMockSupabaseClient(mockClient);
        setupMonthlySummaryMock(tz, []);

        // Act
        const result = await service.getMonthlySummary("2024-01", testUserId);

        // Assert - should not throw and return valid result
        expect(result.month).toBe("2024-01");
        expect(result.categories).toEqual([]);
      }
    });

    it("should calculate month boundaries considering timezone for current month", async () => {
      // Arrange
      vi.useFakeTimers();
      // Set time to January 1, 2024 00:30 UTC
      // In Europe/Warsaw (UTC+1 in winter), this is January 1, 2024 01:30
      vi.setSystemTime(new Date("2024-01-01T00:30:00Z"));

      setupMonthlySummaryMock("Europe/Warsaw", []);

      // Act
      const result = await service.getMonthlySummary(undefined, testUserId);

      // Assert
      // In Europe/Warsaw timezone, it's already January 1st
      expect(result.month).toBe("2024-01");
    });
  });

  describe("year transition handling", () => {
    it("should correctly calculate December month range", async () => {
      // Arrange
      const { transactionChain } = setupMonthlySummaryMock("UTC", []);

      // Act
      await service.getMonthlySummary("2024-12", testUserId);

      // Assert
      const gteCall = transactionChain.gte.mock.calls[0];
      const ltCall = transactionChain.lt.mock.calls[0];

      expect(gteCall[0]).toBe("occurred_at");
      expect(ltCall[0]).toBe("occurred_at");

      // Parse dates and verify the range spans December
      const startDate = new Date(gteCall[1]);
      const endDate = new Date(ltCall[1]);

      // Verify the range is about 31 days (December length)
      const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBe(31);

      // Verify end date is after start date and represents next month
      expect(endDate.getTime()).toBeGreaterThan(startDate.getTime());
    });

    it("should correctly calculate January month range", async () => {
      // Arrange
      const { transactionChain } = setupMonthlySummaryMock("UTC", []);

      // Act
      await service.getMonthlySummary("2024-01", testUserId);

      // Assert
      const gteCall = transactionChain.gte.mock.calls[0];
      const ltCall = transactionChain.lt.mock.calls[0];

      // Parse dates and verify the range spans January
      const startDate = new Date(gteCall[1]);
      const endDate = new Date(ltCall[1]);

      // Verify the range is about 31 days (January length)
      const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBe(31);

      // Verify end date is after start date
      expect(endDate.getTime()).toBeGreaterThan(startDate.getTime());
    });

    it("should handle year transition in current month (December to January)", async () => {
      // Arrange
      vi.useFakeTimers();
      // December 31, 2024, 23:30 UTC
      vi.setSystemTime(new Date("2024-12-31T23:30:00Z"));
      setupMonthlySummaryMock("UTC", []);

      // Act
      const result = await service.getMonthlySummary(undefined, testUserId);

      // Assert
      expect(result.month).toBe("2024-12");
    });

    it("should handle timezone at year boundary", async () => {
      // Arrange
      vi.useFakeTimers();
      // December 31, 2024, 23:30 UTC - in Tokyo (UTC+9) it's already January 1, 2025, 08:30
      vi.setSystemTime(new Date("2024-12-31T23:30:00Z"));
      setupMonthlySummaryMock("Asia/Tokyo", []);

      // Act
      const result = await service.getMonthlySummary(undefined, testUserId);

      // Assert - In Tokyo timezone, it's already January 2025
      expect(result.month).toBe("2025-01");
    });
  });

  describe("error handling", () => {
    it("should propagate Supabase transaction query errors", async () => {
      // Arrange
      const profileChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { timezone: "UTC" },
          error: null,
        }),
      };

      const dbError = {
        code: "PGRST500",
        message: "Database connection error",
      };

      const transactionChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockResolvedValue({
          data: null,
          error: dbError,
        }),
      };

      mockClient.from.mockImplementation((table: string) => {
        if (table === "profiles") {
          return profileChain;
        }
        return transactionChain;
      });

      // Act & Assert
      await expect(service.getMonthlySummary("2024-01", testUserId)).rejects.toEqual(dbError);
    });

    it("should handle null data from transaction query gracefully", async () => {
      // Arrange
      const profileChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { timezone: "UTC" },
          error: null,
        }),
      };

      const transactionChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      mockClient.from.mockImplementation((table: string) => {
        if (table === "profiles") {
          return profileChain;
        }
        return transactionChain;
      });

      // Act
      const result = await service.getMonthlySummary("2024-01", testUserId);

      // Assert - should handle null data as empty array
      expect(result.categories).toEqual([]);
      expect(result.total_income).toBe("0.00");
      expect(result.total_expenses).toBe("0.00");
    });
  });

  describe("query construction", () => {
    it("should query profiles table with correct user id", async () => {
      // Arrange
      const { profileChain } = setupMonthlySummaryMock("UTC", []);

      // Act
      await service.getMonthlySummary("2024-01", testUserId);

      // Assert
      expect(mockClient.from).toHaveBeenCalledWith("profiles");
      expect(profileChain.select).toHaveBeenCalledWith("timezone");
      expect(profileChain.eq).toHaveBeenCalledWith("id", testUserId);
    });

    it("should query transactions table with correct filters", async () => {
      // Arrange
      const { transactionChain } = setupMonthlySummaryMock("UTC", []);

      // Act
      await service.getMonthlySummary("2024-01", testUserId);

      // Assert
      expect(mockClient.from).toHaveBeenCalledWith("transactions");
      expect(transactionChain.select).toHaveBeenCalledWith(
        expect.stringContaining("category_id")
      );
      expect(transactionChain.select).toHaveBeenCalledWith(
        expect.stringContaining("amount")
      );
      expect(transactionChain.select).toHaveBeenCalledWith(
        expect.stringContaining("type")
      );
      expect(transactionChain.eq).toHaveBeenCalledWith("user_id", testUserId);
    });
  });

  describe("category balance calculation", () => {
    it("should calculate positive balance for income-heavy category", async () => {
      // Arrange
      const transactions = [
        { category_id: "cat-1", amount: 1000, type: "income", categories: { name: "Salary" } },
        { category_id: "cat-1", amount: 200, type: "expense", categories: { name: "Salary" } },
      ];
      setupMonthlySummaryMock("UTC", transactions);

      // Act
      const result = await service.getMonthlySummary("2024-01", testUserId);

      // Assert
      expect(result.categories[0].balance).toBe("800.00");
    });

    it("should calculate negative balance for expense-heavy category", async () => {
      // Arrange
      const transactions = [
        { category_id: "cat-1", amount: 100, type: "income", categories: { name: "Shopping" } },
        { category_id: "cat-1", amount: 500, type: "expense", categories: { name: "Shopping" } },
      ];
      setupMonthlySummaryMock("UTC", transactions);

      // Act
      const result = await service.getMonthlySummary("2024-01", testUserId);

      // Assert
      expect(result.categories[0].balance).toBe("-400.00");
    });

    it("should calculate zero balance when income equals expenses", async () => {
      // Arrange
      const transactions = [
        { category_id: "cat-1", amount: 300, type: "income", categories: { name: "Balanced" } },
        { category_id: "cat-1", amount: 300, type: "expense", categories: { name: "Balanced" } },
      ];
      setupMonthlySummaryMock("UTC", transactions);

      // Act
      const result = await service.getMonthlySummary("2024-01", testUserId);

      // Assert
      expect(result.categories[0].balance).toBe("0.00");
    });
  });
});

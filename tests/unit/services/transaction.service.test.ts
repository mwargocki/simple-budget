import { describe, it, expect, beforeEach, vi } from "vitest";
import type { SupabaseClient } from "@/db/supabase.client";
import {
  TransactionService,
  CategoryNotFoundError,
  TransactionNotFoundError,
} from "@/lib/services/transaction.service";
import { createMockSupabaseClient, type MockSupabaseClient } from "../../mocks/supabase.mock";
import type { CreateTransactionCommand, UpdateTransactionCommand } from "@/types";

describe("TransactionService", () => {
  let mockClient: MockSupabaseClient;
  let service: TransactionService;

  const testUserId = "550e8400-e29b-41d4-a716-446655440000";

  const testCategory = {
    id: "660e8400-e29b-41d4-a716-446655440001",
    name: "Groceries",
  };

  const testTransaction = {
    id: "770e8400-e29b-41d4-a716-446655440002",
    amount: 125.5,
    type: "expense" as const,
    category_id: testCategory.id,
    description: "Weekly groceries",
    occurred_at: "2024-01-15T12:00:00Z",
    created_at: "2024-01-15T12:00:00Z",
    updated_at: "2024-01-15T12:00:00Z",
  };

  const testTransactionWithCategory = {
    ...testTransaction,
    categories: { name: testCategory.name },
  };

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    service = new TransactionService(mockClient as unknown as SupabaseClient);
  });

  describe("createTransaction", () => {
    const validCommand: CreateTransactionCommand = {
      amount: 125.5,
      type: "expense",
      category_id: testCategory.id,
      description: "Weekly groceries",
      occurred_at: "2024-01-15T12:00:00Z",
    };

    it("should create and return transaction with category name", async () => {
      // Arrange
      // First call: verify category exists
      mockClient._chain.single
        .mockResolvedValueOnce({
          data: testCategory,
          error: null,
        })
        // Second call: insert transaction
        .mockResolvedValueOnce({
          data: testTransaction,
          error: null,
        });

      // Act
      const result = await service.createTransaction(validCommand, testUserId);

      // Assert
      expect(result).toEqual({
        id: testTransaction.id,
        amount: "125.50",
        type: "expense",
        category_id: testCategory.id,
        category_name: testCategory.name,
        description: "Weekly groceries",
        occurred_at: testTransaction.occurred_at,
        created_at: testTransaction.created_at,
        updated_at: testTransaction.updated_at,
      });
      expect(mockClient.from).toHaveBeenCalledWith("categories");
      expect(mockClient.from).toHaveBeenCalledWith("transactions");
      expect(mockClient._chain.insert).toHaveBeenCalledWith({
        user_id: testUserId,
        category_id: validCommand.category_id,
        amount: validCommand.amount,
        type: validCommand.type,
        description: validCommand.description,
        occurred_at: validCommand.occurred_at,
      });
    });

    it("should create transaction with amount as string", async () => {
      // Arrange
      const commandWithStringAmount: CreateTransactionCommand = {
        ...validCommand,
        amount: "99.99",
      };

      mockClient._chain.single
        .mockResolvedValueOnce({
          data: testCategory,
          error: null,
        })
        .mockResolvedValueOnce({
          data: { ...testTransaction, amount: 99.99 },
          error: null,
        });

      // Act
      const result = await service.createTransaction(commandWithStringAmount, testUserId);

      // Assert
      expect(result.amount).toBe("99.99");
      expect(mockClient._chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 99.99,
        })
      );
    });

    it("should use current date when occurred_at is not provided", async () => {
      // Arrange
      const commandWithoutDate: CreateTransactionCommand = {
        amount: 50,
        type: "income",
        category_id: testCategory.id,
        description: "Payment received",
      };

      const mockDate = new Date("2024-02-01T10:00:00Z");
      vi.setSystemTime(mockDate);

      mockClient._chain.single
        .mockResolvedValueOnce({
          data: testCategory,
          error: null,
        })
        .mockResolvedValueOnce({
          data: { ...testTransaction, amount: 50, type: "income" },
          error: null,
        });

      // Act
      await service.createTransaction(commandWithoutDate, testUserId);

      // Assert
      expect(mockClient._chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          occurred_at: mockDate.toISOString(),
        })
      );

      vi.useRealTimers();
    });

    it("should throw CategoryNotFoundError when category does not exist", async () => {
      // Arrange
      mockClient._chain.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows returned" },
      });

      // Act & Assert
      await expect(service.createTransaction(validCommand, testUserId)).rejects.toThrow(
        CategoryNotFoundError
      );
    });

    it("should throw CategoryNotFoundError when category returns null data without error", async () => {
      // Arrange
      mockClient._chain.single.mockResolvedValue({
        data: null,
        error: null,
      });

      // Act & Assert
      await expect(service.createTransaction(validCommand, testUserId)).rejects.toThrow(
        CategoryNotFoundError
      );
    });

    it("should propagate database errors on insert", async () => {
      // Arrange
      const dbError = {
        code: "23503",
        message: "foreign key constraint violation",
      };

      mockClient._chain.single
        .mockResolvedValueOnce({
          data: testCategory,
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: dbError,
        });

      // Act & Assert
      await expect(service.createTransaction(validCommand, testUserId)).rejects.toEqual(dbError);
    });

    it("should format amount to 2 decimal places", async () => {
      // Arrange
      mockClient._chain.single
        .mockResolvedValueOnce({
          data: testCategory,
          error: null,
        })
        .mockResolvedValueOnce({
          data: { ...testTransaction, amount: 100 },
          error: null,
        });

      // Act
      const result = await service.createTransaction(validCommand, testUserId);

      // Assert
      expect(result.amount).toBe("100.00");
    });
  });

  describe("getTransactionById", () => {
    it("should return transaction with category name", async () => {
      // Arrange
      mockClient._chain.single.mockResolvedValue({
        data: testTransactionWithCategory,
        error: null,
      });

      // Act
      const result = await service.getTransactionById(testTransaction.id, testUserId);

      // Assert
      expect(result).toEqual({
        id: testTransaction.id,
        amount: "125.50",
        type: "expense",
        category_id: testCategory.id,
        category_name: testCategory.name,
        description: "Weekly groceries",
        occurred_at: testTransaction.occurred_at,
        created_at: testTransaction.created_at,
        updated_at: testTransaction.updated_at,
      });
      expect(mockClient.from).toHaveBeenCalledWith("transactions");
      expect(mockClient._chain.select).toHaveBeenCalledWith(
        expect.stringContaining("categories!inner(name)")
      );
      expect(mockClient._chain.eq).toHaveBeenCalledWith("id", testTransaction.id);
      expect(mockClient._chain.eq).toHaveBeenCalledWith("user_id", testUserId);
    });

    it("should throw TransactionNotFoundError when transaction does not exist", async () => {
      // Arrange
      mockClient._chain.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows returned" },
      });

      // Act & Assert
      await expect(
        service.getTransactionById("non-existent-id", testUserId)
      ).rejects.toThrow(TransactionNotFoundError);
    });

    it("should throw TransactionNotFoundError when data is null without error", async () => {
      // Arrange
      mockClient._chain.single.mockResolvedValue({
        data: null,
        error: null,
      });

      // Act & Assert
      await expect(
        service.getTransactionById(testTransaction.id, testUserId)
      ).rejects.toThrow(TransactionNotFoundError);
    });

    it("should format amount correctly for integer values", async () => {
      // Arrange
      mockClient._chain.single.mockResolvedValue({
        data: { ...testTransactionWithCategory, amount: 200 },
        error: null,
      });

      // Act
      const result = await service.getTransactionById(testTransaction.id, testUserId);

      // Assert
      expect(result.amount).toBe("200.00");
    });
  });

  describe("getTransactions", () => {
    const transactionsList = [
      {
        id: "tx1",
        amount: 100.5,
        type: "expense",
        category_id: testCategory.id,
        description: "Transaction 1",
        occurred_at: "2024-01-15T12:00:00Z",
        created_at: "2024-01-15T12:00:00Z",
        updated_at: "2024-01-15T12:00:00Z",
        categories: { name: "Groceries" },
      },
      {
        id: "tx2",
        amount: 50.25,
        type: "income",
        category_id: "cat2",
        description: "Transaction 2",
        occurred_at: "2024-01-14T12:00:00Z",
        created_at: "2024-01-14T12:00:00Z",
        updated_at: "2024-01-14T12:00:00Z",
        categories: { name: "Salary" },
      },
    ];

    it("should return transactions list with pagination", async () => {
      // Arrange
      // Count query result (has count property, not data)
      const countQueryResult = { data: null, error: null, count: 2 };
      // Data query result
      const dataQueryResult = { data: transactionsList, error: null };

      // Track which query type we're building
      let isCountQuery = false;

      mockClient._chain.select.mockImplementation((columns: string, options?: { count?: string; head?: boolean }) => {
        isCountQuery = options?.count === "exact";
        return mockClient._chain;
      });

      mockClient._chain.lt.mockImplementation(() => {
        if (isCountQuery) {
          // Count query - return promise-like object
          return Promise.resolve(countQueryResult);
        }
        // Data query - continue chain for order().range()
        return {
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue(dataQueryResult),
          }),
        };
      });

      // Act
      const result = await service.getTransactions({ month: "2024-01" }, testUserId);

      // Assert
      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0].amount).toBe("100.50");
      expect(result.transactions[0].category_name).toBe("Groceries");
      expect(result.pagination).toEqual({
        total: 2,
        limit: 20,
        offset: 0,
        has_more: false,
      });
    });

    it("should return has_more = true when more transactions exist", async () => {
      // Arrange
      const countQueryResult = { data: null, error: null, count: 50 };
      const dataQueryResult = { data: transactionsList, error: null };

      let isCountQuery = false;

      mockClient._chain.select.mockImplementation((columns: string, options?: { count?: string; head?: boolean }) => {
        isCountQuery = options?.count === "exact";
        return mockClient._chain;
      });

      mockClient._chain.lt.mockImplementation(() => {
        if (isCountQuery) {
          return Promise.resolve(countQueryResult);
        }
        return {
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue(dataQueryResult),
          }),
        };
      });

      // Act
      const result = await service.getTransactions({ month: "2024-01", limit: 2 }, testUserId);

      // Assert
      expect(result.pagination.has_more).toBe(true);
      expect(result.pagination.total).toBe(50);
    });

    it("should apply category filter when provided", async () => {
      // Arrange
      const countQueryResult = { data: null, error: null, count: 1 };
      const dataQueryResult = { data: [transactionsList[0]], error: null };

      const categoryId = testCategory.id;
      let eqCalls: string[][] = [];

      mockClient._chain.eq.mockImplementation((...args: string[]) => {
        eqCalls.push(args);
        return mockClient._chain;
      });

      let queryCount = 0;
      mockClient._chain.lt.mockImplementation(() => {
        queryCount++;
        if (queryCount === 1) {
          return {
            eq: vi.fn().mockImplementation((...args: string[]) => {
              eqCalls.push(args);
              return Promise.resolve(countQueryResult);
            }),
          };
        }
        return {
          eq: vi.fn().mockImplementation((...args: string[]) => {
            eqCalls.push(args);
            return {
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue(dataQueryResult),
              }),
            };
          }),
        };
      });

      // Act
      const result = await service.getTransactions(
        { month: "2024-01", category_id: categoryId },
        testUserId
      );

      // Assert
      expect(result.transactions).toHaveLength(1);
      // Verify category_id was used in eq calls
      const categoryEqCall = eqCalls.find((call) => call[0] === "category_id");
      expect(categoryEqCall).toBeDefined();
      expect(categoryEqCall?.[1]).toBe(categoryId);
    });

    it("should calculate month range for current month when month param is not provided", async () => {
      // Arrange
      const mockDate = new Date("2024-03-15T10:00:00Z");
      vi.setSystemTime(mockDate);

      const countQueryResult = { data: null, error: null, count: 0 };
      const dataQueryResult = { data: [], error: null };

      let gteValue: string | undefined;
      let ltValue: string | undefined;

      mockClient._chain.gte.mockImplementation((_field: string, value: string) => {
        gteValue = value;
        return mockClient._chain;
      });

      let queryCount = 0;
      mockClient._chain.lt.mockImplementation((_field: string, value: string) => {
        ltValue = value;
        queryCount++;
        if (queryCount === 1) {
          return {
            eq: vi.fn().mockResolvedValue(countQueryResult),
          };
        }
        return {
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue(dataQueryResult),
          }),
        };
      });

      // Act
      await service.getTransactions({}, testUserId);

      // Assert
      expect(gteValue).toBe("2024-03-01T00:00:00.000Z");
      expect(ltValue).toBe("2024-04-01T00:00:00.000Z");

      vi.useRealTimers();
    });

    it("should calculate month range correctly for provided month", async () => {
      // Arrange
      const countQueryResult = { data: null, error: null, count: 0 };
      const dataQueryResult = { data: [], error: null };

      let gteValue: string | undefined;
      let ltValue: string | undefined;

      mockClient._chain.gte.mockImplementation((_field: string, value: string) => {
        gteValue = value;
        return mockClient._chain;
      });

      let queryCount = 0;
      mockClient._chain.lt.mockImplementation((_field: string, value: string) => {
        ltValue = value;
        queryCount++;
        if (queryCount === 1) {
          return {
            eq: vi.fn().mockResolvedValue(countQueryResult),
          };
        }
        return {
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue(dataQueryResult),
          }),
        };
      });

      // Act
      await service.getTransactions({ month: "2024-12" }, testUserId);

      // Assert
      expect(gteValue).toBe("2024-12-01T00:00:00.000Z");
      expect(ltValue).toBe("2025-01-01T00:00:00.000Z");
    });

    it("should use default limit and offset when not provided", async () => {
      // Arrange
      const countQueryResult = { data: null, error: null, count: 0 };
      const dataQueryResult = { data: [], error: null };

      let rangeStart: number | undefined;
      let rangeEnd: number | undefined;

      let queryCount = 0;
      mockClient._chain.lt.mockImplementation(() => {
        queryCount++;
        if (queryCount === 1) {
          return {
            eq: vi.fn().mockResolvedValue(countQueryResult),
          };
        }
        return {
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockImplementation((start: number, end: number) => {
              rangeStart = start;
              rangeEnd = end;
              return Promise.resolve(dataQueryResult);
            }),
          }),
        };
      });

      // Act
      const result = await service.getTransactions({ month: "2024-01" }, testUserId);

      // Assert
      expect(rangeStart).toBe(0);
      expect(rangeEnd).toBe(19); // limit 20 - 1
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.offset).toBe(0);
    });

    it("should use custom limit and offset", async () => {
      // Arrange
      const countQueryResult = { data: null, error: null, count: 100 };
      const dataQueryResult = { data: transactionsList, error: null };

      let rangeStart: number | undefined;
      let rangeEnd: number | undefined;

      let queryCount = 0;
      mockClient._chain.lt.mockImplementation(() => {
        queryCount++;
        if (queryCount === 1) {
          return {
            eq: vi.fn().mockResolvedValue(countQueryResult),
          };
        }
        return {
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockImplementation((start: number, end: number) => {
              rangeStart = start;
              rangeEnd = end;
              return Promise.resolve(dataQueryResult);
            }),
          }),
        };
      });

      // Act
      const result = await service.getTransactions(
        { month: "2024-01", limit: 10, offset: 20 },
        testUserId
      );

      // Assert
      expect(rangeStart).toBe(20);
      expect(rangeEnd).toBe(29); // offset 20 + limit 10 - 1
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.offset).toBe(20);
    });

    it("should return empty list when no transactions exist", async () => {
      // Arrange
      const countQueryResult = { data: null, error: null, count: 0 };
      const dataQueryResult = { data: [], error: null };

      let queryCount = 0;
      mockClient._chain.lt.mockImplementation(() => {
        queryCount++;
        if (queryCount === 1) {
          return {
            eq: vi.fn().mockResolvedValue(countQueryResult),
          };
        }
        return {
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue(dataQueryResult),
          }),
        };
      });

      // Act
      const result = await service.getTransactions({ month: "2024-01" }, testUserId);

      // Assert
      expect(result.transactions).toEqual([]);
      expect(result.pagination).toEqual({
        total: 0,
        limit: 20,
        offset: 0,
        has_more: false,
      });
    });

    it("should propagate count query error", async () => {
      // Arrange
      const countError = { code: "PGRST500", message: "Database error" };
      const dataQueryResult = { data: [], error: null };

      let isCountQuery = false;

      mockClient._chain.select.mockImplementation((columns: string, options?: { count?: string; head?: boolean }) => {
        isCountQuery = options?.count === "exact";
        return mockClient._chain;
      });

      mockClient._chain.lt.mockImplementation(() => {
        if (isCountQuery) {
          return Promise.resolve({ data: null, error: countError, count: null });
        }
        return {
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue(dataQueryResult),
          }),
        };
      });

      // Act & Assert
      await expect(
        service.getTransactions({ month: "2024-01" }, testUserId)
      ).rejects.toEqual(countError);
    });

    it("should propagate data query error", async () => {
      // Arrange
      const countQueryResult = { data: null, error: null, count: 10 };
      const dataError = { code: "42P01", message: "relation does not exist" };

      let queryCount = 0;
      mockClient._chain.lt.mockImplementation(() => {
        queryCount++;
        if (queryCount === 1) {
          return {
            eq: vi.fn().mockResolvedValue(countQueryResult),
          };
        }
        return {
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({ data: null, error: dataError }),
          }),
        };
      });

      // Act & Assert
      await expect(
        service.getTransactions({ month: "2024-01" }, testUserId)
      ).rejects.toEqual(dataError);
    });

    it("should handle null data in data query gracefully", async () => {
      // Arrange
      const countQueryResult = { data: null, error: null, count: 0 };
      const dataQueryResult = { data: null, error: null };

      let queryCount = 0;
      mockClient._chain.lt.mockImplementation(() => {
        queryCount++;
        if (queryCount === 1) {
          return {
            eq: vi.fn().mockResolvedValue(countQueryResult),
          };
        }
        return {
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue(dataQueryResult),
          }),
        };
      });

      // Act
      const result = await service.getTransactions({ month: "2024-01" }, testUserId);

      // Assert
      expect(result.transactions).toEqual([]);
    });
  });

  describe("updateTransaction", () => {
    const updateCommand: UpdateTransactionCommand = {
      amount: 150.75,
      description: "Updated description",
    };

    it("should update transaction and return updated data", async () => {
      // Arrange
      const updatedTransaction = {
        ...testTransactionWithCategory,
        amount: 150.75,
        description: "Updated description",
      };

      // First call: verify transaction exists
      // Second call: update transaction (no return)
      // Third call: getTransactionById (internal)
      mockClient._chain.single
        .mockResolvedValueOnce({
          data: { id: testTransaction.id },
          error: null,
        })
        .mockResolvedValueOnce({
          data: updatedTransaction,
          error: null,
        });

      mockClient._chain.eq.mockReturnThis();

      // Act
      const result = await service.updateTransaction(
        testTransaction.id,
        updateCommand,
        testUserId
      );

      // Assert
      expect(result.amount).toBe("150.75");
      expect(result.description).toBe("Updated description");
      expect(mockClient._chain.update).toHaveBeenCalledWith({
        amount: 150.75,
        description: "Updated description",
      });
    });

    it("should update only provided fields", async () => {
      // Arrange
      const partialCommand: UpdateTransactionCommand = {
        type: "income",
      };

      mockClient._chain.single
        .mockResolvedValueOnce({
          data: { id: testTransaction.id },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { ...testTransactionWithCategory, type: "income" },
          error: null,
        });

      // Act
      await service.updateTransaction(testTransaction.id, partialCommand, testUserId);

      // Assert
      expect(mockClient._chain.update).toHaveBeenCalledWith({
        type: "income",
      });
    });

    it("should verify new category exists when updating category_id", async () => {
      // Arrange
      const newCategoryId = "new-category-id";
      const commandWithCategory: UpdateTransactionCommand = {
        category_id: newCategoryId,
      };

      mockClient._chain.single
        .mockResolvedValueOnce({
          // Transaction exists
          data: { id: testTransaction.id },
          error: null,
        })
        .mockResolvedValueOnce({
          // New category exists
          data: { id: newCategoryId },
          error: null,
        })
        .mockResolvedValueOnce({
          // Return updated transaction
          data: { ...testTransactionWithCategory, category_id: newCategoryId },
          error: null,
        });

      // Act
      await service.updateTransaction(testTransaction.id, commandWithCategory, testUserId);

      // Assert
      expect(mockClient._chain.update).toHaveBeenCalledWith({
        category_id: newCategoryId,
      });
    });

    it("should throw CategoryNotFoundError when new category does not exist", async () => {
      // Arrange
      const commandWithCategory: UpdateTransactionCommand = {
        category_id: "non-existent-category",
      };

      mockClient._chain.single
        .mockResolvedValueOnce({
          data: { id: testTransaction.id },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { code: "PGRST116", message: "No rows returned" },
        });

      // Act & Assert
      await expect(
        service.updateTransaction(testTransaction.id, commandWithCategory, testUserId)
      ).rejects.toThrow(CategoryNotFoundError);
    });

    it("should throw TransactionNotFoundError when transaction does not exist", async () => {
      // Arrange
      mockClient._chain.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows returned" },
      });

      // Act & Assert
      await expect(
        service.updateTransaction("non-existent-id", updateCommand, testUserId)
      ).rejects.toThrow(TransactionNotFoundError);
    });

    it("should throw TransactionNotFoundError when transaction data is null", async () => {
      // Arrange
      mockClient._chain.single.mockResolvedValue({
        data: null,
        error: null,
      });

      // Act & Assert
      await expect(
        service.updateTransaction(testTransaction.id, updateCommand, testUserId)
      ).rejects.toThrow(TransactionNotFoundError);
    });

    it("should parse string amount to number", async () => {
      // Arrange
      const commandWithStringAmount: UpdateTransactionCommand = {
        amount: "200.50",
      };

      mockClient._chain.single
        .mockResolvedValueOnce({
          data: { id: testTransaction.id },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { ...testTransactionWithCategory, amount: 200.5 },
          error: null,
        });

      // Act
      await service.updateTransaction(testTransaction.id, commandWithStringAmount, testUserId);

      // Assert
      expect(mockClient._chain.update).toHaveBeenCalledWith({
        amount: 200.5,
      });
    });

    it("should propagate database errors during update", async () => {
      // Arrange
      const dbError = { code: "23505", message: "constraint violation" };

      mockClient._chain.single.mockResolvedValueOnce({
        data: { id: testTransaction.id },
        error: null,
      });

      mockClient._chain.eq.mockImplementation(() => {
        return {
          ...mockClient._chain,
          single: mockClient._chain.single,
          then: (resolve: (value: { error: typeof dbError }) => void) => {
            resolve({ error: dbError });
          },
        };
      });

      // Override update to return error
      mockClient._chain.update.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: dbError }),
        }),
      });

      // Act & Assert
      await expect(
        service.updateTransaction(testTransaction.id, updateCommand, testUserId)
      ).rejects.toEqual(dbError);
    });

    it("should update all fields when all are provided", async () => {
      // Arrange
      const fullCommand: UpdateTransactionCommand = {
        amount: 300,
        type: "income",
        category_id: "new-cat-id",
        description: "Full update",
        occurred_at: "2024-02-01T00:00:00Z",
      };

      mockClient._chain.single
        .mockResolvedValueOnce({
          data: { id: testTransaction.id },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: "new-cat-id" },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            ...testTransactionWithCategory,
            ...fullCommand,
            amount: 300,
          },
          error: null,
        });

      // Act
      await service.updateTransaction(testTransaction.id, fullCommand, testUserId);

      // Assert
      expect(mockClient._chain.update).toHaveBeenCalledWith({
        amount: 300,
        type: "income",
        category_id: "new-cat-id",
        description: "Full update",
        occurred_at: "2024-02-01T00:00:00Z",
      });
    });
  });

  describe("deleteTransaction", () => {
    it("should delete transaction successfully", async () => {
      // Arrange
      mockClient._chain.single.mockResolvedValue({
        data: { id: testTransaction.id },
        error: null,
      });

      // Act
      await service.deleteTransaction(testTransaction.id, testUserId);

      // Assert
      expect(mockClient.from).toHaveBeenCalledWith("transactions");
      expect(mockClient._chain.delete).toHaveBeenCalled();
      expect(mockClient._chain.eq).toHaveBeenCalledWith("id", testTransaction.id);
      expect(mockClient._chain.eq).toHaveBeenCalledWith("user_id", testUserId);
    });

    it("should throw TransactionNotFoundError when transaction does not exist", async () => {
      // Arrange
      mockClient._chain.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows returned" },
      });

      // Act & Assert
      await expect(
        service.deleteTransaction("non-existent-id", testUserId)
      ).rejects.toThrow(TransactionNotFoundError);
    });

    it("should throw TransactionNotFoundError when data is null without error", async () => {
      // Arrange
      mockClient._chain.single.mockResolvedValue({
        data: null,
        error: null,
      });

      // Act & Assert
      await expect(
        service.deleteTransaction(testTransaction.id, testUserId)
      ).rejects.toThrow(TransactionNotFoundError);
    });

    it("should not delete transaction belonging to another user", async () => {
      // Arrange
      const differentUserId = "different-user-id";

      mockClient._chain.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows returned" },
      });

      // Act & Assert
      await expect(
        service.deleteTransaction(testTransaction.id, differentUserId)
      ).rejects.toThrow(TransactionNotFoundError);
    });
  });

  describe("Error classes", () => {
    it("CategoryNotFoundError should have correct name and message", () => {
      const error = new CategoryNotFoundError();

      expect(error.name).toBe("CategoryNotFoundError");
      expect(error.message).toBe("Category not found");
      expect(error).toBeInstanceOf(Error);
    });

    it("TransactionNotFoundError should have correct name and message", () => {
      const error = new TransactionNotFoundError();

      expect(error.name).toBe("TransactionNotFoundError");
      expect(error.message).toBe("Transaction not found");
      expect(error).toBeInstanceOf(Error);
    });
  });
});

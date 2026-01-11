import { describe, it, expect, beforeEach, vi } from "vitest";
import type { SupabaseClient } from "@/db/supabase.client";
import { CategoryService, CategoryNotFoundError, SystemCategoryError } from "@/lib/services/category.service";
import { createMockSupabaseClient, resetMockSupabaseClient, type MockSupabaseClient } from "../../mocks/supabase.mock";

describe("CategoryService", () => {
  let mockClient: MockSupabaseClient;
  let service: CategoryService;

  const testUserId = "550e8400-e29b-41d4-a716-446655440000";

  const testCategory = {
    id: "660e8400-e29b-41d4-a716-446655440001",
    name: "Groceries",
    is_system: false,
    system_key: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  const systemCategory = {
    id: "770e8400-e29b-41d4-a716-446655440002",
    name: "Brak",
    is_system: true,
    system_key: "none",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  const testCategories = [
    testCategory,
    systemCategory,
    {
      id: "880e8400-e29b-41d4-a716-446655440003",
      name: "Transport",
      is_system: false,
      system_key: null,
      created_at: "2024-01-02T00:00:00Z",
      updated_at: "2024-01-02T00:00:00Z",
    },
  ];

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    service = new CategoryService(mockClient as unknown as SupabaseClient);
  });

  describe("getCategories", () => {
    it("should return list of categories ordered by name", async () => {
      // Arrange
      mockClient._chain.order.mockResolvedValue({
        data: testCategories,
        error: null,
      });

      // Act
      const result = await service.getCategories();

      // Assert
      expect(result).toEqual({ categories: testCategories });
      expect(mockClient.from).toHaveBeenCalledWith("categories");
      expect(mockClient._chain.select).toHaveBeenCalledWith("id, name, is_system, system_key, created_at, updated_at");
      expect(mockClient._chain.order).toHaveBeenCalledWith("name", { ascending: true });
    });

    it("should return empty list when no categories exist", async () => {
      // Arrange
      mockClient._chain.order.mockResolvedValue({
        data: [],
        error: null,
      });

      // Act
      const result = await service.getCategories();

      // Assert
      expect(result).toEqual({ categories: [] });
    });

    it("should return empty list when data is null", async () => {
      // Arrange
      mockClient._chain.order.mockResolvedValue({
        data: null,
        error: null,
      });

      // Act
      const result = await service.getCategories();

      // Assert
      expect(result).toEqual({ categories: [] });
    });

    it("should propagate database errors", async () => {
      // Arrange
      const dbError = {
        code: "PGRST500",
        message: "Database connection error",
      };
      mockClient._chain.order.mockResolvedValue({
        data: null,
        error: dbError,
      });

      // Act & Assert
      await expect(service.getCategories()).rejects.toEqual(dbError);
    });
  });

  describe("createCategory", () => {
    it("should create and return new category", async () => {
      // Arrange
      const newCategory = {
        id: "990e8400-e29b-41d4-a716-446655440004",
        name: "Entertainment",
        is_system: false,
        system_key: null,
        created_at: "2024-01-03T00:00:00Z",
        updated_at: "2024-01-03T00:00:00Z",
      };
      mockClient._chain.single.mockResolvedValue({
        data: newCategory,
        error: null,
      });

      // Act
      const result = await service.createCategory({ name: "Entertainment" }, testUserId);

      // Assert
      expect(result).toEqual(newCategory);
      expect(mockClient.from).toHaveBeenCalledWith("categories");
      expect(mockClient._chain.insert).toHaveBeenCalledWith({
        name: "Entertainment",
        user_id: testUserId,
      });
      expect(mockClient._chain.select).toHaveBeenCalledWith("id, name, is_system, system_key, created_at, updated_at");
      expect(mockClient._chain.single).toHaveBeenCalled();
    });

    it("should propagate database errors on insert", async () => {
      // Arrange
      const dbError = {
        code: "23505",
        message: "duplicate key value violates unique constraint",
      };
      mockClient._chain.single.mockResolvedValue({
        data: null,
        error: dbError,
      });

      // Act & Assert
      await expect(service.createCategory({ name: "Duplicate" }, testUserId)).rejects.toEqual(dbError);
    });

    it("should handle category name with special characters", async () => {
      // Arrange
      const specialName = "Food & Drinks";
      const newCategory = {
        id: "aa0e8400-e29b-41d4-a716-446655440005",
        name: specialName,
        is_system: false,
        system_key: null,
        created_at: "2024-01-03T00:00:00Z",
        updated_at: "2024-01-03T00:00:00Z",
      };
      mockClient._chain.single.mockResolvedValue({
        data: newCategory,
        error: null,
      });

      // Act
      const result = await service.createCategory({ name: specialName }, testUserId);

      // Assert
      expect(result.name).toBe(specialName);
      expect(mockClient._chain.insert).toHaveBeenCalledWith({
        name: specialName,
        user_id: testUserId,
      });
    });
  });

  describe("updateCategory", () => {
    it("should update and return category on success", async () => {
      // Arrange
      const updatedCategory = {
        ...testCategory,
        name: "Updated Groceries",
        updated_at: "2024-01-04T00:00:00Z",
      };

      // First call: fetch category (returns existing category)
      // Second call: update category (returns updated category)
      mockClient._chain.single
        .mockResolvedValueOnce({
          data: { id: testCategory.id, is_system: false, user_id: testUserId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: updatedCategory,
          error: null,
        });

      // Act
      const result = await service.updateCategory(testCategory.id, { name: "Updated Groceries" }, testUserId);

      // Assert
      expect(result).toEqual(updatedCategory);
      expect(mockClient.from).toHaveBeenCalledWith("categories");
      expect(mockClient._chain.eq).toHaveBeenCalledWith("id", testCategory.id);
      expect(mockClient._chain.eq).toHaveBeenCalledWith("user_id", testUserId);
      expect(mockClient._chain.update).toHaveBeenCalledWith({ name: "Updated Groceries" });
    });

    it("should throw CategoryNotFoundError when category does not exist", async () => {
      // Arrange
      mockClient._chain.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows returned" },
      });

      // Act & Assert
      await expect(service.updateCategory(testCategory.id, { name: "New Name" }, testUserId)).rejects.toThrow(
        CategoryNotFoundError
      );
    });

    it("should throw CategoryNotFoundError when fetch returns null data", async () => {
      // Arrange
      mockClient._chain.single.mockResolvedValue({
        data: null,
        error: null,
      });

      // Act & Assert
      await expect(service.updateCategory(testCategory.id, { name: "New Name" }, testUserId)).rejects.toThrow(
        CategoryNotFoundError
      );
    });

    it("should throw SystemCategoryError when trying to update system category", async () => {
      // Arrange
      mockClient._chain.single.mockResolvedValue({
        data: { id: systemCategory.id, is_system: true, user_id: testUserId },
        error: null,
      });

      // Act & Assert
      await expect(service.updateCategory(systemCategory.id, { name: "New Name" }, testUserId)).rejects.toThrow(
        SystemCategoryError
      );
      await expect(service.updateCategory(systemCategory.id, { name: "New Name" }, testUserId)).rejects.toThrow(
        "Cannot modify system category"
      );
    });

    it("should propagate database errors during update", async () => {
      // Arrange
      const dbError = {
        code: "23505",
        message: "duplicate key value violates unique constraint",
      };

      mockClient._chain.single
        .mockResolvedValueOnce({
          data: { id: testCategory.id, is_system: false, user_id: testUserId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: dbError,
        });

      // Act & Assert
      await expect(service.updateCategory(testCategory.id, { name: "Duplicate Name" }, testUserId)).rejects.toEqual(
        dbError
      );
    });
  });

  describe("deleteCategory", () => {
    const noneCategoryId = "bb0e8400-e29b-41d4-a716-446655440006";

    it("should delete category without transactions and return zero moved", async () => {
      // Arrange - Setup call sequence tracking
      let callCount = 0;

      mockClient._chain.single.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Fetch category
          return Promise.resolve({
            data: { id: testCategory.id, is_system: false, user_id: testUserId },
            error: null,
          });
        } else if (callCount === 2) {
          // Get "Brak" category
          return Promise.resolve({
            data: { id: noneCategoryId },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      // Count transactions - no transactions
      mockClient._chain.eq.mockImplementation(() => {
        return {
          ...mockClient._chain,
          single: mockClient._chain.single,
          then: (resolve: (value: { data: unknown[]; error: null }) => void) => {
            resolve({ data: [], error: null });
          },
        };
      });

      // For transactions query (select with count)
      mockClient._chain.select.mockImplementation((columns: string, options?: { count?: string }) => {
        if (options?.count === "exact") {
          // This is the transactions count query
          return {
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          };
        }
        return mockClient._chain;
      });

      // Delete operation
      mockClient._chain.delete.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      // Act
      const result = await service.deleteCategory(testCategory.id, testUserId);

      // Assert
      expect(result).toEqual({ transactions_moved: 0 });
    });

    it("should delete category with transactions and move them to 'Brak'", async () => {
      // Arrange
      const transactionsToMove = [{ id: "tx1" }, { id: "tx2" }, { id: "tx3" }];
      let singleCallCount = 0;

      mockClient._chain.single.mockImplementation(() => {
        singleCallCount++;
        if (singleCallCount === 1) {
          return Promise.resolve({
            data: { id: testCategory.id, is_system: false, user_id: testUserId },
            error: null,
          });
        } else if (singleCallCount === 2) {
          return Promise.resolve({
            data: { id: noneCategoryId },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      mockClient._chain.select.mockImplementation((columns: string, options?: { count?: string }) => {
        if (options?.count === "exact") {
          return {
            eq: vi.fn().mockResolvedValue({
              data: transactionsToMove,
              error: null,
            }),
          };
        }
        return mockClient._chain;
      });

      // Update transactions (move to Brak)
      mockClient._chain.update.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      // Delete category
      mockClient._chain.delete.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      // Act
      const result = await service.deleteCategory(testCategory.id, testUserId);

      // Assert
      expect(result).toEqual({ transactions_moved: 3 });
    });

    it("should throw CategoryNotFoundError when category does not exist", async () => {
      // Arrange
      mockClient._chain.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows returned" },
      });

      // Act & Assert
      await expect(service.deleteCategory(testCategory.id, testUserId)).rejects.toThrow(CategoryNotFoundError);
    });

    it("should throw SystemCategoryError when trying to delete system category", async () => {
      // Arrange
      mockClient._chain.single.mockResolvedValue({
        data: { id: systemCategory.id, is_system: true, user_id: testUserId },
        error: null,
      });

      // Act & Assert
      await expect(service.deleteCategory(systemCategory.id, testUserId)).rejects.toThrow(SystemCategoryError);
    });

    it("should throw error when 'Brak' category not found", async () => {
      // Arrange
      let singleCallCount = 0;

      mockClient._chain.single.mockImplementation(() => {
        singleCallCount++;
        if (singleCallCount === 1) {
          return Promise.resolve({
            data: { id: testCategory.id, is_system: false, user_id: testUserId },
            error: null,
          });
        } else if (singleCallCount === 2) {
          // "Brak" category not found
          return Promise.resolve({
            data: null,
            error: { code: "PGRST116", message: "No rows returned" },
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      // Act & Assert
      await expect(service.deleteCategory(testCategory.id, testUserId)).rejects.toThrow(
        "System category 'Brak' not found"
      );
    });

    it("should propagate error when counting transactions fails", async () => {
      // Arrange
      const countError = { code: "42P01", message: "relation does not exist" };
      let singleCallCount = 0;

      mockClient._chain.single.mockImplementation(() => {
        singleCallCount++;
        if (singleCallCount === 1) {
          return Promise.resolve({
            data: { id: testCategory.id, is_system: false, user_id: testUserId },
            error: null,
          });
        } else if (singleCallCount === 2) {
          return Promise.resolve({
            data: { id: noneCategoryId },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      mockClient._chain.select.mockImplementation((columns: string, options?: { count?: string }) => {
        if (options?.count === "exact") {
          return {
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: countError,
            }),
          };
        }
        return mockClient._chain;
      });

      // Act & Assert
      await expect(service.deleteCategory(testCategory.id, testUserId)).rejects.toEqual(countError);
    });

    it("should propagate error when moving transactions fails", async () => {
      // Arrange
      const updateError = { code: "23503", message: "foreign key violation" };
      let singleCallCount = 0;

      mockClient._chain.single.mockImplementation(() => {
        singleCallCount++;
        if (singleCallCount === 1) {
          return Promise.resolve({
            data: { id: testCategory.id, is_system: false, user_id: testUserId },
            error: null,
          });
        } else if (singleCallCount === 2) {
          return Promise.resolve({
            data: { id: noneCategoryId },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      mockClient._chain.select.mockImplementation((columns: string, options?: { count?: string }) => {
        if (options?.count === "exact") {
          return {
            eq: vi.fn().mockResolvedValue({
              data: [{ id: "tx1" }],
              error: null,
            }),
          };
        }
        return mockClient._chain;
      });

      mockClient._chain.update.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: updateError }),
      });

      // Act & Assert
      await expect(service.deleteCategory(testCategory.id, testUserId)).rejects.toEqual(updateError);
    });

    it("should propagate error when delete fails", async () => {
      // Arrange
      const deleteError = { code: "42501", message: "permission denied" };
      let singleCallCount = 0;

      mockClient._chain.single.mockImplementation(() => {
        singleCallCount++;
        if (singleCallCount === 1) {
          return Promise.resolve({
            data: { id: testCategory.id, is_system: false, user_id: testUserId },
            error: null,
          });
        } else if (singleCallCount === 2) {
          return Promise.resolve({
            data: { id: noneCategoryId },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      mockClient._chain.select.mockImplementation((columns: string, options?: { count?: string }) => {
        if (options?.count === "exact") {
          return {
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          };
        }
        return mockClient._chain;
      });

      mockClient._chain.delete.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: deleteError }),
        }),
      });

      // Act & Assert
      await expect(service.deleteCategory(testCategory.id, testUserId)).rejects.toEqual(deleteError);
    });
  });

  describe("Error classes", () => {
    it("CategoryNotFoundError should have correct name and message", () => {
      const error = new CategoryNotFoundError();

      expect(error.name).toBe("CategoryNotFoundError");
      expect(error.message).toBe("Category not found");
      expect(error).toBeInstanceOf(Error);
    });

    it("SystemCategoryError should have correct name and message", () => {
      const error = new SystemCategoryError();

      expect(error.name).toBe("SystemCategoryError");
      expect(error.message).toBe("Cannot modify system category");
      expect(error).toBeInstanceOf(Error);
    });
  });
});

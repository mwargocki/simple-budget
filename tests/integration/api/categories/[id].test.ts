import { describe, it, expect, beforeEach, vi } from "vitest";
import type { APIContext } from "astro";
import {
  createMockAPIContext,
  createMockAPIContextWithAuth,
  parseJsonResponse,
  type MockAPIContext,
} from "../../helpers/astro-context.mock";
import { createMockSupabaseClient, type MockSupabaseClient } from "../../../mocks/supabase.mock";
import type { CategoryDTO, DeleteCategoryResponseDTO, ErrorResponseDTO } from "@/types";

// Store the mock instance that will be set in beforeEach
let mockSupabaseWithAuth: MockSupabaseClient;

// Mock must be defined before importing the module that uses it
vi.mock("@/db/supabase.client", () => ({
  createSupabaseClientWithAuth: vi.fn(() => {
    return mockSupabaseWithAuth;
  }),
}));

// Import after mock is set up
import { PATCH, DELETE } from "@/pages/api/categories/[id]";

describe("PATCH /api/categories/[id]", () => {
  let context: MockAPIContext;
  let mockSupabase: MockSupabaseClient;

  const testUserId = "550e8400-e29b-41d4-a716-446655440000";
  const testToken = "valid-test-token";
  const testCategoryId = "770e8400-e29b-41d4-a716-446655440001";

  const validUpdateData = {
    name: "Updated Category",
  };

  const existingCategory = {
    id: testCategoryId,
    name: "Old Category",
    is_system: false,
    system_key: null,
    created_at: "2024-01-15T10:00:00.000Z",
    updated_at: "2024-01-15T10:00:00.000Z",
  };

  const updatedCategory = {
    ...existingCategory,
    name: "Updated Category",
    updated_at: "2024-01-15T11:00:00.000Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create fresh mock for each test
    mockSupabaseWithAuth = createMockSupabaseClient();

    const mock = createMockAPIContextWithAuth({
      method: "PATCH",
      path: `/api/categories/${testCategoryId}`,
      params: { id: testCategoryId },
      body: validUpdateData,
      token: testToken,
    });
    context = mock.context;
    mockSupabase = mock.mockSupabase;

    // Setup default auth mock
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: testUserId, email: "test@example.com" } },
      error: null,
    });
  });

  describe("Success cases", () => {
    it("should update category and return 200", async () => {
      // Arrange
      let singleCallCount = 0;
      mockSupabaseWithAuth._chain.single.mockImplementation(() => {
        singleCallCount++;
        if (singleCallCount === 1) {
          // First call: check category exists and is not system
          return Promise.resolve({ data: existingCategory, error: null });
        } else {
          // Second call: get updated category
          return Promise.resolve({ data: updatedCategory, error: null });
        }
      });

      // Mock update chain
      mockSupabaseWithAuth._chain.eq.mockImplementation(() => {
        const chainResult = {
          ...mockSupabaseWithAuth._chain,
          then: (resolve: (value: { error: null }) => void) => resolve({ error: null }),
          catch: () => chainResult,
        };
        return chainResult;
      });

      // Act
      const response = await PATCH(context as unknown as APIContext);
      const body = await parseJsonResponse<CategoryDTO>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(body.id).toBe(testCategoryId);
      expect(body.name).toBe("Updated Category");
    });
  });

  describe("Authentication errors (401)", () => {
    it("should return 401 when Authorization header is missing", async () => {
      // Arrange
      const { context: noAuthContext } = createMockAPIContext({
        method: "PATCH",
        path: `/api/categories/${testCategoryId}`,
        params: { id: testCategoryId },
        body: validUpdateData,
      });

      // Act
      const response = await PATCH(noAuthContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.error.code).toBe("UNAUTHORIZED");
      expect(body.error.message).toBe("No valid session");
    });

    it("should return 401 when token is invalid", async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid token" },
      });

      // Act
      const response = await PATCH(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("Validation errors (400)", () => {
    it("should return 400 when category id is not a valid UUID", async () => {
      // Arrange
      const { context: invalidIdContext, mockSupabase: invalidIdMockSupabase } = createMockAPIContextWithAuth({
        method: "PATCH",
        path: "/api/categories/not-a-uuid",
        params: { id: "not-a-uuid" },
        body: validUpdateData,
        token: testToken,
      });

      invalidIdMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      // Act
      const response = await PATCH(invalidIdContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when body is empty", async () => {
      // Arrange
      const { context: emptyContext, mockSupabase: emptyMockSupabase } = createMockAPIContextWithAuth({
        method: "PATCH",
        path: `/api/categories/${testCategoryId}`,
        params: { id: testCategoryId },
        body: {},
        token: testToken,
      });

      emptyMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      // Act
      const response = await PATCH(emptyContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when name is empty string", async () => {
      // Arrange
      const { context: emptyNameContext, mockSupabase: emptyNameMockSupabase } = createMockAPIContextWithAuth({
        method: "PATCH",
        path: `/api/categories/${testCategoryId}`,
        params: { id: testCategoryId },
        body: { name: "" },
        token: testToken,
      });

      emptyNameMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      // Act
      const response = await PATCH(emptyNameContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when name exceeds 40 characters", async () => {
      // Arrange
      const longName = "a".repeat(41);
      const { context: longNameContext, mockSupabase: longNameMockSupabase } = createMockAPIContextWithAuth({
        method: "PATCH",
        path: `/api/categories/${testCategoryId}`,
        params: { id: testCategoryId },
        body: { name: longName },
        token: testToken,
      });

      longNameMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      // Act
      const response = await PATCH(longNameContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when JSON body is invalid", async () => {
      // Arrange
      const url = new URL(`http://localhost/api/categories/${testCategoryId}`);
      const request = new Request(url.toString(), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${testToken}`,
        },
        body: "invalid json{",
      });

      const { mockSupabase: invalidJsonMockSupabase } = createMockAPIContextWithAuth({
        method: "PATCH",
        path: `/api/categories/${testCategoryId}`,
        params: { id: testCategoryId },
        token: testToken,
      });

      invalidJsonMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      const invalidJsonContext = {
        request,
        locals: { supabase: invalidJsonMockSupabase },
        cookies: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
        url,
        params: { id: testCategoryId },
      };

      // Act
      const response = await PATCH(invalidJsonContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Forbidden errors (403)", () => {
    it("should return 403 when trying to modify system category", async () => {
      // Arrange
      const systemCategory = {
        ...existingCategory,
        is_system: true,
        system_key: "none",
        name: "Brak",
      };

      mockSupabaseWithAuth._chain.single.mockResolvedValue({
        data: systemCategory,
        error: null,
      });

      // Act
      const response = await PATCH(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(403);
      expect(body.error.code).toBe("FORBIDDEN");
      expect(body.error.message).toBe("Cannot modify system category");
    });
  });

  describe("Not found errors (404)", () => {
    it("should return 404 when category does not exist", async () => {
      // Arrange
      mockSupabaseWithAuth._chain.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows found" },
      });

      // Act
      const response = await PATCH(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(404);
      expect(body.error.code).toBe("NOT_FOUND");
      expect(body.error.message).toBe("Category not found");
    });
  });

  describe("Conflict errors (409)", () => {
    it("should return 409 when category name already exists", async () => {
      // Arrange
      let fromCallCount = 0;
      const duplicateError = { code: "23505", message: "Duplicate key value" };

      mockSupabaseWithAuth.from.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) {
          // First call: fetch category to verify exists
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: existingCategory, error: null }),
                }),
              }),
            }),
          };
        }
        // Second call: update category - throw duplicate key error
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockRejectedValue(duplicateError),
                }),
              }),
            }),
          }),
        };
      });

      // Act
      const response = await PATCH(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(409);
      expect(body.error.code).toBe("CONFLICT");
      expect(body.error.message).toBe("Category with this name already exists");
    });
  });

  describe("Internal errors (500)", () => {
    it("should return 500 when database update fails", async () => {
      // Arrange
      mockSupabaseWithAuth._chain.single.mockResolvedValueOnce({
        data: existingCategory,
        error: null,
      });

      mockSupabaseWithAuth._chain.eq.mockImplementation(() => {
        const chainResult = {
          ...mockSupabaseWithAuth._chain,
          then: (_: unknown, reject: (error: Error) => void) => reject(new Error("Database error")),
          catch: (handler: (error: Error) => void) => handler(new Error("Database error")),
        };
        return chainResult;
      });

      // Act
      const response = await PATCH(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(500);
      expect(body.error.code).toBe("INTERNAL_ERROR");
    });
  });
});

describe("DELETE /api/categories/[id]", () => {
  let context: MockAPIContext;
  let mockSupabase: MockSupabaseClient;

  const testUserId = "550e8400-e29b-41d4-a716-446655440000";
  const testToken = "valid-test-token";
  const testCategoryId = "770e8400-e29b-41d4-a716-446655440001";
  const noneCategoryId = "770e8400-e29b-41d4-a716-446655440099";

  const existingCategory = {
    id: testCategoryId,
    name: "To Delete",
    is_system: false,
    system_key: null,
    created_at: "2024-01-15T10:00:00.000Z",
    updated_at: "2024-01-15T10:00:00.000Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create fresh mock for each test
    mockSupabaseWithAuth = createMockSupabaseClient();

    const mock = createMockAPIContextWithAuth({
      method: "DELETE",
      path: `/api/categories/${testCategoryId}`,
      params: { id: testCategoryId },
      token: testToken,
    });
    context = mock.context;
    mockSupabase = mock.mockSupabase;

    // Setup default auth mock
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: testUserId, email: "test@example.com" } },
      error: null,
    });
  });

  describe("Success cases", () => {
    it("should delete category without transactions and return 200", async () => {
      // Arrange - mock the chain of calls for deleteCategory service
      let fromCallCount = 0;
      mockSupabaseWithAuth.from.mockImplementation((table: string) => {
        fromCallCount++;
        if (table === "categories" && fromCallCount === 1) {
          // First call: fetch category to verify it exists
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: existingCategory, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === "categories" && fromCallCount === 2) {
          // Second call: get "Brak" category
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: noneCategoryId }, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === "transactions") {
          // Third call: count transactions
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        if (table === "categories" && fromCallCount === 4) {
          // Fourth call: delete category
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            }),
          };
        }
        return mockSupabaseWithAuth._chain;
      });

      // Act
      const response = await DELETE(context as unknown as APIContext);
      const body = await parseJsonResponse<DeleteCategoryResponseDTO>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(body.message).toBe("Category deleted successfully");
      expect(body.transactions_moved).toBe(0);
    });

    it("should delete category with transactions (move to 'Brak') and return 200", async () => {
      // Arrange
      const mockTransactions = [{ id: "t1" }, { id: "t2" }, { id: "t3" }, { id: "t4" }, { id: "t5" }];
      let fromCallCount = 0;
      mockSupabaseWithAuth.from.mockImplementation((table: string) => {
        fromCallCount++;
        if (table === "categories" && fromCallCount === 1) {
          // First call: fetch category
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: existingCategory, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === "categories" && fromCallCount === 2) {
          // Second call: get "Brak" category
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: noneCategoryId }, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === "transactions" && fromCallCount === 3) {
          // Third call: count transactions
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: mockTransactions, error: null }),
            }),
          };
        }
        if (table === "transactions" && fromCallCount === 4) {
          // Fourth call: update transactions (move to Brak)
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === "categories" && fromCallCount === 5) {
          // Fifth call: delete category
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            }),
          };
        }
        return mockSupabaseWithAuth._chain;
      });

      // Act
      const response = await DELETE(context as unknown as APIContext);
      const body = await parseJsonResponse<DeleteCategoryResponseDTO>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.message).toBe("Category deleted successfully");
      expect(body.transactions_moved).toBe(5);
    });
  });

  describe("Authentication errors (401)", () => {
    it("should return 401 when Authorization header is missing", async () => {
      // Arrange
      const { context: noAuthContext } = createMockAPIContext({
        method: "DELETE",
        path: `/api/categories/${testCategoryId}`,
        params: { id: testCategoryId },
      });

      // Act
      const response = await DELETE(noAuthContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.error.code).toBe("UNAUTHORIZED");
      expect(body.error.message).toBe("No valid session");
    });

    it("should return 401 when token is invalid", async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid token" },
      });

      // Act
      const response = await DELETE(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("Validation errors (400)", () => {
    it("should return 400 when category id is not a valid UUID", async () => {
      // Arrange
      const { context: invalidIdContext, mockSupabase: invalidIdMockSupabase } = createMockAPIContextWithAuth({
        method: "DELETE",
        path: "/api/categories/not-a-uuid",
        params: { id: "not-a-uuid" },
        token: testToken,
      });

      invalidIdMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      // Act
      const response = await DELETE(invalidIdContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Forbidden errors (403)", () => {
    it("should return 403 when trying to delete system category", async () => {
      // Arrange
      const systemCategory = {
        ...existingCategory,
        is_system: true,
        system_key: "none",
        name: "Brak",
      };

      mockSupabaseWithAuth._chain.single.mockResolvedValue({
        data: systemCategory,
        error: null,
      });

      // Act
      const response = await DELETE(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(403);
      expect(body.error.code).toBe("FORBIDDEN");
      expect(body.error.message).toBe("Cannot delete system category");
    });
  });

  describe("Not found errors (404)", () => {
    it("should return 404 when category does not exist", async () => {
      // Arrange
      mockSupabaseWithAuth._chain.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows found" },
      });

      // Act
      const response = await DELETE(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(404);
      expect(body.error.code).toBe("NOT_FOUND");
      expect(body.error.message).toBe("Category not found");
    });
  });

  describe("Internal errors (500)", () => {
    it("should return 500 when database delete fails", async () => {
      // Arrange
      mockSupabaseWithAuth._chain.single.mockRejectedValue(new Error("Database connection error"));

      // Act
      const response = await DELETE(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(500);
      expect(body.error.code).toBe("INTERNAL_ERROR");
      expect(body.error.message).toBe("An unexpected error occurred");
    });
  });
});

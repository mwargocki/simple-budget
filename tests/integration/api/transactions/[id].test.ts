import { describe, it, expect, beforeEach, vi } from "vitest";
import type { APIContext } from "astro";
import {
  createMockAPIContext,
  createMockAPIContextWithAuth,
  parseJsonResponse,
  type MockAPIContext,
} from "../../helpers/astro-context.mock";
import { createMockSupabaseClient, type MockSupabaseClient } from "../../../mocks/supabase.mock";
import type { TransactionDTO, DeleteTransactionResponseDTO, ErrorResponseDTO } from "@/types";

// Store the mock instance that will be set in beforeEach
let mockSupabaseWithAuth: MockSupabaseClient;

// Mock must be defined before importing the module that uses it
vi.mock("@/db/supabase.client", () => ({
  createSupabaseClientWithAuth: vi.fn(() => {
    return mockSupabaseWithAuth;
  }),
}));

// Import after mock is set up
import { GET, PATCH, DELETE } from "@/pages/api/transactions/[id]";

describe("GET /api/transactions/[id]", () => {
  let context: MockAPIContext;
  let mockSupabase: MockSupabaseClient;

  const testUserId = "550e8400-e29b-41d4-a716-446655440000";
  const testToken = "valid-test-token";
  const testTransactionId = "660e8400-e29b-41d4-a716-446655440001";
  const testCategoryId = "770e8400-e29b-41d4-a716-446655440001";

  const mockTransactionData = {
    id: testTransactionId,
    amount: 150.5,
    type: "expense" as const,
    category_id: testCategoryId,
    description: "Test transaction",
    occurred_at: "2024-01-15T10:00:00.000Z",
    created_at: "2024-01-15T10:00:00.000Z",
    updated_at: "2024-01-15T10:00:00.000Z",
    categories: { name: "Food" },
  };

  beforeEach(() => {
    // Create fresh mock for each test
    mockSupabaseWithAuth = createMockSupabaseClient();

    const mock = createMockAPIContextWithAuth({
      method: "GET",
      path: `/api/transactions/${testTransactionId}`,
      params: { id: testTransactionId },
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
    it("should return transaction by id with 200", async () => {
      // Arrange
      mockSupabaseWithAuth._chain.single.mockResolvedValue({
        data: mockTransactionData,
        error: null,
      });

      // Act
      const response = await GET(context as unknown as APIContext);
      const body = await parseJsonResponse<TransactionDTO>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(body.id).toBe(testTransactionId);
      expect(body.amount).toBe("150.50");
      expect(body.type).toBe("expense");
      expect(body.category_id).toBe(testCategoryId);
      expect(body.category_name).toBe("Food");
      expect(body.description).toBe("Test transaction");
    });
  });

  describe("Authentication errors (401)", () => {
    it("should return 401 when Authorization header is missing", async () => {
      // Arrange
      const { context: noAuthContext } = createMockAPIContext({
        method: "GET",
        path: `/api/transactions/${testTransactionId}`,
        params: { id: testTransactionId },
      });

      // Act
      const response = await GET(noAuthContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.error.code).toBe("UNAUTHORIZED");
      expect(body.error.message).toBe("No valid session");
    });

    it("should return 401 when Authorization header has invalid format", async () => {
      // Arrange
      const { context: badAuthContext } = createMockAPIContext({
        method: "GET",
        path: `/api/transactions/${testTransactionId}`,
        params: { id: testTransactionId },
        headers: { Authorization: "Basic token" },
      });

      // Act
      const response = await GET(badAuthContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });

    it("should return 401 when token is invalid", async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid token" },
      });

      // Act
      const response = await GET(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("Validation errors (400)", () => {
    it("should return 400 when transaction id is not a valid UUID", async () => {
      // Arrange
      const { context: invalidIdContext, mockSupabase: invalidIdMockSupabase } = createMockAPIContextWithAuth({
        method: "GET",
        path: "/api/transactions/not-a-uuid",
        params: { id: "not-a-uuid" },
        token: testToken,
      });

      invalidIdMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      // Act
      const response = await GET(invalidIdContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.message).toBe("Invalid transaction ID format");
    });
  });

  describe("Not found errors (404)", () => {
    it("should return 404 when transaction does not exist", async () => {
      // Arrange
      mockSupabaseWithAuth._chain.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows found" },
      });

      // Act
      const response = await GET(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(404);
      expect(body.error.code).toBe("NOT_FOUND");
      expect(body.error.message).toBe("Transaction not found");
    });

    it("should return 404 when transaction belongs to another user", async () => {
      // Arrange - simulate no data returned due to RLS
      mockSupabaseWithAuth._chain.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows found" },
      });

      // Act
      const response = await GET(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(404);
      expect(body.error.code).toBe("NOT_FOUND");
    });
  });
});

describe("PATCH /api/transactions/[id]", () => {
  let context: MockAPIContext;
  let mockSupabase: MockSupabaseClient;

  const testUserId = "550e8400-e29b-41d4-a716-446655440000";
  const testToken = "valid-test-token";
  const testTransactionId = "660e8400-e29b-41d4-a716-446655440001";
  const testCategoryId = "770e8400-e29b-41d4-a716-446655440001";
  const newCategoryId = "770e8400-e29b-41d4-a716-446655440002";

  const validUpdateData = {
    amount: "200.00",
    description: "Updated transaction",
  };

  const existingTransaction = {
    id: testTransactionId,
  };

  const updatedTransaction = {
    id: testTransactionId,
    amount: 200.0,
    type: "expense" as const,
    category_id: testCategoryId,
    description: "Updated transaction",
    occurred_at: "2024-01-15T10:00:00.000Z",
    created_at: "2024-01-15T10:00:00.000Z",
    updated_at: "2024-01-15T11:00:00.000Z",
    categories: { name: "Food" },
  };

  beforeEach(() => {
    // Create fresh mock for each test
    mockSupabaseWithAuth = createMockSupabaseClient();

    const mock = createMockAPIContextWithAuth({
      method: "PATCH",
      path: `/api/transactions/${testTransactionId}`,
      params: { id: testTransactionId },
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
    it("should update transaction and return 200", async () => {
      // Arrange
      // The service calls: 1) check transaction exists, 2) update, 3) getTransactionById
      // Each from() call gets a fresh chain, but our mock returns the same chain
      // So we need to track which call is which via .single() calls

      let singleCallCount = 0;
      mockSupabaseWithAuth._chain.single.mockImplementation(() => {
        singleCallCount++;
        if (singleCallCount === 1) {
          // First call: check transaction exists
          return Promise.resolve({ data: existingTransaction, error: null });
        } else {
          // Third call: getTransactionById after update
          return Promise.resolve({ data: updatedTransaction, error: null });
        }
      });

      // Mock update - make eq() return a thenable chain for the update operation
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
      const body = await parseJsonResponse<TransactionDTO>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(body.id).toBe(testTransactionId);
      expect(body.amount).toBe("200.00");
      expect(body.description).toBe("Updated transaction");
    });

    it("should update only provided fields (partial update)", async () => {
      // Arrange
      const partialUpdate = { description: "Only description updated" };

      const { context: partialContext, mockSupabase: partialMockSupabase } = createMockAPIContextWithAuth({
        method: "PATCH",
        path: `/api/transactions/${testTransactionId}`,
        params: { id: testTransactionId },
        body: partialUpdate,
        token: testToken,
      });

      partialMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      let singleCallCount = 0;
      mockSupabaseWithAuth._chain.single.mockImplementation(() => {
        singleCallCount++;
        if (singleCallCount === 1) {
          return Promise.resolve({ data: existingTransaction, error: null });
        } else {
          return Promise.resolve({
            data: { ...updatedTransaction, description: "Only description updated" },
            error: null,
          });
        }
      });

      mockSupabaseWithAuth._chain.eq.mockImplementation(() => {
        const chainResult = {
          ...mockSupabaseWithAuth._chain,
          then: (resolve: (value: { error: null }) => void) => resolve({ error: null }),
          catch: () => chainResult,
        };
        return chainResult;
      });

      // Act
      const response = await PATCH(partialContext as unknown as APIContext);
      const body = await parseJsonResponse<TransactionDTO>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.description).toBe("Only description updated");
    });

    it("should update category_id with valid category", async () => {
      // Arrange
      const categoryUpdate = { category_id: newCategoryId };

      const { context: catContext, mockSupabase: catMockSupabase } = createMockAPIContextWithAuth({
        method: "PATCH",
        path: `/api/transactions/${testTransactionId}`,
        params: { id: testTransactionId },
        body: categoryUpdate,
        token: testToken,
      });

      catMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      let singleCallCount = 0;
      mockSupabaseWithAuth._chain.single.mockImplementation(() => {
        singleCallCount++;
        if (singleCallCount === 1) {
          // Check transaction exists
          return Promise.resolve({ data: existingTransaction, error: null });
        } else if (singleCallCount === 2) {
          // Check category exists
          return Promise.resolve({ data: { id: newCategoryId }, error: null });
        } else {
          // getTransactionById after update
          return Promise.resolve({
            data: { ...updatedTransaction, category_id: newCategoryId, categories: { name: "New Category" } },
            error: null,
          });
        }
      });

      mockSupabaseWithAuth._chain.eq.mockImplementation(() => {
        const chainResult = {
          ...mockSupabaseWithAuth._chain,
          then: (resolve: (value: { error: null }) => void) => resolve({ error: null }),
          catch: () => chainResult,
        };
        return chainResult;
      });

      // Act
      const response = await PATCH(catContext as unknown as APIContext);
      const body = await parseJsonResponse<TransactionDTO>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.category_id).toBe(newCategoryId);
    });
  });

  describe("Authentication errors (401)", () => {
    it("should return 401 when Authorization header is missing", async () => {
      // Arrange
      const { context: noAuthContext } = createMockAPIContext({
        method: "PATCH",
        path: `/api/transactions/${testTransactionId}`,
        params: { id: testTransactionId },
        body: validUpdateData,
      });

      // Act
      const response = await PATCH(noAuthContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.error.code).toBe("UNAUTHORIZED");
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
    it("should return 400 when transaction id is not a valid UUID", async () => {
      // Arrange
      const { context: invalidIdContext, mockSupabase: invalidIdMockSupabase } = createMockAPIContextWithAuth({
        method: "PATCH",
        path: "/api/transactions/invalid-uuid",
        params: { id: "invalid-uuid" },
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
      expect(body.error.message).toBe("Invalid transaction ID format");
    });

    it("should return 400 when body is empty (no fields to update)", async () => {
      // Arrange
      const { context: emptyContext, mockSupabase: emptyMockSupabase } = createMockAPIContextWithAuth({
        method: "PATCH",
        path: `/api/transactions/${testTransactionId}`,
        params: { id: testTransactionId },
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

    it("should return 400 when amount is below minimum", async () => {
      // Arrange
      const { context: lowAmountContext, mockSupabase: lowAmountMockSupabase } = createMockAPIContextWithAuth({
        method: "PATCH",
        path: `/api/transactions/${testTransactionId}`,
        params: { id: testTransactionId },
        body: { amount: "0.001" },
        token: testToken,
      });

      lowAmountMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      // Act
      const response = await PATCH(lowAmountContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when type is invalid", async () => {
      // Arrange
      const { context: invalidTypeContext, mockSupabase: invalidTypeMockSupabase } = createMockAPIContextWithAuth({
        method: "PATCH",
        path: `/api/transactions/${testTransactionId}`,
        params: { id: testTransactionId },
        body: { type: "invalid-type" },
        token: testToken,
      });

      invalidTypeMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      // Act
      const response = await PATCH(invalidTypeContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when JSON body is invalid", async () => {
      // Arrange
      const url = new URL(`http://localhost/api/transactions/${testTransactionId}`);
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
        path: `/api/transactions/${testTransactionId}`,
        params: { id: testTransactionId },
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
        params: { id: testTransactionId },
      };

      // Act
      const response = await PATCH(invalidJsonContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.message).toBe("Invalid JSON body");
    });
  });

  describe("Not found errors (404)", () => {
    it("should return 404 when transaction does not exist", async () => {
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
      expect(body.error.message).toBe("Transaction not found");
    });

    it("should return 404 when updating with non-existent category", async () => {
      // Arrange
      const { context: catContext, mockSupabase: catMockSupabase } = createMockAPIContextWithAuth({
        method: "PATCH",
        path: `/api/transactions/${testTransactionId}`,
        params: { id: testTransactionId },
        body: { category_id: newCategoryId },
        token: testToken,
      });

      catMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      let singleCallCount = 0;
      mockSupabaseWithAuth._chain.single.mockImplementation(() => {
        singleCallCount++;
        if (singleCallCount === 1) {
          // Transaction exists
          return Promise.resolve({ data: existingTransaction, error: null });
        } else {
          // Category not found
          return Promise.resolve({ data: null, error: { code: "PGRST116", message: "No rows found" } });
        }
      });

      // Act
      const response = await PATCH(catContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(404);
      expect(body.error.code).toBe("NOT_FOUND");
      expect(body.error.message).toBe("Category not found");
    });
  });

  describe("Internal errors (500)", () => {
    it("should return 500 when database update fails", async () => {
      // Arrange
      mockSupabaseWithAuth._chain.single.mockResolvedValueOnce({
        data: existingTransaction,
        error: null,
      });

      // Make eq throw an error when the update chain is awaited
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

describe("DELETE /api/transactions/[id]", () => {
  let context: MockAPIContext;
  let mockSupabase: MockSupabaseClient;

  const testUserId = "550e8400-e29b-41d4-a716-446655440000";
  const testToken = "valid-test-token";
  const testTransactionId = "660e8400-e29b-41d4-a716-446655440001";

  beforeEach(() => {
    // Create fresh mock for each test
    mockSupabaseWithAuth = createMockSupabaseClient();

    const mock = createMockAPIContextWithAuth({
      method: "DELETE",
      path: `/api/transactions/${testTransactionId}`,
      params: { id: testTransactionId },
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
    it("should delete transaction and return 200", async () => {
      // Arrange
      mockSupabaseWithAuth._chain.single.mockResolvedValue({
        data: { id: testTransactionId },
        error: null,
      });

      // Act
      const response = await DELETE(context as unknown as APIContext);
      const body = await parseJsonResponse<DeleteTransactionResponseDTO>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(body.message).toBe("Transaction deleted successfully");
    });
  });

  describe("Authentication errors (401)", () => {
    it("should return 401 when Authorization header is missing", async () => {
      // Arrange
      const { context: noAuthContext } = createMockAPIContext({
        method: "DELETE",
        path: `/api/transactions/${testTransactionId}`,
        params: { id: testTransactionId },
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
    it("should return 400 when transaction id is not a valid UUID", async () => {
      // Arrange
      const { context: invalidIdContext, mockSupabase: invalidIdMockSupabase } = createMockAPIContextWithAuth({
        method: "DELETE",
        path: "/api/transactions/not-valid-uuid",
        params: { id: "not-valid-uuid" },
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
      expect(body.error.message).toBe("Invalid transaction ID format");
    });
  });

  describe("Not found errors (404)", () => {
    it("should return 404 when transaction does not exist", async () => {
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
      expect(body.error.message).toBe("Transaction not found");
    });

    it("should return 404 when trying to delete another user's transaction", async () => {
      // Arrange - simulate no data returned due to RLS
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

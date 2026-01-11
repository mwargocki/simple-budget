import { describe, it, expect, beforeEach, vi } from "vitest";
import type { APIContext } from "astro";
import {
  createMockAPIContext,
  createMockAPIContextWithAuth,
  parseJsonResponse,
  type MockAPIContext,
} from "../../helpers/astro-context.mock";
import { createMockSupabaseClient, type MockSupabaseClient } from "../../../mocks/supabase.mock";
import type { TransactionsListDTO, TransactionDTO, ErrorResponseDTO } from "@/types";

// Store the mock instance that will be set in beforeEach
let mockSupabaseWithAuth: MockSupabaseClient;

// Mock must be defined before importing the module that uses it
vi.mock("@/db/supabase.client", () => ({
  createSupabaseClientWithAuth: vi.fn(() => {
    // This will be called when the endpoint creates a new client
    // We return the mock that was set up in beforeEach
    return mockSupabaseWithAuth;
  }),
}));

// Import after mock is set up
import { GET, POST } from "@/pages/api/transactions/index";

describe("GET /api/transactions", () => {
  let context: MockAPIContext;
  let mockSupabase: MockSupabaseClient;

  const testUserId = "550e8400-e29b-41d4-a716-446655440000";
  const testToken = "valid-test-token";

  const mockTransactionData = {
    id: "660e8400-e29b-41d4-a716-446655440001",
    amount: 150.5,
    type: "expense" as const,
    category_id: "770e8400-e29b-41d4-a716-446655440001",
    description: "Test transaction",
    occurred_at: "2024-01-15T10:00:00.000Z",
    created_at: "2024-01-15T10:00:00.000Z",
    updated_at: "2024-01-15T10:00:00.000Z",
    categories: { name: "Food" },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create fresh mock for each test
    mockSupabaseWithAuth = createMockSupabaseClient();

    const mock = createMockAPIContextWithAuth({
      method: "GET",
      path: "/api/transactions",
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
    it("should return transactions list with pagination", async () => {
      // Arrange
      mockSupabaseWithAuth._chain.select.mockImplementation(() => mockSupabaseWithAuth._chain);
      mockSupabaseWithAuth._chain.eq.mockImplementation(() => mockSupabaseWithAuth._chain);
      mockSupabaseWithAuth._chain.gte.mockImplementation(() => mockSupabaseWithAuth._chain);
      mockSupabaseWithAuth._chain.lt.mockImplementation(() => mockSupabaseWithAuth._chain);
      mockSupabaseWithAuth._chain.order.mockImplementation(() => mockSupabaseWithAuth._chain);
      mockSupabaseWithAuth._chain.range.mockResolvedValue({
        data: [mockTransactionData],
        error: null,
      });

      // Mock count query - must return count property
      const countChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
      };
      let callCount = 0;
      mockSupabaseWithAuth.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Count query
          return {
            ...countChain,
            then: (resolve: (value: { count: number; error: null }) => void) =>
              resolve({ count: 1, error: null }),
          };
        }
        return mockSupabaseWithAuth._chain;
      });

      // Act
      const response = await GET(context as unknown as APIContext);
      const body = await parseJsonResponse<TransactionsListDTO>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(body.transactions).toBeDefined();
      expect(body.pagination).toBeDefined();
    });

    it("should apply month filter from query params", async () => {
      // Arrange
      const { context: monthContext, mockSupabase: monthMockSupabase } = createMockAPIContextWithAuth({
        method: "GET",
        path: "/api/transactions?month=2024-01",
        token: testToken,
      });

      monthMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      mockSupabaseWithAuth._chain.range.mockResolvedValue({
        data: [],
        error: null,
      });

      let callCount = 0;
      mockSupabaseWithAuth.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lt: vi.fn().mockReturnThis(),
            then: (resolve: (value: { count: number; error: null }) => void) =>
              resolve({ count: 0, error: null }),
          };
        }
        return mockSupabaseWithAuth._chain;
      });

      // Act
      const response = await GET(monthContext as unknown as APIContext);
      const body = await parseJsonResponse<TransactionsListDTO>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.transactions).toEqual([]);
      expect(body.pagination.total).toBe(0);
    });

    it("should apply category_id filter from query params", async () => {
      // Arrange
      const categoryId = "770e8400-e29b-41d4-a716-446655440001";
      const { context: catContext, mockSupabase: catMockSupabase } = createMockAPIContextWithAuth({
        method: "GET",
        path: `/api/transactions?category_id=${categoryId}`,
        token: testToken,
      });

      catMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      mockSupabaseWithAuth._chain.range.mockResolvedValue({
        data: [mockTransactionData],
        error: null,
      });

      let callCount = 0;
      mockSupabaseWithAuth.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lt: vi.fn().mockReturnThis(),
            then: (resolve: (value: { count: number; error: null }) => void) =>
              resolve({ count: 1, error: null }),
          };
        }
        return mockSupabaseWithAuth._chain;
      });

      // Act
      const response = await GET(catContext as unknown as APIContext);

      // Assert
      expect(response.status).toBe(200);
    });

    it("should apply pagination params (limit and offset)", async () => {
      // Arrange
      const { context: pageContext, mockSupabase: pageMockSupabase } = createMockAPIContextWithAuth({
        method: "GET",
        path: "/api/transactions?limit=10&offset=20",
        token: testToken,
      });

      pageMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      mockSupabaseWithAuth._chain.range.mockResolvedValue({
        data: [],
        error: null,
      });

      let callCount = 0;
      mockSupabaseWithAuth.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lt: vi.fn().mockReturnThis(),
            then: (resolve: (value: { count: number; error: null }) => void) =>
              resolve({ count: 50, error: null }),
          };
        }
        return mockSupabaseWithAuth._chain;
      });

      // Act
      const response = await GET(pageContext as unknown as APIContext);
      const body = await parseJsonResponse<TransactionsListDTO>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.pagination.limit).toBe(10);
      expect(body.pagination.offset).toBe(20);
    });
  });

  describe("Authentication errors (401)", () => {
    it("should return 401 when Authorization header is missing", async () => {
      // Arrange
      const { context: noAuthContext } = createMockAPIContext({
        method: "GET",
        path: "/api/transactions",
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
        path: "/api/transactions",
        headers: { Authorization: "InvalidFormat token" },
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
    it("should return 400 when month format is invalid", async () => {
      // Arrange
      const { context: invalidMonthContext, mockSupabase: invalidMockSupabase } = createMockAPIContextWithAuth({
        method: "GET",
        path: "/api/transactions?month=invalid-month",
        token: testToken,
      });

      invalidMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      // Act
      const response = await GET(invalidMonthContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when limit exceeds maximum", async () => {
      // Arrange
      const { context: invalidLimitContext, mockSupabase: invalidLimitMockSupabase } = createMockAPIContextWithAuth({
        method: "GET",
        path: "/api/transactions?limit=200",
        token: testToken,
      });

      invalidLimitMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      // Act
      const response = await GET(invalidLimitContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when offset is negative", async () => {
      // Arrange
      const { context: negativeOffsetContext, mockSupabase: negativeOffsetMockSupabase } =
        createMockAPIContextWithAuth({
          method: "GET",
          path: "/api/transactions?offset=-5",
          token: testToken,
        });

      negativeOffsetMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      // Act
      const response = await GET(negativeOffsetContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when category_id is not a valid UUID", async () => {
      // Arrange
      const { context: invalidCatContext, mockSupabase: invalidCatMockSupabase } = createMockAPIContextWithAuth({
        method: "GET",
        path: "/api/transactions?category_id=not-a-uuid",
        token: testToken,
      });

      invalidCatMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      // Act
      const response = await GET(invalidCatContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });
  });
});

describe("POST /api/transactions", () => {
  let context: MockAPIContext;
  let mockSupabase: MockSupabaseClient;

  const testUserId = "550e8400-e29b-41d4-a716-446655440000";
  const testToken = "valid-test-token";
  const testCategoryId = "770e8400-e29b-41d4-a716-446655440001";

  const validTransactionData = {
    amount: "150.50",
    type: "expense",
    category_id: testCategoryId,
    description: "Test transaction",
    occurred_at: "2024-01-15T10:00:00.000Z",
  };

  const createdTransaction = {
    id: "660e8400-e29b-41d4-a716-446655440001",
    amount: 150.5,
    type: "expense",
    category_id: testCategoryId,
    description: "Test transaction",
    occurred_at: "2024-01-15T10:00:00.000Z",
    created_at: "2024-01-15T10:00:00.000Z",
    updated_at: "2024-01-15T10:00:00.000Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create fresh mock for each test
    mockSupabaseWithAuth = createMockSupabaseClient();

    const mock = createMockAPIContextWithAuth({
      method: "POST",
      path: "/api/transactions",
      body: validTransactionData,
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
    it("should create a transaction and return 201", async () => {
      // Arrange - mock category lookup
      mockSupabaseWithAuth._chain.single.mockResolvedValueOnce({
        data: { id: testCategoryId, name: "Food" },
        error: null,
      });

      // Mock insert
      mockSupabaseWithAuth._chain.single.mockResolvedValueOnce({
        data: createdTransaction,
        error: null,
      });

      // Act
      const response = await POST(context as unknown as APIContext);
      const body = await parseJsonResponse<TransactionDTO>(response);

      // Assert
      expect(response.status).toBe(201);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(body.id).toBe(createdTransaction.id);
      expect(body.amount).toBe("150.50");
      expect(body.type).toBe("expense");
      expect(body.category_id).toBe(testCategoryId);
      expect(body.category_name).toBe("Food");
    });

    it("should create a transaction without occurred_at (uses current date)", async () => {
      // Arrange
      const dataWithoutDate = {
        amount: "100.00",
        type: "income",
        category_id: testCategoryId,
        description: "Salary",
      };

      const { context: noDateContext, mockSupabase: noDateMockSupabase } = createMockAPIContextWithAuth({
        method: "POST",
        path: "/api/transactions",
        body: dataWithoutDate,
        token: testToken,
      });

      noDateMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      mockSupabaseWithAuth._chain.single.mockResolvedValueOnce({
        data: { id: testCategoryId, name: "Salary" },
        error: null,
      });

      mockSupabaseWithAuth._chain.single.mockResolvedValueOnce({
        data: { ...createdTransaction, amount: 100, type: "income", description: "Salary" },
        error: null,
      });

      // Act
      const response = await POST(noDateContext as unknown as APIContext);

      // Assert
      expect(response.status).toBe(201);
    });
  });

  describe("Authentication errors (401)", () => {
    it("should return 401 when Authorization header is missing", async () => {
      // Arrange
      const { context: noAuthContext } = createMockAPIContext({
        method: "POST",
        path: "/api/transactions",
        body: validTransactionData,
      });

      // Act
      const response = await POST(noAuthContext as unknown as APIContext);
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
      const response = await POST(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("Validation errors (400)", () => {
    it("should return 400 when request body is empty", async () => {
      // Arrange
      const { context: emptyContext, mockSupabase: emptyMockSupabase } = createMockAPIContextWithAuth({
        method: "POST",
        path: "/api/transactions",
        body: {},
        token: testToken,
      });

      emptyMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      // Act
      const response = await POST(emptyContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.message).toBe("Validation failed");
    });

    it("should return 400 when amount is missing", async () => {
      // Arrange
      const invalidData = { ...validTransactionData };
      delete (invalidData as Record<string, unknown>).amount;

      const { context: noAmountContext, mockSupabase: noAmountMockSupabase } = createMockAPIContextWithAuth({
        method: "POST",
        path: "/api/transactions",
        body: invalidData,
        token: testToken,
      });

      noAmountMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      // Act
      const response = await POST(noAmountContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.details).toContainEqual(expect.objectContaining({ field: "amount" }));
    });

    it("should return 400 when amount is below minimum (0.01)", async () => {
      // Arrange
      const { context: lowAmountContext, mockSupabase: lowAmountMockSupabase } = createMockAPIContextWithAuth({
        method: "POST",
        path: "/api/transactions",
        body: { ...validTransactionData, amount: "0.001" },
        token: testToken,
      });

      lowAmountMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      // Act
      const response = await POST(lowAmountContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when amount exceeds maximum (1000000)", async () => {
      // Arrange
      const { context: highAmountContext, mockSupabase: highAmountMockSupabase } = createMockAPIContextWithAuth({
        method: "POST",
        path: "/api/transactions",
        body: { ...validTransactionData, amount: "1000001" },
        token: testToken,
      });

      highAmountMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      // Act
      const response = await POST(highAmountContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when type is invalid", async () => {
      // Arrange
      const { context: invalidTypeContext, mockSupabase: invalidTypeMockSupabase } = createMockAPIContextWithAuth({
        method: "POST",
        path: "/api/transactions",
        body: { ...validTransactionData, type: "invalid" },
        token: testToken,
      });

      invalidTypeMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      // Act
      const response = await POST(invalidTypeContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when category_id is not a valid UUID", async () => {
      // Arrange
      const { context: invalidCatContext, mockSupabase: invalidCatMockSupabase } = createMockAPIContextWithAuth({
        method: "POST",
        path: "/api/transactions",
        body: { ...validTransactionData, category_id: "not-a-uuid" },
        token: testToken,
      });

      invalidCatMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      // Act
      const response = await POST(invalidCatContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when description is empty", async () => {
      // Arrange
      const { context: emptyDescContext, mockSupabase: emptyDescMockSupabase } = createMockAPIContextWithAuth({
        method: "POST",
        path: "/api/transactions",
        body: { ...validTransactionData, description: "" },
        token: testToken,
      });

      emptyDescMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      // Act
      const response = await POST(emptyDescContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when JSON body is invalid", async () => {
      // Arrange - create request with invalid JSON
      const url = new URL("http://localhost/api/transactions");
      const request = new Request(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${testToken}`,
        },
        body: "invalid json{",
      });

      const { mockSupabase: invalidJsonMockSupabase } = createMockAPIContextWithAuth({
        method: "POST",
        path: "/api/transactions",
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
        params: {},
      };

      // Act
      const response = await POST(invalidJsonContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Not found errors (404)", () => {
    it("should return 404 when category does not exist", async () => {
      // Arrange - mock category not found
      mockSupabaseWithAuth._chain.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "No rows found" },
      });

      // Act
      const response = await POST(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(404);
      expect(body.error.code).toBe("NOT_FOUND");
      expect(body.error.message).toBe("Category not found");
    });
  });

  describe("Internal errors (500)", () => {
    it("should return 500 when database insert fails", async () => {
      // Arrange - mock category lookup success
      mockSupabaseWithAuth._chain.single.mockResolvedValueOnce({
        data: { id: testCategoryId, name: "Food" },
        error: null,
      });

      // Mock insert failure
      mockSupabaseWithAuth._chain.single.mockRejectedValueOnce(new Error("Database error"));

      // Act
      const response = await POST(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(500);
      expect(body.error.code).toBe("INTERNAL_ERROR");
      expect(body.error.message).toBe("An unexpected error occurred");
    });
  });
});

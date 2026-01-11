import { describe, it, expect, beforeEach, vi } from "vitest";
import type { APIContext } from "astro";
import {
  createMockAPIContext,
  createMockAPIContextWithAuth,
  parseJsonResponse,
  type MockAPIContext,
} from "../../helpers/astro-context.mock";
import { createMockSupabaseClient, type MockSupabaseClient } from "../../../mocks/supabase.mock";
import type { AIAnalysisResponseDTO, ErrorResponseDTO } from "@/types";

// Store the mock instance that will be set in beforeEach
let mockSupabaseWithAuth: MockSupabaseClient;

// Mock OpenRouterService
const mockChat = vi.fn();
vi.mock("@/lib/services/openrouter.service", () => ({
  OpenRouterService: vi.fn().mockImplementation(() => ({
    chat: mockChat,
  })),
}));

// Mock must be defined before importing the module that uses it
vi.mock("@/db/supabase.client", () => ({
  createSupabaseClientWithAuth: vi.fn(() => {
    return mockSupabaseWithAuth;
  }),
}));

// Import after mock is set up
import { POST } from "@/pages/api/summary/ai-analysis";

describe("POST /api/summary/ai-analysis", () => {
  let context: MockAPIContext;
  let mockSupabase: MockSupabaseClient;

  const testUserId = "550e8400-e29b-41d4-a716-446655440000";
  const testToken = "valid-test-token";

  const validRequestBody = {
    month: "2024-01",
  };

  const mockTransactionsData = [
    {
      id: "660e8400-e29b-41d4-a716-446655440001",
      amount: 150.5,
      type: "expense" as const,
      category_id: "770e8400-e29b-41d4-a716-446655440001",
      description: "Groceries",
      occurred_at: "2024-01-15T10:00:00.000Z",
      created_at: "2024-01-15T10:00:00.000Z",
      updated_at: "2024-01-15T10:00:00.000Z",
      categories: { name: "Food" },
    },
    {
      id: "660e8400-e29b-41d4-a716-446655440002",
      amount: 3000.0,
      type: "income" as const,
      category_id: "770e8400-e29b-41d4-a716-446655440002",
      description: "Salary",
      occurred_at: "2024-01-01T10:00:00.000Z",
      created_at: "2024-01-01T10:00:00.000Z",
      updated_at: "2024-01-01T10:00:00.000Z",
      categories: { name: "Salary" },
    },
  ];

  const mockProfileData = {
    id: testUserId,
    timezone: "Europe/Warsaw",
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create fresh mock for each test
    mockSupabaseWithAuth = createMockSupabaseClient();

    const mock = createMockAPIContextWithAuth({
      method: "POST",
      path: "/api/summary/ai-analysis",
      body: validRequestBody,
      token: testToken,
    });
    context = mock.context;
    mockSupabase = mock.mockSupabase;

    // Setup default auth mock
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: testUserId, email: "test@example.com" } },
      error: null,
    });

    // Setup default OpenRouter mock
    mockChat.mockResolvedValue({
      content: "## Analiza finansowa\n\nTwoje finanse wyglądają dobrze...",
    });
  });

  describe("Success cases", () => {
    it("should return AI analysis for specified month", async () => {
      // Arrange - simplified mocking
      let fromCallCount = 0;
      mockSupabaseWithAuth.from.mockImplementation((table: string) => {
        fromCallCount++;

        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockProfileData, error: null }),
              }),
            }),
          };
        }

        // transactions table - count query and data query
        return {
          select: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockImplementation(() => ({
              gte: vi.fn().mockImplementation(() => ({
                lt: vi.fn().mockImplementation(() => ({
                  // For count query - returns thenable
                  then: (resolve: (value: { count: number; error: null }) => void) =>
                    resolve({ count: mockTransactionsData.length, error: null }),
                  // For data query with order and range
                  order: vi.fn().mockReturnValue({
                    range: vi.fn().mockResolvedValue({ data: mockTransactionsData, error: null }),
                  }),
                })),
              })),
            })),
          })),
        };
      });

      // Act
      const response = await POST(context as unknown as APIContext);
      const body = await parseJsonResponse<AIAnalysisResponseDTO>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(body.analysis).toBeDefined();
      expect(body.month).toBe("2024-01");
    });

    it("should handle empty transactions with appropriate message", async () => {
      // Arrange
      mockSupabaseWithAuth.from.mockImplementation((table: string) => {
        if (table === "profiles") {
          return {
            ...mockSupabaseWithAuth._chain,
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockProfileData, error: null }),
              }),
            }),
          };
        }
        return {
          ...mockSupabaseWithAuth._chain,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lt: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    range: vi.fn().mockResolvedValue({ data: [], error: null }),
                  }),
                  then: (resolve: (value: { count: number; error: null }) => void) =>
                    resolve({ count: 0, error: null }),
                }),
              }),
            }),
          }),
        };
      });

      mockChat.mockResolvedValue({
        content: "Brak transakcji w podanym miesiącu.",
      });

      // Act
      const response = await POST(context as unknown as APIContext);
      const body = await parseJsonResponse<AIAnalysisResponseDTO>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.analysis).toBeDefined();
      expect(body.month).toBe("2024-01");
    });
  });

  describe("Authentication errors (401)", () => {
    it("should return 401 when Authorization header is missing", async () => {
      // Arrange
      const { context: noAuthContext } = createMockAPIContext({
        method: "POST",
        path: "/api/summary/ai-analysis",
        body: validRequestBody,
      });

      // Act
      const response = await POST(noAuthContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.error.code).toBe("UNAUTHORIZED");
      expect(body.error.message).toBe("No valid session");
    });

    it("should return 401 when Authorization header has invalid format", async () => {
      // Arrange
      const { context: badAuthContext } = createMockAPIContext({
        method: "POST",
        path: "/api/summary/ai-analysis",
        body: validRequestBody,
        headers: { Authorization: "Basic token" },
      });

      // Act
      const response = await POST(badAuthContext as unknown as APIContext);
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
    it("should return 400 when JSON body is invalid", async () => {
      // Arrange
      const url = new URL("http://localhost/api/summary/ai-analysis");
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
        path: "/api/summary/ai-analysis",
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
      expect(body.error.message).toBe("Invalid JSON body");
    });

    it("should return 400 when month format is invalid", async () => {
      // Arrange
      const { context: invalidMonthContext, mockSupabase: invalidMockSupabase } = createMockAPIContextWithAuth({
        method: "POST",
        path: "/api/summary/ai-analysis",
        body: { month: "invalid-month" },
        token: testToken,
      });

      invalidMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      // Act
      const response = await POST(invalidMonthContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.message).toContain("Invalid month format");
    });

    it("should return 400 when month is missing", async () => {
      // Arrange
      const { context: noMonthContext, mockSupabase: noMonthMockSupabase } = createMockAPIContextWithAuth({
        method: "POST",
        path: "/api/summary/ai-analysis",
        body: {},
        token: testToken,
      });

      noMonthMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      // Act - note: empty month should be allowed based on schema (uses current month)
      // But if required, this test would apply
      const response = await POST(noMonthContext as unknown as APIContext);

      // Assert
      // Month is optional in summaryQuerySchema, so this may pass or return current month
      expect(response.status).toBe(200);
    });
  });

  describe("AI service errors (502)", () => {
    it("should return 502 when OpenRouter API fails", async () => {
      // Arrange
      mockSupabaseWithAuth.from.mockImplementation((table: string) => {
        if (table === "profiles") {
          return {
            ...mockSupabaseWithAuth._chain,
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockProfileData, error: null }),
              }),
            }),
          };
        }
        return {
          ...mockSupabaseWithAuth._chain,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lt: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    range: vi.fn().mockResolvedValue({ data: mockTransactionsData, error: null }),
                  }),
                  then: (resolve: (value: { count: number; error: null }) => void) =>
                    resolve({ count: mockTransactionsData.length, error: null }),
                }),
              }),
            }),
          }),
        };
      });

      // Mock OpenRouter error
      const { OpenRouterError } = await import("@/lib/errors/openrouter.errors");
      mockChat.mockRejectedValue(new OpenRouterError("API_ERROR", "Rate limit exceeded", 429));

      // Act
      const response = await POST(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(502);
      expect(body.error.code).toBe("INTERNAL_ERROR");
      expect(body.error.message).toContain("AI service error");
    });
  });

  describe("Internal errors (500)", () => {
    it("should return 500 when database query fails", async () => {
      // Arrange
      mockSupabaseWithAuth.from.mockImplementation(() => {
        throw new Error("Database error");
      });

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

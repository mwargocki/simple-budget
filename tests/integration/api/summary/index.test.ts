import { describe, it, expect, beforeEach, vi } from "vitest";
import type { APIContext } from "astro";
import {
  createMockAPIContext,
  createMockAPIContextWithAuth,
  parseJsonResponse,
  type MockAPIContext,
} from "../../helpers/astro-context.mock";
import { createMockSupabaseClient, type MockSupabaseClient } from "../../../mocks/supabase.mock";
import type { MonthlySummaryDTO, ErrorResponseDTO } from "@/types";

// Store the mock instance that will be set in beforeEach
let mockSupabaseWithAuth: MockSupabaseClient;

// Mock must be defined before importing the module that uses it
vi.mock("@/db/supabase.client", () => ({
  createSupabaseClientWithAuth: vi.fn(() => {
    return mockSupabaseWithAuth;
  }),
}));

// Import after mock is set up
import { GET } from "@/pages/api/summary";

describe("GET /api/summary", () => {
  let context: MockAPIContext;
  let mockSupabase: MockSupabaseClient;

  const testUserId = "550e8400-e29b-41d4-a716-446655440000";
  const testToken = "valid-test-token";

  const mockTransactionsData = [
    {
      id: "660e8400-e29b-41d4-a716-446655440001",
      amount: 150.5,
      type: "expense" as const,
      category_id: "770e8400-e29b-41d4-a716-446655440001",
      description: "Groceries",
      occurred_at: "2024-01-15T10:00:00.000Z",
      categories: { id: "770e8400-e29b-41d4-a716-446655440001", name: "Food" },
    },
    {
      id: "660e8400-e29b-41d4-a716-446655440002",
      amount: 3000.0,
      type: "income" as const,
      category_id: "770e8400-e29b-41d4-a716-446655440002",
      description: "Salary",
      occurred_at: "2024-01-01T10:00:00.000Z",
      categories: { id: "770e8400-e29b-41d4-a716-446655440002", name: "Salary" },
    },
    {
      id: "660e8400-e29b-41d4-a716-446655440003",
      amount: 50.0,
      type: "expense" as const,
      category_id: "770e8400-e29b-41d4-a716-446655440001",
      description: "Restaurant",
      occurred_at: "2024-01-20T10:00:00.000Z",
      categories: { id: "770e8400-e29b-41d4-a716-446655440001", name: "Food" },
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
      method: "GET",
      path: "/api/summary",
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
    it("should return monthly summary with aggregated data", async () => {
      // Arrange
      let fromCallCount = 0;
      mockSupabaseWithAuth.from.mockImplementation((table: string) => {
        fromCallCount++;
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
        // transactions table
        return {
          ...mockSupabaseWithAuth._chain,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lt: vi.fn().mockResolvedValue({ data: mockTransactionsData, error: null }),
              }),
            }),
          }),
        };
      });

      // Act
      const response = await GET(context as unknown as APIContext);
      const body = await parseJsonResponse<MonthlySummaryDTO>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(body.month).toBeDefined();
      expect(body.total_income).toBeDefined();
      expect(body.total_expenses).toBeDefined();
      expect(body.balance).toBeDefined();
      expect(body.categories).toBeDefined();
    });

    it("should return summary for specific month from query params", async () => {
      // Arrange
      const { context: monthContext, mockSupabase: monthMockSupabase } = createMockAPIContextWithAuth({
        method: "GET",
        path: "/api/summary?month=2024-01",
        token: testToken,
      });

      monthMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

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
                lt: vi.fn().mockResolvedValue({ data: mockTransactionsData, error: null }),
              }),
            }),
          }),
        };
      });

      // Act
      const response = await GET(monthContext as unknown as APIContext);
      const body = await parseJsonResponse<MonthlySummaryDTO>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.month).toBe("2024-01");
    });

    it("should return empty summary when no transactions exist", async () => {
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
                lt: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        };
      });

      // Act
      const response = await GET(context as unknown as APIContext);
      const body = await parseJsonResponse<MonthlySummaryDTO>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.total_income).toBe("0.00");
      expect(body.total_expenses).toBe("0.00");
      expect(body.balance).toBe("0.00");
      expect(body.categories).toEqual([]);
    });
  });

  describe("Authentication errors (401)", () => {
    it("should return 401 when Authorization header is missing", async () => {
      // Arrange
      const { context: noAuthContext } = createMockAPIContext({
        method: "GET",
        path: "/api/summary",
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
        path: "/api/summary",
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
    it("should return 400 when month format is invalid", async () => {
      // Arrange
      const { context: invalidMonthContext, mockSupabase: invalidMockSupabase } = createMockAPIContextWithAuth({
        method: "GET",
        path: "/api/summary?month=invalid-month",
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
      expect(body.error.message).toContain("Invalid month format");
    });

    it("should return 400 when month format has wrong pattern (YYYY-M)", async () => {
      // Arrange
      const { context: wrongFormatContext, mockSupabase: wrongFormatMockSupabase } = createMockAPIContextWithAuth({
        method: "GET",
        path: "/api/summary?month=2024-1",
        token: testToken,
      });

      wrongFormatMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      // Act
      const response = await GET(wrongFormatContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when month has invalid values (2024-13)", async () => {
      // Arrange
      const { context: invalidValueContext, mockSupabase: invalidValueMockSupabase } = createMockAPIContextWithAuth({
        method: "GET",
        path: "/api/summary?month=2024-13",
        token: testToken,
      });

      invalidValueMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      // Act
      const response = await GET(invalidValueContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Internal errors (500)", () => {
    it("should return 500 when database query fails", async () => {
      // Arrange
      mockSupabaseWithAuth.from.mockImplementation(() => {
        throw new Error("Database error");
      });

      // Act
      const response = await GET(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(500);
      expect(body.error.code).toBe("INTERNAL_ERROR");
      expect(body.error.message).toBe("An unexpected error occurred");
    });
  });
});

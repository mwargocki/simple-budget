import { describe, it, expect, beforeEach, vi } from "vitest";
import type { APIContext } from "astro";
import {
  createMockAPIContext,
  createMockAPIContextWithAuth,
  parseJsonResponse,
  type MockAPIContext,
} from "../../helpers/astro-context.mock";
import { createMockSupabaseClient, type MockSupabaseClient } from "../../../mocks/supabase.mock";
import type { CategoriesListDTO, CategoryDTO, ErrorResponseDTO } from "@/types";

// Store the mock instance that will be set in beforeEach
let mockSupabaseWithAuth: MockSupabaseClient;

// Mock must be defined before importing the module that uses it
vi.mock("@/db/supabase.client", () => ({
  createSupabaseClientWithAuth: vi.fn(() => {
    return mockSupabaseWithAuth;
  }),
}));

// Import after mock is set up
import { GET, POST } from "@/pages/api/categories/index";

describe("GET /api/categories", () => {
  let context: MockAPIContext;
  let mockSupabase: MockSupabaseClient;

  const testUserId = "550e8400-e29b-41d4-a716-446655440000";
  const testToken = "valid-test-token";

  const mockCategoriesData = [
    {
      id: "770e8400-e29b-41d4-a716-446655440001",
      name: "Food",
      is_system: false,
      system_key: null,
      created_at: "2024-01-15T10:00:00.000Z",
      updated_at: "2024-01-15T10:00:00.000Z",
    },
    {
      id: "770e8400-e29b-41d4-a716-446655440002",
      name: "Transport",
      is_system: false,
      system_key: null,
      created_at: "2024-01-15T10:00:00.000Z",
      updated_at: "2024-01-15T10:00:00.000Z",
    },
    {
      id: "770e8400-e29b-41d4-a716-446655440003",
      name: "Brak",
      is_system: true,
      system_key: "none",
      created_at: "2024-01-15T10:00:00.000Z",
      updated_at: "2024-01-15T10:00:00.000Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Create fresh mock for each test
    mockSupabaseWithAuth = createMockSupabaseClient();

    const mock = createMockAPIContextWithAuth({
      method: "GET",
      path: "/api/categories",
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
    it("should return categories list with 200", async () => {
      // Arrange
      mockSupabaseWithAuth._chain.order.mockResolvedValue({
        data: mockCategoriesData,
        error: null,
      });

      // Act
      const response = await GET(context as unknown as APIContext);
      const body = await parseJsonResponse<CategoriesListDTO>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(body.categories).toBeDefined();
      expect(body.categories).toHaveLength(3);
      expect(body.categories[0].name).toBe("Food");
    });

    it("should return empty list when no categories exist", async () => {
      // Arrange
      mockSupabaseWithAuth._chain.order.mockResolvedValue({
        data: [],
        error: null,
      });

      // Act
      const response = await GET(context as unknown as APIContext);
      const body = await parseJsonResponse<CategoriesListDTO>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.categories).toEqual([]);
    });
  });

  describe("Authentication errors (401)", () => {
    it("should return 401 when Authorization header is missing", async () => {
      // Arrange
      const { context: noAuthContext } = createMockAPIContext({
        method: "GET",
        path: "/api/categories",
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
        path: "/api/categories",
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

  describe("Internal errors (500)", () => {
    it("should return 500 when database query fails", async () => {
      // Arrange
      mockSupabaseWithAuth._chain.order.mockRejectedValue(new Error("Database error"));

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

describe("POST /api/categories", () => {
  let context: MockAPIContext;
  let mockSupabase: MockSupabaseClient;

  const testUserId = "550e8400-e29b-41d4-a716-446655440000";
  const testToken = "valid-test-token";

  const validCategoryData = {
    name: "New Category",
  };

  const createdCategory = {
    id: "770e8400-e29b-41d4-a716-446655440004",
    name: "New Category",
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
      method: "POST",
      path: "/api/categories",
      body: validCategoryData,
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
    it("should create a category and return 201", async () => {
      // Arrange
      mockSupabaseWithAuth._chain.single.mockResolvedValue({
        data: createdCategory,
        error: null,
      });

      // Act
      const response = await POST(context as unknown as APIContext);
      const body = await parseJsonResponse<CategoryDTO>(response);

      // Assert
      expect(response.status).toBe(201);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(body.id).toBe(createdCategory.id);
      expect(body.name).toBe("New Category");
      expect(body.is_system).toBe(false);
    });

    it("should create category with name at max length (40 chars)", async () => {
      // Arrange
      const maxLengthName = "a".repeat(40);
      const { context: maxLenContext, mockSupabase: maxLenMockSupabase } = createMockAPIContextWithAuth({
        method: "POST",
        path: "/api/categories",
        body: { name: maxLengthName },
        token: testToken,
      });

      maxLenMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      mockSupabaseWithAuth._chain.single.mockResolvedValue({
        data: { ...createdCategory, name: maxLengthName },
        error: null,
      });

      // Act
      const response = await POST(maxLenContext as unknown as APIContext);
      const body = await parseJsonResponse<CategoryDTO>(response);

      // Assert
      expect(response.status).toBe(201);
      expect(body.name).toBe(maxLengthName);
    });
  });

  describe("Authentication errors (401)", () => {
    it("should return 401 when Authorization header is missing", async () => {
      // Arrange
      const { context: noAuthContext } = createMockAPIContext({
        method: "POST",
        path: "/api/categories",
        body: validCategoryData,
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
        path: "/api/categories",
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

    it("should return 400 when name is missing", async () => {
      // Arrange
      const { context: noNameContext, mockSupabase: noNameMockSupabase } = createMockAPIContextWithAuth({
        method: "POST",
        path: "/api/categories",
        body: { something: "else" },
        token: testToken,
      });

      noNameMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      // Act
      const response = await POST(noNameContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when name is empty string", async () => {
      // Arrange
      const { context: emptyNameContext, mockSupabase: emptyNameMockSupabase } = createMockAPIContextWithAuth({
        method: "POST",
        path: "/api/categories",
        body: { name: "" },
        token: testToken,
      });

      emptyNameMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      // Act
      const response = await POST(emptyNameContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when name is only whitespace", async () => {
      // Arrange
      const { context: wsContext, mockSupabase: wsMockSupabase } = createMockAPIContextWithAuth({
        method: "POST",
        path: "/api/categories",
        body: { name: "   " },
        token: testToken,
      });

      wsMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      // Act
      const response = await POST(wsContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when name exceeds 40 characters", async () => {
      // Arrange
      const longName = "a".repeat(41);
      const { context: longNameContext, mockSupabase: longNameMockSupabase } = createMockAPIContextWithAuth({
        method: "POST",
        path: "/api/categories",
        body: { name: longName },
        token: testToken,
      });

      longNameMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      // Act
      const response = await POST(longNameContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when JSON body is invalid", async () => {
      // Arrange
      const url = new URL("http://localhost/api/categories");
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
        path: "/api/categories",
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

  describe("Conflict errors (409)", () => {
    it("should return 409 when category name already exists", async () => {
      // Arrange
      const duplicateError = { code: "23505", message: "Duplicate key value" };
      mockSupabaseWithAuth._chain.single.mockRejectedValue(duplicateError);

      // Act
      const response = await POST(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(409);
      expect(body.error.code).toBe("CONFLICT");
      expect(body.error.message).toBe("Category with this name already exists");
    });
  });

  describe("Internal errors (500)", () => {
    it("should return 500 when database insert fails", async () => {
      // Arrange
      mockSupabaseWithAuth._chain.single.mockRejectedValue(new Error("Database error"));

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

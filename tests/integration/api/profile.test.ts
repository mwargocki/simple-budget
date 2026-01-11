import { describe, it, expect, beforeEach, vi } from "vitest";
import type { APIContext } from "astro";
import {
  createMockAPIContext,
  createMockAPIContextWithAuth,
  parseJsonResponse,
  type MockAPIContext,
} from "../helpers/astro-context.mock";
import { createMockSupabaseClient, type MockSupabaseClient } from "../../mocks/supabase.mock";
import type { ProfileDTO, ErrorResponseDTO } from "@/types";

// Store the mock instance that will be set in beforeEach
let mockSupabaseWithAuth: MockSupabaseClient;

// Mock must be defined before importing the module that uses it
vi.mock("@/db/supabase.client", () => ({
  createSupabaseClientWithAuth: vi.fn(() => {
    return mockSupabaseWithAuth;
  }),
}));

// Import after mock is set up
import { GET, PATCH } from "@/pages/api/profile";

describe("GET /api/profile", () => {
  let context: MockAPIContext;
  let mockSupabase: MockSupabaseClient;

  const testUserId = "550e8400-e29b-41d4-a716-446655440000";
  const testToken = "valid-test-token";

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
      path: "/api/profile",
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
    it("should return user profile with 200", async () => {
      // Arrange
      mockSupabaseWithAuth._chain.single.mockResolvedValue({
        data: mockProfileData,
        error: null,
      });

      // Act
      const response = await GET(context as unknown as APIContext);
      const body = await parseJsonResponse<ProfileDTO>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(body.id).toBe(testUserId);
      expect(body.timezone).toBe("Europe/Warsaw");
    });
  });

  describe("Authentication errors (401)", () => {
    it("should return 401 when Authorization header is missing", async () => {
      // Arrange
      const { context: noAuthContext } = createMockAPIContext({
        method: "GET",
        path: "/api/profile",
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
        path: "/api/profile",
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

  describe("Not found errors (404)", () => {
    it("should return 404 when profile does not exist", async () => {
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
      expect(body.error.message).toBe("Profile not found");
    });
  });

  describe("Internal errors (500)", () => {
    it("should return 500 when database query fails", async () => {
      // Arrange
      mockSupabaseWithAuth._chain.single.mockRejectedValue(new Error("Database error"));

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

describe("PATCH /api/profile", () => {
  let context: MockAPIContext;
  let mockSupabase: MockSupabaseClient;

  const testUserId = "550e8400-e29b-41d4-a716-446655440000";
  const testToken = "valid-test-token";

  const validUpdateData = {
    timezone: "America/New_York",
  };

  const existingProfile = {
    id: testUserId,
    timezone: "Europe/Warsaw",
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
  };

  const updatedProfile = {
    ...existingProfile,
    timezone: "America/New_York",
    updated_at: "2024-01-15T10:00:00.000Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create fresh mock for each test
    mockSupabaseWithAuth = createMockSupabaseClient();

    const mock = createMockAPIContextWithAuth({
      method: "PATCH",
      path: "/api/profile",
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
    it("should update profile and return 200", async () => {
      // Arrange
      mockSupabaseWithAuth._chain.single.mockResolvedValue({
        data: updatedProfile,
        error: null,
      });

      // Act
      const response = await PATCH(context as unknown as APIContext);
      const body = await parseJsonResponse<ProfileDTO>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(body.id).toBe(testUserId);
      expect(body.timezone).toBe("America/New_York");
    });

    it("should trim whitespace from timezone", async () => {
      // Arrange
      const { context: trimContext, mockSupabase: trimMockSupabase } = createMockAPIContextWithAuth({
        method: "PATCH",
        path: "/api/profile",
        body: { timezone: "  Europe/London  " },
        token: testToken,
      });

      trimMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      mockSupabaseWithAuth._chain.single.mockResolvedValue({
        data: { ...existingProfile, timezone: "Europe/London" },
        error: null,
      });

      // Act
      const response = await PATCH(trimContext as unknown as APIContext);
      const body = await parseJsonResponse<ProfileDTO>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.timezone).toBe("Europe/London");
    });
  });

  describe("Authentication errors (401)", () => {
    it("should return 401 when Authorization header is missing", async () => {
      // Arrange
      const { context: noAuthContext } = createMockAPIContext({
        method: "PATCH",
        path: "/api/profile",
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
    it("should return 400 when JSON body is invalid", async () => {
      // Arrange
      const url = new URL("http://localhost/api/profile");
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
        path: "/api/profile",
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
      const response = await PATCH(invalidJsonContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.message).toBe("Invalid JSON body");
    });

    it("should return 400 when request body is empty", async () => {
      // Arrange
      const { context: emptyContext, mockSupabase: emptyMockSupabase } = createMockAPIContextWithAuth({
        method: "PATCH",
        path: "/api/profile",
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
      expect(body.error.message).toBe("Validation failed");
    });

    it("should return 400 when timezone is missing", async () => {
      // Arrange
      const { context: noTimezoneContext, mockSupabase: noTimezoneMockSupabase } = createMockAPIContextWithAuth({
        method: "PATCH",
        path: "/api/profile",
        body: { something: "else" },
        token: testToken,
      });

      noTimezoneMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      // Act
      const response = await PATCH(noTimezoneContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when timezone is empty string", async () => {
      // Arrange
      const { context: emptyTzContext, mockSupabase: emptyTzMockSupabase } = createMockAPIContextWithAuth({
        method: "PATCH",
        path: "/api/profile",
        body: { timezone: "" },
        token: testToken,
      });

      emptyTzMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      // Act
      const response = await PATCH(emptyTzContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should accept timezone with whitespace (schema allows it)", async () => {
      // Arrange - note: current schema allows whitespace-only timezone as it only checks min(1)
      // This test documents the current behavior
      const { context: wsContext, mockSupabase: wsMockSupabase } = createMockAPIContextWithAuth({
        method: "PATCH",
        path: "/api/profile",
        body: { timezone: "   " },
        token: testToken,
      });

      wsMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      mockSupabaseWithAuth._chain.single.mockResolvedValue({
        data: { ...existingProfile, timezone: "   " },
        error: null,
      });

      // Act
      const response = await PATCH(wsContext as unknown as APIContext);
      const body = await parseJsonResponse<ProfileDTO>(response);

      // Assert - schema allows whitespace-only timezone currently
      expect(response.status).toBe(200);
      expect(body.timezone).toBe("   ");
    });

    it("should return 400 when timezone exceeds 64 characters", async () => {
      // Arrange
      const longTimezone = "a".repeat(65);
      const { context: longTzContext, mockSupabase: longTzMockSupabase } = createMockAPIContextWithAuth({
        method: "PATCH",
        path: "/api/profile",
        body: { timezone: longTimezone },
        token: testToken,
      });

      longTzMockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: "test@example.com" } },
        error: null,
      });

      // Act
      const response = await PATCH(longTzContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Not found errors (404)", () => {
    it("should return 404 when profile does not exist", async () => {
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
      expect(body.error.message).toBe("Profile not found");
    });
  });

  describe("Internal errors (500)", () => {
    it("should return 500 when database update fails", async () => {
      // Arrange
      mockSupabaseWithAuth._chain.single.mockRejectedValue(new Error("Database error"));

      // Act
      const response = await PATCH(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(500);
      expect(body.error.code).toBe("INTERNAL_ERROR");
      expect(body.error.message).toBe("An unexpected error occurred");
    });
  });
});

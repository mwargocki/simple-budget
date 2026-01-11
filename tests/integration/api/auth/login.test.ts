import { describe, it, expect, beforeEach } from "vitest";
import type { APIContext } from "astro";
import { AuthApiError } from "@supabase/supabase-js";
import { POST } from "@/pages/api/auth/login";
import { createMockAPIContext, parseJsonResponse, type MockAPIContext } from "../../helpers/astro-context.mock";
import type { MockSupabaseClient } from "../../../mocks/supabase.mock";
import type { LoginResponseDTO, ErrorResponseDTO } from "@/types";

describe("POST /api/auth/login", () => {
  let context: MockAPIContext;
  let mockSupabase: MockSupabaseClient;

  const validLoginData = {
    email: "test@example.com",
    password: "password123",
  };

  const testUserId = "550e8400-e29b-41d4-a716-446655440000";

  const mockSession = {
    access_token: "mock-access-token",
    refresh_token: "mock-refresh-token",
    expires_at: 1234567890,
  };

  beforeEach(() => {
    const mock = createMockAPIContext({
      method: "POST",
      path: "/api/auth/login",
      body: validLoginData,
    });
    context = mock.context;
    mockSupabase = mock.mockSupabase;
  });

  describe("Success cases", () => {
    it("should login user and return 200 with session", async () => {
      // Arrange
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: testUserId, email: validLoginData.email },
          session: mockSession,
        },
        error: null,
      });

      // Act
      const response = await POST(context as unknown as APIContext);
      const body = await parseJsonResponse<LoginResponseDTO>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(body).toEqual({
        user: {
          id: testUserId,
          email: validLoginData.email,
        },
        session: {
          access_token: mockSession.access_token,
          refresh_token: mockSession.refresh_token,
          expires_at: mockSession.expires_at,
        },
      });
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: validLoginData.email,
        password: validLoginData.password,
      });
    });
  });

  describe("Validation errors (400)", () => {
    it("should return 400 when request body is empty", async () => {
      // Arrange
      const { context: emptyContext } = createMockAPIContext({
        method: "POST",
        path: "/api/auth/login",
        body: {},
      });

      // Act
      const response = await POST(emptyContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.message).toBe("Validation failed");
    });

    it("should return 400 when email is invalid", async () => {
      // Arrange
      const { context: invalidContext } = createMockAPIContext({
        method: "POST",
        path: "/api/auth/login",
        body: {
          email: "invalid-email",
          password: "password123",
        },
      });

      // Act
      const response = await POST(invalidContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.details).toContainEqual(expect.objectContaining({ field: "email" }));
    });

    it("should return 400 when password is missing", async () => {
      // Arrange
      const { context: noPwdContext } = createMockAPIContext({
        method: "POST",
        path: "/api/auth/login",
        body: {
          email: "test@example.com",
        },
      });

      // Act
      const response = await POST(noPwdContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Authentication errors (401)", () => {
    it("should return 401 when credentials are invalid (AuthApiError)", async () => {
      // Arrange
      const authError = new AuthApiError("Invalid login credentials", 400, "invalid_credentials");
      mockSupabase.auth.signInWithPassword.mockRejectedValue(authError);

      // Act
      const response = await POST(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.error.code).toBe("UNAUTHORIZED");
      expect(body.error.message).toBe("Invalid credentials");
    });

    it("should not leak user existence information", async () => {
      // Arrange - simulating user not found vs wrong password should return same error
      const authError = new AuthApiError("User not found", 400, "user_not_found");
      mockSupabase.auth.signInWithPassword.mockRejectedValue(authError);

      // Act
      const response = await POST(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert - generic message to prevent user enumeration
      expect(response.status).toBe(401);
      expect(body.error.message).toBe("Invalid credentials");
      expect(body.error.message).not.toContain("not found");
    });
  });

  describe("Internal errors (500)", () => {
    it("should return 500 when unexpected error occurs", async () => {
      // Arrange
      mockSupabase.auth.signInWithPassword.mockRejectedValue(new Error("Network error"));

      // Act
      const response = await POST(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(500);
      expect(body.error.code).toBe("INTERNAL_ERROR");
      expect(body.error.message).toBe("An unexpected error occurred");
    });

    it("should return 500 when user is null in successful response", async () => {
      // Arrange
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: mockSession },
        error: null,
      });

      // Act
      const response = await POST(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(500);
      expect(body.error.code).toBe("INTERNAL_ERROR");
    });

    it("should return 500 when session is null in successful response", async () => {
      // Arrange
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: testUserId, email: validLoginData.email },
          session: null,
        },
        error: null,
      });

      // Act
      const response = await POST(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(500);
      expect(body.error.code).toBe("INTERNAL_ERROR");
    });
  });
});

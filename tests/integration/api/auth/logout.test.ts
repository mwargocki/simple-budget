import { describe, it, expect, beforeEach } from "vitest";
import type { APIContext } from "astro";
import { AuthApiError } from "@supabase/supabase-js";
import { POST } from "@/pages/api/auth/logout";
import {
  createMockAPIContext,
  createMockAPIContextWithAuth,
  parseJsonResponse,
  type MockAPIContext,
} from "../../helpers/astro-context.mock";
import type { MockSupabaseClient } from "../../../mocks/supabase.mock";
import type { LogoutResponseDTO, ErrorResponseDTO } from "@/types";

describe("POST /api/auth/logout", () => {
  let context: MockAPIContext;
  let mockSupabase: MockSupabaseClient;

  const testUserId = "550e8400-e29b-41d4-a716-446655440000";
  const testEmail = "test@example.com";
  const validToken = "valid-test-token";

  beforeEach(() => {
    const mock = createMockAPIContextWithAuth({
      method: "POST",
      path: "/api/auth/logout",
      token: validToken,
    });
    context = mock.context;
    mockSupabase = mock.mockSupabase;
  });

  describe("Success cases", () => {
    it("should logout user and return 200", async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: testEmail } },
        error: null,
      });
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      // Act
      const response = await POST(context as unknown as APIContext);
      const body = await parseJsonResponse<LogoutResponseDTO>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(body).toEqual({
        message: "Logged out successfully",
      });
      expect(mockSupabase.auth.getUser).toHaveBeenCalledWith(validToken);
      expect(mockSupabase.auth.signOut).toHaveBeenCalledWith({ scope: "global" });
    });
  });

  describe("Authentication errors (401)", () => {
    it("should return 401 when Authorization header is missing", async () => {
      // Arrange
      const { context: noAuthContext } = createMockAPIContext({
        method: "POST",
        path: "/api/auth/logout",
      });

      // Act
      const response = await POST(noAuthContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.error.code).toBe("UNAUTHORIZED");
      expect(body.error.message).toBe("No valid session");
    });

    it("should return 401 when Authorization header has wrong format", async () => {
      // Arrange
      const { context: wrongFormatContext } = createMockAPIContext({
        method: "POST",
        path: "/api/auth/logout",
        headers: {
          Authorization: "Basic invalid-format",
        },
      });

      // Act
      const response = await POST(wrongFormatContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.error.code).toBe("UNAUTHORIZED");
      expect(body.error.message).toBe("No valid session");
    });

    it("should return 401 when token is invalid (getUser returns error)", async () => {
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
      expect(body.error.message).toBe("No valid session");
    });

    it("should return 401 when user is null", async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act
      const response = await POST(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });

    it("should return 401 when AuthApiError is thrown", async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: testEmail } },
        error: null,
      });
      const authError = new AuthApiError("Session expired", 401, "session_expired");
      mockSupabase.auth.signOut.mockRejectedValue(authError);

      // Act
      const response = await POST(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.error.code).toBe("UNAUTHORIZED");
      expect(body.error.message).toBe("No valid session");
    });
  });

  describe("Internal errors (500)", () => {
    it("should return 500 when unexpected error occurs", async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: testEmail } },
        error: null,
      });
      mockSupabase.auth.signOut.mockRejectedValue(new Error("Network error"));

      // Act
      const response = await POST(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(500);
      expect(body.error.code).toBe("INTERNAL_ERROR");
      expect(body.error.message).toBe("An unexpected error occurred");
    });

    it("should return 500 when signOut returns error", async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: testEmail } },
        error: null,
      });
      mockSupabase.auth.signOut.mockResolvedValue({
        error: { message: "Database error" },
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

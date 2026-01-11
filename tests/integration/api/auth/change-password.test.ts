import { describe, it, expect, beforeEach } from "vitest";
import type { APIContext } from "astro";
import { AuthApiError } from "@supabase/supabase-js";
import { POST } from "@/pages/api/auth/change-password";
import {
  createMockAPIContextWithAuth,
  createMockAPIContext,
  parseJsonResponse,
  type MockAPIContext,
} from "../../helpers/astro-context.mock";
import type { MockSupabaseClient } from "../../../mocks/supabase.mock";
import type { ChangePasswordResponseDTO, ErrorResponseDTO } from "@/types";

describe("POST /api/auth/change-password", () => {
  let context: MockAPIContext;
  let mockSupabase: MockSupabaseClient;

  const testUserId = "550e8400-e29b-41d4-a716-446655440000";
  const testEmail = "test@example.com";
  const validToken = "valid-test-token";

  const validChangePasswordData = {
    currentPassword: "oldpassword123",
    newPassword: "newpassword456",
    newPasswordConfirm: "newpassword456",
  };

  beforeEach(() => {
    const mock = createMockAPIContextWithAuth({
      method: "POST",
      path: "/api/auth/change-password",
      body: validChangePasswordData,
      token: validToken,
    });
    context = mock.context;
    mockSupabase = mock.mockSupabase;
  });

  describe("Success cases", () => {
    it("should change password and return 200", async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: testEmail } },
        error: null,
      });
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: testUserId, email: testEmail },
          session: { access_token: "token", refresh_token: "refresh", expires_at: 123 },
        },
        error: null,
      });
      mockSupabase.auth.updateUser.mockResolvedValue({
        data: { user: { id: testUserId, email: testEmail } },
        error: null,
      });

      // Act
      const response = await POST(context as unknown as APIContext);
      const body = await parseJsonResponse<ChangePasswordResponseDTO>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(body).toEqual({
        message: "Password changed successfully",
      });
      expect(mockSupabase.auth.getUser).toHaveBeenCalledWith(validToken);
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: testEmail,
        password: validChangePasswordData.currentPassword,
      });
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: validChangePasswordData.newPassword,
      });
    });
  });

  describe("Authentication errors (401)", () => {
    it("should return 401 when Authorization header is missing", async () => {
      // Arrange
      const { context: noAuthContext } = createMockAPIContext({
        method: "POST",
        path: "/api/auth/change-password",
        body: validChangePasswordData,
      });

      // Act
      const response = await POST(noAuthContext as unknown as APIContext);
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
      const response = await POST(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });

    it("should return 401 when user has no email", async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: null } },
        error: null,
      });

      // Act
      const response = await POST(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });

    it("should return 401 when current password is incorrect (AuthApiError)", async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: testEmail } },
        error: null,
      });
      const authError = new AuthApiError("Invalid login credentials", 400, "invalid_credentials");
      mockSupabase.auth.signInWithPassword.mockRejectedValue(authError);

      // Act
      const response = await POST(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.error.code).toBe("UNAUTHORIZED");
      expect(body.error.message).toBe("Current password is incorrect");
    });
  });

  describe("Validation errors (400)", () => {
    it("should return 400 when request body is empty", async () => {
      // Arrange
      const { context: emptyContext, mockSupabase: emptyMock } = createMockAPIContextWithAuth({
        method: "POST",
        path: "/api/auth/change-password",
        body: {},
        token: validToken,
      });
      emptyMock.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: testEmail } },
        error: null,
      });

      // Act
      const response = await POST(emptyContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when new password is too short", async () => {
      // Arrange
      const { context: shortPwdContext, mockSupabase: shortMock } = createMockAPIContextWithAuth({
        method: "POST",
        path: "/api/auth/change-password",
        body: {
          currentPassword: "oldpassword123",
          newPassword: "short",
          newPasswordConfirm: "short",
        },
        token: validToken,
      });
      shortMock.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: testEmail } },
        error: null,
      });

      // Act
      const response = await POST(shortPwdContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.details).toContainEqual(expect.objectContaining({ field: "newPassword" }));
    });

    it("should return 400 when new passwords do not match", async () => {
      // Arrange
      const { context: mismatchContext, mockSupabase: mismatchMock } = createMockAPIContextWithAuth({
        method: "POST",
        path: "/api/auth/change-password",
        body: {
          currentPassword: "oldpassword123",
          newPassword: "newpassword456",
          newPasswordConfirm: "differentpassword",
        },
        token: validToken,
      });
      mismatchMock.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: testEmail } },
        error: null,
      });

      // Act
      const response = await POST(mismatchContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.details).toContainEqual(expect.objectContaining({ field: "newPasswordConfirm" }));
    });

    it("should return 400 when new password is same as current", async () => {
      // Arrange
      const { context: samePwdContext, mockSupabase: sameMock } = createMockAPIContextWithAuth({
        method: "POST",
        path: "/api/auth/change-password",
        body: {
          currentPassword: "samepassword123",
          newPassword: "samepassword123",
          newPasswordConfirm: "samepassword123",
        },
        token: validToken,
      });
      sameMock.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: testEmail } },
        error: null,
      });

      // Act
      const response = await POST(samePwdContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Internal errors (500)", () => {
    it("should return 500 when unexpected error occurs", async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: testEmail } },
        error: null,
      });
      mockSupabase.auth.signInWithPassword.mockRejectedValue(new Error("Network error"));

      // Act
      const response = await POST(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(500);
      expect(body.error.code).toBe("INTERNAL_ERROR");
    });

    it("should return 500 when updateUser fails with non-auth error", async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: testEmail } },
        error: null,
      });
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: testUserId, email: testEmail },
          session: { access_token: "token", refresh_token: "refresh", expires_at: 123 },
        },
        error: null,
      });
      mockSupabase.auth.updateUser.mockRejectedValue(new Error("Database connection lost"));

      // Act
      const response = await POST(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(500);
      expect(body.error.code).toBe("INTERNAL_ERROR");
    });
  });
});

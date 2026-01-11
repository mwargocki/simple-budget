import { describe, it, expect, beforeEach, vi } from "vitest";
import type { APIContext } from "astro";
import { AuthApiError } from "@supabase/supabase-js";
import { DELETE } from "@/pages/api/auth/account";
import {
  createMockAPIContextWithAuth,
  createMockAPIContext,
  parseJsonResponse,
  type MockAPIContext,
} from "../../helpers/astro-context.mock";
import type { MockSupabaseClient } from "../../../mocks/supabase.mock";
import type { DeleteAccountResponseDTO, ErrorResponseDTO } from "@/types";

// Mock supabaseAdmin module
const mockAdminAuth = {
  admin: {
    deleteUser: vi.fn(),
  },
};

const mockSupabaseAdmin = {
  rpc: vi.fn(),
  auth: mockAdminAuth,
};

vi.mock("@/db/supabase.admin", () => ({
  supabaseAdmin: mockSupabaseAdmin,
}));

describe("DELETE /api/auth/account", () => {
  let context: MockAPIContext;
  let mockSupabase: MockSupabaseClient;

  const testUserId = "550e8400-e29b-41d4-a716-446655440000";
  const testEmail = "test@example.com";
  const validToken = "valid-test-token";

  const validDeleteData = {
    confirmation: "DELETE",
  };

  beforeEach(() => {
    const mock = createMockAPIContextWithAuth({
      method: "DELETE",
      path: "/api/auth/account",
      body: validDeleteData,
      token: validToken,
    });
    context = mock.context;
    mockSupabase = mock.mockSupabase;

    // Reset admin mocks
    mockSupabaseAdmin.rpc.mockReset();
    mockAdminAuth.admin.deleteUser.mockReset();
  });

  describe("Success cases", () => {
    it("should delete account and return 200", async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: testEmail } },
        error: null,
      });
      mockSupabaseAdmin.rpc.mockResolvedValue({
        data: null,
        error: null,
      });
      mockAdminAuth.admin.deleteUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act
      const response = await DELETE(context as unknown as APIContext);
      const body = await parseJsonResponse<DeleteAccountResponseDTO>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(body).toEqual({
        message: "Account deleted successfully",
      });
      expect(mockSupabase.auth.getUser).toHaveBeenCalledWith(validToken);
      expect(mockSupabaseAdmin.rpc).toHaveBeenCalledWith("delete_user_account", {
        target_user_id: testUserId,
      });
      expect(mockAdminAuth.admin.deleteUser).toHaveBeenCalledWith(testUserId);
    });
  });

  describe("Authentication errors (401)", () => {
    it("should return 401 when Authorization header is missing", async () => {
      // Arrange
      const { context: noAuthContext } = createMockAPIContext({
        method: "DELETE",
        path: "/api/auth/account",
        body: validDeleteData,
      });

      // Act
      const response = await DELETE(noAuthContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.error.code).toBe("UNAUTHORIZED");
      expect(body.error.message).toBe("No valid session");
    });

    it("should return 401 when Authorization header has wrong format", async () => {
      // Arrange
      const { context: wrongFormatContext } = createMockAPIContext({
        method: "DELETE",
        path: "/api/auth/account",
        body: validDeleteData,
        headers: {
          Authorization: "Basic invalid",
        },
      });

      // Act
      const response = await DELETE(wrongFormatContext as unknown as APIContext);
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
      const response = await DELETE(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });

    it("should return 401 when user is null", async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act
      const response = await DELETE(context as unknown as APIContext);
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
      mockSupabaseAdmin.rpc.mockRejectedValue(authError);

      // Act
      const response = await DELETE(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("Validation errors (400)", () => {
    it("should return 400 when confirmation is missing", async () => {
      // Arrange
      const { context: noConfirmContext, mockSupabase: noConfirmMock } = createMockAPIContextWithAuth({
        method: "DELETE",
        path: "/api/auth/account",
        body: {},
        token: validToken,
      });
      noConfirmMock.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: testEmail } },
        error: null,
      });

      // Act
      const response = await DELETE(noConfirmContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when confirmation is not DELETE", async () => {
      // Arrange
      const { context: wrongConfirmContext, mockSupabase: wrongMock } = createMockAPIContextWithAuth({
        method: "DELETE",
        path: "/api/auth/account",
        body: { confirmation: "delete" }, // lowercase should fail
        token: validToken,
      });
      wrongMock.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: testEmail } },
        error: null,
      });

      // Act
      const response = await DELETE(wrongConfirmContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.details).toContainEqual(
        expect.objectContaining({ field: "confirmation" })
      );
    });

    it("should return 400 when JSON is invalid", async () => {
      // Arrange - create request with invalid JSON body
      const url = new URL("http://localhost/api/auth/account");
      const request = new Request(url.toString(), {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${validToken}`,
        },
        body: "invalid json {",
      });

      const { mockSupabase: invalidMock } = createMockAPIContextWithAuth({
        method: "DELETE",
        path: "/api/auth/account",
        token: validToken,
      });
      invalidMock.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: testEmail } },
        error: null,
      });

      const invalidContext = {
        request,
        locals: { supabase: invalidMock },
        cookies: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
        url,
        params: {},
      };

      // Act
      const response = await DELETE(invalidContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.message).toBe("Invalid JSON body");
    });
  });

  describe("Internal errors (500)", () => {
    it("should return 500 when RPC function fails", async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: testEmail } },
        error: null,
      });
      mockSupabaseAdmin.rpc.mockResolvedValue({
        data: null,
        error: { message: "RPC function error", code: "P0001" },
      });

      // Act
      const response = await DELETE(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(500);
      expect(body.error.code).toBe("INTERNAL_ERROR");
    });

    it("should return 500 when deleteUser fails", async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: testEmail } },
        error: null,
      });
      mockSupabaseAdmin.rpc.mockResolvedValue({
        data: null,
        error: null,
      });
      mockAdminAuth.admin.deleteUser.mockResolvedValue({
        data: null,
        error: { message: "User not found", status: 404 },
      });

      // Act
      const response = await DELETE(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(500);
      expect(body.error.code).toBe("INTERNAL_ERROR");
    });

    it("should return 500 when unexpected error occurs", async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: testEmail } },
        error: null,
      });
      mockSupabaseAdmin.rpc.mockRejectedValue(new Error("Network error"));

      // Act
      const response = await DELETE(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(500);
      expect(body.error.code).toBe("INTERNAL_ERROR");
    });
  });

  describe("Operation order", () => {
    it("should call RPC before deleting user from auth", async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: testEmail } },
        error: null,
      });
      mockSupabaseAdmin.rpc.mockResolvedValue({
        data: null,
        error: null,
      });
      mockAdminAuth.admin.deleteUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act
      await DELETE(context as unknown as APIContext);

      // Assert
      const rpcCallOrder = mockSupabaseAdmin.rpc.mock.invocationCallOrder[0];
      const deleteCallOrder = mockAdminAuth.admin.deleteUser.mock.invocationCallOrder[0];
      expect(rpcCallOrder).toBeLessThan(deleteCallOrder);
    });

    it("should not call deleteUser if RPC fails", async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId, email: testEmail } },
        error: null,
      });
      mockSupabaseAdmin.rpc.mockResolvedValue({
        data: null,
        error: { message: "RPC failed" },
      });

      // Act
      await DELETE(context as unknown as APIContext);

      // Assert
      expect(mockAdminAuth.admin.deleteUser).not.toHaveBeenCalled();
    });
  });
});

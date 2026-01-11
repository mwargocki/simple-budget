import { describe, it, expect, beforeEach, vi } from "vitest";
import type { SupabaseClient } from "@/db/supabase.client";
import { AuthService } from "@/lib/services/auth.service";
import { createMockSupabaseClient, type MockSupabaseClient } from "../../mocks/supabase.mock";

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

describe("AuthService", () => {
  let mockClient: MockSupabaseClient;
  let service: AuthService;

  const testUserId = "550e8400-e29b-41d4-a716-446655440000";
  const testEmail = "test@example.com";
  const testPassword = "securepassword123";

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    service = new AuthService(mockClient as unknown as SupabaseClient);

    // Reset admin mocks
    mockSupabaseAdmin.rpc.mockReset();
    mockAdminAuth.admin.deleteUser.mockReset();
  });

  describe("register", () => {
    const registerCommand = {
      email: testEmail,
      password: testPassword,
      passwordConfirm: testPassword,
    };

    it("should register a new user successfully", async () => {
      // Arrange
      const mockUser = {
        id: testUserId,
        email: testEmail,
      };

      mockClient.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      // Act
      const result = await service.register(registerCommand);

      // Assert
      expect(result).toEqual({
        user: {
          id: testUserId,
          email: testEmail,
        },
      });
      expect(mockClient.auth.signUp).toHaveBeenCalledWith({
        email: testEmail,
        password: testPassword,
      });
      expect(mockClient.auth.signUp).toHaveBeenCalledTimes(1);
    });

    it("should throw error when Supabase returns an error (e.g., duplicate email)", async () => {
      // Arrange
      const supabaseError = {
        message: "User already registered",
        status: 400,
        code: "user_already_exists",
      };

      mockClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: supabaseError,
      });

      // Act & Assert
      await expect(service.register(registerCommand)).rejects.toEqual(supabaseError);
    });

    it("should throw error when user is null in response", async () => {
      // Arrange
      mockClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      // Act & Assert
      await expect(service.register(registerCommand)).rejects.toThrow("User creation failed");
    });

    it("should throw error when user email is missing in response", async () => {
      // Arrange
      mockClient.auth.signUp.mockResolvedValue({
        data: {
          user: { id: testUserId, email: null },
          session: null,
        },
        error: null,
      });

      // Act & Assert
      await expect(service.register(registerCommand)).rejects.toThrow("User creation failed");
    });

    it("should throw error when user email is undefined", async () => {
      // Arrange
      mockClient.auth.signUp.mockResolvedValue({
        data: {
          user: { id: testUserId, email: undefined },
          session: null,
        },
        error: null,
      });

      // Act & Assert
      await expect(service.register(registerCommand)).rejects.toThrow("User creation failed");
    });

    it("should handle network errors", async () => {
      // Arrange
      const networkError = new Error("Network request failed");
      mockClient.auth.signUp.mockRejectedValue(networkError);

      // Act & Assert
      await expect(service.register(registerCommand)).rejects.toThrow("Network request failed");
    });
  });

  describe("login", () => {
    const loginCommand = {
      email: testEmail,
      password: testPassword,
    };

    const mockSession = {
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
      expires_at: 1234567890,
    };

    it("should login user successfully and return session", async () => {
      // Arrange
      const mockUser = {
        id: testUserId,
        email: testEmail,
      };

      mockClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      // Act
      const result = await service.login(loginCommand);

      // Assert
      expect(result).toEqual({
        user: {
          id: testUserId,
          email: testEmail,
        },
        session: {
          access_token: "mock-access-token",
          refresh_token: "mock-refresh-token",
          expires_at: 1234567890,
        },
      });
      expect(mockClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: testEmail,
        password: testPassword,
      });
    });

    it("should throw error when credentials are invalid", async () => {
      // Arrange
      const authError = {
        message: "Invalid login credentials",
        status: 400,
        code: "invalid_credentials",
      };

      mockClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: authError,
      });

      // Act & Assert
      await expect(service.login(loginCommand)).rejects.toEqual(authError);
    });

    it("should throw error when user is null in response", async () => {
      // Arrange
      mockClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: mockSession },
        error: null,
      });

      // Act & Assert
      await expect(service.login(loginCommand)).rejects.toThrow("Login failed");
    });

    it("should throw error when session is null in response", async () => {
      // Arrange
      mockClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: testUserId, email: testEmail },
          session: null,
        },
        error: null,
      });

      // Act & Assert
      await expect(service.login(loginCommand)).rejects.toThrow("Login failed");
    });

    it("should throw error when user email is missing", async () => {
      // Arrange
      mockClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: testUserId, email: null },
          session: mockSession,
        },
        error: null,
      });

      // Act & Assert
      await expect(service.login(loginCommand)).rejects.toThrow("Login failed");
    });

    it("should handle expires_at being undefined by defaulting to 0", async () => {
      // Arrange
      const sessionWithoutExpiry = {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
        expires_at: undefined,
      };

      mockClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: testUserId, email: testEmail },
          session: sessionWithoutExpiry,
        },
        error: null,
      });

      // Act
      const result = await service.login(loginCommand);

      // Assert
      expect(result.session.expires_at).toBe(0);
    });
  });

  describe("logout", () => {
    it("should logout user successfully", async () => {
      // Arrange
      mockClient.auth.signOut.mockResolvedValue({
        error: null,
      });

      // Act
      const result = await service.logout();

      // Assert
      expect(result).toEqual({
        message: "Logged out successfully",
      });
      expect(mockClient.auth.signOut).toHaveBeenCalledWith({ scope: "global" });
      expect(mockClient.auth.signOut).toHaveBeenCalledTimes(1);
    });

    it("should throw error when logout fails", async () => {
      // Arrange
      const logoutError = {
        message: "Session not found",
        status: 400,
        code: "session_not_found",
      };

      mockClient.auth.signOut.mockResolvedValue({
        error: logoutError,
      });

      // Act & Assert
      await expect(service.logout()).rejects.toEqual(logoutError);
    });

    it("should handle network errors during logout", async () => {
      // Arrange
      const networkError = new Error("Network error");
      mockClient.auth.signOut.mockRejectedValue(networkError);

      // Act & Assert
      await expect(service.logout()).rejects.toThrow("Network error");
    });
  });

  describe("changePassword", () => {
    const userEmail = testEmail;
    const changePasswordCommand = {
      currentPassword: "oldpassword123",
      newPassword: "newpassword456",
      newPasswordConfirm: "newpassword456",
    };

    it("should change password successfully", async () => {
      // Arrange
      mockClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: testUserId, email: testEmail },
          session: { access_token: "token", refresh_token: "refresh", expires_at: 123 },
        },
        error: null,
      });

      mockClient.auth.updateUser.mockResolvedValue({
        data: { user: { id: testUserId, email: testEmail } },
        error: null,
      });

      // Act
      const result = await service.changePassword(changePasswordCommand, userEmail);

      // Assert
      expect(result).toEqual({
        message: "Password changed successfully",
      });
      expect(mockClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: userEmail,
        password: changePasswordCommand.currentPassword,
      });
      expect(mockClient.auth.updateUser).toHaveBeenCalledWith({
        password: changePasswordCommand.newPassword,
      });
    });

    it("should throw error when current password is incorrect", async () => {
      // Arrange
      const signInError = {
        message: "Invalid login credentials",
        status: 400,
        code: "invalid_credentials",
      };

      mockClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: signInError,
      });

      // Act & Assert
      await expect(service.changePassword(changePasswordCommand, userEmail)).rejects.toEqual(signInError);

      // updateUser should not be called
      expect(mockClient.auth.updateUser).not.toHaveBeenCalled();
    });

    it("should throw error when password update fails", async () => {
      // Arrange
      mockClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: testUserId, email: testEmail },
          session: { access_token: "token", refresh_token: "refresh", expires_at: 123 },
        },
        error: null,
      });

      const updateError = {
        message: "Password should be at least 6 characters",
        status: 422,
        code: "weak_password",
      };

      mockClient.auth.updateUser.mockResolvedValue({
        data: { user: null },
        error: updateError,
      });

      // Act & Assert
      await expect(service.changePassword(changePasswordCommand, userEmail)).rejects.toEqual(updateError);
    });

    it("should verify current password before updating", async () => {
      // Arrange
      mockClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: testUserId, email: testEmail },
          session: { access_token: "token", refresh_token: "refresh", expires_at: 123 },
        },
        error: null,
      });

      mockClient.auth.updateUser.mockResolvedValue({
        data: { user: { id: testUserId, email: testEmail } },
        error: null,
      });

      // Act
      await service.changePassword(changePasswordCommand, userEmail);

      // Assert - verify the order of calls
      const signInCallOrder = mockClient.auth.signInWithPassword.mock.invocationCallOrder[0];
      const updateCallOrder = mockClient.auth.updateUser.mock.invocationCallOrder[0];
      expect(signInCallOrder).toBeLessThan(updateCallOrder);
    });
  });

  describe("deleteAccount", () => {
    it("should delete account successfully", async () => {
      // Arrange
      mockSupabaseAdmin.rpc.mockResolvedValue({
        data: null,
        error: null,
      });

      mockAdminAuth.admin.deleteUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act
      const result = await service.deleteAccount(testUserId);

      // Assert
      expect(result).toEqual({
        message: "Account deleted successfully",
      });
      expect(mockSupabaseAdmin.rpc).toHaveBeenCalledWith("delete_user_account", {
        target_user_id: testUserId,
      });
      expect(mockAdminAuth.admin.deleteUser).toHaveBeenCalledWith(testUserId);
    });

    it("should throw error when RPC function fails", async () => {
      // Arrange
      mockSupabaseAdmin.rpc.mockResolvedValue({
        data: null,
        error: { message: "RPC function error", code: "P0001" },
      });

      // Act & Assert
      await expect(service.deleteAccount(testUserId)).rejects.toThrow("Failed to delete user data: RPC function error");

      // deleteUser should not be called
      expect(mockAdminAuth.admin.deleteUser).not.toHaveBeenCalled();
    });

    it("should throw error when deleting user from auth fails", async () => {
      // Arrange
      mockSupabaseAdmin.rpc.mockResolvedValue({
        data: null,
        error: null,
      });

      const deleteError = {
        message: "User not found",
        status: 404,
        code: "user_not_found",
      };

      mockAdminAuth.admin.deleteUser.mockResolvedValue({
        data: null,
        error: deleteError,
      });

      // Act & Assert
      await expect(service.deleteAccount(testUserId)).rejects.toEqual(deleteError);
    });

    it("should call RPC before deleting user", async () => {
      // Arrange
      mockSupabaseAdmin.rpc.mockResolvedValue({
        data: null,
        error: null,
      });

      mockAdminAuth.admin.deleteUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act
      await service.deleteAccount(testUserId);

      // Assert - verify the order of calls
      const rpcCallOrder = mockSupabaseAdmin.rpc.mock.invocationCallOrder[0];
      const deleteCallOrder = mockAdminAuth.admin.deleteUser.mock.invocationCallOrder[0];
      expect(rpcCallOrder).toBeLessThan(deleteCallOrder);
    });

    it("should handle foreign key constraint errors gracefully", async () => {
      // Arrange
      mockSupabaseAdmin.rpc.mockResolvedValue({
        data: null,
        error: { message: "violates foreign key constraint", code: "23503" },
      });

      // Act & Assert
      await expect(service.deleteAccount(testUserId)).rejects.toThrow(
        "Failed to delete user data: violates foreign key constraint"
      );
    });
  });
});

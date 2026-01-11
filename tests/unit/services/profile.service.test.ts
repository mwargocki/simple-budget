import { describe, it, expect, beforeEach } from "vitest";
import type { SupabaseClient } from "@/db/supabase.client";
import { ProfileService, ProfileNotFoundError } from "@/lib/services/profile.service";
import { createMockSupabaseClient, resetMockSupabaseClient, type MockSupabaseClient } from "../../mocks/supabase.mock";

describe("ProfileService", () => {
  let mockClient: MockSupabaseClient;
  let service: ProfileService;

  const testUserId = "550e8400-e29b-41d4-a716-446655440000";

  const testProfile = {
    id: testUserId,
    timezone: "Europe/Warsaw",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    service = new ProfileService(mockClient as unknown as SupabaseClient);
  });

  describe("getProfile", () => {
    it("should return profile when it exists", async () => {
      // Arrange
      mockClient._chain.single.mockResolvedValue({
        data: testProfile,
        error: null,
      });

      // Act
      const result = await service.getProfile(testUserId);

      // Assert
      expect(result).toEqual(testProfile);
      expect(mockClient.from).toHaveBeenCalledWith("profiles");
      expect(mockClient._chain.select).toHaveBeenCalledWith("id, timezone, created_at, updated_at");
      expect(mockClient._chain.eq).toHaveBeenCalledWith("id", testUserId);
      expect(mockClient._chain.single).toHaveBeenCalled();
    });

    it("should return null when profile does not exist (PGRST116)", async () => {
      // Arrange
      mockClient._chain.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows returned" },
      });

      // Act
      const result = await service.getProfile(testUserId);

      // Assert
      expect(result).toBeNull();
    });

    it("should propagate other Supabase errors", async () => {
      // Arrange
      const dbError = {
        code: "PGRST500",
        message: "Database connection error",
        details: "Connection refused",
      };
      mockClient._chain.single.mockResolvedValue({
        data: null,
        error: dbError,
      });

      // Act & Assert
      await expect(service.getProfile(testUserId)).rejects.toEqual(dbError);
    });

    it("should handle unexpected error codes", async () => {
      // Arrange
      const unexpectedError = {
        code: "42P01",
        message: "relation 'profiles' does not exist",
      };
      mockClient._chain.single.mockResolvedValue({
        data: null,
        error: unexpectedError,
      });

      // Act & Assert
      await expect(service.getProfile(testUserId)).rejects.toEqual(unexpectedError);
    });
  });

  describe("updateProfile", () => {
    const updateCommand = { timezone: "America/New_York" };

    const updatedProfile = {
      ...testProfile,
      timezone: "America/New_York",
      updated_at: "2024-01-02T00:00:00Z",
    };

    it("should update and return profile on success", async () => {
      // Arrange
      mockClient._chain.single.mockResolvedValue({
        data: updatedProfile,
        error: null,
      });

      // Act
      const result = await service.updateProfile(testUserId, updateCommand);

      // Assert
      expect(result).toEqual(updatedProfile);
      expect(mockClient.from).toHaveBeenCalledWith("profiles");
      expect(mockClient._chain.update).toHaveBeenCalledWith({ timezone: "America/New_York" });
      expect(mockClient._chain.eq).toHaveBeenCalledWith("id", testUserId);
      expect(mockClient._chain.select).toHaveBeenCalledWith("id, timezone, created_at, updated_at");
      expect(mockClient._chain.single).toHaveBeenCalled();
    });

    it("should throw ProfileNotFoundError when profile does not exist (PGRST116)", async () => {
      // Arrange
      mockClient._chain.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows returned" },
      });

      // Act & Assert
      await expect(service.updateProfile(testUserId, updateCommand)).rejects.toThrow(ProfileNotFoundError);
      await expect(service.updateProfile(testUserId, updateCommand)).rejects.toThrow("Profile not found");
    });

    it("should propagate other Supabase errors", async () => {
      // Arrange
      const dbError = {
        code: "23505",
        message: "duplicate key value violates unique constraint",
      };
      mockClient._chain.single.mockResolvedValue({
        data: null,
        error: dbError,
      });

      // Act & Assert
      await expect(service.updateProfile(testUserId, updateCommand)).rejects.toEqual(dbError);
    });

    it("should handle different timezone values", async () => {
      // Arrange
      const timezones = ["UTC", "Europe/London", "Asia/Tokyo", "Pacific/Auckland"];

      for (const timezone of timezones) {
        resetMockSupabaseClient(mockClient);
        const profileWithTz = { ...testProfile, timezone };
        mockClient._chain.single.mockResolvedValue({
          data: profileWithTz,
          error: null,
        });

        // Act
        const result = await service.updateProfile(testUserId, { timezone });

        // Assert
        expect(result.timezone).toBe(timezone);
        expect(mockClient._chain.update).toHaveBeenCalledWith({ timezone });
      }
    });
  });

  describe("ProfileNotFoundError", () => {
    it("should have correct name and message", () => {
      const error = new ProfileNotFoundError();

      expect(error.name).toBe("ProfileNotFoundError");
      expect(error.message).toBe("Profile not found");
      expect(error).toBeInstanceOf(Error);
    });
  });
});

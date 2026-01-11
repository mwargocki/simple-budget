import { describe, it, expect, beforeEach } from "vitest";
import type { APIContext } from "astro";
import { POST } from "@/pages/api/auth/register";
import {
  createMockAPIContext,
  parseJsonResponse,
  type MockAPIContext,
} from "../../helpers/astro-context.mock";
import type { MockSupabaseClient } from "../../../mocks/supabase.mock";
import type { RegisterResponseDTO, ErrorResponseDTO } from "@/types";

describe("POST /api/auth/register", () => {
  let context: MockAPIContext;
  let mockSupabase: MockSupabaseClient;

  const validRegisterData = {
    email: "test@example.com",
    password: "password123",
    passwordConfirm: "password123",
  };

  const testUserId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    const mock = createMockAPIContext({
      method: "POST",
      path: "/api/auth/register",
      body: validRegisterData,
    });
    context = mock.context;
    mockSupabase = mock.mockSupabase;
  });

  describe("Success cases", () => {
    it("should register a new user and return 201", async () => {
      // Arrange
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: { id: testUserId, email: validRegisterData.email },
          session: null,
        },
        error: null,
      });

      // Act
      const response = await POST(context as unknown as APIContext);
      const body = await parseJsonResponse<RegisterResponseDTO>(response);

      // Assert
      expect(response.status).toBe(201);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(body).toEqual({
        user: {
          id: testUserId,
          email: validRegisterData.email,
        },
      });
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: validRegisterData.email,
        password: validRegisterData.password,
      });
    });
  });

  describe("Validation errors (400)", () => {
    it("should return 400 when request body is empty", async () => {
      // Arrange
      const { context: emptyContext } = createMockAPIContext({
        method: "POST",
        path: "/api/auth/register",
        body: {},
      });

      // Act
      const response = await POST(emptyContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.message).toBe("Validation failed");
      expect(body.error.details).toBeDefined();
      expect(body.error.details!.length).toBeGreaterThan(0);
    });

    it("should return 400 when email is invalid", async () => {
      // Arrange
      const { context: invalidContext } = createMockAPIContext({
        method: "POST",
        path: "/api/auth/register",
        body: {
          email: "invalid-email",
          password: "password123",
          passwordConfirm: "password123",
        },
      });

      // Act
      const response = await POST(invalidContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.details).toContainEqual(
        expect.objectContaining({ field: "email" })
      );
    });

    it("should return 400 when password is too short", async () => {
      // Arrange
      const { context: shortPwdContext } = createMockAPIContext({
        method: "POST",
        path: "/api/auth/register",
        body: {
          email: "test@example.com",
          password: "short",
          passwordConfirm: "short",
        },
      });

      // Act
      const response = await POST(shortPwdContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.details).toContainEqual(
        expect.objectContaining({ field: "password" })
      );
    });

    it("should return 400 when passwords do not match", async () => {
      // Arrange
      const { context: mismatchContext } = createMockAPIContext({
        method: "POST",
        path: "/api/auth/register",
        body: {
          email: "test@example.com",
          password: "password123",
          passwordConfirm: "differentpassword",
        },
      });

      // Act
      const response = await POST(mismatchContext as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.details).toContainEqual(
        expect.objectContaining({ field: "passwordConfirm" })
      );
    });
  });

  describe("Conflict errors (409)", () => {
    it("should return 409 when email is already registered", async () => {
      // Arrange
      // Note: AuthService throws the Supabase error object directly.
      // The endpoint checks `error instanceof Error`, so we need to use
      // an actual Error instance with the expected message.
      const duplicateError = new Error("User already registered");
      mockSupabase.auth.signUp.mockRejectedValue(duplicateError);

      // Act
      const response = await POST(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(409);
      expect(body.error.code).toBe("CONFLICT");
      expect(body.error.message).toBe("Email already registered");
    });
  });

  describe("Internal errors (500)", () => {
    it("should return 500 when user is null in response", async () => {
      // Arrange
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      // Act
      const response = await POST(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(500);
      expect(body.error.code).toBe("INTERNAL_ERROR");
      expect(body.error.message).toBe("An unexpected error occurred");
    });

    it("should return 500 when Supabase throws unexpected error", async () => {
      // Arrange
      mockSupabase.auth.signUp.mockRejectedValue(new Error("Network error"));

      // Act
      const response = await POST(context as unknown as APIContext);
      const body = await parseJsonResponse<ErrorResponseDTO>(response);

      // Assert
      expect(response.status).toBe(500);
      expect(body.error.code).toBe("INTERNAL_ERROR");
    });

    it("should return 500 when user email is missing in response", async () => {
      // Arrange
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: { id: testUserId, email: null },
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

import type { APIRoute } from "astro";
import { AuthApiError } from "@supabase/supabase-js";
import { changePasswordSchema } from "../../../lib/schemas/auth.schema";
import { AuthService } from "../../../lib/services/auth.service";
import type { ChangePasswordResponseDTO, ErrorResponseDTO } from "../../../types";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Extract Authorization header
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "UNAUTHORIZED",
          message: "No valid session",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Validate token by getting user
    const {
      data: { user },
      error: userError,
    } = await locals.supabase.auth.getUser(token);

    if (userError || !user || !user.email) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "UNAUTHORIZED",
          message: "No valid session",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse and validate request body
    const body = await request.json();

    const validation = changePasswordSchema.safeParse(body);
    if (!validation.success) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: validation.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Change password
    const authService = new AuthService(locals.supabase);
    const result: ChangePasswordResponseDTO = await authService.changePassword(validation.data, user.email);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Auth errors from signInWithPassword → incorrect current password
    if (error instanceof AuthApiError) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "UNAUTHORIZED",
          message: "Current password is incorrect",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const errorResponse: ErrorResponseDTO = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

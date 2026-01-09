import type { APIRoute } from "astro";
import { AuthApiError } from "@supabase/supabase-js";
import { loginSchema } from "../../../lib/schemas/auth.schema";
import { AuthService } from "../../../lib/services/auth.service";
import type { LoginResponseDTO, ErrorResponseDTO } from "../../../types";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();

    const validation = loginSchema.safeParse(body);
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

    const authService = new AuthService(locals.supabase);
    const result: LoginResponseDTO = await authService.login(validation.data);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Auth errors → 401 with generic message (prevents user enumeration)
    if (error instanceof AuthApiError) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
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

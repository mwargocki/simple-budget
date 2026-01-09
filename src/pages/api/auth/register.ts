import type { APIRoute } from "astro";
import { registerSchema } from "../../../lib/schemas/auth.schema";
import { AuthService } from "../../../lib/services/auth.service";
import type { RegisterResponseDTO, ErrorResponseDTO } from "../../../types";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();

    const validation = registerSchema.safeParse(body);
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
    const result: RegisterResponseDTO = await authService.register(validation.data);

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("already registered")) {
        const errorResponse: ErrorResponseDTO = {
          error: {
            code: "CONFLICT",
            message: "Email already registered",
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        });
      }
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

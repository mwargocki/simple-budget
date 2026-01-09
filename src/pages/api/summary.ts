import type { APIRoute } from "astro";
import { createSupabaseClientWithAuth } from "../../db/supabase.client";
import { SummaryService } from "../../lib/services/summary.service";
import { summaryQuerySchema } from "../../lib/schemas/summary.schema";
import type { MonthlySummaryDTO, ErrorResponseDTO } from "../../types";

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Extract and validate Authorization header
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

    const token = authHeader.substring(7);

    // 2. Validate token by getting user
    const {
      data: { user },
      error: authError,
    } = await locals.supabase.auth.getUser(token);

    if (authError || !user) {
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

    // 3. Parse query params from URL
    const url = new URL(request.url);
    const queryParams = {
      month: url.searchParams.get("month") ?? undefined,
    };

    // 4. Validate query params with Zod schema
    const validationResult = summaryQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid month format. Use YYYY-MM",
          details: validationResult.error.errors.map((err) => ({
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

    // 5. Get monthly summary
    const supabaseWithAuth = createSupabaseClientWithAuth(token);
    const summaryService = new SummaryService(supabaseWithAuth);
    const result: MonthlySummaryDTO = await summaryService.getMonthlySummary(validationResult.data.month, user.id);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
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

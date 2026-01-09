import type { APIRoute } from "astro";
import { createSupabaseClientWithAuth } from "../../db/supabase.client";
import { ProfileService, ProfileNotFoundError } from "../../lib/services/profile.service";
import { updateProfileSchema } from "../../lib/schemas/profile.schema";
import type { ProfileDTO, ErrorResponseDTO, ErrorDetailDTO } from "../../types";

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

    // 3. Get user profile
    const supabaseWithAuth = createSupabaseClientWithAuth(token);
    const profileService = new ProfileService(supabaseWithAuth);
    const profile: ProfileDTO | null = await profileService.getProfile(user.id);

    if (!profile) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "NOT_FOUND",
          message: "Profile not found",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(profile), {
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

export const PATCH: APIRoute = async ({ request, locals }) => {
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

    // 3. Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid JSON body",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const parseResult = updateProfileSchema.safeParse(body);

    if (!parseResult.success) {
      const details: ErrorDetailDTO[] = parseResult.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. Update profile
    const supabaseWithAuth = createSupabaseClientWithAuth(token);
    const profileService = new ProfileService(supabaseWithAuth);
    const profile: ProfileDTO = await profileService.updateProfile(user.id, parseResult.data);

    return new Response(JSON.stringify(profile), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof ProfileNotFoundError) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "NOT_FOUND",
          message: "Profile not found",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
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

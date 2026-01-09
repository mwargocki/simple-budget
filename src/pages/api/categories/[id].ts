import type { APIRoute } from "astro";
import type { PostgrestError } from "@supabase/supabase-js";
import { createSupabaseClientWithAuth } from "../../../db/supabase.client";
import { CategoryService, CategoryNotFoundError, SystemCategoryError } from "../../../lib/services/category.service";
import { updateCategorySchema, categoryIdSchema } from "../../../lib/schemas/category.schema";
import type { CategoryDTO, ErrorResponseDTO, DeleteCategoryResponseDTO } from "../../../types";

export const prerender = false;

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    // 1. Validate Authorization header
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

    // 2. Verify token
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

    // 3. Validate path parameter {id}
    const idValidation = categoryIdSchema.safeParse(params.id);

    if (!idValidation.success) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: [{ field: "id", message: "Invalid category ID format" }],
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: [{ field: "body", message: "Invalid JSON body" }],
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 5. Validate body with Zod schema
    const validationResult = updateCategorySchema.safeParse(body);

    if (!validationResult.success) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
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

    // 6. Update category
    const supabaseWithAuth = createSupabaseClientWithAuth(token);
    const categoryService = new CategoryService(supabaseWithAuth);
    const result: CategoryDTO = await categoryService.updateCategory(idValidation.data, validationResult.data, user.id);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle error: category not found
    if (error instanceof CategoryNotFoundError) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "NOT_FOUND",
          message: "Category not found",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle error: system category
    if (error instanceof SystemCategoryError) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "FORBIDDEN",
          message: "Cannot modify system category",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle error: duplicate name (unique constraint violation)
    if ((error as PostgrestError).code === "23505") {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "CONFLICT",
          message: "Category with this name already exists",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle unexpected errors
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

export const DELETE: APIRoute = async ({ params, request, locals }) => {
  try {
    // 1. Validate Authorization header
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

    // 2. Verify token
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

    // 3. Validate path parameter {id}
    const idValidation = categoryIdSchema.safeParse(params.id);

    if (!idValidation.success) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: [{ field: "id", message: "Invalid category ID format" }],
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. Delete category
    const supabaseWithAuth = createSupabaseClientWithAuth(token);
    const categoryService = new CategoryService(supabaseWithAuth);
    const result = await categoryService.deleteCategory(idValidation.data, user.id);

    const response: DeleteCategoryResponseDTO = {
      message: "Category deleted successfully",
      transactions_moved: result.transactions_moved,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle error: category not found
    if (error instanceof CategoryNotFoundError) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "NOT_FOUND",
          message: "Category not found",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle error: system category
    if (error instanceof SystemCategoryError) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "FORBIDDEN",
          message: "Cannot delete system category",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle unexpected errors
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

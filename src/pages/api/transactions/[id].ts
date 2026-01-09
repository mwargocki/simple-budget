import type { APIRoute } from "astro";
import { createSupabaseClientWithAuth } from "../../../db/supabase.client";
import {
  TransactionService,
  TransactionNotFoundError,
  CategoryNotFoundError,
} from "../../../lib/services/transaction.service";
import { transactionIdSchema, updateTransactionSchema } from "../../../lib/schemas/transaction.schema";
import type { TransactionDTO, ErrorResponseDTO, DeleteTransactionResponseDTO } from "../../../types";

export const prerender = false;

export const GET: APIRoute = async ({ params, request, locals }) => {
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

    const token = authHeader.substring(7); // Remove "Bearer " prefix

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

    // 3. Validate transaction ID parameter
    const idValidation = transactionIdSchema.safeParse(params.id);

    if (!idValidation.success) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid transaction ID format",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. Fetch transaction
    const supabaseWithAuth = createSupabaseClientWithAuth(token);
    const transactionService = new TransactionService(supabaseWithAuth);
    const result: TransactionDTO = await transactionService.getTransactionById(idValidation.data, user.id);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle TransactionNotFoundError
    if (error instanceof TransactionNotFoundError) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "NOT_FOUND",
          message: "Transaction not found",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
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

export const PATCH: APIRoute = async ({ params, request, locals }) => {
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

    // 3. Validate transaction ID parameter
    const idValidation = transactionIdSchema.safeParse(params.id);

    if (!idValidation.success) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid transaction ID format",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. Parse and validate request body
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

    const bodyValidation = updateTransactionSchema.safeParse(body);

    if (!bodyValidation.success) {
      const firstError = bodyValidation.error.errors[0];
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "VALIDATION_ERROR",
          message: firstError.message,
          details: bodyValidation.error.errors.map((err) => ({
            field: err.path.join(".") || "body",
            message: err.message,
          })),
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 5. Update transaction
    const supabaseWithAuth = createSupabaseClientWithAuth(token);
    const transactionService = new TransactionService(supabaseWithAuth);
    const result: TransactionDTO = await transactionService.updateTransaction(
      idValidation.data,
      bodyValidation.data,
      user.id
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle TransactionNotFoundError
    if (error instanceof TransactionNotFoundError) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "NOT_FOUND",
          message: "Transaction not found",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle CategoryNotFoundError
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

    // 3. Validate transaction ID parameter
    const idValidation = transactionIdSchema.safeParse(params.id);

    if (!idValidation.success) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid transaction ID format",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. Delete transaction
    const supabaseWithAuth = createSupabaseClientWithAuth(token);
    const transactionService = new TransactionService(supabaseWithAuth);
    await transactionService.deleteTransaction(idValidation.data, user.id);

    // 5. Return success response
    const response: DeleteTransactionResponseDTO = {
      message: "Transaction deleted successfully",
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle TransactionNotFoundError
    if (error instanceof TransactionNotFoundError) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "NOT_FOUND",
          message: "Transaction not found",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
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

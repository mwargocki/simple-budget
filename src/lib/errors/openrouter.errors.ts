import type { OpenRouterErrorCode } from "../../types/openrouter.types";

/**
 * Base error class for OpenRouter API errors
 */
export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly code: OpenRouterErrorCode,
    public readonly statusCode?: number,
    public readonly metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

/**
 * Error thrown when API authentication fails (401)
 */
export class OpenRouterAuthError extends OpenRouterError {
  constructor(message = "Invalid API key") {
    super(message, "UNAUTHORIZED", 401);
    this.name = "OpenRouterAuthError";
  }
}

/**
 * Error thrown when rate limit is exceeded (429)
 */
export class OpenRouterRateLimitError extends OpenRouterError {
  constructor(
    message: string,
    public readonly retryAfter?: number
  ) {
    super(message, "RATE_LIMITED", 429);
    this.name = "OpenRouterRateLimitError";
  }
}

/**
 * Error thrown when JSON schema validation fails
 */
export class OpenRouterSchemaError extends OpenRouterError {
  constructor(
    message: string,
    public readonly receivedData: unknown
  ) {
    super(message, "SCHEMA_VALIDATION");
    this.name = "OpenRouterSchemaError";
  }
}

/**
 * Error thrown when content is blocked by moderation (403)
 */
export class OpenRouterModerationError extends OpenRouterError {
  constructor(
    message: string,
    public readonly flaggedInput?: string,
    public readonly reasons?: string[]
  ) {
    super(message, "CONTENT_MODERATED", 403, { flaggedInput, reasons });
    this.name = "OpenRouterModerationError";
  }
}

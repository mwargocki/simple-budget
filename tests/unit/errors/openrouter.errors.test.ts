import { describe, it, expect } from "vitest";
import {
  OpenRouterError,
  OpenRouterAuthError,
  OpenRouterRateLimitError,
  OpenRouterSchemaError,
  OpenRouterModerationError,
} from "@/lib/errors/openrouter.errors";

describe("OpenRouterError", () => {
  it("should set message correctly", () => {
    const error = new OpenRouterError("Test error message", "UNKNOWN");

    expect(error.message).toBe("Test error message");
  });

  it("should set code correctly", () => {
    const error = new OpenRouterError("Test error", "NETWORK_ERROR");

    expect(error.code).toBe("NETWORK_ERROR");
  });

  it("should set statusCode when provided", () => {
    const error = new OpenRouterError("Test error", "PROVIDER_ERROR", 500);

    expect(error.statusCode).toBe(500);
  });

  it("should have undefined statusCode when not provided", () => {
    const error = new OpenRouterError("Test error", "UNKNOWN");

    expect(error.statusCode).toBeUndefined();
  });

  it("should set metadata when provided", () => {
    const metadata = { requestId: "123", model: "gpt-4" };
    const error = new OpenRouterError("Test error", "UNKNOWN", 500, metadata);

    expect(error.metadata).toEqual(metadata);
  });

  it("should have undefined metadata when not provided", () => {
    const error = new OpenRouterError("Test error", "UNKNOWN");

    expect(error.metadata).toBeUndefined();
  });

  it("should set name to OpenRouterError", () => {
    const error = new OpenRouterError("Test error", "UNKNOWN");

    expect(error.name).toBe("OpenRouterError");
  });

  it("should be instance of Error", () => {
    const error = new OpenRouterError("Test error", "UNKNOWN");

    expect(error).toBeInstanceOf(Error);
  });

  it("should be instance of OpenRouterError", () => {
    const error = new OpenRouterError("Test error", "UNKNOWN");

    expect(error).toBeInstanceOf(OpenRouterError);
  });
});

describe("OpenRouterAuthError", () => {
  it("should use default message when none provided", () => {
    const error = new OpenRouterAuthError();

    expect(error.message).toBe("Invalid API key");
  });

  it("should use custom message when provided", () => {
    const error = new OpenRouterAuthError("Custom auth error message");

    expect(error.message).toBe("Custom auth error message");
  });

  it("should set code to UNAUTHORIZED", () => {
    const error = new OpenRouterAuthError();

    expect(error.code).toBe("UNAUTHORIZED");
  });

  it("should set statusCode to 401", () => {
    const error = new OpenRouterAuthError();

    expect(error.statusCode).toBe(401);
  });

  it("should set name to OpenRouterAuthError", () => {
    const error = new OpenRouterAuthError();

    expect(error.name).toBe("OpenRouterAuthError");
  });

  it("should be instance of OpenRouterError", () => {
    const error = new OpenRouterAuthError();

    expect(error).toBeInstanceOf(OpenRouterError);
  });

  it("should be instance of Error", () => {
    const error = new OpenRouterAuthError();

    expect(error).toBeInstanceOf(Error);
  });
});

describe("OpenRouterRateLimitError", () => {
  it("should set message correctly", () => {
    const error = new OpenRouterRateLimitError("Rate limit exceeded");

    expect(error.message).toBe("Rate limit exceeded");
  });

  it("should set code to RATE_LIMITED", () => {
    const error = new OpenRouterRateLimitError("Rate limit exceeded");

    expect(error.code).toBe("RATE_LIMITED");
  });

  it("should set statusCode to 429", () => {
    const error = new OpenRouterRateLimitError("Rate limit exceeded");

    expect(error.statusCode).toBe(429);
  });

  it("should set retryAfter when provided", () => {
    const error = new OpenRouterRateLimitError("Rate limit exceeded", 60);

    expect(error.retryAfter).toBe(60);
  });

  it("should have undefined retryAfter when not provided", () => {
    const error = new OpenRouterRateLimitError("Rate limit exceeded");

    expect(error.retryAfter).toBeUndefined();
  });

  it("should set name to OpenRouterRateLimitError", () => {
    const error = new OpenRouterRateLimitError("Rate limit exceeded");

    expect(error.name).toBe("OpenRouterRateLimitError");
  });

  it("should be instance of OpenRouterError", () => {
    const error = new OpenRouterRateLimitError("Rate limit exceeded");

    expect(error).toBeInstanceOf(OpenRouterError);
  });
});

describe("OpenRouterSchemaError", () => {
  it("should set message correctly", () => {
    const error = new OpenRouterSchemaError("Invalid JSON response", null);

    expect(error.message).toBe("Invalid JSON response");
  });

  it("should set code to SCHEMA_VALIDATION", () => {
    const error = new OpenRouterSchemaError("Invalid schema", null);

    expect(error.code).toBe("SCHEMA_VALIDATION");
  });

  it("should not set statusCode", () => {
    const error = new OpenRouterSchemaError("Invalid schema", null);

    expect(error.statusCode).toBeUndefined();
  });

  it("should set receivedData with null value", () => {
    const error = new OpenRouterSchemaError("Invalid schema", null);

    expect(error.receivedData).toBeNull();
  });

  it("should set receivedData with string value", () => {
    const error = new OpenRouterSchemaError("Invalid schema", "invalid json string");

    expect(error.receivedData).toBe("invalid json string");
  });

  it("should set receivedData with object value", () => {
    const receivedData = { partial: "data", missing: undefined };
    const error = new OpenRouterSchemaError("Invalid schema", receivedData);

    expect(error.receivedData).toEqual(receivedData);
  });

  it("should set receivedData with array value", () => {
    const receivedData = [1, 2, 3];
    const error = new OpenRouterSchemaError("Invalid schema", receivedData);

    expect(error.receivedData).toEqual(receivedData);
  });

  it("should set name to OpenRouterSchemaError", () => {
    const error = new OpenRouterSchemaError("Invalid schema", null);

    expect(error.name).toBe("OpenRouterSchemaError");
  });

  it("should be instance of OpenRouterError", () => {
    const error = new OpenRouterSchemaError("Invalid schema", null);

    expect(error).toBeInstanceOf(OpenRouterError);
  });
});

describe("OpenRouterModerationError", () => {
  it("should set message correctly", () => {
    const error = new OpenRouterModerationError("Content blocked");

    expect(error.message).toBe("Content blocked");
  });

  it("should set code to CONTENT_MODERATED", () => {
    const error = new OpenRouterModerationError("Content blocked");

    expect(error.code).toBe("CONTENT_MODERATED");
  });

  it("should set statusCode to 403", () => {
    const error = new OpenRouterModerationError("Content blocked");

    expect(error.statusCode).toBe(403);
  });

  it("should set flaggedInput when provided", () => {
    const error = new OpenRouterModerationError("Content blocked", "inappropriate content");

    expect(error.flaggedInput).toBe("inappropriate content");
  });

  it("should have undefined flaggedInput when not provided", () => {
    const error = new OpenRouterModerationError("Content blocked");

    expect(error.flaggedInput).toBeUndefined();
  });

  it("should set reasons when provided", () => {
    const reasons = ["violence", "hate_speech"];
    const error = new OpenRouterModerationError("Content blocked", "bad input", reasons);

    expect(error.reasons).toEqual(reasons);
  });

  it("should have undefined reasons when not provided", () => {
    const error = new OpenRouterModerationError("Content blocked");

    expect(error.reasons).toBeUndefined();
  });

  it("should include flaggedInput and reasons in metadata", () => {
    const flaggedInput = "some bad text";
    const reasons = ["spam", "harassment"];
    const error = new OpenRouterModerationError("Content blocked", flaggedInput, reasons);

    expect(error.metadata).toEqual({
      flaggedInput: "some bad text",
      reasons: ["spam", "harassment"],
    });
  });

  it("should have metadata with undefined values when optional params not provided", () => {
    const error = new OpenRouterModerationError("Content blocked");

    expect(error.metadata).toEqual({
      flaggedInput: undefined,
      reasons: undefined,
    });
  });

  it("should set name to OpenRouterModerationError", () => {
    const error = new OpenRouterModerationError("Content blocked");

    expect(error.name).toBe("OpenRouterModerationError");
  });

  it("should be instance of OpenRouterError", () => {
    const error = new OpenRouterModerationError("Content blocked");

    expect(error).toBeInstanceOf(OpenRouterError);
  });

  it("should be instance of Error", () => {
    const error = new OpenRouterModerationError("Content blocked");

    expect(error).toBeInstanceOf(Error);
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { OpenRouterService } from "@/lib/services/openrouter.service";
import {
  OpenRouterError,
  OpenRouterAuthError,
  OpenRouterRateLimitError,
  OpenRouterSchemaError,
  OpenRouterModerationError,
} from "@/lib/errors/openrouter.errors";
import type { OpenRouterConfig, ChatOptions, OpenRouterApiResponse } from "@/types/openrouter.types";

describe("OpenRouterService", () => {
  const validApiKey = "sk-or-test-api-key-12345";

  const defaultConfig: OpenRouterConfig = {
    apiKey: validApiKey,
  };

  const validChatOptions: ChatOptions = {
    messages: [{ role: "user", content: "Hello, world!" }],
  };

  const mockSuccessApiResponse: OpenRouterApiResponse = {
    id: "gen-123456",
    model: "openai/gpt-4o-mini",
    choices: [
      {
        message: {
          role: "assistant",
          content: "Hello! How can I help you today?",
        },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 8,
      total_tokens: 18,
    },
  };

  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  // ============================================================================
  // Constructor Tests
  // ============================================================================

  describe("constructor", () => {
    it("should throw OpenRouterAuthError when API key is missing", () => {
      // Act & Assert
      expect(() => new OpenRouterService({ apiKey: "" })).toThrow(OpenRouterAuthError);
      expect(() => new OpenRouterService({ apiKey: "" })).toThrow("API key is required");
    });

    it("should throw OpenRouterAuthError when API key is undefined", () => {
      // Act & Assert
      expect(() => new OpenRouterService({ apiKey: undefined as unknown as string })).toThrow(OpenRouterAuthError);
    });

    it("should create service with valid API key", () => {
      // Act
      const service = new OpenRouterService(defaultConfig);

      // Assert
      expect(service).toBeInstanceOf(OpenRouterService);
    });

    it("should use default values when optional config is not provided", async () => {
      // Arrange
      const service = new OpenRouterService({ apiKey: validApiKey });

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockSuccessApiResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      // Act
      await service.chat(validChatOptions);

      // Assert
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.model).toBe("openai/gpt-4o-mini"); // default model
      expect(requestBody.temperature).toBe(1.0); // default temperature
      expect(requestBody.max_tokens).toBe(4096); // default maxTokens
    });

    it("should use custom config values when provided", async () => {
      // Arrange
      const customConfig: OpenRouterConfig = {
        apiKey: validApiKey,
        defaultModel: "anthropic/claude-3-opus",
        defaultTemperature: 0.7,
        defaultMaxTokens: 2048,
        siteUrl: "https://example.com",
        siteName: "TestApp",
        timeout: 60000,
      };

      const service = new OpenRouterService(customConfig);

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockSuccessApiResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      // Act
      await service.chat(validChatOptions);

      // Assert
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      const headers = fetchCall[1].headers;

      expect(requestBody.model).toBe("anthropic/claude-3-opus");
      expect(requestBody.temperature).toBe(0.7);
      expect(requestBody.max_tokens).toBe(2048);
      expect(headers["HTTP-Referer"]).toBe("https://example.com");
      expect(headers["X-Title"]).toBe("TestApp");
    });

    it("should set Authorization header with Bearer token", async () => {
      // Arrange
      const service = new OpenRouterService(defaultConfig);

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockSuccessApiResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      // Act
      await service.chat(validChatOptions);

      // Assert
      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1].headers;

      expect(headers.Authorization).toBe(`Bearer ${validApiKey}`);
      expect(headers["Content-Type"]).toBe("application/json");
    });
  });

  // ============================================================================
  // chat() Tests
  // ============================================================================

  describe("chat", () => {
    let service: OpenRouterService;

    beforeEach(() => {
      service = new OpenRouterService(defaultConfig);
    });

    describe("success cases", () => {
      it("should return ChatResponse on successful API call", async () => {
        // Arrange
        mockFetch.mockResolvedValue(
          new Response(JSON.stringify(mockSuccessApiResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );

        // Act
        const result = await service.chat(validChatOptions);

        // Assert
        expect(result).toEqual({
          id: "gen-123456",
          content: "Hello! How can I help you today?",
          model: "openai/gpt-4o-mini",
          finishReason: "stop",
          usage: {
            promptTokens: 10,
            completionTokens: 8,
            totalTokens: 18,
          },
        });
      });

      it("should send correct request body with messages", async () => {
        // Arrange
        const options: ChatOptions = {
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: "Hello!" },
          ],
        };

        mockFetch.mockResolvedValue(
          new Response(JSON.stringify(mockSuccessApiResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );

        // Act
        await service.chat(options);

        // Assert
        const fetchCall = mockFetch.mock.calls[0];
        const requestBody = JSON.parse(fetchCall[1].body);

        expect(requestBody.messages).toEqual(options.messages);
        expect(requestBody.stream).toBe(false);
      });

      it("should use custom model when provided in options", async () => {
        // Arrange
        const options: ChatOptions = {
          messages: [{ role: "user", content: "Test" }],
          model: "openai/gpt-4",
        };

        mockFetch.mockResolvedValue(
          new Response(JSON.stringify(mockSuccessApiResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );

        // Act
        await service.chat(options);

        // Assert
        const fetchCall = mockFetch.mock.calls[0];
        const requestBody = JSON.parse(fetchCall[1].body);

        expect(requestBody.model).toBe("openai/gpt-4");
      });

      it("should use custom temperature when provided in options", async () => {
        // Arrange
        const options: ChatOptions = {
          messages: [{ role: "user", content: "Test" }],
          temperature: 0.5,
        };

        mockFetch.mockResolvedValue(
          new Response(JSON.stringify(mockSuccessApiResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );

        // Act
        await service.chat(options);

        // Assert
        const fetchCall = mockFetch.mock.calls[0];
        const requestBody = JSON.parse(fetchCall[1].body);

        expect(requestBody.temperature).toBe(0.5);
      });

      it("should use custom maxTokens when provided in options", async () => {
        // Arrange
        const options: ChatOptions = {
          messages: [{ role: "user", content: "Test" }],
          maxTokens: 1000,
        };

        mockFetch.mockResolvedValue(
          new Response(JSON.stringify(mockSuccessApiResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );

        // Act
        await service.chat(options);

        // Assert
        const fetchCall = mockFetch.mock.calls[0];
        const requestBody = JSON.parse(fetchCall[1].body);

        expect(requestBody.max_tokens).toBe(1000);
      });

      it("should include topP when provided", async () => {
        // Arrange
        const options: ChatOptions = {
          messages: [{ role: "user", content: "Test" }],
          topP: 0.9,
        };

        mockFetch.mockResolvedValue(
          new Response(JSON.stringify(mockSuccessApiResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );

        // Act
        await service.chat(options);

        // Assert
        const fetchCall = mockFetch.mock.calls[0];
        const requestBody = JSON.parse(fetchCall[1].body);

        expect(requestBody.top_p).toBe(0.9);
      });

      it("should handle response with missing usage data", async () => {
        // Arrange
        const responseWithoutUsage = {
          ...mockSuccessApiResponse,
          usage: undefined,
        };

        mockFetch.mockResolvedValue(
          new Response(JSON.stringify(responseWithoutUsage), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );

        // Act
        const result = await service.chat(validChatOptions);

        // Assert
        expect(result.usage).toEqual({
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        });
      });

      it("should handle response with empty content", async () => {
        // Arrange
        const responseWithEmptyContent = {
          ...mockSuccessApiResponse,
          choices: [
            {
              message: { role: "assistant", content: "" },
              finish_reason: "stop",
            },
          ],
        };

        mockFetch.mockResolvedValue(
          new Response(JSON.stringify(responseWithEmptyContent), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );

        // Act
        const result = await service.chat(validChatOptions);

        // Assert
        expect(result.content).toBe("");
      });

      it("should normalize unknown finish_reason to 'stop'", async () => {
        // Arrange
        const responseWithUnknownFinishReason = {
          ...mockSuccessApiResponse,
          choices: [
            {
              message: { role: "assistant", content: "Test" },
              finish_reason: "unknown_reason",
            },
          ],
        };

        mockFetch.mockResolvedValue(
          new Response(JSON.stringify(responseWithUnknownFinishReason), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );

        // Act
        const result = await service.chat(validChatOptions);

        // Assert
        expect(result.finishReason).toBe("stop");
      });

      it("should preserve valid finish_reason values", async () => {
        // Arrange
        const finishReasons = ["stop", "length", "tool_calls", "content_filter", "error"];

        for (const reason of finishReasons) {
          const response = {
            ...mockSuccessApiResponse,
            choices: [
              {
                message: { role: "assistant", content: "Test" },
                finish_reason: reason,
              },
            ],
          };

          mockFetch.mockResolvedValueOnce(
            new Response(JSON.stringify(response), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            })
          );

          // Act
          const result = await service.chat(validChatOptions);

          // Assert
          expect(result.finishReason).toBe(reason);
        }
      });
    });

    describe("HTTP error handling", () => {
      it("should throw OpenRouterAuthError on 401 response", async () => {
        // Arrange
        const errorResponse = {
          error: {
            code: 401,
            message: "Invalid API key provided",
          },
        };

        mockFetch.mockImplementation(
          () =>
            new Response(JSON.stringify(errorResponse), {
              status: 401,
              statusText: "Unauthorized",
              headers: { "Content-Type": "application/json" },
            })
        );

        // Act & Assert
        try {
          await service.chat(validChatOptions);
          expect.fail("Should have thrown OpenRouterAuthError");
        } catch (error) {
          expect(error).toBeInstanceOf(OpenRouterAuthError);
          expect((error as OpenRouterAuthError).message).toBe("Invalid API key provided");
          expect((error as OpenRouterAuthError).statusCode).toBe(401);
        }
      });

      it("should throw OpenRouterRateLimitError on 429 response", async () => {
        // Arrange
        const errorResponse = {
          error: {
            code: 429,
            message: "Rate limit exceeded. Please retry after 60 seconds.",
          },
        };

        mockFetch.mockImplementation(
          () =>
            new Response(JSON.stringify(errorResponse), {
              status: 429,
              statusText: "Too Many Requests",
              headers: { "Content-Type": "application/json" },
            })
        );

        // Act & Assert
        try {
          await service.chat(validChatOptions);
          expect.fail("Should have thrown OpenRouterRateLimitError");
        } catch (error) {
          expect(error).toBeInstanceOf(OpenRouterRateLimitError);
          expect((error as OpenRouterRateLimitError).message).toContain("Rate limit exceeded");
          expect((error as OpenRouterRateLimitError).statusCode).toBe(429);
        }
      });

      it("should throw OpenRouterModerationError on 403 response", async () => {
        // Arrange
        const errorResponse = {
          error: {
            code: 403,
            message: "Content blocked by moderation",
            metadata: {
              flagged_input: "inappropriate content",
              reasons: ["violence", "hate"],
            },
          },
        };

        mockFetch.mockImplementation(
          () =>
            new Response(JSON.stringify(errorResponse), {
              status: 403,
              statusText: "Forbidden",
              headers: { "Content-Type": "application/json" },
            })
        );

        // Act & Assert
        try {
          await service.chat(validChatOptions);
          expect.fail("Should have thrown OpenRouterModerationError");
        } catch (error) {
          expect(error).toBeInstanceOf(OpenRouterModerationError);
          const moderationError = error as OpenRouterModerationError;
          expect(moderationError.message).toBe("Content blocked by moderation");
          expect(moderationError.flaggedInput).toBe("inappropriate content");
          expect(moderationError.reasons).toEqual(["violence", "hate"]);
        }
      });

      it("should throw OpenRouterError with INSUFFICIENT_CREDITS on 402 response", async () => {
        // Arrange
        const errorResponse = {
          error: {
            code: 402,
            message: "Insufficient credits",
          },
        };

        mockFetch.mockResolvedValue(
          new Response(JSON.stringify(errorResponse), {
            status: 402,
            statusText: "Payment Required",
            headers: { "Content-Type": "application/json" },
          })
        );

        // Act & Assert
        await expect(service.chat(validChatOptions)).rejects.toThrow(OpenRouterError);

        try {
          await service.chat(validChatOptions);
        } catch (error) {
          expect(error).toBeInstanceOf(OpenRouterError);
          expect((error as OpenRouterError).code).toBe("INSUFFICIENT_CREDITS");
          expect((error as OpenRouterError).statusCode).toBe(402);
        }
      });

      it("should throw OpenRouterError with PROVIDER_ERROR on 502 response", async () => {
        // Arrange
        mockFetch.mockResolvedValue(
          new Response(JSON.stringify({ error: { message: "Bad gateway" } }), {
            status: 502,
            statusText: "Bad Gateway",
            headers: { "Content-Type": "application/json" },
          })
        );

        // Act & Assert
        try {
          await service.chat(validChatOptions);
          expect.fail("Should have thrown an error");
        } catch (error) {
          expect(error).toBeInstanceOf(OpenRouterError);
          expect((error as OpenRouterError).code).toBe("PROVIDER_ERROR");
          expect((error as OpenRouterError).statusCode).toBe(502);
        }
      });

      it("should throw OpenRouterError with SERVICE_UNAVAILABLE on 503 response", async () => {
        // Arrange
        mockFetch.mockResolvedValue(
          new Response(JSON.stringify({ error: { message: "Service unavailable" } }), {
            status: 503,
            statusText: "Service Unavailable",
            headers: { "Content-Type": "application/json" },
          })
        );

        // Act & Assert
        try {
          await service.chat(validChatOptions);
          expect.fail("Should have thrown an error");
        } catch (error) {
          expect(error).toBeInstanceOf(OpenRouterError);
          expect((error as OpenRouterError).code).toBe("SERVICE_UNAVAILABLE");
          expect((error as OpenRouterError).statusCode).toBe(503);
        }
      });

      it("should throw OpenRouterError with INVALID_REQUEST on 4xx errors", async () => {
        // Arrange
        mockFetch.mockResolvedValue(
          new Response(JSON.stringify({ error: { message: "Bad request" } }), {
            status: 400,
            statusText: "Bad Request",
            headers: { "Content-Type": "application/json" },
          })
        );

        // Act & Assert
        try {
          await service.chat(validChatOptions);
          expect.fail("Should have thrown an error");
        } catch (error) {
          expect(error).toBeInstanceOf(OpenRouterError);
          expect((error as OpenRouterError).code).toBe("INVALID_REQUEST");
        }
      });

      it("should throw OpenRouterError with UNKNOWN on 5xx errors (not 502/503)", async () => {
        // Arrange
        mockFetch.mockResolvedValue(
          new Response(JSON.stringify({ error: { message: "Internal server error" } }), {
            status: 500,
            statusText: "Internal Server Error",
            headers: { "Content-Type": "application/json" },
          })
        );

        // Act & Assert
        try {
          await service.chat(validChatOptions);
          expect.fail("Should have thrown an error");
        } catch (error) {
          expect(error).toBeInstanceOf(OpenRouterError);
          expect((error as OpenRouterError).code).toBe("UNKNOWN");
        }
      });

      it("should use statusText when error JSON is unparseable", async () => {
        // Arrange
        mockFetch.mockResolvedValue(
          new Response("Invalid JSON", {
            status: 500,
            statusText: "Internal Server Error",
            headers: { "Content-Type": "text/plain" },
          })
        );

        // Act & Assert
        await expect(service.chat(validChatOptions)).rejects.toThrow("Internal Server Error");
      });
    });

    describe("timeout handling", () => {
      it("should throw OpenRouterError with TIMEOUT code on request timeout", async () => {
        // Arrange
        const shortTimeoutService = new OpenRouterService({
          apiKey: validApiKey,
          timeout: 100, // 100ms timeout
        });

        const abortError = new Error("The operation was aborted");
        abortError.name = "AbortError";
        mockFetch.mockRejectedValue(abortError);

        // Act & Assert
        try {
          await shortTimeoutService.chat(validChatOptions);
          expect.fail("Should have thrown an error");
        } catch (error) {
          expect(error).toBeInstanceOf(OpenRouterError);
          expect((error as OpenRouterError).code).toBe("TIMEOUT");
          expect((error as OpenRouterError).statusCode).toBe(408);
          expect((error as OpenRouterError).message).toBe("Request timeout");
        }
      });

      it("should throw OpenRouterError with NETWORK_ERROR on network failure", async () => {
        // Arrange
        mockFetch.mockRejectedValue(new Error("Network request failed"));

        // Act & Assert
        try {
          await service.chat(validChatOptions);
          expect.fail("Should have thrown an error");
        } catch (error) {
          expect(error).toBeInstanceOf(OpenRouterError);
          expect((error as OpenRouterError).code).toBe("NETWORK_ERROR");
          expect((error as OpenRouterError).message).toBe("Network error");
        }
      });
    });

    describe("validation", () => {
      it("should throw error when messages array is empty", async () => {
        // Arrange
        const invalidOptions: ChatOptions = {
          messages: [],
        };

        // Act & Assert
        await expect(service.chat(invalidOptions)).rejects.toThrow();
      });

      it("should throw error when message content is empty", async () => {
        // Arrange
        const invalidOptions: ChatOptions = {
          messages: [{ role: "user", content: "" }],
        };

        // Act & Assert
        await expect(service.chat(invalidOptions)).rejects.toThrow();
      });

      it("should throw error when temperature is out of range", async () => {
        // Arrange
        const invalidOptions: ChatOptions = {
          messages: [{ role: "user", content: "Test" }],
          temperature: 3, // max is 2
        };

        // Act & Assert
        await expect(service.chat(invalidOptions)).rejects.toThrow();
      });
    });
  });

  // ============================================================================
  // chatWithSchema() Tests
  // ============================================================================

  describe("chatWithSchema", () => {
    let service: OpenRouterService;

    beforeEach(() => {
      service = new OpenRouterService(defaultConfig);
    });

    interface TestSchema {
      name: string;
      age: number;
    }

    const testSchema = {
      type: "object" as const,
      properties: {
        name: { type: "string" },
        age: { type: "number" },
      },
      required: ["name", "age"],
      additionalProperties: false,
    };

    it("should parse JSON response and return typed data", async () => {
      // Arrange
      const jsonContent = JSON.stringify({ name: "John", age: 30 });
      const apiResponse = {
        ...mockSuccessApiResponse,
        choices: [
          {
            message: { role: "assistant", content: jsonContent },
            finish_reason: "stop",
          },
        ],
      };

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(apiResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      // Act
      const result = await service.chatWithSchema<TestSchema>({
        messages: [{ role: "user", content: "Generate a person" }],
        schema: testSchema,
        schemaName: "Person",
      });

      // Assert
      expect(result.data).toEqual({ name: "John", age: 30 });
      expect(result.rawContent).toBe(jsonContent);
      expect(result.id).toBe("gen-123456");
      expect(result.model).toBe("openai/gpt-4o-mini");
      expect(result.finishReason).toBe("stop");
      expect(result.usage).toBeDefined();
    });

    it("should include response_format in request body", async () => {
      // Arrange
      const jsonContent = JSON.stringify({ name: "Jane", age: 25 });
      const apiResponse = {
        ...mockSuccessApiResponse,
        choices: [
          {
            message: { role: "assistant", content: jsonContent },
            finish_reason: "stop",
          },
        ],
      };

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(apiResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      // Act
      const result = await service.chatWithSchema<TestSchema>({
        messages: [{ role: "user", content: "Generate a person" }],
        schema: testSchema,
        schemaName: "Person",
      });

      // Assert
      expect(result.data).toEqual({ name: "Jane", age: 25 });
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.messages).toEqual([{ role: "user", content: "Generate a person" }]);
      expect(requestBody.response_format).toEqual({
        type: "json_schema",
        json_schema: {
          name: "Person",
          strict: true,
          schema: testSchema,
        },
      });
    });

    it("should throw OpenRouterSchemaError when JSON parsing fails", async () => {
      // Arrange
      const invalidJsonContent = "This is not valid JSON {broken";
      const apiResponse = {
        ...mockSuccessApiResponse,
        choices: [
          {
            message: { role: "assistant", content: invalidJsonContent },
            finish_reason: "stop",
          },
        ],
      };

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(apiResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      // Act & Assert
      try {
        await service.chatWithSchema<TestSchema>({
          messages: [{ role: "user", content: "Generate a person" }],
          schema: testSchema,
          schemaName: "Person",
        });
        expect.fail("Should have thrown OpenRouterSchemaError");
      } catch (error) {
        expect(error).toBeInstanceOf(OpenRouterSchemaError);
        expect((error as OpenRouterSchemaError).message).toBe("Failed to parse JSON response");
        expect((error as OpenRouterSchemaError).receivedData).toBe(invalidJsonContent);
      }
    });

    it("should throw OpenRouterSchemaError when response is empty string", async () => {
      // Arrange
      const apiResponse = {
        ...mockSuccessApiResponse,
        choices: [
          {
            message: { role: "assistant", content: "" },
            finish_reason: "stop",
          },
        ],
      };

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(apiResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      // Act & Assert
      await expect(
        service.chatWithSchema<TestSchema>({
          messages: [{ role: "user", content: "Generate a person" }],
          schema: testSchema,
          schemaName: "Person",
        })
      ).rejects.toThrow(OpenRouterSchemaError);
    });

    it("should propagate HTTP errors from chat method", async () => {
      // Arrange
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "Unauthorized" } }), {
          status: 401,
          statusText: "Unauthorized",
          headers: { "Content-Type": "application/json" },
        })
      );

      // Act & Assert
      await expect(
        service.chatWithSchema<TestSchema>({
          messages: [{ role: "user", content: "Generate a person" }],
          schema: testSchema,
          schemaName: "Person",
        })
      ).rejects.toThrow(OpenRouterAuthError);
    });

    it("should handle complex nested JSON structures", async () => {
      // Arrange
      interface ComplexSchema {
        user: {
          name: string;
          contacts: { email: string; phone: string }[];
        };
      }

      const complexData: ComplexSchema = {
        user: {
          name: "John",
          contacts: [
            { email: "john@example.com", phone: "123456" },
            { email: "john2@example.com", phone: "789012" },
          ],
        },
      };

      const apiResponse = {
        ...mockSuccessApiResponse,
        choices: [
          {
            message: { role: "assistant", content: JSON.stringify(complexData) },
            finish_reason: "stop",
          },
        ],
      };

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(apiResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      // Act
      const result = await service.chatWithSchema<ComplexSchema>({
        messages: [{ role: "user", content: "Generate complex data" }],
        schema: {
          type: "object",
          properties: {
            user: { type: "object" },
          },
          required: ["user"],
          additionalProperties: false,
        },
        schemaName: "ComplexData",
      });

      // Assert
      expect(result.data).toEqual(complexData);
    });
  });

  // ============================================================================
  // chatStream() Tests
  // ============================================================================

  describe("chatStream", () => {
    let service: OpenRouterService;

    beforeEach(() => {
      service = new OpenRouterService(defaultConfig);
    });

    function createMockReadableStream(chunks: string[]): ReadableStream<Uint8Array> {
      const encoder = new TextEncoder();
      let index = 0;

      return new ReadableStream({
        pull(controller) {
          if (index < chunks.length) {
            controller.enqueue(encoder.encode(chunks[index]));
            index++;
          } else {
            controller.close();
          }
        },
      });
    }

    it("should yield StreamChunk objects for SSE data", async () => {
      // Arrange
      const sseChunks = [
        'data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}\n\n',
        'data: {"choices":[{"delta":{"content":" World"},"finish_reason":null}]}\n\n',
        'data: {"choices":[{"delta":{"content":"!"},"finish_reason":"stop"}]}\n\n',
        "data: [DONE]\n\n",
      ];

      const mockStream = createMockReadableStream(sseChunks);

      mockFetch.mockResolvedValue(
        new Response(mockStream, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        })
      );

      // Act
      const chunks: { content: string; isComplete: boolean; finishReason?: string }[] = [];
      for await (const chunk of service.chatStream(validChatOptions)) {
        chunks.push(chunk);
      }

      // Assert
      expect(chunks.length).toBe(4);
      expect(chunks[0]).toEqual({ content: "Hello", finishReason: null, isComplete: false });
      expect(chunks[1]).toEqual({ content: " World", finishReason: null, isComplete: false });
      expect(chunks[2]).toEqual({ content: "!", finishReason: "stop", isComplete: true });
      expect(chunks[3]).toEqual({ content: "", isComplete: true });
    });

    it("should send stream: true in request body", async () => {
      // Arrange
      const sseChunks = ["data: [DONE]\n\n"];
      const mockStream = createMockReadableStream(sseChunks);

      mockFetch.mockResolvedValue(
        new Response(mockStream, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        })
      );

      // Act
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of service.chatStream(validChatOptions)) {
        // consume stream
      }

      // Assert
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.stream).toBe(true);
    });

    it("should ignore non-SSE lines", async () => {
      // Arrange
      const sseChunks = [
        ": this is a comment\n",
        'data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}\n\n',
        "event: message\n",
        "data: [DONE]\n\n",
      ];

      const mockStream = createMockReadableStream(sseChunks);

      mockFetch.mockResolvedValue(
        new Response(mockStream, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        })
      );

      // Act
      const chunks: { content: string; isComplete: boolean }[] = [];
      for await (const chunk of service.chatStream(validChatOptions)) {
        chunks.push(chunk);
      }

      // Assert
      expect(chunks.length).toBe(2);
      expect(chunks[0].content).toBe("Hello");
      expect(chunks[1].isComplete).toBe(true);
    });

    it("should handle chunked SSE data across multiple reads", async () => {
      // Arrange - simulate data split across reads
      const sseChunks = [
        'data: {"choices":[{"delta":{"content":"Hel',
        'lo"},"finish_reason":null}]}\n\ndata: [DONE]\n\n',
      ];

      const mockStream = createMockReadableStream(sseChunks);

      mockFetch.mockResolvedValue(
        new Response(mockStream, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        })
      );

      // Act
      const chunks: { content: string; isComplete: boolean }[] = [];
      for await (const chunk of service.chatStream(validChatOptions)) {
        chunks.push(chunk);
      }

      // Assert
      expect(chunks.length).toBe(2);
      expect(chunks[0].content).toBe("Hello");
    });

    it("should throw OpenRouterError when response body is null", async () => {
      // Arrange
      const mockResponse = new Response(null, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      });
      Object.defineProperty(mockResponse, "body", { value: null });

      mockFetch.mockResolvedValue(mockResponse);

      // Act & Assert
      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _chunk of service.chatStream(validChatOptions)) {
          // This should not execute
          expect.fail("Should not yield any chunks");
        }
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(OpenRouterError);
        expect((error as OpenRouterError).code).toBe("NETWORK_ERROR");
        expect((error as OpenRouterError).message).toBe("No response body");
      }
    });

    it("should propagate HTTP errors", async () => {
      // Arrange
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "Unauthorized" } }), {
          status: 401,
          statusText: "Unauthorized",
          headers: { "Content-Type": "application/json" },
        })
      );

      // Act & Assert
      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _chunk of service.chatStream(validChatOptions)) {
          // This should not execute
        }
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(OpenRouterAuthError);
      }
    });

    it("should handle invalid JSON in SSE data gracefully", async () => {
      // Arrange
      const sseChunks = [
        "data: {invalid json}\n\n",
        'data: {"choices":[{"delta":{"content":"Valid"},"finish_reason":null}]}\n\n',
        "data: [DONE]\n\n",
      ];

      const mockStream = createMockReadableStream(sseChunks);

      mockFetch.mockResolvedValue(
        new Response(mockStream, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        })
      );

      // Act
      const chunks: { content: string; isComplete: boolean }[] = [];
      for await (const chunk of service.chatStream(validChatOptions)) {
        chunks.push(chunk);
      }

      // Assert - invalid JSON should be skipped (returns null)
      expect(chunks.length).toBe(2);
      expect(chunks[0].content).toBe("Valid");
      expect(chunks[1].isComplete).toBe(true);
    });

    it("should handle empty delta content", async () => {
      // Arrange
      const sseChunks = [
        'data: {"choices":[{"delta":{},"finish_reason":null}]}\n\n',
        'data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}\n\n',
        "data: [DONE]\n\n",
      ];

      const mockStream = createMockReadableStream(sseChunks);

      mockFetch.mockResolvedValue(
        new Response(mockStream, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        })
      );

      // Act
      const chunks: { content: string; isComplete: boolean }[] = [];
      for await (const chunk of service.chatStream(validChatOptions)) {
        chunks.push(chunk);
      }

      // Assert
      expect(chunks.length).toBe(3);
      expect(chunks[0].content).toBe(""); // empty delta
      expect(chunks[1].content).toBe("Hello");
      expect(chunks[2].isComplete).toBe(true);
    });
  });
});

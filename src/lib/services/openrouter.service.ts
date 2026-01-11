import type {
  OpenRouterConfig,
  ChatOptions,
  ChatResponse,
  ChatSchemaResponse,
  StreamChunk,
  ResponseFormat,
  JsonSchema,
  OpenRouterApiResponse,
  OpenRouterApiError,
  FinishReason,
} from "../../types/openrouter.types";
import {
  OpenRouterError,
  OpenRouterAuthError,
  OpenRouterRateLimitError,
  OpenRouterSchemaError,
  OpenRouterModerationError,
} from "../errors/openrouter.errors";
import { chatOptionsSchema } from "../schemas/openrouter.schema";

interface RequiredOpenRouterConfig {
  apiKey: string;
  defaultModel: string;
  defaultTemperature: number;
  defaultMaxTokens: number;
  siteUrl: string;
  siteName: string;
  timeout: number;
}

export class OpenRouterService {
  private readonly baseUrl = "https://openrouter.ai/api/v1";
  private readonly config: RequiredOpenRouterConfig;

  constructor(config: OpenRouterConfig) {
    if (!config.apiKey) {
      throw new OpenRouterAuthError("API key is required");
    }

    this.config = {
      apiKey: config.apiKey,
      defaultModel: config.defaultModel ?? "openai/gpt-4o-mini",
      defaultTemperature: config.defaultTemperature ?? 1.0,
      defaultMaxTokens: config.defaultMaxTokens ?? 4096,
      siteUrl: config.siteUrl ?? "",
      siteName: config.siteName ?? "",
      timeout: config.timeout ?? 30000,
    };
  }

  /**
   * Sends a chat request to the model and returns the full response
   */
  async chat(options: ChatOptions): Promise<ChatResponse> {
    const validatedOptions = chatOptionsSchema.parse(options);

    const requestBody = this.buildRequestBody(validatedOptions);
    const headers = this.buildHeaders();

    const response = await this.fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      await this.handleHttpError(response);
    }

    const data: OpenRouterApiResponse = await response.json();
    return this.parseResponse(data);
  }

  /**
   * Sends a chat request with a JSON schema for structured output
   */
  async chatWithSchema<T>(
    options: Omit<ChatOptions, "responseFormat"> & {
      schema: JsonSchema;
      schemaName: string;
    }
  ): Promise<ChatSchemaResponse<T>> {
    const responseFormat: ResponseFormat = {
      type: "json_schema",
      json_schema: {
        name: options.schemaName,
        strict: true,
        schema: options.schema,
      },
    };

    const response = await this.chat({
      ...options,
      responseFormat,
    });

    try {
      const parsedData = JSON.parse(response.content) as T;
      return {
        data: parsedData,
        rawContent: response.content,
        id: response.id,
        model: response.model,
        finishReason: response.finishReason,
        usage: response.usage,
      };
    } catch {
      throw new OpenRouterSchemaError("Failed to parse JSON response", response.content);
    }
  }

  /**
   * Sends a chat request and returns a stream of response chunks
   */
  async *chatStream(options: ChatOptions): AsyncGenerator<StreamChunk> {
    const validatedOptions = chatOptionsSchema.parse(options);
    const requestBody = this.buildRequestBody(validatedOptions, true);
    const headers = this.buildHeaders();

    const response = await this.fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      await this.handleHttpError(response);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new OpenRouterError("No response body", "NETWORK_ERROR");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const chunk = this.parseStreamChunk(line);
          if (chunk) {
            yield chunk;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Builds the request body for the OpenRouter API
   */
  private buildRequestBody(options: ChatOptions, stream = false): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: options.model ?? this.config.defaultModel,
      messages: options.messages,
      stream,
    };

    if (options.temperature !== undefined) {
      body.temperature = options.temperature;
    } else {
      body.temperature = this.config.defaultTemperature;
    }

    if (options.maxTokens !== undefined) {
      body.max_tokens = options.maxTokens;
    } else if (this.config.defaultMaxTokens) {
      body.max_tokens = this.config.defaultMaxTokens;
    }

    if (options.topP !== undefined) {
      body.top_p = options.topP;
    }

    if (options.responseFormat) {
      body.response_format = options.responseFormat;
    }

    return body;
  }

  /**
   * Builds the headers for the OpenRouter API request
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiKey}`,
      "Content-Type": "application/json",
    };

    if (this.config.siteUrl) {
      headers["HTTP-Referer"] = this.config.siteUrl;
    }

    if (this.config.siteName) {
      headers["X-Title"] = this.config.siteName;
    }

    return headers;
  }

  /**
   * Parses the API response into a ChatResponse object
   */
  private parseResponse(data: OpenRouterApiResponse): ChatResponse {
    const choice = data.choices[0];

    return {
      id: data.id,
      content: choice?.message?.content ?? "",
      model: data.model,
      finishReason: this.normalizeFinishReason(choice?.finish_reason),
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
    };
  }

  /**
   * Parses a single SSE stream chunk
   */
  private parseStreamChunk(line: string): StreamChunk | null {
    if (!line.startsWith("data: ")) return null;

    const data = line.slice(6).trim();
    if (data === "[DONE]") {
      return { content: "", isComplete: true };
    }

    try {
      const parsed = JSON.parse(data);
      const delta = parsed.choices?.[0]?.delta;
      const finishReason = parsed.choices?.[0]?.finish_reason;

      return {
        content: delta?.content ?? "",
        finishReason,
        isComplete: finishReason !== null && finishReason !== undefined,
      };
    } catch {
      return null;
    }
  }

  /**
   * Normalizes the finish reason from the API response
   */
  private normalizeFinishReason(reason?: string): FinishReason {
    const validReasons: FinishReason[] = ["stop", "length", "tool_calls", "content_filter", "error"];

    if (reason && validReasons.includes(reason as FinishReason)) {
      return reason as FinishReason;
    }

    return "stop";
  }

  /**
   * Fetches a URL with a timeout
   */
  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new OpenRouterError("Request timeout", "TIMEOUT", 408);
      }
      throw new OpenRouterError("Network error", "NETWORK_ERROR");
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Handles HTTP errors from the API
   */
  private async handleHttpError(response: Response): Promise<never> {
    let errorData: OpenRouterApiError | null = null;

    try {
      errorData = await response.json();
    } catch {
      // Ignore JSON parsing errors
    }

    const message = errorData?.error?.message ?? response.statusText;
    const metadata = errorData?.error?.metadata;

    switch (response.status) {
      case 401:
        throw new OpenRouterAuthError(message);

      case 402:
        throw new OpenRouterError(message, "INSUFFICIENT_CREDITS", 402);

      case 403:
        throw new OpenRouterModerationError(
          message,
          metadata?.flagged_input as string | undefined,
          metadata?.reasons as string[] | undefined
        );

      case 408:
        throw new OpenRouterError(message, "TIMEOUT", 408);

      case 429:
        throw new OpenRouterRateLimitError(message);

      case 502:
        throw new OpenRouterError(message, "PROVIDER_ERROR", 502);

      case 503:
        throw new OpenRouterError(message, "SERVICE_UNAVAILABLE", 503);

      default:
        throw new OpenRouterError(
          message,
          response.status >= 400 && response.status < 500 ? "INVALID_REQUEST" : "UNKNOWN",
          response.status
        );
    }
  }
}

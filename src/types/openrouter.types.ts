// ============================================================================
// OpenRouter Configuration Types
// ============================================================================

export interface OpenRouterConfig {
  apiKey: string;
  defaultModel?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  siteUrl?: string;
  siteName?: string;
  timeout?: number;
}

// ============================================================================
// Chat Message Types
// ============================================================================

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  responseFormat?: ResponseFormat;
}

// ============================================================================
// Response Format Types (Structured Outputs)
// ============================================================================

export interface ResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: boolean;
    schema: JsonSchema;
  };
}

export interface JsonSchema {
  type: "object";
  properties: Record<string, JsonSchemaProperty>;
  required: string[];
  additionalProperties: boolean;
}

export interface JsonSchemaProperty {
  type: string;
  description?: string;
  enum?: string[];
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}

// ============================================================================
// Chat Response Types
// ============================================================================

export type FinishReason = "stop" | "length" | "tool_calls" | "content_filter" | "error";

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatResponse {
  id: string;
  content: string;
  model: string;
  finishReason: FinishReason;
  usage: TokenUsage;
}

export interface ChatSchemaResponse<T> extends Omit<ChatResponse, "content"> {
  data: T;
  rawContent: string;
}

// ============================================================================
// Streaming Types
// ============================================================================

export interface StreamChunk {
  content: string;
  finishReason?: string;
  isComplete: boolean;
}

// ============================================================================
// Chat with Schema Options
// ============================================================================

export interface ChatWithSchemaOptions extends Omit<ChatOptions, "responseFormat"> {
  schema: JsonSchema;
  schemaName: string;
}

// ============================================================================
// OpenRouter API Types (Internal)
// ============================================================================

export interface OpenRouterApiResponse {
  id: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterApiError {
  error: {
    code: number;
    message: string;
    metadata?: Record<string, unknown>;
  };
}

// ============================================================================
// Error Code Types
// ============================================================================

export type OpenRouterErrorCode =
  | "INVALID_REQUEST"
  | "UNAUTHORIZED"
  | "INSUFFICIENT_CREDITS"
  | "CONTENT_MODERATED"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "PROVIDER_ERROR"
  | "SERVICE_UNAVAILABLE"
  | "SCHEMA_VALIDATION"
  | "NETWORK_ERROR"
  | "UNKNOWN";

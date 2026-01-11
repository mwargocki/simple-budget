# OpenRouter Service Implementation Plan

## 1. Opis usługi

OpenRouterService to usługa odpowiedzialna za komunikację z API OpenRouter w celu generowania odpowiedzi opartych na modelach LLM. Usługa zapewnia:

- Wysyłanie zapytań do modeli AI poprzez zunifikowane API OpenRouter
- Obsługę ustrukturyzowanych odpowiedzi (Structured Outputs) z walidacją JSON Schema
- Obsługę streamingu odpowiedzi w czasie rzeczywistym
- Konfigurowalność komunikatów systemowych i użytkownika
- Elastyczne parametry modelu (temperatura, max_tokens, itp.)
- Kompleksową obsługę błędów

### Główne cechy

| Cecha | Opis |
|-------|------|
| Endpoint | `https://openrouter.ai/api/v1/chat/completions` |
| Metoda | POST |
| Autoryzacja | Bearer token (API key) |
| Format odpowiedzi | JSON lub Streaming (SSE) |

---

## 2. Opis konstruktora

### Sygnatura

```typescript
constructor(config: OpenRouterConfig)
```

### Interfejs konfiguracji

```typescript
interface OpenRouterConfig {
  apiKey: string;
  defaultModel?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  siteUrl?: string;
  siteName?: string;
  timeout?: number;
}
```

### Parametry konfiguracji

| Parametr | Typ | Wymagany | Domyślna wartość       | Opis |
|----------|-----|----------|------------------------|------|
| `apiKey` | `string` | Tak | -                      | Klucz API OpenRouter |
| `defaultModel` | `string` | Nie | `"openai/gpt-4o-mini"` | Domyślny model do użycia |
| `defaultTemperature` | `number` | Nie | `1.0`                  | Domyślna temperatura (0.0-2.0) |
| `defaultMaxTokens` | `number` | Nie | `undefined`            | Domyślny limit tokenów |
| `siteUrl` | `string` | Nie | `undefined`            | URL aplikacji (dla statystyk) |
| `siteName` | `string` | Nie | `undefined`            | Nazwa aplikacji (dla statystyk) |
| `timeout` | `number` | Nie | `30000`                | Timeout w milisekundach |

### Przykład inicjalizacji

```typescript
const openRouterService = new OpenRouterService({
  apiKey: import.meta.env.OPENROUTER_API_KEY,
  defaultModel: "openai/gpt-4o-mini",
  defaultTemperature: 0.7,
  siteUrl: "https://simple-budget.app",
  siteName: "SimpleBudget",
});
```

---

## 3. Publiczne metody i pola

### 3.1 Metoda `chat`

Wysyła zapytanie do modelu i zwraca pełną odpowiedź.

```typescript
async chat(options: ChatOptions): Promise<ChatResponse>
```

#### Interfejsy

```typescript
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  responseFormat?: ResponseFormat;
}

interface ResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: boolean;
    schema: JsonSchema;
  };
}

interface JsonSchema {
  type: "object";
  properties: Record<string, JsonSchemaProperty>;
  required: string[];
  additionalProperties: boolean;
}

interface JsonSchemaProperty {
  type: string;
  description?: string;
  enum?: string[];
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}

interface ChatResponse {
  id: string;
  content: string;
  model: string;
  finishReason: "stop" | "length" | "tool_calls" | "content_filter" | "error";
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
```

#### Przykład użycia z wiadomością systemową i użytkownika

```typescript
const response = await openRouterService.chat({
  messages: [
    {
      role: "system",
      content: "Jesteś asystentem finansowym pomagającym kategoryzować transakcje."
    },
    {
      role: "user",
      content: "Zaklasyfikuj transakcję: 'Zakupy w Biedronce - 156.78 PLN'"
    }
  ],
  model: "anthropic/claude-sonnet-4",
  temperature: 0.3,
  maxTokens: 500
});
```

### 3.2 Metoda `chatWithSchema`

Wysyła zapytanie z wymuszonym schematem JSON w odpowiedzi.

```typescript
async chatWithSchema<T>(options: ChatWithSchemaOptions<T>): Promise<ChatSchemaResponse<T>>
```

#### Interfejsy

```typescript
interface ChatWithSchemaOptions<T> extends Omit<ChatOptions, "responseFormat"> {
  schema: JsonSchema;
  schemaName: string;
}

interface ChatSchemaResponse<T> extends Omit<ChatResponse, "content"> {
  data: T;
  rawContent: string;
}
```

#### Przykład z response_format (schemat JSON)

```typescript
// Definicja schematu dla kategoryzacji transakcji
const transactionCategorySchema: JsonSchema = {
  type: "object",
  properties: {
    category: {
      type: "string",
      description: "Nazwa kategorii transakcji",
      enum: ["Jedzenie", "Transport", "Rozrywka", "Rachunki", "Inne"]
    },
    confidence: {
      type: "number",
      description: "Poziom pewności klasyfikacji (0.0-1.0)"
    },
    reasoning: {
      type: "string",
      description: "Uzasadnienie wyboru kategorii"
    }
  },
  required: ["category", "confidence", "reasoning"],
  additionalProperties: false
};

interface TransactionCategory {
  category: string;
  confidence: number;
  reasoning: string;
}

const response = await openRouterService.chatWithSchema<TransactionCategory>({
  messages: [
    {
      role: "system",
      content: "Kategoryzujesz transakcje finansowe. Odpowiadaj zawsze w formacie JSON."
    },
    {
      role: "user",
      content: "Kategoryzuj: 'Uber Eats - dostawa jedzenia 45.00 PLN'"
    }
  ],
  schema: transactionCategorySchema,
  schemaName: "transaction_category",
  temperature: 0.2
});

// response.data = { category: "Jedzenie", confidence: 0.95, reasoning: "..." }
```

### 3.3 Metoda `chatStream`

Wysyła zapytanie i zwraca strumień odpowiedzi.

```typescript
async chatStream(options: ChatOptions): AsyncGenerator<StreamChunk, void, unknown>
```

#### Interfejs

```typescript
interface StreamChunk {
  content: string;
  finishReason?: string;
  isComplete: boolean;
}
```

#### Przykład użycia

```typescript
const stream = openRouterService.chatStream({
  messages: [
    { role: "user", content: "Wyjaśnij budżetowanie domowe" }
  ]
});

for await (const chunk of stream) {
  process.stdout.write(chunk.content);

  if (chunk.isComplete) {
    console.log("\n--- Zakończono ---");
  }
}
```

### 3.4 Metoda `getAvailableModels`

Pobiera listę dostępnych modeli.

```typescript
async getAvailableModels(): Promise<ModelInfo[]>
```

---

## 4. Prywatne metody i pola

### 4.1 Pola prywatne

```typescript
private readonly config: Required<OpenRouterConfig>;
private readonly httpClient: HttpClient;
private readonly baseUrl = "https://openrouter.ai/api/v1";
```

### 4.2 Metoda `buildRequestBody`

Buduje ciało żądania HTTP.

```typescript
private buildRequestBody(options: ChatOptions): OpenRouterRequestBody

interface OpenRouterRequestBody {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  response_format?: ResponseFormat;
}
```

### 4.3 Metoda `buildHeaders`

Konstruuje nagłówki HTTP.

```typescript
private buildHeaders(): Record<string, string>
```

Zwracane nagłówki:

```typescript
{
  "Authorization": `Bearer ${this.config.apiKey}`,
  "Content-Type": "application/json",
  "HTTP-Referer": this.config.siteUrl,  // opcjonalnie
  "X-Title": this.config.siteName        // opcjonalnie
}
```

### 4.4 Metoda `parseResponse`

Parsuje odpowiedź z API.

```typescript
private parseResponse(response: OpenRouterApiResponse): ChatResponse
```

### 4.5 Metoda `parseStreamChunk`

Parsuje pojedynczy chunk ze strumienia SSE.

```typescript
private parseStreamChunk(chunk: string): StreamChunk | null
```

### 4.6 Metoda `validateSchema`

Waliduje czy odpowiedź pasuje do schematu.

```typescript
private validateSchema<T>(data: unknown, schema: JsonSchema): T
```

### 4.7 Metoda `handleApiError`

Konwertuje błędy API na wewnętrzne błędy aplikacji.

```typescript
private handleApiError(error: OpenRouterApiError): never
```

---

## 5. Obsługa błędów

### 5.1 Hierarchia błędów

```typescript
// Bazowy błąd OpenRouter
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

// Kody błędów
export type OpenRouterErrorCode =
  | "INVALID_REQUEST"      // 400 - Nieprawidłowe parametry
  | "UNAUTHORIZED"         // 401 - Nieprawidłowy klucz API
  | "INSUFFICIENT_CREDITS" // 402 - Brak środków
  | "CONTENT_MODERATED"    // 403 - Treść zablokowana przez moderację
  | "TIMEOUT"              // 408 - Przekroczony czas oczekiwania
  | "RATE_LIMITED"         // 429 - Przekroczony limit zapytań
  | "PROVIDER_ERROR"       // 502 - Błąd dostawcy modelu
  | "SERVICE_UNAVAILABLE"  // 503 - Usługa niedostępna
  | "SCHEMA_VALIDATION"    // Błąd walidacji schematu JSON
  | "NETWORK_ERROR"        // Błąd sieci
  | "UNKNOWN";             // Nieznany błąd

// Specjalizowane błędy
export class OpenRouterAuthError extends OpenRouterError {
  constructor(message = "Invalid API key") {
    super(message, "UNAUTHORIZED", 401);
    this.name = "OpenRouterAuthError";
  }
}

export class OpenRouterRateLimitError extends OpenRouterError {
  constructor(
    message: string,
    public readonly retryAfter?: number
  ) {
    super(message, "RATE_LIMITED", 429);
    this.name = "OpenRouterRateLimitError";
  }
}

export class OpenRouterSchemaError extends OpenRouterError {
  constructor(
    message: string,
    public readonly receivedData: unknown
  ) {
    super(message, "SCHEMA_VALIDATION");
    this.name = "OpenRouterSchemaError";
  }
}

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
```

### 5.2 Mapowanie kodów HTTP na błędy

| Kod HTTP | Klasa błędu | Opis |
|----------|-------------|------|
| 400 | `OpenRouterError` | Nieprawidłowe parametry żądania |
| 401 | `OpenRouterAuthError` | Nieprawidłowy lub brakujący klucz API |
| 402 | `OpenRouterError` | Niewystarczające środki na koncie |
| 403 | `OpenRouterModerationError` | Treść zablokowana przez moderację |
| 408 | `OpenRouterError` | Timeout żądania |
| 429 | `OpenRouterRateLimitError` | Przekroczony limit zapytań |
| 502 | `OpenRouterError` | Błąd dostawcy modelu |
| 503 | `OpenRouterError` | Usługa niedostępna |

### 5.3 Obsługa błędów podczas streamingu

```typescript
async *chatStream(options: ChatOptions): AsyncGenerator<StreamChunk> {
  // ... inicjalizacja streamu ...

  for await (const event of sseStream) {
    try {
      const chunk = this.parseStreamChunk(event);

      if (chunk?.finishReason === "error") {
        throw new OpenRouterError(
          "Stream error occurred",
          "PROVIDER_ERROR"
        );
      }

      if (chunk) {
        yield chunk;
      }
    } catch (error) {
      throw this.handleApiError(error);
    }
  }
}
```

---

## 6. Kwestie bezpieczeństwa

### 6.1 Przechowywanie klucza API

```typescript
// ✅ Prawidłowo - klucz w zmiennych środowiskowych
const apiKey = import.meta.env.OPENROUTER_API_KEY;

// ❌ Nieprawidłowo - hardkodowany klucz
const apiKey = "sk-or-v1-xxxxx";
```

**Konfiguracja w `.env`:**

```env
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
```

### 6.2 Walidacja danych wejściowych

```typescript
// Schemat walidacji dla wiadomości
const chatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().min(1).max(100000)
});

const chatOptionsSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(100),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().max(128000).optional()
});
```

### 6.3 Sanityzacja treści

```typescript
private sanitizeUserContent(content: string): string {
  // Usuwanie potencjalnie niebezpiecznych sekwencji
  return content
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "") // Znaki kontrolne
    .trim();
}
```

### 6.4 Ograniczanie kosztów

```typescript
interface CostLimits {
  maxTokensPerRequest: number;
  maxRequestsPerMinute: number;
  maxCostPerDay: number;
}

private async checkCostLimits(options: ChatOptions): Promise<void> {
  // Implementacja limitów kosztów
}
```

### 6.5 Logowanie bez wrażliwych danych

```typescript
private logRequest(options: ChatOptions): void {
  console.log({
    model: options.model,
    messageCount: options.messages.length,
    temperature: options.temperature,
    // NIE loguj treści wiadomości ani klucza API
  });
}
```

---

## 7. Plan wdrożenia krok po kroku

### Krok 1: Utworzenie struktury plików

Utwórz następujące pliki:

```
src/
├── lib/
│   ├── services/
│   │   └── openrouter.service.ts    # Główna usługa
│   ├── schemas/
│   │   └── openrouter.schema.ts     # Schematy Zod
│   └── errors/
│       └── openrouter.errors.ts     # Klasy błędów
└── types.ts                          # Dodaj typy OpenRouter
```

### Krok 2: Definicja typów

Dodaj do `src/types.ts`:

```typescript
// ============================================================================
// OpenRouter Types
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

export interface ChatResponse {
  id: string;
  content: string;
  model: string;
  finishReason: "stop" | "length" | "tool_calls" | "content_filter" | "error";
  usage: TokenUsage;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface StreamChunk {
  content: string;
  finishReason?: string;
  isComplete: boolean;
}
```

### Krok 3: Implementacja klas błędów

Utwórz `src/lib/errors/openrouter.errors.ts`:

```typescript
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

export class OpenRouterAuthError extends OpenRouterError {
  constructor(message = "Invalid API key") {
    super(message, "UNAUTHORIZED", 401);
    this.name = "OpenRouterAuthError";
  }
}

export class OpenRouterRateLimitError extends OpenRouterError {
  constructor(message: string, public readonly retryAfter?: number) {
    super(message, "RATE_LIMITED", 429);
    this.name = "OpenRouterRateLimitError";
  }
}

export class OpenRouterSchemaError extends OpenRouterError {
  constructor(message: string, public readonly receivedData: unknown) {
    super(message, "SCHEMA_VALIDATION");
    this.name = "OpenRouterSchemaError";
  }
}

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
```

### Krok 4: Implementacja schematów walidacji

Utwórz `src/lib/schemas/openrouter.schema.ts`:

```typescript
import { z } from "zod";

export const chatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().min(1, "Message content cannot be empty").max(100000)
});

export const chatOptionsSchema = z.object({
  messages: z
    .array(chatMessageSchema)
    .min(1, "At least one message is required")
    .max(100),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().max(128000).optional(),
  topP: z.number().min(0).max(1).optional()
});

export const responseFormatSchema = z.object({
  type: z.literal("json_schema"),
  json_schema: z.object({
    name: z.string(),
    strict: z.boolean(),
    schema: z.object({
      type: z.literal("object"),
      properties: z.record(z.unknown()),
      required: z.array(z.string()),
      additionalProperties: z.boolean()
    })
  })
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type ChatOptionsInput = z.infer<typeof chatOptionsSchema>;
```

### Krok 5: Implementacja głównej usługi

Utwórz `src/lib/services/openrouter.service.ts`:

```typescript
import type {
  OpenRouterConfig,
  ChatOptions,
  ChatResponse,
  ChatMessage,
  StreamChunk,
  ResponseFormat,
  JsonSchema,
  TokenUsage
} from "../../types";
import {
  OpenRouterError,
  OpenRouterAuthError,
  OpenRouterRateLimitError,
  OpenRouterSchemaError,
  OpenRouterModerationError
} from "../errors/openrouter.errors";
import { chatOptionsSchema } from "../schemas/openrouter.schema";

interface OpenRouterApiResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenRouterApiError {
  error: {
    code: number;
    message: string;
    metadata?: Record<string, unknown>;
  };
}

export class OpenRouterService {
  private readonly baseUrl = "https://openrouter.ai/api/v1";
  private readonly config: Required<OpenRouterConfig>;

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
      timeout: config.timeout ?? 30000
    };
  }

  async chat(options: ChatOptions): Promise<ChatResponse> {
    // Walidacja opcji
    const validatedOptions = chatOptionsSchema.parse(options);

    const requestBody = this.buildRequestBody(validatedOptions);
    const headers = this.buildHeaders();

    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/chat/completions`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      await this.handleHttpError(response);
    }

    const data: OpenRouterApiResponse = await response.json();
    return this.parseResponse(data);
  }

  async chatWithSchema<T>(
    options: Omit<ChatOptions, "responseFormat"> & {
      schema: JsonSchema;
      schemaName: string;
    }
  ): Promise<{ data: T; rawContent: string } & Omit<ChatResponse, "content">> {
    const responseFormat: ResponseFormat = {
      type: "json_schema",
      json_schema: {
        name: options.schemaName,
        strict: true,
        schema: options.schema
      }
    };

    const response = await this.chat({
      ...options,
      responseFormat
    });

    try {
      const parsedData = JSON.parse(response.content) as T;
      return {
        data: parsedData,
        rawContent: response.content,
        id: response.id,
        model: response.model,
        finishReason: response.finishReason,
        usage: response.usage
      };
    } catch {
      throw new OpenRouterSchemaError(
        "Failed to parse JSON response",
        response.content
      );
    }
  }

  async *chatStream(options: ChatOptions): AsyncGenerator<StreamChunk> {
    const validatedOptions = chatOptionsSchema.parse(options);
    const requestBody = this.buildRequestBody(validatedOptions, true);
    const headers = this.buildHeaders();

    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/chat/completions`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody)
      }
    );

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

  private buildRequestBody(
    options: ChatOptions,
    stream = false
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: options.model ?? this.config.defaultModel,
      messages: options.messages,
      stream
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

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiKey}`,
      "Content-Type": "application/json"
    };

    if (this.config.siteUrl) {
      headers["HTTP-Referer"] = this.config.siteUrl;
    }

    if (this.config.siteName) {
      headers["X-Title"] = this.config.siteName;
    }

    return headers;
  }

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
        totalTokens: data.usage?.total_tokens ?? 0
      }
    };
  }

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
        isComplete: finishReason !== null && finishReason !== undefined
      };
    } catch {
      return null;
    }
  }

  private normalizeFinishReason(
    reason?: string
  ): ChatResponse["finishReason"] {
    const validReasons = [
      "stop",
      "length",
      "tool_calls",
      "content_filter",
      "error"
    ] as const;

    if (reason && validReasons.includes(reason as typeof validReasons[number])) {
      return reason as ChatResponse["finishReason"];
    }

    return "stop";
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeout
    );

    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new OpenRouterError(
          "Request timeout",
          "TIMEOUT",
          408
        );
      }
      throw new OpenRouterError(
        "Network error",
        "NETWORK_ERROR"
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async handleHttpError(response: Response): Promise<never> {
    let errorData: OpenRouterApiError | null = null;

    try {
      errorData = await response.json();
    } catch {
      // Ignoruj błędy parsowania JSON
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
          response.status >= 400 && response.status < 500
            ? "INVALID_REQUEST"
            : "UNKNOWN",
          response.status
        );
    }
  }
}
```

### Krok 6: Konfiguracja zmiennych środowiskowych

Dodaj do `.env`:

```env
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
```

Zaktualizuj walidację zmiennych środowiskowych w projekcie, jeśli istnieje.

### Krok 7: Przykład użycia w API endpoint

Utwórz przykładowy endpoint `src/pages/api/ai/categorize.ts`:

```typescript
import type { APIRoute } from "astro";
import { OpenRouterService } from "../../../lib/services/openrouter.service";
import { OpenRouterError } from "../../../lib/errors/openrouter.errors";

export const prerender = false;

const categorizeSchema = {
  type: "object" as const,
  properties: {
    category: {
      type: "string",
      description: "Suggested category for the transaction"
    },
    confidence: {
      type: "number",
      description: "Confidence level from 0 to 1"
    }
  },
  required: ["category", "confidence"],
  additionalProperties: false
};

export const POST: APIRoute = async ({ request, locals }) => {
  const session = await locals.supabase.auth.getSession();
  if (!session.data.session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401
    });
  }

  try {
    const { description } = await request.json();

    const openRouter = new OpenRouterService({
      apiKey: import.meta.env.OPENROUTER_API_KEY,
      defaultModel: "anthropic/claude-sonnet-4"
    });

    const response = await openRouter.chatWithSchema<{
      category: string;
      confidence: number;
    }>({
      messages: [
        {
          role: "system",
          content: "You are a financial assistant that categorizes transactions."
        },
        {
          role: "user",
          content: `Categorize this transaction: "${description}"`
        }
      ],
      schema: categorizeSchema,
      schemaName: "transaction_category",
      temperature: 0.2
    });

    return new Response(JSON.stringify(response.data), { status: 200 });
  } catch (error) {
    if (error instanceof OpenRouterError) {
      return new Response(
        JSON.stringify({ error: error.message, code: error.code }),
        { status: error.statusCode ?? 500 }
      );
    }
    throw error;
  }
};
```

### Krok 8: Testy

Utwórz testy jednostkowe dla usługi (opcjonalnie, jeśli projekt używa testów):

```typescript
// src/lib/services/__tests__/openrouter.service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { OpenRouterService } from "../openrouter.service";
import { OpenRouterAuthError } from "../../errors/openrouter.errors";

describe("OpenRouterService", () => {
  it("should throw error when API key is missing", () => {
    expect(() => new OpenRouterService({ apiKey: "" }))
      .toThrow(OpenRouterAuthError);
  });

  it("should build correct headers", () => {
    const service = new OpenRouterService({
      apiKey: "test-key",
      siteUrl: "https://example.com",
      siteName: "Test App"
    });

    // Test internal header building via chat method mock
  });
});
```

---

## Podsumowanie

Usługa OpenRouterService zapewnia:

1. **Prostą integrację** - jeden konstruktor z konfiguracją
2. **Elastyczność** - obsługa różnych modeli i parametrów
3. **Bezpieczeństwo typów** - pełne wsparcie TypeScript
4. **Structured Outputs** - wymuszanie schematu JSON w odpowiedziach
5. **Streaming** - odpowiedzi w czasie rzeczywistym
6. **Obsługę błędów** - szczegółowe klasy błędów z metadanymi
7. **Bezpieczeństwo** - walidacja danych i bezpieczne przechowywanie kluczy

Implementacja jest zgodna z konwencjami projektu SimpleBudget i wykorzystuje istniejące wzorce (klasy serwisowe, schematy Zod, typy w `types.ts`).

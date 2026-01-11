import { vi } from "vitest";
import { createMockSupabaseClient, type MockSupabaseClient } from "../../mocks/supabase.mock";

/**
 * Mock Astro API Context for testing API endpoints.
 *
 * This helper creates a minimal mock of Astro's APIContext that can be used
 * to test API route handlers in isolation.
 */
export interface MockAPIContext {
  request: Request;
  locals: {
    supabase: MockSupabaseClient;
  };
  cookies: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  url: URL;
  params: Record<string, string>;
}

export interface CreateMockAPIContextOptions {
  /** HTTP method for the request */
  method?: string;
  /** URL path for the request */
  path?: string;
  /** Request body (will be JSON stringified) */
  body?: unknown;
  /** Request headers */
  headers?: Record<string, string>;
  /** URL params (e.g., { id: '123' } for /api/resource/[id]) */
  params?: Record<string, string>;
  /** Override the mock Supabase client */
  supabase?: MockSupabaseClient;
}

/**
 * Creates a mock Astro API context for testing endpoints.
 *
 * @example
 * ```ts
 * const { context, mockSupabase } = createMockAPIContext({
 *   method: 'POST',
 *   path: '/api/auth/register',
 *   body: { email: 'test@example.com', password: 'password123', passwordConfirm: 'password123' },
 * });
 *
 * // Setup mock responses
 * mockSupabase.auth.signUp.mockResolvedValue({ data: { user: {...}, session: null }, error: null });
 *
 * // Call the endpoint handler
 * const response = await POST(context as any);
 *
 * // Assert on response
 * expect(response.status).toBe(201);
 * ```
 */
export function createMockAPIContext(options: CreateMockAPIContextOptions = {}): {
  context: MockAPIContext;
  mockSupabase: MockSupabaseClient;
} {
  const { method = "GET", path = "/api/test", body, headers = {}, params = {}, supabase } = options;

  const mockSupabase = supabase ?? createMockSupabaseClient();

  const url = new URL(`http://localhost${path}`);

  const requestInit: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body !== undefined && method !== "GET" && method !== "HEAD") {
    requestInit.body = JSON.stringify(body);
  }

  const request = new Request(url.toString(), requestInit);

  const context: MockAPIContext = {
    request,
    locals: {
      supabase: mockSupabase,
    },
    cookies: {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    },
    url,
    params,
  };

  return { context, mockSupabase };
}

/**
 * Creates a mock request with Authorization header.
 */
export function createMockAPIContextWithAuth(options: CreateMockAPIContextOptions & { token?: string } = {}): {
  context: MockAPIContext;
  mockSupabase: MockSupabaseClient;
} {
  const { token = "valid-test-token", ...restOptions } = options;

  return createMockAPIContext({
    ...restOptions,
    headers: {
      ...restOptions.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Helper to parse JSON response from an endpoint.
 */
export async function parseJsonResponse<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

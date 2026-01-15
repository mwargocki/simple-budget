import { vi } from "vitest";

interface MockChain {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lt: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
}

interface MockAuth {
  signUp: ReturnType<typeof vi.fn>;
  signInWithPassword: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
  updateUser: ReturnType<typeof vi.fn>;
  getSession: ReturnType<typeof vi.fn>;
  getUser: ReturnType<typeof vi.fn>;
}

export interface MockSupabaseClient {
  from: ReturnType<typeof vi.fn>;
  auth: MockAuth;
  rpc: ReturnType<typeof vi.fn>;
  _chain: MockChain;
}

/**
 * Creates a mock Supabase client with chainable query methods.
 * All chain methods return `this` by default to enable method chaining.
 *
 * @example
 * ```ts
 * const mockClient = createMockSupabaseClient();
 *
 * // Setup success response
 * mockClient._chain.single.mockResolvedValue({
 *   data: { id: '123', timezone: 'Europe/Warsaw' },
 *   error: null,
 * });
 *
 * // Use in service
 * const service = new ProfileService(mockClient as unknown as SupabaseClient);
 * ```
 */
export function createMockSupabaseClient(): MockSupabaseClient {
  const mockChain: MockChain = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    gte: vi.fn(),
    lt: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    maybeSingle: vi.fn(),
  };

  // Make all chain methods return the chain itself for method chaining
  Object.keys(mockChain).forEach((key) => {
    const method = mockChain[key as keyof MockChain];
    method.mockReturnThis();
  });

  const mockAuth: MockAuth = {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    updateUser: vi.fn(),
    getSession: vi.fn(),
    getUser: vi.fn(),
  };

  return {
    from: vi.fn(() => mockChain),
    auth: mockAuth,
    rpc: vi.fn(),
    _chain: mockChain,
  };
}

/**
 * Resets all mock functions in the Supabase client.
 */
export function resetMockSupabaseClient(mockClient: MockSupabaseClient): void {
  mockClient.from.mockClear();
  mockClient.rpc.mockClear();

  Object.values(mockClient._chain).forEach((mock) => {
    mock.mockClear();
    mock.mockReturnThis();
  });

  Object.values(mockClient.auth).forEach((mock) => mock.mockClear());
}

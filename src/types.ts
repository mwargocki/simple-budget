import type { Database } from "./db/database.types";

// ============================================================================
// Base Types - Re-exported from database types
// ============================================================================

/** Transaction type enum */
export type TransactionType = Database["public"]["Enums"]["transaction_type"];

/** Event name enum */
export type EventName = Database["public"]["Enums"]["event_name"];

/** Database row types for internal use */
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type EventRow = Database["public"]["Tables"]["events"]["Row"];

// ============================================================================
// Authentication DTOs and Commands
// ============================================================================

/** Command for user registration */
export interface RegisterCommand {
  email: string;
  password: string;
  passwordConfirm: string;
}

/** Response after successful registration */
export interface RegisterResponseDTO {
  user: {
    id: string;
    email: string;
  };
}

/** Command for user login */
export interface LoginCommand {
  email: string;
  password: string;
}

/** Session information returned after login */
export interface SessionDTO {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

/** Response after successful login */
export interface LoginResponseDTO {
  user: {
    id: string;
    email: string;
  };
  session: SessionDTO;
}

/** Response after successful logout */
export interface LogoutResponseDTO {
  message: string;
}

/** Command for changing password */
export interface ChangePasswordCommand {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
}

/** Response after successful password change */
export interface ChangePasswordResponseDTO {
  message: string;
}

/** Command for deleting user account */
export interface DeleteAccountCommand {
  confirmation: string;
}

/** Response after successful account deletion */
export interface DeleteAccountResponseDTO {
  message: string;
}

// ============================================================================
// Profile DTOs and Commands
// ============================================================================

/** Profile data transfer object - derived from profiles table, excluding internal fields */
export type ProfileDTO = Omit<ProfileRow, never>;

/** Command for updating user profile */
export interface UpdateProfileCommand {
  timezone: string;
}

// ============================================================================
// Category DTOs and Commands
// ============================================================================

/** Category data transfer object - excludes user_id for security */
export type CategoryDTO = Omit<CategoryRow, "user_id">;

/** Response containing list of categories */
export interface CategoriesListDTO {
  categories: CategoryDTO[];
}

/** Command for creating a new category */
export interface CreateCategoryCommand {
  name: string;
}

/** Command for updating a category */
export interface UpdateCategoryCommand {
  name: string;
}

/** Response after successful category deletion */
export interface DeleteCategoryResponseDTO {
  message: string;
  transactions_moved: number;
}

// ============================================================================
// Transaction DTOs and Commands
// ============================================================================

/**
 * Transaction data transfer object
 * Derived from transactions table with:
 * - amount formatted as string
 * - category_name joined from categories table
 * - user_id excluded for security
 */
export interface TransactionDTO {
  id: TransactionRow["id"];
  amount: string;
  type: TransactionType;
  category_id: TransactionRow["category_id"];
  category_name: string;
  description: TransactionRow["description"];
  occurred_at: TransactionRow["occurred_at"];
  created_at: TransactionRow["created_at"];
  updated_at: TransactionRow["updated_at"];
}

/** Pagination metadata */
export interface PaginationDTO {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

/** Response containing list of transactions with pagination */
export interface TransactionsListDTO {
  transactions: TransactionDTO[];
  pagination: PaginationDTO;
}

/** Query parameters for listing transactions */
export interface TransactionsQueryParams {
  month?: string;
  category_id?: string;
  limit?: number;
  offset?: number;
}

/** Command for creating a new transaction */
export interface CreateTransactionCommand {
  amount: string | number;
  type: TransactionType;
  category_id: string;
  description: string;
  occurred_at?: string;
}

/** Command for updating a transaction - all fields optional */
export interface UpdateTransactionCommand {
  amount?: string | number;
  type?: TransactionType;
  category_id?: string;
  description?: string;
  occurred_at?: string;
}

/** Response after successful transaction deletion */
export interface DeleteTransactionResponseDTO {
  message: string;
}

// ============================================================================
// Summary DTOs
// ============================================================================

/** Query parameters for monthly summary */
export interface SummaryQueryParams {
  month?: string;
}

/** Summary data for a single category */
export interface CategorySummaryDTO {
  category_id: string;
  category_name: string;
  income: string;
  expenses: string;
  balance: string;
  transaction_count: number;
}

/** Monthly financial summary response */
export interface MonthlySummaryDTO {
  month: string;
  total_income: string;
  total_expenses: string;
  balance: string;
  categories: CategorySummaryDTO[];
}

/** AI analysis response for monthly summary */
export interface AIAnalysisResponseDTO {
  analysis: string;
  month: string;
}

// ============================================================================
// Event DTOs and Commands
// ============================================================================

/** Command for tracking an analytics event */
export interface CreateEventCommand {
  event_name: EventName;
  properties?: Record<string, unknown>;
}

/** Event data transfer object - returned after creating an event */
export interface EventDTO {
  id: EventRow["id"];
  event_name: EventName;
  event_at: EventRow["event_at"];
  properties: Record<string, unknown>;
}

// ============================================================================
// Error DTOs
// ============================================================================

/** Error codes used in API responses */
export type ErrorCode = "VALIDATION_ERROR" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "INTERNAL_ERROR";

/** Detail for a specific field validation error */
export interface ErrorDetailDTO {
  field: string;
  message: string;
}

/** Error object structure */
export interface ErrorDTO {
  code: ErrorCode;
  message: string;
  details?: ErrorDetailDTO[];
}

/** Standard error response wrapper */
export interface ErrorResponseDTO {
  error: ErrorDTO;
}

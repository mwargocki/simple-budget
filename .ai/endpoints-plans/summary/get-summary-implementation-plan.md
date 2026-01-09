# API Endpoint Implementation Plan: GET /api/summary

<analysis>
## Key Points from API Specification

1. **Purpose**: Get monthly financial summary with total income, expenses, balance and per-category breakdown
2. **Authentication**: Required via Bearer token
3. **Query Parameter**: `month` (optional, YYYY-MM format, defaults to current month)
4. **Response**: MonthlySummaryDTO with aggregated financial data by category

## Required and Optional Parameters

- **Required**: None (month defaults to current)
- **Optional**: `month` (string, YYYY-MM format)

## Necessary Types (already defined in src/types.ts)

- `SummaryQueryParams` - query parameters interface
- `CategorySummaryDTO` - per-category aggregation
- `MonthlySummaryDTO` - full response structure
- `ErrorResponseDTO` - error handling

## Service Extraction

- Create new `SummaryService` in `src/lib/services/summary.service.ts`
- Method: `getMonthlySummary(month: string | undefined, userId: string, timezone: string): Promise<MonthlySummaryDTO>`
- Will need to fetch user profile to get timezone
- Aggregate transactions by category with income/expenses calculations

## Input Validation

- Reuse month regex from existing `transactionsQuerySchema`: `/^\d{4}-(0[1-9]|1[0-2])$/`
- Create `summaryQuerySchema` in `src/lib/schemas/summary.schema.ts`

## Error Scenarios

1. 400 - Invalid month format
2. 401 - No valid session / invalid token
3. 500 - Internal server error (database issues)

## Security Considerations

- User can only access their own transactions
- Timezone from user's profile ensures correct month boundaries
- No sensitive data exposure (user_id excluded from response)

## Performance Considerations

- Single database query with GROUP BY for aggregation
- Use database-level SUM and COUNT for efficiency
- Consider using user's timezone in date calculations
  </analysis>

## 1. Endpoint Overview

The `GET /api/summary` endpoint provides a monthly financial summary for the authenticated user. It aggregates all transactions for a specified month (or current month by default), calculating:

- Total income and expenses
- Balance (income - expenses)
- Per-category breakdown with income, expenses, balance, and transaction count

Month boundaries are calculated using the user's timezone from their profile to ensure accurate local-time filtering.

## 2. Request Details

- **HTTP Method**: GET
- **URL Structure**: `/api/summary`
- **Parameters**:
  - **Required**: None
  - **Optional**:
    - `month` (string): Month in YYYY-MM format (e.g., "2024-01"). Defaults to current month if not provided
- **Request Headers**:
  - `Authorization: Bearer <access_token>` (required)
- **Request Body**: None

## 3. Utilized Types

### Existing Types (src/types.ts)

```typescript
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
```

### New Zod Schema (src/lib/schemas/summary.schema.ts)

```typescript
import { z } from "zod";

export const summaryQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Invalid month format. Use YYYY-MM")
    .optional(),
});

export type SummaryQueryInput = z.infer<typeof summaryQuerySchema>;
```

## 4. Response Details

### Success Response (200 OK)

```json
{
  "month": "2024-01",
  "total_income": "5000.00",
  "total_expenses": "3250.50",
  "balance": "1749.50",
  "categories": [
    {
      "category_id": "uuid",
      "category_name": "Food",
      "income": "0.00",
      "expenses": "850.00",
      "balance": "-850.00",
      "transaction_count": 15
    }
  ]
}
```

### Error Responses

| Status | Code             | Message                      | Scenario                             |
| ------ | ---------------- | ---------------------------- | ------------------------------------ |
| 400    | VALIDATION_ERROR | Invalid month format         | Invalid `month` query parameter      |
| 401    | UNAUTHORIZED     | No valid session             | Missing/invalid Authorization header |
| 500    | INTERNAL_ERROR   | An unexpected error occurred | Database or server errors            |

## 5. Data Flow

```
1. Request arrives at GET /api/summary
   │
2. Extract Authorization header
   │ ├─ Missing/Invalid → 401 Unauthorized
   │
3. Validate token with Supabase auth
   │ ├─ Invalid token → 401 Unauthorized
   │
4. Parse query parameters (month)
   │
5. Validate with summaryQuerySchema
   │ ├─ Validation fails → 400 Bad Request
   │
6. Get user's timezone from profiles table
   │
7. Call SummaryService.getMonthlySummary()
   │ ├─ Calculate month boundaries in user's timezone
   │ ├─ Query transactions with GROUP BY category
   │ ├─ Aggregate income/expenses per category
   │ ├─ Calculate totals and balances
   │
8. Return MonthlySummaryDTO (200 OK)
```

## 6. Security Considerations

1. **Authentication**: Bearer token validation via Supabase Auth
2. **Authorization**:
   - RLS policies ensure users can only access their own transactions
   - User ID from authenticated token used for all queries
3. **Data Filtering**:
   - `user_id` excluded from response DTOs
   - Only user's own categories and transactions returned
4. **Input Validation**:
   - Month format strictly validated with regex
   - Zod schema prevents injection attacks
5. **Timezone Handling**:
   - Uses user's profile timezone for month boundaries
   - Prevents data leakage from adjacent months

## 7. Error Handling

| Error Scenario               | HTTP Status | Error Code       | Message                           |
| ---------------------------- | ----------- | ---------------- | --------------------------------- |
| Missing Authorization header | 401         | UNAUTHORIZED     | No valid session                  |
| Invalid/expired token        | 401         | UNAUTHORIZED     | No valid session                  |
| Invalid month format         | 400         | VALIDATION_ERROR | Invalid month format. Use YYYY-MM |
| Database error               | 500         | INTERNAL_ERROR   | An unexpected error occurred      |

## 8. Performance Considerations

1. **Database Optimization**:
   - Single aggregation query with GROUP BY for category summary
   - Use database SUM and COUNT functions instead of in-memory aggregation
   - Filter by date range before aggregation to limit scanned rows

2. **Query Strategy**:

   ```sql
   SELECT
     category_id,
     categories.name as category_name,
     SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
     SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses,
     COUNT(*) as transaction_count
   FROM transactions
   JOIN categories ON transactions.category_id = categories.id
   WHERE user_id = $1
     AND occurred_at >= $2
     AND occurred_at < $3
   GROUP BY category_id, categories.name
   ```

3. **Timezone Handling**:
   - Convert month boundaries to UTC using user's timezone
   - Single profile lookup per request (can be cached if needed)

## 9. Implementation Steps

### Step 1: Create Zod Schema

Create `src/lib/schemas/summary.schema.ts`:

- Define `summaryQuerySchema` with optional `month` parameter
- Add regex validation for YYYY-MM format
- Export `SummaryQueryInput` type

### Step 2: Create Summary Service

Create `src/lib/services/summary.service.ts`:

```typescript
export class SummaryService {
  constructor(private supabase: SupabaseClient) {}

  async getMonthlySummary(month: string | undefined, userId: string): Promise<MonthlySummaryDTO>;
}
```

Service responsibilities:

1. Fetch user's timezone from `profiles` table
2. Calculate month start/end in user's timezone, convert to UTC
3. Query transactions with category join, filtered by date range
4. Aggregate with GROUP BY category
5. Calculate per-category: income, expenses, balance, count
6. Calculate totals: total_income, total_expenses, balance
7. Format amounts as strings with 2 decimal places
8. Return `MonthlySummaryDTO`

### Step 3: Create API Endpoint

Create `src/pages/api/summary.ts`:

1. Export `prerender = false`
2. Implement `GET: APIRoute`:
   - Extract and validate Authorization header
   - Validate token with `locals.supabase.auth.getUser(token)`
   - Parse `month` query parameter
   - Validate with `summaryQuerySchema`
   - Create `SummaryService` with authenticated Supabase client
   - Call `getMonthlySummary(month, userId)`
   - Return JSON response with 200 status
3. Handle errors:
   - 401 for auth failures
   - 400 for validation failures
   - 500 for unexpected errors

### Step 4: Timezone Calculation Helper

Add private method to `SummaryService`:

```typescript
private calculateMonthRangeWithTimezone(
  month: string | undefined,
  timezone: string
): { monthStart: string; monthEnd: string }
```

Logic:

1. Parse month or use current month in user's timezone
2. Calculate first day of month at 00:00:00 in user's timezone
3. Calculate first day of next month at 00:00:00 in user's timezone
4. Convert both to UTC ISO strings for database query

### Step 5: Aggregation Query

Implement the aggregation query using Supabase:

- Join transactions with categories
- Filter by user_id and date range
- Use raw SQL or Supabase query builder with aggregation
- Handle empty result (no transactions) gracefully

### Step 6: Testing

Manual testing scenarios:

1. Valid request with default month
2. Valid request with specific month
3. Month with no transactions (empty categories array)
4. Invalid month format (400 error)
5. Missing auth header (401 error)
6. Invalid token (401 error)
7. Categories with only income, only expenses, or both

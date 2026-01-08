# REST API Plan

## 1. Resources

| Resource     | Database Table                     | Description                              |
| ------------ | ---------------------------------- | ---------------------------------------- |
| Auth         | `auth.users` (Supabase managed)    | User authentication operations           |
| Profiles     | `public.profiles`                  | User profile with timezone settings      |
| Categories   | `public.categories`                | Categories per user                      |
| Transactions | `public.transactions`              | Financial transactions (expenses/income) |
| Summary      | `public.transactions` (aggregated) | Monthly financial summary                |
| Events       | `public.events`                    | Analytics event tracking                 |

## 2. Endpoints

### 2.1 Authentication Endpoints

Authentication is primarily handled by Supabase Auth client-side SDK. The following server-side endpoints provide additional functionality.

#### POST /api/auth/register

Register a new user account.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "passwordConfirm": "securePassword123"
}
```

**Response (201 Created):**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

**Error Responses:**

- `400 Bad Request` - Passwords do not match, invalid email format, or password too weak
- `409 Conflict` - Email already registered

---

#### POST /api/auth/login

Authenticate user and create session.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "session": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "expires_at": 1704067200
  }
}
```

**Error Responses:**

- `400 Bad Request` - Missing required fields
- `401 Unauthorized` - Invalid credentials (generic message, does not reveal if email exists)

---

#### POST /api/auth/logout

End user session.

**Request Headers:**

- `Authorization: Bearer <access_token>`

**Response (200 OK):**

```json
{
  "message": "Logged out successfully"
}
```

**Error Responses:**

- `401 Unauthorized` - No valid session

---

#### POST /api/auth/change-password

Change user password using current password verification.

**Request Headers:**

- `Authorization: Bearer <access_token>`

**Request Body:**

```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456",
  "newPasswordConfirm": "newSecurePassword456"
}
```

**Response (200 OK):**

```json
{
  "message": "Password changed successfully"
}
```

**Error Responses:**

- `400 Bad Request` - New passwords do not match or password too weak
- `401 Unauthorized` - Current password incorrect or no valid session

---

#### DELETE /api/auth/account

Delete user account and all associated data.

**Request Headers:**

- `Authorization: Bearer <access_token>`

**Request Body:**

```json
{
  "confirmation": "DELETE"
}
```

**Response (200 OK):**

```json
{
  "message": "Account deleted successfully"
}
```

**Error Responses:**

- `400 Bad Request` - Missing or invalid confirmation
- `401 Unauthorized` - No valid session

---

### 2.2 Profile Endpoints

#### GET /api/profile

Get current user's profile.

**Request Headers:**

- `Authorization: Bearer <access_token>`

**Response (200 OK):**

```json
{
  "id": "uuid",
  "timezone": "Europe/Warsaw",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

**Error Responses:**

- `401 Unauthorized` - No valid session
- `404 Not Found` - Profile not found

---

#### PATCH /api/profile

Update current user's profile.

**Request Headers:**

- `Authorization: Bearer <access_token>`

**Request Body:**

```json
{
  "timezone": "America/New_York"
}
```

**Response (200 OK):**

```json
{
  "id": "uuid",
  "timezone": "America/New_York",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T12:00:00Z"
}
```

**Error Responses:**

- `400 Bad Request` - Invalid timezone (length must be 1-64 characters)
- `401 Unauthorized` - No valid session

---

### 2.3 Category Endpoints

#### GET /api/categories

List all categories for current user (sorted alphabetically).

**Request Headers:**

- `Authorization: Bearer <access_token>`

**Response (200 OK):**

```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "Brak",
      "is_system": true,
      "system_key": "none",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    },
    {
      "id": "uuid",
      "name": "Food",
      "is_system": false,
      "system_key": null,
      "created_at": "2024-01-15T11:00:00Z",
      "updated_at": "2024-01-15T11:00:00Z"
    }
  ]
}
```

**Error Responses:**

- `401 Unauthorized` - No valid session

---

#### POST /api/categories

Create a new category.

**Request Headers:**

- `Authorization: Bearer <access_token>`

**Request Body:**

```json
{
  "name": "Transport"
}
```

**Response (201 Created):**

```json
{
  "id": "uuid",
  "name": "Transport",
  "is_system": false,
  "system_key": null,
  "created_at": "2024-01-15T12:00:00Z",
  "updated_at": "2024-01-15T12:00:00Z"
}
```

**Error Responses:**

- `400 Bad Request` - Name empty, whitespace-only, exceeds 40 characters, or has leading/trailing spaces
- `401 Unauthorized` - No valid session
- `409 Conflict` - Category name already exists (case-insensitive)

---

#### PATCH /api/categories/{id}

Update category name.

**Request Headers:**

- `Authorization: Bearer <access_token>`

**Path Parameters:**

- `id` (uuid) - Category ID

**Request Body:**

```json
{
  "name": "Public Transport"
}
```

**Response (200 OK):**

```json
{
  "id": "uuid",
  "name": "Public Transport",
  "is_system": false,
  "system_key": null,
  "created_at": "2024-01-15T12:00:00Z",
  "updated_at": "2024-01-15T14:00:00Z"
}
```

**Error Responses:**

- `400 Bad Request` - Name empty, whitespace-only, exceeds 40 characters, or has leading/trailing spaces
- `401 Unauthorized` - No valid session
- `403 Forbidden` - Cannot modify system category ("Brak")
- `404 Not Found` - Category not found or belongs to another user
- `409 Conflict` - Category name already exists (case-insensitive)

---

#### DELETE /api/categories/{id}

Delete category and move associated transactions to "Brak".

**Request Headers:**

- `Authorization: Bearer <access_token>`

**Path Parameters:**

- `id` (uuid) - Category ID

**Response (200 OK):**

```json
{
  "message": "Category deleted successfully",
  "transactions_moved": 5
}
```

**Error Responses:**

- `401 Unauthorized` - No valid session
- `403 Forbidden` - Cannot delete system category ("Brak")
- `404 Not Found` - Category not found or belongs to another user

---

### 2.4 Transaction Endpoints

#### GET /api/transactions

List transactions with filtering, sorting, and pagination.

**Request Headers:**

- `Authorization: Bearer <access_token>`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `month` | string | No | Month filter in YYYY-MM format (e.g., "2024-01"). Defaults to current month |
| `category_id` | uuid | No | Filter by category ID. Omit for all categories |
| `limit` | integer | No | Number of records to return (1-100, default: 20) |
| `offset` | integer | No | Number of records to skip (default: 0) |

**Response (200 OK):**

```json
{
  "transactions": [
    {
      "id": "uuid",
      "amount": "125.50",
      "type": "expense",
      "category_id": "uuid",
      "category_name": "Food",
      "description": "Weekly groceries",
      "occurred_at": "2024-01-15T14:30:00Z",
      "created_at": "2024-01-15T14:35:00Z",
      "updated_at": "2024-01-15T14:35:00Z"
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

**Error Responses:**

- `400 Bad Request` - Invalid month format, invalid category_id, or invalid pagination params
- `401 Unauthorized` - No valid session

---

#### POST /api/transactions

Create a new transaction.

**Request Headers:**

- `Authorization: Bearer <access_token>`

**Request Body:**

```json
{
  "amount": "125.50",
  "type": "expense",
  "category_id": "uuid",
  "description": "Weekly groceries",
  "occurred_at": "2024-01-15T14:30:00Z"
}
```

| Field         | Type          | Required | Description                                              |
| ------------- | ------------- | -------- | -------------------------------------------------------- |
| `amount`      | string/number | Yes      | Amount in PLN (0.01 - 1,000,000.00)                      |
| `type`        | string        | Yes      | Either "expense" or "income"                             |
| `category_id` | uuid          | Yes      | Must belong to current user                              |
| `description` | string        | Yes      | Required description (max 255 chars, no whitespace-only) |
| `occurred_at` | string        | No       | ISO 8601 datetime. Defaults to current timestamp         |

**Response (201 Created):**

```json
{
  "id": "uuid",
  "amount": "125.50",
  "type": "expense",
  "category_id": "uuid",
  "category_name": "Food",
  "description": "Weekly groceries",
  "occurred_at": "2024-01-15T14:30:00Z",
  "created_at": "2024-01-15T14:35:00Z",
  "updated_at": "2024-01-15T14:35:00Z"
}
```

**Error Responses:**

- `400 Bad Request` - Invalid amount (outside 0.01-1,000,000.00 range), invalid type, description too long or whitespace-only, invalid date format
- `401 Unauthorized` - No valid session
- `404 Not Found` - Category not found or belongs to another user

---

#### GET /api/transactions/{id}

Get single transaction details.

**Request Headers:**

- `Authorization: Bearer <access_token>`

**Path Parameters:**

- `id` (uuid) - Transaction ID

**Response (200 OK):**

```json
{
  "id": "uuid",
  "amount": "125.50",
  "type": "expense",
  "category_id": "uuid",
  "category_name": "Food",
  "description": "Weekly groceries",
  "occurred_at": "2024-01-15T14:30:00Z",
  "created_at": "2024-01-15T14:35:00Z",
  "updated_at": "2024-01-15T14:35:00Z"
}
```

**Error Responses:**

- `401 Unauthorized` - No valid session
- `404 Not Found` - Transaction not found or belongs to another user

---

#### PATCH /api/transactions/{id}

Update an existing transaction.

**Request Headers:**

- `Authorization: Bearer <access_token>`

**Path Parameters:**

- `id` (uuid) - Transaction ID

**Request Body:**

```json
{
  "amount": "150.00",
  "type": "expense",
  "category_id": "uuid",
  "description": "Updated description",
  "occurred_at": "2024-01-15T15:00:00Z"
}
```

All fields are optional. Only provided fields will be updated.

**Response (200 OK):**

```json
{
  "id": "uuid",
  "amount": "150.00",
  "type": "expense",
  "category_id": "uuid",
  "category_name": "Food",
  "description": "Updated description",
  "occurred_at": "2024-01-15T15:00:00Z",
  "created_at": "2024-01-15T14:35:00Z",
  "updated_at": "2024-01-15T16:00:00Z"
}
```

**Error Responses:**

- `400 Bad Request` - Invalid amount, type, description, or date format
- `401 Unauthorized` - No valid session
- `404 Not Found` - Transaction or category not found, or belongs to another user

---

#### DELETE /api/transactions/{id}

Delete a transaction.

**Request Headers:**

- `Authorization: Bearer <access_token>`

**Path Parameters:**

- `id` (uuid) - Transaction ID

**Response (200 OK):**

```json
{
  "message": "Transaction deleted successfully"
}
```

**Error Responses:**

- `401 Unauthorized` - No valid session
- `404 Not Found` - Transaction not found or belongs to another user

---

### 2.5 Summary Endpoints

#### GET /api/summary

Get monthly financial summary.

**Request Headers:**

- `Authorization: Bearer <access_token>`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `month` | string | No | Month in YYYY-MM format (e.g., "2024-01"). Defaults to current month |

**Response (200 OK):**

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
    },
    {
      "category_id": "uuid",
      "category_name": "Salary",
      "income": "5000.00",
      "expenses": "0.00",
      "balance": "5000.00",
      "transaction_count": 1
    },
    {
      "category_id": "uuid",
      "category_name": "Brak",
      "income": "0.00",
      "expenses": "200.50",
      "balance": "-200.50",
      "transaction_count": 3
    }
  ]
}
```

**Notes:**

- `balance` = `total_income` - `total_expenses`
- Per-category balance follows the same formula
- Categories without transactions in the selected month are omitted
- Month boundaries are calculated using user's timezone from profile

**Error Responses:**

- `400 Bad Request` - Invalid month format
- `401 Unauthorized` - No valid session

---

### 2.6 Event Endpoints

#### POST /api/events

Track an analytics event.

**Request Headers:**

- `Authorization: Bearer <access_token>`

**Request Body:**

```json
{
  "event_name": "screen_view_transactions_list",
  "properties": {
    "filter_month": "2024-01",
    "filter_category_id": "uuid"
  }
}
```

| Field        | Type   | Required | Description                                                              |
| ------------ | ------ | -------- | ------------------------------------------------------------------------ |
| `event_name` | string | Yes      | Must be "screen_view_transactions_list" or "screen_view_monthly_summary" |
| `properties` | object | No       | Additional event metadata. Defaults to empty object                      |

**Response (201 Created):**

```json
{
  "id": "uuid",
  "event_name": "screen_view_transactions_list",
  "event_at": "2024-01-15T14:30:00Z",
  "properties": {
    "filter_month": "2024-01",
    "filter_category_id": "uuid"
  }
}
```

**Error Responses:**

- `400 Bad Request` - Invalid event_name or properties is not a valid JSON object
- `401 Unauthorized` - No valid session

---

## 3. Authentication and Authorization

### 3.1 Authentication Mechanism

The API uses Supabase Auth with JWT tokens for authentication.

**Implementation Details:**

1. **Session Management**: Supabase handles session tokens (access_token and refresh_token)
2. **Token Transmission**: Access tokens are sent via `Authorization: Bearer <token>` header
3. **Token Refresh**: Client-side Supabase SDK handles automatic token refresh
4. **Cookie-based Sessions**: For SSR pages, sessions can be managed via Astro.cookies using Supabase's `createServerClient`

### 3.2 Authorization (Row Level Security)

All data access is protected by PostgreSQL Row Level Security (RLS) policies:

| Table          | SELECT          | INSERT               | UPDATE               | DELETE               |
| -------------- | --------------- | -------------------- | -------------------- | -------------------- |
| `profiles`     | Own record only | Via trigger          | Own record only      | Via cascade          |
| `categories`   | Own records     | Own, non-system only | Own, non-system only | Own, non-system only |
| `transactions` | Own records     | Own records          | Own records          | Own records          |
| `events`       | Own records     | Own records          | Blocked              | Blocked              |

**Authorization Checks:**

- All endpoints verify `user_id = auth.uid()` through RLS
- Composite foreign key on transactions ensures category ownership
- System categories (`is_system = true`) are protected from modification/deletion

### 3.3 Security Measures

1. **Supabase Auth Security**: Passwords are hashed using bcrypt
2. **Rate Limiting**: Supabase provides built-in rate limiting for auth endpoints
3. **HTTPS**: All API communication must use HTTPS
4. **Input Validation**: All inputs validated using Zod schemas before database operations

---

## 4. Validation and Business Logic

### 4.1 Validation Rules by Resource

#### Profile Validation

| Field      | Rules                             |
| ---------- | --------------------------------- |
| `timezone` | Required, string, 1-64 characters |

#### Category Validation

| Field  | Rules                                                                                                          |
| ------ | -------------------------------------------------------------------------------------------------------------- |
| `name` | Required, string, 1-40 characters, trimmed, no leading/trailing whitespace, unique per user (case-insensitive) |

#### Transaction Validation

| Field         | Rules                                                          |
| ------------- | -------------------------------------------------------------- |
| `amount`      | Required, decimal, range 0.01 - 1,000,000.00, 2 decimal places |
| `type`        | Required, enum: "expense" \| "income"                          |
| `category_id` | Required, uuid, must exist and belong to user                  |
| `description` | Required, max 255 characters, cannot be whitespace-only, cannot be empty |
| `occurred_at` | Optional, valid ISO 8601 datetime, defaults to now()           |

#### Event Validation

| Field        | Rules                                                                            |
| ------------ | -------------------------------------------------------------------------------- |
| `event_name` | Required, enum: "screen_view_transactions_list" \| "screen_view_monthly_summary" |
| `properties` | Optional, must be valid JSON object, defaults to {}                              |

### 4.2 Business Logic Implementation

#### User Registration Flow

1. Validate email and password match
2. Create auth.users record via Supabase Auth
3. Database trigger automatically creates:
   - `profiles` record with default timezone "Europe/Warsaw"
   - System category "Brak" with `is_system=true`, `system_key='none'`

#### Category Deletion Flow

1. Verify category is not system category (`is_system = false`)
2. Find user's "Brak" category (`system_key = 'none'`)
3. Update all transactions from deleted category to "Brak" category
4. Delete the category
5. Return count of moved transactions

#### Monthly Summary Calculation

1. Get user's timezone from profile
2. Calculate month boundaries in UTC based on user's timezone
3. Aggregate transactions:
   - `SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END)` for expenses
   - `SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END)` for income
   - `SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END)` for balance
4. Group by category for per-category breakdown

#### Transaction List Filtering

1. Parse month parameter (YYYY-MM format)
2. Convert to UTC range using user's timezone
3. Apply category filter if provided
4. Sort by `occurred_at DESC, id DESC` for stable pagination
5. Apply limit/offset pagination

### 4.3 Error Response Format

All error responses follow a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error message",
    "details": [
      {
        "field": "amount",
        "message": "Amount must be between 0.01 and 1,000,000.00"
      }
    ]
  }
}
```

**Standard Error Codes:**
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Action not allowed (e.g., modify system category) |
| `NOT_FOUND` | 404 | Resource not found or access denied |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate category name) |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### 4.4 Database Triggers Supporting Business Logic

| Trigger                                    | Table                              | Event         | Action                                               |
| ------------------------------------------ | ---------------------------------- | ------------- | ---------------------------------------------------- |
| `set_updated_at`                           | profiles, categories, transactions | BEFORE UPDATE | Sets `updated_at = now()`                            |
| `handle_new_user`                          | auth.users                         | AFTER INSERT  | Creates profile and "Brak" category                  |
| `prevent_system_category_delete`           | categories                         | BEFORE DELETE | Raises exception if `is_system = true`               |
| `prevent_system_category_update`           | categories                         | BEFORE UPDATE | Raises exception if modifying system category fields |
| `reassign_transactions_on_category_delete` | categories                         | BEFORE DELETE | Moves transactions to "Brak" before delete           |

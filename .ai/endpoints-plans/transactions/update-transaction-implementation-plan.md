# API Endpoint Implementation Plan: PATCH /api/transactions/{id}

## 1. Przegląd punktu końcowego

Endpoint umożliwia częściową aktualizację istniejącej transakcji. Użytkownik może zaktualizować dowolne pole lub ich kombinację: kwotę, typ, kategorię, opis oraz datę wystąpienia. Aktualizacja dotyczy tylko pól przesłanych w żądaniu.

## 2. Szczegóły żądania

- **Metoda HTTP:** PATCH
- **Struktura URL:** `/api/transactions/{id}`
- **Parametry ścieżki:**
  - `id` (uuid, wymagany) - identyfikator transakcji
- **Nagłówki:**
  - `Authorization: Bearer <access_token>` (wymagany)
  - `Content-Type: application/json`
- **Request Body (wszystkie pola opcjonalne):**
  ```json
  {
    "amount": "150.00",
    "type": "expense",
    "category_id": "uuid",
    "description": "Updated description",
    "occurred_at": "2024-01-15T15:00:00Z"
  }
  ```

### Walidacja pól

| Pole          | Typ              | Walidacja                                                          |
| ------------- | ---------------- | ------------------------------------------------------------------ |
| `amount`      | string \| number | Opcjonalne. Wartość od 0.01 do 1,000,000.00                        |
| `type`        | string           | Opcjonalne. Dozwolone: "expense" lub "income"                      |
| `category_id` | string           | Opcjonalne. Format UUID                                            |
| `description` | string           | Opcjonalne. Od 1 do 255 znaków, nie może być tylko białymi znakami |
| `occurred_at` | string           | Opcjonalne. Format ISO 8601 datetime                               |

## 3. Wykorzystywane typy

### Istniejące typy (src/types.ts)

- `UpdateTransactionCommand` - komenda aktualizacji (linie 182-188)
- `TransactionDTO` - odpowiedź z danymi transakcji (linie 138-148)
- `ErrorResponseDTO` - struktura błędu (linie 262-264)
- `TransactionType` - enum typu transakcji (linia 8)

### Nowy schemat walidacji (src/lib/schemas/transaction.schema.ts)

```typescript
export const updateTransactionSchema = z
  .object({
    amount: z
      .union([z.string(), z.number()])
      .transform((val) => (typeof val === "string" ? parseFloat(val) : val))
      .refine((val) => !isNaN(val) && val >= 0.01 && val <= 1000000.0, {
        message: "Amount must be between 0.01 and 1,000,000.00",
      })
      .optional(),
    type: z
      .enum(["expense", "income"], {
        errorMap: () => ({ message: "Type must be 'expense' or 'income'" }),
      })
      .optional(),
    category_id: z.string().uuid("Invalid category ID format").optional(),
    description: z
      .string()
      .min(1, "Description is required")
      .max(255, "Description must not exceed 255 characters")
      .refine((val) => val.trim().length > 0, {
        message: "Description cannot be whitespace-only",
      })
      .optional(),
    occurred_at: z.string().datetime({ message: "Invalid ISO 8601 datetime format" }).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
```

## 4. Szczegóły odpowiedzi

### Sukces (200 OK)

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

### Błędy

| Status | Kod              | Opis                                                                   |
| ------ | ---------------- | ---------------------------------------------------------------------- |
| 400    | VALIDATION_ERROR | Nieprawidłowe dane wejściowe (format ID, kwota, typ, opis, data)       |
| 401    | UNAUTHORIZED     | Brak lub nieprawidłowy token autoryzacji                               |
| 404    | NOT_FOUND        | Transakcja lub kategoria nie istnieje lub należy do innego użytkownika |
| 500    | INTERNAL_ERROR   | Nieoczekiwany błąd serwera                                             |

## 5. Przepływ danych

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────────┐     ┌──────────────┐
│   Klient    │────>│  API Route   │────>│ TransactionService  │────>│   Supabase   │
│             │     │  [id].ts     │     │ updateTransaction() │     │   Database   │
└─────────────┘     └──────────────┘     └─────────────────────┘     └──────────────┘
      │                    │                       │                        │
      │  1. PATCH request  │                       │                        │
      │─────────────────────>                      │                        │
      │                    │  2. Validate token    │                        │
      │                    │─────────────────────────────────────────────────>
      │                    │                       │                        │
      │                    │  3. Validate ID       │                        │
      │                    │  4. Validate body     │                        │
      │                    │                       │                        │
      │                    │  5. Call service      │                        │
      │                    │──────────────────────>│                        │
      │                    │                       │  6. Verify category    │
      │                    │                       │  (if category_id       │
      │                    │                       │   provided)            │
      │                    │                       │────────────────────────>
      │                    │                       │                        │
      │                    │                       │  7. Update transaction │
      │                    │                       │────────────────────────>
      │                    │                       │                        │
      │                    │                       │  8. Fetch updated      │
      │                    │                       │  transaction with      │
      │                    │                       │  category name         │
      │                    │                       │────────────────────────>
      │                    │                       │                        │
      │  9. Return TransactionDTO                  │                        │
      │<──────────────────────────────────────────────────────────────────────
```

### Kroki przepływu:

1. Klient wysyła żądanie PATCH z tokenem i danymi do aktualizacji
2. API Route waliduje token za pomocą `locals.supabase.auth.getUser()`
3. Walidacja formatu ID transakcji za pomocą `transactionIdSchema`
4. Walidacja body za pomocą `updateTransactionSchema`
5. Wywołanie `TransactionService.updateTransaction()`
6. Jeśli `category_id` jest przesłane - weryfikacja istnienia kategorii dla użytkownika
7. Aktualizacja transakcji w bazie danych
8. Pobranie zaktualizowanej transakcji z nazwą kategorii
9. Zwrócenie `TransactionDTO`

## 6. Względy bezpieczeństwa

### Uwierzytelnianie

- Wymagany header `Authorization: Bearer <token>`
- Token walidowany przez `locals.supabase.auth.getUser()`
- Odrzucenie żądań bez ważnego tokena (401)

### Autoryzacja

- Transakcja musi należeć do zalogowanego użytkownika (`user_id` matching)
- Jeśli zmieniana jest kategoria - musi należeć do tego samego użytkownika
- Próba dostępu do cudzej transakcji zwraca 404 (nie 403) - nie ujawnia istnienia zasobu

### Walidacja danych

- Wszystkie pola walidowane przez Zod przed operacją na bazie
- Kwota ograniczona do zakresu 0.01 - 1,000,000.00
- Opis ograniczony do 255 znaków, nie może być pusty ani whitespace-only
- Typ transakcji ograniczony do enum `expense | income`
- UUID walidowane formatem
- Data w formacie ISO 8601

### Ochrona przed atakami

- Zod schema zapobiega injection przez walidację typów
- Supabase RLS zapewnia dodatkową warstwę ochrony
- Brak możliwości modyfikacji `user_id`, `created_at` przez API

## 7. Obsługa błędów

### Scenariusze błędów

| Scenariusz                              | Kod HTTP | ErrorCode        | Wiadomość                                      |
| --------------------------------------- | -------- | ---------------- | ---------------------------------------------- |
| Brak nagłówka Authorization             | 401      | UNAUTHORIZED     | No valid session                               |
| Nieprawidłowy token                     | 401      | UNAUTHORIZED     | No valid session                               |
| Nieprawidłowy format ID                 | 400      | VALIDATION_ERROR | Invalid transaction ID format                  |
| Puste body żądania                      | 400      | VALIDATION_ERROR | At least one field must be provided for update |
| Nieprawidłowa kwota                     | 400      | VALIDATION_ERROR | Amount must be between 0.01 and 1,000,000.00   |
| Nieprawidłowy typ                       | 400      | VALIDATION_ERROR | Type must be 'expense' or 'income'             |
| Nieprawidłowy format category_id        | 400      | VALIDATION_ERROR | Invalid category ID format                     |
| Opis za długi                           | 400      | VALIDATION_ERROR | Description must not exceed 255 characters     |
| Opis pusty/whitespace                   | 400      | VALIDATION_ERROR | Description cannot be whitespace-only          |
| Nieprawidłowy format daty               | 400      | VALIDATION_ERROR | Invalid ISO 8601 datetime format               |
| Transakcja nie istnieje                 | 404      | NOT_FOUND        | Transaction not found                          |
| Transakcja należy do innego użytkownika | 404      | NOT_FOUND        | Transaction not found                          |
| Kategoria nie istnieje                  | 404      | NOT_FOUND        | Category not found                             |
| Kategoria należy do innego użytkownika  | 404      | NOT_FOUND        | Category not found                             |
| Błąd bazy danych                        | 500      | INTERNAL_ERROR   | An unexpected error occurred                   |

### Struktura odpowiedzi błędu

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Amount must be between 0.01 and 1,000,000.00",
    "details": [
      {
        "field": "amount",
        "message": "Amount must be between 0.01 and 1,000,000.00"
      }
    ]
  }
}
```

## 8. Rozważania dotyczące wydajności

### Optymalizacje

1. **Minimalna liczba zapytań:** W najgorszym przypadku 3 zapytania:
   - Weryfikacja kategorii (jeśli zmieniana)
   - Update transakcji
   - Pobranie zaktualizowanej transakcji z kategorią

2. **Indeksy:** Wykorzystanie istniejących indeksów na:
   - `transactions(id)`
   - `transactions(user_id)`
   - `categories(id, user_id)`

3. **Partial update:** Tylko zmieniane pola są aktualizowane w bazie

### Możliwe optymalizacje przyszłościowe

- Połączenie update i select w jedno zapytanie z `.select()` na końcu
- Cache kategorii użytkownika (jeśli często aktualizowane)

## 9. Etapy wdrożenia

### Krok 1: Dodanie schematu walidacji

**Plik:** `src/lib/schemas/transaction.schema.ts`

Dodać `updateTransactionSchema` i typ `UpdateTransactionInput`:

- Schema z wszystkimi polami opcjonalnymi
- Walidacja że przynajmniej jedno pole jest podane
- Eksport typu

### Krok 2: Rozszerzenie TransactionService

**Plik:** `src/lib/services/transaction.service.ts`

Dodać metodę `updateTransaction(transactionId: string, command: UpdateTransactionCommand, userId: string): Promise<TransactionDTO>`:

1. Jeśli `category_id` jest podane - weryfikacja istnienia kategorii
2. Weryfikacja istnienia transakcji i przynależności do użytkownika
3. Przygotowanie obiektu update (tylko podane pola)
4. Wykonanie UPDATE w bazie
5. Pobranie i zwrócenie zaktualizowanej transakcji z nazwą kategorii

### Krok 3: Dodanie handlera PATCH

**Plik:** `src/pages/api/transactions/[id].ts`

Dodać eksport `PATCH: APIRoute`:

1. Walidacja nagłówka Authorization
2. Walidacja tokenu i pobranie użytkownika
3. Walidacja ID transakcji (`transactionIdSchema`)
4. Parsowanie i walidacja body (`updateTransactionSchema`)
5. Utworzenie `TransactionService` z autoryzowanym klientem
6. Wywołanie `updateTransaction()`
7. Obsługa błędów (TransactionNotFoundError, CategoryNotFoundError)
8. Zwrócenie zaktualizowanej transakcji (200)

### Krok 4: Testy

1. **Testy jednostkowe schematu:**
   - Walidacja każdego pola osobno
   - Walidacja kombinacji pól
   - Walidacja pustego body

2. **Testy integracyjne endpointu:**
   - Aktualizacja pojedynczego pola
   - Aktualizacja wszystkich pól
   - Zmiana kategorii na istniejącą
   - Zmiana kategorii na nieistniejącą
   - Aktualizacja cudzej transakcji (404)
   - Brak autoryzacji (401)
   - Nieprawidłowe dane (400)

# API Endpoint Implementation Plan: GET /api/transactions

## 1. Przegląd punktu końcowego

Endpoint GET /api/transactions umożliwia pobranie listy transakcji użytkownika z obsługą filtrowania, sortowania i paginacji. Transakcje są filtrowane po miesiącu (domyślnie bieżący miesiąc) i opcjonalnie po kategorii. Wyniki są zwracane z metadanymi paginacji umożliwiającymi nawigację po dużych zbiorach danych.

## 2. Szczegóły żądania

- **Metoda HTTP:** GET
- **Struktura URL:** `/api/transactions`
- **Nagłówki:**
  - `Authorization: Bearer <access_token>` (wymagany)
- **Parametry Query:**
  | Parametr | Typ | Wymagany | Domyślnie | Opis |
  |----------|-----|----------|-----------|------|
  | `month` | string | Nie | bieżący miesiąc | Filtr miesiąca w formacie YYYY-MM |
  | `category_id` | uuid | Nie | - | Filtr po ID kategorii |
  | `limit` | integer | Nie | 20 | Liczba rekordów do zwrócenia (1-100) |
  | `offset` | integer | Nie | 0 | Liczba rekordów do pominięcia |

## 3. Wykorzystywane typy

### Istniejące typy w `src/types.ts`:

```typescript
// DTO dla pojedynczej transakcji (linie 138-148)
interface TransactionDTO {
  id: string;
  amount: string;
  type: TransactionType;
  category_id: string;
  category_name: string;
  description: string;
  occurred_at: string;
  created_at: string;
  updated_at: string;
}

// DTO dla paginacji (linie 151-156)
interface PaginationDTO {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

// DTO dla listy transakcji (linie 159-162)
interface TransactionsListDTO {
  transactions: TransactionDTO[];
  pagination: PaginationDTO;
}

// Parametry query (linie 165-170)
interface TransactionsQueryParams {
  month?: string;
  category_id?: string;
  limit?: number;
  offset?: number;
}
```

### Nowy schemat walidacji do utworzenia:

```typescript
// src/lib/schemas/transaction.schema.ts
const transactionsQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Invalid month format. Use YYYY-MM")
    .optional(),
  category_id: z.string().uuid("Invalid category ID format").optional(),
  limit: z.coerce
    .number()
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .optional()
    .default(20),
  offset: z.coerce.number().int("Offset must be an integer").min(0, "Offset cannot be negative").optional().default(0),
});
```

## 4. Szczegóły odpowiedzi

### Sukces (200 OK):

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

### Błędy:

| Status | Kod błędu        | Opis                            |
| ------ | ---------------- | ------------------------------- |
| 400    | VALIDATION_ERROR | Nieprawidłowy format parametrów |
| 401    | UNAUTHORIZED     | Brak lub nieważny token         |
| 500    | INTERNAL_ERROR   | Nieoczekiwany błąd serwera      |

## 5. Przepływ danych

```
1. Żądanie GET /api/transactions
         ↓
2. Walidacja Authorization header
         ↓
3. Weryfikacja tokena przez Supabase Auth (getUser)
         ↓
4. Parsowanie i walidacja query params (Zod schema)
         ↓
5. Obliczenie zakresu dat dla filtra month
   - Jeśli brak month → użyj bieżącego miesiąca
   - Parsuj YYYY-MM na start/end w UTC
         ↓
6. TransactionService.getTransactions(params, userId)
   a) Buduj query Supabase:
      - SELECT z JOIN na categories
      - WHERE user_id = userId
      - WHERE occurred_at >= monthStart AND occurred_at < monthEnd
      - WHERE category_id = params.category_id (jeśli podany)
      - ORDER BY occurred_at DESC
   b) Wykonaj COUNT dla total
   c) Wykonaj SELECT z LIMIT/OFFSET
         ↓
7. Mapowanie wyników na TransactionDTO[]
         ↓
8. Budowanie TransactionsListDTO z PaginationDTO
         ↓
9. Zwróć Response 200 OK z JSON
```

## 6. Względy bezpieczeństwa

1. **Autoryzacja:**
   - Wymagany token Bearer w nagłówku Authorization
   - Walidacja tokena przez Supabase Auth API
   - RLS (Row Level Security) na poziomie bazy danych

2. **Izolacja danych:**
   - Wszystkie zapytania filtrowane po user_id
   - Użytkownik widzi tylko własne transakcje
   - category_id walidowany jako UUID, ale nie weryfikujemy przynależności do usera (RLS to zapewnia)

3. **Walidacja wejścia:**
   - Wszystkie parametry walidowane przez Zod
   - UUID sprawdzany regex'em
   - Limit ograniczony do 100 (zapobieganie DoS)
   - Format miesiąca ściśle walidowany

4. **SQL Injection:**
   - Supabase Query Builder sanityzuje parametry
   - Brak raw SQL queries

## 7. Obsługa błędów

| Scenariusz                         | Status | Kod              | Wiadomość                         |
| ---------------------------------- | ------ | ---------------- | --------------------------------- |
| Brak nagłówka Authorization        | 401    | UNAUTHORIZED     | No valid session                  |
| Token nie zaczyna się od "Bearer " | 401    | UNAUTHORIZED     | No valid session                  |
| Nieważny/wygasły token             | 401    | UNAUTHORIZED     | No valid session                  |
| Nieprawidłowy format month         | 400    | VALIDATION_ERROR | Invalid month format. Use YYYY-MM |
| Nieprawidłowy format category_id   | 400    | VALIDATION_ERROR | Invalid category ID format        |
| limit < 1 lub > 100                | 400    | VALIDATION_ERROR | Limit must be between 1 and 100   |
| offset < 0                         | 400    | VALIDATION_ERROR | Offset cannot be negative         |
| Błąd bazy danych                   | 500    | INTERNAL_ERROR   | An unexpected error occurred      |

## 8. Rozważania dotyczące wydajności

1. **Indeksy bazodanowe:**
   - Zapewnić indeks na `transactions(user_id, occurred_at DESC)`
   - Zapewnić indeks na `transactions(user_id, category_id)`

2. **Paginacja:**
   - Limit maksymalnie 100 rekordów
   - Offset-based pagination (wystarczająca dla MVP)
   - Rozważyć cursor-based pagination w przyszłości dla dużych zbiorów

3. **Optymalizacja zapytań:**
   - Pojedyncze zapytanie z JOIN zamiast N+1
   - COUNT wykonywany osobno (nie COUNT(\*) OVER())

4. **Buforowanie:**
   - Brak - dane są dynamiczne i specyficzne dla użytkownika

## 9. Etapy wdrożenia

### Krok 1: Dodaj schemat walidacji query params

Plik: `src/lib/schemas/transaction.schema.ts`

Dodaj eksport `transactionsQuerySchema` z walidacją:

- month: regex YYYY-MM, opcjonalny
- category_id: UUID, opcjonalny
- limit: integer 1-100, domyślnie 20
- offset: integer >= 0, domyślnie 0

### Krok 2: Dodaj metodę getTransactions do TransactionService

Plik: `src/lib/services/transaction.service.ts`

Dodaj metodę:

```typescript
async getTransactions(
  params: TransactionsQueryParams,
  userId: string
): Promise<TransactionsListDTO>
```

Implementacja:

1. Oblicz zakres dat dla month (lub bieżący miesiąc)
2. Zbuduj query z filtrami
3. Wykonaj count query dla total
4. Wykonaj select query z limit/offset
5. Mapuj wyniki na TransactionDTO[]
6. Zwróć TransactionsListDTO z paginacją

### Krok 3: Dodaj handler GET w route

Plik: `src/pages/api/transactions/index.ts`

Dodaj eksport `GET: APIRoute`:

1. Waliduj Authorization header
2. Pobierz user z tokena
3. Parsuj query params z URL
4. Waliduj params przez transactionsQuerySchema
5. Wywołaj TransactionService.getTransactions()
6. Zwróć Response 200 z JSON

### Krok 4: Testy manualne

Przetestuj następujące scenariusze:

- Bez parametrów (domyślny miesiąc, limit 20)
- Z konkretnym month
- Z konkretnym category_id
- Z różnymi wartościami limit/offset
- Bez tokena (401)
- Z nieważnym tokenem (401)
- Z nieprawidłowym formatem month (400)
- Z nieprawidłowym UUID dla category_id (400)

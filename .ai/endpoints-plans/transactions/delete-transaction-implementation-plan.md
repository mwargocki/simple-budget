# API Endpoint Implementation Plan: DELETE /api/transactions/{id}

## 1. Przegląd punktu końcowego

Endpoint służy do usuwania istniejącej transakcji użytkownika. Usuwa transakcję z bazy danych po weryfikacji, że transakcja istnieje i należy do uwierzytelnionego użytkownika. Operacja jest nieodwracalna.

## 2. Szczegóły żądania

- **Metoda HTTP:** DELETE
- **Struktura URL:** `/api/transactions/{id}`
- **Parametry:**
  - **Wymagane:**
    - `id` (path parameter) - UUID transakcji do usunięcia
  - **Opcjonalne:** brak
- **Request Headers:**
  - `Authorization: Bearer <access_token>` (wymagane)
- **Request Body:** brak

## 3. Wykorzystywane typy

### Istniejące typy z `src/types.ts`:

```typescript
/** Response after successful transaction deletion */
export interface DeleteTransactionResponseDTO {
  message: string;
}

/** Standard error response wrapper */
export interface ErrorResponseDTO {
  error: ErrorDTO;
}
```

### Istniejące klasy błędów z `src/lib/services/transaction.service.ts`:

```typescript
export class TransactionNotFoundError extends Error
```

### Schemat walidacji z `src/lib/schemas/transaction.schema.ts`:

```typescript
transactionIdSchema; // walidacja UUID
```

## 4. Szczegóły odpowiedzi

### Sukces (200 OK):

```json
{
  "message": "Transaction deleted successfully"
}
```

### Błędy:

| Status | Kod błędu        | Opis                                                     |
| ------ | ---------------- | -------------------------------------------------------- |
| 400    | VALIDATION_ERROR | Nieprawidłowy format UUID                                |
| 401    | UNAUTHORIZED     | Brak lub nieprawidłowy token autoryzacji                 |
| 404    | NOT_FOUND        | Transakcja nie istnieje lub należy do innego użytkownika |
| 500    | INTERNAL_ERROR   | Nieoczekiwany błąd serwera                               |

## 5. Przepływ danych

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐     ┌──────────────┐
│   Klient HTTP   │────▶│  API Route       │────▶│ TransactionService  │────▶│   Supabase   │
│                 │     │  [id].ts DELETE  │     │ deleteTransaction() │     │   Database   │
└─────────────────┘     └──────────────────┘     └─────────────────────┘     └──────────────┘
                               │                         │
                               ▼                         ▼
                        1. Walidacja tokena       4. Sprawdzenie czy
                        2. Walidacja UUID            transakcja istnieje
                        3. Wywołanie serwisu         i należy do użytkownika
                                                  5. Usunięcie transakcji
```

1. Klient wysyła żądanie DELETE z tokenem Bearer
2. Endpoint waliduje token autoryzacji poprzez `supabase.auth.getUser()`
3. Endpoint waliduje format UUID parametru `id`
4. `TransactionService.deleteTransaction()` sprawdza istnienie transakcji i przynależność do użytkownika
5. Transakcja jest usuwana z bazy danych
6. Zwracana jest odpowiedź 200 z komunikatem sukcesu

## 6. Względy bezpieczeństwa

1. **Uwierzytelnianie:**
   - Wymagany nagłówek `Authorization` z tokenem Bearer
   - Token weryfikowany przez Supabase Auth (`getUser()`)

2. **Autoryzacja:**
   - Transakcja może być usunięta tylko przez właściciela
   - Filtrowanie po `user_id` w zapytaniu DELETE zapewnia izolację danych
   - RLS (Row Level Security) w Supabase zapewnia dodatkową warstwę ochrony

3. **Walidacja danych wejściowych:**
   - UUID walidowany przez schemat Zod przed wykonaniem operacji

4. **Bezpieczeństwo operacji:**
   - Użycie `createSupabaseClientWithAuth(token)` zapewnia propagację kontekstu użytkownika

## 7. Obsługa błędów

| Scenariusz                              | Kod HTTP | Kod błędu        | Komunikat                     |
| --------------------------------------- | -------- | ---------------- | ----------------------------- |
| Brak nagłówka Authorization             | 401      | UNAUTHORIZED     | No valid session              |
| Nieprawidłowy token                     | 401      | UNAUTHORIZED     | No valid session              |
| Nieprawidłowy format UUID               | 400      | VALIDATION_ERROR | Invalid transaction ID format |
| Transakcja nie istnieje                 | 404      | NOT_FOUND        | Transaction not found         |
| Transakcja należy do innego użytkownika | 404      | NOT_FOUND        | Transaction not found         |
| Błąd bazy danych                        | 500      | INTERNAL_ERROR   | An unexpected error occurred  |

Uwaga: Celowo używamy tego samego komunikatu "Transaction not found" zarówno gdy transakcja nie istnieje, jak i gdy należy do innego użytkownika, aby uniknąć wycieków informacji (enumeration attack).

## 8. Rozważania dotyczące wydajności

1. **Pojedyncze zapytanie bazodanowe:**
   - Operacja DELETE z warunkami `id` i `user_id` wykonuje się w jednym zapytaniu
   - Brak konieczności osobnego sprawdzania istnienia transakcji

2. **Indeksy:**
   - Klucz główny na `id` zapewnia szybkie wyszukiwanie
   - Indeks na `user_id` wspiera filtrowanie

3. **Brak JOIN-ów:**
   - Usunięcie transakcji nie wymaga dołączania innych tabel

## 9. Etapy wdrożenia

### Krok 1: Dodanie metody `deleteTransaction` do `TransactionService`

Plik: `src/lib/services/transaction.service.ts`

```typescript
async deleteTransaction(transactionId: string, userId: string): Promise<void> {
  const { data, error } = await this.supabase
    .from("transactions")
    .delete()
    .eq("id", transactionId)
    .eq("user_id", userId)
    .select("id")
    .single();

  if (error || !data) {
    throw new TransactionNotFoundError();
  }
}
```

**Szczegóły implementacji:**

- Używamy `.select("id").single()` aby sprawdzić czy rekord został usunięty
- Jeśli nie znaleziono rekordu do usunięcia, zwracany jest błąd
- Metoda rzuca `TransactionNotFoundError` gdy transakcja nie istnieje lub nie należy do użytkownika

### Krok 2: Dodanie handlera DELETE do `[id].ts`

Plik: `src/pages/api/transactions/[id].ts`

1. Dodać import `DeleteTransactionResponseDTO` do istniejących importów
2. Dodać eksport funkcji `DELETE: APIRoute`

**Struktura handlera:**

```typescript
export const DELETE: APIRoute = async ({ params, request, locals }) => {
  try {
    // 1. Walidacja nagłówka Authorization
    // 2. Walidacja tokena przez getUser()
    // 3. Walidacja parametru id (UUID)
    // 4. Wywołanie transactionService.deleteTransaction()
    // 5. Zwrócenie odpowiedzi 200
  } catch (error) {
    // Obsługa TransactionNotFoundError -> 404
    // Obsługa nieoczekiwanych błędów -> 500
  }
};
```

### Krok 3: Testy

1. **Test pozytywny:** Usunięcie istniejącej transakcji użytkownika
2. **Test 401:** Brak nagłówka Authorization
3. **Test 401:** Nieprawidłowy token
4. **Test 400:** Nieprawidłowy format UUID (np. "invalid-uuid")
5. **Test 404:** Transakcja nie istnieje
6. **Test 404:** Transakcja należy do innego użytkownika

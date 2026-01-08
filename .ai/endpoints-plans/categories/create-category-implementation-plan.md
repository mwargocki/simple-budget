# API Endpoint Implementation Plan: POST /api/categories

## 1. Przegląd punktu końcowego

Endpoint służy do tworzenia nowej kategorii dla zalogowanego użytkownika. Kategorie są używane do klasyfikowania transakcji finansowych. Każdy użytkownik może tworzyć własne kategorie, które są unikalne w ramach jego konta (case-insensitive). Nowo utworzone kategorie są zawsze niestandardowe (`is_system = false`).

## 2. Szczegóły żądania

- **Metoda HTTP:** POST
- **Struktura URL:** `/api/categories`
- **Nagłówki:**
  - `Authorization: Bearer <access_token>` (wymagany)
  - `Content-Type: application/json`
- **Parametry:**
  - Wymagane: brak (w URL)
  - Opcjonalne: brak
- **Request Body:**
  ```json
  {
    "name": "Transport"
  }
  ```

### Walidacja pola `name`:
| Reguła | Komunikat błędu |
|--------|-----------------|
| Pole wymagane | "Name is required" |
| Typ string | "Name must be a string" |
| Niepuste po trim | "Name cannot be empty or whitespace-only" |
| Max 40 znaków | "Name must not exceed 40 characters" |
| Brak wiodących/końcowych spacji | "Name must not have leading or trailing spaces" |

## 3. Wykorzystywane typy

### Istniejące typy (src/types.ts):
- `CreateCategoryCommand` - komenda tworzenia kategorii (linie 112-114)
- `CategoryDTO` - DTO zwracanej kategorii (linia 104)
- `ErrorResponseDTO` - struktura odpowiedzi błędu
- `ErrorDetailDTO` - szczegóły błędu walidacji

### Nowy schemat walidacji (src/lib/schemas/category.schema.ts):
```typescript
import { z } from "zod";

export const createCategorySchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .min(1, "Name cannot be empty")
    .max(40, "Name must not exceed 40 characters")
    .refine((val) => val.trim().length > 0, {
      message: "Name cannot be empty or whitespace-only",
    })
    .refine((val) => val === val.trim(), {
      message: "Name must not have leading or trailing spaces",
    }),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
```

## 4. Szczegóły odpowiedzi

### Sukces (201 Created):
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

### Błąd walidacji (400 Bad Request):
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "name",
        "message": "Name must not exceed 40 characters"
      }
    ]
  }
}
```

### Brak autoryzacji (401 Unauthorized):
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "No valid session"
  }
}
```

### Konflikt nazwy (409 Conflict):
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Category with this name already exists"
  }
}
```

### Błąd serwera (500 Internal Server Error):
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

## 5. Przepływ danych

```
┌─────────────────┐
│  Klient HTTP    │
└────────┬────────┘
         │ POST /api/categories
         │ Authorization: Bearer <token>
         │ Body: { "name": "..." }
         ▼
┌─────────────────┐
│  API Route      │
│  (categories/   │
│   index.ts)     │
└────────┬────────┘
         │ 1. Walidacja nagłówka Authorization
         │ 2. Walidacja tokena (supabase.auth.getUser)
         │ 3. Walidacja body (Zod schema)
         ▼
┌─────────────────┐
│ CategoryService │
│ .createCategory │
└────────┬────────┘
         │ 4. INSERT do tabeli categories
         │    (RLS automatycznie przypisuje user_id)
         ▼
┌─────────────────┐
│   Supabase      │
│   PostgreSQL    │
│   (RLS enabled) │
└────────┬────────┘
         │ 5. Zwrot utworzonego rekordu
         ▼
┌─────────────────┐
│  Odpowiedź API  │
│  201 + CategoryDTO
└─────────────────┘
```

## 6. Względy bezpieczeństwa

1. **Autoryzacja:**
   - Wymagany Bearer token w nagłówku Authorization
   - Token walidowany przez `supabase.auth.getUser(token)`
   - Brak tokena lub nieprawidłowy token → 401

2. **Row Level Security (RLS):**
   - Tabela `categories` ma włączone RLS
   - Polityka INSERT pozwala tylko na tworzenie kategorii dla własnego user_id
   - user_id jest automatycznie ustawiany przez RLS/trigger na `auth.uid()`

3. **Walidacja danych wejściowych:**
   - Schemat Zod waliduje wszystkie dane przed zapisem
   - Zabezpieczenie przed injection przez parametryzowane zapytania Supabase

4. **Unikalność nazwy:**
   - Constraint UNIQUE (user_id, name) w bazie danych
   - Typ `citext` zapewnia case-insensitive porównanie

## 7. Obsługa błędów

| Scenariusz | Kod HTTP | Kod błędu | Komunikat |
|------------|----------|-----------|-----------|
| Brak nagłówka Authorization | 401 | UNAUTHORIZED | No valid session |
| Nieprawidłowy token | 401 | UNAUTHORIZED | No valid session |
| Puste body lub brak pola name | 400 | VALIDATION_ERROR | Validation failed + details |
| Nazwa pusta lub tylko whitespace | 400 | VALIDATION_ERROR | Validation failed + details |
| Nazwa > 40 znaków | 400 | VALIDATION_ERROR | Validation failed + details |
| Nazwa ze spacjami na początku/końcu | 400 | VALIDATION_ERROR | Validation failed + details |
| Kategoria o tej nazwie już istnieje | 409 | CONFLICT | Category with this name already exists |
| Błąd bazy danych (inny) | 500 | INTERNAL_ERROR | An unexpected error occurred |

### Wykrywanie konfliktu nazwy:
Supabase zwraca błąd z kodem `23505` (unique_violation) gdy próbujemy wstawić duplikat. Należy to sprawdzić w catch block:
```typescript
if (error.code === "23505") {
  // unique constraint violation - kategoria już istnieje
}
```

## 8. Rozważania dotyczące wydajności

1. **Indeksy:**
   - UNIQUE constraint na `(user_id, name)` automatycznie tworzy indeks
   - Wyszukiwanie duplikatów jest O(log n)

2. **Optymalizacja zapytania:**
   - Pojedynczy INSERT z RETURNING - jedno roundtrip do bazy
   - Brak potrzeby osobnego SELECT po INSERT

3. **Rozmiar odpowiedzi:**
   - Minimalna odpowiedź - tylko utworzony obiekt
   - Brak nadmiarowych danych

## 9. Etapy wdrożenia

### Krok 1: Utworzenie schematu walidacji
Utworzyć plik `src/lib/schemas/category.schema.ts`:
- Zdefiniować `createCategorySchema` z walidacją pola `name`
- Eksportować typ `CreateCategoryInput`

### Krok 2: Rozszerzenie CategoryService
W pliku `src/lib/services/category.service.ts` dodać metodę:
```typescript
async createCategory(command: CreateCategoryCommand): Promise<CategoryDTO> {
  const { data, error } = await this.supabase
    .from("categories")
    .insert({ name: command.name })
    .select("id, name, is_system, system_key, created_at, updated_at")
    .single();

  if (error) {
    throw error;
  }

  return data as CategoryDTO;
}
```

### Krok 3: Dodanie handlera POST w route
W pliku `src/pages/api/categories/index.ts` dodać eksport `POST`:
1. Walidacja nagłówka Authorization (jak w GET)
2. Walidacja tokena przez `locals.supabase.auth.getUser(token)`
3. Parsowanie body JSON
4. Walidacja body przez `createCategorySchema.safeParse(body)`
5. Utworzenie `CategoryService` z autoryzowanym klientem
6. Wywołanie `categoryService.createCategory(validatedData)`
7. Obsługa błędów:
   - Błąd walidacji Zod → 400
   - Błąd unique constraint (code 23505) → 409
   - Inny błąd → 500
8. Zwrot 201 z CategoryDTO

### Krok 4: Testy manualne
Przetestować endpoint za pomocą curl:
```bash
# Sukces
curl -X POST http://localhost:4321/api/categories \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Transport"}'

# Błąd walidacji - pusta nazwa
curl -X POST http://localhost:4321/api/categories \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": ""}'

# Błąd walidacji - za długa nazwa
curl -X POST http://localhost:4321/api/categories \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "aaaaaaaaaabbbbbbbbbbccccccccccddddddddddeeeee"}'

# Konflikt - duplikat nazwy
curl -X POST http://localhost:4321/api/categories \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Transport"}'

# Brak autoryzacji
curl -X POST http://localhost:4321/api/categories \
  -H "Content-Type: application/json" \
  -d '{"name": "Test"}'
```

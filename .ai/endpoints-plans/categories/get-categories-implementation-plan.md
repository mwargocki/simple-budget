# API Endpoint Implementation Plan: GET /api/categories

## 1. Przegląd punktu końcowego

Endpoint `GET /api/categories` zwraca listę wszystkich kategorii należących do zalogowanego użytkownika. Kategorie są sortowane alfabetycznie po nazwie. Lista zawiera zarówno kategorię systemową "Brak" (system_key='none'), jak i kategorie utworzone przez użytkownika.

## 2. Szczegóły żądania

- **Metoda HTTP**: GET
- **Struktura URL**: `/api/categories`
- **Parametry**:
  - **Wymagane**: Brak parametrów URL/query
  - **Opcjonalne**: Brak
- **Request Headers**:
  - `Authorization: Bearer <access_token>` (wymagany)
- **Request Body**: Brak (metoda GET)

## 3. Wykorzystywane typy

### Istniejące typy z `src/types.ts`:

```typescript
/** Category data transfer object - excludes user_id for security */
export type CategoryDTO = Omit<CategoryRow, "user_id">;

/** Response containing list of categories */
export interface CategoriesListDTO {
  categories: CategoryDTO[];
}

/** Standard error response wrapper */
export interface ErrorResponseDTO {
  error: ErrorDTO;
}
```

### Struktura CategoryDTO:

```typescript
{
  id: string;           // UUID kategorii
  name: string;         // Nazwa kategorii (citext, 1-40 znaków)
  is_system: boolean;   // Czy kategoria systemowa
  system_key: string | null;  // Klucz systemowy (np. 'none')
  created_at: string;   // Timestamp utworzenia
  updated_at: string;   // Timestamp ostatniej modyfikacji
}
```

## 4. Szczegóły odpowiedzi

### Sukces (200 OK):

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

### Błąd autoryzacji (401 Unauthorized):

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "No valid session"
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

1. **Żądanie HTTP** → Endpoint `/api/categories`
2. **Middleware** → Dodaje `supabase` client do `context.locals`
3. **Endpoint** → Weryfikuje sesję użytkownika przez `supabase.auth.getUser()`
4. **CategoryService** → Pobiera kategorie z bazy danych
5. **Supabase RLS** → Filtruje kategorie tylko dla danego user_id
6. **Sortowanie** → Kategorie sortowane alfabetycznie po nazwie
7. **Mapowanie** → Usunięcie pola `user_id` z odpowiedzi (przez typ CategoryDTO)
8. **Odpowiedź** → JSON z listą kategorii

```
Client Request
     ↓
[GET /api/categories]
     ↓
[Middleware: supabase client injection]
     ↓
[Endpoint: Auth verification]
     ↓
[CategoryService.getCategories()]
     ↓
[Supabase Query with RLS]
     ↓
[Response: CategoriesListDTO]
```

## 6. Względy bezpieczeństwa

### Uwierzytelnianie:
- Wymagana ważna sesja użytkownika
- Weryfikacja tokenu przez `supabase.auth.getUser()`
- Brak sesji → 401 Unauthorized

### Autoryzacja:
- Row Level Security (RLS) w Supabase zapewnia, że użytkownik widzi tylko swoje kategorie
- Polityka RLS: `user_id = auth.uid()`

### Ochrona danych:
- Pole `user_id` jest usuwane z odpowiedzi (CategoryDTO = Omit<CategoryRow, "user_id">)
- Brak możliwości dostępu do kategorii innych użytkowników

### Walidacja:
- Brak danych wejściowych do walidacji (GET bez parametrów)
- Walidacja odbywa się tylko na poziomie autoryzacji

## 7. Obsługa błędów

| Scenariusz | Kod HTTP | Kod błędu | Wiadomość |
|------------|----------|-----------|-----------|
| Brak tokenu/sesji | 401 | UNAUTHORIZED | No valid session |
| Nieprawidłowy/wygasły token | 401 | UNAUTHORIZED | No valid session |
| Błąd zapytania do bazy | 500 | INTERNAL_ERROR | An unexpected error occurred |
| Nieoczekiwany błąd | 500 | INTERNAL_ERROR | An unexpected error occurred |

### Logowanie błędów:
- Błędy 500 powinny być logowane po stronie serwera dla debugowania
- Nie ujawniać szczegółów błędów bazy danych w odpowiedzi klienta

## 8. Rozważania dotyczące wydajności

### Optymalizacja zapytań:
- Pojedyncze zapytanie do tabeli `categories`
- Sortowanie po stronie bazy danych (`ORDER BY name ASC`)
- Indeks na `(user_id, name)` już istnieje (UNIQUE constraint)

### Rozważania:
- Brak paginacji - zakładamy rozsądną liczbę kategorii per użytkownik (< 100)
- Brak cachowania - dane kategorii mogą się często zmieniać
- RLS zapewnia efektywne filtrowanie na poziomie bazy

### Potencjalne ulepszenia (przyszłość):
- Dodanie paginacji jeśli liczba kategorii znacząco wzrośnie
- Cache po stronie klienta z invalidacją przy zmianach

## 9. Etapy wdrożenia

### Krok 1: Utworzenie serwisu CategoryService

Utworzyć plik `src/lib/services/category.service.ts`:

```typescript
import type { SupabaseClient } from "../../db/supabase.client";
import type { CategoriesListDTO, CategoryDTO } from "../../types";

export class CategoryService {
  constructor(private supabase: SupabaseClient) {}

  async getCategories(): Promise<CategoriesListDTO> {
    const { data, error } = await this.supabase
      .from("categories")
      .select("id, name, is_system, system_key, created_at, updated_at")
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    return {
      categories: (data ?? []) as CategoryDTO[],
    };
  }
}
```

### Krok 2: Utworzenie endpointu API

Utworzyć plik `src/pages/api/categories/index.ts`:

```typescript
import type { APIRoute } from "astro";
import { CategoryService } from "../../../lib/services/category.service";
import type { CategoriesListDTO, ErrorResponseDTO } from "../../../types";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  try {
    // Verify user authentication
    const { data: { user }, error: authError } = await locals.supabase.auth.getUser();

    if (authError || !user) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "UNAUTHORIZED",
          message: "No valid session",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const categoryService = new CategoryService(locals.supabase);
    const result: CategoriesListDTO = await categoryService.getCategories();

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching categories:", error);

    const errorResponse: ErrorResponseDTO = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
```

### Krok 3: Weryfikacja typów i testowanie

1. Sprawdzić czy typy `CategoryDTO` i `CategoriesListDTO` są poprawnie zdefiniowane w `src/types.ts`
2. Uruchomić `npm run lint` aby sprawdzić błędy TypeScript
3. Przetestować endpoint:
   - Bez tokenu → 401
   - Z ważnym tokenem → 200 + lista kategorii
   - Sprawdzić sortowanie alfabetyczne
   - Sprawdzić czy `user_id` nie jest zwracane w odpowiedzi

### Krok 4: Testy manualne

```bash
# Test bez autoryzacji
curl -X GET http://localhost:4321/api/categories

# Test z autoryzacją (po zalogowaniu)
curl -X GET http://localhost:4321/api/categories \
  -H "Authorization: Bearer <access_token>"
```

### Struktura plików po implementacji:

```
src/
├── lib/
│   └── services/
│       ├── auth.service.ts      # istniejący
│       └── category.service.ts  # nowy
├── pages/
│   └── api/
│       ├── auth/                # istniejące endpointy
│       └── categories/
│           └── index.ts         # nowy endpoint GET
└── types.ts                     # istniejące typy (bez zmian)
```

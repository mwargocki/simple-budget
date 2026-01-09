# API Endpoint Implementation Plan: POST /api/auth/register

## 1. Przegląd punktu końcowego

Endpoint służy do rejestracji nowego konta użytkownika w systemie SimpleBudget. Wykorzystuje Supabase Auth do zarządzania tożsamością użytkowników. Po pomyślnej rejestracji zwraca podstawowe dane użytkownika (id i email).

## 2. Szczegóły żądania

- **Metoda HTTP:** POST
- **Struktura URL:** `/api/auth/register`
- **Parametry:**
  - Wymagane: brak (wszystkie dane w body)
  - Opcjonalne: brak
- **Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "passwordConfirm": "securePassword123"
}
```

## 3. Wykorzystywane typy

### Command Model (wejście)

```typescript
// src/types.ts - już zdefiniowany
interface RegisterCommand {
  email: string;
  password: string;
  passwordConfirm: string;
}
```

### DTO (wyjście)

```typescript
// src/types.ts - już zdefiniowany
interface RegisterResponseDTO {
  user: {
    id: string;
    email: string;
  };
}
```

### Typy błędów

```typescript
// src/types.ts - już zdefiniowane
type ErrorCode = "VALIDATION_ERROR" | "CONFLICT" | "INTERNAL_ERROR";

interface ErrorDetailDTO {
  field: string;
  message: string;
}

interface ErrorDTO {
  code: ErrorCode;
  message: string;
  details?: ErrorDetailDTO[];
}

interface ErrorResponseDTO {
  error: ErrorDTO;
}
```

## 4. Szczegóły odpowiedzi

### Sukces (201 Created)

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

### Błędy walidacji (400 Bad Request)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "email", "message": "Invalid email format" },
      { "field": "passwordConfirm", "message": "Passwords do not match" }
    ]
  }
}
```

### Konflikt (409 Conflict)

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Email already registered"
  }
}
```

### Błąd serwera (500 Internal Server Error)

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
│   HTTP Request  │
│   POST /api/    │
│   auth/register │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Zod Validation │
│  - email format │
│  - password     │
│    strength     │
│  - passwords    │
│    match        │
└────────┬────────┘
         │ (walidacja OK)
         ▼
┌─────────────────┐
│   AuthService   │
│   register()    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Supabase Auth  │
│  signUp()       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  HTTP Response  │
│  201 Created    │
└─────────────────┘
```

## 6. Względy bezpieczeństwa

### Walidacja danych wejściowych

1. **Email:** Walidacja formatu za pomocą Zod (`z.string().email()`)
2. **Hasło:** Minimalna długość 8 znaków, wymagane różne typy znaków
3. **Potwierdzenie hasła:** Musi być identyczne z hasłem (refine w Zod)

### Ochrona przed atakami

1. **Rate limiting:** Rozważyć implementację na poziomie middleware (przyszła iteracja)
2. **Email enumeration:** Supabase domyślnie zwraca ten sam komunikat niezależnie czy email istnieje (konfigurowalny)
3. **SQL Injection:** Nie dotyczy - Supabase Auth obsługuje to wewnętrznie
4. **XSS:** Dane są walidowane i nie są renderowane w HTML

### Hasło

- Minimalna długość: 8 znaków
- Hasło nie jest logowane ani zwracane w odpowiedzi
- Supabase przechowuje hasła w bezpieczny sposób (bcrypt)

## 7. Obsługa błędów

| Scenariusz               | Kod HTTP | ErrorCode        | Wiadomość                              |
| ------------------------ | -------- | ---------------- | -------------------------------------- |
| Niepoprawny format email | 400      | VALIDATION_ERROR | Invalid email format                   |
| Hasło za krótkie         | 400      | VALIDATION_ERROR | Password must be at least 8 characters |
| Hasła nie są zgodne      | 400      | VALIDATION_ERROR | Passwords do not match                 |
| Email już zarejestrowany | 409      | CONFLICT         | Email already registered               |
| Błąd Supabase Auth       | 500      | INTERNAL_ERROR   | An unexpected error occurred           |

### Mapowanie błędów Supabase

```typescript
// Błędy Supabase Auth do mapowania:
// - "User already registered" → 409 CONFLICT
// - "Invalid email" → 400 VALIDATION_ERROR
// - Inne → 500 INTERNAL_ERROR
```

## 8. Rozważania dotyczące wydajności

1. **Walidacja Zod:** Wykonywana synchronicznie, minimalne obciążenie
2. **Supabase Auth:** Zewnętrzne wywołanie API - główne źródło latencji
3. **Brak cache:** Endpoint rejestracji nie wymaga cache'owania
4. **Optymalizacje:**
   - Early return przy błędach walidacji (przed wywołaniem Supabase)
   - Brak zbędnych operacji bazodanowych

## 9. Etapy wdrożenia

### Krok 1: Utworzenie schematu walidacji Zod

Utworzyć plik `src/lib/schemas/auth.schema.ts`:

```typescript
import { z } from "zod";

export const registerSchema = z
  .object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwords do not match",
    path: ["passwordConfirm"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
```

### Krok 2: Utworzenie serwisu AuthService

Utworzyć plik `src/lib/services/auth.service.ts`:

```typescript
import type { SupabaseClient } from "../../db/supabase.client";
import type { RegisterCommand, RegisterResponseDTO } from "../../types";

export class AuthService {
  constructor(private supabase: SupabaseClient) {}

  async register(command: RegisterCommand): Promise<RegisterResponseDTO> {
    const { data, error } = await this.supabase.auth.signUp({
      email: command.email,
      password: command.password,
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error("User creation failed");
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email!,
      },
    };
  }
}
```

### Krok 3: Utworzenie endpointu API

Utworzyć plik `src/pages/api/auth/register.ts`:

```typescript
import type { APIRoute } from "astro";
import { registerSchema } from "../../../lib/schemas/auth.schema";
import { AuthService } from "../../../lib/services/auth.service";
import type { RegisterResponseDTO, ErrorResponseDTO } from "../../../types";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Parse JSON body
    const body = await request.json();

    // 2. Validate input
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: validation.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Register user
    const authService = new AuthService(locals.supabase);
    const result: RegisterResponseDTO = await authService.register(validation.data);

    // 4. Return success response
    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // 5. Handle Supabase errors
    if (error instanceof Error) {
      if (error.message.includes("already registered")) {
        const errorResponse: ErrorResponseDTO = {
          error: {
            code: "CONFLICT",
            message: "Email already registered",
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // 6. Handle unexpected errors
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

### Krok 4: Struktura katalogów

Upewnić się, że istnieją następujące katalogi:

- `src/pages/api/auth/`
- `src/lib/services/`
- `src/lib/schemas/`

### Krok 5: Testy

Utworzyć testy jednostkowe i integracyjne:

1. **Testy schematu walidacji:**
   - Poprawne dane wejściowe
   - Niepoprawny email
   - Hasło za krótkie
   - Hasła nie są zgodne

2. **Testy AuthService:**
   - Pomyślna rejestracja (mock Supabase)
   - Błąd - użytkownik już istnieje
   - Błąd serwera Supabase

3. **Testy integracyjne endpointu:**
   - 201 dla poprawnej rejestracji
   - 400 dla błędów walidacji
   - 409 dla duplikatu email

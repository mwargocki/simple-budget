# API Endpoint Implementation Plan: Change Password

## 1. Przegląd punktu końcowego

Endpoint umożliwia zalogowanemu użytkownikowi zmianę hasła. Wymaga weryfikacji aktualnego hasła przed ustawieniem nowego. Jest to operacja wrażliwa pod względem bezpieczeństwa, wymagająca ważnej sesji użytkownika.

## 2. Szczegóły żądania

- **Metoda HTTP**: POST
- **Struktura URL**: `/api/auth/change-password`
- **Nagłówki**:
  - `Authorization: Bearer <access_token>` (wymagany)
  - `Content-Type: application/json`
- **Parametry**:
  - **Wymagane**: brak (wszystkie dane w body)
  - **Opcjonalne**: brak
- **Request Body**:
  ```json
  {
    "currentPassword": "string",
    "newPassword": "string",
    "newPasswordConfirm": "string"
  }
  ```

## 3. Wykorzystywane typy

### Istniejące typy w `src/types.ts`

```typescript
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
```

### Nowy schemat Zod do dodania w `src/lib/schemas/auth.schema.ts`

```typescript
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    newPasswordConfirm: z.string(),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    message: "Passwords do not match",
    path: ["newPasswordConfirm"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
```

## 4. Szczegóły odpowiedzi

### Sukces (200 OK)

```json
{
  "message": "Password changed successfully"
}
```

### Błędy walidacji (400 Bad Request)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "newPasswordConfirm",
        "message": "Passwords do not match"
      }
    ]
  }
}
```

### Brak autoryzacji (401 Unauthorized)

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "No valid session"
  }
}
```

lub (przy błędnym aktualnym haśle):

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Current password is incorrect"
  }
}
```

## 5. Przepływ danych

```
┌─────────────────┐
│  Request        │
│  POST /api/auth/│
│  change-password│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Extract Bearer  │
│ Token           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Validate Token  │
│ (getUser)       │──── Invalid ──▶ 401 Unauthorized
└────────┬────────┘
         │ Valid
         ▼
┌─────────────────┐
│ Parse & Validate│
│ Request Body    │──── Invalid ──▶ 400 Validation Error
└────────┬────────┘
         │ Valid
         ▼
┌─────────────────┐
│ Verify Current  │
│ Password        │──── Wrong ────▶ 401 Unauthorized
│ (signInWithPwd) │
└────────┬────────┘
         │ Correct
         ▼
┌─────────────────┐
│ Update Password │
│ (updateUser)    │──── Error ────▶ 500 Internal Error
└────────┬────────┘
         │ Success
         ▼
┌─────────────────┐
│ 200 OK          │
│ Success message │
└─────────────────┘
```

## 6. Względy bezpieczeństwa

1. **Autoryzacja**: Wymaga ważnego tokenu Bearer w nagłówku Authorization
2. **Weryfikacja tożsamości**: Przed zmianą hasła należy zweryfikować aktualne hasło poprzez `signInWithPassword`
3. **Siła hasła**: Minimum 8 znaków (spójne z wymaganiami rejestracji)
4. **Różne hasła**: Nowe hasło musi różnić się od aktualnego
5. **Generyczne komunikaty błędów**: Nie ujawniamy szczegółów o kontach innych użytkowników
6. **Rate limiting**: Rozważyć implementację w przyszłości (poza zakresem tego planu)

## 7. Obsługa błędów

| Scenariusz                                     | Kod HTTP | Error Code       | Wiadomość                     |
| ---------------------------------------------- | -------- | ---------------- | ----------------------------- |
| Brak nagłówka Authorization                    | 401      | UNAUTHORIZED     | No valid session              |
| Nieprawidłowy/wygasły token                    | 401      | UNAUTHORIZED     | No valid session              |
| Błędy walidacji (hasła nie pasują, za krótkie) | 400      | VALIDATION_ERROR | Validation failed             |
| Nieprawidłowe aktualne hasło                   | 401      | UNAUTHORIZED     | Current password is incorrect |
| Nowe hasło identyczne z aktualnym              | 400      | VALIDATION_ERROR | Validation failed             |
| Błąd Supabase przy aktualizacji                | 500      | INTERNAL_ERROR   | An unexpected error occurred  |

## 8. Rozważania dotyczące wydajności

- Operacja wykonuje dwa wywołania do Supabase Auth:
  1. `getUser()` - walidacja tokenu
  2. `signInWithPassword()` - weryfikacja aktualnego hasła
  3. `updateUser()` - aktualizacja hasła
- Wszystkie operacje są I/O-bound i asynchroniczne
- Brak potrzeby cache'owania - operacja jednorazowa
- Potencjalne wąskie gardło: limity API Supabase Auth (1000 req/h na darmowym planie)

## 9. Etapy wdrożenia

### Krok 1: Dodanie schematu walidacji

Plik: `src/lib/schemas/auth.schema.ts`

Dodać `changePasswordSchema` z walidacją:

- `currentPassword` - wymagane, niepuste
- `newPassword` - wymagane, min. 8 znaków
- `newPasswordConfirm` - musi pasować do `newPassword`
- Refine: nowe hasło różne od aktualnego

### Krok 2: Rozszerzenie AuthService

Plik: `src/lib/services/auth.service.ts`

Dodać metodę `changePassword(command: ChangePasswordCommand, userEmail: string): Promise<ChangePasswordResponseDTO>`:

1. Zaimportować `ChangePasswordCommand` i `ChangePasswordResponseDTO` z types
2. Zweryfikować aktualne hasło przez `signInWithPassword` z podanym emailem
3. Zaktualizować hasło przez `updateUser({ password: command.newPassword })`
4. Zwrócić obiekt z komunikatem sukcesu

### Krok 3: Utworzenie endpointu API

Plik: `src/pages/api/auth/change-password.ts`

```typescript
import type { APIRoute } from "astro";
import { AuthApiError } from "@supabase/supabase-js";
import { changePasswordSchema } from "../../../lib/schemas/auth.schema";
import { AuthService } from "../../../lib/services/auth.service";
import type { ChangePasswordResponseDTO, ErrorResponseDTO } from "../../../types";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  // 1. Ekstrakcja i walidacja tokenu Bearer
  // 2. Pobranie użytkownika przez getUser(token)
  // 3. Parsowanie i walidacja body przez changePasswordSchema
  // 4. Wywołanie authService.changePassword()
  // 5. Obsługa błędów (AuthApiError → 401, inne → 500)
};
```

### Krok 4: Testowanie

1. Test bez nagłówka Authorization → 401
2. Test z nieprawidłowym tokenem → 401
3. Test z błędami walidacji → 400
4. Test z nieprawidłowym aktualnym hasłem → 401
5. Test z prawidłowymi danymi → 200
6. Test logowania z nowym hasłem → sukces

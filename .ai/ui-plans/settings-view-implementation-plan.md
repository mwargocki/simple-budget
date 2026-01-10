# Plan implementacji widoku Ustawienia

## 1. Przegląd

Widok Ustawienia (`/app/settings`) to strona pozwalająca użytkownikowi zarządzać podstawowymi ustawieniami konta w ramach MVP. Widok składa się z trzech sekcji:

- **Profil** - wyświetla e-mail użytkownika (tylko do odczytu)
- **Zmiana hasła** - formularz do zmiany hasła z walidacją
- **Usunięcie konta** - formularz potwierdzenia usunięcia konta

Widok jest dostępny tylko dla zalogowanych użytkowników i wymaga tokenu autoryzacyjnego do wykonania operacji.

## 2. Routing widoku

- **Ścieżka:** `/app/settings`
- **Plik:** `src/pages/app/settings.astro`
- **Wymagania:** Autoryzacja - tylko dla zalogowanych użytkowników (sprawdzenie sesji w Astro)

## 3. Struktura komponentów

```
settings.astro (strona Astro)
└── SettingsPage (React, client:load)
    ├── ProfileSection
    │   └── Card z e-mailem użytkownika (readonly)
    ├── ChangePasswordSection
    │   ├── ChangePasswordForm
    │   │   ├── Input (currentPassword)
    │   │   ├── Input (newPassword)
    │   │   ├── Input (newPasswordConfirm)
    │   │   ├── Alert (błąd ogólny)
    │   │   └── Button (submit)
    │   └── Card
    └── DeleteAccountSection
        ├── DeleteAccountForm
        │   ├── Input (confirmation)
        │   ├── Alert (błąd/ostrzeżenie)
        │   └── Button (destructive)
        └── Card
```

## 4. Szczegóły komponentów

### 4.1 SettingsPage

- **Opis:** Główny komponent strony ustawień, kontener dla wszystkich sekcji. Pobiera e-mail użytkownika z sesji i przekazuje go do sekcji profilu. Zarządza tokenem dostępu dla wywołań API.
- **Główne elementy:**
  - `<main>` z klasami layoutu
  - Nagłówek `<h1>` "Ustawienia"
  - `<ProfileSection>`
  - `<ChangePasswordSection>`
  - `<DeleteAccountSection>`
- **Obsługiwane interakcje:** Brak bezpośrednich - deleguje do komponentów dzieci
- **Obsługiwana walidacja:** Brak
- **Typy:**
  - `SettingsPageProps { userEmail: string; accessToken: string; }`
- **Propsy:**
  - `userEmail: string` - e-mail zalogowanego użytkownika
  - `accessToken: string` - token JWT do autoryzacji API

### 4.2 ProfileSection

- **Opis:** Sekcja wyświetlająca informacje o profilu użytkownika. W MVP pokazuje tylko e-mail (readonly). Pole timezone jest ukryte zgodnie z wymaganiami.
- **Główne elementy:**
  - `<Card>` z `<CardHeader>` i `<CardContent>`
  - `<CardTitle>` "Profil"
  - `<Label>` + tekst e-maila (nie input, tylko wyświetlenie)
- **Obsługiwane interakcje:** Brak (tylko wyświetlanie)
- **Obsługiwana walidacja:** Brak
- **Typy:**
  - `ProfileSectionProps { email: string; }`
- **Propsy:**
  - `email: string` - e-mail użytkownika do wyświetlenia

### 4.3 ChangePasswordSection

- **Opis:** Sekcja zawierająca formularz zmiany hasła. Opakowuje formularz w Card i zarządza komunikacją z API.
- **Główne elementy:**
  - `<Card>` z `<CardHeader>` i `<CardContent>`
  - `<CardTitle>` "Zmień hasło"
  - `<ChangePasswordForm>`
- **Obsługiwane interakcje:** Deleguje do ChangePasswordForm
- **Obsługiwana walidacja:** Deleguje do ChangePasswordForm
- **Typy:**
  - `ChangePasswordSectionProps { accessToken: string; }`
- **Propsy:**
  - `accessToken: string` - token do autoryzacji wywołania API

### 4.4 ChangePasswordForm

- **Opis:** Formularz zmiany hasła z trzema polami i inline walidacją. Używa hooka `useChangePasswordForm` do zarządzania stanem i logiką.
- **Główne elementy:**
  - `<form>` z `noValidate`
  - `<Alert>` dla błędu ogólnego (np. złe aktualne hasło)
  - `<Label>` + `<Input type="password">` dla currentPassword
  - `<Label>` + `<Input type="password">` dla newPassword
  - `<Label>` + `<Input type="password">` dla newPasswordConfirm
  - Komunikaty błędów walidacji pod każdym polem
  - `<Button type="submit">` "Zmień hasło"
- **Obsługiwane interakcje:**
  - `onChange` - aktualizacja wartości pól
  - `onBlur` - walidacja pojedynczego pola (dla newPassword i newPasswordConfirm)
  - `onSubmit` - walidacja całego formularza i wysłanie żądania
- **Obsługiwana walidacja:**
  - `currentPassword`: wymagane, min 1 znak
  - `newPassword`: wymagane, min 8 znaków, różne od currentPassword
  - `newPasswordConfirm`: wymagane, musi być identyczne z newPassword
- **Typy:**
  - `ChangePasswordFormProps { accessToken: string; onSuccess?: () => void; }`
  - `ChangePasswordFormState` (wewnętrzny)
  - `ChangePasswordFormErrors` (wewnętrzny)
- **Propsy:**
  - `accessToken: string` - token autoryzacyjny
  - `onSuccess?: () => void` - callback po udanej zmianie hasła

### 4.5 DeleteAccountSection

- **Opis:** Sekcja zawierająca formularz usunięcia konta z ostrzeżeniem i polem potwierdzenia.
- **Główne elementy:**
  - `<Card>` z `<CardHeader>` i `<CardContent>`
  - `<CardTitle>` "Usuń konto"
  - `<CardDescription>` z ostrzeżeniem o konsekwencjach
  - `<DeleteAccountForm>`
- **Obsługiwane interakcje:** Deleguje do DeleteAccountForm
- **Obsługiwana walidacja:** Deleguje do DeleteAccountForm
- **Typy:**
  - `DeleteAccountSectionProps { accessToken: string; }`
- **Propsy:**
  - `accessToken: string` - token do autoryzacji wywołania API

### 4.6 DeleteAccountForm

- **Opis:** Formularz usunięcia konta wymagający wpisania "DELETE" jako potwierdzenia. Bez dodatkowego modala - potwierdzenie przez wpisanie tekstu.
- **Główne elementy:**
  - `<form>` z `noValidate`
  - `<Alert variant="destructive">` z ostrzeżeniem
  - `<Label>` + `<Input>` dla confirmation
  - Komunikat błędu pod polem
  - `<Button variant="destructive">` "Usuń konto"
- **Obsługiwane interakcje:**
  - `onChange` - aktualizacja wartości pola confirmation
  - `onSubmit` - walidacja i wysłanie żądania DELETE
- **Obsługiwana walidacja:**
  - `confirmation`: musi być dokładnie "DELETE" (case-sensitive)
- **Typy:**
  - `DeleteAccountFormProps { accessToken: string; }`
  - `DeleteAccountFormState` (wewnętrzny)
  - `DeleteAccountFormErrors` (wewnętrzny)
- **Propsy:**
  - `accessToken: string` - token autoryzacyjny

## 5. Typy

### 5.1 Typy z API (istniejące w `src/types.ts`)

```typescript
// Command dla zmiany hasła
interface ChangePasswordCommand {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
}

// Response po udanej zmianie hasła
interface ChangePasswordResponseDTO {
  message: string;
}

// Command dla usunięcia konta
interface DeleteAccountCommand {
  confirmation: string;
}

// Response po udanym usunięciu konta
interface DeleteAccountResponseDTO {
  message: string;
}

// Standardowy response błędu
interface ErrorResponseDTO {
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetailDTO[];
  };
}
```

### 5.2 Typy walidacji (istniejące w `src/lib/schemas/auth.schema.ts`)

```typescript
// Schemat zmiany hasła (już zdefiniowany)
const changePasswordSchema = z.object({...}).refine(...);
type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// Schemat usunięcia konta (już zdefiniowany)
const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE")
});
type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
```

### 5.3 Nowe typy ViewModel dla komponentów

```typescript
// Stan formularza zmiany hasła
interface ChangePasswordFormState {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
  isSubmitting: boolean;
  generalError: string | null;
  successMessage: string | null;
}

// Błędy formularza zmiany hasła
interface ChangePasswordFormErrors {
  currentPassword?: string;
  newPassword?: string;
  newPasswordConfirm?: string;
}

// Stan formularza usunięcia konta
interface DeleteAccountFormState {
  confirmation: string;
  isSubmitting: boolean;
  error: string | null;
}

// Błędy formularza usunięcia konta
interface DeleteAccountFormErrors {
  confirmation?: string;
}

// Props dla strony ustawień
interface SettingsPageProps {
  userEmail: string;
  accessToken: string;
}

// Props dla sekcji profilu
interface ProfileSectionProps {
  email: string;
}

// Props dla formularza zmiany hasła
interface ChangePasswordFormProps {
  accessToken: string;
  onSuccess?: () => void;
}

// Props dla formularza usunięcia konta
interface DeleteAccountFormProps {
  accessToken: string;
}
```

## 6. Zarządzanie stanem

### 6.1 Hook `useChangePasswordForm`

Customowy hook do zarządzania formularzem zmiany hasła:

```typescript
function useChangePasswordForm(accessToken: string, onSuccess?: () => void) {
  // Stan formularza
  const [formState, setFormState] = useState<ChangePasswordFormState>({...});
  const [errors, setErrors] = useState<ChangePasswordFormErrors>({});

  // Funkcje
  const handleChange: (field, value) => void;
  const handleBlur: (field) => void;
  const handleSubmit: (e: FormEvent) => Promise<void>;
  const resetForm: () => void;

  return { formState, errors, handleChange, handleBlur, handleSubmit, resetForm };
}
```

**Logika walidacji inline:**

- `newPassword` na blur: sprawdzenie min 8 znaków i różnice od currentPassword
- `newPasswordConfirm` na blur: sprawdzenie zgodności z newPassword
- Na submit: pełna walidacja przez `changePasswordSchema`

### 6.2 Hook `useDeleteAccountForm`

Customowy hook do zarządzania formularzem usunięcia konta:

```typescript
function useDeleteAccountForm(accessToken: string) {
  // Stan formularza
  const [formState, setFormState] = useState<DeleteAccountFormState>({...});
  const [errors, setErrors] = useState<DeleteAccountFormErrors>({});

  // Funkcje
  const handleChange: (value: string) => void;
  const handleSubmit: (e: FormEvent) => Promise<void>;

  return { formState, errors, handleChange, handleSubmit };
}
```

**Logika walidacji:**

- Na submit: sprawdzenie czy `confirmation === "DELETE"`

## 7. Integracja API

### 7.1 Zmiana hasła

**Endpoint:** `POST /api/auth/change-password`

**Request:**

```typescript
// Headers
Authorization: `Bearer ${accessToken}`
Content-Type: application/json

// Body: ChangePasswordCommand
{
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
}
```

**Response (sukces 200):**

```typescript
// ChangePasswordResponseDTO
{
  message: "Password changed successfully";
}
```

**Response (błędy):**

- `400` - błąd walidacji (hasła nie pasują, za słabe hasło)
- `401` - błędne aktualne hasło lub brak sesji

### 7.2 Usunięcie konta

**Endpoint:** `DELETE /api/auth/account`

**Request:**

```typescript
// Headers
Authorization: `Bearer ${accessToken}`
Content-Type: application/json

// Body: DeleteAccountCommand
{
  confirmation: "DELETE"
}
```

**Response (sukces 200):**

```typescript
// DeleteAccountResponseDTO
{
  message: "Account deleted successfully";
}
```

**Response (błędy):**

- `400` - brak lub nieprawidłowe potwierdzenie
- `401` - brak sesji

## 8. Interakcje użytkownika

### 8.1 Sekcja Profil

- Użytkownik widzi swój e-mail (tylko do odczytu)
- Brak interakcji

### 8.2 Formularz zmiany hasła

1. **Wypełnianie pól:**
   - Użytkownik wpisuje aktualne hasło
   - Użytkownik wpisuje nowe hasło
   - Użytkownik powtarza nowe hasło

2. **Walidacja inline (onBlur):**
   - Po opuszczeniu pola `newPassword`: sprawdzenie min 8 znaków
   - Po opuszczeniu pola `newPasswordConfirm`: sprawdzenie zgodności z `newPassword`

3. **Wysłanie formularza:**
   - Kliknięcie "Zmień hasło" → walidacja → wywołanie API
   - Sukces: toast z komunikatem, reset formularza
   - Błąd 401: wyświetlenie "Aktualne hasło jest niepoprawne" w Alert
   - Błąd 400: wyświetlenie szczegółów walidacji przy polach

4. **Stan ładowania:**
   - Button disabled z spinnerem podczas wysyłania

### 8.3 Formularz usunięcia konta

1. **Wpisanie potwierdzenia:**
   - Użytkownik wpisuje "DELETE" w pole confirmation

2. **Wysłanie formularza:**
   - Kliknięcie "Usuń konto" → walidacja → wywołanie API
   - Sukces: toast, przekierowanie do `/login`, wyczyszczenie stanu sesji
   - Błąd: wyświetlenie komunikatu błędu

3. **Stan ładowania:**
   - Button disabled z spinnerem podczas wysyłania

## 9. Warunki i walidacja

### 9.1 Walidacja zmiany hasła

| Pole               | Warunek                  | Komunikat błędu                             |
| ------------------ | ------------------------ | ------------------------------------------- |
| currentPassword    | Wymagane, min 1 znak     | "Aktualne hasło jest wymagane"              |
| newPassword        | Min 8 znaków             | "Nowe hasło musi mieć co najmniej 8 znaków" |
| newPassword        | Różne od currentPassword | "Nowe hasło musi być inne niż aktualne"     |
| newPasswordConfirm | Identyczne z newPassword | "Hasła nie są identyczne"                   |

### 9.2 Walidacja usunięcia konta

| Pole         | Warunek            | Komunikat błędu                                 |
| ------------ | ------------------ | ----------------------------------------------- |
| confirmation | Dokładnie "DELETE" | "Wpisz DELETE, aby potwierdzić usunięcie konta" |

### 9.3 Wpływ na interfejs

- Błędy walidacji wyświetlane pod odpowiednimi polami (`role="alert"`)
- Pola z błędami mają `aria-invalid="true"` i `aria-describedby` wskazujące na komunikat
- Błąd ogólny (np. złe aktualne hasło) wyświetlany w komponencie `Alert` nad formularzem
- Przyciski disabled podczas submitu

## 10. Obsługa błędów

### 10.1 Błędy API

| Kod                   | Scenariusz         | Obsługa                                                   |
| --------------------- | ------------------ | --------------------------------------------------------- |
| 400                   | Błąd walidacji     | Wyświetlenie szczegółów przy polach lub jako generalError |
| 401 (change-password) | Złe aktualne hasło | Alert: "Aktualne hasło jest niepoprawne"                  |
| 401 (account)         | Brak sesji         | Przekierowanie do `/login`                                |
| 500                   | Błąd serwera       | Alert: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie."   |

### 10.2 Błędy sieciowe

- Catch w try/catch dla fetch
- Wyświetlenie komunikatu: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie."

### 10.3 Błędy parsowania JSON

- Obsługa SyntaxError w catch
- Wyświetlenie generycznego komunikatu błędu

### 10.4 Scenariusze brzegowe

- Wygaśnięcie sesji podczas pracy: 401 → redirect do `/login`
- Podwójne kliknięcie submit: blokowane przez `isSubmitting`
- Pusta odpowiedź API: obsługa z wartościami domyślnymi

## 11. Kroki implementacji

### Krok 1: Utworzenie strony Astro

1. Utworzyć plik `src/pages/app/settings.astro`
2. Sprawdzić sesję użytkownika (redirect jeśli brak)
3. Pobrać e-mail i access_token z sesji
4. Osadzić `SettingsPage` z `client:load`

### Krok 2: Implementacja komponentu SettingsPage

1. Utworzyć `src/components/settings/SettingsPage.tsx`
2. Zdefiniować layout strony z trzema sekcjami
3. Dodać `<Toaster>` dla powiadomień toast

### Krok 3: Implementacja ProfileSection

1. Utworzyć `src/components/settings/ProfileSection.tsx`
2. Wyświetlić e-mail w Card (readonly)

### Krok 4: Implementacja hooka useChangePasswordForm

1. Utworzyć `src/components/hooks/useChangePasswordForm.ts`
2. Zaimplementować stan formularza
3. Zaimplementować walidację inline (onBlur)
4. Zaimplementować logikę submit z wywołaniem API
5. Obsłużyć sukces (toast) i błędy

### Krok 5: Implementacja ChangePasswordForm

1. Utworzyć `src/components/settings/ChangePasswordForm.tsx`
2. Użyć hooka useChangePasswordForm
3. Zbudować formularz z trzema polami password
4. Dodać Alert dla błędów ogólnych
5. Dodać komunikaty walidacji pod polami

### Krok 6: Implementacja ChangePasswordSection

1. Utworzyć `src/components/settings/ChangePasswordSection.tsx`
2. Opakować ChangePasswordForm w Card

### Krok 7: Implementacja hooka useDeleteAccountForm

1. Utworzyć `src/components/hooks/useDeleteAccountForm.ts`
2. Zaimplementować stan formularza
3. Zaimplementować walidację confirmation
4. Zaimplementować logikę submit z wywołaniem API DELETE
5. Obsłużyć sukces (toast + redirect) i błędy

### Krok 8: Implementacja DeleteAccountForm

1. Utworzyć `src/components/settings/DeleteAccountForm.tsx`
2. Użyć hooka useDeleteAccountForm
3. Dodać ostrzeżenie o konsekwencjach
4. Zbudować formularz z polem confirmation
5. Dodać Button variant="destructive"

### Krok 9: Implementacja DeleteAccountSection

1. Utworzyć `src/components/settings/DeleteAccountSection.tsx`
2. Opakować DeleteAccountForm w Card z opisem

### Krok 10: Testy i integracja

1. Przetestować walidację formularzy
2. Przetestować integrację z API
3. Przetestować obsługę błędów
4. Przetestować dostępność (ARIA, keyboard navigation)
5. Sprawdzić responsywność

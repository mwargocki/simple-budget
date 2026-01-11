# Plan Testów - SimpleBudget

## 1. Wprowadzenie i cele testowania

### 1.1 Cel dokumentu

Niniejszy dokument stanowi kompleksowy plan testów dla aplikacji SimpleBudget - webowej aplikacji do zarządzania budżetem osobistym w walucie PLN. Plan definiuje strategię, zakres, metodologie i kryteria testowania.

### 1.2 Cele testowania

- **Zapewnienie jakości funkcjonalnej** - weryfikacja poprawności działania wszystkich funkcji biznesowych aplikacji
- **Walidacja bezpieczeństwa** - potwierdzenie bezpiecznego zarządzania danymi użytkowników i transakcjami finansowymi
- **Weryfikacja wydajności** - upewnienie się, że aplikacja działa płynnie przy typowym i zwiększonym obciążeniu
- **Sprawdzenie dostępności** - zapewnienie zgodności z wytycznymi WCAG i użyteczności dla wszystkich użytkowników
- **Potwierdzenie kompatybilności** - weryfikacja działania na różnych przeglądarkach i urządzeniach

### 1.3 Zakres projektu

SimpleBudget to aplikacja webowa zbudowana w architekturze SSR (Server-Side Rendering) z wykorzystaniem:

- **Frontend**: Astro 5, React 19, TypeScript 5, Tailwind 4, Shadcn/ui
- **Backend**: Supabase (PostgreSQL, autentykacja, SDK)
- **Hosting**: DigitalOcean (Docker)
- **CI/CD**: GitHub Actions

---

## 2. Zakres testów

### 2.1 Funkcjonalności objęte testami

| Moduł            | Komponenty                                                         | Priorytet |
| ---------------- | ------------------------------------------------------------------ | --------- |
| **Autentykacja** | Rejestracja, Logowanie, Wylogowanie, Zmiana hasła, Usunięcie konta | Krytyczny |
| **Transakcje**   | CRUD transakcji, Filtrowanie, Paginacja, Walidacja danych          | Krytyczny |
| **Kategorie**    | CRUD kategorii, Kategorie systemowe, Przenoszenie transakcji       | Wysoki    |
| **Podsumowania** | Podsumowanie miesięczne, Agregacja po kategoriach, Analiza AI      | Średni    |
| **Profil**       | Zarządzanie strefą czasową                                         | Niski     |
| **Nawigacja**    | Routing, Middleware, Session management                            | Wysoki    |

### 2.2 Funkcjonalności wykluczone z testów

- Wewnętrzne funkcje Supabase (testowane przez dostawcę)
- Komponenty biblioteki Shadcn/ui (testowane przez społeczność)
- Funkcjonalności Astro framework (testowane przez maintainerów)

### 2.3 Warstwy aplikacji do testowania

```
┌─────────────────────────────────────────────────────────────┐
│                    Warstwa prezentacji                       │
│  (Komponenty React, Strony Astro, Formularze, UI)           │
├─────────────────────────────────────────────────────────────┤
│                    Warstwa API                               │
│  (Endpointy REST, Walidacja Zod, Obsługa błędów)            │
├─────────────────────────────────────────────────────────────┤
│                    Warstwa serwisów                          │
│  (AuthService, TransactionService, CategoryService, etc.)   │
├─────────────────────────────────────────────────────────────┤
│                    Warstwa danych                            │
│  (Supabase Client, Typy bazy danych, RLS Policies)          │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Typy testów

### 3.1 Testy jednostkowe

**Cel**: Weryfikacja poprawności działania pojedynczych funkcji i modułów w izolacji.

**Zakres**:

#### 3.1.1 Schematy walidacji (Zod)

| Plik                    | Scenariusze testowe                                                            |
| ----------------------- | ------------------------------------------------------------------------------ |
| `auth.schema.ts`        | Walidacja email, hasła (min 8 znaków), zgodności haseł, potwierdzenia "DELETE" |
| `transaction.schema.ts` | Walidacja kwoty (0.01-1000000), typu, UUID kategorii, formatu daty ISO 8601    |
| `category.schema.ts`    | Walidacja nazwy (1-40 znaków), brak białych znaków na brzegach                 |
| `summary.schema.ts`     | Walidacja formatu miesiąca (YYYY-MM)                                           |
| `profile.schema.ts`     | Walidacja strefy czasowej                                                      |

#### 3.1.2 Serwisy biznesowe

| Serwis               | Metody do przetestowania                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `AuthService`        | `register()`, `login()`, `logout()`, `changePassword()`, `deleteAccount()`                                       |
| `TransactionService` | `createTransaction()`, `getTransactions()`, `getTransactionById()`, `updateTransaction()`, `deleteTransaction()` |
| `CategoryService`    | `getCategories()`, `createCategory()`, `updateCategory()`, `deleteCategory()`                                    |
| `SummaryService`     | `getMonthlySummary()`, `calculateMonthRangeWithTimezone()`                                                       |

#### 3.1.3 Funkcje pomocnicze

| Plik       | Funkcje                             |
| ---------- | ----------------------------------- |
| `utils.ts` | Funkcja `cn()` do łączenia klas CSS |

### 3.2 Testy integracyjne

**Cel**: Weryfikacja współpracy między modułami i warstwami aplikacji.

**Zakres**:

#### 3.2.1 Testy API Endpoints

| Endpoint                    | Metody HTTP      | Scenariusze                                    |
| --------------------------- | ---------------- | ---------------------------------------------- |
| `/api/auth/register`        | POST             | Sukces, duplikat email, błąd walidacji         |
| `/api/auth/login`           | POST             | Sukces, błędne hasło, nieistniejący użytkownik |
| `/api/auth/logout`          | POST             | Sukces, brak sesji                             |
| `/api/auth/change-password` | POST             | Sukces, błędne aktualne hasło, te same hasła   |
| `/api/auth/account`         | DELETE           | Sukces, brak potwierdzenia                     |
| `/api/transactions`         | GET, POST        | CRUD, paginacja, filtrowanie, walidacja        |
| `/api/transactions/[id]`    | GET, PUT, DELETE | Operacje na pojedynczej transakcji             |
| `/api/categories`           | GET, POST        | Pobieranie listy, tworzenie kategorii          |
| `/api/categories/[id]`      | GET, PUT, DELETE | Operacje na kategorii, blokada systemowych     |
| `/api/summary`              | GET              | Podsumowanie miesięczne, strefy czasowe        |
| `/api/summary/ai-analysis`  | GET              | Analiza AI podsumowania                        |
| `/api/profile`              | GET, PUT         | Pobieranie i aktualizacja profilu              |

#### 3.2.2 Testy middleware

- Przekierowanie z `/` na `/login` dla niezalogowanych
- Przekierowanie z `/` na `/app` dla zalogowanych
- Obsługa sesji Supabase w `context.locals`

#### 3.2.3 Testy bazy danych

- Row Level Security (RLS) - izolacja danych użytkowników
- Triggery automatycznego tworzenia kategorii systemowych
- Funkcja `delete_user_account` - usuwanie wszystkich danych użytkownika
- Relacje między tabelami (transactions → categories)

### 3.3 Testy E2E (End-to-End)

**Cel**: Weryfikacja kompletnych scenariuszy użytkownika z perspektywy przeglądarki.

**Scenariusze krytyczne**:

#### 3.3.1 Przepływy autentykacji

```gherkin
Scenariusz: Rejestracja nowego użytkownika
  Zakładając że jestem na stronie rejestracji
  Kiedy wprowadzę poprawny email i hasło
  I potwierdzę hasło
  I kliknę przycisk "Zarejestruj"
  Wtedy powinienem zostać przekierowany do aplikacji
  I powinienem mieć utworzone domyślne kategorie systemowe

Scenariusz: Logowanie istniejącego użytkownika
  Zakładając że jestem zarejestrowanym użytkownikiem
  I jestem na stronie logowania
  Kiedy wprowadzę poprawne dane logowania
  I kliknę przycisk "Zaloguj"
  Wtedy powinienem zostać przekierowany do dashboardu
  I powinienem widzieć moje dane

Scenariusz: Wyświetlenie toastu po wygaśnięciu sesji
  Zakładając że moja sesja wygasła
  Kiedy zostanę przekierowany na stronę logowania
  Wtedy powinienem zobaczyć informację o wygaśnięciu sesji
```

#### 3.3.2 Zarządzanie transakcjami

```gherkin
Scenariusz: Dodanie nowej transakcji wydatku
  Zakładając że jestem zalogowany
  I jestem na stronie transakcji
  Kiedy kliknę przycisk "Dodaj transakcję"
  I wypełnię formularz z danymi wydatku
  I wybiorę kategorię
  I kliknę "Zapisz"
  Wtedy transakcja powinna pojawić się na liście
  I saldo powinno się zaktualizować

Scenariusz: Filtrowanie transakcji po miesiącu
  Zakładając że mam transakcje w różnych miesiącach
  Kiedy wybiorę konkretny miesiąc w MonthPicker
  Wtedy powinienem widzieć tylko transakcje z wybranego miesiąca

Scenariusz: Edycja istniejącej transakcji
  Zakładając że mam zapisaną transakcję
  Kiedy kliknę na transakcję
  I zmienię dane w formularzu
  I zapiszę zmiany
  Wtedy transakcja powinna być zaktualizowana

Scenariusz: Usunięcie transakcji
  Zakładając że mam zapisaną transakcję
  Kiedy kliknę przycisk usuwania
  I potwierdzę usunięcie w dialogu
  Wtedy transakcja powinna zniknąć z listy
```

#### 3.3.3 Zarządzanie kategoriami

```gherkin
Scenariusz: Dodanie nowej kategorii
  Zakładając że jestem na stronie kategorii
  Kiedy kliknę "Dodaj kategorię"
  I wprowadzę nazwę kategorii
  I zapiszę
  Wtedy kategoria powinna pojawić się na liście

Scenariusz: Próba edycji kategorii systemowej
  Zakładając że mam kategorię systemową "Brak"
  Kiedy spróbuję ją edytować
  Wtedy powinienem zobaczyć informację o błędzie
  I kategoria nie powinna być zmieniona

Scenariusz: Usunięcie kategorii z transakcjami
  Zakładając że mam kategorię z przypisanymi transakcjami
  Kiedy usunę tę kategorię
  Wtedy transakcje powinny być przeniesione do kategorii "Brak"
  I powinienem zobaczyć informację o przeniesionych transakcjach
```

#### 3.3.4 Podsumowania finansowe

```gherkin
Scenariusz: Wyświetlenie podsumowania miesięcznego
  Zakładając że mam transakcje w bieżącym miesiącu
  Kiedy przejdę do strony podsumowania
  Wtedy powinienem widzieć całkowite przychody
  I całkowite wydatki
  I bilans
  I podział na kategorie

Scenariusz: Zmiana miesiąca w podsumowaniu
  Zakładając że jestem na stronie podsumowania
  Kiedy zmienię miesiąc na poprzedni
  Wtedy dane powinny się zaktualizować dla wybranego miesiąca
```

### 3.4 Testy wydajnościowe

**Cel**: Weryfikacja responsywności i skalowalności aplikacji.

**Metryki**:

| Metryka                        | Cel     | Próg krytyczny |
| ------------------------------ | ------- | -------------- |
| Time to First Byte (TTFB)      | < 200ms | < 500ms        |
| First Contentful Paint (FCP)   | < 1.5s  | < 3s           |
| Largest Contentful Paint (LCP) | < 2.5s  | < 4s           |
| Cumulative Layout Shift (CLS)  | < 0.1   | < 0.25         |
| Time to Interactive (TTI)      | < 3s    | < 5s           |

**Scenariusze obciążeniowe**:

1. **Lista transakcji z paginacją** - 1000+ transakcji w bazie
2. **Podsumowanie miesięczne** - agregacja 500+ transakcji
3. **Równoczesne sesje** - 50 użytkowników jednocześnie
4. **Operacje CRUD** - 100 operacji w ciągu minuty

### 3.5 Testy bezpieczeństwa

**Cel**: Identyfikacja i eliminacja podatności bezpieczeństwa.

**Zakres**:

#### 3.5.1 Autentykacja i autoryzacja

| Test                   | Opis                                                        |
| ---------------------- | ----------------------------------------------------------- |
| Brute force protection | Weryfikacja blokady po wielokrotnych nieudanych logowaniach |
| Token expiration       | Sprawdzenie wygaśnięcia tokenów JWT                         |
| Session hijacking      | Próba przejęcia sesji innego użytkownika                    |
| CSRF protection        | Weryfikacja ochrony przed CSRF                              |

#### 3.5.2 Walidacja danych wejściowych

| Test               | Opis                                       |
| ------------------ | ------------------------------------------ |
| SQL Injection      | Próby iniekcji SQL w polach formularzy     |
| XSS                | Próby wstrzyknięcia skryptów JavaScript    |
| Path traversal     | Próby dostępu do nieautoryzowanych zasobów |
| Input sanitization | Weryfikacja sanityzacji danych wejściowych |

#### 3.5.3 Izolacja danych (Row Level Security)

| Test                       | Opis                                                        |
| -------------------------- | ----------------------------------------------------------- |
| Cross-user data access     | Próba dostępu do transakcji innego użytkownika              |
| Category isolation         | Weryfikacja izolacji kategorii między użytkownikami         |
| API endpoint authorization | Sprawdzenie wymagania autoryzacji na wszystkich endpointach |

### 3.6 Testy dostępności (Accessibility)

**Cel**: Zapewnienie zgodności z WCAG 2.1 poziom AA.

**Obszary**:

| Obszar                   | Kryteria                                              |
| ------------------------ | ----------------------------------------------------- |
| **Nawigacja klawiaturą** | Wszystkie interaktywne elementy dostępne z klawiatury |
| **Screen reader**        | Poprawne atrybuty ARIA, etykiety, role                |
| **Kontrast**             | Współczynnik kontrastu min. 4.5:1 dla tekstu          |
| **Focus visible**        | Widoczny focus na wszystkich elementach               |
| **Formularze**           | Powiązanie etykiet z polami, komunikaty błędów        |

**Komponenty do weryfikacji**:

- Formularze logowania i rejestracji
- Dialogi (CategoryFormDialog, DeleteCategoryDialog, TransactionFormDialog)
- Selektory (CategorySelect, MonthPicker)
- Listy (TransactionsList, CategoriesList)
- Przyciski i akcje

### 3.7 Testy wizualne i responsywności

**Cel**: Weryfikacja poprawności wyświetlania na różnych urządzeniach.

**Breakpointy Tailwind**:

| Breakpoint | Rozdzielczość | Urządzenia    |
| ---------- | ------------- | ------------- |
| Mobile     | < 640px       | Telefony      |
| SM         | 640px+        | Duże telefony |
| MD         | 768px+        | Tablety       |
| LG         | 1024px+       | Laptopy       |
| XL         | 1280px+       | Desktopy      |

**Krytyczne widoki**:

- Dashboard (`/app`)
- Lista transakcji (`/app/transactions`)
- Kategorie (`/app/categories`)
- Podsumowanie (`/app/summary`)
- Ustawienia (`/app/settings`)
- Logowanie i rejestracja

---

## 4. Scenariusze testowe dla kluczowych funkcjonalności

### 4.1 Moduł autentykacji

#### TC-AUTH-001: Rejestracja z poprawnymi danymi

| Pole                 | Wartość                                                                                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**               | TC-AUTH-001                                                                                                                                                     |
| **Priorytet**        | Krytyczny                                                                                                                                                       |
| **Warunki wstępne**  | Brak konta z danym emailem                                                                                                                                      |
| **Kroki**            | 1. Otwórz /register<br>2. Wprowadź email: test@example.com<br>3. Wprowadź hasło: SecurePass123<br>4. Potwierdź hasło: SecurePass123<br>5. Kliknij "Zarejestruj" |
| **Oczekiwany wynik** | Użytkownik zarejestrowany, przekierowanie do /app, utworzone kategorie systemowe                                                                                |

#### TC-AUTH-002: Rejestracja z niepoprawnym emailem

| Pole                 | Wartość                                                                      |
| -------------------- | ---------------------------------------------------------------------------- |
| **ID**               | TC-AUTH-002                                                                  |
| **Priorytet**        | Wysoki                                                                       |
| **Warunki wstępne**  | -                                                                            |
| **Kroki**            | 1. Otwórz /register<br>2. Wprowadź email: invalid-email<br>3. Próbuj zapisać |
| **Oczekiwany wynik** | Wyświetlenie błędu "Invalid email format"                                    |

#### TC-AUTH-003: Rejestracja z krótkim hasłem

| Pole                 | Wartość                                       |
| -------------------- | --------------------------------------------- |
| **ID**               | TC-AUTH-003                                   |
| **Priorytet**        | Wysoki                                        |
| **Kroki**            | 1. Wprowadź hasło: short<br>2. Próbuj zapisać |
| **Oczekiwany wynik** | Błąd "Password must be at least 8 characters" |

#### TC-AUTH-004: Rejestracja z niezgodnymi hasłami

| Pole                 | Wartość                                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| **ID**               | TC-AUTH-004                                                                                    |
| **Priorytet**        | Wysoki                                                                                         |
| **Kroki**            | 1. Wprowadź hasło: Password123<br>2. Wprowadź potwierdzenie: Different123<br>3. Próbuj zapisać |
| **Oczekiwany wynik** | Błąd "Passwords do not match"                                                                  |

#### TC-AUTH-005: Logowanie z poprawnymi danymi

| Pole                 | Wartość                                                      |
| -------------------- | ------------------------------------------------------------ |
| **ID**               | TC-AUTH-005                                                  |
| **Priorytet**        | Krytyczny                                                    |
| **Warunki wstępne**  | Zarejestrowany użytkownik                                    |
| **Kroki**            | 1. Otwórz /login<br>2. Wprowadź dane<br>3. Kliknij "Zaloguj" |
| **Oczekiwany wynik** | Przekierowanie do /app, sesja aktywna                        |

#### TC-AUTH-006: Logowanie z błędnym hasłem

| Pole                 | Wartość                                                |
| -------------------- | ------------------------------------------------------ |
| **ID**               | TC-AUTH-006                                            |
| **Priorytet**        | Wysoki                                                 |
| **Kroki**            | 1. Wprowadź poprawny email<br>2. Wprowadź błędne hasło |
| **Oczekiwany wynik** | Komunikat o błędnych danych logowania                  |

#### TC-AUTH-007: Wylogowanie

| Pole                 | Wartość                                    |
| -------------------- | ------------------------------------------ |
| **ID**               | TC-AUTH-007                                |
| **Priorytet**        | Wysoki                                     |
| **Warunki wstępne**  | Zalogowany użytkownik                      |
| **Kroki**            | 1. Kliknij przycisk wylogowania            |
| **Oczekiwany wynik** | Sesja zakończona, przekierowanie do /login |

#### TC-AUTH-008: Zmiana hasła

| Pole                 | Wartość                                                                        |
| -------------------- | ------------------------------------------------------------------------------ |
| **ID**               | TC-AUTH-008                                                                    |
| **Priorytet**        | Wysoki                                                                         |
| **Warunki wstępne**  | Zalogowany użytkownik                                                          |
| **Kroki**            | 1. Przejdź do /app/settings<br>2. Wypełnij formularz zmiany hasła<br>3. Zapisz |
| **Oczekiwany wynik** | Hasło zmienione, możliwość logowania nowym hasłem                              |

#### TC-AUTH-009: Usunięcie konta

| Pole                 | Wartość                                                                  |
| -------------------- | ------------------------------------------------------------------------ |
| **ID**               | TC-AUTH-009                                                              |
| **Priorytet**        | Średni                                                                   |
| **Warunki wstępne**  | Zalogowany użytkownik z danymi                                           |
| **Kroki**            | 1. Przejdź do ustawień<br>2. Wprowadź "DELETE"<br>3. Potwierdź usunięcie |
| **Oczekiwany wynik** | Konto usunięte, wszystkie dane usunięte, przekierowanie do /login        |

### 4.2 Moduł transakcji

#### TC-TXN-001: Utworzenie transakcji wydatku

| Pole                 | Wartość                                                                                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**               | TC-TXN-001                                                                                                                                     |
| **Priorytet**        | Krytyczny                                                                                                                                      |
| **Warunki wstępne**  | Zalogowany użytkownik, istniejąca kategoria                                                                                                    |
| **Kroki**            | 1. Kliknij "Dodaj transakcję"<br>2. Wybierz typ: wydatek<br>3. Wprowadź kwotę: 100.50<br>4. Wybierz kategorię<br>5. Wprowadź opis<br>6. Zapisz |
| **Oczekiwany wynik** | Transakcja zapisana, widoczna na liście                                                                                                        |

#### TC-TXN-002: Utworzenie transakcji przychodu

| Pole                 | Wartość                              |
| -------------------- | ------------------------------------ |
| **ID**               | TC-TXN-002                           |
| **Priorytet**        | Krytyczny                            |
| **Kroki**            | 1. Jak TC-TXN-001, ale typ: przychód |
| **Oczekiwany wynik** | Transakcja przychodu zapisana        |

#### TC-TXN-003: Walidacja kwoty - poniżej minimum

| Pole                 | Wartość                               |
| -------------------- | ------------------------------------- |
| **ID**               | TC-TXN-003                            |
| **Priorytet**        | Wysoki                                |
| **Kroki**            | 1. Wprowadź kwotę: 0.001              |
| **Oczekiwany wynik** | Błąd walidacji - kwota minimalna 0.01 |

#### TC-TXN-004: Walidacja kwoty - powyżej maksimum

| Pole                 | Wartość                                   |
| -------------------- | ----------------------------------------- |
| **ID**               | TC-TXN-004                                |
| **Priorytet**        | Wysoki                                    |
| **Kroki**            | 1. Wprowadź kwotę: 1000001                |
| **Oczekiwany wynik** | Błąd walidacji - kwota maksymalna 1000000 |

#### TC-TXN-005: Filtrowanie po miesiącu

| Pole                 | Wartość                                           |
| -------------------- | ------------------------------------------------- |
| **ID**               | TC-TXN-005                                        |
| **Priorytet**        | Wysoki                                            |
| **Warunki wstępne**  | Transakcje w różnych miesiącach                   |
| **Kroki**            | 1. Wybierz miesiąc w MonthPicker                  |
| **Oczekiwany wynik** | Wyświetlone tylko transakcje z wybranego miesiąca |

#### TC-TXN-006: Filtrowanie po kategorii

| Pole                 | Wartość                                           |
| -------------------- | ------------------------------------------------- |
| **ID**               | TC-TXN-006                                        |
| **Priorytet**        | Średni                                            |
| **Kroki**            | 1. Wybierz kategorię z filtrów                    |
| **Oczekiwany wynik** | Wyświetlone tylko transakcje z wybranej kategorii |

#### TC-TXN-007: Paginacja

| Pole                 | Wartość                                                  |
| -------------------- | -------------------------------------------------------- |
| **ID**               | TC-TXN-007                                               |
| **Priorytet**        | Średni                                                   |
| **Warunki wstępne**  | > 20 transakcji                                          |
| **Kroki**            | 1. Przewiń do końca listy<br>2. Kliknij "Załaduj więcej" |
| **Oczekiwany wynik** | Załadowane kolejne transakcje                            |

#### TC-TXN-008: Edycja transakcji

| Pole                 | Wartość                                                |
| -------------------- | ------------------------------------------------------ |
| **ID**               | TC-TXN-008                                             |
| **Priorytet**        | Wysoki                                                 |
| **Kroki**            | 1. Kliknij na transakcję<br>2. Zmień dane<br>3. Zapisz |
| **Oczekiwany wynik** | Transakcja zaktualizowana                              |

#### TC-TXN-009: Usunięcie transakcji

| Pole                 | Wartość                                                |
| -------------------- | ------------------------------------------------------ |
| **ID**               | TC-TXN-009                                             |
| **Priorytet**        | Wysoki                                                 |
| **Kroki**            | 1. Kliknij przycisk usuwania<br>2. Potwierdź w dialogu |
| **Oczekiwany wynik** | Transakcja usunięta                                    |

#### TC-TXN-010: Dostęp do transakcji innego użytkownika

| Pole                 | Wartość                                               |
| -------------------- | ----------------------------------------------------- |
| **ID**               | TC-TXN-010                                            |
| **Priorytet**        | Krytyczny                                             |
| **Kroki**            | 1. Spróbuj pobrać transakcję z innego konta przez API |
| **Oczekiwany wynik** | Błąd 404 lub 403                                      |

### 4.3 Moduł kategorii

#### TC-CAT-001: Utworzenie kategorii

| Pole                 | Wartość                                                        |
| -------------------- | -------------------------------------------------------------- |
| **ID**               | TC-CAT-001                                                     |
| **Priorytet**        | Wysoki                                                         |
| **Kroki**            | 1. Kliknij "Dodaj kategorię"<br>2. Wprowadź nazwę<br>3. Zapisz |
| **Oczekiwany wynik** | Kategoria utworzona, widoczna na liście                        |

#### TC-CAT-002: Walidacja nazwy - za długa

| Pole                 | Wartość                       |
| -------------------- | ----------------------------- |
| **ID**               | TC-CAT-002                    |
| **Priorytet**        | Średni                        |
| **Kroki**            | 1. Wprowadź nazwę > 40 znaków |
| **Oczekiwany wynik** | Błąd walidacji                |

#### TC-CAT-003: Walidacja nazwy - białe znaki

| Pole                 | Wartość                                         |
| -------------------- | ----------------------------------------------- |
| **ID**               | TC-CAT-003                                      |
| **Priorytet**        | Średni                                          |
| **Kroki**            | 1. Wprowadź nazwę ze spacjami na początku/końcu |
| **Oczekiwany wynik** | Błąd walidacji                                  |

#### TC-CAT-004: Edycja kategorii użytkownika

| Pole                 | Wartość                                                         |
| -------------------- | --------------------------------------------------------------- |
| **ID**               | TC-CAT-004                                                      |
| **Priorytet**        | Wysoki                                                          |
| **Kroki**            | 1. Kliknij edytuj przy kategorii<br>2. Zmień nazwę<br>3. Zapisz |
| **Oczekiwany wynik** | Nazwa zaktualizowana                                            |

#### TC-CAT-005: Próba edycji kategorii systemowej

| Pole                 | Wartość                              |
| -------------------- | ------------------------------------ |
| **ID**               | TC-CAT-005                           |
| **Priorytet**        | Wysoki                               |
| **Kroki**            | 1. Spróbuj edytować kategorię "Brak" |
| **Oczekiwany wynik** | Błąd "Cannot modify system category" |

#### TC-CAT-006: Usunięcie kategorii z transakcjami

| Pole                 | Wartość                                               |
| -------------------- | ----------------------------------------------------- |
| **ID**               | TC-CAT-006                                            |
| **Priorytet**        | Wysoki                                                |
| **Warunki wstępne**  | Kategoria z przypisanymi transakcjami                 |
| **Kroki**            | 1. Usuń kategorię                                     |
| **Oczekiwany wynik** | Kategoria usunięta, transakcje przeniesione do "Brak" |

### 4.4 Moduł podsumowań

#### TC-SUM-001: Wyświetlenie podsumowania

| Pole                 | Wartość                                       |
| -------------------- | --------------------------------------------- |
| **ID**               | TC-SUM-001                                    |
| **Priorytet**        | Wysoki                                        |
| **Warunki wstępne**  | Transakcje w bieżącym miesiącu                |
| **Kroki**            | 1. Przejdź do /app/summary                    |
| **Oczekiwany wynik** | Wyświetlone sumy przychodów, wydatków, bilans |

#### TC-SUM-002: Agregacja po kategoriach

| Pole                 | Wartość                                    |
| -------------------- | ------------------------------------------ |
| **ID**               | TC-SUM-002                                 |
| **Priorytet**        | Średni                                     |
| **Kroki**            | 1. Sprawdź sekcję kategorii w podsumowaniu |
| **Oczekiwany wynik** | Poprawne sumy dla każdej kategorii         |

#### TC-SUM-003: Zmiana miesiąca

| Pole                 | Wartość                                    |
| -------------------- | ------------------------------------------ |
| **ID**               | TC-SUM-003                                 |
| **Priorytet**        | Średni                                     |
| **Kroki**            | 1. Zmień miesiąc w selektorze              |
| **Oczekiwany wynik** | Dane zaktualizowane dla wybranego miesiąca |

#### TC-SUM-004: Uwzględnienie strefy czasowej

| Pole                 | Wartość                                   |
| -------------------- | ----------------------------------------- |
| **ID**               | TC-SUM-004                                |
| **Priorytet**        | Niski                                     |
| **Warunki wstępne**  | Profil ze strefą czasową inną niż UTC     |
| **Kroki**            | 1. Sprawdź zakres dat podsumowania        |
| **Oczekiwany wynik** | Daty zgodne ze strefą czasową użytkownika |

---

## 5. Środowisko testowe

### 5.1 Środowiska

| Środowisko        | Cel                       | Baza danych              | URL                              |
| ----------------- | ------------------------- | ------------------------ | -------------------------------- |
| **Lokalne (dev)** | Rozwój, testy jednostkowe | Supabase Local           | http://localhost:4321            |
| **Staging**       | Testy integracyjne, E2E   | Supabase Cloud (staging) | https://staging.simplebudget.app |
| **Production**    | Smoke testy, monitoring   | Supabase Cloud (prod)    | https://simplebudget.app         |

### 5.2 Konfiguracja lokalnego środowiska testowego

```bash
# Instalacja zależności
npm install

# Uruchomienie Supabase lokalnie
npx supabase start

# Uruchomienie aplikacji w trybie dev
npm run dev

# Uruchomienie testów
npm run test
npm run test:e2e
npm run test:coverage
```

### 5.3 Dane testowe

#### Użytkownicy testowi

| Email             | Hasło        | Rola                                  |
| ----------------- | ------------ | ------------------------------------- |
| test@example.com  | TestPass123! | Standardowy użytkownik                |
| test2@example.com | TestPass123! | Drugi użytkownik (do testów izolacji) |

#### Kategorie testowe

- Kategorie systemowe: "Brak" (none)
- Kategorie użytkownika: "Jedzenie", "Transport", "Rozrywka"

#### Transakcje testowe

- Mix transakcji przychodów i wydatków
- Różne miesiące
- Różne kategorie
- Różne kwoty (min, max, typowe)

---

## 6. Narzędzia do testowania

### 6.1 Testy jednostkowe i integracyjne

| Narzędzie                  | Cel                          | Wersja |
| -------------------------- | ---------------------------- | ------ |
| **Vitest**                 | Framework testowy            | ^3.x   |
| **@testing-library/react** | Testowanie komponentów React | ^16.x  |
| **msw**                    | Mockowanie API               | ^2.x   |

### 6.2 Testy E2E

| Narzędzie            | Cel                        |
| -------------------- | -------------------------- |
| **Playwright**       | Automatyzacja przeglądarek |
| **@playwright/test** | Framework testów E2E       |

### 6.3 Testy wydajnościowe

| Narzędzie         | Cel                    |
| ----------------- | ---------------------- |
| **Lighthouse CI** | Web Vitals, audyty     |
| **k6**            | Testy obciążeniowe API |

### 6.4 Testy bezpieczeństwa

| Narzędzie     | Cel                   |
| ------------- | --------------------- |
| **OWASP ZAP** | Skanowanie podatności |
| **npm audit** | Audyt zależności      |

### 6.5 Testy dostępności

| Narzędzie                | Cel                      |
| ------------------------ | ------------------------ |
| **axe-core**             | Automatyczne audyty a11y |
| **@axe-core/playwright** | Integracja z Playwright  |

### 6.6 Jakość kodu

| Narzędzie      | Cel                    |
| -------------- | ---------------------- |
| **ESLint**     | Statyczna analiza kodu |
| **Prettier**   | Formatowanie kodu      |
| **TypeScript** | Sprawdzanie typów      |

### 6.7 CI/CD

| Narzędzie          | Cel                       |
| ------------------ | ------------------------- |
| **GitHub Actions** | Automatyzacja pipeline'ów |
| **Husky**          | Git hooks                 |
| **lint-staged**    | Lintowanie staged plików  |

---

## 7. Harmonogram testów

### 7.1 Fazy testowania

```
┌──────────────────────────────────────────────────────────────────────┐
│ Faza 1: Przygotowanie                                                │
│ - Konfiguracja środowiska testowego                                  │
│ - Przygotowanie danych testowych                                     │
│ - Setup narzędzi CI/CD                                               │
├──────────────────────────────────────────────────────────────────────┤
│ Faza 2: Testy jednostkowe                                            │
│ - Schematy walidacji Zod                                             │
│ - Serwisy biznesowe                                                  │
│ - Funkcje pomocnicze                                                 │
├──────────────────────────────────────────────────────────────────────┤
│ Faza 3: Testy integracyjne                                           │
│ - API Endpoints                                                       │
│ - Middleware                                                          │
│ - Integracja z Supabase                                              │
├──────────────────────────────────────────────────────────────────────┤
│ Faza 4: Testy E2E                                                    │
│ - Przepływy użytkownika                                              │
│ - Formularze i interakcje                                            │
│ - Responsywność                                                       │
├──────────────────────────────────────────────────────────────────────┤
│ Faza 5: Testy niefunkcjonalne                                        │
│ - Wydajność                                                           │
│ - Bezpieczeństwo                                                      │
│ - Dostępność                                                          │
├──────────────────────────────────────────────────────────────────────┤
│ Faza 6: Testy regresyjne                                             │
│ - Uruchomienie pełnej suity testów                                   │
│ - Weryfikacja poprawek                                               │
└──────────────────────────────────────────────────────────────────────┘
```

### 7.2 Ciągła integracja

| Trigger                | Testy                                  | Czas    |
| ---------------------- | -------------------------------------- | ------- |
| Push do feature branch | Linting, Testy jednostkowe             | ~2 min  |
| Pull Request           | Jednostkowe, Integracyjne, E2E (smoke) | ~10 min |
| Merge do master        | Pełna suita + Lighthouse               | ~20 min |
| Nightly build          | E2E + Bezpieczeństwo + Wydajność       | ~45 min |

---

## 8. Kryteria akceptacji testów

### 8.1 Kryteria wejścia (Entry Criteria)

- [ ] Środowisko testowe skonfigurowane i działające
- [ ] Dane testowe przygotowane
- [ ] Narzędzia testowe zainstalowane
- [ ] Kod do testowania zdeployowany na środowisko testowe
- [ ] Dokumentacja funkcjonalności dostępna

### 8.2 Kryteria wyjścia (Exit Criteria)

#### Testy jednostkowe

- [ ] 80%+ pokrycia kodu (coverage)
- [ ] 100% testów przechodzących
- [ ] Brak krytycznych defektów

#### Testy integracyjne

- [ ] Wszystkie endpointy API przetestowane
- [ ] 100% testów przechodzących
- [ ] Brak blokerów

#### Testy E2E

- [ ] Wszystkie krytyczne scenariusze przetestowane
- [ ] 95%+ testów przechodzących
- [ ] Brak defektów krytycznych lub blokujących

#### Testy wydajnościowe

- [ ] LCP < 2.5s
- [ ] TTI < 3s
- [ ] CLS < 0.1

#### Testy bezpieczeństwa

- [ ] Brak podatności krytycznych lub wysokich
- [ ] RLS policies działające poprawnie

#### Testy dostępności

- [ ] Brak naruszeń WCAG 2.1 AA
- [ ] Nawigacja klawiaturą działa

### 8.3 Definicja gotowości (Definition of Done)

Funkcjonalność jest uznana za przetestowaną, gdy:

1. Wszystkie zaplanowane przypadki testowe zostały wykonane
2. Wszystkie defekty krytyczne i blokujące zostały naprawione
3. Dokumentacja testów jest aktualna
4. Raport z testów został wygenerowany
5. Interesariusze zaakceptowali wyniki

---

## 9. Role i odpowiedzialności

### 9.1 Matryca RACI

| Zadanie                       | Developer | QA Engineer | Tech Lead | Product Owner |
| ----------------------------- | --------- | ----------- | --------- | ------------- |
| Pisanie testów jednostkowych  | R         | C           | A         | I             |
| Pisanie testów integracyjnych | R         | R           | A         | I             |
| Pisanie testów E2E            | C         | R           | A         | I             |
| Code review testów            | R         | R           | A         | I             |
| Konfiguracja CI/CD            | R         | C           | A         | I             |
| Raportowanie defektów         | R         | R           | A         | I             |
| Priorytetyzacja defektów      | C         | C           | R         | A             |
| Akceptacja wyników            | I         | R           | C         | A             |

**Legenda**: R - Responsible, A - Accountable, C - Consulted, I - Informed

### 9.2 Opis ról

#### Developer

- Pisanie testów jednostkowych dla nowego kodu
- Utrzymanie istniejących testów
- Naprawa defektów
- Code review

#### QA Engineer

- Projektowanie scenariuszy testowych
- Pisanie testów E2E
- Wykonywanie testów manualnych eksploracyjnych
- Raportowanie i śledzenie defektów

#### Tech Lead

- Zatwierdzanie strategii testowania
- Review architektury testów
- Decyzje o priorytetyzacji

#### Product Owner

- Akceptacja kryteriów akceptacji
- Priorytetyzacja napraw
- Decyzje biznesowe dot. jakości

---

## 10. Procedury raportowania błędów

### 10.1 Klasyfikacja defektów

| Priorytet     | Opis                                             | SLA naprawy |
| ------------- | ------------------------------------------------ | ----------- |
| **Bloker**    | Blokuje działanie aplikacji, brak obejścia       | 4h          |
| **Krytyczny** | Poważny wpływ na funkcjonalność, trudne obejście | 24h         |
| **Wysoki**    | Znaczący wpływ, istnieje obejście                | 3 dni       |
| **Średni**    | Umiarkowany wpływ, łatwe obejście                | 1 tydzień   |
| **Niski**     | Kosmetyczny, minimalny wpływ                     | Backlog     |

### 10.2 Szablon zgłoszenia defektu

```markdown
## Tytuł

[Zwięzły opis problemu]

## Środowisko

- Przeglądarka: Chrome 120
- System: macOS 14.0
- Środowisko: Staging

## Kroki reprodukcji

1. [Krok 1]
2. [Krok 2]
3. [Krok 3]

## Oczekiwany wynik

[Co powinno się wydarzyć]

## Rzeczywisty wynik

[Co faktycznie się dzieje]

## Priorytet

[Bloker/Krytyczny/Wysoki/Średni/Niski]

## Załączniki

- [Screenshot/Video]
- [Logi konsoli]
- [Network logs]

## Dodatkowe informacje

[Opcjonalne notatki]
```

### 10.3 Workflow defektów

```
┌─────────┐     ┌──────────┐     ┌────────────┐     ┌─────────┐
│   New   │────▶│ Triaged  │────▶│ In Progress│────▶│ Testing │
└─────────┘     └──────────┘     └────────────┘     └─────────┘
                     │                                    │
                     │                                    ▼
                     │                              ┌──────────┐
                     └──────────────────────────────│  Closed  │
                            (Won't Fix/Duplicate)   └──────────┘
```

### 10.4 Raportowanie

| Raport               | Częstotliwość | Odbiorcy      |
| -------------------- | ------------- | ------------- |
| Status testów (CI)   | Na każdy PR   | Developerzy   |
| Raport defektów      | Dzienny       | Zespół dev    |
| Podsumowanie sprintu | Co 2 tygodnie | Stakeholderzy |
| Raport pokrycia kodu | Tygodniowy    | Tech Lead     |

---

## 11. Załączniki

### 11.1 Struktura katalogów testowych

```
simple-budget/
├── src/
│   ├── __tests__/
│   │   ├── unit/
│   │   │   ├── schemas/
│   │   │   │   ├── auth.schema.test.ts
│   │   │   │   ├── transaction.schema.test.ts
│   │   │   │   └── category.schema.test.ts
│   │   │   ├── services/
│   │   │   │   ├── auth.service.test.ts
│   │   │   │   ├── transaction.service.test.ts
│   │   │   │   └── category.service.test.ts
│   │   │   └── utils/
│   │   │       └── utils.test.ts
│   │   └── integration/
│   │       ├── api/
│   │       │   ├── auth.api.test.ts
│   │       │   ├── transactions.api.test.ts
│   │       │   └── categories.api.test.ts
│   │       └── middleware/
│   │           └── middleware.test.ts
├── e2e/
│   ├── auth.spec.ts
│   ├── transactions.spec.ts
│   ├── categories.spec.ts
│   └── summary.spec.ts
├── vitest.config.ts
└── playwright.config.ts
```

### 11.2 Przykładowa konfiguracja Vitest

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      exclude: ["node_modules", "src/components/ui"],
    },
  },
});
```

### 11.3 Przykładowa konfiguracja Playwright

```typescript
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:4321",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "Mobile Chrome", use: { ...devices["Pixel 5"] } },
    { name: "Mobile Safari", use: { ...devices["iPhone 12"] } },
  ],
  webServer: {
    command: "npm run preview",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## Historia zmian dokumentu

| Wersja | Data       | Autor       | Opis zmian           |
| ------ | ---------- | ----------- | -------------------- |
| 1.0    | 2026-01-11 | Claude Code | Utworzenie dokumentu |

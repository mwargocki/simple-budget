# Architektura UI dla SimpleBudget (MVP)

## 1. Przegląd struktury UI

### Założenia nadrzędne (MVP)
- **Aplikacja webowa, desktop-only** (bez optymalizacji pod małe ekrany).
- **Strefa zalogowana** działa pod wspólnym prefiksem **`/app/*`** i ma **jeden wspólny layout** (nagłówek + globalne toasty).
- **Brak cache** danych: po wejściu na widok następuje **fetch z API**, a po mutacjach (create/update/delete) następuje **refetch** bieżącego widoku.
- **Daty i miesiące w UTC**:
    - w UI nie ma wyboru godziny; `occurred_at` traktowane jako **dzień**,
    - do API wysyłamy zawsze `YYYY-MM-DDT00:00:00Z`,
    - w UI wyświetlamy datę jako dzień w UTC (np. z `YYYY-MM-DD` → `dd/MM/yyyy`) **bez konwersji do strefy przeglądarki**,
    - wybór miesiąca i granice miesiąca są spójne z backendem (UTC).
- **Nawigacja w MVP** opiera się na **ekranie Start z kafelkami**; brak stałego menu 4 sekcji (poza linkiem Start w nagłówku).
- **Bezpieczeństwo i sesja**:
    - guard tras chronionych: **401 → `/login` + komunikat „Sesja wygasła”**,
    - **bez `returnTo`**: po zalogowaniu zawsze **`/app`**,
    - wylogowanie natychmiastowe (bez modala), czyści stan UI.

---

## 2. Lista widoków

> Dla widoków w strefie `/app/*` obowiązuje wspólny layout (nagłówek + toasty) oraz standard stanów: **loading / empty / error / data**.

### 2.1 Logowanie
- **Ścieżka:** `/login`
- **Główny cel:** zalogowanie użytkownika i wejście do aplikacji.
- **Kluczowe informacje:** formularz logowania, komunikaty błędów (bez ujawniania, czy e-mail istnieje).
- **Kluczowe komponenty widoku:**
    - Formularz: `email`, `password`
    - CTA: „Zaloguj”
    - Link: „Utwórz konto” → `/register`
    - Banner/Toast komunikatu „Sesja wygasła” (jeśli przekierowanie po 401)
- **UX / dostępność / bezpieczeństwo:**
    - Inline błędy walidacji pól + ogólny błąd logowania (np. „Nieprawidłowe dane”).
    - Po sukcesie zawsze redirect do **`/app`** (brak `returnTo`).

---

### 2.2 Rejestracja
- **Ścieżka:** `/register`
- **Główny cel:** utworzenie konta i przejście do logowania (lub auto-login, jeśli tak zdecyduje backend/SDK; w MVP wystarczy przejście do logowania).
- **Kluczowe informacje:** formularz rejestracji, walidacje (format e-mail, hasła identyczne).
- **Kluczowe komponenty widoku:**
    - Formularz: `email`, `password`, `passwordConfirm`
    - CTA: „Utwórz konto”
    - Link: „Mam konto” → `/login`
- **UX / dostępność / bezpieczeństwo:**
    - Inline walidacja zgodności haseł.
    - Czytelny błąd dla konfliktu (e-mail zajęty).

---

### 2.3 Start (Dashboard)
- **Ścieżka:** `/app`
- **Główny cel:** prosty punkt startowy i nawigacja do modułów.
- **Kluczowe informacje:** 4 kafelki (2×2).
- **Kluczowe komponenty widoku:**
    - Kafelki: **Transakcje** → `/app/transactions`, **Kategorie** → `/app/categories`, **Podsumowanie** → `/app/summary`, **Ustawienia** → `/app/settings`
- **UX / dostępność / bezpieczeństwo:**
    - Brak złożonych danych; szybka nawigacja.
    - Widok chroniony guardem.

---

### 2.4 Transakcje (lista + filtry + load more)
- **Ścieżka:** `/app/transactions?month=YYYY-MM[&category_id=uuid]`
- **Główny cel:** przegląd transakcji w miesiącu, filtrowanie po kategorii, CRUD transakcji.
- **Kluczowe informacje do wyświetlenia:**
    - Lista transakcji posortowana wg backendu: `occurred_at DESC, id DESC`
    - Aktualne filtry: miesiąc + kategoria („Wszystkie” domyślnie)
    - Stan paginacji (czy można „Załaduj więcej”)
- **Kluczowe komponenty widoku:**
    - **Pasek filtrów** (statyczny nad listą):
        - **MonthPicker** (wspólny z Podsumowaniem): strzałki poprzedni/następny + label miesiąca + (opcjonalny) dropdown
            - dropdown: bieżący miesiąc UTC + 12 poprzednich (13 łącznie); brak przyszłych
            - jeśli `month` spoza zakresu dropdownu: widok działa; dropdown może tymczasowo pokazać „poza zakresem” lub nie pokazywać, ale nie blokuje
        - **CategorySelect**:
            - domyślnie „Wszystkie” (brak `category_id` do API)
            - „Brak” widoczna i oznaczona jako systemowa
    - **Lista transakcji** (płaska):
        - Wiersz: data (dzień), opis, kwota, kategoria, etykieta typu (Wydatek/Przychód różnicowana kolorem)
        - Akcje: „Edytuj”, „Usuń”
    - CTA: „Dodaj transakcję” → otwiera **TransactionForm** w modalu/drawerze
    - **LoadMoreButton**:
        - `offset` jako stan komponentu (nie w URL); po odświeżeniu reset do 0
        - loader w przycisku; błąd inline pod listą + „Ponów”
- **UX / dostępność / bezpieczeństwo:**
    - **Data jako dzień**: brak time pickera; edycja/dodanie tylko daty.
    - **Kwota**: akceptuje „,” i „.” podczas wpisywania; normalizacja na blur do **stringa z kropką i 2 miejscami** (np. `"1234.50"`).
    - Usuwanie transakcji: modal „Czy na pewno?”.
    - Po dodaniu: toast sukcesu + refetch + przewinięcie do góry.
    - Po edycji/usunięciu: zachowanie pozycji scrolla.
    - Po edycji, jeśli transakcja nie pasuje do filtrów: toast „Zapisano.” + refetch.
    - Guard 401 (sesja wygasła) działa zawsze.

---

### 2.5 Formularz transakcji (wspólny dla dodawania i edycji)
- **Ścieżka:** jako modal/drawer z `/app/transactions` (bez osobnej trasy w MVP)
- **Główny cel:** szybkie dodanie lub edycja transakcji.
- **Kluczowe informacje:** pola, walidacje, kontekst (dodawanie vs edycja).
- **Kluczowe komponenty:**
    - Pola: `amount`, `type (expense/income)`, `category_id`, `description`, `date (dzień)`
    - Domyślne wartości:
        - data: „dzisiaj” w UTC (dla create)
    - Akcje: „Zapisz”, „Anuluj”
- **UX / dostępność / bezpieczeństwo:**
    - Inline walidacje (kwota 0.01–1 000 000.00, opis max 255 i niepusty, kategoria z listy).
    - `occurred_at` wysyłane jako `T00:00:00Z`.
    - Błędy API mapowane na pola (np. `VALIDATION_ERROR` → konkretne komunikaty).

---

### 2.6 Kategorie (lista + CRUD)
- **Ścieżka:** `/app/categories`
- **Główny cel:** zarządzanie kategoriami użytkownika.
- **Kluczowe informacje do wyświetlenia:**
    - Lista kategorii **alfabetycznie** (źródło prawdy: backend)
    - Wyróżnienie kategorii systemowej **„Brak”** (bez edycji/usuwania)
- **Kluczowe komponenty widoku:**
    - Lista kategorii:
        - Wiersz: nazwa, znacznik „systemowa” (dla „Brak”)
        - Akcje: „Edytuj”, „Usuń” (tylko dla niesystemowych)
    - CTA: „Dodaj kategorię” → modal/drawer (CategoryForm)
    - Usuwanie kategorii:
        - modal informacyjny o przeniesieniu transakcji do „Brak”
- **UX / dostępność / bezpieczeństwo:**
    - Walidacja nazwy: trim, brak pustych/whitespace-only, max 40, unikalność case-insensitive (obsługa 409).
    - Po usunięciu kategorii:
        - toast sukcesu,
        - w Transakcjach (jeśli filtr wskazywał usuniętą kategorię) filtr ma się przełączyć na „Wszystkie” przy kolejnej wizycie lub natychmiast (jeśli oba widoki współdzielą stan nawigacyjny/URL) — minimalnie: **nie zostawić filtra na nieistniejącej kategorii**.

---

### 2.7 Podsumowanie miesięczne
- **Ścieżka:** `/app/summary?month=YYYY-MM`
- **Główny cel:** szybka analiza miesiąca (saldo + rozbicie per kategoria) i nawigacja do szczegółów.
- **Kluczowe informacje do wyświetlenia:**
    - Na górze 3 wartości: `total_income`, `total_expenses`, `balance` (dla pustego miesiąca: 0,00)
    - Lista kategorii z danymi:
        - sortowanie **malejąco po wartości** `balance`
        - klik w kategorię → przejście do Transakcji z `month` i `category_id`
- **Kluczowe komponenty widoku:**
    - **MonthPicker** (wspólny)
    - Karty/metadane sum: Przychody, Wydatki, Saldo
    - Lista per kategoria (tylko kategorie z transakcjami w miesiącu)
- **UX / dostępność / bezpieczeństwo:**
    - Stan empty: wartości 0,00 i czytelna informacja „Brak transakcji w tym miesiącu”.
    - Klik kategorii przenosi do `/app/transactions?month=...&category_id=...`.

---

### 2.8 Ustawienia
- **Ścieżka:** `/app/settings`
- **Główny cel:** podstawowe ustawienia konta (MVP).
- **Kluczowe informacje do wyświetlenia:** e-mail, zmiana hasła, usunięcie konta.
- **Kluczowe komponenty widoku:**
    - Sekcja „Profil”: tylko e-mail (pole `timezone` niewidoczne w MVP)
    - Sekcja „Zmień hasło”: formularz `currentPassword`, `newPassword`, `newPasswordConfirm`
    - Sekcja „Usuń konto”: pole potwierdzenia `confirmation` wymagające wpisania „DELETE” + przycisk „Usuń konto”
- **UX / dostępność / bezpieczeństwo:**
    - Zmiana hasła: inline walidacja zgodności nowych haseł; błąd ogólny przy złym aktualnym haśle.
    - Usunięcie konta: bez dodatkowego modala (potwierdzenie przez wpisanie „DELETE”); po sukcesie toast + redirect `/login` + czyszczenie stanu.

---

### 2.9 Widoki pomocnicze (systemowe)
- **Ścieżki:** w zależności od routera, np. `/404` lub fallback
- **Główny cel:** czytelne obsłużenie nieistniejących tras i błędów krytycznych.
- **Kluczowe komponenty:**
    - NotFoundState (link do `/app` lub `/login` zależnie od sesji)
    - GlobalErrorBoundary (jeśli przewidziane)
- **UX / bezpieczeństwo:**
    - Brak ujawniania szczegółów technicznych.

---

## 3. Mapa podróży użytkownika

### 3.1 Główny przypadek użycia: szybkie dodanie wydatku i analiza miesiąca
1. Użytkownik wchodzi na `/login` i loguje się.
2. Po sukcesie trafia na `/app` (Start).
3. Klik „Transakcje” → `/app/transactions?month=YYYY-MM`.
4. (Opcjonalnie) Ustawia filtr kategorii.
5. Klik „Dodaj transakcję” → otwarcie formularza (modal/drawer).
6. Wpisuje kwotę (z „,” lub „.”), wybiera kategorię, typ (Wydatek), opis, datę (dzień).
7. Zapis:
    - toast sukcesu,
    - refetch listy,
    - przewinięcie do góry.
8. Przechodzi do „Podsumowanie” → `/app/summary?month=YYYY-MM`.
9. Widzi saldo i listę kategorii; klika kategorię → przejście do `/app/transactions?month=YYYY-MM&category_id=...`.

### 3.2 Zarządzanie kategoriami + konsekwencje usunięcia
1. `/app` → „Kategorie” → `/app/categories`.
2. Dodaje kategorię (modal/drawer) → toast + refetch listy.
3. Usuwa kategorię:
    - modal informuje o przeniesieniu transakcji do „Brak”,
    - po sukcesie toast + refetch listy,
    - jeśli ta kategoria była aktywnym filtrem w Transakcjach, UI nie pozwala utrzymać filtra na nieistniejącej kategorii (reset do „Wszystkie”).

### 3.3 Scenariusze konta
- Zmiana hasła: `/app/settings` → wypełnienie formularza → sukces → toast (bez wylogowania lub zgodnie z polityką backendu).
- Usunięcie konta: `/app/settings` → wpis „DELETE” → usuń → toast → `/login`.

### 3.4 Sesja wygasła
- Użytkownik jest na dowolnej trasie `/app/*`, API zwraca 401:
    - automatyczne przekierowanie na `/login`,
    - komunikat „Sesja wygasła”.

---

## 4. Układ i struktura nawigacji

### 4.1 Strefa niezalogowana
- `/login` ↔ `/register`
- Po zalogowaniu zawsze → `/app`

### 4.2 Strefa zalogowana: wspólny layout `/app/*`
**Nagłówek globalny:**
- Lewa strona: e-mail użytkownika
- Środek: tytuł bieżącego widoku
- Element stały: ikona/link **Start** (tooltip „Start”) → `/app`
- Prawa strona: przycisk **Wyloguj** (bez modala)

**Nawigacja funkcjonalna:**
- Główna nawigacja: **kafelki na `/app`**
- Nawigacja kontekstowa:
    - w Podsumowaniu: klik kategorii → Transakcje z filtrami w URL
    - w Transakcjach: filtry (miesiąc zawsze w URL, kategoria opcjonalnie)
- URL odtwarzalny:
    - Transakcje: zawsze `month=YYYY-MM`, opcjonalnie `category_id`
    - Podsumowanie: zawsze `month=YYYY-MM`

---

## 5. Kluczowe komponenty

### 5.1 Komponenty strukturalne
- **AppLayout**: wspólny layout dla `/app/*` (nagłówek, miejsce na treść, globalne toasty).
- **AuthLayout** : prosty layout dla `/login` i `/register`.
- **RouteGuard**: ochrona tras `/app/*`; obsługa 401 → `/login` + „Sesja wygasła”.

### 5.2 Komponenty nawigacji i filtrów
- **StartTilesGrid**: 2×2 kafelki na `/app`.
- **MonthPicker**: wspólny dla Transakcji i Podsumowania (UTC, strzałki + dropdown z 13 miesiącami).
- **CategorySelect**: dropdown kategorii (w tym „Brak” jako systemowa); opcja „Wszystkie”.

### 5.3 Komponenty danych i stanów widoku
- **DataStateWrapper**: ujednolicone stany: loading / empty / error / data.
- **ErrorState**: komunikat + przycisk „Spróbuj ponownie” (refetch) dla Transakcji/Kategorii/Podsumowania.
- **EmptyState**: komunikat zależny od filtrów (np. „Brak transakcji w styczniu 2026 dla kategorii X”) + CTA.

### 5.4 Komponenty CRUD
- **TransactionListRow**: prezentacja transakcji + akcje Edytuj/Usuń.
- **TransactionFormModal/Drawer**: create/edit + walidacja inline + normalizacja kwoty + data jako dzień.
- **CategoryFormModal/Drawer**: create/edit nazwy kategorii + walidacja.
- **ConfirmDialog**:
    - dla usuwania transakcji: „Czy na pewno?”
    - dla usuwania kategorii: informacja o przeniesieniu do „Brak”

### 5.5 Komponenty pomocnicze
- **ToastSystem**: spójne komunikaty sukcesu i błędów mutacji.
- **LoadMoreButton**: loader, retry inline bez kasowania już pobranych elementów.

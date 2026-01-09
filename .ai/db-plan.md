## 1. Lista tabel z kolumnami, typami danych i ograniczeniami

### Wymagane rozszerzenia i typy

- **Extension**: `citext` (unikalność nazw kategorii case-insensitive)
- **Extension**: `pgcrypto` (np. `gen_random_uuid()`)

- **Enum**: `public.transaction_type`
  - wartości: `expense`, `income`

- **Enum**: `public.event_name`
  - wartości (MVP): `screen_view_transactions_list`, `screen_view_monthly_summary`

---

### (Źródło tożsamości) `auth.users` (Supabase Auth)

This table is managed by Supabase Auth.

- Źródło prawdy dla użytkowników (poza schematem `public`).
- Klucz: `auth.users.id uuid`

---

### `public.profiles` (1:1 z `auth.users`)

**Cel:** dane aplikacyjne użytkownika (m.in. strefa czasowa).

Kolumny:

- `id uuid` **PK**, **FK → auth.users(id)**, `ON DELETE CASCADE`
- `timezone text` **NOT NULL** `DEFAULT 'Europe/Warsaw'`
  - **CHECK**: `char_length(timezone) BETWEEN 1 AND 64`
- `created_at timestamptz` **NOT NULL** `DEFAULT now()`
- `updated_at timestamptz` **NOT NULL** `DEFAULT now()`

Ograniczenia / uwagi:

- 1:1 z `auth.users` przez współdzielony klucz `id`.
- `updated_at` utrzymywane przez trigger.

---

### `public.categories`

**Cel:** kategorie użytkownika, w tym jedna systemowa „Brak” per użytkownik.

Kolumny:

- `id uuid` **PK** `DEFAULT gen_random_uuid()`
- `user_id uuid` **NOT NULL**, **FK → auth.users(id)** `ON DELETE CASCADE`
- `name citext` **NOT NULL**
  - **CHECK**: `char_length(name::text) BETWEEN 1 AND 40`
  - **CHECK**: `btrim(name::text) <> ''`
  - **CHECK**: `name::text = btrim(name::text)` (blokada wiodących/końcowych spacji)
- `is_system boolean` **NOT NULL** `DEFAULT false`
- `system_key text` `NULL` (np. `'none'` dla „Brak”)
  - **CHECK**: `system_key IS NULL OR char_length(system_key) BETWEEN 1 AND 32`
- `created_at timestamptz` **NOT NULL** `DEFAULT now()`
- `updated_at timestamptz` **NOT NULL** `DEFAULT now()`

Unikalność:

- **UNIQUE** `(user_id, name)` (działa case-insensitive dzięki `citext`)
- **UNIQUE** `(user_id, system_key)` **WHERE** `system_key IS NOT NULL`
  - zapewnia max 1 kategorię „Brak” (`system_key='none'`) per użytkownik

Dodatkowa integralność pod FK:

- **UNIQUE** `(user_id, id)`  
  (wspiera kompozytowy FK z `transactions` gwarantujący zgodność właściciela kategorii i transakcji)

Reguły systemowe (DB-level, przez triggery/funkcje – opis w sekcji 5):

- blokada `DELETE` kategorii systemowej (`is_system=true`, w szczególności `system_key='none'`)
- blokada zmiany `name/system_key/is_system` dla kategorii systemowej
- przy `DELETE` zwykłej kategorii: automatyczne przepięcie transakcji do „Brak” (bez `NULL`)

---

### `public.transactions`

**Cel:** transakcje (wydatek/przychód) z czasem w UTC (`timestamptz`).

Kolumny:

- `id uuid` **PK** `DEFAULT gen_random_uuid()`
- `user_id uuid` **NOT NULL**, **FK → auth.users(id)** `ON DELETE CASCADE`
- `category_id uuid` **NOT NULL**
- `amount numeric(12,2)` **NOT NULL**
  - **CHECK**: `amount >= 0.01 AND amount <= 1000000.00`
- `type public.transaction_type` **NOT NULL**
- `occurred_at timestamptz` **NOT NULL** `DEFAULT now()` (zapisywane jako UTC w `timestamptz`)
- `description text` **NOT NULL**
  - **CHECK**: `char_length(description) BETWEEN 1 AND 255`
  - **CHECK**: `btrim(description) <> ''` (blokada whitespace-only)
- `created_at timestamptz` **NOT NULL** `DEFAULT now()`
- `updated_at timestamptz` **NOT NULL** `DEFAULT now()`

Klucze obce:

- Kompozytowy **FK** `(user_id, category_id) → public.categories(user_id, id)`
  - gwarantuje, że transakcja nie może wskazywać kategorii innego użytkownika
  - `ON DELETE RESTRICT` (usunięcie kategorii wymaga najpierw przepięcia transakcji)

---

### `public.events`

**Cel:** instrumentacja (minimum: otwarcia ekranów listy i podsumowania).

Kolumny:

- `id uuid` **PK** `DEFAULT gen_random_uuid()`
- `user_id uuid` **NOT NULL**, **FK → auth.users(id)** `ON DELETE CASCADE`
- `event_name public.event_name` **NOT NULL**
- `event_at timestamptz` **NOT NULL** `DEFAULT now()`
- `properties jsonb` **NOT NULL** `DEFAULT '{}'::jsonb`
  - **CHECK**: `jsonb_typeof(properties) = 'object'`
- `created_at timestamptz` **NOT NULL** `DEFAULT now()`

Ograniczenia/uwagi:

- W MVP zakładamy insert-only (brak UPDATE/DELETE z poziomu klienta).

---

## 2. Relacje między tabelami (kardynalność)

- `auth.users (1) — (1) public.profiles`
  - `profiles.id` = `auth.users.id` (1:1)

- `auth.users (1) — (N) public.categories`
  - `categories.user_id → auth.users.id`

- `auth.users (1) — (N) public.transactions`
  - `transactions.user_id → auth.users.id`

- `public.categories (1) — (N) public.transactions`
  - przez kompozyt: `(transactions.user_id, transactions.category_id) → (categories.user_id, categories.id)`
  - wymusza zgodność właściciela

- `auth.users (1) — (N) public.events`
  - `events.user_id → auth.users.id`

---

## 3. Indeksy (pod MVP: filtrowanie po miesiącu, kategorii, sortowanie, metryki)

### `public.categories`

- `UNIQUE (user_id, name)`
- `UNIQUE (user_id, system_key) WHERE system_key IS NOT NULL`
- (opcjonalnie, pod listę): `INDEX (user_id, name)`  
  _(często zbędne, bo UNIQUE już pomaga, ale bywa użyteczne do sortowania/odczytu listy)_

### `public.transactions`

- Najczęstsze zapytanie (lista po miesiącu, sort DESC, paginacja stabilna):
  - `INDEX transactions_user_occurred_id_desc ON (user_id, occurred_at DESC, id DESC)`
- Filtr po kategorii + miesiąc:
  - `INDEX transactions_user_category_occurred_id_desc ON (user_id, category_id, occurred_at DESC, id DESC)`
- Metryka aktywacji (count w oknie 30 dni od rejestracji, po `created_at`):
  - `INDEX transactions_user_created_at ON (user_id, created_at)`

### `public.events`

- Odczyt zdarzeń użytkownika w czasie:
  - `INDEX events_user_event_at_desc ON (user_id, event_at DESC)`
- (opcjonalnie) analityka per typ zdarzenia:
  - `INDEX events_user_name_event_at_desc ON (user_id, event_name, event_at DESC)`

---

## 4. Zasady PostgreSQL (RLS)

> Włącz RLS na: `public.profiles`, `public.categories`, `public.transactions`, `public.events`.

### `public.profiles`

- **SELECT**: `id = auth.uid()`
- **UPDATE**: `id = auth.uid()`
- **INSERT/DELETE**: brak polityk dla roli klienta (tworzone przez trigger po rejestracji; usuwane kaskadowo)

### `public.categories`

- **SELECT**: `user_id = auth.uid()`
- **INSERT**: `user_id = auth.uid()` **AND** `is_system = false` **AND** `system_key IS NULL`
- **UPDATE**: `user_id = auth.uid()` **AND** `is_system = false` **AND** `system_key IS NULL`
- **DELETE**: `user_id = auth.uid()` **AND** `is_system = false` **AND** `system_key IS NULL`
  - (dodatkowo DB-level blokada „Brak” przez trigger)

### `public.transactions`

- **SELECT**: `user_id = auth.uid()`
- **INSERT**: `user_id = auth.uid()`
- **UPDATE**: `user_id = auth.uid()`
- **DELETE**: `user_id = auth.uid()`

### `public.events`

- **SELECT**: `user_id = auth.uid()` (opcjonalnie — można wyłączyć, jeśli niepotrzebne w UI)
- **INSERT**: `user_id = auth.uid()`
- **UPDATE/DELETE**: brak polityk (domyślnie zablokowane)

---

## 5. Dodatkowe uwagi / decyzje projektowe (ważne dla migracji)

### Triggery i funkcje systemowe (zalecane w schemacie)

1. **Audyt `updated_at`**

- Funkcja: `public.set_updated_at()` ustawiająca `NEW.updated_at = now()`
- Triggery `BEFORE UPDATE` na: `profiles`, `categories`, `transactions` (opcjonalnie `events` jeśli dopuszczasz update)

2. **Seed po rejestracji (Supabase Auth)**

- Trigger `AFTER INSERT ON auth.users` → funkcja `SECURITY DEFINER` (np. `public.handle_new_user()`)
  - tworzy `public.profiles` (id = new.id, timezone default)
  - tworzy systemową kategorię „Brak”:
    - `is_system = true`
    - `system_key = 'none'`
    - `name = 'Brak'`
  - idempotencja: `INSERT ... ON CONFLICT DO NOTHING`

3. **Blokady dla kategorii systemowej**

- Trigger `BEFORE DELETE ON public.categories`:
  - jeśli `OLD.is_system = true` → `RAISE EXCEPTION`
- Trigger `BEFORE UPDATE ON public.categories`:
  - jeśli `OLD.is_system = true` i próba zmiany `name/system_key/is_system` → `RAISE EXCEPTION`

4. **Automatyczne przepięcie transakcji przy usuwaniu kategorii**

- Trigger `BEFORE DELETE ON public.categories` (dla `is_system=false`):
  - znajduje `default_category_id` użytkownika: `SELECT id FROM categories WHERE user_id=OLD.user_id AND system_key='none'`
  - `UPDATE transactions SET category_id = default_category_id WHERE user_id=OLD.user_id AND category_id=OLD.id`
  - dopiero potem pozwala na usunięcie kategorii

### Filtrowanie miesięczne (logika aplikacyjna / zapytań)

- `transactions.occurred_at` jest `timestamptz` (UTC).
- Granice miesiąca liczysz wg `profiles.timezone` (aktualnej strefy użytkownika), wyznaczając `[month_start_utc, month_end_utc)` i filtrując:
  - `WHERE user_id = auth.uid() AND occurred_at >= :start_utc AND occurred_at < :end_utc`
- Saldo w zapytaniach:
  - `SUM(CASE WHEN type='expense' THEN -amount ELSE amount END)`

### Normalizacja i skalowalność

- 3NF zachowana (brak denormalizacji w MVP).
- Brak partycjonowania (mały wolumen), nacisk na indeksy pod listę i podsumowanie.
- Stabilna paginacja offset/limit: `ORDER BY occurred_at DESC, id DESC`.

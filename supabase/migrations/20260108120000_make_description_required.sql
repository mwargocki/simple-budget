-- =============================================================================
-- Migration: make_description_required
-- Created at: 2026-01-08 12:00:00 UTC
-- Purpose: Make description field required (NOT NULL) for transactions
--
-- Reason:
--   Business requirement changed - description is now a mandatory field
--   for all transactions. Users must provide context for each expense/income.
--
-- Affected objects:
--   - Modifies column: public.transactions.description (NULL -> NOT NULL)
--   - Drops constraint: transactions_description_length
--   - Drops constraint: transactions_description_not_blank
--   - Creates constraint: transactions_description_length (without NULL check)
--   - Creates constraint: transactions_description_not_blank (without NULL check)
--
-- Notes:
--   - This is a safe migration that can be rolled back if needed
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Drop existing constraints that reference NULL
-- -----------------------------------------------------------------------------
alter table public.transactions
  drop constraint if exists transactions_description_length;

alter table public.transactions
  drop constraint if exists transactions_description_not_blank;

-- -----------------------------------------------------------------------------
-- 2. Alter column to NOT NULL
-- -----------------------------------------------------------------------------
alter table public.transactions
  alter column description set not null;

-- -----------------------------------------------------------------------------
-- 3. Add new constraints without NULL checks
-- -----------------------------------------------------------------------------
-- Length constraint: 1-255 characters (minimum 1 ensures non-empty)
alter table public.transactions
  add constraint transactions_description_length
  check (char_length(description) between 1 and 255);

-- Not blank constraint: cannot be whitespace-only
alter table public.transactions
  add constraint transactions_description_not_blank
  check (btrim(description) <> '');

-- -----------------------------------------------------------------------------
-- 4. Update column comment
-- -----------------------------------------------------------------------------
comment on column public.transactions.description is 'Transaction description (required, 1-255 chars)';
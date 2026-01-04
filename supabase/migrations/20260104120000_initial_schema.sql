-- =============================================================================
-- Migration: initial_schema
-- Created at: 2026-01-04 12:00:00 UTC
-- Purpose: Creates the initial database schema for SimpleBudget application
--
-- Affected objects:
--   Extensions: citext, pgcrypto
--   Enums: public.transaction_type, public.event_name
--   Tables: public.profiles, public.categories, public.transactions, public.events
--   Functions: public.set_updated_at(), public.handle_new_user(),
--              public.prevent_system_category_delete(),
--              public.prevent_system_category_update(),
--              public.reassign_transactions_on_category_delete()
--   Triggers: Multiple triggers for audit, seed, and integrity
--   RLS Policies: Granular policies for each table and operation
--
-- Notes:
--   - All timestamps use timestamptz (UTC) for consistency
--   - RLS is enabled on all public tables
--   - System category "Brak" is automatically created for each new user
--   - Categories cannot be deleted if they are system categories
--   - Transactions are automatically reassigned to "Brak" when their category is deleted
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Enable required extensions
-- -----------------------------------------------------------------------------

-- citext provides case-insensitive text type for unique category names
create extension if not exists citext with schema public;

-- pgcrypto provides gen_random_uuid() for generating UUIDs
create extension if not exists pgcrypto with schema public;

-- -----------------------------------------------------------------------------
-- 2. Create custom enum types
-- -----------------------------------------------------------------------------

-- Transaction type: expense (outgoing money) or income (incoming money)
create type public.transaction_type as enum ('expense', 'income');

-- Event names for analytics/instrumentation (MVP: screen views only)
create type public.event_name as enum ('screen_view_transactions_list', 'screen_view_monthly_summary');

-- -----------------------------------------------------------------------------
-- 3. Create utility functions
-- -----------------------------------------------------------------------------

-- Function to automatically update the updated_at timestamp on row modification
-- Used by BEFORE UPDATE triggers on tables with updated_at column
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Function to handle new user registration (called by auth.users trigger)
-- Creates profile and system "Brak" category for each new user
-- Uses SECURITY DEFINER to bypass RLS when inserting into public tables
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Create user profile with default timezone
  insert into public.profiles (id, timezone)
  values (new.id, 'Europe/Warsaw')
  on conflict (id) do nothing;

  -- Create system category "Brak" (None) for the user
  -- This category cannot be deleted and serves as default for orphaned transactions
  insert into public.categories (user_id, name, is_system, system_key)
  values (new.id, 'Brak', true, 'none')
  on conflict (user_id, system_key) where system_key is not null do nothing;

  return new;
end;
$$;

-- Function to prevent deletion of system categories
-- Raises exception if attempting to delete a category with is_system = true
create or replace function public.prevent_system_category_delete()
returns trigger
language plpgsql
as $$
begin
  if old.is_system = true then
    raise exception 'Cannot delete system category (id: %, name: %)', old.id, old.name;
  end if;
  return old;
end;
$$;

-- Function to prevent modification of protected fields on system categories
-- Protected fields: name, is_system, system_key
create or replace function public.prevent_system_category_update()
returns trigger
language plpgsql
as $$
begin
  if old.is_system = true then
    -- Check if any protected field is being modified
    if new.name is distinct from old.name or
       new.is_system is distinct from old.is_system or
       new.system_key is distinct from old.system_key then
      raise exception 'Cannot modify protected fields (name, is_system, system_key) on system category (id: %, name: %)', old.id, old.name;
    end if;
  end if;
  return new;
end;
$$;

-- Function to reassign transactions to "Brak" category before deleting a user category
-- Only applies to non-system categories (system categories cannot be deleted)
create or replace function public.reassign_transactions_on_category_delete()
returns trigger
language plpgsql
as $$
declare
  default_category_id uuid;
begin
  -- Only process non-system categories (system categories are blocked by another trigger)
  if old.is_system = false then
    -- Find the user's system "Brak" category
    select id into default_category_id
    from public.categories
    where user_id = old.user_id and system_key = 'none';

    if default_category_id is null then
      raise exception 'Cannot find default category for user %', old.user_id;
    end if;

    -- Reassign all transactions from the deleted category to "Brak"
    update public.transactions
    set category_id = default_category_id, updated_at = now()
    where user_id = old.user_id and category_id = old.id;
  end if;

  return old;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. Create tables
-- -----------------------------------------------------------------------------

-- profiles: User application data (1:1 with auth.users)
-- Stores user preferences like timezone
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'Europe/Warsaw'
    constraint profiles_timezone_length check (char_length(timezone) between 1 and 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add comment for documentation
comment on table public.profiles is 'User application profiles (1:1 with auth.users)';
comment on column public.profiles.timezone is 'User timezone for date/time display (IANA format)';

-- categories: User-defined and system categories for transactions
-- Each user has one system category "Brak" created on registration
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name citext not null
    constraint categories_name_length check (char_length(name::text) between 1 and 40)
    constraint categories_name_not_blank check (btrim(name::text) <> '')
    constraint categories_name_trimmed check (name::text = btrim(name::text)),
  is_system boolean not null default false,
  system_key text null
    constraint categories_system_key_length check (system_key is null or char_length(system_key) between 1 and 32),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Unique constraint for category names per user (case-insensitive via citext)
  constraint categories_user_name_unique unique (user_id, name),

  -- Unique constraint for user_id + id to support composite FK from transactions
  constraint categories_user_id_unique unique (user_id, id)
);

-- Partial unique index to ensure only one system category per system_key per user
create unique index categories_user_system_key_unique
  on public.categories (user_id, system_key)
  where system_key is not null;

comment on table public.categories is 'Transaction categories (user-defined and system)';
comment on column public.categories.is_system is 'True for system-managed categories (cannot be deleted)';
comment on column public.categories.system_key is 'Identifier for system categories (e.g., "none" for Brak)';

-- transactions: Income and expense records
-- Uses composite FK to ensure category belongs to same user as transaction
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null,
  amount numeric(12,2) not null
    constraint transactions_amount_range check (amount >= 0.01 and amount <= 1000000.00),
  type public.transaction_type not null,
  occurred_at timestamptz not null default now(),
  description text null
    constraint transactions_description_length check (description is null or char_length(description) <= 255)
    constraint transactions_description_not_blank check (description is null or btrim(description) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Composite FK ensures category belongs to the same user as the transaction
  -- ON DELETE RESTRICT prevents category deletion while transactions reference it
  -- (reassignment is handled by trigger before this constraint is checked)
  constraint transactions_category_fk
    foreign key (user_id, category_id)
    references public.categories(user_id, id)
    on delete restrict
);

comment on table public.transactions is 'User income and expense transactions';
comment on column public.transactions.occurred_at is 'When the transaction occurred (stored as UTC timestamptz)';
comment on column public.transactions.amount is 'Transaction amount in PLN (0.01 to 1,000,000.00)';

-- events: Analytics/instrumentation data (insert-only in MVP)
-- Tracks screen views and other user interactions
create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_name public.event_name not null,
  event_at timestamptz not null default now(),
  properties jsonb not null default '{}'::jsonb
    constraint events_properties_is_object check (jsonb_typeof(properties) = 'object'),
  created_at timestamptz not null default now()
);

comment on table public.events is 'User analytics events (insert-only)';
comment on column public.events.properties is 'Additional event metadata as JSON object';

-- -----------------------------------------------------------------------------
-- 5. Create indexes for query performance
-- -----------------------------------------------------------------------------

-- Categories: index for listing user categories sorted by name
create index categories_user_name_idx on public.categories (user_id, name);

-- Transactions: primary index for listing transactions by month (paginated, descending)
-- Includes id for stable cursor-based pagination
create index transactions_user_occurred_id_desc_idx
  on public.transactions (user_id, occurred_at desc, id desc);

-- Transactions: index for filtering by category within a time range
create index transactions_user_category_occurred_id_desc_idx
  on public.transactions (user_id, category_id, occurred_at desc, id desc);

-- Transactions: index for activation metrics (count in first 30 days)
create index transactions_user_created_at_idx
  on public.transactions (user_id, created_at);

-- Events: index for reading user events in reverse chronological order
create index events_user_event_at_desc_idx
  on public.events (user_id, event_at desc);

-- Events: index for analytics by event type
create index events_user_name_event_at_desc_idx
  on public.events (user_id, event_name, event_at desc);

-- -----------------------------------------------------------------------------
-- 6. Create triggers
-- -----------------------------------------------------------------------------

-- Trigger: Update profiles.updated_at on modification
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Trigger: Update categories.updated_at on modification
create trigger categories_set_updated_at
  before update on public.categories
  for each row
  execute function public.set_updated_at();

-- Trigger: Update transactions.updated_at on modification
create trigger transactions_set_updated_at
  before update on public.transactions
  for each row
  execute function public.set_updated_at();

-- Trigger: Create profile and system category for new users (auth.users)
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Trigger: Prevent deletion of system categories
-- Runs first (priority via trigger name ordering)
create trigger categories_prevent_system_delete
  before delete on public.categories
  for each row
  execute function public.prevent_system_category_delete();

-- Trigger: Prevent modification of protected fields on system categories
create trigger categories_prevent_system_update
  before update on public.categories
  for each row
  execute function public.prevent_system_category_update();

-- Trigger: Reassign transactions before category deletion
-- Runs after system category check, before FK constraint check
create trigger categories_reassign_transactions_on_delete
  before delete on public.categories
  for each row
  execute function public.reassign_transactions_on_category_delete();

-- -----------------------------------------------------------------------------
-- 7. Enable Row Level Security (RLS)
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.events enable row level security;

-- -----------------------------------------------------------------------------
-- 8. Create RLS Policies
-- -----------------------------------------------------------------------------

-- ============== PROFILES POLICIES ==============

-- profiles: SELECT policy for authenticated users
-- Users can only read their own profile
create policy "profiles_select_authenticated"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

-- profiles: UPDATE policy for authenticated users
-- Users can only update their own profile
create policy "profiles_update_authenticated"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Note: INSERT and DELETE are not exposed to clients
-- Profile creation is handled by handle_new_user() trigger (SECURITY DEFINER)
-- Profile deletion happens via CASCADE when auth.users is deleted

-- ============== CATEGORIES POLICIES ==============

-- categories: SELECT policy for authenticated users
-- Users can only view their own categories
create policy "categories_select_authenticated"
  on public.categories
  for select
  to authenticated
  using (user_id = auth.uid());

-- categories: INSERT policy for authenticated users
-- Users can only create non-system categories for themselves
-- System categories are created by handle_new_user() trigger
create policy "categories_insert_authenticated"
  on public.categories
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and is_system = false
    and system_key is null
  );

-- categories: UPDATE policy for authenticated users
-- Users can only update their own non-system categories
-- System category protection is also enforced by trigger
create policy "categories_update_authenticated"
  on public.categories
  for update
  to authenticated
  using (
    user_id = auth.uid()
    and is_system = false
    and system_key is null
  )
  with check (
    user_id = auth.uid()
    and is_system = false
    and system_key is null
  );

-- categories: DELETE policy for authenticated users
-- Users can only delete their own non-system categories
-- System category protection is also enforced by trigger
create policy "categories_delete_authenticated"
  on public.categories
  for delete
  to authenticated
  using (
    user_id = auth.uid()
    and is_system = false
    and system_key is null
  );

-- ============== TRANSACTIONS POLICIES ==============

-- transactions: SELECT policy for authenticated users
-- Users can only view their own transactions
create policy "transactions_select_authenticated"
  on public.transactions
  for select
  to authenticated
  using (user_id = auth.uid());

-- transactions: INSERT policy for authenticated users
-- Users can only create transactions for themselves
create policy "transactions_insert_authenticated"
  on public.transactions
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- transactions: UPDATE policy for authenticated users
-- Users can only update their own transactions
create policy "transactions_update_authenticated"
  on public.transactions
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- transactions: DELETE policy for authenticated users
-- Users can only delete their own transactions
create policy "transactions_delete_authenticated"
  on public.transactions
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ============== EVENTS POLICIES ==============

-- events: SELECT policy for authenticated users
-- Users can view their own events (useful for debugging/display)
create policy "events_select_authenticated"
  on public.events
  for select
  to authenticated
  using (user_id = auth.uid());

-- events: INSERT policy for authenticated users
-- Users can only insert events for themselves
create policy "events_insert_authenticated"
  on public.events
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Note: UPDATE and DELETE are intentionally not exposed to clients
-- Events table is insert-only in MVP for data integrity

-- -----------------------------------------------------------------------------
-- 9. Grant permissions to roles
-- -----------------------------------------------------------------------------

-- Grant usage on custom types to authenticated role
grant usage on type public.transaction_type to authenticated;
grant usage on type public.event_name to authenticated;

-- Note: Table permissions are implicitly granted through RLS policies
-- Supabase automatically grants necessary permissions to authenticated role
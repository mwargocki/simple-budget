-- Migration: Drop events table and related objects
-- Purpose: Remove screen view analytics/instrumentation (US-035 removed from requirements)
--
-- This migration drops:
--   - RLS policies for events table
--   - Indexes on events table
--   - The events table itself
--   - The event_name enum type
--   - Updates delete_user_account function to remove events deletion

-- Drop RLS policies for events
drop policy if exists "events_select_authenticated" on public.events;
drop policy if exists "events_insert_authenticated" on public.events;

-- Drop indexes
drop index if exists public.events_user_event_at_desc_idx;
drop index if exists public.events_user_name_event_at_desc_idx;

-- Drop the events table (this also drops RLS)
drop table if exists public.events;

-- Drop the event_name enum type
drop type if exists public.event_name;

-- Revoke permissions (already dropped with table/type, but for clarity)
-- No action needed as they're automatically revoked

-- Update delete_user_account function to remove events deletion
create or replace function public.delete_user_account(target_user_id uuid)
returns void
security definer
set search_path = public
language plpgsql
as $$
begin
  -- Delete transactions first (due to FK constraint with categories)
  delete from public.transactions where user_id = target_user_id;

  -- Delete categories (including system ones - we're the definer)
  delete from public.categories where user_id = target_user_id;

  -- Delete profile
  delete from public.profiles where id = target_user_id;

  -- Delete the user from auth.users (CASCADE will handle any remaining refs)
  delete from auth.users where id = target_user_id;
end;
$$;

comment on function public.delete_user_account(uuid) is 'Deletes a user account and all associated data (transactions, categories, profile)';
-- =============================================================================
-- Migration: fix_delete_user_account_function
-- Created at: 2026-01-10 13:00:00 UTC
-- Purpose: Fix delete_user_account function - remove references to non-existent trigger
-- =============================================================================

-- The previous migration tried to disable/enable categories_prevent_system_delete trigger
-- but this trigger was already dropped in 20260105120000_drop_system_category_delete_trigger.sql
-- This migration replaces the function with a simpler version

create or replace function public.delete_user_account(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Delete transactions first (they reference categories)
  delete from public.transactions where user_id = target_user_id;

  -- Delete events
  delete from public.events where user_id = target_user_id;

  -- Delete all categories (including system ones)
  delete from public.categories where user_id = target_user_id;

  -- Delete profile
  delete from public.profiles where id = target_user_id;

  -- Note: The actual auth.users deletion must be done via supabaseAdmin.auth.admin.deleteUser()
  -- This function only cleans up the public schema data
end;
$$;

comment on function public.delete_user_account is 'Safely deletes all user data from public schema before account deletion';
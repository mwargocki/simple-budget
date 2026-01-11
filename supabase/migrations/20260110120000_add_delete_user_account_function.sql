-- =============================================================================
-- Migration: add_delete_user_account_function
-- Created at: 2026-01-10 12:00:00 UTC
-- Purpose: Creates a function to safely delete a user account with all related data
-- =============================================================================

-- Function to delete a user account and all related data
-- This function temporarily disables the trigger that prevents system category deletion
-- and then deletes all user data in the correct order
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

  -- Delete all categories (including system ones) by temporarily disabling the trigger
  -- We need to use dynamic SQL to disable/enable trigger
  execute 'ALTER TABLE public.categories DISABLE TRIGGER categories_prevent_system_delete';

  begin
    delete from public.categories where user_id = target_user_id;
  exception when others then
    execute 'ALTER TABLE public.categories ENABLE TRIGGER categories_prevent_system_delete';
    raise;
  end;

  execute 'ALTER TABLE public.categories ENABLE TRIGGER categories_prevent_system_delete';

  -- Delete profile
  delete from public.profiles where id = target_user_id;

  -- Note: The actual auth.users deletion must be done via supabaseAdmin.auth.admin.deleteUser()
  -- This function only cleans up the public schema data
end;
$$;

-- Grant execute permission to service_role (used by supabaseAdmin)
grant execute on function public.delete_user_account(uuid) to service_role;

comment on function public.delete_user_account is 'Safely deletes all user data from public schema before account deletion';
-- =============================================================================
-- Migration: fix_delete_user_account_disable_triggers
-- Created at: 2026-01-10 14:00:00 UTC
-- Purpose: Fix delete_user_account function - disable reassign trigger during deletion
-- =============================================================================

-- When deleting all categories for a user, the reassign_transactions_on_category_delete
-- trigger fires and tries to find the "Brak" category to reassign transactions.
-- Since we're deleting all categories (including "Brak") and transactions are already
-- deleted, we need to temporarily disable this trigger.

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

  -- Temporarily disable the reassign trigger since:
  -- 1. We already deleted all transactions above
  -- 2. We're deleting all categories including the system "Brak" category
  execute 'ALTER TABLE public.categories DISABLE TRIGGER categories_reassign_transactions_on_delete';

  begin
    -- Delete all categories (including system ones)
    delete from public.categories where user_id = target_user_id;
  exception when others then
    -- Re-enable trigger on error
    execute 'ALTER TABLE public.categories ENABLE TRIGGER categories_reassign_transactions_on_delete';
    raise;
  end;

  -- Re-enable trigger
  execute 'ALTER TABLE public.categories ENABLE TRIGGER categories_reassign_transactions_on_delete';

  -- Delete profile
  delete from public.profiles where id = target_user_id;

  -- Note: The actual auth.users deletion must be done via supabaseAdmin.auth.admin.deleteUser()
  -- This function only cleans up the public schema data
end;
$$;

comment on function public.delete_user_account is 'Safely deletes all user data from public schema before account deletion';
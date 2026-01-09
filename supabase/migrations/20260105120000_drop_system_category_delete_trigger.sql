-- =============================================================================
-- Migration: drop_system_category_delete_trigger
-- Created at: 2026-01-05 12:00:00 UTC
-- Purpose: Remove trigger blocking system category deletion to allow CASCADE
--
-- Reason:
--   The prevent_system_category_delete trigger blocks ALL deletions of system
--   categories, including CASCADE deletes when a user is removed from auth.users.
--
--   RLS policy categories_delete_authenticated already prevents authenticated
--   users from deleting system categories (is_system = false condition).
--   The trigger is redundant and blocks legitimate CASCADE operations.
--
-- Affected objects:
--   - Drops trigger: categories_prevent_system_delete
--   - Drops function: public.prevent_system_category_delete()
-- =============================================================================

-- Drop the trigger first (depends on function)
drop trigger if exists categories_prevent_system_delete on public.categories;

-- Drop the function
drop function if exists public.prevent_system_category_delete();
-- ==============================================================================
-- ROADRIDER MIGRATION 20260928000007: HARDEN ADMIN FULL ACCESS RLS
-- Linked Supabase Project: sjahblquggmzlihqgzyt
-- ==============================================================================
-- Problem:
-- "Admin Full Access" policies on public tables were configured with USING (true)
-- and WITH CHECK (true) without scoping to master admin. Because PostgreSQL RLS
-- evaluates permissive policies with OR, this bypassed table-specific owner
-- policies (vendors, partners, customers) and allowed cross-account data leaks.
--
-- Solution:
-- Replace "Admin Full Access" on all public tables so it is strictly scoped to
-- public.is_master_admin().
-- This restores strict account-level data isolation for vendors, partners, and
-- customers while preserving full administrative capability for Master Admin.
-- ==============================================================================

DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN
        SELECT tablename
        FROM pg_policies
        WHERE schemaname = 'public'
          AND policyname = 'Admin Full Access'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Admin Full Access" ON public.%I', tbl);
        EXECUTE format(
            'CREATE POLICY "Admin Full Access" ON public.%I FOR ALL TO authenticated USING (public.is_master_admin()) WITH CHECK (public.is_master_admin())',
            tbl
        );
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

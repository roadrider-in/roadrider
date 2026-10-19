-- ==============================================================================
-- ROADRIDER MIGRATION 20260928000004: PROFILE INITIALIZATION & RECOVERY
-- ==============================================================================
-- 1. Hardens public.handle_new_user() trigger function on auth.users.
--    - Defaults standard public signups to least-privilege 'customer' (not 'vendor').
--    - Never trusts raw_user_meta_data.role for privileged or business roles.
--    - Rejects unauthorized client-side role escalation attempts.
--    - Preserves Master Admin verification strictly for Auth UUID a526a5c8-80d6-491b-b188-3f450878ad90
--      and verified immutable email techroadrider@gmail.com.
--    - Uses safe idempotent ON CONFLICT (id) DO NOTHING to preserve existing profiles.
--    - Inspects GET STACKED DIAGNOSTICS to handle phone uniqueness collisions specifically
--      without swallowing unrelated unique constraint errors.
-- 2. Scopes on_auth_user_created trigger check explicitly to auth.users.
-- 3. Hardens public.protect_profile_role() to permit verified vendor/partner transitions
--    while strictly preserving existing role protections and error behaviors.
-- 4. Scopes trg_protect_profile_role trigger check explicitly to public.profiles.
-- 5. Ensures public.is_master_admin() validates both Auth UUID and admin email with safe search_path.
-- 6. Defines public.ensure_profile_initialized() RPC for authenticated self-healing:
--    - Preserves existing profile identity fields without unnecessary updates.
--    - Only promotes customer role when authoritative verification conditions
--      (vendors.onboarding_status IN ('approved', 'live') or partners.kyc_status ILIKE 'verified') are satisfied.
--    - Fetches and returns the actual saved profile record from the database.
-- 7. Performs targeted backfill exclusively for genuinely eligible missing vendor accounts
--    (with role 'vendor' for approved merchants, and 'customer' for onboarding applicants like NILADRI BAKERY)
--    with ON CONFLICT (id) DO NOTHING to never modify existing profiles.
-- ==============================================================================

-- 1. Hardened Trigger Function for auth.users
-- Assigned to all new signups across RoadRider (Customer, Vendor, Rider, Partner, Admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role text;
  v_name text;
  v_err_constraint text;
BEGIN
  -- Strict server-verified role determination:
  -- 1. Master Admin is assigned solely to the pre-designated immutable admin account:
  --    verified Auth UUID 'a526a5c8-80d6-491b-b188-3f450878ad90' AND email 'techroadrider@gmail.com'
  IF NEW.id = 'a526a5c8-80d6-491b-b188-3f450878ad90'::uuid AND NEW.email = 'techroadrider@gmail.com' THEN
    v_role := 'admin';
    v_name := pg_catalog.coalesce(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      'Rahul Sharma'
    );
  ELSE
    -- Block client-side role escalation attempts in metadata
    IF NEW.raw_user_meta_data->>'role' = 'admin' THEN
      RAISE EXCEPTION 'Unauthorized: Role escalation to admin is prohibited.';
    END IF;

    -- 2. General public signups default strictly to least-privilege 'customer'.
    --    Client-supplied raw_user_meta_data.role is NEVER trusted for vendor, rider, partner, or admin roles.
    --    Only pre-existing authoritative verified relationships assign business roles.
    IF EXISTS (
      SELECT 1 FROM public.vendors 
      WHERE user_id = NEW.id AND onboarding_status IN ('approved', 'live')
    ) THEN
      v_role := 'vendor';
    ELSIF EXISTS (
      SELECT 1 FROM public.partners 
      WHERE user_id = NEW.id AND kyc_status ILIKE 'verified'
    ) THEN
      v_role := 'partner';
    ELSE
      v_role := 'customer';
    END IF;

    v_name := pg_catalog.coalesce(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      'User'
    );
  END IF;

  -- Safe, idempotent profile insertion preserving existing profile roles and identity fields:
  -- ON CONFLICT (id) DO NOTHING ensures no existing profile is ever overwritten or updated.
  BEGIN
    INSERT INTO public.profiles (id, full_name, phone, email, role)
    VALUES (
      NEW.id,
      v_name,
      NEW.phone,
      NEW.email,
      v_role
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION
    WHEN unique_violation THEN
      -- Inspect constraint name to specifically catch phone uniqueness collisions
      -- without swallowing unrelated constraint failures
      GET STACKED DIAGNOSTICS v_err_constraint = CONSTRAINT_NAME;
      IF v_err_constraint = 'profiles_phone_key' OR v_err_constraint LIKE '%phone%' THEN
        INSERT INTO public.profiles (id, full_name, phone, email, role)
        VALUES (
          NEW.id,
          v_name,
          NULL,
          NEW.email,
          v_role
        )
        ON CONFLICT (id) DO NOTHING;
      ELSE
        RAISE;
      END IF;
  END;

  RETURN NEW;
END;
$$;

-- 2. Scoped Trigger Check: attach to auth.users only if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_catalog.pg_trigger t
    JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'auth'
      AND c.relname = 'users'
      AND t.tgname = 'on_auth_user_created'
      AND NOT t.tgisinternal
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END;
$$;

-- 3. Hardened Role Protection Trigger Function
-- Blocks all client-side role manipulation while allowing verified vendor and partner transitions
-- Preserves original security boundaries and error behaviors
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Allow service_role (backend migrations, edge functions)
    IF auth.role() = 'service_role' THEN
      RETURN NEW;
    END IF;

    -- Allow authenticated Master Admin (verified by Auth UUID and profile role)
    IF auth.uid() = 'a526a5c8-80d6-491b-b188-3f450878ad90'::uuid AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = 'a526a5c8-80d6-491b-b188-3f450878ad90'::uuid 
        AND role = 'admin' 
        AND email = 'techroadrider@gmail.com'
    ) THEN
      RETURN NEW;
    END IF;

    -- Allow verified vendor onboarding transition:
    -- A user transitioning from 'customer' to 'vendor' ONLY IF an authoritative verified vendor record exists
    IF OLD.role = 'customer' AND NEW.role = 'vendor' AND EXISTS (
      SELECT 1 FROM public.vendors WHERE user_id = NEW.id AND onboarding_status IN ('approved', 'live')
    ) THEN
      RETURN NEW;
    END IF;

    -- Allow verified partner onboarding transition:
    -- A user transitioning from 'customer' to 'partner' or 'rider' ONLY IF an authoritative verified partner record exists
    IF OLD.role = 'customer' AND NEW.role IN ('partner', 'rider') AND EXISTS (
      SELECT 1 FROM public.partners 
      WHERE user_id = NEW.id AND kyc_status ILIKE 'verified'
    ) THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Unauthorized: Users cannot change their own account role.';
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Scoped Trigger Check: ensure trg_protect_profile_role is attached to public.profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_catalog.pg_trigger t
    JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'profiles'
      AND t.tgname = 'trg_protect_profile_role'
      AND NOT t.tgisinternal
  ) THEN
    CREATE TRIGGER trg_protect_profile_role
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();
  END IF;
END;
$$;

-- 5. Hardened Master Admin Helper Function
-- Validates caller against verified Master Admin Auth UUID and email with safe search_path
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (auth.role() = 'service_role')
     OR (
       auth.uid() = 'a526a5c8-80d6-491b-b188-3f450878ad90'::uuid
       AND EXISTS (
         SELECT 1 FROM public.profiles
         WHERE id = 'a526a5c8-80d6-491b-b188-3f450878ad90'::uuid 
           AND role = 'admin' 
           AND email = 'techroadrider@gmail.com'
       )
     );
$$;

REVOKE ALL ON FUNCTION public.is_master_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_master_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_master_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_master_admin() TO service_role;

-- 6. Trusted Idempotent Self-Healing RPC Function
-- Restricts profile initialization to legitimate business relationships
-- Preserves existing profile roles and identity fields without unnecessary updates
CREATE OR REPLACE FUNCTION public.ensure_profile_initialized()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_user record;
  v_profile record;
  v_vendor record;
  v_partner record;
  v_role text;
  v_full_name text;
  v_phone text;
  v_email text;
  v_err_constraint text;
BEGIN
  -- 1. Identify authenticated caller
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User is not authenticated.';
  END IF;

  -- 2. Preserve existing profile: if profile exists, do not overwrite identity fields
  -- and do not promote customer roles unless authoritative approval is verified.
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
  IF FOUND THEN
    -- Authoritative promotion rule: only promote an existing customer if an authoritative
    -- approved vendor status or verified partner KYC status is established in the database.
    IF v_profile.role = 'customer' THEN
      IF EXISTS (
        SELECT 1 FROM public.vendors 
        WHERE user_id = v_user_id AND onboarding_status IN ('approved', 'live')
      ) THEN
        UPDATE public.profiles
        SET role = 'vendor', updated_at = pg_catalog.now()
        WHERE id = v_user_id;
        v_profile.role := 'vendor';
      ELSIF EXISTS (
        SELECT 1 FROM public.partners 
        WHERE user_id = v_user_id AND kyc_status ILIKE 'verified'
      ) THEN
        UPDATE public.profiles
        SET role = 'partner', updated_at = pg_catalog.now()
        WHERE id = v_user_id;
        v_profile.role := 'partner';
      END IF;
    END IF;

    RETURN pg_catalog.jsonb_build_object(
      'status', 'exists',
      'profile_id', v_profile.id,
      'role', v_profile.role
    );
  END IF;

  -- 3. Retrieve user details securely from auth.users
  SELECT * INTO v_user FROM auth.users WHERE id = v_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auth user record not found for id %', v_user_id;
  END IF;

  -- Disallow client-side role escalation attempts in metadata
  IF (v_user.raw_user_meta_data->>'role' = 'admin') 
     AND (v_user.id <> 'a526a5c8-80d6-491b-b188-3f450878ad90'::uuid OR v_user.email IS DISTINCT FROM 'techroadrider@gmail.com') THEN
    RAISE EXCEPTION 'Unauthorized: Role escalation to admin is prohibited.';
  END IF;

  -- 4. Determine initial role based on authoritative verification or onboarding context
  SELECT * INTO v_vendor FROM public.vendors WHERE user_id = v_user_id;
  SELECT * INTO v_partner FROM public.partners WHERE user_id = v_user_id;

  IF v_user.id = 'a526a5c8-80d6-491b-b188-3f450878ad90'::uuid AND v_user.email = 'techroadrider@gmail.com' THEN
    -- Master Admin bound strictly to verified Auth UUID and email
    v_role := 'admin';
    v_full_name := pg_catalog.coalesce(v_user.raw_user_meta_data->>'full_name', 'Rahul Sharma');
    v_phone := v_user.phone;
    v_email := v_user.email;
  ELSIF v_vendor.id IS NOT NULL THEN
    -- Only authoritatively approved vendors receive 'vendor' role upon initialization
    -- Unapproved onboarding applicants initialize as least-privilege 'customer'
    IF v_vendor.onboarding_status IN ('approved', 'live') THEN
      v_role := 'vendor';
    ELSE
      v_role := 'customer';
    END IF;
    v_full_name := pg_catalog.coalesce(
      v_vendor.owner_name,
      v_user.raw_user_meta_data->>'full_name',
      'Merchant Partner'
    );
    v_phone := pg_catalog.coalesce(v_vendor.phone, v_user.phone);
    v_email := pg_catalog.coalesce(v_vendor.email, v_user.email);
  ELSIF v_partner.id IS NOT NULL THEN
    IF v_partner.kyc_status ILIKE 'verified' THEN
      v_role := 'partner';
    ELSE
      v_role := 'customer';
    END IF;
    v_full_name := pg_catalog.coalesce(
      v_partner.full_name,
      v_user.raw_user_meta_data->>'full_name',
      'Delivery Partner'
    );
    v_phone := pg_catalog.coalesce(v_partner.phone, v_user.phone);
    v_email := pg_catalog.coalesce(v_partner.email, v_user.email);
  ELSE
    -- Standard user initializing profile without pre-existing business records defaults to least-privilege 'customer'
    v_role := 'customer';
    v_full_name := pg_catalog.coalesce(
      v_user.raw_user_meta_data->>'full_name',
      'User'
    );
    v_phone := v_user.phone;
    v_email := v_user.email;
  END IF;

  -- 5. Safe idempotent insert with ON CONFLICT DO NOTHING to preserve any concurrent profile
  BEGIN
    INSERT INTO public.profiles (id, full_name, phone, email, role)
    VALUES (
      v_user_id,
      v_full_name,
      v_phone,
      v_email,
      v_role
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION
    WHEN unique_violation THEN
      GET STACKED DIAGNOSTICS v_err_constraint = CONSTRAINT_NAME;
      IF v_err_constraint = 'profiles_phone_key' OR v_err_constraint LIKE '%phone%' THEN
        INSERT INTO public.profiles (id, full_name, phone, email, role)
        VALUES (
          v_user_id,
          v_full_name,
          NULL,
          v_email,
          v_role
        )
        ON CONFLICT (id) DO NOTHING;
      ELSE
        RAISE;
      END IF;
  END;

  -- 6. Fetch the actual saved profile record from the database to guarantee authoritative truth
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;

  RETURN pg_catalog.jsonb_build_object(
    'status', 'initialized',
    'profile_id', v_profile.id,
    'role', v_profile.role
  );
END;
$$;

-- Authorize authenticated users to execute the recovery function
REVOKE ALL ON FUNCTION public.ensure_profile_initialized() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_profile_initialized() FROM anon;
GRANT EXECUTE ON FUNCTION public.ensure_profile_initialized() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_profile_initialized() TO service_role;

-- 7. Targeted Idempotent Backfill for Verified Vendor Accounts
-- Recovers profiles exclusively for authenticated users who have a verified vendor record in public.vendors
-- (e.g. NILADRI BAKERY) without giving unapproved drafts unauthorized 'vendor' privileges.
-- Never overwrites existing profile roles or identity fields (ON CONFLICT DO NOTHING)
INSERT INTO public.profiles (id, full_name, phone, email, role)
SELECT
  v.user_id,
  pg_catalog.coalesce(v.owner_name, u.raw_user_meta_data->>'full_name', 'Merchant Partner'),
  CASE 
    WHEN p_existing_phone.id IS NOT NULL THEN NULL
    ELSE v.phone 
  END,
  u.email,
  CASE 
    WHEN v.onboarding_status IN ('approved', 'live') THEN 'vendor'
    ELSE 'customer'
  END
FROM public.vendors v
JOIN auth.users u ON u.id = v.user_id
LEFT JOIN public.profiles p ON p.id = v.user_id
LEFT JOIN public.profiles p_existing_phone ON p_existing_phone.phone = v.phone AND p_existing_phone.id <> v.user_id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;




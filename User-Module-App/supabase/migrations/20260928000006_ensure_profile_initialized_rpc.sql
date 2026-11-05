-- ==============================================================================
-- ROADRIDER MIGRATION 20260928000006: ENSURE PROFILE INITIALIZED RPC
-- Linked Supabase Project: sjahblquggmzlihqgzyt
-- ==============================================================================
-- Provides a minimal, security-hardened self-healing profile recovery RPC.
-- 1. SECURITY DEFINER with fixed empty search_path = ''
-- 2. Fully schema-qualified references (auth.uid(), public.profiles, etc.)
-- 3. Strictly bound to caller identity (auth.uid())
-- 4. Preserves existing profiles and roles without unnecessary promotion
-- 5. Derives missing profile identity exclusively from auth.users and verified business records
-- 6. Tolerates unique phone constraint conflicts (profiles_phone_key) by falling back to NULL
-- 7. Revokes execution from PUBLIC and anon; grants to authenticated and service_role
-- ==============================================================================

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

  -- 2. Preserve existing profile: if profile exists, return existing role without modifying it
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
  IF FOUND THEN
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

  -- 4. Determine initial role based on authoritative database records
  SELECT * INTO v_vendor FROM public.vendors WHERE user_id = v_user_id;
  SELECT * INTO v_partner FROM public.partners WHERE user_id = v_user_id;

  IF v_user.id = 'a526a5c8-80d6-491b-b188-3f450878ad90'::uuid 
     AND v_user.email = 'techroadrider@gmail.com'
     AND EXISTS (
       SELECT 1 FROM public.admin_users a
       WHERE a.auth_user_id = v_user_id
         AND a.email = 'techroadrider@gmail.com'
         AND a.admin_role = 'Master Admin'
         AND a.status = 'Active'
     ) THEN
    -- Master Admin bound strictly to verified Auth UUID, email, and active admin_users record
    v_role := 'admin';
    v_full_name := COALESCE(v_user.raw_user_meta_data->>'full_name', 'Rahul Sharma');
    v_phone := NULLIF(TRIM(v_user.phone), '');
    v_email := v_user.email;
  ELSIF v_vendor.id IS NOT NULL THEN
    -- Only authoritatively approved/live vendors initialize with 'vendor' role
    -- Unapproved onboarding applicants initialize as least-privilege 'customer'
    IF v_vendor.onboarding_status IN ('approved', 'live') THEN
      v_role := 'vendor';
    ELSE
      v_role := 'customer';
    END IF;
    v_full_name := COALESCE(
      v_vendor.owner_name,
      v_user.raw_user_meta_data->>'full_name',
      'Merchant Partner'
    );
    v_phone := NULLIF(TRIM(COALESCE(v_vendor.phone, v_user.phone)), '');
    v_email := COALESCE(v_vendor.email, v_user.email);
  ELSIF v_partner.id IS NOT NULL THEN
    -- Only verified delivery partners initialize with 'partner' role
    -- Unapproved or pending applicants initialize as least-privilege 'customer'
    IF v_partner.kyc_status ILIKE 'verified' THEN
      v_role := 'partner';
    ELSE
      v_role := 'customer';
    END IF;
    v_full_name := COALESCE(
      v_partner.full_name,
      v_user.raw_user_meta_data->>'full_name',
      'Delivery Partner'
    );
    v_phone := NULLIF(TRIM(COALESCE(v_partner.phone, v_user.phone)), '');
    v_email := COALESCE(v_partner.email, v_user.email);
  ELSE
    -- Standard user initializing profile defaults to least-privilege 'customer'
    v_role := 'customer';
    v_full_name := COALESCE(
      v_user.raw_user_meta_data->>'full_name',
      'User'
    );
    v_phone := NULLIF(TRIM(v_user.phone), '');
    v_email := v_user.email;
  END IF;

  -- 5. Safe insert with phone constraint conflict handling
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
      IF v_err_constraint = 'profiles_phone_key' THEN
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
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to initialize profile for user id %', v_user_id;
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'status', 'initialized',
    'profile_id', v_profile.id,
    'role', v_profile.role
  );
END;
$$;

-- Security Grants: Revoke execution from PUBLIC and anon; grant to authenticated & service_role
REVOKE ALL ON FUNCTION public.ensure_profile_initialized() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_profile_initialized() FROM anon;
GRANT EXECUTE ON FUNCTION public.ensure_profile_initialized() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_profile_initialized() TO service_role;

-- Reload PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';

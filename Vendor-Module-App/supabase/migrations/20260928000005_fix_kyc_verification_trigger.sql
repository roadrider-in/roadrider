-- ==============================================================================
-- ROADRIDER MIGRATION 20260928000005: FIX KYC VERIFICATION TRIGGER
-- ==============================================================================
-- 1. Ensure public.is_master_admin() checks authoritative active Master Admin
--    identity in public.admin_users (and service_role).
-- 2. Separate vendor document submission/update from Master Admin verification:
--    - Authenticated vendors can INSERT draft documents (status = 'pending')
--      for their own vendor record only.
--    - Authenticated vendors can UPDATE permitted document metadata
--      (storage_path, file_name, file_size_bytes, mime_type, uploaded_at, updated_at, store_id)
--      on their own unverified/pending documents only.
--    - Non-Master Admin users CANNOT self-verify (status = 'verified', verified_at,
--      verified_by) or modify rejection_reason / status = 'rejected'.
--    - Modifying already verified or rejected documents is strictly prohibited.
--    - Altering document ownership (vendor_id) or modifying another vendor's documents is prohibited.
-- ==============================================================================

-- 1. Authoritative Admin Identity Helper Function
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT (COALESCE(auth.role(), '') = 'service_role')
     OR EXISTS (
       SELECT 1 FROM public.admin_users a
       WHERE a.auth_user_id = auth.uid()
         AND LOWER(a.email) = LOWER(auth.jwt() ->> 'email')
         AND LOWER(a.email) = 'techroadrider@gmail.com'
         AND a.admin_role = 'Master Admin'
         AND a.status = 'Active'
     )
     OR EXISTS (
       SELECT 1 FROM public.profiles p
       WHERE p.id = auth.uid()
         AND p.role = 'admin'
         AND LOWER(p.email) = 'techroadrider@gmail.com'
     );
$$;

-- 2. Corrected protect_kyc_verification() function
CREATE OR REPLACE FUNCTION public.protect_kyc_verification()
RETURNS TRIGGER AS $$
DECLARE
  is_admin boolean := false;
  v_current_vendor uuid;
BEGIN
  -- 1. Service role always bypasses checks
  IF COALESCE(auth.role(), '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- 2. Check if current caller is active Master Admin
  SELECT public.is_master_admin() INTO is_admin;

  -- 3. If Master Admin, permit all review/verification mutations
  IF is_admin THEN
    RETURN NEW;
  END IF;

  -- 4. Defense-in-depth: Enforce vendor ownership for authenticated non-admin users
  IF auth.uid() IS NOT NULL THEN
    v_current_vendor := public.get_current_vendor_id();
    IF v_current_vendor IS NOT NULL THEN
      IF TG_OP = 'INSERT' AND NEW.vendor_id <> v_current_vendor THEN
        RAISE EXCEPTION 'Unauthorized: Cannot create KYC documents for another vendor';
      END IF;
      IF TG_OP = 'UPDATE' AND (OLD.vendor_id <> v_current_vendor OR NEW.vendor_id <> v_current_vendor) THEN
        RAISE EXCEPTION 'Unauthorized: Cannot modify KYC documents belonging to another vendor';
      END IF;
    END IF;
  END IF;

  -- 5. For non-Master Admin (vendors, public, anon):
  -- On INSERT: Cannot insert as verified or rejected, or set verification/rejection attributes
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IN ('verified', 'rejected')
       OR NEW.status <> 'pending'
       OR NEW.verified_at IS NOT NULL
       OR NEW.verified_by IS NOT NULL
       OR NEW.rejection_reason IS NOT NULL
    THEN
      RAISE EXCEPTION 'Unauthorized: Active Master Admin required for KYC verification';
    END IF;
    RETURN NEW;
  END IF;

  -- On UPDATE: Strictly prevent vendor self-verification, altering another vendor's doc, or tampering with verified/rejected documents
  IF TG_OP = 'UPDATE' THEN
    -- Non-admin cannot reassign document ownership to another vendor
    IF NEW.vendor_id IS DISTINCT FROM OLD.vendor_id THEN
      RAISE EXCEPTION 'Unauthorized: Cannot alter KYC document ownership';
    END IF;

    -- Non-admin cannot alter an already-verified or rejected document
    IF OLD.status IN ('verified', 'rejected') THEN
      RAISE EXCEPTION 'Unauthorized: Active Master Admin required for KYC verification';
    END IF;

    -- Non-admin cannot change status to verified or rejected, or touch verification metadata
    IF (NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('verified', 'rejected'))
       OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
       OR NEW.verified_by IS DISTINCT FROM OLD.verified_by
       OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
    THEN
      RAISE EXCEPTION 'Unauthorized: Active Master Admin required for KYC verification';
    END IF;

    -- Non-admin can only have status 'pending'
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'pending' THEN
      RAISE EXCEPTION 'Unauthorized: Active Master Admin required for KYC verification';
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure trigger is attached for both INSERT and UPDATE
DROP TRIGGER IF EXISTS trg_protect_kyc_verification ON public.kyc_documents;
CREATE TRIGGER trg_protect_kyc_verification
  BEFORE INSERT OR UPDATE ON public.kyc_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_kyc_verification();

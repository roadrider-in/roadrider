-- ==============================================================================
-- ROADRIDER MIGRATION 20260928000003: MASTER ADMIN APPROVAL & RLS POLICIES
-- ==============================================================================
-- 1. Ensure public.vendors has rejection_reason column for audit transparency.
-- 2. Define public.is_master_admin() helper to authorize platform administrators.
-- 3. Enforce database triggers to prevent vendors from approving themselves or
--    activating stores online prior to real Master Admin approval.
-- 4. Enable Master Admin Panel RLS policies to inspect all onboarding submissions.
-- ==============================================================================

-- 1. Ensure public.vendors has rejection_reason column
ALTER TABLE public.vendors 
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 2. Authoritative Admin Identity Helper Function
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT (auth.role() = 'service_role')
     OR EXISTS (
       SELECT 1 FROM public.profiles
       WHERE id = auth.uid() AND role = 'admin'
     );
$$;

-- 3. Security Trigger: Prevent Unauthorized Self-Approval or Status Manipulation
CREATE OR REPLACE FUNCTION public.protect_vendor_approval_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Restrict transitions to 'approved', 'live', or 'rejected' strictly to Master Admin
  IF (NEW.onboarding_status IN ('approved', 'live', 'rejected'))
     AND (OLD.onboarding_status IS DISTINCT FROM NEW.onboarding_status) THEN
    IF NOT public.is_master_admin() THEN
      RAISE EXCEPTION 'Unauthorized: Only an authorized Master Admin can approve or reject vendor onboarding applications.';
    END IF;
  END IF;

  -- Restrict modification of rejection_reason strictly to Master Admin
  IF NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
    IF NOT public.is_master_admin() THEN
      RAISE EXCEPTION 'Unauthorized: Only an authorized Master Admin can record or update application rejection reasons.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_vendor_approval_status ON public.vendors;
CREATE TRIGGER trg_protect_vendor_approval_status
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_vendor_approval_status();

-- 4. Security Trigger: Prevent Bringing Store Online Before Vendor Approval
CREATE OR REPLACE FUNCTION public.protect_store_online_activation()
RETURNS TRIGGER AS $$
DECLARE
  v_vendor_status text;
BEGIN
  IF NEW.status = 'ONLINE' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT onboarding_status INTO v_vendor_status
    FROM public.vendors
    WHERE id = NEW.vendor_id;

    IF v_vendor_status IS NULL OR v_vendor_status NOT IN ('approved', 'live') THEN
      RAISE EXCEPTION 'Unauthorized: Stores cannot be activated online before vendor verification and Master Admin approval.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_store_online_activation ON public.stores;
CREATE TRIGGER trg_protect_store_online_activation
  BEFORE UPDATE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_store_online_activation();

-- 5. Upgrade KYC & Bank Protection to Allow Master Admin Actions
CREATE OR REPLACE FUNCTION public.protect_kyc_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.is_master_admin() THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
       OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
    THEN
      RAISE EXCEPTION 'Unauthorized: Document approval and rejection status can only be updated by Master Admin.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.protect_bank_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.is_master_admin() THEN
    IF NEW.is_verified IS DISTINCT FROM OLD.is_verified
       OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
    THEN
      RAISE EXCEPTION 'Unauthorized: Bank account verification status can only be updated by Master Admin.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.protect_tax_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.is_master_admin() THEN
    IF NEW.pan_verified IS DISTINCT FROM OLD.pan_verified
       OR NEW.gstin_verified IS DISTINCT FROM OLD.gstin_verified
    THEN
      RAISE EXCEPTION 'Unauthorized: Tax verification status can only be updated by Master Admin.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Row Level Security Policies for Master Admin Panel
-- VENDORS: Master Admin can view all vendor applications and update review status
DROP POLICY IF EXISTS "Master admin can view all vendors" ON public.vendors;
CREATE POLICY "Master admin can view all vendors" ON public.vendors
  FOR SELECT TO authenticated
  USING (public.is_master_admin());

DROP POLICY IF EXISTS "Master admin can update all vendors" ON public.vendors;
CREATE POLICY "Master admin can update all vendors" ON public.vendors
  FOR UPDATE TO authenticated
  USING (public.is_master_admin())
  WITH CHECK (public.is_master_admin());

-- STORES: Master Admin can view all stores
DROP POLICY IF EXISTS "Master admin can view all stores" ON public.stores;
CREATE POLICY "Master admin can view all stores" ON public.stores
  FOR SELECT TO authenticated
  USING (public.is_master_admin());

DROP POLICY IF EXISTS "Master admin can update all stores" ON public.stores;
CREATE POLICY "Master admin can update all stores" ON public.stores
  FOR UPDATE TO authenticated
  USING (public.is_master_admin())
  WITH CHECK (public.is_master_admin());

-- STORE ADDRESSES: Master Admin can view all store addresses
DROP POLICY IF EXISTS "Master admin can view all store addresses" ON public.store_addresses;
CREATE POLICY "Master admin can view all store addresses" ON public.store_addresses
  FOR SELECT TO authenticated
  USING (public.is_master_admin());

-- STORE OPERATING HOURS: Master Admin can view all operating hours
DROP POLICY IF EXISTS "Master admin can view all store operating hours" ON public.store_operating_hours;
CREATE POLICY "Master admin can view all store operating hours" ON public.store_operating_hours
  FOR SELECT TO authenticated
  USING (public.is_master_admin());

-- DELIVERY SETTINGS: Master Admin can view all delivery settings
DROP POLICY IF EXISTS "Master admin can view all delivery settings" ON public.delivery_settings;
CREATE POLICY "Master admin can view all delivery settings" ON public.delivery_settings
  FOR SELECT TO authenticated
  USING (public.is_master_admin());

-- TAX INFORMATION: Master Admin can view and verify tax records
DROP POLICY IF EXISTS "Master admin can view all tax info" ON public.tax_information;
CREATE POLICY "Master admin can view all tax info" ON public.tax_information
  FOR SELECT TO authenticated
  USING (public.is_master_admin());

DROP POLICY IF EXISTS "Master admin can update tax info" ON public.tax_information;
CREATE POLICY "Master admin can update tax info" ON public.tax_information
  FOR UPDATE TO authenticated
  USING (public.is_master_admin())
  WITH CHECK (public.is_master_admin());

-- BANK ACCOUNTS: Master Admin can view and verify bank records
DROP POLICY IF EXISTS "Master admin can view all bank accounts" ON public.bank_accounts;
CREATE POLICY "Master admin can view all bank accounts" ON public.bank_accounts
  FOR SELECT TO authenticated
  USING (public.is_master_admin());

DROP POLICY IF EXISTS "Master admin can update bank accounts" ON public.bank_accounts;
CREATE POLICY "Master admin can update bank accounts" ON public.bank_accounts
  FOR UPDATE TO authenticated
  USING (public.is_master_admin())
  WITH CHECK (public.is_master_admin());

-- KYC DOCUMENTS: Master Admin can view and verify KYC documents
DROP POLICY IF EXISTS "Master admin can view all KYC documents" ON public.kyc_documents;
CREATE POLICY "Master admin can view all KYC documents" ON public.kyc_documents
  FOR SELECT TO authenticated
  USING (public.is_master_admin());

DROP POLICY IF EXISTS "Master admin can update KYC documents" ON public.kyc_documents;
CREATE POLICY "Master admin can update KYC documents" ON public.kyc_documents
  FOR UPDATE TO authenticated
  USING (public.is_master_admin())
  WITH CHECK (public.is_master_admin());

-- STORE PHOTOS: Master Admin can view all store photos
DROP POLICY IF EXISTS "Master admin can view all store photos" ON public.store_photos;
CREATE POLICY "Master admin can view all store photos" ON public.store_photos
  FOR SELECT TO authenticated
  USING (public.is_master_admin());

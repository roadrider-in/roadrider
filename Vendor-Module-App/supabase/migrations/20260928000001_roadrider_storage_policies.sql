-- ==============================================================================
-- RoadRider Vendor Portal - Supabase Storage Configuration & RLS Policies
-- Migration: 20260928000001_roadrider_storage_policies.sql
-- Security Hardened: Private KYC, Scoped Store Photos & Product Images
-- ==============================================================================

-- 1. ENSURE STORAGE EXTENSION & SCHEMA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CREATE / CONFIGURE STORAGE BUCKETS
-- Bucket 1: kyc-documents (PRIVATE: Aadhaar, PAN, FSSAI, Bank Cheques)
-- Bucket 2: store-photos (PUBLIC: Storefronts, interiors, banners)
-- Bucket 3: product-images (PUBLIC: Menu & catalog item pictures)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'kyc-documents',
    'kyc-documents',
    false, -- STRICTLY PRIVATE: No public URL access allowed
    10485760, -- 10 MB maximum per document
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  ),
  (
    'store-photos',
    'store-photos',
    true, -- PUBLIC: Read access needed for customer ordering apps
    5242880, -- 5 MB maximum per photo
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'product-images',
    'product-images',
    true, -- PUBLIC: Read access needed for customer catalog browsing
    5242880, -- 5 MB maximum per image
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. STORAGE.OBJECTS POLICIES (RLS is enabled on storage.objects by default)
-- Note: Do NOT execute ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY because
-- storage.objects is owned by system role supabase_storage_admin in Supabase.


-- ==============================================================================
-- 4. KYC-DOCUMENTS POLICIES (STRICTLY PRIVATE & VENDOR-ISOLATED)
-- File path format: kyc-documents/{vendor_id}/{document_name}
--              or:  kyc-documents/{user_id}/{document_name}
-- ==============================================================================

-- SELECT: Only the owner vendor (or platform admin) can read/download KYC docs
DROP POLICY IF EXISTS "Vendors can view own KYC files" ON storage.objects;
CREATE POLICY "Vendors can view own KYC files" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (
      split_part(name, '/', 1) = public.get_current_vendor_id()::text
      OR split_part(name, '/', 1) = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- INSERT: Vendors can only upload KYC files to their own designated folder
DROP POLICY IF EXISTS "Vendors can upload own KYC files" ON storage.objects;
CREATE POLICY "Vendors can upload own KYC files" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND (
      split_part(name, '/', 1) = public.get_current_vendor_id()::text
      OR split_part(name, '/', 1) = auth.uid()::text
    )
  );

-- UPDATE: Vendors can only overwrite files in their own folder
DROP POLICY IF EXISTS "Vendors can update own KYC files" ON storage.objects;
CREATE POLICY "Vendors can update own KYC files" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (
      split_part(name, '/', 1) = public.get_current_vendor_id()::text
      OR split_part(name, '/', 1) = auth.uid()::text
    )
  )
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND (
      split_part(name, '/', 1) = public.get_current_vendor_id()::text
      OR split_part(name, '/', 1) = auth.uid()::text
    )
  );

-- DELETE: Vendors can only remove files in their own folder
DROP POLICY IF EXISTS "Vendors can delete own KYC files" ON storage.objects;
CREATE POLICY "Vendors can delete own KYC files" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (
      split_part(name, '/', 1) = public.get_current_vendor_id()::text
      OR split_part(name, '/', 1) = auth.uid()::text
    )
  );

-- ==============================================================================
-- 5. STORE-PHOTOS POLICIES
-- File path format: store-photos/{store_id}/{photo_name}
-- ==============================================================================

-- SELECT: Public can read store photos (renders storefronts in app & web)
DROP POLICY IF EXISTS "Public can view store photos" ON storage.objects;
CREATE POLICY "Public can view store photos" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'store-photos');

-- INSERT: Only the verified owner of the store can upload photos
DROP POLICY IF EXISTS "Vendors can upload store photos" ON storage.objects;
CREATE POLICY "Vendors can upload store photos" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'store-photos'
    AND EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id::text = split_part(name, '/', 1)
        AND s.vendor_id = public.get_current_vendor_id()
    )
  );

-- UPDATE: Only the store owner can replace existing store photos
DROP POLICY IF EXISTS "Vendors can update store photos" ON storage.objects;
CREATE POLICY "Vendors can update store photos" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'store-photos'
    AND EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id::text = split_part(name, '/', 1)
        AND s.vendor_id = public.get_current_vendor_id()
    )
  )
  WITH CHECK (
    bucket_id = 'store-photos'
    AND EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id::text = split_part(name, '/', 1)
        AND s.vendor_id = public.get_current_vendor_id()
    )
  );

-- DELETE: Only the store owner can delete store photos
DROP POLICY IF EXISTS "Vendors can delete store photos" ON storage.objects;
CREATE POLICY "Vendors can delete store photos" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'store-photos'
    AND EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id::text = split_part(name, '/', 1)
        AND s.vendor_id = public.get_current_vendor_id()
    )
  );

-- ==============================================================================
-- 6. PRODUCT-IMAGES POLICIES
-- File path format: product-images/{store_id}/{image_name}
-- ==============================================================================

-- SELECT: Public can view product images (food items, grocery products)
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
CREATE POLICY "Public can view product images" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

-- INSERT: Only the store owner can upload images for their catalog
DROP POLICY IF EXISTS "Vendors can upload product images" ON storage.objects;
CREATE POLICY "Vendors can upload product images" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id::text = split_part(name, '/', 1)
        AND s.vendor_id = public.get_current_vendor_id()
    )
  );

-- UPDATE: Only the store owner can replace product images
DROP POLICY IF EXISTS "Vendors can update product images" ON storage.objects;
CREATE POLICY "Vendors can update product images" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id::text = split_part(name, '/', 1)
        AND s.vendor_id = public.get_current_vendor_id()
    )
  )
  WITH CHECK (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id::text = split_part(name, '/', 1)
        AND s.vendor_id = public.get_current_vendor_id()
    )
  );

-- DELETE: Only the store owner can delete product images
DROP POLICY IF EXISTS "Vendors can delete product images" ON storage.objects;
CREATE POLICY "Vendors can delete product images" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id::text = split_part(name, '/', 1)
        AND s.vendor_id = public.get_current_vendor_id()
    )
  );

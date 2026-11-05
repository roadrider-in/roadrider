-- ==============================================================================
-- RoadRider Vendor Portal - Onboarding Concurrency & Uniqueness Constraints
-- Migration: 20260928000002_onboarding_concurrency_constraints.sql
-- Security Hardened: Concurrency Race-Condition Defense for KYC & Store Photos
-- ==============================================================================
-- NOTE: DO NOT APPLY AUTOMATICALLY TO PRODUCTION WITHOUT REVIEWING DUPLICATES.
-- This migration asserts pre-validation checks so that if any duplicate records
-- exist in public.kyc_documents or public.store_photos, the migration safely
-- aborts without deleting data or modifying verification histories.
-- ==============================================================================

-- 1. PRE-VALIDATION & UNIQUE CONSTRAINT: public.kyc_documents
-- Ensures each vendor has at most one active metadata record per document_type
-- ('aadhaar', 'pan', 'fssai', 'gst', 'cancelled_cheque').
DO $$
DECLARE
  kyc_dup_count integer;
BEGIN
  -- Check for existing duplicate (vendor_id, document_type) pairs
  SELECT COUNT(*) INTO kyc_dup_count
  FROM (
    SELECT vendor_id, document_type
    FROM public.kyc_documents
    GROUP BY vendor_id, document_type
    HAVING COUNT(*) > 1
  ) dups;

  IF kyc_dup_count > 0 THEN
    RAISE EXCEPTION 'MIGRATION ABORTED: Found % group(s) of duplicate (vendor_id, document_type) records in public.kyc_documents. Manual administrative inspection required; records and verification histories must NOT be deleted automatically.', kyc_dup_count;
  END IF;

  -- Add unique constraint if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_kyc_documents_vendor_doctype'
  ) THEN
    ALTER TABLE public.kyc_documents
      ADD CONSTRAINT uq_kyc_documents_vendor_doctype UNIQUE (vendor_id, document_type);
  END IF;
END $$;

-- 2. PRE-VALIDATION & UNIQUE CONSTRAINT: public.store_photos
-- Note: A store may support multiple photos within a category (e.g. kitchen interior shots).
-- The deterministic uniqueness key is (store_id, photo_type, display_order).
DO $$
DECLARE
  photo_dup_count integer;
BEGIN
  -- Check for existing duplicate (store_id, photo_type, display_order) tuples
  SELECT COUNT(*) INTO photo_dup_count
  FROM (
    SELECT store_id, photo_type, display_order
    FROM public.store_photos
    GROUP BY store_id, photo_type, display_order
    HAVING COUNT(*) > 1
  ) dups;

  IF photo_dup_count > 0 THEN
    RAISE EXCEPTION 'MIGRATION ABORTED: Found % group(s) of duplicate (store_id, photo_type, display_order) records in public.store_photos. Manual administrative inspection required; photo records must NOT be deleted automatically.', photo_dup_count;
  END IF;

  -- Add unique constraint if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_store_photos_store_type_order'
  ) THEN
    ALTER TABLE public.store_photos
      ADD CONSTRAINT uq_store_photos_store_type_order UNIQUE (store_id, photo_type, display_order);
  END IF;
END $$;

-- ==============================================================================
-- DIAGNOSTIC QUERIES FOR DATABASE ADMINISTRATORS
-- ==============================================================================
-- Use these read-only queries to inspect existing duplicate records before running:
--
-- 1. Inspect duplicate KYC documents:
-- SELECT
--   vendor_id,
--   document_type,
--   COUNT(*) AS row_count,
--   array_agg(id) AS document_ids,
--   array_agg(status) AS verification_statuses,
--   array_agg(storage_path) AS storage_paths
-- FROM public.kyc_documents
-- GROUP BY vendor_id, document_type
-- HAVING COUNT(*) > 1;
--
-- 2. Inspect duplicate store photos:
-- SELECT
--   store_id,
--   photo_type,
--   display_order,
--   COUNT(*) AS row_count,
--   array_agg(id) AS photo_ids,
--   array_agg(is_verified) AS verification_statuses,
--   array_agg(storage_path) AS storage_paths
-- FROM public.store_photos
-- GROUP BY store_id, photo_type, display_order
-- HAVING COUNT(*) > 1;
-- ==============================================================================

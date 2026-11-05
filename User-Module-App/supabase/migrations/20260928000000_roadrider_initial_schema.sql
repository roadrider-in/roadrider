-- ==============================================================================
-- RoadRider Vendor Portal - Hardened Production Schema Migration
-- Migration: 20260928000000_roadrider_initial_schema.sql
-- Security Hardened: Production-Ready with RLS, Field-Level Triggers & RPCs
-- Dependency-Ordered: All Core Tables Created BEFORE Functions, Triggers & Policies
-- ==============================================================================

-- ==============================================================================
-- 1. EXTENSIONS
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. CORE TABLES (Dependency-Safe Order: Base Tables -> Foreign Dependencies)
-- ==============================================================================

-- PROFILES (Maps 1-to-1 with Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text UNIQUE,
  email text,
  role text NOT NULL DEFAULT 'vendor' CHECK (role IN ('vendor', 'admin', 'rider', 'customer')),
  avatar_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- VENDORS
CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  owner_name text NOT NULL,
  business_name text NOT NULL,
  email text,
  phone text NOT NULL,
  vendor_type text NOT NULL DEFAULT 'restaurant' CHECK (vendor_type IN ('restaurant', 'grocery', 'both')),
  onboarding_status text NOT NULL DEFAULT 'draft' CHECK (onboarding_status IN ('draft', 'in_progress', 'submitted', 'under_review', 'approved', 'rejected', 'live')),
  onboarding_step integer NOT NULL DEFAULT 1 CHECK (onboarding_step BETWEEN 1 AND 11),
  terms_accepted boolean NOT NULL DEFAULT false,
  terms_accepted_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- STORES (A vendor can operate one or more stores / outlets)
CREATE TABLE IF NOT EXISTS public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  business_type text NOT NULL CHECK (business_type IN ('restaurant', 'grocery')),
  store_name text NOT NULL,
  slug text,
  description text,
  phone text NOT NULL,
  email text,
  status text NOT NULL DEFAULT 'OFFLINE' CHECK (status IN ('ONLINE', 'OFFLINE', 'PAUSED')),
  rating numeric(3, 2) DEFAULT 5.00 CHECK (rating >= 0 AND rating <= 5),
  total_reviews integer DEFAULT 0 CHECK (total_reviews >= 0),
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- STORE ADDRESSES & LOCATION
CREATE TABLE IF NOT EXISTS public.store_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL UNIQUE,
  address_line1 text NOT NULL,
  address_line2 text,
  landmark text,
  locality text NOT NULL,
  city text NOT NULL DEFAULT 'Bengaluru',
  state text NOT NULL DEFAULT 'Karnataka',
  postal_code text NOT NULL,
  latitude double precision,
  longitude double precision,
  place_id text,
  service_radius_km integer DEFAULT 6 CHECK (service_radius_km BETWEEN 1 AND 50),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- STORE OPERATING HOURS
CREATE TABLE IF NOT EXISTS public.store_operating_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  day_of_week text NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  is_open boolean NOT NULL DEFAULT true,
  opening_time time NOT NULL DEFAULT '10:00:00',
  closing_time time NOT NULL DEFAULT '22:00:00',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (store_id, day_of_week)
);

-- DELIVERY SETTINGS
CREATE TABLE IF NOT EXISTS public.delivery_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL UNIQUE,
  service_radius_km integer DEFAULT 6 NOT NULL CHECK (service_radius_km BETWEEN 1 AND 50),
  base_delivery_fee numeric(10, 2) DEFAULT 30.00 NOT NULL CHECK (base_delivery_fee >= 0),
  packaging_fee numeric(10, 2) DEFAULT 25.00 NOT NULL CHECK (packaging_fee >= 0),
  min_order_amount numeric(10, 2) DEFAULT 100.00 NOT NULL CHECK (min_order_amount >= 0),
  avg_prep_time_minutes integer DEFAULT 20 NOT NULL CHECK (avg_prep_time_minutes BETWEEN 5 AND 120),
  self_delivery boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- TAX INFORMATION (With generated masked columns for safe client-side display)
CREATE TABLE IF NOT EXISTS public.tax_information (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL UNIQUE,
  pan_number text NOT NULL CHECK (pan_number ~* '^[A-Z]{5}[0-9]{4}[A-Z]{1}$'),
  pan_masked text GENERATED ALWAYS AS (LEFT(pan_number, 2) || '•••••' || RIGHT(pan_number, 3)) STORED,
  gstin text CHECK (gstin IS NULL OR gstin ~* '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'),
  pan_verified boolean DEFAULT false NOT NULL,
  gstin_verified boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- BANK ACCOUNTS (With generated masked columns for safe client-side display)
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL UNIQUE,
  account_holder_name text NOT NULL,
  bank_name text NOT NULL,
  branch_name text,
  account_number text NOT NULL,
  account_number_last4 text GENERATED ALWAYS AS (RIGHT(account_number, 4)) STORED,
  masked_account_number text GENERATED ALWAYS AS (REPEAT('•', GREATEST(0, LENGTH(account_number) - 4)) || RIGHT(account_number, 4)) STORED,
  ifsc_code text NOT NULL CHECK (ifsc_code ~* '^[A-Z]{4}0[A-Z0-9]{6}$'),
  account_type text NOT NULL DEFAULT 'current' CHECK (account_type IN ('current', 'savings')),
  is_verified boolean DEFAULT false NOT NULL,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- KYC DOCUMENTS (Metadata only; files stored in Supabase Storage private bucket)
CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  document_type text NOT NULL CHECK (document_type IN ('aadhaar', 'pan', 'fssai', 'gst', 'cancelled_cheque')),
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_size_bytes bigint,
  mime_type text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  rejection_reason text,
  uploaded_at timestamptz DEFAULT now() NOT NULL,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- STORE PHOTOS
CREATE TABLE IF NOT EXISTS public.store_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  photo_type text NOT NULL CHECK (photo_type IN ('storefront', 'kitchen', 'logo', 'menu_cover', 'interior')),
  storage_path text NOT NULL,
  file_name text NOT NULL,
  caption text,
  display_order integer DEFAULT 0 NOT NULL,
  is_verified boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- PRODUCT CATEGORIES
CREATE TABLE IF NOT EXISTS public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  display_order integer DEFAULT 0 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (store_id, name)
);

-- PRODUCTS & MENU ITEMS
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES public.product_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  sku text,
  brand text,
  unit text,
  mrp numeric(10, 2) CHECK (mrp >= 0),
  price numeric(10, 2) NOT NULL CHECK (price >= 0),
  is_veg boolean DEFAULT true NOT NULL,
  is_available boolean DEFAULT true NOT NULL,
  stock_count integer CHECK (stock_count IS NULL OR stock_count >= 0),
  image_url text,
  variants jsonb DEFAULT '[]'::jsonb NOT NULL,
  add_ons jsonb DEFAULT '[]'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- CUSTOMERS
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text,
  delivery_address text NOT NULL,
  delivery_latitude double precision,
  delivery_longitude double precision,
  order_status text NOT NULL DEFAULT 'new' CHECK (order_status IN ('new', 'preparing', 'ready', 'picked_up', 'completed', 'cancelled', 'rejected')),
  payment_status text NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_method text DEFAULT 'online' CHECK (payment_method IN ('online', 'cod', 'wallet')),
  total_items integer NOT NULL CHECK (total_items > 0),
  subtotal numeric(10, 2) NOT NULL CHECK (subtotal >= 0),
  packaging_fee numeric(10, 2) DEFAULT 0 CHECK (packaging_fee >= 0),
  delivery_fee numeric(10, 2) DEFAULT 0 CHECK (delivery_fee >= 0),
  discount_amount numeric(10, 2) DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount numeric(10, 2) NOT NULL CHECK (total_amount >= 0),
  commission_rate numeric(5, 2) DEFAULT 8.00 NOT NULL,
  commission_amount numeric(10, 2) NOT NULL,
  gst_on_commission numeric(10, 2) NOT NULL,
  net_vendor_payout numeric(10, 2) NOT NULL,
  prep_minutes integer DEFAULT 20,
  promised_by timestamptz,
  customer_note text,
  is_priority boolean DEFAULT false NOT NULL,
  placed_at timestamptz DEFAULT now() NOT NULL,
  accepted_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(10, 2) NOT NULL CHECK (unit_price >= 0),
  total_price numeric(10, 2) NOT NULL CHECK (total_price >= 0),
  is_veg boolean DEFAULT true NOT NULL,
  instructions text,
  selected_variants jsonb DEFAULT '[]'::jsonb NOT NULL,
  selected_add_ons jsonb DEFAULT '[]'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- REVIEWS
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  reply text,
  replied_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- OFFERS & COUPONS
CREATE TABLE IF NOT EXISTS public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  code text NOT NULL,
  description text NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
  discount_value numeric(10, 2) NOT NULL CHECK (discount_value > 0),
  min_order_amount numeric(10, 2) DEFAULT 0 CHECK (min_order_amount >= 0),
  max_discount_amount numeric(10, 2),
  is_active boolean DEFAULT true NOT NULL,
  valid_from timestamptz DEFAULT now() NOT NULL,
  valid_until timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (store_id, code)
);

-- PAYOUTS & SETTLEMENTS (Vendor readable only; creation and updates are server-side)
CREATE TABLE IF NOT EXISTS public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  payout_reference text UNIQUE NOT NULL,
  amount numeric(10, 2) NOT NULL CHECK (amount >= 0),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'completed', 'failed')),
  scheduled_date date NOT NULL,
  processed_at timestamptz,
  utr_number text,
  gross_sales numeric(10, 2) NOT NULL CHECK (gross_sales >= 0),
  platform_commission numeric(10, 2) NOT NULL CHECK (platform_commission >= 0),
  gst_deduction numeric(10, 2) NOT NULL CHECK (gst_deduction >= 0),
  net_payout numeric(10, 2) NOT NULL CHECK (net_payout >= 0),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  title text NOT NULL,
  subtitle text NOT NULL,
  type text NOT NULL CHECK (type IN ('order', 'payout', 'stock', 'review', 'system', 'kyc')),
  is_unread boolean DEFAULT true NOT NULL,
  data jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text UNIQUE NOT NULL,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('Order & Kitchen Issues', 'Payout & Settlement', 'Menu & Catalog Updates', 'Delivery Rider Delay', 'Account & KYC Compliance', 'App / Technical Support')),
  subject text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- AUDIT LOGS (Append-only by system)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb DEFAULT '{}'::jsonb NOT NULL,
  ip_address text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ==============================================================================
-- 3. HELPER FUNCTIONS & TRIGGER FUNCTIONS (All Tables Exist Now)
-- ==============================================================================

-- Automatic updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper function to retrieve the vendor_id of the currently authenticated user
CREATE OR REPLACE FUNCTION public.get_current_vendor_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.vendors WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Trigger function to prevent users from escalating their own role
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF auth.role() <> 'service_role' THEN
      RAISE EXCEPTION 'Unauthorized: Users cannot change their own account role.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-create profile upon auth.user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Merchant Partner'),
    NEW.phone,
    NEW.email,
    'vendor'
  )
  ON CONFLICT (id) DO UPDATE SET
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Prevent unauthorized modification of tax verification statuses
CREATE OR REPLACE FUNCTION public.protect_tax_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF NEW.pan_verified IS DISTINCT FROM OLD.pan_verified
       OR NEW.gstin_verified IS DISTINCT FROM OLD.gstin_verified
    THEN
      RAISE EXCEPTION 'Unauthorized: Tax verification status can only be updated by the system/admin.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Prevent unauthorized modification of bank verification statuses
CREATE OR REPLACE FUNCTION public.protect_bank_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF NEW.is_verified IS DISTINCT FROM OLD.is_verified
       OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
    THEN
      RAISE EXCEPTION 'Unauthorized: Bank account verification status can only be updated by the system/admin.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Prevent unauthorized modification of KYC verification statuses
CREATE OR REPLACE FUNCTION public.protect_kyc_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
       OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
    THEN
      RAISE EXCEPTION 'Unauthorized: Document approval and rejection status can only be updated by admin.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enforce Order Security: Vendors cannot tamper with financials, calculations, or invalid status jumps
CREATE OR REPLACE FUNCTION public.protect_order_financials()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    -- Block modifications to financial, identity, and system fields
    IF NEW.total_amount IS DISTINCT FROM OLD.total_amount
       OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
       OR NEW.packaging_fee IS DISTINCT FROM OLD.packaging_fee
       OR NEW.delivery_fee IS DISTINCT FROM OLD.delivery_fee
       OR NEW.discount_amount IS DISTINCT FROM OLD.discount_amount
       OR NEW.commission_rate IS DISTINCT FROM OLD.commission_rate
       OR NEW.commission_amount IS DISTINCT FROM OLD.commission_amount
       OR NEW.gst_on_commission IS DISTINCT FROM OLD.gst_on_commission
       OR NEW.net_vendor_payout IS DISTINCT FROM OLD.net_vendor_payout
       OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
       OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
       OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
       OR NEW.customer_name IS DISTINCT FROM OLD.customer_name
       OR NEW.store_id IS DISTINCT FROM OLD.store_id
       OR NEW.order_number IS DISTINCT FROM OLD.order_number
       OR NEW.placed_at IS DISTINCT FROM OLD.placed_at
    THEN
      RAISE EXCEPTION 'Unauthorized: Financial, calculation, identity, and payment fields cannot be modified by vendor.';
    END IF;

    -- Enforce legitimate vendor state transitions
    IF NEW.order_status IS DISTINCT FROM OLD.order_status THEN
      IF OLD.order_status = 'new' AND NEW.order_status NOT IN ('preparing', 'rejected', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition: New orders can only transition to preparing or rejected.';
      ELSIF OLD.order_status = 'preparing' AND NEW.order_status NOT IN ('ready', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition: Preparing orders can only transition to ready or cancelled.';
      ELSIF OLD.order_status = 'ready' AND NEW.order_status NOT IN ('picked_up', 'completed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition: Ready orders can only transition to picked_up or completed.';
      ELSIF OLD.order_status IN ('completed', 'cancelled', 'rejected') THEN
        RAISE EXCEPTION 'Invalid transition: Terminal order states cannot be altered.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enforce Review Security: Vendors can only update reply and replied_at
CREATE OR REPLACE FUNCTION public.protect_review_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF NEW.rating IS DISTINCT FROM OLD.rating
       OR NEW.customer_name IS DISTINCT FROM OLD.customer_name
       OR NEW.order_id IS DISTINCT FROM OLD.order_id
       OR NEW.store_id IS DISTINCT FROM OLD.store_id
       OR NEW.comment IS DISTINCT FROM OLD.comment
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'Unauthorized: Vendors can only update the reply and replied_at fields on reviews.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enforce immutability on audit logs: strictly append-only
CREATE OR REPLACE FUNCTION public.protect_audit_logs()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable: UPDATE and DELETE operations are forbidden.';
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 4. ATTACH TRIGGERS TO TABLES
-- ==============================================================================

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS trg_protect_tax_verification ON public.tax_information;
CREATE TRIGGER trg_protect_tax_verification
  BEFORE UPDATE ON public.tax_information
  FOR EACH ROW EXECUTE FUNCTION public.protect_tax_verification();

DROP TRIGGER IF EXISTS trg_protect_bank_verification ON public.bank_accounts;
CREATE TRIGGER trg_protect_bank_verification
  BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.protect_bank_verification();

DROP TRIGGER IF EXISTS trg_protect_kyc_verification ON public.kyc_documents;
CREATE TRIGGER trg_protect_kyc_verification
  BEFORE UPDATE ON public.kyc_documents
  FOR EACH ROW EXECUTE FUNCTION public.protect_kyc_verification();

DROP TRIGGER IF EXISTS trg_protect_order_financials ON public.orders;
CREATE TRIGGER trg_protect_order_financials
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.protect_order_financials();

DROP TRIGGER IF EXISTS trg_protect_review_fields ON public.reviews;
CREATE TRIGGER trg_protect_review_fields
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.protect_review_fields();

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.protect_audit_logs();

-- Apply updated_at triggers dynamically across all applicable tables
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
    'profiles', 'vendors', 'stores', 'store_addresses', 'store_operating_hours',
    'delivery_settings', 'tax_information', 'bank_accounts', 'kyc_documents',
    'store_photos', 'product_categories', 'products', 'customers', 'orders',
    'reviews', 'offers', 'payouts', 'support_tickets'
  )
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_at ON public.%I;', t);
    EXECUTE format('CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();', t);
  END LOOP;
END $$;

-- ==============================================================================
-- 5. INDEXES FOR PERFORMANCE & FAST LOOKUPS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON public.vendors(user_id);
CREATE INDEX IF NOT EXISTS idx_stores_vendor_id ON public.stores(vendor_id);
CREATE INDEX IF NOT EXISTS idx_stores_status ON public.stores(status);
CREATE INDEX IF NOT EXISTS idx_store_addresses_store_id ON public.store_addresses(store_id);
CREATE INDEX IF NOT EXISTS idx_store_operating_hours_store_id ON public.store_operating_hours(store_id);
CREATE INDEX IF NOT EXISTS idx_delivery_settings_store_id ON public.delivery_settings(store_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_vendor_id ON public.kyc_documents(vendor_id);
CREATE INDEX IF NOT EXISTS idx_store_photos_store_id ON public.store_photos(store_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_store_id ON public.product_categories(store_id);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_available ON public.products(is_available);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON public.orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_placed_at ON public.orders(placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_store_id ON public.reviews(store_id);
CREATE INDEX IF NOT EXISTS idx_offers_store_id ON public.offers(store_id);
CREATE INDEX IF NOT EXISTS idx_payouts_vendor_id ON public.payouts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_payouts_store_id ON public.payouts(store_id);
CREATE INDEX IF NOT EXISTS idx_notifications_vendor_id ON public.notifications(vendor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(vendor_id, is_unread);
CREATE INDEX IF NOT EXISTS idx_support_tickets_vendor_id ON public.support_tickets(vendor_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_vendor_id ON public.audit_logs(vendor_id);

-- ==============================================================================
-- 6. CONTROLLED SECURE DATABASE FUNCTIONS (RPC) FOR SENSITIVE ORDER TRANSITIONS
-- ==============================================================================

-- Vendor Accept Order Function
CREATE OR REPLACE FUNCTION public.vendor_accept_order(
  p_order_id uuid,
  p_prep_minutes integer DEFAULT 20
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor_id uuid;
  v_order public.orders;
BEGIN
  v_vendor_id := public.get_current_vendor_id();
  IF v_vendor_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Vendor identity not resolved.';
  END IF;

  -- Ensure order belongs to vendor's store and is currently 'new'
  SELECT o.* INTO v_order
  FROM public.orders o
  JOIN public.stores s ON s.id = o.store_id
  WHERE o.id = p_order_id AND s.vendor_id = v_vendor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or does not belong to vendor.';
  END IF;

  IF v_order.order_status <> 'new' THEN
    RAISE EXCEPTION 'Order cannot be accepted: current status is %', v_order.order_status;
  END IF;

  UPDATE public.orders
  SET
    order_status = 'preparing',
    prep_minutes = p_prep_minutes,
    accepted_at = now(),
    promised_by = now() + (p_prep_minutes || ' minutes')::interval
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  -- Audit log entry
  INSERT INTO public.audit_logs (vendor_id, user_id, action, entity_type, entity_id, details)
  VALUES (
    v_vendor_id,
    auth.uid(),
    'ORDER_ACCEPTED',
    'orders',
    p_order_id,
    jsonb_build_object('prep_minutes', p_prep_minutes, 'order_number', v_order.order_number)
  );

  RETURN v_order;
END;
$$;

-- Vendor Reject Order Function
CREATE OR REPLACE FUNCTION public.vendor_reject_order(
  p_order_id uuid,
  p_reason text DEFAULT 'Kitchen busy'
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor_id uuid;
  v_order public.orders;
BEGIN
  v_vendor_id := public.get_current_vendor_id();
  IF v_vendor_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Vendor identity not resolved.';
  END IF;

  SELECT o.* INTO v_order
  FROM public.orders o
  JOIN public.stores s ON s.id = o.store_id
  WHERE o.id = p_order_id AND s.vendor_id = v_vendor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or does not belong to vendor.';
  END IF;

  IF v_order.order_status <> 'new' THEN
    RAISE EXCEPTION 'Order cannot be rejected: current status is %', v_order.order_status;
  END IF;

  UPDATE public.orders
  SET
    order_status = 'rejected',
    cancelled_at = now(),
    cancellation_reason = p_reason
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  INSERT INTO public.audit_logs (vendor_id, user_id, action, entity_type, entity_id, details)
  VALUES (
    v_vendor_id,
    auth.uid(),
    'ORDER_REJECTED',
    'orders',
    p_order_id,
    jsonb_build_object('reason', p_reason, 'order_number', v_order.order_number)
  );

  RETURN v_order;
END;
$$;

-- Vendor Mark Order Ready Function
CREATE OR REPLACE FUNCTION public.vendor_mark_order_ready(
  p_order_id uuid
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor_id uuid;
  v_order public.orders;
BEGIN
  v_vendor_id := public.get_current_vendor_id();
  IF v_vendor_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Vendor identity not resolved.';
  END IF;

  SELECT o.* INTO v_order
  FROM public.orders o
  JOIN public.stores s ON s.id = o.store_id
  WHERE o.id = p_order_id AND s.vendor_id = v_vendor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or does not belong to vendor.';
  END IF;

  IF v_order.order_status <> 'preparing' THEN
    RAISE EXCEPTION 'Order cannot be marked ready: current status is %', v_order.order_status;
  END IF;

  UPDATE public.orders
  SET
    order_status = 'ready',
    ready_at = now()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  INSERT INTO public.audit_logs (vendor_id, user_id, action, entity_type, entity_id, details)
  VALUES (
    v_vendor_id,
    auth.uid(),
    'ORDER_READY',
    'orders',
    p_order_id,
    jsonb_build_object('order_number', v_order.order_number)
  );

  RETURN v_order;
END;
$$;

-- Vendor Complete Order (Rider Handover) Function
CREATE OR REPLACE FUNCTION public.vendor_complete_order(
  p_order_id uuid
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor_id uuid;
  v_order public.orders;
BEGIN
  v_vendor_id := public.get_current_vendor_id();
  IF v_vendor_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Vendor identity not resolved.';
  END IF;

  SELECT o.* INTO v_order
  FROM public.orders o
  JOIN public.stores s ON s.id = o.store_id
  WHERE o.id = p_order_id AND s.vendor_id = v_vendor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or does not belong to vendor.';
  END IF;

  IF v_order.order_status NOT IN ('ready', 'picked_up') THEN
    RAISE EXCEPTION 'Order cannot be completed: current status is %', v_order.order_status;
  END IF;

  UPDATE public.orders
  SET
    order_status = 'completed',
    completed_at = now()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  INSERT INTO public.audit_logs (vendor_id, user_id, action, entity_type, entity_id, details)
  VALUES (
    v_vendor_id,
    auth.uid(),
    'ORDER_COMPLETED',
    'orders',
    p_order_id,
    jsonb_build_object('order_number', v_order.order_number)
  );

  RETURN v_order;
END;
$$;

-- ==============================================================================
-- 7. HARDENED ROW LEVEL SECURITY (RLS) ENABLEMENT
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_operating_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_information ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- PROFILES Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- VENDORS Policies
DROP POLICY IF EXISTS "Vendors can view own record" ON public.vendors;
CREATE POLICY "Vendors can view own record" ON public.vendors
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Vendors can insert own record" ON public.vendors;
CREATE POLICY "Vendors can insert own record" ON public.vendors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Vendors can update own record" ON public.vendors;
CREATE POLICY "Vendors can update own record" ON public.vendors
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- STORES Policies
DROP POLICY IF EXISTS "Vendors can view own stores" ON public.stores;
CREATE POLICY "Vendors can view own stores" ON public.stores
  FOR SELECT USING (vendor_id = public.get_current_vendor_id());

DROP POLICY IF EXISTS "Vendors can insert own stores" ON public.stores;
CREATE POLICY "Vendors can insert own stores" ON public.stores
  FOR INSERT WITH CHECK (vendor_id = public.get_current_vendor_id());

DROP POLICY IF EXISTS "Vendors can update own stores" ON public.stores;
CREATE POLICY "Vendors can update own stores" ON public.stores
  FOR UPDATE
  USING (vendor_id = public.get_current_vendor_id())
  WITH CHECK (vendor_id = public.get_current_vendor_id());

-- STORE ADDRESSES Policies
DROP POLICY IF EXISTS "Vendors view own store addresses" ON public.store_addresses;
CREATE POLICY "Vendors view own store addresses" ON public.store_addresses
  FOR SELECT USING (
    store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id())
  );

DROP POLICY IF EXISTS "Vendors insert own store addresses" ON public.store_addresses;
CREATE POLICY "Vendors insert own store addresses" ON public.store_addresses
  FOR INSERT WITH CHECK (
    store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id())
  );

DROP POLICY IF EXISTS "Vendors update own store addresses" ON public.store_addresses;
CREATE POLICY "Vendors update own store addresses" ON public.store_addresses
  FOR UPDATE
  USING (store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id()))
  WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id()));

-- STORE OPERATING HOURS Policies
DROP POLICY IF EXISTS "Vendors view own operating hours" ON public.store_operating_hours;
CREATE POLICY "Vendors view own operating hours" ON public.store_operating_hours
  FOR SELECT USING (
    store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id())
  );

DROP POLICY IF EXISTS "Vendors insert own operating hours" ON public.store_operating_hours;
CREATE POLICY "Vendors insert own operating hours" ON public.store_operating_hours
  FOR INSERT WITH CHECK (
    store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id())
  );

DROP POLICY IF EXISTS "Vendors update own operating hours" ON public.store_operating_hours;
CREATE POLICY "Vendors update own operating hours" ON public.store_operating_hours
  FOR UPDATE
  USING (store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id()))
  WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id()));

-- DELIVERY SETTINGS Policies
DROP POLICY IF EXISTS "Vendors view own delivery settings" ON public.delivery_settings;
CREATE POLICY "Vendors view own delivery settings" ON public.delivery_settings
  FOR SELECT USING (
    store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id())
  );

DROP POLICY IF EXISTS "Vendors insert own delivery settings" ON public.delivery_settings;
CREATE POLICY "Vendors insert own delivery settings" ON public.delivery_settings
  FOR INSERT WITH CHECK (
    store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id())
  );

DROP POLICY IF EXISTS "Vendors update own delivery settings" ON public.delivery_settings;
CREATE POLICY "Vendors update own delivery settings" ON public.delivery_settings
  FOR UPDATE
  USING (store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id()))
  WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id()));

-- TAX INFORMATION Policies
DROP POLICY IF EXISTS "Vendors view own tax info" ON public.tax_information;
CREATE POLICY "Vendors view own tax info" ON public.tax_information
  FOR SELECT USING (vendor_id = public.get_current_vendor_id());

DROP POLICY IF EXISTS "Vendors insert own tax info" ON public.tax_information;
CREATE POLICY "Vendors insert own tax info" ON public.tax_information
  FOR INSERT WITH CHECK (vendor_id = public.get_current_vendor_id());

DROP POLICY IF EXISTS "Vendors update own tax info" ON public.tax_information;
CREATE POLICY "Vendors update own tax info" ON public.tax_information
  FOR UPDATE
  USING (vendor_id = public.get_current_vendor_id())
  WITH CHECK (vendor_id = public.get_current_vendor_id());

-- BANK ACCOUNTS Policies
DROP POLICY IF EXISTS "Vendors view own bank account" ON public.bank_accounts;
CREATE POLICY "Vendors view own bank account" ON public.bank_accounts
  FOR SELECT USING (vendor_id = public.get_current_vendor_id());

DROP POLICY IF EXISTS "Vendors insert own bank account" ON public.bank_accounts;
CREATE POLICY "Vendors insert own bank account" ON public.bank_accounts
  FOR INSERT WITH CHECK (vendor_id = public.get_current_vendor_id());

DROP POLICY IF EXISTS "Vendors update own bank account" ON public.bank_accounts;
CREATE POLICY "Vendors update own bank account" ON public.bank_accounts
  FOR UPDATE
  USING (vendor_id = public.get_current_vendor_id())
  WITH CHECK (vendor_id = public.get_current_vendor_id());

-- KYC DOCUMENTS Policies
DROP POLICY IF EXISTS "Vendors view own KYC documents" ON public.kyc_documents;
CREATE POLICY "Vendors view own KYC documents" ON public.kyc_documents
  FOR SELECT USING (vendor_id = public.get_current_vendor_id());

DROP POLICY IF EXISTS "Vendors insert own KYC documents" ON public.kyc_documents;
CREATE POLICY "Vendors insert own KYC documents" ON public.kyc_documents
  FOR INSERT WITH CHECK (vendor_id = public.get_current_vendor_id());

DROP POLICY IF EXISTS "Vendors update own KYC documents" ON public.kyc_documents;
CREATE POLICY "Vendors update own KYC documents" ON public.kyc_documents
  FOR UPDATE
  USING (vendor_id = public.get_current_vendor_id())
  WITH CHECK (vendor_id = public.get_current_vendor_id());

DROP POLICY IF EXISTS "Vendors delete own KYC documents" ON public.kyc_documents;
CREATE POLICY "Vendors delete own KYC documents" ON public.kyc_documents
  FOR DELETE USING (vendor_id = public.get_current_vendor_id());

-- STORE PHOTOS Policies
DROP POLICY IF EXISTS "Vendors view own store photos" ON public.store_photos;
CREATE POLICY "Vendors view own store photos" ON public.store_photos
  FOR SELECT USING (
    store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id())
  );

DROP POLICY IF EXISTS "Vendors insert own store photos" ON public.store_photos;
CREATE POLICY "Vendors insert own store photos" ON public.store_photos
  FOR INSERT WITH CHECK (
    store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id())
  );

DROP POLICY IF EXISTS "Vendors update own store photos" ON public.store_photos;
CREATE POLICY "Vendors update own store photos" ON public.store_photos
  FOR UPDATE
  USING (store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id()))
  WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id()));

DROP POLICY IF EXISTS "Vendors delete own store photos" ON public.store_photos;
CREATE POLICY "Vendors delete own store photos" ON public.store_photos
  FOR DELETE USING (
    store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id())
  );

-- PRODUCT CATEGORIES Policies
DROP POLICY IF EXISTS "Vendors view own categories" ON public.product_categories;
CREATE POLICY "Vendors view own categories" ON public.product_categories
  FOR SELECT USING (
    store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id())
  );

DROP POLICY IF EXISTS "Vendors insert own categories" ON public.product_categories;
CREATE POLICY "Vendors insert own categories" ON public.product_categories
  FOR INSERT WITH CHECK (
    store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id())
  );

DROP POLICY IF EXISTS "Vendors update own categories" ON public.product_categories;
CREATE POLICY "Vendors update own categories" ON public.product_categories
  FOR UPDATE
  USING (store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id()))
  WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id()));

DROP POLICY IF EXISTS "Vendors delete own categories" ON public.product_categories;
CREATE POLICY "Vendors delete own categories" ON public.product_categories
  FOR DELETE USING (
    store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id())
  );

-- PRODUCTS Policies
DROP POLICY IF EXISTS "Vendors view own products" ON public.products;
CREATE POLICY "Vendors view own products" ON public.products
  FOR SELECT USING (
    store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id())
  );

DROP POLICY IF EXISTS "Vendors insert own products" ON public.products;
CREATE POLICY "Vendors insert own products" ON public.products
  FOR INSERT WITH CHECK (
    store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id())
  );

DROP POLICY IF EXISTS "Vendors update own products" ON public.products;
CREATE POLICY "Vendors update own products" ON public.products
  FOR UPDATE
  USING (store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id()))
  WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id()));

DROP POLICY IF EXISTS "Vendors delete own products" ON public.products;
CREATE POLICY "Vendors delete own products" ON public.products
  FOR DELETE USING (
    store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id())
  );

-- CUSTOMERS Policies (Vendors can view customers who ordered from their store)
DROP POLICY IF EXISTS "Vendors can view own customers" ON public.customers;
CREATE POLICY "Vendors can view own customers" ON public.customers
  FOR SELECT USING (
    id IN (
      SELECT customer_id FROM public.orders
      WHERE store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id())
    )
  );

-- ORDERS Policies (Vendors can SELECT and UPDATE status; financial fields blocked by trigger)
DROP POLICY IF EXISTS "Vendors view own store orders" ON public.orders;
CREATE POLICY "Vendors view own store orders" ON public.orders
  FOR SELECT USING (
    store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id())
  );

DROP POLICY IF EXISTS "Vendors update own store orders" ON public.orders;
CREATE POLICY "Vendors update own store orders" ON public.orders
  FOR UPDATE
  USING (store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id()))
  WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id()));

-- ORDER ITEMS Policies
DROP POLICY IF EXISTS "Vendors view own order items" ON public.order_items;
CREATE POLICY "Vendors view own order items" ON public.order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM public.orders
      WHERE store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id())
    )
  );

-- REVIEWS Policies (Vendors can view and reply; customer fields blocked by trigger)
DROP POLICY IF EXISTS "Vendors view reviews of own stores" ON public.reviews;
CREATE POLICY "Vendors view reviews of own stores" ON public.reviews
  FOR SELECT USING (
    store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id())
  );

DROP POLICY IF EXISTS "Vendors reply to reviews of own stores" ON public.reviews;
CREATE POLICY "Vendors reply to reviews of own stores" ON public.reviews
  FOR UPDATE
  USING (store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id()))
  WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id()));

-- OFFERS Policies
DROP POLICY IF EXISTS "Vendors view own offers" ON public.offers;
CREATE POLICY "Vendors view own offers" ON public.offers
  FOR SELECT USING (
    store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id())
  );

DROP POLICY IF EXISTS "Vendors insert own offers" ON public.offers;
CREATE POLICY "Vendors insert own offers" ON public.offers
  FOR INSERT WITH CHECK (
    store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id())
  );

DROP POLICY IF EXISTS "Vendors update own offers" ON public.offers;
CREATE POLICY "Vendors update own offers" ON public.offers
  FOR UPDATE
  USING (store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id()))
  WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id()));

DROP POLICY IF EXISTS "Vendors delete own offers" ON public.offers;
CREATE POLICY "Vendors delete own offers" ON public.offers
  FOR DELETE USING (
    store_id IN (SELECT id FROM public.stores WHERE vendor_id = public.get_current_vendor_id())
  );

-- PAYOUTS Policies (Strictly read-only for vendors; system managed)
DROP POLICY IF EXISTS "Vendors view own payouts" ON public.payouts;
CREATE POLICY "Vendors view own payouts" ON public.payouts
  FOR SELECT USING (vendor_id = public.get_current_vendor_id());

-- NOTIFICATIONS Policies
DROP POLICY IF EXISTS "Vendors view own notifications" ON public.notifications;
CREATE POLICY "Vendors view own notifications" ON public.notifications
  FOR SELECT USING (vendor_id = public.get_current_vendor_id());

DROP POLICY IF EXISTS "Vendors update own notifications" ON public.notifications;
CREATE POLICY "Vendors update own notifications" ON public.notifications
  FOR UPDATE
  USING (vendor_id = public.get_current_vendor_id())
  WITH CHECK (vendor_id = public.get_current_vendor_id());

-- SUPPORT TICKETS Policies
DROP POLICY IF EXISTS "Vendors view own support tickets" ON public.support_tickets;
CREATE POLICY "Vendors view own support tickets" ON public.support_tickets
  FOR SELECT USING (vendor_id = public.get_current_vendor_id());

DROP POLICY IF EXISTS "Vendors create own support tickets" ON public.support_tickets;
CREATE POLICY "Vendors create own support tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (vendor_id = public.get_current_vendor_id());

DROP POLICY IF EXISTS "Vendors update own support tickets" ON public.support_tickets;
CREATE POLICY "Vendors update own support tickets" ON public.support_tickets
  FOR UPDATE
  USING (vendor_id = public.get_current_vendor_id())
  WITH CHECK (vendor_id = public.get_current_vendor_id());

-- AUDIT LOGS Policies (Strictly read-only for vendors)
DROP POLICY IF EXISTS "Vendors view own audit logs" ON public.audit_logs;
CREATE POLICY "Vendors view own audit logs" ON public.audit_logs
  FOR SELECT USING (vendor_id = public.get_current_vendor_id());

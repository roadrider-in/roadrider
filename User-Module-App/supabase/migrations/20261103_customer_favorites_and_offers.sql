-- ROADRIDER MIGRATION: Customer Favorites & Public Active Offers Access
-- Date: 2026-11-03

-- 1. Create customer_favorites table if not exists
CREATE TABLE IF NOT EXISTS public.customer_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  restaurant_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  dish_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (customer_id, restaurant_id)
);

-- Enable RLS
ALTER TABLE public.customer_favorites ENABLE ROW LEVEL SECURITY;

-- Customer favorites policies
DROP POLICY IF EXISTS "Customers can view own favorites" ON public.customer_favorites;
CREATE POLICY "Customers can view own favorites" ON public.customer_favorites
  FOR SELECT TO authenticated
  USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Customers can insert own favorites" ON public.customer_favorites;
CREATE POLICY "Customers can insert own favorites" ON public.customer_favorites
  FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "Customers can delete own favorites" ON public.customer_favorites;
CREATE POLICY "Customers can delete own favorites" ON public.customer_favorites
  FOR DELETE TO authenticated
  USING (customer_id = auth.uid());

-- 2. Allow public/customers to view active offers for approved stores
DROP POLICY IF EXISTS "Public can view active offers" ON public.offers;
CREATE POLICY "Public can view active offers" ON public.offers
  FOR SELECT
  USING (is_active = true);

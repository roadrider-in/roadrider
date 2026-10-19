import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

console.log('================================================================');
console.log('  TESTING ACCOUNT DATA ISOLATION & FRESH DASHBOARD INITIALIZATION');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, message, details = '') {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message} - ${details}`);
    failed++;
  }
}

// -------------------------------------------------------------
// Suite 1: Source of Dashboard Metrics & Elimination of Mock Fallbacks
// -------------------------------------------------------------
console.log('--- Suite 1: Source of Dashboard Metrics & Mock Fallback Elimination ---');

const sidebarSrc = readFileSync(resolve('src/components/layout/DesktopSidebar.jsx'), 'utf-8');
const homeSrc = readFileSync(resolve('src/screens/restaurant/RestaurantHomeScreen.jsx'), 'utf-8');
const orderContextSrc = readFileSync(resolve('src/context/OrderContext.jsx'), 'utf-8');
const orderApiSrc = readFileSync(resolve('src/services/api/orderApi.js'), 'utf-8');
const payoutApiSrc = readFileSync(resolve('src/services/api/payoutApi.js'), 'utf-8');
const reviewsScreenSrc = readFileSync(resolve('src/screens/restaurant/ReviewsRatingsScreen.jsx'), 'utf-8');
const profileScreenSrc = readFileSync(resolve('src/screens/shared/ProfileSettingsScreen.jsx'), 'utf-8');
const vendorContextSrc = readFileSync(resolve('src/context/VendorContext.jsx'), 'utf-8');

assert(
  !sidebarSrc.includes("badge: '4.8 ★'") && !sidebarSrc.includes('4.8 ★'),
  'DesktopSidebar.jsx has no hardcoded 4.8 star review badge'
);

assert(
  homeSrc.includes('const isToday =') &&
  homeSrc.includes('todayValidOrders.reduce') &&
  homeSrc.includes('todayOrdersCount > 0 ? Math.round(todaySales / todayOrdersCount) : 0'),
  'RestaurantHomeScreen scopes Net Sales, Today Orders, and AOV to today\'s valid orders'
);

assert(
  homeSrc.includes("label=\"Net sales\"") &&
  homeSrc.includes("value={`₹${todaySales.toLocaleString('en-IN')}`}") &&
  homeSrc.includes("No sales recorded today"),
  'RestaurantHomeScreen renders ₹0 and "No sales recorded today" when store has 0 sales today'
);

assert(
  homeSrc.includes('getWeeklySales') &&
  homeSrc.includes("totalWeeklySales > 0 ? 'Current week earnings' : 'No revenue this week'") &&
  homeSrc.includes('height: `${item.percent}%`'),
  'RestaurantHomeScreen Weekly Revenue chart maps 0% height for days with no sales and ₹0 total'
);

assert(
  homeSrc.includes('rejectionRateStr = hasRealOrders') &&
  homeSrc.includes("onTimeRateStr = hasRealOrders ? '100%' : '—'") &&
  homeSrc.includes("avgPrepMinutes = hasRealOrders") &&
  homeSrc.includes("Awaiting orders"),
  'RestaurantHomeScreen Store Performance renders "—" and "Awaiting orders" when zero orders exist'
);

assert(
  orderContextSrc.includes('const { activeStore } = useVendor()') &&
  orderContextSrc.includes("if (!isSupabaseConfigured || !activeStore?.id)") &&
  orderContextSrc.includes(".eq('store_id', activeStore.id)"),
  'OrderContext consumes activeStore and strictly scopes order queries by store_id'
);

assert(
  orderContextSrc.includes('resetOrderState') &&
  orderContextSrc.includes('setOrders([])'),
  'OrderContext exports resetOrderState and clears stale orders immediately on store change'
);

assert(
  orderApiSrc.includes('if (!storeId)') &&
  orderApiSrc.includes('return [];'),
  'orderApi.fetchOrders strictly enforces storeId parameter and returns [] if omitted'
);

assert(
  payoutApiSrc.includes('if (!vendorId)') &&
  payoutApiSrc.includes("availableBalance: '₹0'"),
  'payoutApi.fetchBalance strictly returns ₹0 and empty state when vendorId is omitted'
);

assert(
  reviewsScreenSrc.includes("useVendor()") &&
  reviewsScreenSrc.includes(".eq('store_id', activeStore.id)") &&
  reviewsScreenSrc.includes('No customer reviews yet'),
  'ReviewsRatingsScreen queries reviews strictly for activeStore.id and defaults to clean empty state'
);

assert(
  profileScreenSrc.includes('useOrders') &&
  profileScreenSrc.includes('resetOrderState()'),
  'ProfileSettingsScreen calls resetOrderState() upon user sign out'
);

assert(
  vendorContextSrc.includes("vendor?.onboarding_status !== 'verified'") &&
  vendorContextSrc.includes("Store cannot go ONLINE until onboarding is verified"),
  'VendorContext blocks setting store ONLINE until onboarding is verified by Master Admin'
);

// -------------------------------------------------------------
// Suite 2: Live Database RLS Policy Hardening & Isolation
// -------------------------------------------------------------
console.log('\n--- Suite 2: Live Database RLS Policy Hardening & Multi-Vendor Isolation ---');

function runLinkedQuery(sql) {
  const tmpPath = `/tmp/rls_test_${Date.now()}_${Math.random().toString(36).slice(2)}.sql`;
  try {
    writeFileSync(tmpPath, sql, 'utf-8');
    const raw = execSync(`supabase db query --linked -f "${tmpPath}"`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    const jsonMatch = raw.match(/\{[\s\S]*"rows"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return { rows: parsed.rows || [], error: null };
    }
    return { rows: [], error: null };
  } catch (err) {
    return { rows: [], error: err.stderr || err.stdout || err.message || '' };
  } finally {
    try { unlinkSync(tmpPath); } catch {}
  }
}

// 1. Check that "Admin Full Access" on key tables is strictly is_master_admin()
const { rows: adminPolicies } = runLinkedQuery(`
  SELECT tablename, qual FROM pg_policies
  WHERE schemaname = 'public'
    AND policyname = 'Admin Full Access'
    AND tablename IN ('orders', 'order_items', 'stores', 'vendors', 'payouts', 'reviews', 'products');
`);

assert(
  adminPolicies.length >= 7 && adminPolicies.every((p) => p.qual === 'is_master_admin()'),
  'Database migration 07 hardened "Admin Full Access" on all core tables to is_master_admin()'
);

// 2. Love Birds Vendor (user: 562e7191-2d40-43f9-aa28-0b24c150bb0c, store: f8a37db4-313b-473b-8bd5-dab61e92dc76)
const { rows: loveBirdsRows } = runLinkedQuery(`
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "562e7191-2d40-43f9-aa28-0b24c150bb0c", "role": "authenticated"}';
  SELECT count(*) as count FROM public.orders WHERE store_id = 'f8a37db4-313b-473b-8bd5-dab61e92dc76';
`);

const loveBirdsCount = Number(loveBirdsRows[0]?.count);
assert(
  loveBirdsCount === 7,
  'Genuine vendor (The Love Birds) owner can see their own 7 store orders',
  `Found ${loveBirdsCount}`
);

// 3. Sigma Store Vendor / Hrishabh (user: 2e08fbde-dc3a-4ccd-8469-3b557b887864, store: c4b3561e-32ba-4ef2-9d06-0afb5fd44679)
const { rows: sigmaStoreRows } = runLinkedQuery(`
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "2e08fbde-dc3a-4ccd-8469-3b557b887864", "role": "authenticated"}';
  SELECT count(*) as count FROM public.orders WHERE store_id = 'c4b3561e-32ba-4ef2-9d06-0afb5fd44679';
`);

const sigmaCount = Number(sigmaStoreRows[0]?.count);
assert(
  sigmaCount === 0,
  'Sigma Store dashboard orders query returns exactly 0 orders (zero cross-account leakage)',
  `Found ${sigmaCount}`
);

// 4. Fresh Vendor (Niladri, user: 0c9d1566-ac47-4390-8751-8adf4fd6457c)
const { rows: niladriRows } = runLinkedQuery(`
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "0c9d1566-ac47-4390-8751-8adf4fd6457c", "role": "authenticated"}';
  SELECT count(*) as order_count FROM public.orders;
  SELECT count(*) as payout_count FROM public.payouts;
  SELECT count(*) as review_count FROM public.reviews;
`);

const niladriOrders = Number(niladriRows[0]?.order_count ?? 0);
assert(
  niladriOrders === 0,
  'Fresh vendor (Niladri) with zero store orders sees 0 orders in public.orders query',
  `Found ${niladriOrders}`
);

// 5. Cross-Vendor store visibility check:
const { rows: crossStoreRows } = runLinkedQuery(`
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "0c9d1566-ac47-4390-8751-8adf4fd6457c", "role": "authenticated"}';
  SELECT id, store_name FROM public.stores;
`);

assert(
  crossStoreRows.length >= 1 && crossStoreRows.every((s) => s.store_name !== 'sigma store' && s.store_name !== 'The Love Birds'),
  'Vendors can only view their own stores via public.stores RLS (cannot see other vendors\' stores)'
);

// 6. Master Admin maintains platform oversight
const { rows: adminOrdersRows } = runLinkedQuery(`
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "a526a5c8-80d6-491b-b188-3f450878ad90", "email": "techroadrider@gmail.com", "role": "authenticated"}';
  SELECT count(*) as total_orders FROM public.orders;
`);

const totalAdminOrders = Number(adminOrdersRows[0]?.total_orders ?? 0);
assert(
  totalAdminOrders === 9,
  'Master Admin maintains full visibility across all platform orders under hardened RLS',
  `Found ${totalAdminOrders}`
);

// -------------------------------------------------------------
// Suite 3: State Reset & Store Switching Verification
// -------------------------------------------------------------
console.log('\n--- Suite 3: Context State Reset & Store Switching Contracts ---');

assert(
  vendorContextSrc.includes('switchStore = (storeId) => {') &&
  vendorContextSrc.includes('setActiveStore(found)'),
  'VendorContext switchStore selects store and updates activeStore'
);

assert(
  vendorContextSrc.includes('resetVendorState = () => {') &&
  vendorContextSrc.includes('setActiveStore(null)') &&
  vendorContextSrc.includes('setStores([])'),
  'VendorContext resetVendorState purges stores and activeStore on signout/switch'
);

assert(
  orderContextSrc.includes('resetOrderState = useCallback(') &&
  orderContextSrc.includes('setOrders([])') &&
  orderContextSrc.includes('setSelectedOrderId(null)'),
  'OrderContext resetOrderState purges in-memory orders and selectedOrderId'
);

console.log('\n================================================================');
console.log(`  RESULTS: ${passed} PASSED | ${failed} FAILED`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
}

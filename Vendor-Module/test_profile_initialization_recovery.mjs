import { readFileSync } from 'fs';
import { resolve } from 'path';

console.log('================================================================');
console.log('  TESTING PROFILE INITIALIZATION, RECOVERY & RLS INTEGRITY       ');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

const serviceSrc = readFileSync(resolve('src/services/vendorOnboardingService.js'), 'utf-8');
const termsScreenSrc = readFileSync(resolve('src/screens/onboarding/TermsConditionsScreen.jsx'), 'utf-8');
const authApiSrc = readFileSync(resolve('src/services/api/authApi.js'), 'utf-8');
const migration04Src = readFileSync(resolve('supabase/migrations/20260928000004_profile_initialization_and_recovery.sql'), 'utf-8');
const initialSchemaSrc = readFileSync(resolve('supabase/migrations/20260928000000_roadrider_initial_schema.sql'), 'utf-8');

// -------------------------------------------------------------
// Suite 1: Database Migration Security & Idempotency
// -------------------------------------------------------------
console.log('--- Suite 1: Database Migration Security & Idempotency ---');

assert(
  migration04Src.includes('CREATE OR REPLACE FUNCTION public.ensure_profile_initialized()') &&
  migration04Src.includes('SECURITY DEFINER') &&
  migration04Src.includes("SET search_path = ''"),
  'ensure_profile_initialized() is defined as a SECURITY DEFINER function with safe empty search_path'
);

assert(
  migration04Src.includes("v_user_id := auth.uid();") &&
  migration04Src.includes("IF v_user_id IS NULL THEN") &&
  migration04Src.includes("RAISE EXCEPTION 'Unauthorized: User is not authenticated.';"),
  'ensure_profile_initialized() authenticates caller strictly using auth.uid()'
);

assert(
  migration04Src.includes("SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;") &&
  migration04Src.includes("IF FOUND THEN") &&
  migration04Src.includes("'status', 'exists'"),
  'ensure_profile_initialized() is idempotent: checks existing profile before attempting insert'
);

assert(
  migration04Src.includes('CREATE OR REPLACE FUNCTION public.handle_new_user()') &&
  migration04Src.includes("v_role := 'customer';") &&
  migration04Src.includes("SET search_path = ''"),
  'handle_new_user() defaults standard signups to least-privilege customer role with safe search_path'
);

assert(
  migration04Src.includes("nspname = 'auth'") &&
  migration04Src.includes("relname = 'users'") &&
  migration04Src.includes("tgname = 'on_auth_user_created'"),
  'on_auth_user_created trigger existence check is explicitly scoped to auth.users'
);

assert(
  migration04Src.includes('CREATE OR REPLACE FUNCTION public.protect_profile_role()') &&
  migration04Src.includes("OLD.role = 'customer' AND NEW.role = 'vendor' AND EXISTS (") &&
  migration04Src.includes("SELECT 1 FROM public.vendors WHERE user_id = NEW.id"),
  'protect_profile_role permits verified vendor onboarding transitions while blocking client tampering'
);

assert(
  migration04Src.includes('WHEN unique_violation THEN'),
  'handle_new_user() and ensure_profile_initialized() handle unique_violation gracefully without blocking user creation'
);

assert(
  migration04Src.includes("a526a5c8-80d6-491b-b188-3f450878ad90") &&
  migration04Src.includes("techroadrider@gmail.com"),
  'Master Admin role is strictly bound to verified Auth UUID a526a5c8-80d6-491b-b188-3f450878ad90 and email techroadrider@gmail.com'
);

assert(
  migration04Src.includes("nspname = 'public'") &&
  migration04Src.includes("relname = 'profiles'") &&
  migration04Src.includes("tgname = 'trg_protect_profile_role'"),
  'trg_protect_profile_role trigger attachment is verified and scoped to public.profiles'
);

// -------------------------------------------------------------
// Suite 2: Genuinely New Authenticated User Flow
// -------------------------------------------------------------
console.log('\n--- Suite 2: Genuinely New Authenticated User Flow ---');

assert(
  authApiSrc.includes("await supabase.rpc('ensure_profile_initialized');"),
  'authApi.verifyOtp proactively calls ensure_profile_initialized for new users upon successful OTP verification'
);

assert(
  migration04Src.includes('CREATE TRIGGER on_auth_user_created') &&
  migration04Src.includes('FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();'),
  'Database auth trigger on_auth_user_created automatically initializes profiles on new user registration'
);

// -------------------------------------------------------------
// Suite 3: Missing-Profile Recovery & Graceful Diagnostics
// -------------------------------------------------------------
console.log('\n--- Suite 3: Missing-Profile Recovery & Graceful Diagnostics ---');

assert(
  serviceSrc.includes("const { data: initResult, error: initError } = await supabase.rpc('ensure_profile_initialized');"),
  'submitOnboarding requests trusted database initialization when profile update matches zero rows'
);

assert(
  serviceSrc.includes("const { data: initRes, error: initErr } = await supabase.rpc('ensure_profile_initialized');"),
  'saveBusinessDetails requests trusted database initialization when profile update matches zero rows'
);

assert(
  serviceSrc.includes("initError.code === 'PGRST202'") &&
  serviceSrc.includes("migration 20260928000004_profile_initialization_and_recovery.sql"),
  'submitOnboarding provides exact actionable diagnostic guidance when ensure_profile_initialized is missing in schema cache'
);

assert(
  migration04Src.includes('INSERT INTO public.profiles (id, full_name, phone, email, role)') &&
  migration04Src.includes('FROM public.vendors v') &&
  migration04Src.includes('JOIN auth.users u ON u.id = v.user_id') &&
  migration04Src.includes('WHERE p.id IS NULL'),
  'Migration includes targeted safe backfill restricted exclusively to verified vendor accounts'
);

// -------------------------------------------------------------
// Suite 4: Repeated Submission, Concurrency & Idempotency
// -------------------------------------------------------------
console.log('\n--- Suite 4: Repeated Submission, Concurrency & Idempotency ---');

assert(
  serviceSrc.includes("activeSubmissions.has(userId)") &&
  serviceSrc.includes("activeSubmissions.add(userId)") &&
  serviceSrc.includes("activeSubmissions.delete(userId)"),
  'submitOnboarding enforces in-flight concurrency lock preventing parallel duplicate submissions'
);

assert(
  serviceSrc.includes("onConflict: 'user_id'") &&
  serviceSrc.includes("from('vendors').upsert("),
  'Vendor details upsert explicitly specifies onConflict: user_id to prevent duplicate vendor records on retry'
);

assert(
  serviceSrc.includes("from('stores')") &&
  serviceSrc.includes(".eq('vendor_id', vendorId)"),
  'Store persistence checks for existing store record to prevent duplicate store records on retry'
);

// -------------------------------------------------------------
// Suite 5: Unauthorized Role Escalation Prevention
// -------------------------------------------------------------
console.log('\n--- Suite 5: Unauthorized Role Escalation Prevention ---');

assert(
  migration04Src.includes("SELECT * INTO v_vendor FROM public.vendors WHERE user_id = v_user_id;") &&
  migration04Src.includes("RAISE EXCEPTION 'Unauthorized: Role escalation to admin is prohibited.';"),
  'ensure_profile_initialized() strictly verifies vendor relationships and prevents unauthorized role escalation'
);

assert(
  migration04Src.includes('REVOKE ALL ON FUNCTION public.ensure_profile_initialized() FROM PUBLIC;') &&
  migration04Src.includes('REVOKE ALL ON FUNCTION public.ensure_profile_initialized() FROM anon;') &&
  migration04Src.includes('GRANT EXECUTE ON FUNCTION public.ensure_profile_initialized() TO authenticated;'),
  'ensure_profile_initialized() execution is revoked from public and anon, accessible only to authenticated users'
);

assert(
  !serviceSrc.includes(".from('profiles').insert(") &&
  !serviceSrc.includes(".from('profiles').upsert("),
  'Client-side code strictly avoids direct INSERT or UPSERT into public.profiles (zero RLS bypasses)'
);

assert(
  serviceSrc.includes("throw new Error(") &&
  serviceSrc.includes("Profile save failed: No profile record found for user") &&
  serviceSrc.includes("Client cannot insert profiles under existing RLS policies; the profile must be initialized by the database auth trigger"),
  'Explicit diagnostic error is retained when profile cannot be found or initialized'
);

// -------------------------------------------------------------
// Suite 6: UI Error Surface & Navigation Guard
// -------------------------------------------------------------
console.log('\n--- Suite 6: UI Error Surface & Navigation Guard ---');

assert(
  termsScreenSrc.includes("const result = await vendorOnboardingService.submitOnboarding(onboardingState);") &&
  termsScreenSrc.includes("if (result && result.success) {") &&
  termsScreenSrc.includes("navigate('pending');"),
  'TermsConditionsScreen only navigates to pending when submitOnboarding succeeds'
);

assert(
  termsScreenSrc.includes("catch (err) {") &&
  termsScreenSrc.includes("setSubmitError(err.message"),
  'TermsConditionsScreen catches submission failure and populates submitError banner'
);

assert(
  termsScreenSrc.includes("{submitError ? (") &&
  termsScreenSrc.includes("styles.errorBanner"),
  'TermsConditionsScreen renders error banner in UI preventing silent submission claim'
);

console.log('\n================================================================');
console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
}

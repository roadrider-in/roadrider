import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env before initializing Supabase client
const envText = readFileSync(resolve('.env'), 'utf-8');
envText.split('\n').forEach((line) => {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) {
    let val = m[2] || '';
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[m[1]] = val.trim();
  }
});

const { sessionOtpGate } = await import('./src/services/sessionOtpGate.js');
const { authApi } = await import('./src/services/api/authApi.js');

console.log('================================================================');
console.log('  TESTING OTP RELOAD & SIGN-OUT RE-AUTHENTICATION SECURITY      ');
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
// Suite 1: Static Architecture & Security Gate Audit
// -------------------------------------------------------------
console.log('--- Suite 1: Static Code Architecture Audit ---');

const gateSrc = readFileSync(resolve('src/services/sessionOtpGate.js'), 'utf-8');
const authApiSrc = readFileSync(resolve('src/services/api/authApi.js'), 'utf-8');
const onboardingContextSrc = readFileSync(resolve('src/context/OnboardingContext.jsx'), 'utf-8');
const vendorContextSrc = readFileSync(resolve('src/context/VendorContext.jsx'), 'utf-8');
const rootNavigatorSrc = readFileSync(resolve('src/navigation/RootNavigator.jsx'), 'utf-8');
const navigationContextSrc = readFileSync(resolve('src/navigation/NavigationContext.jsx'), 'utf-8');
const mobileVerificationSrc = readFileSync(resolve('src/screens/onboarding/MobileVerificationScreen.jsx'), 'utf-8');
const signInScreenSrc = readFileSync(resolve('src/screens/auth/SignInScreen.jsx'), 'utf-8');
const profileSettingsSrc = readFileSync(resolve('src/screens/shared/ProfileSettingsScreen.jsx'), 'utf-8');
const serviceSrc = readFileSync(resolve('src/services/vendorOnboardingService.js'), 'utf-8');

assert(
  gateSrc.includes('let _sessionOtpVerifiedUserId = null;') &&
  !gateSrc.includes('localStorage.set') &&
  !gateSrc.includes('localStorage.get') &&
  gateSrc.includes('isSessionOtpVerified') &&
  gateSrc.includes('setSessionOtpVerified') &&
  gateSrc.includes('clearSessionOtpVerified'),
  'sessionOtpGate is strictly in-memory and never reads/writes localStorage'
);

assert(
  authApiSrc.includes('isSessionOtpVerified: (userId) => sessionOtpGate.isSessionOtpVerified(userId)') &&
  authApiSrc.includes('signOut: async') &&
  authApiSrc.includes("supabase.auth.signOut({ scope: 'global' })"),
  'authApi delegates session OTP checks to sessionOtpGate and implements global signOut'
);

assert(
  authApiSrc.includes('authApi.setSessionOtpVerified(user.id, cleanPhone)'),
  'authApi.verifyOtp authoritatively records session OTP verification upon successful Supabase OTP verification'
);

assert(
  authApiSrc.includes('authApi.isSessionOtpVerified(user.id)') &&
  serviceSrc.includes('sessionOtpGate.isSessionOtpVerified'),
  'Backend service layers enforce sessionOtpGate before loading or modifying vendor onboarding data'
);

assert(
  !onboardingContextSrc.includes('supabase.auth.getSession().then(({ data }) => {\n      if (isMounted && data?.session?.user?.id) {\n        loadSavedOnboarding'),
  'OnboardingContext removes mount-time auto-hydration (prevents exposing saved data on reload before OTP verification)'
);

assert(
  onboardingContextSrc.includes('const [isSessionOtpVerified, setIsSessionOtpVerified] = useState(false);') &&
  onboardingContextSrc.includes('setIsSessionOtpVerified(false);'),
  'OnboardingContext initializes isSessionOtpVerified to false and resets it on resetOnboarding'
);

assert(
  vendorContextSrc.includes('sessionOtpGate.isSessionOtpVerified(user.id)') &&
  vendorContextSrc.includes('loadVendorStores') &&
  vendorContextSrc.includes('refreshVendorStores: loadVendorStores') &&
  vendorContextSrc.includes('loadVendorStores,') &&
  vendorContextSrc.includes('resetVendorState'),
  'VendorContext gates store loading through sessionOtpGate and exports loadVendorStores, refreshVendorStores, and resetVendorState'
);

// Extract PUBLIC_UNAUTHENTICATED_SCREENS block
const publicScreensBlock = rootNavigatorSrc.match(/const PUBLIC_UNAUTHENTICATED_SCREENS = \[([\s\S]*?)\];/)?.[1] || '';

assert(
  publicScreensBlock &&
  !publicScreensBlock.includes("'business'") &&
  !publicScreensBlock.includes("'tax'") &&
  !publicScreensBlock.includes("'address'") &&
  !publicScreensBlock.includes("'kyc'") &&
  !publicScreensBlock.includes("'photos'") &&
  !publicScreensBlock.includes("'terms'") &&
  !publicScreensBlock.includes("'pending'") &&
  publicScreensBlock.includes("'phone'"),
  'RootNavigator strictly defines unauthenticated screens, treating business/tax/kyc/etc as protected'
);

assert(
  rootNavigatorSrc.includes('isOtpGatePassed = Boolean(') &&
  rootNavigatorSrc.includes('if (isProtected && !isOtpGatePassed)') &&
  rootNavigatorSrc.includes('return currentScreen === \'signin\' ? <SignInScreen /> : <MobileVerificationScreen />;'),
  'RootNavigator provides immediate render guard blocking protected screen rendering without OTP verification'
);

assert(
  navigationContextSrc.includes('UNAUTHENTICATED_PUBLIC_SCREENS') &&
  navigationContextSrc.includes('!isOtpVerified') &&
  navigationContextSrc.includes("return 'phone'"),
  'NavigationContext getInitialScreenFromUrl redirects protected screens to phone OTP on reload'
);

assert(
  mobileVerificationSrc.includes('authApi.verifyOtp(cleanPhone, fullOtp)') &&
  mobileVerificationSrc.includes('setIsSessionOtpVerified(true)') &&
  mobileVerificationSrc.includes('resetOnboarding()') &&
  mobileVerificationSrc.includes('loadSavedOnboarding(res.user.id)'),
  'MobileVerificationScreen resets stale state on OTP verification and reloads returning user data via authenticated ID'
);

assert(
  signInScreenSrc.includes('authApi.verifyOtp(cleanPhone, fullOtp)') &&
  signInScreenSrc.includes('setIsSessionOtpVerified(true)') &&
  signInScreenSrc.includes('resetOnboarding()'),
  'SignInScreen enforces in-memory OTP verification and state reset on successful OTP verification'
);

assert(
  profileSettingsSrc.includes('await authApi.signOut();') &&
  profileSettingsSrc.includes('resetVendorState') &&
  profileSettingsSrc.includes('resetOnboarding'),
  'ProfileSettingsScreen signOut purges in-memory session OTP gate, vendor state, and onboarding state'
);

// -------------------------------------------------------------
// Suite 2: In-Memory OTP Gate Behavioral Logic Tests
// -------------------------------------------------------------
console.log('\n--- Suite 2: Session OTP Gate Behavioral Tests ---');

// Reset to clean test state
sessionOtpGate.clearSessionOtpVerified();

assert(
  sessionOtpGate.isSessionOtpVerified('test-user-1') === false,
  'Unverified user ID returns false on sessionOtpGate check'
);

assert(
  sessionOtpGate.isSessionOtpVerified(null) === false &&
  sessionOtpGate.isSessionOtpVerified(undefined) === false &&
  sessionOtpGate.isSessionOtpVerified('') === false,
  'Null, undefined, or empty user ID safely returns false'
);

// Simulate OTP verification for User 1
sessionOtpGate.setSessionOtpVerified('test-user-1', '9876543210');

assert(
  sessionOtpGate.isSessionOtpVerified('test-user-1') === true,
  'Verified user ID returns true after setSessionOtpVerified'
);

assert(
  sessionOtpGate.isSessionOtpVerified('test-user-2') === false,
  'User 2 is NOT verified when User 1 is verified (no cross-account bleeding)'
);

const userDetails = sessionOtpGate.getSessionVerifiedUser();
assert(
  userDetails.userId === 'test-user-1' && userDetails.phone === '9876543210',
  'getSessionVerifiedUser returns correct user ID and normalized phone'
);

// Simulate sign-out
sessionOtpGate.clearSessionOtpVerified();
assert(
  sessionOtpGate.isSessionOtpVerified('test-user-1') === false,
  'User 1 is no longer verified after clearSessionOtpVerified'
);

// Simulate User 2 verifying
sessionOtpGate.setSessionOtpVerified('test-user-2', '9123456789');
assert(
  sessionOtpGate.isSessionOtpVerified('test-user-2') === true &&
  sessionOtpGate.isSessionOtpVerified('test-user-1') === false,
  'User 2 verification does not grant access to User 1'
);

// Clean up
sessionOtpGate.clearSessionOtpVerified();

console.log('\n================================================================');
console.log(`  RESULTS: ${passed} PASSED | ${failed} FAILED`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
}

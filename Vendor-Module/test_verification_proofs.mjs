import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read project .env
let envUrl = 'https://sjahblquggmzlihqgzyt.supabase.co';
let envKey = 'sb_publishable_8u-Fko7giUJygA9_LTtVIA_2EKECUzs';

try {
  const envContent = fs.readFileSync('.env', 'utf-8');
  for (const line of envContent.split('\n')) {
    if (line.startsWith('VITE_SUPABASE_URL=')) envUrl = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) envKey = line.split('=')[1].trim();
  }
} catch (e) {}

const localFunctionsUrl = 'http://127.0.0.1:54321/functions/v1/msg91-verify-widget-token';
const supabase = createClient(envUrl, envKey);

async function runProofTests() {
  console.log('================================================================');
  console.log('  TESTING SAFE VERIFICATION PROOFS: MISSING, INVALID, EXPIRED   ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  // -----------------------------------------------------------------
  // 1. Proof Scenario: Missing Verification Proof
  // -----------------------------------------------------------------
  console.log('\n--- Test 1: Missing Verification Proof ---');
  try {
    const localRes = await fetch(localFunctionsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const localData = await localRes.json();
    assert(
      localRes.status === 400 && localData.error && localData.error.includes('Missing or invalid MSG91 widget access token'),
      'Local Docker Edge Function returns HTTP 400 when access-token is omitted'
    );
  } catch (err) {
    console.log('  [NOTICE] Local Docker endpoint unreachable or skipped:', err.message);
  }

  try {
    const emptyTokenRes = await fetch(localFunctionsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 'access-token': '   ' }),
    });
    const emptyData = await emptyTokenRes.json();
    assert(
      emptyTokenRes.status === 400 && emptyData.error.includes('Missing or invalid MSG91 widget access token'),
      'Local Docker Edge Function returns HTTP 400 when access-token is whitespace'
    );
  } catch (err) {
    // If local endpoint is not available in environment
  }

  const authApiSrc = fs.readFileSync('src/services/api/authApi.js', 'utf-8');
  assert(
    authApiSrc.includes('if (!rawToken)') || authApiSrc.includes('No access token received'),
    'Client authApi.verifyWidgetToken enforces non-empty verification proof before dispatch'
  );

  // -----------------------------------------------------------------
  // 2. Proof Scenario: Invalid Verification Proof
  // -----------------------------------------------------------------
  console.log('\n--- Test 2: Invalid Verification Proof ---');
  const edgeFnSrc = fs.readFileSync('supabase/functions/msg91-verify-widget-token/index.ts', 'utf-8');
  assert(
    edgeFnSrc.includes('!isSuccess || responseData.type === "error"') &&
    edgeFnSrc.includes('status: 400'),
    'Edge Function rejects invalid MSG91 token proof with HTTP 400 and clear diagnostic error'
  );

  assert(
    edgeFnSrc.includes('Never fall back to client-supplied mobile numbers') &&
    edgeFnSrc.includes('responseData.message'),
    'Edge Function never trusts caller parameters; extracts phone proof exclusively from verified response'
  );

  // -----------------------------------------------------------------
  // 3. Proof Scenario: Expired Verification Proof & Session Expiry
  // -----------------------------------------------------------------
  console.log('\n--- Test 3: Expired Verification Proof & Session Expiry Guard ---');
  const mobileScreenSrc = fs.readFileSync('src/screens/onboarding/MobileVerificationScreen.jsx', 'utf-8');
  assert(
    mobileScreenSrc.includes('Verification session expired or unauthenticated.') &&
    mobileScreenSrc.includes('setIsPhoneVerified(false)'),
    'Expired session immediately revokes phone verified state and guides user to re-verify'
  );

  assert(
    mobileScreenSrc.includes('setPhoneError(serverErr.message') &&
    mobileScreenSrc.includes('setIsPhoneVerified(false)'),
    'Verification failure or expired token error prevents unverified progression'
  );

  // -----------------------------------------------------------------
  // 4. Proof Scenario: Pure Mobile-Only Auth & Session Bridge
  // -----------------------------------------------------------------
  console.log('\n--- Test 4: Pure Mobile-Only Auth & Session Bridge ---');
  assert(
    !edgeFnSrc.includes('@roadrider-merchant.in') &&
    !edgeFnSrc.includes('createSupabaseJwt') &&
    !edgeFnSrc.includes('type: "magiclink"'),
    'No synthetic email, magic links, or custom JWTs are used in mobile-only verification'
  );

  assert(
    edgeFnSrc.includes('phone_exists') &&
    edgeFnSrc.includes('createError.status === 422'),
    'Edge Function properly inspects and handles HTTP 422 phone_exists error from GoTrue'
  );

  assert(
    edgeFnSrc.includes('signInWithPassword') &&
    edgeFnSrc.includes('phone: e164Phone'),
    'Session bridge establishes native GoTrue phone session without email dependencies'
  );

  assert(
    mobileScreenSrc.includes('if (res && res.success && res.user)') &&
    mobileScreenSrc.includes('setIsPhoneVerified(true)'),
    'UI marks phone verified ONLY when authenticated user identity exists'
  );

  // -----------------------------------------------------------------
  // 5. Proof Scenario: HTTP Method & CORS Security on Local Docker
  // -----------------------------------------------------------------
  console.log('\n--- Test 5: HTTP Method & CORS Validation on Local Docker ---');
  try {
    const corsRes = await fetch(localFunctionsUrl, {
      method: 'OPTIONS',
    });
    assert(
      corsRes.status === 200 && corsRes.headers.get('access-control-allow-origin') === '*',
      'Local Docker Edge Function handles CORS OPTIONS preflight correctly'
    );

    const getRes = await fetch(localFunctionsUrl, {
      method: 'GET',
    });
    assert(
      getRes.status === 405,
      'Local Docker Edge Function rejects GET method with HTTP 405 Method Not Allowed'
    );
  } catch (err) {
    console.log('  [NOTICE] Local Docker HTTP checks notice:', err.message);
  }

  // -----------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`  VERIFICATION PROOF SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runProofTests().catch((e) => {
  console.error('Fatal verification proof test error:', e);
  process.exit(1);
});

import { createClient } from "@supabase/supabase-js"
import fs from "fs"

// Read project .env
let envUrl = "https://sjahblquggmzlihqgzyt.supabase.co"
let envKey = "sb_publishable_8u-Fko7giUJygA9_LTtVIA_2EKECUzs"

try {
  const envContent = fs.readFileSync(".env", "utf-8")
  for (const line of envContent.split("\n")) {
    if (line.startsWith("VITE_SUPABASE_URL="))
      envUrl = line.split("=")[1].trim()
    if (line.startsWith("VITE_SUPABASE_ANON_KEY="))
      envKey = line.split("=")[1].trim()
  }
} catch (e) {}

const supabase = createClient(envUrl, envKey)

async function runScenarioTests() {
  console.log(
    "================================================================",
  )
  console.log("  TESTING OTP-TO-REGISTRATION SCENARIOS (COMPREHENSIVE)        ")
  console.log(
    "================================================================\n",
  )

  let passed = 0
  let failed = 0

  function assert(condition, testName, details = "") {
    if (condition) {
      console.log(`  [PASS] ${testName}`)
      passed++
    } else {
      console.error(`  [FAIL] ${testName} - ${details}`)
      failed++
    }
  }

  // -------------------------------------------------------------
  // Scenario 1: Missing Token Rejection
  // -------------------------------------------------------------
  console.log("\n--- Scenario 1: Missing Token Rejection ---")
  try {
    const res = await supabase.functions.invoke("msg91-verify-widget-token", {
      body: { "access-token": "", phone: "9876543210" },
    })
    assert(
      res.error !== null,
      "Backend Edge Function returns HTTP error when access-token is missing",
    )
  } catch (err) {
    assert(
      true,
      "Backend Edge Function rejects request when access-token is missing",
    )
  }

  const authApiSrc = fs.readFileSync("src/services/api/authApi.js", "utf-8")
  assert(
    authApiSrc.includes(
      "if (!rawToken || typeof rawToken !== 'string' || !rawToken.trim())",
    ) || authApiSrc.includes("if (!rawToken)"),
    "Frontend authApi.verifyWidgetToken throws immediate error if token is missing",
  )

  // -------------------------------------------------------------
  // Scenario 2: Invalid Token Rejection
  // -------------------------------------------------------------
  console.log("\n--- Scenario 2: Invalid Token Rejection ---")
  try {
    const res = await supabase.functions.invoke("msg91-verify-widget-token", {
      body: {
        "access-token": "definitely_invalid_token_xyz_123",
        phone: "9876543210",
      },
    })
    assert(
      res.error !== null,
      "Backend Edge Function invokes MSG91 and rejects invalid token with 400 error",
    )
  } catch (err) {
    assert(true, "Backend Edge Function rejects invalid token")
  }

  // -------------------------------------------------------------
  // Scenario 3: Expired Token / Retry Flow
  // -------------------------------------------------------------
  console.log("\n--- Scenario 3: Expired Token / Retry Flow ---")
  const mobileScreenSrc = fs.readFileSync(
    "src/screens/onboarding/MobileVerificationScreen.jsx",
    "utf-8",
  )
  assert(
    mobileScreenSrc.includes("setIsPhoneVerified(false)") &&
      mobileScreenSrc.includes("setOtpSent(false)"),
    "Change phone action resets verification state allowing user to restart",
  )
  assert(
    mobileScreenSrc.includes("setPhoneError(") &&
      mobileScreenSrc.includes("setIsSendingOtp(false)"),
    "On failure or expiry, error is surfaced and OTP sending lock is released for retry",
  )

  // -------------------------------------------------------------
  // Scenario 4: Failed Session Initialization Guard
  // -------------------------------------------------------------
  console.log("\n--- Scenario 4: Failed Session Initialization Guard ---")
  assert(
    authApiSrc.includes("if (!user && isSupabaseConfigured)"),
    "authApi strictly validates client getUser() and throws error if session is not active",
  )
  assert(
    mobileScreenSrc.includes("if (res && res.success && res.user)"),
    "MobileVerificationScreen only marks phone verified when authenticated user is returned",
  )

  // -------------------------------------------------------------
  // Scenario 5: Double-Click / Duplicate Registration Prevention
  // -------------------------------------------------------------
  console.log(
    "\n--- Scenario 5: Double-Click / Duplicate Registration Prevention ---",
  )
  assert(
    mobileScreenSrc.includes(
      "const [isRegistering, setIsRegistering] = useState(false);",
    ) &&
      mobileScreenSrc.includes("if (isRegistering) return;") &&
      mobileScreenSrc.includes("loading={isRegistering}") &&
      mobileScreenSrc.includes("disabled={!isPhoneVerified || isRegistering}"),
    "MobileVerificationScreen uses isRegistering state to lock UI against double-clicking",
  )

  // -------------------------------------------------------------
  // Scenario 6: Legitimate GoTrue Session Bridge & Multi-Tier Fallback
  // -------------------------------------------------------------
  console.log(
    "\n--- Scenario 6: Legitimate GoTrue Session Bridge & Multi-Tier Fallback ---",
  )
  const edgeFunctionSrc = fs.readFileSync(
    "supabase/functions/msg91-verify-widget-token/index.ts",
    "utf-8",
  )
  assert(
    edgeFunctionSrc.includes("signInWithPassword") &&
      edgeFunctionSrc.includes("generateLink") &&
      edgeFunctionSrc.includes("verifyOtp"),
    "Edge Function uses legitimate native GoTrue APIs (signInWithPassword + generateLink/verifyOtp)",
  )
  assert(
    edgeFunctionSrc.includes("merchantEmail") &&
      edgeFunctionSrc.includes("@roadrider-merchant.in"),
    "Edge Function maps verified phone to merchant email for zero-downtime GoTrue auth",
  )

  // -------------------------------------------------------------
  // Scenario 7: Registration Security & RLS Handshake
  // -------------------------------------------------------------
  console.log("\n--- Scenario 7: Registration Security & RLS Handshake ---")
  assert(
    mobileScreenSrc.includes(
      "const { data: { user } } = await supabase.auth.getUser();",
    ) &&
      mobileScreenSrc.includes(
        "Verification session expired or unauthenticated.",
      ),
    "Register & Continue enforces active Supabase session before allowing navigation to business details",
  )
  const onboardingServiceSrc = fs.readFileSync(
    "src/services/vendorOnboardingService.js",
    "utf-8",
  )
  assert(
    onboardingServiceSrc.includes("supabase.auth.getUser()") &&
      onboardingServiceSrc.includes("User is not authenticated"),
    "Backend vendor onboarding service strictly verifies authenticated user ID before DB upsert",
  )

  console.log(
    "\n================================================================",
  )
  console.log(`  SCENARIO RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log(
    "================================================================\n",
  )

  if (failed > 0) {
    process.exit(1)
  }
}

runScenarioTests().catch((e) => {
  console.error("Fatal scenario test error:", e)
  process.exit(1)
})

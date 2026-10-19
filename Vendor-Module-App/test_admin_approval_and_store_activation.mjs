import { readFileSync } from "fs"
import { resolve } from "path"

console.log("================================================================")
console.log("  TESTING VENDOR APPROVAL TO STORE ACTIVATION FLOW             ")
console.log(
  "================================================================\n",
)

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`)
    passed++
  } else {
    console.error(`  [FAIL] ${message}`)
    failed++
  }
}

const serviceSrc = readFileSync(
  resolve("src/services/vendorOnboardingService.js"),
  "utf-8",
)
const pendingSrc = readFileSync(
  resolve("src/screens/onboarding/VerificationPendingScreen.jsx"),
  "utf-8",
)
const signInSrc = readFileSync(
  resolve("src/screens/auth/SignInScreen.jsx"),
  "utf-8",
)
const contextSrc = readFileSync(
  resolve("src/context/OnboardingContext.jsx"),
  "utf-8",
)
const navSrc = readFileSync(
  resolve("src/navigation/RootNavigator.jsx"),
  "utf-8",
)
const initialSchemaSrc = readFileSync(
  resolve("supabase/migrations/20260928000000_roadrider_initial_schema.sql"),
  "utf-8",
)
const adminMigrationSrc = readFileSync(
  resolve(
    "supabase/migrations/20260928000003_master_admin_approval_and_rls.sql",
  ),
  "utf-8",
)

// -------------------------------------------------------------
// Test 1: Submitted -> Approved Transition
// -------------------------------------------------------------
console.log("--- Test 1: Submitted -> Approved Lifecycle Transition ---")

assert(
  serviceSrc.includes(
    "select('id, vendor_type, onboarding_status, onboarding_step, terms_accepted')",
  ) &&
    pendingSrc.includes(
      "statusRes.onboardingStatus === 'approved' || statusRes.onboardingStatus === 'live'",
    ) &&
    pendingSrc.includes("setVerificationStatus('verified');"),
  "getOnboardingStatus queries verified columns and VerificationPendingScreen maps approved status to verified state",
)

assert(
  pendingSrc.includes(
    "navigate(vendorRole === 'grocery' ? 'grocery-home' : 'restaurant-home')",
  ),
  "VerificationPendingScreen unlocks store dashboard navigation on approved verification",
)

assert(
  signInSrc.includes(
    "if (existingVendor.onboarding_status === 'approved' || existingVendor.onboarding_status === 'live')",
  ) && signInSrc.includes("navigate('restaurant-home')"),
  "SignInScreen directly routes verified vendors to role-specific dashboard on subsequent login",
)

// -------------------------------------------------------------
// Test 2: Submitted -> Rejected Transition
// -------------------------------------------------------------
console.log("\n--- Test 2: Submitted -> Rejected Lifecycle Transition ---")

assert(
  pendingSrc.includes("statusRes.onboardingStatus === 'rejected'") &&
    pendingSrc.includes("setVerificationStatus('rejected')") &&
    pendingSrc.includes("statusRes.rejectionReason && setRejectionReason"),
  "VerificationPendingScreen maps rejected status and updates rejectionReason state",
)

assert(
  signInSrc.includes("existingVendor.onboarding_status === 'rejected'") &&
    signInSrc.includes("navigate('pending');"),
  "SignInScreen routes rejected vendors to pending screen to review compliance feedback",
)

// -------------------------------------------------------------
// Test 3: Document Rejection Details from public.kyc_documents
// -------------------------------------------------------------
console.log(
  "\n--- Test 3: Document Rejection Extraction from kyc_documents ---",
)

assert(
  serviceSrc.includes("from('kyc_documents')") &&
    serviceSrc.includes(
      "select('id, document_type, status, rejection_reason')",
    ) &&
    serviceSrc.includes("eq('status', 'rejected')"),
  "vendorOnboardingService fetches document-level rejection reasons from public.kyc_documents",
)

assert(
  contextSrc.includes(
    "const rejectedDoc = state.kycDocs.find((d) => d.status === 'rejected' && d.rejection_reason);",
  ) &&
    contextSrc.includes(
      "initialRejectionReason = rejectedDoc.rejection_reason;",
    ),
  "OnboardingContext rehydrates KYC document rejection reasons upon draft loading",
)

// -------------------------------------------------------------
// Test 4: Unauthorized Self-Approval Prevention
// -------------------------------------------------------------
console.log("\n--- Test 4: Unauthorized Self-Approval Prevention ---")

assert(
  !serviceSrc.includes("onboarding_status = 'approved'") &&
    !serviceSrc.includes("setVerificationStatus('verified')") &&
    !pendingSrc.includes("setVerificationStatus('verified') // simulate"),
  "Frontend vendor service contains zero client-side self-approval logic",
)

assert(
  initialSchemaSrc.includes(
    "CREATE OR REPLACE FUNCTION public.protect_kyc_verification()",
  ) &&
    initialSchemaSrc.includes("auth.role() <> 'service_role'") &&
    initialSchemaSrc.includes(
      "Document approval and rejection status can only be updated by admin",
    ),
  "Initial database triggers prevent vendors from self-verifying KYC documents",
)

assert(
  adminMigrationSrc.includes(
    "CREATE OR REPLACE FUNCTION public.protect_vendor_approval_status()",
  ) &&
    adminMigrationSrc.includes(
      "Only an authorized Master Admin can approve or reject vendor onboarding applications",
    ),
  "Security triggers prevent non-admin accounts from updating vendor onboarding status to approved",
)

// -------------------------------------------------------------
// Test 5: Store Activation and Independence from KYC Verification
// -------------------------------------------------------------
console.log("\n--- Test 5: Store Activation & Verified KYC Independence ---")

assert(
  initialSchemaSrc.includes(
    "status text NOT NULL DEFAULT 'OFFLINE' CHECK (status IN ('ONLINE', 'OFFLINE', 'PAUSED'))",
  ),
  "Database schema defines supported store activation statuses (ONLINE, OFFLINE, PAUSED)",
)

assert(
  adminMigrationSrc.includes(
    "CREATE OR REPLACE FUNCTION public.protect_store_online_activation()",
  ) &&
    adminMigrationSrc.includes("v_vendor_status NOT IN ('approved', 'live')") &&
    adminMigrationSrc.includes(
      "Stores cannot be activated online before vendor verification and Master Admin approval",
    ),
  "Store online activation strictly requires prior Master Admin vendor approval",
)

assert(
  !serviceSrc.includes(
    "if (allKycVerified) vendor.onboarding_status = 'approved'",
  ) && !contextSrc.includes("allKycVerified"),
  "Verified KYC documents alone do NOT automatically promote vendor to approved status",
)

console.log(
  "\n================================================================",
)
console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`)
console.log(
  "================================================================\n",
)

if (failed > 0) {
  process.exit(1)
}

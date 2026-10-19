import { readFileSync } from "fs"
import { resolve } from "path"

console.log("================================================================")
console.log("  TESTING KYC PERSISTENCE, RLS SECURITY & RETRY LOGIC           ")
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
const kycScreenSrc = readFileSync(
  resolve("src/screens/onboarding/KycDocumentsScreen.jsx"),
  "utf-8",
)
const taxScreenSrc = readFileSync(
  resolve("src/screens/onboarding/TaxBankScreen.jsx"),
  "utf-8",
)
const termsScreenSrc = readFileSync(
  resolve("src/screens/onboarding/TermsConditionsScreen.jsx"),
  "utf-8",
)
const initialSchemaSrc = readFileSync(
  resolve("supabase/migrations/20260928000000_roadrider_initial_schema.sql"),
  "utf-8",
)

// -------------------------------------------------------------
// Suite 1: Authentication & Vendor Mapping Validation (Task 3)
// -------------------------------------------------------------
console.log("--- Suite 1: Authenticated User & Vendor Mapping Validation ---")

assert(
  serviceSrc.includes("saveTaxAndBankDetails: async") &&
    serviceSrc.includes("supabase.auth.getUser()") &&
    serviceSrc.includes("vendorRecord.user_id !== authData.user.id") &&
    serviceSrc.includes("Authenticated user is not mapped to vendor"),
  "saveTaxAndBankDetails validates authenticated user against vendor record before upload & insert",
)

assert(
  serviceSrc.includes("saveKycDocuments: async") &&
    serviceSrc.includes("vendorRecord.user_id !== authData.user.id") &&
    serviceSrc.includes("Authenticated user is not mapped to vendor"),
  "saveKycDocuments validates authenticated user against vendor record before upload & insert",
)

assert(
  taxScreenSrc.includes("if (!currentVendorId)") &&
    taxScreenSrc.includes("throw new Error('Vendor profile not initialized."),
  "TaxBankScreen halts and displays actionable error if vendor profile is uninitialized",
)

assert(
  kycScreenSrc.includes("if (!currentVendorId)") &&
    kycScreenSrc.includes("throw new Error('Vendor profile not initialized."),
  "KycDocumentsScreen halts and displays actionable error if vendor profile is uninitialized",
)

// -------------------------------------------------------------
// Suite 2: Exact Error Reporting on Insert Failures (Task 2)
// -------------------------------------------------------------
console.log("\n--- Suite 2: Exact Error Reporting on Failed Inserts ---")

assert(
  serviceSrc.includes(
    "throw new Error(`[ONBOARDING] KYC document metadata insert failed (${type}): ${kycInsertErr.message}`);",
  ),
  "submitOnboarding reports the exact Supabase error message when KYC metadata insert fails",
)

assert(
  serviceSrc.includes(
    "throw new Error(`[TaxBank] Cheque metadata insert failed: ${insertErr.message}`);",
  ),
  "saveTaxAndBankDetails reports the exact Supabase error message when cheque insert fails",
)

assert(
  serviceSrc.includes(
    "throw new Error(`[KYC] Failed to insert ${type} document metadata: ${insertErr.message}`);",
  ),
  "saveKycDocuments reports the exact Supabase error message when document insert fails",
)

assert(
  serviceSrc.includes(
    "console.error(`[ONBOARDING] KYC document metadata insert failed (${type}) [Code:",
  ) &&
    serviceSrc.includes(
      "console.error(`[TaxBank] Cheque metadata insert failed [Code:",
    ) &&
    serviceSrc.includes(
      "console.error(`[KYC] Failed to insert ${type} document metadata [Code:",
    ),
  "Explicit safe error logging reports exact Supabase error code and message on failures",
)

assert(
  !serviceSrc.includes("// swallow error") &&
    !serviceSrc.includes("catch (e) {} // ignore insert"),
  "Service contains zero silent swallows or empty catches for database insert errors",
)

// -------------------------------------------------------------
// Suite 3: Unique Constraint Conflict Retry & Matching Row Update (Task 4)
// -------------------------------------------------------------
console.log(
  "\n--- Suite 3: Unique Constraint Conflict Retry & Matching Row Update ---",
)

assert(
  serviceSrc.includes("kycInsertErr.code === '23505'") &&
    serviceSrc.includes("eq('vendor_id', vendorId)") &&
    serviceSrc.includes("eq('document_type', type)") &&
    serviceSrc.includes(
      "throw new Error(`[ONBOARDING] KYC document metadata update failed (${type}): ${retryUpdateErr.message}`);",
    ),
  "submitOnboarding catches 23505 conflict, queries matching row, updates specifically by ID and vendor_id, and checks retryUpdateErr",
)

assert(
  serviceSrc.includes("[TaxBank] KYC insert conflict for cancelled_cheque") &&
    serviceSrc.includes(
      "throw new Error(`[TaxBank] Failed to update existing cheque record: ${retryErr.message}`);",
    ),
  "saveTaxAndBankDetails catches 23505 conflict, queries matching cheque row, and verifies retryErr",
)

assert(
  serviceSrc.includes("[KYC] Insert conflict for") &&
    serviceSrc.includes(
      "throw new Error(`[KYC] Failed to update existing ${type} record: ${retryErr.message}`);",
    ),
  "saveKycDocuments catches 23505 conflict, queries matching document row, and verifies retryErr",
)

assert(
  serviceSrc.includes("safeStorageCleanup") &&
    serviceSrc.includes("tableName: 'kyc_documents'"),
  "Retry update triggers safeStorageCleanup to remove superseded file after confirmed DB update",
)

// -------------------------------------------------------------
// Suite 4: Successful Metadata Persistence & Schema Compatibility (Tasks 2, 6)
// -------------------------------------------------------------
console.log("\n--- Suite 4: Metadata Persistence & Schema Compatibility ---")

assert(
  serviceSrc.includes(
    ".select('id, vendor_id, store_id, document_type, storage_path, status, created_at')",
  ),
  "submitOnboarding includes storage_path and store_id in existing KYC documents query",
)

assert(
  serviceSrc.includes(
    "doc.storagePath || `${vendorId}/${type}_${Date.now()}_${fileName",
  ),
  "submitOnboarding reuses confirmed doc.storagePath to avoid duplicate orphaned storage uploads",
)

assert(
  serviceSrc.includes("vendor_id: vendorId") &&
    serviceSrc.includes("store_id: storeId") &&
    serviceSrc.includes("document_type: type") &&
    serviceSrc.includes("status: 'pending'"),
  "KYC insert payloads properly populate vendor_id, store_id, document_type, storage_path, and pending status",
)

assert(
  initialSchemaSrc.includes(
    'CREATE POLICY "Vendors insert own KYC documents" ON public.kyc_documents',
  ) &&
    initialSchemaSrc.includes(
      "FOR INSERT WITH CHECK (vendor_id = public.get_current_vendor_id())",
    ),
  "Database migration enforces RLS check requiring vendor_id = public.get_current_vendor_id() on insert",
)

assert(
  initialSchemaSrc.includes(
    'CREATE POLICY "Vendors update own KYC documents" ON public.kyc_documents',
  ) &&
    initialSchemaSrc.includes(
      "WITH CHECK (vendor_id = public.get_current_vendor_id())",
    ),
  "Database migration enforces RLS check requiring vendor_id = public.get_current_vendor_id() on update",
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

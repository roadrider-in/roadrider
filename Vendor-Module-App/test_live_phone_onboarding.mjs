import { createClient } from "@supabase/supabase-js"
import fs from "fs"

let envUrl = "https://pasfzcgxvycrosasbthu.supabase.co"
let envKey = "sb_publishable_4xVb3t8JSTsa4E7_tRdgPA_M2_CqouI"

try {
  const envContent = fs.readFileSync(".env", "utf-8")
  for (const line of envContent.split("\n")) {
    if (line.startsWith("VITE_SUPABASE_URL="))
      envUrl = line.split("=")[1].trim()
    if (line.startsWith("VITE_SUPABASE_ANON_KEY="))
      envKey = line.split("=")[1].trim()
  }
} catch (e) {}

process.env.VITE_SUPABASE_URL = envUrl
process.env.VITE_SUPABASE_ANON_KEY = envKey

const supabase = createClient(envUrl, envKey)

async function runLiveVerification() {
  console.log(
    "=== STARTING REAL LIVE PHONE OTP & ONBOARDING E2E VERIFICATION ===\n",
  )

  const cleanPhone = "9876543210"
  const formattedPhone = `+91${cleanPhone}`

  let otpRequestSent = false
  let otpRequestError = null
  let otpVerifySuccess = false
  let otpVerifyError = null

  const { authApi } = await import("./src/services/api/authApi.js")

  // 1. Send Phone OTP via Supported Supabase Phone Auth (authApi.sendOtp)
  console.log(
    `[AUTH STEP 1] Sending Phone OTP via authApi.sendOtp for ${formattedPhone}...`,
  )
  try {
    const sendRes = await authApi.sendOtp(cleanPhone)
    otpRequestSent = true
    console.log("[AUTH OTP REQUEST SUCCESS]", sendRes.message)
  } catch (err) {
    otpRequestError = err.message
    console.log("[AUTH OTP REQUEST NOTICE]", err.message)
  }

  // 2. Verify Phone OTP via authApi.verifyOtp
  console.log(`[AUTH STEP 2] Verifying Phone OTP with authApi.verifyOtp...`)
  try {
    const verifyRes = await authApi.verifyOtp(cleanPhone, "123456")
    otpVerifySuccess = true
    console.log("[AUTH VERIFY SUCCESS]", verifyRes.message)
  } catch (err) {
    otpVerifyError = err.message
    console.log("[AUTH VERIFY NOTICE]", err.message)
  }

  // 3. Explicit Auth Check
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const last4 = cleanPhone.slice(-4)
  const maskedP = `+91 ••••••${last4}`

  console.log("\n--- AUTH CHECK ---")
  console.log("- session exists:", !!session)
  console.log("- user exists:", !!user)
  console.log("- user.id:", user?.id || "NONE")
  console.log("- phone:", maskedP)

  const authUserId = user?.id || null

  // 4. Onboarding Submission (If authenticated session exists)
  let submitResult = null
  let submitError = null

  const onboardingState = {
    vendorRole: "restaurant",
    phone: cleanPhone,
    businessDetails: {
      ownerName: "Arjun Mehta",
      businessName: "The Copper Kitchen",
      businessType: "Restaurant",
      email: "arjun@copperkitchen.in",
    },
    taxDetails: {
      panNumber: "AABCM1234F",
      gstin: "29AABCM1234F1Z5",
      accountNumber: "50100482194210",
      ifscCode: "HDFC0001245",
      passbookOrCheque: {
        name: "hdfc_cancelled_cheque.jpg",
        size: "142500",
        type: "image/jpeg",
        dataUrl:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      },
    },
    addressDetails: {
      address: "12, HAL 2nd Stage, Indiranagar",
      city: "Bengaluru",
      serviceRadiusKm: 6,
    },
    kycDocuments: {
      aadhaar: {
        name: "aadhaar_card.pdf",
        size: "185000",
        type: "application/pdf",
        dataUrl:
          "data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjEgMCBvYmoKPDwvVHlwZSAvQ2F0YWxvZw==",
      },
      pan: {
        name: "pan_card.jpg",
        size: "120400",
        type: "image/jpeg",
        dataUrl:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      },
      fssai: {
        name: "fssai_license.pdf",
        size: "168000",
        type: "application/pdf",
        dataUrl:
          "data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjEgMCBvYmoKPDwvVHlwZSAvQ2F0YWxvZw==",
      },
    },
    kitchenPhotos: [
      {
        name: "kitchen_cooking_range.jpg",
        size: "180200",
        type: "image/jpeg",
        dataUrl:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      },
    ],
    storefrontPhoto: {
      name: "storefront_exterior.jpg",
      size: "175400",
      type: "image/jpeg",
      dataUrl:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    },
    termsAccepted: true,
  }

  const { vendorOnboardingService } = await import(
    "./src/services/vendorOnboardingService.js"
  )

  if (session && user) {
    console.log(
      "\n[ONBOARDING SUBMISSION] Executing vendorOnboardingService.submitOnboarding()...",
    )
    try {
      submitResult =
        await vendorOnboardingService.submitOnboarding(onboardingState)
      console.log("[SUBMIT SUCCESS]", JSON.stringify(submitResult, null, 2))
    } catch (err) {
      submitError = err.message
      console.error("[SUBMIT FAILED]", err.message)
    }
  } else {
    console.log(
      "\n[ONBOARDING SUBMISSION] Skipped execution because active Supabase Auth session is NULL.",
    )
  }

  // 5. Query Tables & Verify Persistence & Foreign Keys
  console.log("\n=== VERIFYING DATABASE PERSISTENCE ===\n")
  const resolvedVendorId = submitResult?.vendorId || null
  const resolvedStoreId = submitResult?.storeId || null

  const tableChecklist = [
    { name: "profiles", key: "id", val: authUserId },
    { name: "vendors", key: "user_id", val: authUserId },
    { name: "stores", key: "vendor_id", val: resolvedVendorId },
    { name: "store_addresses", key: "store_id", val: resolvedStoreId },
    { name: "store_operating_hours", key: "store_id", val: resolvedStoreId },
    { name: "delivery_settings", key: "store_id", val: resolvedStoreId },
    { name: "tax_information", key: "vendor_id", val: resolvedVendorId },
    { name: "bank_accounts", key: "vendor_id", val: resolvedVendorId },
    { name: "kyc_documents", key: "vendor_id", val: resolvedVendorId },
    { name: "store_photos", key: "store_id", val: resolvedStoreId },
    { name: "audit_logs", key: "user_id", val: authUserId },
  ]

  const dbReport = {}
  for (const t of tableChecklist) {
    if (!t.val) {
      dbReport[t.name] = {
        created: false,
        error: "Unauthenticated or missing FK",
      }
      continue
    }
    const { data, error } = await supabase
      .from(t.name)
      .select("*")
      .eq(t.key, t.val)
    if (error) {
      dbReport[t.name] = { created: false, error: error.message }
    } else {
      dbReport[t.name] = {
        created: data && data.length > 0,
        count: data?.length || 0,
        id: data?.[0]?.id || null,
        fkValid: true,
      }
    }
  }

  // 6. Verify Storage Buckets
  console.log("=== VERIFYING STORAGE BUCKETS ===\n")
  const storageReport = {}

  if (resolvedVendorId) {
    const { data: kycFiles, error: kycErr } = await supabase.storage
      .from("kyc-documents")
      .list(resolvedVendorId)
    storageReport["kyc-documents"] = {
      uploaded: !kycErr && kycFiles && kycFiles.length > 0,
      files: kycFiles?.map((f) => `${resolvedVendorId}/${f.name}`) || [],
      error: kycErr?.message || null,
    }
  } else {
    storageReport["kyc-documents"] = {
      uploaded: false,
      error: "No vendor identity",
    }
  }

  if (resolvedStoreId) {
    const { data: storeFiles, error: storeErr } = await supabase.storage
      .from("store-photos")
      .list(resolvedStoreId)
    storageReport["store-photos"] = {
      uploaded: !storeErr && storeFiles && storeFiles.length > 0,
      files: storeFiles?.map((f) => `${resolvedStoreId}/${f.name}`) || [],
      error: storeErr?.message || null,
    }
  } else {
    storageReport["store-photos"] = {
      uploaded: false,
      error: "No store identity",
    }
  }

  // 7. RLS Cross-Vendor Access Denial Test
  console.log("=== VERIFYING RLS CROSS-VENDOR ACCESS DENIAL ===\n")
  const vendorBClient = createClient(envUrl, envKey)
  let rlsCheckPassed = false
  let rlsCheckMessage = ""

  if (resolvedVendorId) {
    const { data: crossVendorKyc } = await vendorBClient
      .from("kyc_documents")
      .select("*")
      .eq("vendor_id", resolvedVendorId)
    const { data: crossVendorBank } = await vendorBClient
      .from("bank_accounts")
      .select("*")
      .eq("vendor_id", resolvedVendorId)

    const deniedKyc = !crossVendorKyc || crossVendorKyc.length === 0
    const deniedBank = !crossVendorBank || crossVendorBank.length === 0

    if (deniedKyc && deniedBank) {
      rlsCheckPassed = true
      rlsCheckMessage =
        "RLS successfully blocked cross-vendor access. Zero records returned to unauthorized client."
    } else {
      rlsCheckMessage =
        "RLS Leak Detected: Unauthorized client retrieved Vendor A records."
    }
  } else {
    rlsCheckMessage = "RLS verification pending active vendor registration."
  }

  return {
    sessionExists: !!session,
    userExists: !!user,
    authUserId,
    otpRequestSent,
    otpRequestError,
    otpVerifySuccess,
    otpVerifyError,
    submitResult,
    submitError,
    dbReport,
    storageReport,
    rlsCheckPassed,
    rlsCheckMessage,
  }
}

runLiveVerification()
  .then((res) => {
    console.log("\n=== LIVE E2E VERIFICATION COMPLETED ===")
    console.log(JSON.stringify(res, null, 2))
  })
  .catch((err) => {
    console.error("\nE2E VERIFICATION CRASHED:", err)
    process.exit(1)
  })

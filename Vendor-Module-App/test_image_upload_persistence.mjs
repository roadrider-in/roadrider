import { readFileSync } from "fs"
import { resolve } from "path"

console.log("================================================================")
console.log("  TESTING IMAGE UPLOADS & DATA SYNCHRONIZATION PERSISTENCE      ")
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

const serviceSrc = readFileSync(
  resolve("src/services/vendorOnboardingService.js"),
  "utf-8",
)
const contextSrc = readFileSync(
  resolve("src/context/OnboardingContext.jsx"),
  "utf-8",
)
const uploaderSrc = readFileSync(
  resolve("src/components/common/DocumentUploader.jsx"),
  "utf-8",
)
const businessScreenSrc = readFileSync(
  resolve("src/screens/onboarding/BusinessDetailsScreen.jsx"),
  "utf-8",
)
const taxBankScreenSrc = readFileSync(
  resolve("src/screens/onboarding/TaxBankScreen.jsx"),
  "utf-8",
)
const addressScreenSrc = readFileSync(
  resolve("src/screens/onboarding/AddressRadiusScreen.jsx"),
  "utf-8",
)
const kycScreenSrc = readFileSync(
  resolve("src/screens/onboarding/KycDocumentsScreen.jsx"),
  "utf-8",
)
const photosScreenSrc = readFileSync(
  resolve("src/screens/onboarding/StorePhotosScreen.jsx"),
  "utf-8",
)
const storagePoliciesSrc = readFileSync(
  resolve("supabase/migrations/20260928000001_roadrider_storage_policies.sql"),
  "utf-8",
)

// -------------------------------------------------------------
// Suite 1: DocumentUploader Preview & Fallback Resilience
// -------------------------------------------------------------
console.log("--- Suite 1: DocumentUploader Rendering & Resilience ---")

assert(
  uploaderSrc.includes(
    "const imageUrl = document?.dataUrl || document?.signedUrl || document?.publicUrl || document?.url;",
  ),
  "DocumentUploader checks signedUrl, publicUrl, and url in addition to local dataUrl",
)

assert(
  uploaderSrc.includes(
    "const isUploaded = Boolean(document && (imageUrl || document.name || document.storagePath));",
  ),
  "DocumentUploader identifies uploaded state via storagePath or name even before signedUrl is attached",
)

assert(
  uploaderSrc.includes("onError={() => setImageLoadError(true)}"),
  "DocumentUploader handles broken or expired image URLs gracefully via onError handler",
)

assert(
  uploaderSrc.includes(
    "const isVerifiedUploaded = isUploaded && !imageLoadError;",
  ),
  "Missing or inaccessible files with load errors are not falsely shown as verified uploaded",
)

assert(
  uploaderSrc.includes("!imageLoadError ? (") &&
    uploaderSrc.includes("<AppIcon") &&
    (uploaderSrc.includes("name={isVerifiedUploaded ? 'check' : 'upload'}") ||
      uploaderSrc.includes("name={isUploaded ? 'check' : 'upload'}")),
  "DocumentUploader shows safe icon fallback without substituting hardcoded demo image",
)

assert(
  uploaderSrc.includes("isNewUpload: true"),
  "Newly selected files are explicitly tagged with isNewUpload: true to distinguish from restored DB images",
)

// -------------------------------------------------------------
// Suite 2: Storage Buckets, URL Generation & RLS Privacy
// -------------------------------------------------------------
console.log("\n--- Suite 2: Storage Buckets, Signed URLs & RLS Privacy ---")

assert(
  serviceSrc.includes(".from('kyc-documents')") &&
    serviceSrc.includes(".createSignedUrl(") &&
    serviceSrc.includes("3600"),
  "loadOnboardingState generates 1-hour signed URLs for private kyc-documents bucket",
)

assert(
  serviceSrc.includes(".from('store-photos')") &&
    serviceSrc.includes(".getPublicUrl("),
  "loadOnboardingState generates public URLs for public store-photos bucket",
)

assert(
  storagePoliciesSrc.includes("'kyc-documents'") &&
    storagePoliciesSrc.includes("false, -- STRICTLY PRIVATE") &&
    storagePoliciesSrc.includes("'store-photos'") &&
    storagePoliciesSrc.includes("true, -- PUBLIC"),
  "Database migration defines kyc-documents as strictly private and store-photos as public",
)

assert(
  storagePoliciesSrc.includes(
    "split_part(name, '/', 1) = public.get_current_vendor_id()::text",
  ) ||
    storagePoliciesSrc.includes("split_part(name, '/', 1) = auth.uid()::text"),
  "Storage RLS enforces vendor isolation on kyc-documents based on folder prefix",
)

// -------------------------------------------------------------
// Suite 3: OnboardingContext State Rehydration & Clearing Defaults
// -------------------------------------------------------------
console.log("\n--- Suite 3: OnboardingContext State Rehydration ---")

assert(
  contextSrc.includes("chequeDoc.signedUrl || chequeDoc.url") &&
    contextSrc.includes("storagePath: chequeDoc.storage_path"),
  "Cancelled cheque / passbook is rehydrated with storagePath and fresh signedUrl",
)

assert(
  contextSrc.includes("['aadhaar', 'pan', 'fssai', 'gst'].forEach((type) =>") &&
    contextSrc.includes("doc.signedUrl || doc.url") &&
    contextSrc.includes("storagePath: doc.storage_path"),
  "KYC documents (Aadhaar, PAN, FSSAI, GST) are rehydrated with storagePath and signedUrl",
)

assert(
  contextSrc.includes("p.photo_type === 'kitchen'") &&
    contextSrc.includes("publicUrl: photo.publicUrl || photo.url") &&
    contextSrc.includes("storagePath: photo.storage_path"),
  "Kitchen photos are rehydrated with storagePath and publicUrl",
)

assert(
  contextSrc.includes("setKitchenPhotos([null, null, null])"),
  "Mock kitchen photos are cleared to [null, null, null] if returning vendor has no saved kitchen photos",
)

assert(
  contextSrc.includes("p.photo_type === 'storefront'") &&
    contextSrc.includes("setStorefrontPhoto(null)"),
  "Storefront photo placeholder is cleared if returning vendor has no saved storefront photo",
)

assert(
  contextSrc.includes("p.photo_type === 'logo'") &&
    contextSrc.includes("setBusinessLogo(null)"),
  "Business logo placeholder is cleared if returning vendor has no saved logo",
)

assert(
  contextSrc.includes("const [vendorId, setVendorId] = useState(null);") &&
    contextSrc.includes("const [storeId, setStoreId] = useState(null);"),
  "OnboardingContext exposes authenticated vendorId and primary storeId for intermediate step persistence",
)

// -------------------------------------------------------------
// Suite 4: Step-by-Step Draft Persistence & Error Handling
// -------------------------------------------------------------
console.log("\n--- Suite 4: Intermediate Step Draft Persistence ---")

assert(
  businessScreenSrc.includes("vendorOnboardingService.saveBusinessDetails") &&
    businessScreenSrc.includes("loading={isSaving}") &&
    businessScreenSrc.includes("saveError"),
  "BusinessDetailsScreen saves to Supabase, displays loading state, and surfaces actionable errors",
)

assert(
  taxBankScreenSrc.includes("vendorOnboardingService.saveTaxAndBankDetails") &&
    taxBankScreenSrc.includes("passbookOrCheque: result.updatedCheque") &&
    taxBankScreenSrc.includes("loading={isSaving}"),
  "TaxBankScreen uploads bank proof, synchronizes confirmed cheque URL, and displays loading state",
)

assert(
  addressScreenSrc.includes("vendorOnboardingService.saveAddressAndDelivery") &&
    addressScreenSrc.includes("loading={isSaving}") &&
    addressScreenSrc.includes("saveError"),
  "AddressRadiusScreen saves address and radius to Supabase with loading and error states",
)

assert(
  kycScreenSrc.includes("vendorOnboardingService.saveKycDocuments") &&
    kycScreenSrc.includes("updateKycDoc(docKey, docData)") &&
    kycScreenSrc.includes("loading={isSaving}"),
  "KycDocumentsScreen uploads KYC files, saves metadata, and synchronizes confirmed signed URLs",
)

assert(
  photosScreenSrc.includes("vendorOnboardingService.saveStorePhotos") &&
    photosScreenSrc.includes("updateKitchenPhoto(idx, photo)") &&
    photosScreenSrc.includes("loading={isSaving}"),
  "StorePhotosScreen uploads store photos, saves metadata, and synchronizes confirmed public URLs",
)

// -------------------------------------------------------------
// Suite 5: Submission Safety & Preservation of Uploaded Files
// -------------------------------------------------------------
console.log("\n--- Suite 5: Submission Safety & Preservation ---")

assert(
  serviceSrc.includes(
    "const isNew = doc.isNewUpload || Boolean(doc.file) || (typeof doc.dataUrl === 'string' && doc.dataUrl.startsWith('data:'));",
  ) &&
    serviceSrc.includes(
      "const storagePath = isNew || !existingDoc?.storage_path",
    ),
  "submitOnboarding checks isNew flag to preserve already-uploaded KYC storage paths rather than overwriting",
)

assert(
  serviceSrc.includes(
    "const isNew = photo.isNewUpload || Boolean(photo.file) || (typeof photo.dataUrl === 'string' && photo.dataUrl.startsWith('data:'));",
  ) &&
    serviceSrc.includes(
      "const storagePath = isNew || !existingRecord?.storage_path",
    ),
  "submitOnboarding checks isNew flag to preserve already-uploaded store photos rather than overwriting",
)

assert(
  serviceSrc.includes(
    "if (!oldPath || typeof oldPath !== 'string' || oldPath === newPath) {",
  ) && serviceSrc.includes("return;"),
  "safeStorageCleanup returns immediately without deleting when oldPath matches newPath",
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

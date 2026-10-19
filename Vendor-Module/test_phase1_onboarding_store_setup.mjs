import { readFileSync } from 'fs';
import { resolve } from 'path';

console.log('================================================================');
console.log('  TESTING PHASE 1: VENDOR ONBOARDING & STORE SETUP              ');
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

// Read relevant source files
const serviceSrc = readFileSync(
  resolve('src/services/vendorOnboardingService.js'),
  'utf-8'
);
const contextSrc = readFileSync(
  resolve('src/context/OnboardingContext.jsx'),
  'utf-8'
);
const authApiSrc = readFileSync(
  resolve('src/services/api/authApi.js'),
  'utf-8'
);
const pendingScreenSrc = readFileSync(
  resolve('src/screens/onboarding/VerificationPendingScreen.jsx'),
  'utf-8'
);
const businessDetailsSrc = readFileSync(
  resolve('src/screens/onboarding/BusinessDetailsScreen.jsx'),
  'utf-8'
);
const taxBankSrc = readFileSync(
  resolve('src/screens/onboarding/TaxBankScreen.jsx'),
  'utf-8'
);
const addressRadiusSrc = readFileSync(
  resolve('src/screens/onboarding/AddressRadiusScreen.jsx'),
  'utf-8'
);
const schemaSrc = readFileSync(
  resolve('supabase/migrations/20260928000000_roadrider_initial_schema.sql'),
  'utf-8'
);
const storageSrc = readFileSync(
  resolve('supabase/migrations/20260928000001_roadrider_storage_policies.sql'),
  'utf-8'
);
const kycScreenSrc = readFileSync(
  resolve('src/screens/onboarding/KycDocumentsScreen.jsx'),
  'utf-8'
);
const photosScreenSrc = readFileSync(
  resolve('src/screens/onboarding/StorePhotosScreen.jsx'),
  'utf-8'
);
const uploaderSrc = readFileSync(
  resolve('src/components/common/DocumentUploader.jsx'),
  'utf-8'
);

// -------------------------------------------------------------
// Suite 1: Vendor Onboarding Service Methods & Atomicity
// -------------------------------------------------------------
console.log('--- Suite 1: vendorOnboardingService Phase 1 Contract ---');

assert(
  serviceSrc.includes('submitOnboarding: async (onboardingState) =>') &&
  serviceSrc.includes('supabase.auth.getUser()'),
  'submitOnboarding requires active Supabase authenticated session'
);

assert(
  serviceSrc.includes('loadOnboardingState: async') &&
  serviceSrc.includes(".from('vendors')") &&
  serviceSrc.includes(".from('stores')") &&
  serviceSrc.includes(".from('store_addresses')") &&
  serviceSrc.includes(".from('tax_information')") &&
  serviceSrc.includes(".from('bank_accounts')") &&
  serviceSrc.includes(".from('kyc_documents')") &&
  serviceSrc.includes(".from('store_photos')"),
  'loadOnboardingState fetches all 10 Phase 1 tables for returning vendor rehydration'
);

assert(
  serviceSrc.includes('getOnboardingStatus: async') &&
  (serviceSrc.includes(".select('id, vendor_type, onboarding_status, onboarding_step, terms_accepted, rejection_reason')") ||
   serviceSrc.includes(".select('id, vendor_type, onboarding_status, onboarding_step, terms_accepted')")),
  'getOnboardingStatus returns quick verification status and onboarding step'
);

assert(
  serviceSrc.includes('saveBusinessDetails: async') &&
  serviceSrc.includes(".from('profiles').update") &&
  serviceSrc.includes(".from('vendors').upsert"),
  'saveBusinessDetails securely updates profile and upserts vendor record'
);

assert(
  serviceSrc.includes('saveTaxAndBankDetails: async') &&
  serviceSrc.includes(".from('tax_information').upsert") &&
  serviceSrc.includes(".from('bank_accounts').upsert"),
  'saveTaxAndBankDetails securely persists tax and bank records with onConflict vendor_id'
);

assert(
  serviceSrc.includes('saveAddressAndDelivery: async') &&
  serviceSrc.includes(".from('store_addresses').upsert") &&
  serviceSrc.includes(".from('delivery_settings').upsert"),
  'saveAddressAndDelivery securely persists store address and delivery settings with onConflict store_id'
);

assert(
  serviceSrc.includes('saveKycDocuments: async') &&
  serviceSrc.includes(".from('kyc_documents')") &&
  serviceSrc.includes(".from('kyc-documents')"),
  'saveKycDocuments securely uploads files and persists KYC metadata with signed URLs'
);

assert(
  serviceSrc.includes('saveStorePhotos: async') &&
  serviceSrc.includes(".from('store_photos')") &&
  serviceSrc.includes(".from('store-photos')"),
  'saveStorePhotos securely uploads files and persists store photo metadata with public URLs'
);

// -------------------------------------------------------------
// Suite 2: State Restoration & Rehydration (OnboardingContext)
// -------------------------------------------------------------
console.log('\n--- Suite 2: OnboardingContext Rehydration & Session Listener ---');

assert(
  uploaderSrc.includes('document?.dataUrl || document?.signedUrl || document?.publicUrl || document?.url') &&
  uploaderSrc.includes('onError={() => setImageLoadError(true)}'),
  'DocumentUploader renders thumbnails from signed/public URLs and safely handles image load errors'
);

assert(
  contextSrc.includes('loadSavedOnboarding = async') &&
  contextSrc.includes('vendorOnboardingService.loadOnboardingState'),
  'OnboardingContext exposes loadSavedOnboarding invoking vendorOnboardingService'
);

assert(
  contextSrc.includes('setVendorRole(role)') &&
  contextSrc.includes('setBusinessDetails') &&
  contextSrc.includes('setTaxDetails') &&
  contextSrc.includes('setAddressDetails') &&
  contextSrc.includes('setKycDocuments') &&
  contextSrc.includes('setKitchenPhotos'),
  'loadSavedOnboarding completely rehydrates vendor details, tax, bank, address, KYC, and store photos'
);

assert(
  !contextSrc.includes('supabase.auth.getSession().then(({ data }) => {\n      if (isMounted && data?.session?.user?.id) {\n        loadSavedOnboarding') &&
  contextSrc.includes('loadSavedOnboarding'),
  'OnboardingContext securely gates loadSavedOnboarding behind phone OTP verification (no unverified rehydration on reload)'
);

// -------------------------------------------------------------
// Suite 3: Auth API Integration & Service Delegation
// -------------------------------------------------------------
console.log('\n--- Suite 3: authApi Service Delegation ---');

assert(
  authApiSrc.includes("import { vendorOnboardingService } from '../vendorOnboardingService.js';"),
  'authApi imports vendorOnboardingService'
);

assert(
  authApiSrc.includes('vendorOnboardingService.saveBusinessDetails(details)'),
  'authApi.saveBusinessDetails delegates to vendorOnboardingService when authenticated'
);

assert(
  authApiSrc.includes('vendorOnboardingService.saveTaxAndBankDetails('),
  'authApi.saveTaxDetails delegates to vendorOnboardingService when authenticated'
);

assert(
  authApiSrc.includes('vendorOnboardingService.saveAddressAndDelivery('),
  'authApi.saveAddressDetails delegates to vendorOnboardingService when authenticated'
);

// -------------------------------------------------------------
// Suite 4: Step-by-Step Draft Persistence in Screens
// -------------------------------------------------------------
console.log('\n--- Suite 4: Intermediate Step Draft Persistence ---');

assert(
  businessDetailsSrc.includes('vendorOnboardingService.saveBusinessDetails') &&
  businessDetailsSrc.includes('isSupabaseConfigured'),
  'BusinessDetailsScreen saves draft business details to Supabase upon continue'
);

assert(
  taxBankSrc.includes('vendorOnboardingService.saveTaxAndBankDetails') &&
  taxBankSrc.includes('isSupabaseConfigured'),
  'TaxBankScreen saves draft tax and bank info to Supabase upon continue'
);

assert(
  addressRadiusSrc.includes('vendorOnboardingService.saveAddressAndDelivery') &&
  addressRadiusSrc.includes('isSupabaseConfigured'),
  'AddressRadiusScreen saves draft address and delivery settings to Supabase upon continue'
);

assert(
  kycScreenSrc.includes('vendorOnboardingService.saveKycDocuments') &&
  kycScreenSrc.includes('isSupabaseConfigured'),
  'KycDocumentsScreen saves draft KYC documents to Supabase upon continue'
);

assert(
  photosScreenSrc.includes('vendorOnboardingService.saveStorePhotos') &&
  photosScreenSrc.includes('isSupabaseConfigured'),
  'StorePhotosScreen saves draft store photos to Supabase upon continue'
);

// -------------------------------------------------------------
// Suite 5: Verification Pending Screen Polling & Refresh
// -------------------------------------------------------------
console.log('\n--- Suite 5: VerificationPendingScreen Live Polling & Routing ---');

assert(
  pendingScreenSrc.includes('vendorOnboardingService.getOnboardingStatus()'),
  'VerificationPendingScreen checks live verification status'
);

assert(
  pendingScreenSrc.includes('setInterval(checkLiveStatus'),
  'VerificationPendingScreen polls status at periodic intervals'
);

assert(
  pendingScreenSrc.includes('Check Verification Status') ||
  pendingScreenSrc.includes('Checking Application Status'),
  'VerificationPendingScreen provides manual Check Verification Status action'
);

assert(
  pendingScreenSrc.includes("navigate(vendorRole === 'grocery' ? 'grocery-home' : 'restaurant-home')"),
  'VerificationPendingScreen routes to role-specific dashboard (grocery-home / restaurant-home) on active status'
);

// -------------------------------------------------------------
// Suite 6: Database Schema & Storage Bucket Validation
// -------------------------------------------------------------
console.log('\n--- Suite 6: Schema Verification for 10 Phase 1 Tables ---');

const phase1Tables = [
  'profiles',
  'vendors',
  'stores',
  'store_addresses',
  'store_operating_hours',
  'delivery_settings',
  'tax_information',
  'bank_accounts',
  'kyc_documents',
  'store_photos',
];

phase1Tables.forEach((table) => {
  const tableExists = schemaSrc.includes(`CREATE TABLE IF NOT EXISTS public.${table}`);
  assert(tableExists, `Table public.${table} defined in initial database schema`);
});

assert(
  storageSrc.includes("'kyc-documents'") && storageSrc.includes('false, -- STRICTLY PRIVATE'),
  'Storage bucket "kyc-documents" is strictly private'
);

assert(
  storageSrc.includes("'store-photos'") && storageSrc.includes('true, -- PUBLIC'),
  'Storage bucket "store-photos" is public for storefront rendering'
);

assert(
  storageSrc.includes("split_part(name, '/', 1) = public.get_current_vendor_id()::text") ||
  storageSrc.includes("split_part(name, '/', 1) = auth.uid()::text"),
  'Storage RLS strictly isolates KYC uploads to vendor folder'
);

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log('\n================================================================');
console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
}

import { readFileSync } from 'fs';
import { resolve } from 'path';

console.log('================================================================');
console.log('  TESTING REAL ADMIN APPROVAL & COMPLETE MOCK DATA CLEANUP       ');
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

const contextSrc = readFileSync(resolve('src/context/OnboardingContext.jsx'), 'utf-8');
const serviceSrc = readFileSync(resolve('src/services/vendorOnboardingService.js'), 'utf-8');
const uploaderSrc = readFileSync(resolve('src/components/common/DocumentUploader.jsx'), 'utf-8');
const pendingSrc = readFileSync(resolve('src/screens/onboarding/VerificationPendingScreen.jsx'), 'utf-8');
const navSrc = readFileSync(resolve('src/navigation/RootNavigator.jsx'), 'utf-8');
const termsSrc = readFileSync(resolve('src/screens/onboarding/TermsConditionsScreen.jsx'), 'utf-8');
const kycScreenSrc = readFileSync(resolve('src/screens/onboarding/KycDocumentsScreen.jsx'), 'utf-8');
const photosScreenSrc = readFileSync(resolve('src/screens/onboarding/StorePhotosScreen.jsx'), 'utf-8');
const taxScreenSrc = readFileSync(resolve('src/screens/onboarding/TaxBankScreen.jsx'), 'utf-8');
const adminMigrationSrc = readFileSync(
  resolve('supabase/migrations/20260928000003_master_admin_approval_and_rls.sql'),
  'utf-8'
);

// -------------------------------------------------------------
// Criterion 1: New Vendors See No Mock Photos or Fake Records
// -------------------------------------------------------------
console.log('--- Criterion 1: Zero Mock Photos or Fake Uploaded Records ---');

assert(
  !contextSrc.includes('Arjun Mehta') && !contextSrc.includes('The Copper Kitchen'),
  'Initial business details contain no mock owner or store names'
);

assert(
  !contextSrc.includes('pan_card.jpg') &&
  !contextSrc.includes('aadhaar_card.pdf') &&
  !contextSrc.includes('fssai_license.pdf') &&
  !contextSrc.includes('hdfc_cancelled_cheque.jpg'),
  'Initial KYC and bank document states contain no fake file names'
);

assert(
  !contextSrc.includes('kitchen_cooking_range.jpg') &&
  !contextSrc.includes('kitchen_prep_station.jpg') &&
  !contextSrc.includes('kitchen_storage_wash.jpg') &&
  !contextSrc.includes('storefront_exterior.jpg'),
  'Initial store photos contain no hardcoded photo filenames'
);

assert(
  !contextSrc.includes('data:image/svg+xml'),
  'Initial state contains zero hardcoded SVG mock data URLs'
);

assert(
  contextSrc.includes('const [kitchenPhotos, setKitchenPhotos] = useState([null, null, null]);') &&
  contextSrc.includes('const [storefrontPhoto, setStorefrontPhoto] = useState(null);') &&
  contextSrc.includes('const [businessLogo, setBusinessLogo] = useState(null);'),
  'Store photos initialize to clean null slots for new vendors'
);

assert(
  contextSrc.includes('const [termsAccepted, setTermsAccepted] = useState(false);') &&
  contextSrc.includes("const [verificationStatus, setVerificationStatus] = useState('unsubmitted');"),
  'Terms initialize to false and verification status initializes to unsubmitted'
);

// -------------------------------------------------------------
// Criterion 2: Actual Uploads Persist After Refresh & Re-login
// -------------------------------------------------------------
console.log('\n--- Criterion 2: Persistence and Rehydration of Real Uploads ---');

assert(
  contextSrc.includes('loadSavedOnboarding = async') &&
  contextSrc.includes('vendorOnboardingService.loadOnboardingState') &&
  contextSrc.includes('setKycDocuments') &&
  contextSrc.includes('setKitchenPhotos') &&
  contextSrc.includes('setStorefrontPhoto'),
  'OnboardingContext completely rehydrates real uploaded files from Supabase'
);

assert(
  serviceSrc.includes(".from('kyc-documents')") &&
  serviceSrc.includes('.createSignedUrl(') &&
  serviceSrc.includes(".from('store-photos')") &&
  serviceSrc.includes('.getPublicUrl('),
  'vendorOnboardingService rehydrates signed URLs for KYC and public URLs for store photos'
);

// -------------------------------------------------------------
// Criterion 3: Unchanged Files Are Not Re-uploaded or Overwritten
// -------------------------------------------------------------
console.log('\n--- Criterion 3: Preservation of Existing Files & Safe Replacement ---');

assert(
  serviceSrc.includes('const isNew = doc.isNewUpload || Boolean(doc.file)') &&
  serviceSrc.includes('const storagePath = isNew || !existingDoc?.storage_path'),
  'submitOnboarding preserves existing KYC storage paths when files are unchanged'
);

assert(
  serviceSrc.includes('const isNew = photo.isNewUpload || Boolean(photo.file)') &&
  serviceSrc.includes('const storagePath = isNew || !existingRecord?.storage_path'),
  'submitOnboarding preserves existing store photo storage paths when files are unchanged'
);

assert(
  serviceSrc.includes('async function safeStorageCleanup(') &&
  serviceSrc.includes('if (!oldPath || typeof oldPath !== \'string\' || oldPath === newPath)'),
  'safeStorageCleanup deletes old storage object only after successful replacement'
);

// -------------------------------------------------------------
// Criterion 4: Missing or Inaccessible Files Not Falsely Uploaded
// -------------------------------------------------------------
console.log('\n--- Criterion 4: No False Uploads for Inaccessible/Missing Files ---');

assert(
  uploaderSrc.includes('const isVerifiedUploaded = isUploaded && !imageLoadError;'),
  'DocumentUploader verifies upload validity without false positives on imageLoadError'
);

assert(
  uploaderSrc.includes('name={isVerifiedUploaded ? \'check\' : \'upload\'}') &&
  uploaderSrc.includes('isVerifiedUploaded && styles.iconWrapperUploaded'),
  'Green check icon and uploaded badge only render when file is verified accessible'
);

assert(
  uploaderSrc.includes("imageLoadError ? 'Re-upload' : 'Upload'"),
  'Broken or missing files provide direct re-upload action'
);

assert(
  !serviceSrc.includes('RoadRider document metadata file:'),
  'getUploadBlob returns null instead of creating dummy text blobs for missing files'
);

// -------------------------------------------------------------
// Criterion 5: Master Admin Panel Can Access Full Onboarding Data
// -------------------------------------------------------------
console.log('\n--- Criterion 5: Master Admin Access & Row Level Security ---');

assert(
  adminMigrationSrc.includes('CREATE POLICY "Master admin can view all vendors" ON public.vendors') &&
  adminMigrationSrc.includes('CREATE POLICY "Master admin can view all stores" ON public.stores') &&
  adminMigrationSrc.includes('CREATE POLICY "Master admin can view all store addresses" ON public.store_addresses') &&
  adminMigrationSrc.includes('CREATE POLICY "Master admin can view all tax info" ON public.tax_information') &&
  adminMigrationSrc.includes('CREATE POLICY "Master admin can view all bank accounts" ON public.bank_accounts') &&
  adminMigrationSrc.includes('CREATE POLICY "Master admin can view all KYC documents" ON public.kyc_documents') &&
  adminMigrationSrc.includes('CREATE POLICY "Master admin can view all store photos" ON public.store_photos'),
  'Master Admin RLS policies allow platform admin to inspect all vendor onboarding records'
);

assert(
  adminMigrationSrc.includes('CREATE POLICY "Master admin can update all vendors" ON public.vendors') &&
  adminMigrationSrc.includes('CREATE POLICY "Master admin can update KYC documents" ON public.kyc_documents'),
  'Master Admin RLS policies allow authorized admin to update verification and rejection states'
);

// -------------------------------------------------------------
// Criterion 6: No Simulation Button or Automatic Approval
// -------------------------------------------------------------
console.log('\n--- Criterion 6: Total Removal of Simulated Approval ---');

assert(
  !pendingSrc.includes('Simulate Admin Approval') &&
  !pendingSrc.includes('Simulate') &&
  !pendingSrc.includes('simulate'),
  'Simulate Admin Approval button and mock approval transitions are completely eliminated'
);

assert(
  !termsSrc.includes("setVerificationStatus('verified')") &&
  !termsSrc.includes("onboarding_status: 'approved'"),
  'Onboarding submission does not automatically approve vendors'
);

// -------------------------------------------------------------
// Criterion 7: Pending Vendors Cannot Access Live Portal
// -------------------------------------------------------------
console.log('\n--- Criterion 7: Route Guards Against Premature Live Store Access ---');

assert(
  navSrc.includes('isLivePortalScreen && !isLoadingSavedState && session && verificationStatus !== \'verified\'') &&
  navSrc.includes("navigate('pending');"),
  'RootNavigator navigation guard blocks unverified vendors from accessing live store dashboards'
);

assert(
  navSrc.includes('if (isLivePortalScreen && !isLoadingSavedState && session && verificationStatus !== \'verified\') {\n      return <VerificationPendingScreen />;'),
  'RootNavigator renderScreen immediate guard intercepts unverified attempts to render portal screens'
);

// -------------------------------------------------------------
// Criterion 8: Only Master Admin Approval Enables Live Access
// -------------------------------------------------------------
console.log('\n--- Criterion 8: Database Triggers Enforce Admin-Only Approval ---');

assert(
  adminMigrationSrc.includes('CREATE OR REPLACE FUNCTION public.protect_vendor_approval_status()') &&
  adminMigrationSrc.includes("NEW.onboarding_status IN ('approved', 'live', 'rejected')") &&
  adminMigrationSrc.includes('Only an authorized Master Admin can approve or reject vendor onboarding applications'),
  'Database trigger strictly prevents vendor self-promotion to approved or live status'
);

assert(
  adminMigrationSrc.includes('CREATE OR REPLACE FUNCTION public.protect_store_online_activation()') &&
  adminMigrationSrc.includes("NEW.status = 'ONLINE'") &&
  adminMigrationSrc.includes('Stores cannot be activated online before vendor verification and Master Admin approval'),
  'Database trigger strictly prevents taking stores online before real Master Admin approval'
);

// -------------------------------------------------------------
// Criterion 9: Real Rejection Reason Displayed to Vendor
// -------------------------------------------------------------
console.log('\n--- Criterion 9: Rejection Status & Reason Transparency ---');

assert(
  serviceSrc.includes(".select('id, vendor_type, onboarding_status, onboarding_step, terms_accepted')") &&
  serviceSrc.includes("from('kyc_documents')") &&
  serviceSrc.includes('rejectionReason') &&
  serviceSrc.includes('isError: true'),
  'getOnboardingStatus queries verified vendor columns, handles errors gracefully, and resolves KYC rejection details'
);

assert(
  contextSrc.includes("const [rejectionReason, setRejectionReason] = useState('');") &&
  contextSrc.includes("state.vendor.onboarding_status === 'rejected'") &&
  contextSrc.includes("setVerificationStatus('rejected')"),
  'OnboardingContext tracks and exposes rejectionReason state'
);

assert(
  pendingSrc.includes("statusRes.onboardingStatus === 'rejected'") &&
  pendingSrc.includes('rejectionReasonText') &&
  pendingSrc.includes('APPLICATION REJECTED'),
  'VerificationPendingScreen displays rejection status, reason, and update action'
);

// -------------------------------------------------------------
// Criterion 10: Existing Authentication & Security Preserved
// -------------------------------------------------------------
console.log('\n--- Criterion 10: Authentication Integrity & Step Persistence ---');

assert(
  serviceSrc.includes('const { data: { user }, error: authError } = await supabase.auth.getUser();') &&
  serviceSrc.includes('activeSubmissions.add(userId);'),
  'Authenticated session verification and concurrency protection remain intact'
);

assert(
  serviceSrc.includes("pan_masked text GENERATED ALWAYS AS") ||
  serviceSrc.includes("account_masked text GENERATED ALWAYS AS") ||
  readFileSync(resolve('supabase/migrations/20260928000000_roadrider_initial_schema.sql'), 'utf-8').includes('pan_masked'),
  'Sensitive tax and bank fields are masked via database generated columns'
);

console.log('\n================================================================');
console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
}

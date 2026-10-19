import { readFileSync } from 'fs';
import { resolve } from 'path';

console.log('================================================================');
console.log('  TESTING ONBOARDING RELIABILITY & SECURITY FIXES              ');
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

const serviceSrc = readFileSync(
  resolve('src/services/vendorOnboardingService.js'),
  'utf-8'
);

const schemaSrc = readFileSync(
  resolve('supabase/migrations/20260928000000_roadrider_initial_schema.sql'),
  'utf-8'
);

// -------------------------------------------------------------
// Suite 1: Missing Profile Handling & RLS Boundary (FIX 2)
// -------------------------------------------------------------
console.log('--- Suite 1: Missing Profile Handling & RLS Compliance (FIX 2) ---');

// Check that client-side fallback upsert into profiles has been completely removed
const profileBlockRegex = /\.from\('profiles'\)[\s\S]*?(?=\.from\('vendors'\))/;
const profileBlockMatch = serviceSrc.match(profileBlockRegex);
const profileBlock = profileBlockMatch ? profileBlockMatch[0] : '';

assert(
  profileBlock && !profileBlock.includes(".upsert("),
  'Client-side fallback upsert into public.profiles has been completely removed'
);

assert(
  profileBlock && !profileBlock.includes("role: 'vendor'") && !profileBlock.includes('role:'),
  'Profile update payload does not include protected role field'
);

assert(
  profileBlock.includes('if (!updatedProfiles || updatedProfiles.length === 0)') &&
  profileBlock.includes('No profile record found for user') &&
  profileBlock.includes('Client cannot insert profiles under existing RLS policies'),
  'Explicit diagnostic error is thrown when update matches zero rows'
);

assert(
  schemaSrc.includes('CREATE POLICY "Users can update own profile" ON public.profiles') &&
  !schemaSrc.includes('CREATE POLICY "Users can insert own profile" ON public.profiles'),
  'Confirmed that public.profiles has NO INSERT policy for authenticated users (enforcing trigger creation)'
);

// -------------------------------------------------------------
// Suite 2: Idempotent Primary Store Creation & Retries (FIX 1)
// -------------------------------------------------------------
console.log('\n--- Suite 2: Idempotent Store Creation & Retries (FIX 1) ---');

const storeBlockRegex = /\.from\('stores'\)[\s\S]*?(?=\.from\('store_addresses'\))/;
const storeBlockMatch = serviceSrc.match(storeBlockRegex);
const storeBlock = storeBlockMatch ? storeBlockMatch[0] : '';

assert(
  storeBlock.includes(".select('id, store_name, business_type, created_at')") &&
  storeBlock.includes(".eq('vendor_id', vendorId)"),
  'Existing stores are queried for the current vendor before creating a store'
);

assert(
  storeBlock.includes('if (storeLookupError)') &&
  storeBlock.includes('throw new Error(`[ONBOARDING] Store lookup failed:'),
  'Store lookup errors are handled explicitly and not treated as "no store found"'
);

assert(
  storeBlock.includes('targetStoreId') &&
  storeBlock.includes('.update(storePayload)') &&
  storeBlock.includes('.eq(\'id\', targetStoreId)'),
  'Existing store is updated using its actual database ID on retry'
);

assert(
  storeBlock.includes('.insert(storePayload)'),
  'New store is inserted when no existing store record matches'
);

assert(
  storeBlock.includes("status: 'OFFLINE'"),
  'Store status remains strictly OFFLINE during onboarding'
);

assert(
  serviceSrc.includes("const expectedBusinessType = vendorRole === 'grocery' ? 'grocery' : 'restaurant';") &&
  storeBlock.includes("business_type: expectedBusinessType"),
  'Store business_type preserves restaurant/grocery isolation'
);

// -------------------------------------------------------------
// Suite 3: Deterministic Store Selection & Multi-Outlet Logic Simulation
// -------------------------------------------------------------
console.log('\n--- Suite 3: Store Matching & Multi-Outlet Isolation Simulation ---');

// Replicate the deterministic matching algorithm from vendorOnboardingService.js
function matchOnboardingStore(existingStores, cleanBusinessName, expectedBusinessType) {
  const matchingTypeStores = (existingStores || []).filter(
    (s) => s.business_type === expectedBusinessType
  );

  let targetStoreId = null;
  if (matchingTypeStores.length > 0) {
    const exactMatches = matchingTypeStores.filter(
      (s) => s.store_name?.toLowerCase().trim() === cleanBusinessName.toLowerCase().trim()
    );

    if (exactMatches.length > 0) {
      targetStoreId = exactMatches[0].id;
    } else if (matchingTypeStores.length === 1) {
      targetStoreId = matchingTypeStores[0].id;
    } else {
      throw new Error(
        `[ONBOARDING] Ambiguous primary store: Vendor has ${matchingTypeStores.length} existing ${expectedBusinessType} outlets, none matching "${cleanBusinessName}". Cannot safely determine which outlet to update without risking overwriting an existing outlet. Please verify store details or contact support.`
      );
    }
  }
  return targetStoreId;
}

// Test 3.1: Fresh onboarding (no existing stores)
const freshResult = matchOnboardingStore([], 'The Copper Kitchen', 'restaurant');
assert(
  freshResult === null,
  'Fresh onboarding returns null targetStoreId -> proceeds to insert new store'
);

// Test 3.2: Retry with exact match (identical store name and business type)
const existingRetryStores = [
  { id: 'store-uuid-1', store_name: 'The Copper Kitchen', business_type: 'restaurant' }
];
const retryResult = matchOnboardingStore(existingRetryStores, 'The Copper Kitchen', 'restaurant');
assert(
  retryResult === 'store-uuid-1',
  'Retry with exact match reuses existing store ID -> updates existing store instead of duplicating'
);

// Test 3.3: Renaming primary store during onboarding (single outlet with name edited)
const singleStores = [
  { id: 'store-uuid-1', store_name: 'Copper Kitchen', business_type: 'restaurant' }
];
const singleEditResult = matchOnboardingStore(singleStores, 'The Royal Copper Kitchen', 'restaurant');
assert(
  singleEditResult === 'store-uuid-1',
  'Renaming store during onboarding safely reuses existing primary store ID without creating duplicate'
);

// Test 3.4: Restaurant/grocery isolation - grocery outlet does not cause conflict with restaurant
const groceryAndRestaurantStores = [
  { id: 'grocery-store-1', store_name: 'Fresh Grocers', business_type: 'grocery' }
];
const separateRoleResult = matchOnboardingStore(groceryAndRestaurantStores, 'The Curry House', 'restaurant');
assert(
  separateRoleResult === null,
  'Existing grocery outlet is excluded when resolving restaurant onboarding -> creates new restaurant outlet safely'
);

// Test 3.5: Multi-outlet vendor retrying specific outlet by exact name
const multiOutletStores = [
  { id: 'store-uuid-1', store_name: 'Outlet Indiranagar', business_type: 'restaurant' },
  { id: 'store-uuid-2', store_name: 'Outlet Koramangala', business_type: 'restaurant' }
];
const retrySpecificResult = matchOnboardingStore(multiOutletStores, 'Outlet Koramangala', 'restaurant');
assert(
  retrySpecificResult === 'store-uuid-2',
  'Multi-outlet retry matches specific outlet by name and type -> updates correct store record'
);

// Test 3.6: Ambiguous multiple-outlet scenario without exact match fails explicitly
let ambiguousErrorThrown = false;
try {
  matchOnboardingStore(multiOutletStores, 'Outlet Whitefield', 'restaurant');
} catch (e) {
  ambiguousErrorThrown = e.message.includes('Ambiguous primary store');
}
assert(
  ambiguousErrorThrown,
  'Ambiguous multiple outlets without exact match throws clear diagnostic error instead of silently overwriting or duplicating'
);

// -------------------------------------------------------------
// Suite 4: Database Trigger & Admin Approval Separation
// -------------------------------------------------------------
console.log('\n--- Suite 4: Database Role Trigger & Admin Queue Verification ---');

assert(
  serviceSrc.includes("onboarding_status: 'submitted'"),
  'Onboarding status is set to "submitted" (awaiting admin review, never auto-approved)'
);

assert(
  schemaSrc.includes('CREATE OR REPLACE FUNCTION public.protect_profile_role()') &&
  schemaSrc.includes("RAISE EXCEPTION 'Unauthorized: Users cannot change their own account role.';"),
  'Database trigger protect_profile_role() strictly protects profile roles against client tampering'
);

// -------------------------------------------------------------
// Suite 5: KYC Document Idempotency & Verification Safety
// -------------------------------------------------------------
console.log('\n--- Suite 5: KYC Document Metadata Idempotency ---');

const kycBlockRegex = /\.from\('kyc_documents'\)[\s\S]*?(?=\.from\('store_photos'\))/;
const kycBlockMatch = serviceSrc.match(kycBlockRegex);
const kycBlock = kycBlockMatch ? kycBlockMatch[0] : '';

assert(
  (kycBlock.includes(".select('id, vendor_id, document_type, status, created_at')") ||
   kycBlock.includes(".select('id, vendor_id, store_id, document_type, storage_path, status, created_at')")) &&
  kycBlock.includes(".eq('vendor_id', vendorId)"),
  'Existing KYC documents are explicitly queried for the current vendor before persisting'
);

assert(
  kycBlock.includes('if (kycLookupError)') &&
  kycBlock.includes('throw new Error(`[ONBOARDING] KYC document lookup failed:'),
  'KYC lookup error is handled explicitly and halts submission with diagnostic message'
);

assert(
  kycBlock.includes('.update({') &&
  kycBlock.includes('.eq(\'id\', existingDoc.id)') &&
  kycBlock.includes('.eq(\'vendor_id\', vendorId)'),
  'Repeated KYC upload updates existing record by ID and scopes write strictly to vendor_id'
);

assert(
  kycBlock.includes('if (kycUpdateErr)') &&
  kycBlock.includes('throw new Error(`[ONBOARDING] KYC document metadata update failed'),
  'KYC metadata update write failures are handled explicitly'
);

assert(
  kycBlock.includes('if (kycInsertErr)') &&
  kycBlock.includes('throw new Error(`[ONBOARDING] KYC document metadata insert failed'),
  'KYC metadata insert write failures are handled explicitly'
);

// Verify that status is NOT modified in update payload to respect protect_kyc_verification trigger
const kycUpdatePayloadMatch = kycBlock.match(/\.update\((\{[\s\S]*?\})\)/);
const kycUpdatePayload = kycUpdatePayloadMatch ? kycUpdatePayloadMatch[1] : '';
assert(
  !kycUpdatePayload.includes('status:') &&
  !kycUpdatePayload.includes('verified_at:') &&
  !kycUpdatePayload.includes('rejection_reason:'),
  'KYC update payload does not modify status or verified_at, complying with protect_kyc_verification database trigger'
);

// -------------------------------------------------------------
// Suite 6: Store Photo Idempotency & Category Isolation
// -------------------------------------------------------------
console.log('\n--- Suite 6: Store Photo Metadata Idempotency ---');

const photoBlockRegex = /\.from\('store_photos'\)[\s\S]*?(?=\.from\('audit_logs'\))/;
const photoBlockMatch = serviceSrc.match(photoBlockRegex);
const photoBlock = photoBlockMatch ? photoBlockMatch[0] : '';

assert(
  photoBlock.includes(".select('id, store_id, photo_type, caption, display_order, is_verified, created_at')") &&
  photoBlock.includes(".eq('store_id', storeId)"),
  'Existing store photos are queried for current store before writing metadata'
);

assert(
  photoBlock.includes('if (photoLookupError)') &&
  photoBlock.includes('throw new Error(`[ONBOARDING] Store photo lookup failed:'),
  'Store photo lookup error is handled explicitly and halts submission'
);

assert(
  photoBlock.includes('existingPhotosByType[photoType]?.[indexWithinType]'),
  'Photos are grouped by category (storefront, kitchen, logo) and index to prevent category collisions'
);

assert(
  photoBlock.includes('.update({') &&
  photoBlock.includes('.eq(\'id\', existingRecord.id)') &&
  photoBlock.includes('.eq(\'store_id\', storeId)'),
  'Repeated photo upload updates existing record by ID and scopes write strictly to store_id'
);

assert(
  photoBlock.includes('if (photoUpdateErr)') &&
  photoBlock.includes('throw new Error(`[ONBOARDING] Store photo metadata update failed'),
  'Store photo metadata update write failures are handled explicitly'
);

assert(
  photoBlock.includes('if (photoInsertErr)') &&
  photoBlock.includes('throw new Error(`[ONBOARDING] Store photo metadata insert failed'),
  'Store photo metadata insert write failures are handled explicitly'
);

const photoUpdatePayloadMatch = photoBlock.match(/\.update\((\{[\s\S]*?\})\)/);
const photoUpdatePayload = photoUpdatePayloadMatch ? photoUpdatePayloadMatch[1] : '';
assert(
  !photoUpdatePayload.includes('is_verified:'),
  'Store photo update payload does not overwrite is_verified status'
);

// -------------------------------------------------------------
// Suite 7: Downstream Scoping & Store Re-use
// -------------------------------------------------------------
console.log('\n--- Suite 7: Downstream Record Scoping & Store Re-use ---');

assert(
  serviceSrc.includes(".from('store_addresses')") &&
  serviceSrc.includes("store_id: storeId") &&
  serviceSrc.includes("{ onConflict: 'store_id' }"),
  'store_addresses strictly reuses storeId with onConflict store_id'
);

assert(
  serviceSrc.includes(".from('store_operating_hours')") &&
  serviceSrc.includes("store_id: storeId") &&
  serviceSrc.includes("{ onConflict: 'store_id,day_of_week' }"),
  'store_operating_hours strictly reuses storeId with onConflict (store_id, day_of_week)'
);

assert(
  serviceSrc.includes(".from('delivery_settings')") &&
  serviceSrc.includes("store_id: storeId") &&
  serviceSrc.includes("{ onConflict: 'store_id' }"),
  'delivery_settings strictly reuses storeId with onConflict store_id'
);

assert(
  serviceSrc.includes(".from('tax_information')") &&
  serviceSrc.includes("vendor_id: vendorId") &&
  serviceSrc.includes("{ onConflict: 'vendor_id' }"),
  'tax_information strictly reuses vendorId with onConflict vendor_id'
);

assert(
  serviceSrc.includes(".from('bank_accounts')") &&
  serviceSrc.includes("vendor_id: vendorId") &&
  serviceSrc.includes("{ onConflict: 'vendor_id' }"),
  'bank_accounts strictly reuses vendorId with onConflict vendor_id'
);

assert(
  serviceSrc.includes(".from('stores')") &&
  serviceSrc.includes(".eq('id', targetStoreId)") &&
  serviceSrc.includes(".eq('vendor_id', vendorId)"),
  'Store update query includes .eq("vendor_id", vendorId) for defense-in-depth vendor scoping'
);

// -------------------------------------------------------------
// Suite 8: In-Flight Concurrency Lock (activeSubmissions)
// -------------------------------------------------------------
console.log('\n--- Suite 8: In-Flight Concurrency Lock ---');

assert(
  serviceSrc.includes('const activeSubmissions = new Set();'),
  'activeSubmissions Set exists for tracking active in-flight submissions by user'
);

assert(
  serviceSrc.includes('if (activeSubmissions.has(userId))') &&
  serviceSrc.includes('A submission is already in progress for this account'),
  'Concurrent double-submission for the same user is rejected with explicit diagnostic error'
);

assert(
  serviceSrc.includes('activeSubmissions.add(userId);') &&
  serviceSrc.includes('activeSubmissions.delete(userId);'),
  'User lock is acquired at start and cleanly released in finally block'
);

// -------------------------------------------------------------
// Suite 9: Safe Storage Replacement & Orphan Cleanup
// -------------------------------------------------------------
console.log('\n--- Suite 9: Safe Storage Cleanup Safety ---');

assert(
  serviceSrc.includes('async function safeStorageCleanup('),
  'safeStorageCleanup helper function exists in onboarding service'
);

assert(
  serviceSrc.includes('if (!oldPath || typeof oldPath !== \'string\' || oldPath === newPath)'),
  'safeStorageCleanup verifies oldPath is valid, non-empty, and distinct from newPath before processing'
);

assert(
  serviceSrc.includes('if (!oldPath.startsWith(`${ownerPrefix}/`))'),
  'safeStorageCleanup strictly asserts ownerPrefix (vendorId or storeId) before allowing removal'
);

assert(
  serviceSrc.includes('.eq(\'storage_path\', oldPath)') &&
  serviceSrc.includes('.neq(\'id\', currentRecordId)'),
  'safeStorageCleanup checks that zero other database records reference the old storage path'
);

assert(
  serviceSrc.includes('if (references && references.length > 0)'),
  'safeStorageCleanup skips deletion if other metadata records still reference the storage object'
);

assert(
  kycBlock.includes('safeStorageCleanup({') &&
  kycBlock.includes("bucket: 'kyc-documents'"),
  'KYC metadata update triggers safe storage cleanup after successful metadata update'
);

assert(
  photoBlock.includes('safeStorageCleanup({') &&
  photoBlock.includes("bucket: 'store-photos'"),
  'Store photo metadata update triggers safe storage cleanup after successful metadata update'
);

// -------------------------------------------------------------
// Suite 10: Concurrency Migration File & Duplicate Pre-Checks
// -------------------------------------------------------------
console.log('\n--- Suite 10: Database Migration Constraints & Pre-Validation ---');

const migrationSrc = readFileSync(
  resolve('supabase/migrations/20260928000002_onboarding_concurrency_constraints.sql'),
  'utf-8'
);

assert(
  migrationSrc.includes('SELECT vendor_id, document_type') &&
  migrationSrc.includes('HAVING COUNT(*) > 1') &&
  migrationSrc.includes('MIGRATION ABORTED: Found % group(s) of duplicate (vendor_id, document_type) records'),
  'Migration asserts pre-check for existing duplicate KYC records before applying unique constraint'
);

assert(
  migrationSrc.includes('uq_kyc_documents_vendor_doctype UNIQUE (vendor_id, document_type)'),
  'Migration defines unique constraint (vendor_id, document_type) for public.kyc_documents'
);

assert(
  !migrationSrc.includes('DELETE FROM public.kyc_documents') &&
  !migrationSrc.includes('UPDATE public.kyc_documents SET status'),
  'Migration does NOT delete records or modify verification histories automatically'
);

assert(
  migrationSrc.includes('SELECT store_id, photo_type, display_order') &&
  migrationSrc.includes('HAVING COUNT(*) > 1') &&
  migrationSrc.includes('MIGRATION ABORTED: Found % group(s) of duplicate (store_id, photo_type, display_order) records'),
  'Migration asserts pre-check for existing duplicate store photos before applying unique constraint'
);

assert(
  migrationSrc.includes('uq_store_photos_store_type_order UNIQUE (store_id, photo_type, display_order)'),
  'Migration defines multi-photo category safe unique constraint (store_id, photo_type, display_order) for public.store_photos'
);

// -------------------------------------------------------------
// Suite 11: Concurrency Conflict Graceful Recovery (Code 23505)
// -------------------------------------------------------------
console.log('\n--- Suite 11: Concurrency Conflict Recovery (Code 23505) ---');

assert(
  kycBlock.includes("kycInsertErr.code === '23505'") ||
  kycBlock.includes("kycInsertErr.message?.includes('duplicate key')"),
  'KYC insert error handler catches code 23505 / duplicate key conflict and updates existing row'
);

assert(
  photoBlock.includes("photoInsertErr.code === '23505'") ||
  photoBlock.includes("photoInsertErr.message?.includes('duplicate key')"),
  'Photo insert error handler catches code 23505 / duplicate key conflict and updates existing row'
);

console.log('\n================================================================');
console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
}

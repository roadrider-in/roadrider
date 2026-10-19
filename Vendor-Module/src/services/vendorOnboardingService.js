import { supabase } from '../lib/supabase.js';
import { sessionOtpGate } from './sessionOtpGate.js';

/**
 * Helper to convert data URL or file object into a Blob for Supabase Storage uploads.
 */
async function getUploadBlob(fileObj, defaultMime = 'image/jpeg') {
  if (!fileObj) return null;

  if (fileObj.file instanceof Blob) {
    return fileObj.file;
  }

  if (typeof fileObj.dataUrl === 'string' && (fileObj.dataUrl.startsWith('data:') || fileObj.dataUrl.startsWith('blob:'))) {
    try {
      const response = await fetch(fileObj.dataUrl);
      return await response.blob();
    } catch (e) {
      console.warn('[Storage] Failed to convert dataUrl to blob:', e);
    }
  }

  // Never convert an HTTP URL, signed URL, or public URL into a dummy Blob or upload metadata as if it were a real file
  return null;
}

/**
 * Safely removes a replaced storage object only if:
 * 1. The old path is valid, non-empty, and distinct from the new path.
 * 2. Ownership is strictly verified by prefix (vendorId or storeId).
 * 3. No other metadata record in the database references the old storage path.
 * 4. The metadata update has already succeeded.
 */
async function safeStorageCleanup({
  bucket,
  oldPath,
  newPath,
  ownerPrefix,
  tableName,
  currentRecordId,
}) {
  if (!oldPath || typeof oldPath !== 'string' || oldPath === newPath) {
    return;
  }

  // 1. Strict ownership prefix check
  if (!oldPath.startsWith(`${ownerPrefix}/`)) {
    console.warn(`[Storage Cleanup] Skipped: Old path "${oldPath}" does not match owner prefix "${ownerPrefix}".`);
    return;
  }

  // 2. Reference check: verify no other row references this path
  try {
    const { data: references, error: refError } = await supabase
      .from(tableName)
      .select('id')
      .eq('storage_path', oldPath)
      .neq('id', currentRecordId);

    if (refError) {
      console.warn(`[Storage Cleanup] Skipped: Reference check query failed for "${oldPath}":`, refError.message);
      return;
    }

    if (references && references.length > 0) {
      console.warn(`[Storage Cleanup] Skipped: Storage object "${oldPath}" is still referenced by ${references.length} other record(s).`);
      return;
    }

    // 3. Perform safe removal
    const { error: removeError } = await supabase.storage
      .from(bucket)
      .remove([oldPath]);

    if (removeError) {
      console.warn(`[Storage Cleanup] Warning removing "${oldPath}" from ${bucket}:`, removeError.message);
    } else {
      console.log(`[Storage Cleanup] Successfully cleaned up superseded storage object "${oldPath}" from ${bucket}.`);
    }
  } catch (e) {
    console.warn(`[Storage Cleanup] Exception during cleanup for "${oldPath}":`, e.message);
  }
}

// In-flight concurrency lock to prevent parallel double-submissions for the same authenticated user
const activeSubmissions = new Set();

/**
 * Complete Vendor Onboarding Persistence Service
 * Persists all onboarding state to Supabase PostgreSQL & Storage.
 */
export const vendorOnboardingService = {
  submitOnboarding: async (onboardingState) => {
    const {
      vendorRole,
      phone,
      businessDetails,
      taxDetails,
      addressDetails,
      kycDocuments,
      kitchenPhotos,
      storefrontPhoto,
      businessLogo,
    } = onboardingState;

    console.log('[ONBOARDING] Starting complete onboarding persistence transaction...');

    // 1. Authenticated User Check & Identity Resolution
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('[ONBOARDING] Authentication failed: User is not authenticated. Please verify your mobile number first.');
    }

    const userId = user.id;

    if (typeof window !== 'undefined' && !sessionOtpGate.isSessionOtpVerified(userId)) {
      throw new Error('[ONBOARDING] Unauthorized: Phone OTP verification required before submitting onboarding.');
    }

    if (activeSubmissions.has(userId)) {
      throw new Error('[ONBOARDING] A submission is already in progress for this account. Please wait for the current request to complete.');
    }
    activeSubmissions.add(userId);

    try {
      const cleanPhone = String(phone || user.phone || '9876543210').replace(/\D/g, '');
      const cleanOwnerName = businessDetails.ownerName?.trim() || 'Merchant Partner';
      const cleanBusinessName = businessDetails.businessName?.trim() || 'My Business Outlet';
      const cleanEmail = businessDetails.email?.trim() || null;

    // 2. Profile Record (public.profiles)
    // Update owner profile details without attempting to modify or escalate account role.
    // Client cannot insert profiles under RLS policies; the profile must be initialized by the database auth trigger or ensure_profile_initialized RPC.
    console.log('[ONBOARDING] Persisting profile record...');
    let { data: updatedProfiles, error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        full_name: cleanOwnerName,
        phone: cleanPhone,
        email: cleanEmail,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('id');

    // If update matched zero rows, invoke trusted database initialization RPC to recover missing profile
    if (!profileUpdateError && (!updatedProfiles || updatedProfiles.length === 0)) {
      console.log(`[ONBOARDING] No profile found for user ${userId}, invoking trusted database initialization...`);
      const { data: initResult, error: initError } = await supabase.rpc('ensure_profile_initialized');
      if (initError) {
        console.warn(`[ONBOARDING] Trusted profile initialization notice [Code: ${initError.code || 'UNKNOWN'}]:`, initError.message);
        if (initError.code === 'PGRST202') {
          throw new Error(
            `[ONBOARDING] Database profile initialization function (public.ensure_profile_initialized) is missing in the database schema cache. ` +
            `Please execute migration 20260928000004_profile_initialization_and_recovery.sql in the Supabase SQL editor.`
          );
        }
      } else if (initResult?.status === 'initialized' || initResult?.status === 'exists') {
        const retryRes = await supabase
          .from('profiles')
          .update({
            full_name: cleanOwnerName,
            phone: cleanPhone,
            email: cleanEmail,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
          .select('id');
        updatedProfiles = retryRes.data;
        profileUpdateError = retryRes.error;
      }
    }

    if (profileUpdateError) {
      throw new Error(`[ONBOARDING] Profile save failed: ${profileUpdateError.message}`);
    }

    // If update matched zero rows, fail explicitly with diagnostic error instead of attempting an unauthorized client-side insert
    if (!updatedProfiles || updatedProfiles.length === 0) {
      throw new Error(
        `[ONBOARDING] Profile save failed: No profile record found for user ${userId}. ` +
        `Client cannot insert profiles under existing RLS policies; the profile must be initialized by the database auth trigger.`
      );
    }

    // 3. Vendor Core Record (public.vendors)
    console.log('[ONBOARDING] Persisting vendor core record...');
    const { data: vendorData, error: vendorError } = await supabase
      .from('vendors')
      .upsert(
        {
          user_id: userId,
          owner_name: cleanOwnerName,
          business_name: cleanBusinessName,
          email: cleanEmail,
          phone: cleanPhone,
          vendor_type: vendorRole === 'grocery' ? 'grocery' : 'restaurant',
          onboarding_status: 'submitted',
          onboarding_step: 11,
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (vendorError || !vendorData) {
      throw new Error(`[ONBOARDING] Vendor save failed: ${vendorError?.message || 'No vendor record returned.'}`);
    }

    const vendorId = vendorData.id;

    // 4. Store Record (public.stores)
    // Check for an existing primary store for this vendor before creating a new one to prevent duplicate outlets on retry.
    console.log('[ONBOARDING] Persisting store record...');
    const expectedBusinessType = vendorRole === 'grocery' ? 'grocery' : 'restaurant';

    // Explicitly query existing stores for this vendor
    const { data: existingStores, error: storeLookupError } = await supabase
      .from('stores')
      .select('id, store_name, business_type, created_at')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: true });

    if (storeLookupError) {
      throw new Error(`[ONBOARDING] Store lookup failed: ${storeLookupError.message}`);
    }

    // Filter existing stores by business type to guarantee restaurant/grocery isolation
    const matchingTypeStores = (existingStores || []).filter(
      (s) => s.business_type === expectedBusinessType
    );

    // Deterministically identify the primary onboarding store:
    // 1. Exact match on store_name AND business_type (case- and trim-insensitive)
    // 2. If no exact match exists, safely reuse the single existing store of this type (renamed during onboarding)
    // 3. If multiple existing outlets make the intended store ambiguous, fail with clear diagnostic error
    let targetStoreId = null;
    if (matchingTypeStores.length > 0) {
      const exactMatches = matchingTypeStores.filter(
        (s) => s.store_name?.toLowerCase().trim() === cleanBusinessName.toLowerCase().trim()
      );

      if (exactMatches.length > 0) {
        // Reuse earliest exact match
        targetStoreId = exactMatches[0].id;
      } else if (matchingTypeStores.length === 1) {
        // Vendor only has 1 outlet of this type: safely identified as the onboarding store being renamed
        targetStoreId = matchingTypeStores[0].id;
      } else {
        // Ambiguous: multiple outlets exist and none match the store name.
        // Cannot safely decide which outlet to update without risking overwriting an existing outlet.
        throw new Error(
          `[ONBOARDING] Ambiguous primary store: Vendor has ${matchingTypeStores.length} existing ${expectedBusinessType} outlets, none matching "${cleanBusinessName}". Cannot safely determine which outlet to update without risking overwriting an existing outlet. Please verify store details or contact support.`
        );
      }
    }

    const storePayload = {
      vendor_id: vendorId,
      business_type: expectedBusinessType,
      store_name: cleanBusinessName,
      phone: cleanPhone,
      email: cleanEmail,
      status: 'OFFLINE',
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    let storeData;
    if (targetStoreId) {
      console.log('[ONBOARDING] Updating existing store record:', targetStoreId);
      const { data: updatedStore, error: updateStoreError } = await supabase
        .from('stores')
        .update(storePayload)
        .eq('id', targetStoreId)
        .eq('vendor_id', vendorId)
        .select()
        .single();

      if (updateStoreError || !updatedStore) {
        throw new Error(`[ONBOARDING] Store update failed: ${updateStoreError?.message || 'No store record returned.'}`);
      }
      storeData = updatedStore;
    } else {
      console.log('[ONBOARDING] Creating new store record...');
      const { data: insertedStore, error: insertStoreError } = await supabase
        .from('stores')
        .insert(storePayload)
        .select()
        .single();

      if (insertStoreError || !insertedStore) {
        throw new Error(`[ONBOARDING] Store creation failed: ${insertStoreError?.message || 'No store record returned.'}`);
      }
      storeData = insertedStore;
    }

    const storeId = storeData.id;

    // 5. Store Address Record (public.store_addresses)
    console.log('[ONBOARDING] Persisting store address...');
    const { error: addressError } = await supabase
      .from('store_addresses')
      .upsert(
        {
          store_id: storeId,
          address_line1: addressDetails.address || 'Indiranagar',
          locality: addressDetails.address || 'Indiranagar',
          city: addressDetails.city || 'Bengaluru',
          state: 'Karnataka',
          postal_code: '560038',
          service_radius_km: parseInt(addressDetails.serviceRadiusKm || 6, 10),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'store_id' }
      );

    if (addressError) {
      throw new Error(`[ONBOARDING] Address save failed: ${addressError.message}`);
    }

    // 6. Operating Hours (public.store_operating_hours)
    console.log('[ONBOARDING] Persisting store operating hours...');
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const operatingHoursRows = daysOfWeek.map((day) => ({
      store_id: storeId,
      day_of_week: day,
      is_open: true,
      opening_time: '10:00:00',
      closing_time: '22:00:00',
    }));

    const { error: hoursError } = await supabase
      .from('store_operating_hours')
      .upsert(operatingHoursRows, { onConflict: 'store_id,day_of_week' });

    if (hoursError) {
      console.warn('[ONBOARDING] Operating hours warning:', hoursError.message);
    }

    // 7. Delivery Settings (public.delivery_settings)
    console.log('[ONBOARDING] Persisting delivery settings...');
    const { error: deliveryError } = await supabase
      .from('delivery_settings')
      .upsert(
        {
          store_id: storeId,
          service_radius_km: parseInt(addressDetails.serviceRadiusKm || 6, 10),
          base_delivery_fee: 30.0,
          packaging_fee: 25.0,
          min_order_amount: 100.0,
          avg_prep_time_minutes: 20,
          self_delivery: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'store_id' }
      );

    if (deliveryError) {
      console.warn('[ONBOARDING] Delivery settings warning:', deliveryError.message);
    }

    // 8. Tax Information (public.tax_information)
    console.log('[ONBOARDING] Persisting tax information...');
    const cleanPan = (taxDetails.panNumber || '').toUpperCase().trim();
    const cleanGstin = taxDetails.gstin ? taxDetails.gstin.toUpperCase().trim() : null;

    const { error: taxError } = await supabase
      .from('tax_information')
      .upsert(
        {
          vendor_id: vendorId,
          pan_number: cleanPan,
          gstin: cleanGstin,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'vendor_id' }
      );

    if (taxError) {
      throw new Error(`[ONBOARDING] Tax save failed: ${taxError.message}`);
    }

    // 9. Bank Information (public.bank_accounts)
    console.log('[ONBOARDING] Persisting bank account information...');
    const cleanAccount = taxDetails.accountNumber ? String(taxDetails.accountNumber).trim() : '';
    const cleanIfsc = (taxDetails.ifscCode || '').toUpperCase().trim();

    const { error: bankError } = await supabase
      .from('bank_accounts')
      .upsert(
        {
          vendor_id: vendorId,
          account_holder_name: cleanOwnerName,
          bank_name: taxDetails.bankName || 'Bank Account',
          account_number: cleanAccount,
          ifsc_code: cleanIfsc,
          account_type: 'current',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'vendor_id' }
      );

    if (bankError) {
      throw new Error(`[ONBOARDING] Bank save failed: ${bankError.message}`);
    }

    // 10. KYC Documents Upload & Records (public.kyc_documents & storage 'kyc-documents')
    console.log('[ONBOARDING] Uploading KYC documents & managing records...');
    const docEntries = [
      { type: 'aadhaar', doc: kycDocuments?.aadhaar },
      { type: 'pan', doc: kycDocuments?.pan },
      { type: 'fssai', doc: kycDocuments?.fssai },
      { type: 'gst', doc: kycDocuments?.gst },
      { type: 'cancelled_cheque', doc: taxDetails?.passbookOrCheque },
    ];

    // Explicitly query existing KYC document metadata for this vendor
    const { data: existingKycDocs, error: kycLookupError } = await supabase
      .from('kyc_documents')
      .select('id, vendor_id, store_id, document_type, storage_path, status, created_at')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: true });

    if (kycLookupError) {
      throw new Error(`[ONBOARDING] KYC document lookup failed: ${kycLookupError.message}`);
    }

    for (const { type, doc } of docEntries) {
      if (!doc || !doc.name) continue;

      const fileName = doc.name || `${type}_doc.jpg`;
      const mimeType = doc.type || 'image/jpeg';
      const existingDoc = (existingKycDocs || []).find((d) => d.document_type === type);
      const isNew = doc.isNewUpload || Boolean(doc.file) || (typeof doc.dataUrl === 'string' && doc.dataUrl.startsWith('data:'));
      const storagePath = isNew || !existingDoc?.storage_path
        ? (doc.storagePath || `${vendorId}/${type}_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`)
        : existingDoc.storage_path;

      if (isNew || !existingDoc?.storage_path) {
        try {
          const blob = await getUploadBlob(doc, mimeType);
          if (blob) {
            const { error: uploadErr } = await supabase.storage
              .from('kyc-documents')
              .upload(storagePath, blob, {
                contentType: mimeType,
                upsert: true,
              });

            if (uploadErr) {
              console.warn(`[ONBOARDING] KYC Storage upload notice (${type}):`, uploadErr.message);
            }
          }
        } catch (e) {
          console.warn(`[ONBOARDING] Storage error for ${type}:`, e.message);
        }
      }

      if (existingDoc) {
        if (existingDoc.status === 'verified' || existingDoc.status === 'rejected') {
          console.log(`[ONBOARDING] KYC document (${type}) is already ${existingDoc.status}. Preserving authoritative document record.`);
          continue;
        }

        const oldStoragePath = existingDoc.storage_path;
        console.log(`[ONBOARDING] Updating existing KYC document metadata for ${type}:`, existingDoc.id);
        const { error: kycUpdateErr } = await supabase
          .from('kyc_documents')
          .update({
            store_id: storeId,
            storage_path: storagePath,
            file_name: fileName,
            file_size_bytes: doc.size ? parseInt(doc.size, 10) || 102400 : 102400,
            mime_type: mimeType,
            uploaded_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingDoc.id)
          .eq('vendor_id', vendorId);

        if (kycUpdateErr) {
          console.error(`[ONBOARDING] KYC document metadata update failed (${type}) [Code: ${kycUpdateErr.code || 'UNKNOWN'}]:`, kycUpdateErr.message);
          throw new Error(`[ONBOARDING] KYC document metadata update failed (${type}): ${kycUpdateErr.message}`);
        }

        // Safely clean up superseded storage object only after successful metadata update
        await safeStorageCleanup({
          bucket: 'kyc-documents',
          oldPath: oldStoragePath,
          newPath: storagePath,
          ownerPrefix: vendorId,
          tableName: 'kyc_documents',
          currentRecordId: existingDoc.id,
        });
      } else {
        console.log(`[ONBOARDING] Inserting new KYC document metadata for ${type}...`);
        const { error: kycInsertErr } = await supabase
          .from('kyc_documents')
          .insert({
            vendor_id: vendorId,
            store_id: storeId,
            document_type: type,
            storage_path: storagePath,
            file_name: fileName,
            file_size_bytes: doc.size ? parseInt(doc.size, 10) || 102400 : 102400,
            mime_type: mimeType,
            status: 'pending',
          });

        if (kycInsertErr) {
          console.error(`[ONBOARDING] KYC document metadata insert failed (${type}) [Code: ${kycInsertErr.code || 'UNKNOWN'}]:`, kycInsertErr.message);
          // If concurrent insert created a conflict (unique constraint violation code 23505), recover gracefully by updating
          if (
            kycInsertErr.code === '23505' ||
            kycInsertErr.message?.includes('duplicate key') ||
            kycInsertErr.message?.includes('unique constraint')
          ) {
            console.log(`[ONBOARDING] Concurrent KYC insert conflict detected for ${type}, updating existing row...`);
            const { data: conflictDoc } = await supabase
              .from('kyc_documents')
              .select('id, storage_path, status')
              .eq('vendor_id', vendorId)
              .eq('document_type', type)
              .maybeSingle();

            if (conflictDoc) {
              if (conflictDoc.status === 'verified' || conflictDoc.status === 'rejected') {
                console.log(`[ONBOARDING] Conflicting KYC document (${type}) is already ${conflictDoc.status}. Preserving authoritative document record.`);
                continue;
              }

              const oldStoragePath = conflictDoc.storage_path;
              const { error: retryUpdateErr } = await supabase
                .from('kyc_documents')
                .update({
                  store_id: storeId,
                  storage_path: storagePath,
                  file_name: fileName,
                  file_size_bytes: doc.size ? parseInt(doc.size, 10) || 102400 : 102400,
                  mime_type: mimeType,
                  uploaded_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq('id', conflictDoc.id)
                .eq('vendor_id', vendorId);

              if (retryUpdateErr) {
                console.error(`[ONBOARDING] KYC document conflict retry update failed (${type}) [Code: ${retryUpdateErr.code || 'UNKNOWN'}]:`, retryUpdateErr.message);
                throw new Error(`[ONBOARDING] KYC document metadata update failed (${type}): ${retryUpdateErr.message}`);
              }

              await safeStorageCleanup({
                bucket: 'kyc-documents',
                oldPath: oldStoragePath,
                newPath: storagePath,
                ownerPrefix: vendorId,
                tableName: 'kyc_documents',
                currentRecordId: conflictDoc.id,
              });
            } else {
              throw new Error(`[ONBOARDING] KYC document metadata insert failed (${type}): ${kycInsertErr.message}`);
            }
          } else {
            throw new Error(`[ONBOARDING] KYC document metadata insert failed (${type}): ${kycInsertErr.message}`);
          }
        }
      }
    }

    // 11. Store Photos Upload & Records (public.store_photos & storage 'store-photos')
    console.log('[ONBOARDING] Uploading store photos & managing records...');
    const photoList = [];

    if (Array.isArray(kitchenPhotos)) {
      kitchenPhotos.forEach((photo, idx) => {
        if (photo && photo.name) {
          photoList.push({
            photoType: 'kitchen',
            photo,
            caption: `Kitchen Interior ${idx + 1}`,
            displayOrder: idx,
            indexWithinType: idx,
          });
        }
      });
    }

    if (storefrontPhoto && storefrontPhoto.name) {
      photoList.push({
        photoType: 'storefront',
        photo: storefrontPhoto,
        caption: 'Storefront Exterior',
        displayOrder: 0,
        indexWithinType: 0,
      });
    }

    if (businessLogo && businessLogo.name) {
      photoList.push({
        photoType: 'logo',
        photo: businessLogo,
        caption: 'Store Logo',
        displayOrder: 0,
        indexWithinType: 0,
      });
    }

    // Query existing store photos for this store
    const { data: existingPhotos, error: photoLookupError } = await supabase
      .from('store_photos')
      .select('id, store_id, photo_type, caption, display_order, is_verified, created_at')
      .eq('store_id', storeId)
      .order('created_at', { ascending: true });

    if (photoLookupError) {
      throw new Error(`[ONBOARDING] Store photo lookup failed: ${photoLookupError.message}`);
    }

    // Group existing photos by photo_type for deterministic matching
    const existingPhotosByType = {};
    if (existingPhotos) {
      for (const p of existingPhotos) {
        if (!existingPhotosByType[p.photo_type]) {
          existingPhotosByType[p.photo_type] = [];
        }
        existingPhotosByType[p.photo_type].push(p);
      }
    }

    for (const item of photoList) {
      const { photoType, photo, caption, displayOrder, indexWithinType } = item;
      const fileName = photo.name || `${photoType}_photo.jpg`;
      const mimeType = photo.type || 'image/jpeg';
      const existingRecord = existingPhotosByType[photoType]?.[indexWithinType];
      const isNew = photo.isNewUpload || Boolean(photo.file) || (typeof photo.dataUrl === 'string' && photo.dataUrl.startsWith('data:'));
      const storagePath = isNew || !existingRecord?.storage_path
        ? `${storeId}/${photoType}_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        : existingRecord.storage_path;

      if (isNew || !existingRecord?.storage_path) {
        try {
          const blob = await getUploadBlob(photo, mimeType);
          if (blob) {
            const { error: photoUploadErr } = await supabase.storage
              .from('store-photos')
              .upload(storagePath, blob, {
                contentType: mimeType,
                upsert: true,
              });

            if (photoUploadErr) {
              console.warn(`[ONBOARDING] Store Photo Storage notice (${photoType}):`, photoUploadErr.message);
            }
          }
        } catch (e) {
          console.warn(`[ONBOARDING] Photo storage upload error (${photoType}):`, e.message);
        }
      }

      if (existingRecord) {
        const oldStoragePath = existingRecord.storage_path;
        console.log(`[ONBOARDING] Updating existing store photo metadata (${photoType}):`, existingRecord.id);
        const { error: photoUpdateErr } = await supabase
          .from('store_photos')
          .update({
            storage_path: storagePath,
            file_name: fileName,
            caption,
            display_order: displayOrder,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingRecord.id)
          .eq('store_id', storeId);

        if (photoUpdateErr) {
          throw new Error(`[ONBOARDING] Store photo metadata update failed (${photoType}): ${photoUpdateErr.message}`);
        }

        // Safely clean up superseded storage object only after successful metadata update
        await safeStorageCleanup({
          bucket: 'store-photos',
          oldPath: oldStoragePath,
          newPath: storagePath,
          ownerPrefix: storeId,
          tableName: 'store_photos',
          currentRecordId: existingRecord.id,
        });
      } else {
        console.log(`[ONBOARDING] Inserting new store photo metadata (${photoType})...`);
        const { error: photoInsertErr } = await supabase
          .from('store_photos')
          .insert({
            store_id: storeId,
            photo_type: photoType,
            storage_path: storagePath,
            file_name: fileName,
            caption,
            display_order: displayOrder,
            is_verified: false,
          });

        if (photoInsertErr) {
          // If concurrent insert created a conflict (unique constraint violation code 23505), recover gracefully by updating
          if (
            photoInsertErr.code === '23505' ||
            photoInsertErr.message?.includes('duplicate key') ||
            photoInsertErr.message?.includes('unique constraint')
          ) {
            console.log(`[ONBOARDING] Concurrent photo insert conflict detected for ${photoType}, updating existing row...`);
            const { data: conflictPhoto } = await supabase
              .from('store_photos')
              .select('id, storage_path')
              .eq('store_id', storeId)
              .eq('photo_type', photoType)
              .eq('display_order', displayOrder)
              .maybeSingle();

            if (conflictPhoto) {
              const oldStoragePath = conflictPhoto.storage_path;
              const { error: retryUpdateErr } = await supabase
                .from('store_photos')
                .update({
                  storage_path: storagePath,
                  file_name: fileName,
                  caption,
                  display_order: displayOrder,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', conflictPhoto.id)
                .eq('store_id', storeId);

              if (retryUpdateErr) {
                throw new Error(`[ONBOARDING] Store photo metadata update failed (${photoType}): ${retryUpdateErr.message}`);
              }

              await safeStorageCleanup({
                bucket: 'store-photos',
                oldPath: oldStoragePath,
                newPath: storagePath,
                ownerPrefix: storeId,
                tableName: 'store_photos',
                currentRecordId: conflictPhoto.id,
              });
            } else {
              throw new Error(`[ONBOARDING] Store photo metadata insert failed (${photoType}): ${photoInsertErr.message}`);
            }
          } else {
            throw new Error(`[ONBOARDING] Store photo metadata insert failed (${photoType}): ${photoInsertErr.message}`);
          }
        }
      }
    }

    // 12. Audit Log Entry
    try {
      await supabase.from('audit_logs').insert({
        vendor_id: vendorId,
        user_id: userId,
        action: 'VENDOR_ONBOARDING_SUBMITTED',
        entity_type: 'vendors',
        entity_id: vendorId,
        details: {
          business_name: cleanBusinessName,
          vendor_type: vendorRole,
          submitted_at: new Date().toISOString(),
        },
      });
    } catch (auditErr) {
      console.warn('[ONBOARDING] Audit log creation notice:', auditErr.message);
    }

    console.log('[ONBOARDING] Complete onboarding persistence succeeded for vendor:', vendorId);

    return {
      success: true,
      userId,
      vendorId,
      storeId,
    };
    } finally {
      activeSubmissions.delete(userId);
    }
  },

  /**
   * Loads saved onboarding progress and draft data for an authenticated vendor.
   * Enables seamless restoration when returning to the portal.
   * @param {string} [targetUserId] - Optional user ID, defaults to current auth user.
   */
  loadOnboardingState: async (targetUserId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { exists: false, error: 'User not authenticated' };
    }
    if (targetUserId && targetUserId !== user.id) {
      throw new Error(`Unauthorized: Authenticated user ${user.id} cannot access onboarding state for ${targetUserId}`);
    }
    const userId = user.id;

    if (typeof window !== 'undefined' && !sessionOtpGate.isSessionOtpVerified(userId)) {
      throw new Error('Unauthorized: Phone OTP verification required before loading onboarding state.');
    }

    try {
      // 1. Fetch vendor record
      const { data: vendor, error: vendorErr } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (vendorErr) throw vendorErr;
      if (!vendor) return { exists: false };

      const vendorId = vendor.id;

      // 2. Fetch primary store and related vendor records in parallel
      const [
        storesRes,
        taxRes,
        bankRes,
        kycRes,
      ] = await Promise.all([
        supabase.from('stores').select('*').eq('vendor_id', vendorId).order('created_at', { ascending: true }),
        supabase.from('tax_information').select('*').eq('vendor_id', vendorId).maybeSingle(),
        supabase.from('bank_accounts').select('*').eq('vendor_id', vendorId).maybeSingle(),
        supabase.from('kyc_documents').select('*').eq('vendor_id', vendorId).order('created_at', { ascending: true }),
      ]);

      const primaryStore = storesRes.data?.[0] || null;
      let address = null;
      let operatingHours = [];
      let deliverySettings = null;
      let storePhotos = [];

      // 3. If primary store exists, fetch store-level records
      if (primaryStore) {
        const [addrRes, hoursRes, deliveryRes, photosRes] = await Promise.all([
          supabase.from('store_addresses').select('*').eq('store_id', primaryStore.id).maybeSingle(),
          supabase.from('store_operating_hours').select('*').eq('store_id', primaryStore.id),
          supabase.from('delivery_settings').select('*').eq('store_id', primaryStore.id).maybeSingle(),
          supabase.from('store_photos').select('*').eq('store_id', primaryStore.id).order('display_order', { ascending: true }),
        ]);

        address = addrRes.data || null;
        operatingHours = hoursRes.data || [];
        deliverySettings = deliveryRes.data || null;
        storePhotos = photosRes.data || [];
      }

      // Generate signed URLs for KYC documents (private bucket kyc-documents)
      const signedKycDocs = await Promise.all(
        (kycRes.data || []).map(async (doc) => {
          let signedUrl = null;
          if (doc.storage_path) {
            try {
              const { data: signedData } = await supabase.storage
                .from('kyc-documents')
                .createSignedUrl(doc.storage_path, 3600);
              signedUrl = signedData?.signedUrl || null;
            } catch (signErr) {
              console.warn(`[Storage] Failed to sign KYC doc ${doc.document_type}:`, signErr);
            }
          }
          return {
            ...doc,
            signedUrl,
            url: signedUrl,
            dataUrl: signedUrl,
          };
        })
      );

      // Generate public URLs for store photos (public bucket store-photos)
      const signedStorePhotos = (storePhotos || []).map((photo) => {
        let publicUrl = null;
        if (photo.storage_path) {
          try {
            const { data: publicData } = supabase.storage
              .from('store-photos')
              .getPublicUrl(photo.storage_path);
            publicUrl = publicData?.publicUrl || null;
          } catch (pubErr) {
            console.warn(`[Storage] Failed to get public URL for photo ${photo.photo_type}:`, pubErr);
          }
        }
        return {
          ...photo,
          publicUrl,
          url: publicUrl,
          dataUrl: publicUrl,
        };
      });

      return {
        exists: true,
        vendor,
        store: primaryStore,
        address,
        operatingHours,
        deliverySettings,
        taxInfo: taxRes.data || null,
        bankAccount: bankRes.data || null,
        kycDocs: signedKycDocs,
        storePhotos: signedStorePhotos,
        onboardingStatus: vendor.onboarding_status,
        onboardingStep: vendor.onboarding_step,
      };
    } catch (err) {
      console.warn('[ONBOARDING] Failed to load onboarding state:', err);
      return { exists: false, error: err.message };
    }
  },

  /**
   * Retrieves quick onboarding verification status for route guarding.
   * Resolves the vendor record for the authenticated user and checks for KYC rejection details if applicable.
   * @param {string} [targetUserId]
   */
  getOnboardingStatus: async (targetUserId) => {
    let userId = targetUserId;
    if (!userId) {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) {
          // If simply unauthenticated or no session, treat cleanly as exists: false without an error banner
          if (
            authError.message?.toLowerCase().includes('auth session missing') ||
            authError.message?.toLowerCase().includes('session not found') ||
            authError.status === 400 ||
            authError.status === 401
          ) {
            return { exists: false, isError: false };
          }
          console.warn('[getOnboardingStatus] Auth verification notice:', authError.message);
          return { exists: false, isError: true, error: authError.message };
        }
        userId = user?.id;
      } catch (authEx) {
        console.warn('[getOnboardingStatus] Auth exception:', authEx.message);
        return { exists: false, isError: true, error: authEx.message };
      }
    }
    if (!userId) return { exists: false, isError: false };

    try {
      const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .select('id, vendor_type, onboarding_status, onboarding_step, terms_accepted')
        .eq('user_id', userId)
        .maybeSingle();

      if (vendorError) {
        console.error('[getOnboardingStatus] Database query error:', vendorError.message);
        return {
          exists: false,
          isError: true,
          error: vendorError.message,
        };
      }

      if (!vendor) {
        return { exists: false, isError: false };
      }

      let rejectionReason = null;
      let rejectedDocuments = [];

      // If vendor status is rejected, fetch document-level rejection reason from public.kyc_documents
      if (vendor.onboarding_status === 'rejected') {
        try {
          const { data: rejectedKyc, error: kycError } = await supabase
            .from('kyc_documents')
            .select('id, document_type, status, rejection_reason')
            .eq('vendor_id', vendor.id)
            .eq('status', 'rejected');

          if (!kycError && rejectedKyc && rejectedKyc.length > 0) {
            rejectedDocuments = rejectedKyc;
            const reasons = rejectedKyc
              .map((d) => d.rejection_reason)
              .filter(Boolean);
            if (reasons.length > 0) {
              rejectionReason = reasons.join('; ');
            }
          }
        } catch (kycEx) {
          console.warn('[getOnboardingStatus] Notice fetching KYC rejection details:', kycEx.message);
        }
      }

      return {
        exists: true,
        isError: false,
        vendorId: vendor.id,
        vendorType: vendor.vendor_type,
        onboardingStatus: vendor.onboarding_status,
        onboardingStep: vendor.onboarding_step,
        termsAccepted: vendor.terms_accepted,
        rejectionReason,
        rejectedDocuments,
      };
    } catch (queryEx) {
      console.error('[getOnboardingStatus] Unexpected exception:', queryEx.message);
      return {
        exists: false,
        isError: true,
        error: queryEx.message,
      };
    }
  },

  /**
   * Saves business details draft during onboarding.
   * @param {object} details
   */
  saveBusinessDetails: async (details) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    if (typeof window !== 'undefined' && !sessionOtpGate.isSessionOtpVerified(user.id)) {
      throw new Error('Unauthorized: Phone OTP verification required before saving business details.');
    }

    const cleanOwner = details.ownerName?.trim() || 'Merchant Partner';
    const cleanBusiness = details.businessName?.trim() || 'My Business Outlet';
    const cleanPhone = String(details.phone || user.phone || '').replace(/\D/g, '');
    const cleanEmail = details.email?.trim() || user.email || null;
    const vendorType = details.businessType === 'Grocery' ? 'grocery' : 'restaurant';

    let { data: updatedProf, error: profUpdateError } = await supabase.from('profiles').update({
      full_name: cleanOwner,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id).select('id');

    if (!profUpdateError && (!updatedProf || updatedProf.length === 0)) {
      console.log(`[BusinessDetails] No profile found for user ${user.id}, attempting trusted initialization...`);
      const { data: initRes, error: initErr } = await supabase.rpc('ensure_profile_initialized');
      if (initRes?.status === 'initialized' || initRes?.status === 'exists') {
        const retryRes = await supabase.from('profiles').update({
          full_name: cleanOwner,
          updated_at: new Date().toISOString(),
        }).eq('id', user.id).select('id');
        updatedProf = retryRes.data;
        profUpdateError = retryRes.error;
      } else if (initErr) {
        console.warn(`[BusinessDetails] Profile initialization notice [Code: ${initErr.code || 'UNKNOWN'}]:`, initErr.message);
        if (initErr.code === 'PGRST202') {
          throw new Error(
            `[BusinessDetails] Database profile initialization function (public.ensure_profile_initialized) is missing in the database schema cache. ` +
            `Please execute migration 20260928000004_profile_initialization_and_recovery.sql in the Supabase SQL editor.`
          );
        }
      }
    }

    if (profUpdateError) {
      throw new Error(`[BusinessDetails] Profile save failed: ${profUpdateError.message}`);
    }

    if (!updatedProf || updatedProf.length === 0) {
      throw new Error(
        `[BusinessDetails] Profile save failed: No profile record found for user ${user.id}. ` +
        `Client cannot insert profiles under existing RLS policies; the profile must be initialized by the database auth trigger or ensure_profile_initialized RPC.`
      );
    }

    const { data: vendor, error } = await supabase.from('vendors').upsert(
      {
        user_id: user.id,
        owner_name: cleanOwner,
        business_name: cleanBusiness,
        phone: cleanPhone || '9876543210',
        email: cleanEmail,
        vendor_type: vendorType,
        onboarding_step: Math.max(5, details.step || 5),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    ).select().single();

    if (error) throw error;

    // Ensure primary store record exists so subsequent screens have a storeId
    let store = null;
    const { data: existingStores } = await supabase
      .from('stores')
      .select('id, store_name, business_type')
      .eq('vendor_id', vendor.id);

    const matchingStore = (existingStores || []).find((s) => s.business_type === vendorType);
    if (matchingStore) {
      const { data: updatedStore } = await supabase
        .from('stores')
        .update({
          store_name: cleanBusiness,
          phone: cleanPhone || '9876543210',
          email: cleanEmail,
          updated_at: new Date().toISOString(),
        })
        .eq('id', matchingStore.id)
        .eq('vendor_id', vendor.id)
        .select()
        .single();
      store = updatedStore || matchingStore;
    } else {
      const { data: newStore } = await supabase
        .from('stores')
        .insert({
          vendor_id: vendor.id,
          business_type: vendorType,
          store_name: cleanBusiness,
          phone: cleanPhone || '9876543210',
          email: cleanEmail,
          status: 'OFFLINE',
          is_active: true,
        })
        .select()
        .single();
      store = newStore;
    }

    return { success: true, vendor, store };
  },

  /**
   * Saves tax and bank information draft during onboarding.
   * @param {string} vendorId
   * @param {object} taxDetails
   * @param {string} [ownerName]
   * @param {string} [storeId]
   */
  saveTaxAndBankDetails: async (vendorId, taxDetails, ownerName = 'Merchant Partner', storeId = null) => {
    if (!vendorId) throw new Error('Vendor ID required');

    // Verify authenticated session and vendor mapping before persisting
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      throw new Error('[ONBOARDING] Authentication required. Please sign in via OTP before saving tax & bank details.');
    }
    if (typeof window !== 'undefined' && !sessionOtpGate.isSessionOtpVerified(authData.user.id)) {
      throw new Error('Unauthorized: Phone OTP verification required before saving tax & bank details.');
    }
    const { data: vendorRecord, error: vendorLookupErr } = await supabase
      .from('vendors')
      .select('id, user_id')
      .eq('id', vendorId)
      .maybeSingle();

    if (vendorLookupErr) {
      throw new Error(`[ONBOARDING] Vendor mapping verification failed: ${vendorLookupErr.message}`);
    }
    if (!vendorRecord || vendorRecord.user_id !== authData.user.id) {
      throw new Error(`[ONBOARDING] Authorization error: Authenticated user is not mapped to vendor ${vendorId}.`);
    }

    const cleanPan = (taxDetails.panNumber || '').toUpperCase().trim();
    const cleanGstin = taxDetails.gstin ? taxDetails.gstin.toUpperCase().trim() : null;
    const cleanAccount = taxDetails.accountNumber?.trim();
    const cleanIfsc = (taxDetails.ifscCode || '').toUpperCase().trim();

    const operations = [];

    if (cleanPan) {
      operations.push(
        supabase.from('tax_information').upsert(
          {
            vendor_id: vendorId,
            pan_number: cleanPan,
            gstin: cleanGstin,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'vendor_id' }
        )
      );
    }

    if (cleanAccount && cleanIfsc) {
      operations.push(
        supabase.from('bank_accounts').upsert(
          {
            vendor_id: vendorId,
            account_holder_name: ownerName,
            bank_name: taxDetails.bankName || 'HDFC Bank',
            account_number: cleanAccount,
            ifsc_code: cleanIfsc,
            account_type: 'current',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'vendor_id' }
        )
      );
    }

    const results = await Promise.all(operations);
    for (const r of results) {
      if (r.error) throw r.error;
    }

    // Handle passbookOrCheque upload / update / removal
    let updatedCheque = taxDetails.passbookOrCheque;
    const cheque = taxDetails.passbookOrCheque;

    if (cheque && (cheque.isNewUpload || Boolean(cheque.file) || (typeof cheque.dataUrl === 'string' && cheque.dataUrl.startsWith('data:')))) {
      const fileName = cheque.name || 'cancelled_cheque.jpg';
      const mimeType = cheque.type || (fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
      const storagePath = `${vendorId}/cancelled_cheque_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      const blob = await getUploadBlob(cheque, mimeType);
      if (blob) {
        const { error: uploadErr } = await supabase.storage
          .from('kyc-documents')
          .upload(storagePath, blob, {
            contentType: mimeType,
            upsert: true,
          });
        if (uploadErr) {
          console.warn('[Storage] Cheque upload warning:', uploadErr.message);
        }
      }

      const fileSize = cheque.file?.size || blob?.size || (cheque.size ? parseInt(cheque.size, 10) * 1024 : 102400);

      const { data: existingCheque } = await supabase
        .from('kyc_documents')
        .select('id, storage_path, status')
        .eq('vendor_id', vendorId)
        .eq('document_type', 'cancelled_cheque')
        .maybeSingle();

      if (existingCheque) {
        if (existingCheque.status === 'verified' || existingCheque.status === 'rejected') {
          console.log(`[TaxBank] Cheque document is already ${existingCheque.status}. Preserving authoritative document record.`);
        } else {
          const oldStoragePath = existingCheque.storage_path;
          const { error: updateErr } = await supabase
            .from('kyc_documents')
            .update({
              storage_path: storagePath,
              file_name: fileName,
              file_size_bytes: fileSize,
              mime_type: mimeType,
              uploaded_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingCheque.id)
            .eq('vendor_id', vendorId);

          if (updateErr) {
            console.error(`[TaxBank] Cheque metadata update failed [Code: ${updateErr.code || 'UNKNOWN'}]:`, updateErr.message);
            throw updateErr;
          }

          await safeStorageCleanup({
            bucket: 'kyc-documents',
            oldPath: oldStoragePath,
            newPath: storagePath,
            ownerPrefix: vendorId,
            tableName: 'kyc_documents',
            currentRecordId: existingCheque.id,
          });
        }
      } else {
        const { error: insertErr } = await supabase
          .from('kyc_documents')
          .insert({
            vendor_id: vendorId,
            store_id: storeId || null,
            document_type: 'cancelled_cheque',
            storage_path: storagePath,
            file_name: fileName,
            file_size_bytes: fileSize,
            mime_type: mimeType,
            status: 'pending',
          });

        if (insertErr) {
          console.error(`[TaxBank] Cheque metadata insert failed [Code: ${insertErr.code || 'UNKNOWN'}]:`, insertErr.message);
          if (
            insertErr.code === '23505' ||
            insertErr.message?.includes('duplicate key') ||
            insertErr.message?.includes('unique constraint')
          ) {
            console.log('[TaxBank] KYC insert conflict for cancelled_cheque, updating existing row...');
            const { data: conflictDoc, error: conflictLookupErr } = await supabase
              .from('kyc_documents')
              .select('id, storage_path, status')
              .eq('vendor_id', vendorId)
              .eq('document_type', 'cancelled_cheque')
              .maybeSingle();

            if (conflictLookupErr) {
              console.error(`[TaxBank] Failed to resolve conflicting cheque record [Code: ${conflictLookupErr.code || 'UNKNOWN'}]:`, conflictLookupErr.message);
              throw new Error(`[TaxBank] Failed to resolve conflicting cheque record: ${conflictLookupErr.message}`);
            }

            if (conflictDoc) {
              if (conflictDoc.status === 'verified' || conflictDoc.status === 'rejected') {
                console.log(`[TaxBank] Conflicting cheque document is already ${conflictDoc.status}. Preserving authoritative document record.`);
              } else {
                const oldStoragePath = conflictDoc.storage_path;
                const { error: retryErr } = await supabase
                  .from('kyc_documents')
                  .update({
                    store_id: storeId || null,
                    storage_path: storagePath,
                    file_name: fileName,
                    file_size_bytes: fileSize,
                    mime_type: mimeType,
                    uploaded_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', conflictDoc.id)
                  .eq('vendor_id', vendorId);

                if (retryErr) {
                  console.error(`[TaxBank] Failed to update existing cheque record [Code: ${retryErr.code || 'UNKNOWN'}]:`, retryErr.message);
                  throw new Error(`[TaxBank] Failed to update existing cheque record: ${retryErr.message}`);
                }

                await safeStorageCleanup({
                  bucket: 'kyc-documents',
                  oldPath: oldStoragePath,
                  newPath: storagePath,
                  ownerPrefix: vendorId,
                  tableName: 'kyc_documents',
                  currentRecordId: conflictDoc.id,
                });
              }
            }
          } else {
            throw new Error(`[TaxBank] Cheque metadata insert failed: ${insertErr.message}`);
          }
        }
      }

      const { data: signedData } = await supabase.storage
        .from('kyc-documents')
        .createSignedUrl(storagePath, 3600);
      const signedUrl = signedData?.signedUrl || null;

      updatedCheque = {
        name: fileName,
        size: `${(fileSize / 1024).toFixed(1)} KB`,
        storagePath,
        signedUrl,
        url: signedUrl,
        dataUrl: signedUrl,
        type: mimeType,
        isNewUpload: false,
      };
    } else if (cheque === null) {
      const { data: existingCheque } = await supabase
        .from('kyc_documents')
        .select('id, storage_path')
        .eq('vendor_id', vendorId)
        .eq('document_type', 'cancelled_cheque')
        .maybeSingle();

      if (existingCheque) {
        await supabase.from('kyc_documents').delete().eq('id', existingCheque.id);
        await supabase.storage.from('kyc-documents').remove([existingCheque.storage_path]);
      }
      updatedCheque = null;
    }

    return { success: true, updatedCheque };
  },

  /**
   * Saves store address and delivery settings draft during onboarding.
   * @param {string} storeId
   * @param {object} addressDetails
   */
  saveAddressAndDelivery: async (storeId, addressDetails) => {
    if (!storeId) throw new Error('Store ID required');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    if (typeof window !== 'undefined' && !sessionOtpGate.isSessionOtpVerified(user.id)) {
      throw new Error('Unauthorized: Phone OTP verification required before saving address details.');
    }

    const radiusKm = parseInt(addressDetails.serviceRadiusKm || 6, 10);
    const addressLine = addressDetails.address || 'Indiranagar';
    const city = addressDetails.city || 'Bengaluru';

    const [addrRes, delivRes] = await Promise.all([
      supabase.from('store_addresses').upsert(
        {
          store_id: storeId,
          address_line1: addressLine,
          locality: addressLine,
          city: city,
          state: 'Karnataka',
          postal_code: addressDetails.postalCode || '560038',
          service_radius_km: radiusKm,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'store_id' }
      ),
      supabase.from('delivery_settings').upsert(
        {
          store_id: storeId,
          service_radius_km: radiusKm,
          base_delivery_fee: 30.0,
          packaging_fee: 25.0,
          min_order_amount: 100.0,
          avg_prep_time_minutes: 20,
          self_delivery: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'store_id' }
      ),
    ]);

    if (addrRes.error) throw addrRes.error;
    if (delivRes.error) throw delivRes.error;

    return { success: true };
  },

  /**
   * Saves and uploads KYC documents to Supabase Storage and database.
   * @param {string} vendorId
   * @param {string} [storeId]
   * @param {object} kycDocs
   */
  saveKycDocuments: async (vendorId, storeId, kycDocs) => {
    if (!vendorId) throw new Error('Vendor ID required');

    // Verify authenticated session and vendor mapping before persisting
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      throw new Error('[ONBOARDING] Authentication required. Please sign in via OTP before saving KYC documents.');
    }
    if (typeof window !== 'undefined' && !sessionOtpGate.isSessionOtpVerified(authData.user.id)) {
      throw new Error('Unauthorized: Phone OTP verification required before saving KYC documents.');
    }
    const { data: vendorRecord, error: vendorLookupErr } = await supabase
      .from('vendors')
      .select('id, user_id')
      .eq('id', vendorId)
      .maybeSingle();

    if (vendorLookupErr) {
      throw new Error(`[ONBOARDING] Vendor mapping verification failed: ${vendorLookupErr.message}`);
    }
    if (!vendorRecord || vendorRecord.user_id !== authData.user.id) {
      throw new Error(`[ONBOARDING] Authorization error: Authenticated user is not mapped to vendor ${vendorId}.`);
    }

    const docTypes = ['aadhaar', 'pan', 'fssai', 'gst'];
    const { data: existingKycDocs } = await supabase
      .from('kyc_documents')
      .select('*')
      .eq('vendor_id', vendorId);

    const updatedKycDocs = {};

    for (const type of docTypes) {
      const doc = kycDocs[type];
      const existingDoc = (existingKycDocs || []).find((d) => d.document_type === type);

      if (!doc || (!doc.name && !doc.dataUrl && !doc.storagePath)) {
        if (existingDoc) {
          if (existingDoc.status === 'verified' || existingDoc.status === 'rejected') {
            console.log(`[KYC] Preserving already ${existingDoc.status} ${type} document for vendor ${vendorId}`);
            updatedKycDocs[type] = {
              name: existingDoc.file_name,
              dataUrl: null,
              storagePath: existingDoc.storage_path,
              status: existingDoc.status,
              rejectionReason: existingDoc.rejection_reason || null,
              isNewUpload: false,
            };
            continue;
          }
          await supabase.from('kyc_documents').delete().eq('id', existingDoc.id);
          await supabase.storage.from('kyc-documents').remove([existingDoc.storage_path]);
        }
        updatedKycDocs[type] = null;
        continue;
      }

      if (existingDoc && (existingDoc.status === 'verified' || existingDoc.status === 'rejected')) {
        console.log(`[KYC] Document ${type} is already ${existingDoc.status}; preserving existing record`);
        let signedUrl = null;
        if (existingDoc.storage_path) {
          const { data: signedData } = await supabase.storage
            .from('kyc-documents')
            .createSignedUrl(existingDoc.storage_path, 3600);
          signedUrl = signedData?.signedUrl || null;
        }
        updatedKycDocs[type] = {
          name: existingDoc.file_name,
          dataUrl: signedUrl,
          url: signedUrl,
          signedUrl,
          storagePath: existingDoc.storage_path,
          status: existingDoc.status,
          rejectionReason: existingDoc.rejection_reason || null,
          isNewUpload: false,
        };
        continue;
      }

      const isNew = doc.isNewUpload || Boolean(doc.file) || (typeof doc.dataUrl === 'string' && doc.dataUrl.startsWith('data:'));

      if (isNew) {
        const fileName = doc.name || `${type}_doc.jpg`;
        const mimeType = doc.type || (fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
        const storagePath = `${vendorId}/${type}_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

        const blob = await getUploadBlob(doc, mimeType);
        if (blob) {
          const { error: uploadErr } = await supabase.storage
            .from('kyc-documents')
            .upload(storagePath, blob, {
              contentType: mimeType,
              upsert: true,
            });
          if (uploadErr) {
            throw new Error(`Failed to upload ${type} document to storage: ${uploadErr.message}`);
          }
        }

        const fileSize = doc.file?.size || blob?.size || (doc.size ? parseInt(doc.size, 10) * 1024 : 102400);

        if (existingDoc) {
          const oldStoragePath = existingDoc.storage_path;
          const { error: updateErr } = await supabase
            .from('kyc_documents')
            .update({
              store_id: storeId || existingDoc.store_id || null,
              storage_path: storagePath,
              file_name: fileName,
              file_size_bytes: fileSize,
              mime_type: mimeType,
              uploaded_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingDoc.id)
            .eq('vendor_id', vendorId);

          if (updateErr) {
            console.error(`[KYC] Document metadata update failed (${type}) [Code: ${updateErr.code || 'UNKNOWN'}]:`, updateErr.message);
            throw updateErr;
          }

          await safeStorageCleanup({
            bucket: 'kyc-documents',
            oldPath: oldStoragePath,
            newPath: storagePath,
            ownerPrefix: vendorId,
            tableName: 'kyc_documents',
            currentRecordId: existingDoc.id,
          });
        } else {
          const { error: insertErr } = await supabase
            .from('kyc_documents')
            .insert({
              vendor_id: vendorId,
              store_id: storeId || null,
              document_type: type,
              storage_path: storagePath,
              file_name: fileName,
              file_size_bytes: fileSize,
              mime_type: mimeType,
              status: 'pending',
            });

          if (insertErr) {
            console.error(`[KYC] Failed to insert ${type} document metadata [Code: ${insertErr.code || 'UNKNOWN'}]:`, insertErr.message);
            if (
              insertErr.code === '23505' ||
              insertErr.message?.includes('duplicate key') ||
              insertErr.message?.includes('unique constraint')
            ) {
              console.log(`[KYC] Insert conflict for ${type}, updating existing row...`);
              const { data: conflictDoc, error: conflictLookupErr } = await supabase
                .from('kyc_documents')
                .select('id, storage_path, status, file_name, rejection_reason')
                .eq('vendor_id', vendorId)
                .eq('document_type', type)
                .maybeSingle();

              if (conflictLookupErr) {
                console.error(`[KYC] Conflict lookup failed for ${type} [Code: ${conflictLookupErr.code || 'UNKNOWN'}]:`, conflictLookupErr.message);
                throw new Error(`[KYC] Failed to resolve conflicting ${type} record: ${conflictLookupErr.message}`);
              }

              if (conflictDoc) {
                if (conflictDoc.status === 'verified' || conflictDoc.status === 'rejected') {
                  console.log(`[KYC] Conflicting record for ${type} is already ${conflictDoc.status}; preserving existing record`);
                  let conflictSignedUrl = null;
                  if (conflictDoc.storage_path) {
                    const { data: cSignedData } = await supabase.storage
                      .from('kyc-documents')
                      .createSignedUrl(conflictDoc.storage_path, 3600);
                    conflictSignedUrl = cSignedData?.signedUrl || null;
                  }
                  updatedKycDocs[type] = {
                    name: conflictDoc.file_name,
                    dataUrl: conflictSignedUrl,
                    url: conflictSignedUrl,
                    signedUrl: conflictSignedUrl,
                    storagePath: conflictDoc.storage_path,
                    status: conflictDoc.status,
                    rejectionReason: conflictDoc.rejection_reason || null,
                    isNewUpload: false,
                  };
                  continue;
                }

                const oldStoragePath = conflictDoc.storage_path;
                const { error: retryErr } = await supabase
                  .from('kyc_documents')
                  .update({
                    store_id: storeId || null,
                    storage_path: storagePath,
                    file_name: fileName,
                    file_size_bytes: fileSize,
                    mime_type: mimeType,
                    uploaded_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', conflictDoc.id)
                  .eq('vendor_id', vendorId);

                if (retryErr) {
                  console.error(`[KYC] Failed to update existing ${type} record [Code: ${retryErr.code || 'UNKNOWN'}]:`, retryErr.message);
                  throw new Error(`[KYC] Failed to update existing ${type} record: ${retryErr.message}`);
                }

                await safeStorageCleanup({
                  bucket: 'kyc-documents',
                  oldPath: oldStoragePath,
                  newPath: storagePath,
                  ownerPrefix: vendorId,
                  tableName: 'kyc_documents',
                  currentRecordId: conflictDoc.id,
                });
              } else {
                throw new Error(`[KYC] Failed to insert ${type} document metadata: ${insertErr.message}`);
              }
            } else {
              throw new Error(`[KYC] Failed to insert ${type} document metadata: ${insertErr.message}`);
            }
          }
        }

        const { data: signedData } = await supabase.storage
          .from('kyc-documents')
          .createSignedUrl(storagePath, 3600);
        const signedUrl = signedData?.signedUrl || null;

        updatedKycDocs[type] = {
          name: fileName,
          size: `${(fileSize / 1024).toFixed(1)} KB`,
          storagePath,
          signedUrl,
          url: signedUrl,
          dataUrl: signedUrl,
          type: mimeType,
          status: 'pending',
          isNewUpload: false,
        };
      } else {
        let signedUrl = doc.signedUrl || doc.url;
        if (!signedUrl && doc.storagePath) {
          const { data: signedData } = await supabase.storage
            .from('kyc-documents')
            .createSignedUrl(doc.storagePath, 3600);
          signedUrl = signedData?.signedUrl || null;
        }
        updatedKycDocs[type] = {
          ...doc,
          signedUrl,
          url: signedUrl,
          dataUrl: signedUrl,
          isNewUpload: false,
        };
      }
    }

    return { success: true, updatedKycDocs };
  },

  /**
   * Saves and uploads store photos to Supabase Storage and database.
   * @param {string} storeId
   * @param {object} photos
   */
  saveStorePhotos: async (storeId, { kitchenPhotos, storefrontPhoto, businessLogo }) => {
    if (!storeId) throw new Error('Store ID required');

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      throw new Error('[ONBOARDING] Authentication required. Please sign in via OTP before saving store photos.');
    }
    if (typeof window !== 'undefined' && !sessionOtpGate.isSessionOtpVerified(authData.user.id)) {
      throw new Error('Unauthorized: Phone OTP verification required before saving store photos.');
    }

    const { data: existingPhotos } = await supabase
      .from('store_photos')
      .select('*')
      .eq('store_id', storeId);

    const photoList = [];
    if (Array.isArray(kitchenPhotos)) {
      kitchenPhotos.forEach((photo, idx) => {
        photoList.push({
          photoType: 'kitchen',
          photo,
          displayOrder: idx,
          caption: `Kitchen Interior ${idx + 1}`,
        });
      });
    }

    photoList.push({
      photoType: 'storefront',
      photo: storefrontPhoto,
      displayOrder: 0,
      caption: 'Storefront Exterior',
    });

    photoList.push({
      photoType: 'logo',
      photo: businessLogo,
      displayOrder: 0,
      caption: 'Store Logo',
    });

    const updatedResult = {
      kitchenPhotos: [...(kitchenPhotos || [])],
      storefrontPhoto: null,
      businessLogo: null,
    };

    for (const item of photoList) {
      const { photoType, photo, displayOrder, caption } = item;
      const existingRecord = (existingPhotos || []).find(
        (p) => p.photo_type === photoType && p.display_order === displayOrder
      );

      if (!photo || (!photo.name && !photo.dataUrl && !photo.storagePath)) {
        if (existingRecord) {
          await supabase.from('store_photos').delete().eq('id', existingRecord.id);
          await supabase.storage.from('store-photos').remove([existingRecord.storage_path]);
        }
        if (photoType === 'storefront') updatedResult.storefrontPhoto = null;
        else if (photoType === 'logo') updatedResult.businessLogo = null;
        else if (photoType === 'kitchen') updatedResult.kitchenPhotos[displayOrder] = null;
        continue;
      }

      const isNew = photo.isNewUpload || Boolean(photo.file) || (typeof photo.dataUrl === 'string' && photo.dataUrl.startsWith('data:'));

      if (isNew) {
        const fileName = photo.name || `${photoType}_photo.jpg`;
        const mimeType = photo.type || 'image/jpeg';
        const storagePath = `${storeId}/${photoType}_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

        const blob = await getUploadBlob(photo, mimeType);
        if (blob) {
          const { error: uploadErr } = await supabase.storage
            .from('store-photos')
            .upload(storagePath, blob, {
              contentType: mimeType,
              upsert: true,
            });
          if (uploadErr) {
            throw new Error(`Failed to upload ${photoType} photo to storage: ${uploadErr.message}`);
          }
        }

        if (existingRecord) {
          const oldStoragePath = existingRecord.storage_path;
          const { error: updateErr } = await supabase
            .from('store_photos')
            .update({
              storage_path: storagePath,
              file_name: fileName,
              caption,
              display_order: displayOrder,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingRecord.id)
            .eq('store_id', storeId);

          if (updateErr) throw updateErr;

          await safeStorageCleanup({
            bucket: 'store-photos',
            oldPath: oldStoragePath,
            newPath: storagePath,
            ownerPrefix: storeId,
            tableName: 'store_photos',
            currentRecordId: existingRecord.id,
          });
        } else {
          const { error: insertErr } = await supabase
            .from('store_photos')
            .insert({
              store_id: storeId,
              photo_type: photoType,
              storage_path: storagePath,
              file_name: fileName,
              caption,
              display_order: displayOrder,
              is_verified: false,
            });

          if (insertErr) {
            if (insertErr.code === '23505') {
              await supabase
                .from('store_photos')
                .update({
                  storage_path: storagePath,
                  file_name: fileName,
                  caption,
                  updated_at: new Date().toISOString(),
                })
                .eq('store_id', storeId)
                .eq('photo_type', photoType)
                .eq('display_order', displayOrder);
            } else {
              throw insertErr;
            }
          }
        }

        const { data: publicData } = supabase.storage
          .from('store-photos')
          .getPublicUrl(storagePath);
        const publicUrl = publicData?.publicUrl || null;

        const photoObj = {
          id: existingRecord?.id || `photo-${Date.now()}`,
          name: fileName,
          size: 'Uploaded',
          caption,
          storagePath,
          publicUrl,
          url: publicUrl,
          dataUrl: publicUrl,
          type: mimeType,
          isNewUpload: false,
        };

        if (photoType === 'storefront') updatedResult.storefrontPhoto = photoObj;
        else if (photoType === 'logo') updatedResult.businessLogo = photoObj;
        else if (photoType === 'kitchen') updatedResult.kitchenPhotos[displayOrder] = photoObj;
      } else {
        let publicUrl = photo.publicUrl || photo.url;
        if (!publicUrl && photo.storagePath) {
          const { data: publicData } = supabase.storage
            .from('store-photos')
            .getPublicUrl(photo.storagePath);
          publicUrl = publicData?.publicUrl || null;
        }
        const photoObj = {
          ...photo,
          publicUrl,
          url: publicUrl,
          dataUrl: publicUrl,
          isNewUpload: false,
        };
        if (photoType === 'storefront') updatedResult.storefrontPhoto = photoObj;
        else if (photoType === 'logo') updatedResult.businessLogo = photoObj;
        else if (photoType === 'kitchen') updatedResult.kitchenPhotos[displayOrder] = photoObj;
      }
    }

    return { success: true, updatedPhotos: updatedResult };
  },
};


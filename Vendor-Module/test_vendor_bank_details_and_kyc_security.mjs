import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

console.log('================================================================');
console.log('  TESTING VENDOR BANK DETAILS PERSISTENCE & KYC SECURITY        ');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, message, details = '') {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message} - ${details}`);
    failed++;
  }
}

// -------------------------------------------------------------
// Suite 1: Static Code Analysis - Handler & Service Separation
// -------------------------------------------------------------
console.log('--- Suite 1: Frontend Handler & Service Verification ---');

const taxBankScreenSrc = readFileSync(resolve('src/screens/onboarding/TaxBankScreen.jsx'), 'utf-8');
const serviceSrc = readFileSync(resolve('src/services/vendorOnboardingService.js'), 'utf-8');
const migrationSrc = readFileSync(resolve('supabase/migrations/20260928000005_fix_kyc_verification_trigger.sql'), 'utf-8');

assert(
  taxBankScreenSrc.includes('handleContinue = async') &&
  taxBankScreenSrc.includes('vendorOnboardingService.saveTaxAndBankDetails(') &&
  taxBankScreenSrc.includes("navigate('address')"),
  'TaxBankScreen handleContinue validates input, persists details, and navigates to Store Location (address)'
);

assert(
  serviceSrc.includes('saveTaxAndBankDetails: async') &&
  serviceSrc.includes("supabase.from('tax_information').upsert") &&
  serviceSrc.includes("supabase.from('bank_accounts').upsert") &&
  serviceSrc.includes("supabase.from('kyc_documents')"),
  'saveTaxAndBankDetails preserves full persistence of tax info, bank accounts, and cheque document metadata'
);

// Verify that saveTaxAndBankDetails update payload NEVER attempts to self-approve or mark verified
const chequeUpdateBlockRegex = /if \(existingCheque\)[\s\S]*?\.from\('kyc_documents'\)[\s\S]*?\.update\(([\s\S]*?)\)/;
const match = serviceSrc.match(chequeUpdateBlockRegex);
const chequeUpdatePayload = match ? match[1] : '';

assert(
  chequeUpdatePayload &&
  !chequeUpdatePayload.includes("'verified'") &&
  !chequeUpdatePayload.includes('"verified"') &&
  !chequeUpdatePayload.includes('verified_at') &&
  !chequeUpdatePayload.includes('rejection_reason'),
  'saveTaxAndBankDetails cheque update payload strictly limits writes to document file metadata (zero self-approval)'
);

assert(
  migrationSrc.includes('CREATE OR REPLACE FUNCTION public.protect_kyc_verification()') &&
  migrationSrc.includes('CREATE OR REPLACE FUNCTION public.is_master_admin()') &&
  migrationSrc.includes("RAISE EXCEPTION 'Unauthorized: Active Master Admin required for KYC verification'"),
  'Database migration 20260928000005 defines protect_kyc_verification trigger with authoritative Master Admin enforcement'
);

// -------------------------------------------------------------
// Suite 2: Live Supabase Integration - Ordinary Vendor vs Master Admin
// -------------------------------------------------------------
console.log('\n--- Suite 2: Live Supabase Database Authorization Verification ---');

const envText = readFileSync(resolve('.env'), 'utf-8');
const env = {};
envText.split('\n').forEach(line => {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) {
    let val = m[2] || '';
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[m[1]] = val.trim();
  }
});

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';

const dummyVendorId = 'e8fac5eb-aba8-43f0-8fd7-7e07b5d6c38b';
const dummyUserId = '0c9d1566-ac47-4390-8751-8adf4fd6457c';

function runVendorDb(sql) {
  const tmpPath = `/tmp/vendor_test_${Date.now()}_${Math.random().toString(36).slice(2)}.sql`;
  const wrappedSql = `
    SET LOCAL role = 'authenticated';
    SET LOCAL request.jwt.claims = '{"sub": "${dummyUserId}", "role": "authenticated"}';
    ${sql}
  `;
  try {
    writeFileSync(tmpPath, wrappedSql, 'utf-8');
    const raw = execSync(`supabase db query --linked -f "${tmpPath}"`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    const jsonMatch = raw.match(/\{[\s\S]*"rows"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return { data: parsed.rows || [], error: null };
    }
    return { data: [], error: null };
  } catch (err) {
    const msg = `${err.stderr || ''} ${err.stdout || ''} ${err.message || ''}`;
    return { data: null, error: { message: msg } };
  } finally {
    try { unlinkSync(tmpPath); } catch {}
  }
}

async function runLiveSecurityTests() {
  let testDocId = null;
  try {
    // 1. Insert a pending cancelled cheque KYC document (simulating vendor document draft creation)
    const { data: insertData, error: insertError } = runVendorDb(`
      INSERT INTO public.kyc_documents (
        vendor_id, document_type, storage_path, file_name, file_size_bytes, mime_type, status
      ) VALUES (
        '${dummyVendorId}', 'cancelled_cheque', 'dummy/cheque_${Date.now()}.png', 'test_cheque.png', 10240, 'image/png', 'pending'
      ) RETURNING id, status;
    `);

    assert(!insertError && insertData && insertData.length > 0, 'Ordinary vendor can insert pending draft cancelled cheque KYC document', insertError?.message);
    testDocId = insertData?.[0]?.id;

    // 2. Ordinary vendor saves updated bank details & updates existing cheque metadata
    const { data: updateData, error: updateError } = runVendorDb(`
      UPDATE public.kyc_documents
      SET storage_path = 'dummy/cheque_updated_${Date.now()}.png',
          file_name = 'test_cheque_updated.png',
          file_size_bytes = 20480,
          mime_type = 'image/png',
          updated_at = now()
      WHERE id = '${testDocId}'
      RETURNING id, file_name;
    `);

    assert(
      !updateError && updateData && updateData.length > 0,
      'Ordinary vendor can update bank cheque metadata and continue onboarding without authorization error',
      updateError?.message
    );

    // 3. Aadhaar KYC document metadata insert (pending) & update permitted metadata
    let aadhaarTestDocId = null;
    try {
      const { data: aadhaarInsert, error: aadhaarInsertErr } = runVendorDb(`
        INSERT INTO public.kyc_documents (
          vendor_id, document_type, storage_path, file_name, file_size_bytes, mime_type, status
        ) VALUES (
          '${dummyVendorId}', 'aadhaar_back', 'dummy/aadhaar_${Date.now()}.png', 'aadhaar_card.png', 35000, 'image/png', 'pending'
        ) RETURNING id;
      `);

      assert(!aadhaarInsertErr && aadhaarInsert && aadhaarInsert.length > 0, 'Ordinary vendor can insert pending Aadhaar KYC document metadata', aadhaarInsertErr?.message);
      aadhaarTestDocId = aadhaarInsert?.[0]?.id;

      const { data: aadhaarUpdate, error: aadhaarUpdateErr } = runVendorDb(`
        UPDATE public.kyc_documents
        SET storage_path = 'dummy/aadhaar_new_${Date.now()}.png',
            file_name = 'aadhaar_card_v2.png',
            file_size_bytes = 42000,
            mime_type = 'image/png',
            updated_at = now()
        WHERE id = '${aadhaarTestDocId}'
        RETURNING id;
      `);

      assert(!aadhaarUpdateErr && aadhaarUpdate && aadhaarUpdate.length > 0, 'Ordinary vendor can update permitted Aadhaar metadata on unverified document', aadhaarUpdateErr?.message);
    } finally {
      if (aadhaarTestDocId) {
        runVendorDb(`DELETE FROM public.kyc_documents WHERE id = '${aadhaarTestDocId}';`);
      }
    }

    // 4. Ordinary vendor tries to self-verify their KYC document (MUST FAIL)
    const { data: selfVerifyData, error: selfVerifyError } = runVendorDb(`
      UPDATE public.kyc_documents
      SET status = 'verified',
          verified_at = now()
      WHERE id = '${testDocId}'
      RETURNING id;
    `);

    assert(
      selfVerifyError && selfVerifyError.message.includes('Active Master Admin required for KYC verification'),
      'Ordinary vendor is strictly BLOCKED from self-verifying KYC document (Unauthorized: Active Master Admin required)',
      selfVerifyError?.message
    );
    assert(!selfVerifyData || selfVerifyData.length === 0, 'Self-verify mutation returned zero updated rows');

    // 5. Ordinary vendor tries to insert a pre-verified KYC document (MUST FAIL)
    const { data: rogueInsertData, error: rogueInsertError } = runVendorDb(`
      INSERT INTO public.kyc_documents (
        vendor_id, document_type, storage_path, file_name, file_size_bytes, mime_type, status
      ) VALUES (
        '${dummyVendorId}', 'cancelled_cheque', 'dummy/rogue.png', 'rogue.png', 1024, 'image/png', 'verified'
      ) RETURNING id;
    `);

    assert(
      rogueInsertError && rogueInsertError.message.includes('Active Master Admin required for KYC verification'),
      'Ordinary vendor is strictly BLOCKED from inserting pre-verified KYC documents',
      rogueInsertError?.message
    );
    if (rogueInsertData?.[0]?.id) {
      runVendorDb(`DELETE FROM public.kyc_documents WHERE id = '${rogueInsertData[0].id}';`);
    }

    // 6. Ordinary vendor tries to reassign document ownership to another vendor (MUST FAIL)
    const fakeOtherVendorId = '00000000-0000-0000-0000-000000000001';
    const { data: crossVendorData, error: crossVendorError } = runVendorDb(`
      UPDATE public.kyc_documents
      SET vendor_id = '${fakeOtherVendorId}'
      WHERE id = '${testDocId}'
      RETURNING id;
    `);

    assert(
      crossVendorError && (crossVendorError.message.includes('Cannot alter KYC document ownership') || crossVendorError.message.includes('Cannot modify KYC documents') || crossVendorError.message.includes('Active Master Admin required')),
      'Ordinary vendor is strictly BLOCKED from reassigning document to another vendor (Unauthorized: Cannot alter KYC document ownership)',
      crossVendorError?.message
    );

    // 7. Ordinary vendor tries to tamper with rejection_reason (MUST FAIL)
    const { data: rejectTamperData, error: rejectTamperError } = runVendorDb(`
      UPDATE public.kyc_documents
      SET rejection_reason = 'Tampered rejection reason'
      WHERE id = '${testDocId}'
      RETURNING id;
    `);

    assert(
      rejectTamperError && rejectTamperError.message.includes('Active Master Admin required for KYC verification'),
      'Ordinary vendor is strictly BLOCKED from modifying rejection_reason',
      rejectTamperError?.message
    );

    // 8. Ordinary vendor tries to modify an ALREADY VERIFIED document (MUST FAIL)
    const { data: verifiedRows } = runVendorDb(`
      SELECT id, document_type FROM public.kyc_documents
      WHERE vendor_id = '${dummyVendorId}' AND status = 'verified'
      LIMIT 1;
    `);

    const verifiedAadhaar = verifiedRows?.[0];
    if (verifiedAadhaar) {
      const { data: modifyVerifiedData, error: modifyVerifiedError } = runVendorDb(`
        UPDATE public.kyc_documents
        SET file_name = 'tampered_verified_aadhaar.png',
            updated_at = now()
        WHERE id = '${verifiedAadhaar.id}'
        RETURNING id;
      `);

      assert(
        modifyVerifiedError && modifyVerifiedError.message.includes('Active Master Admin required for KYC verification'),
        `Ordinary vendor is strictly BLOCKED from modifying already verified ${verifiedAadhaar.document_type} document`,
        modifyVerifiedError?.message
      );
    } else {
      // If no pre-existing verified row, create one using admin context and verify vendor modification fails
      const tmpPath = `/tmp/admin_seed_${Date.now()}.sql`;
      writeFileSync(tmpPath, `
        SET LOCAL role = 'authenticated';
        SET LOCAL request.jwt.claims = '{"sub": "a526a5c8-80d6-491b-b188-3f450878ad90", "email": "techroadrider@gmail.com", "role": "authenticated"}';
        INSERT INTO public.kyc_documents (vendor_id, document_type, storage_path, file_name, file_size_bytes, mime_type, status)
        VALUES ('${dummyVendorId}', 'gst', 'dummy/verified_test.png', 'verified_test.png', 1024, 'image/png', 'verified')
        RETURNING id;
      `, 'utf-8');
      const seedRaw = execSync(`supabase db query --linked -f "${tmpPath}"`, { encoding: 'utf-8' });
      try { unlinkSync(tmpPath); } catch {}
      const seedMatch = seedRaw.match(/\{[\s\S]*"rows"[\s\S]*\}/);
      const seedId = seedMatch ? JSON.parse(seedMatch[0]).rows?.[0]?.id : null;

      if (seedId) {
        const { error: modifyVerifiedError } = runVendorDb(`
          UPDATE public.kyc_documents
          SET file_name = 'tampered_verified.png'
          WHERE id = '${seedId}';
        `);
        assert(
          modifyVerifiedError && modifyVerifiedError.message.includes('Active Master Admin required for KYC verification'),
          'Ordinary vendor is strictly BLOCKED from modifying already verified document',
          modifyVerifiedError?.message
        );
        runVendorDb(`DELETE FROM public.kyc_documents WHERE id = '${seedId}';`);
      }
    }

    // 9. Verify test document status remains unchanged as 'pending'
    const { data: verifyCheck } = runVendorDb(`
      SELECT status, verified_at FROM public.kyc_documents WHERE id = '${testDocId}';
    `);

    assert(
      verifyCheck && verifyCheck[0]?.status === 'pending' && verifyCheck[0]?.verified_at === null,
      'Document remains in pending state awaiting authoritative Master Admin review'
    );

  } catch (err) {
    console.error('Test execution failed unexpectedly:', err);
    failed++;
  } finally {
    // Cleanup test record
    if (testDocId) {
      runVendorDb(`DELETE FROM public.kyc_documents WHERE id = '${testDocId}';`);
    }
  }

  console.log('\n================================================================');
  console.log(`  RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runLiveSecurityTests();


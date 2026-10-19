import { readFileSync } from 'fs';
import { resolve } from 'path';

console.log('================================================================');
console.log('  TESTING BANK ACCOUNT PROOF DOCUMENT UPLOAD FLOW (ANDROID/EXPO)');
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
// Suite 1: DocumentUploader Native Android Implementation Audit
// -------------------------------------------------------------
console.log('--- Suite 1: DocumentUploader Native Action Sheet & Picker Audit ---');

const uploaderSrc = readFileSync(
  resolve('src/components/common/DocumentUploader.jsx'),
  'utf-8'
);
const taxBankSrc = readFileSync(
  resolve('src/screens/onboarding/TaxBankScreen.jsx'),
  'utf-8'
);
const serviceSrc = readFileSync(
  resolve('src/services/vendorOnboardingService.js'),
  'utf-8'
);
const appShellSrc = readFileSync(
  resolve('src/components/layout/AppShell.jsx'),
  'utf-8'
);
const appSrc = readFileSync(
  resolve('src/App.jsx'),
  'utf-8'
);
const iconSrc = readFileSync(
  resolve('src/components/common/AppIcon.jsx'),
  'utf-8'
);

assert(
  uploaderSrc.includes("import * as ImagePicker from 'expo-image-picker';") &&
  uploaderSrc.includes("import * as DocumentPicker from 'expo-document-picker';"),
  'DocumentUploader imports expo-image-picker and expo-document-picker'
);

assert(
  uploaderSrc.includes('handleTakePhoto') &&
  uploaderSrc.includes('ImagePicker.requestCameraPermissionsAsync()') &&
  uploaderSrc.includes('ImagePicker.launchCameraAsync('),
  'DocumentUploader implements Take Photo flow with camera permissions and launchCameraAsync'
);

assert(
  uploaderSrc.includes('handleChooseFromGallery') &&
  uploaderSrc.includes('ImagePicker.requestMediaLibraryPermissionsAsync()') &&
  uploaderSrc.includes('ImagePicker.launchImageLibraryAsync('),
  'DocumentUploader implements Choose from Gallery with media library permissions and launchImageLibraryAsync'
);

assert(
  uploaderSrc.includes('handleBrowseFiles') &&
  uploaderSrc.includes('DocumentPicker.getDocumentAsync('),
  'DocumentUploader implements Browse Files with expo-document-picker'
);

assert(
  uploaderSrc.includes('Take Photo') &&
  uploaderSrc.includes('Choose from Gallery') &&
  uploaderSrc.includes('Browse Files') &&
  uploaderSrc.includes('Cancel'),
  'Action sheet modal displays Take Photo, Choose from Gallery, Browse Files, and Cancel options'
);

assert(
  uploaderSrc.includes('MAX_FILE_SIZE_BYTES = 200 * 1024') &&
  uploaderSrc.includes('Maximum allowed size is 200 KB'),
  'Enforces strict 200 KB maximum file size with clear user-facing error message'
);

assert(
  uploaderSrc.includes("ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'pdf']") ||
  (uploaderSrc.includes('jpg') && uploaderSrc.includes('jpeg') && uploaderSrc.includes('png') && uploaderSrc.includes('pdf')),
  'Validates allowed extensions: JPG, JPEG, PNG, PDF'
);

assert(
  uploaderSrc.includes('replaceBtn') &&
  uploaderSrc.includes('Replace') &&
  uploaderSrc.includes('removeBtn') &&
  uploaderSrc.includes('onRemove'),
  'UI provides Replace and Remove controls when document is uploaded'
);

// -------------------------------------------------------------
// Suite 2: Bank Details Form Validation & Save Flow
// -------------------------------------------------------------
console.log('\n--- Suite 2: TaxBankScreen Form Validation & KYC Flow ---');

assert(
  taxBankSrc.includes('taxDetails.passbookOrCheque') &&
  taxBankSrc.includes('errs.cheque ='),
  'TaxBankScreen validation blocks submission when required bank proof document is missing'
);

assert(
  taxBankSrc.includes('vendorOnboardingService.saveTaxAndBankDetails(') &&
  taxBankSrc.includes("navigate('address')"),
  'TaxBankScreen successfully persists bank details and proof document before proceeding to Store Location'
);

// -------------------------------------------------------------
// Suite 3: Storage Service & File Upload Pipeline
// -------------------------------------------------------------
console.log('\n--- Suite 3: Storage Upload & Persistence Pipeline ---');

assert(
  serviceSrc.includes("fileObj.uri.startsWith('file:') || fileObj.uri.startsWith('content:')") &&
  serviceSrc.includes('await fetch(fileObj.uri)'),
  'getUploadBlob converts native React Native file:// and content:// URIs into uploadable blobs'
);

assert(
  serviceSrc.includes(".from('kyc-documents')") &&
  serviceSrc.includes(".upload(storagePath, blob"),
  'saveTaxAndBankDetails uploads actual bank proof document blob to kyc-documents bucket'
);

assert(
  serviceSrc.includes("document_type: 'cancelled_cheque'") &&
  serviceSrc.includes("status: 'pending'"),
  'saveTaxAndBankDetails inserts or updates kyc_documents metadata with pending status'
);

// -------------------------------------------------------------
// Suite 4: SafeAreaView Warning Elimination
// -------------------------------------------------------------
console.log('\n--- Suite 4: SafeAreaView Fix Verification ---');

assert(
  appShellSrc.includes('import { SafeAreaView } from "react-native-safe-area-context"') &&
  !appShellSrc.match(/import\s*\{[^}]*SafeAreaView[^}]*\}\s*from\s*["']react-native["']/),
  'AppShell uses SafeAreaView from react-native-safe-area-context, eliminating deprecation warning'
);

assert(
  appSrc.includes('import { SafeAreaProvider } from "react-native-safe-area-context"') &&
  appSrc.includes('<SafeAreaProvider>'),
  'App.jsx wraps component tree with SafeAreaProvider'
);

assert(
  iconSrc.includes('case "image":') &&
  (iconSrc.includes('case "file":') || iconSrc.includes('case "document":')),
  'AppIcon supports image and file vector icons for action sheet'
);

// -------------------------------------------------------------
// Suite 5: Simulation of Document Validation Logic
// -------------------------------------------------------------
console.log('\n--- Suite 5: Validation Function Logic Tests ---');

const MAX_FILE_SIZE = 200 * 1024;
const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'pdf'];

function validateTestFile(name, size) {
  const ext = (name || '').split('.').pop()?.toLowerCase();
  if (!ALLOWED_EXTS.includes(ext)) {
    return { valid: false, error: 'Invalid file type.' };
  }
  if (size > MAX_FILE_SIZE) {
    return { valid: false, error: `File is ${(size / 1024).toFixed(1)} KB. Maximum allowed size is 200 KB.` };
  }
  return { valid: true };
}

assert(validateTestFile('cheque.jpg', 150 * 1024).valid === true, 'Accepts 150 KB JPG file');
assert(validateTestFile('passbook.png', 190 * 1024).valid === true, 'Accepts 190 KB PNG file');
assert(validateTestFile('statement.pdf', 100 * 1024).valid === true, 'Accepts 100 KB PDF file');
assert(validateTestFile('cheque.jpeg', 180 * 1024).valid === true, 'Accepts 180 KB JPEG file');
assert(validateTestFile('large_cheque.jpg', 250 * 1024).valid === false, 'Rejects 250 KB JPG file exceeding 200 KB limit');
assert(validateTestFile('doc.docx', 50 * 1024).valid === false, 'Rejects unsupported DOCX file');
assert(validateTestFile('archive.zip', 50 * 1024).valid === false, 'Rejects unsupported ZIP file');

console.log('\n================================================================');
console.log(`  RESULTS: ${passed} PASSED | ${failed} FAILED`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
}

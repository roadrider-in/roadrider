import { chromium } from 'playwright';
import { resolve } from 'path';

const ARTIFACT_DIR = '/Users/ommlenka/.gemini/antigravity-ide/brain/33232cd1-d706-4430-a37a-1cbb8c0dab2d';

async function capture() {
  console.log('Launching Playwright Chromium...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 850 },
  });
  const page = await context.newPage();

  // 1. Splash screen
  console.log('Navigating to http://localhost:8443/...');
  await page.goto('http://localhost:8443/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: resolve(ARTIFACT_DIR, '01_welcome_splash.png') });
  console.log('Captured 01_welcome_splash.png');

  // Set vendor role in sessionStorage so guards allow onboarding inspection
  await page.evaluate(() => {
    sessionStorage.setItem('rr_vendor_role', 'restaurant');
  });

  // 2. Choose Business screen
  await page.goto('http://localhost:8443/onboarding/business-type', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: resolve(ARTIFACT_DIR, '02_choose_business.png') });
  console.log('Captured 02_choose_business.png');

  // 3. Business Details Screen (Clean Empty State)
  await page.goto('http://localhost:8443/onboarding/business-details', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: resolve(ARTIFACT_DIR, '03_business_details_clean_empty.png') });
  console.log('Captured 03_business_details_clean_empty.png');

  // 4. Tax & Bank Screen (Clean Empty State)
  await page.goto('http://localhost:8443/onboarding/tax-bank', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: resolve(ARTIFACT_DIR, '04_tax_bank_clean_empty.png') });
  console.log('Captured 04_tax_bank_clean_empty.png');

  // 5. KYC Documents Screen (Clean Empty Upload Cards)
  await page.goto('http://localhost:8443/onboarding/kyc', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: resolve(ARTIFACT_DIR, '05_kyc_clean_empty.png') });
  console.log('Captured 05_kyc_clean_empty.png');

  // 6. Store Photos Screen (Clean Empty Kitchen & Storefront Slots)
  await page.goto('http://localhost:8443/onboarding/store-photos', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: resolve(ARTIFACT_DIR, '06_store_photos_clean_empty.png') });
  console.log('Captured 06_store_photos_clean_empty.png');

  // 7. Terms & Agreement Screen
  await page.goto('http://localhost:8443/onboarding/agreement', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: resolve(ARTIFACT_DIR, '07_terms_agreement.png') });
  console.log('Captured 07_terms_agreement.png');

  // 8. Verification Pending Screen (No simulation button, real polling)
  await page.goto('http://localhost:8443/onboarding/verification-pending', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: resolve(ARTIFACT_DIR, '08_verification_pending_no_simulation.png') });
  console.log('Captured 08_verification_pending_no_simulation.png');

  await browser.close();
  console.log('ALL SCREENSHOTS CAPTURED SUCCESSFULLY!');
}

capture().catch((err) => {
  console.error('Capture error:', err);
  process.exit(1);
});

import { chromium } from 'playwright';
import { createServer } from 'vite';
import { resolve } from 'path';

async function verify() {
  console.log('================================================================');
  console.log('  VERIFYING DASHBOARD & APP RUNTIME RENDERING (PLAYWRIGHT)     ');
  console.log('================================================================\n');

  // Start Vite dev server programmatically
  console.log('Starting Vite server...');
  const server = await createServer({
    configFile: resolve('vite.config.ts'),
    server: { port: 8443 },
  });
  await server.listen();
  const address = server.httpServer?.address();
  const port = typeof address === 'object' && address ? address.port : 8443;
  console.log(`Vite server listening on port ${port}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  const pageErrors = [];
  const consoleErrors = [];

  page.on('pageerror', (err) => {
    console.error('  [PAGE ERROR DETECTED]', err.message);
    pageErrors.push(err.message);
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('  [CONSOLE ERROR]', msg.text());
      consoleErrors.push(msg.text());
    }
  });

  let allChecksPassed = true;

  // 1. Visit Root / Splash
  console.log('\n--- 1. Testing Root / Splash Route (http://localhost:' + port + '/) ---');
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const errorBoundaryText = await page.evaluate(() => {
    const el = document.body.innerText;
    return el.includes('Can\'t find variable: loadVendorStores') ||
           el.includes('loadVendorStores is not defined');
  });

  if (errorBoundaryText) {
    console.error('  [FAIL] Splash route displayed Error Boundary with loadVendorStores error!');
    allChecksPassed = false;
  } else {
    console.log('  [PASS] Splash route loaded cleanly without loadVendorStores error');
  }

  // 2. Visit /signin
  console.log('\n--- 2. Testing /signin Route ---');
  await page.goto(`http://localhost:${port}/signin`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const signinHasError = await page.evaluate(() => {
    const el = document.body.innerText;
    return el.includes('Can\'t find variable: loadVendorStores') ||
           el.includes('loadVendorStores is not defined');
  });

  if (signinHasError) {
    console.error('  [FAIL] /signin route displayed Error Boundary with loadVendorStores error!');
    allChecksPassed = false;
  } else {
    console.log('  [PASS] /signin route loaded cleanly without loadVendorStores error');
  }

  // 3. Visit /dashboard (Unverified - Should redirect cleanly to OTP/phone guard without crashing VendorProvider)
  console.log('\n--- 3. Testing /dashboard Route (Unverified OTP Gate) ---');
  await page.goto(`http://localhost:${port}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const dashboardUnverifiedHasError = await page.evaluate(() => {
    const el = document.body.innerText;
    return el.includes('Can\'t find variable: loadVendorStores') ||
           el.includes('loadVendorStores is not defined') ||
           el.includes('An error occurred while loading this view');
  });

  if (dashboardUnverifiedHasError) {
    console.error('  [FAIL] /dashboard route triggered Error Boundary on unverified access!');
    allChecksPassed = false;
  } else {
    console.log('  [PASS] /dashboard route handled OTP gate cleanly without Error Boundary');
  }

  // 4. Test Verified State on Dashboard
  console.log('\n--- 4. Testing Verified State on Protected Screens ---');
  await page.evaluate(() => {
    sessionStorage.setItem('rr_vendor_role', 'restaurant');
    sessionStorage.setItem('rr_current_screen', 'restaurant-home');
  });

  await page.goto(`http://localhost:${port}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const errorBoundaryOnProtected = await page.evaluate(() => {
    const el = document.body.innerText;
    return el.includes('Can\'t find variable: loadVendorStores') ||
           el.includes('loadVendorStores is not defined');
  });

  if (errorBoundaryOnProtected) {
    console.error('  [FAIL] Error Boundary caught loadVendorStores exception!');
    allChecksPassed = false;
  } else {
    console.log('  [PASS] Protected routes and VendorProvider mounted with zero loadVendorStores exceptions');
  }

  // 5. Check all collected errors
  const loadVendorStoresErrors = pageErrors.filter(e => e.includes('loadVendorStores'));
  if (loadVendorStoresErrors.length > 0) {
    console.error('  [FAIL] Uncaught loadVendorStores errors:', loadVendorStoresErrors);
    allChecksPassed = false;
  } else {
    console.log('  [PASS] Zero loadVendorStores runtime exceptions across all visited pages');
  }

  await browser.close();
  await server.close();

  console.log('\n================================================================');
  if (allChecksPassed) {
    console.log('  ALL BROWSER RUNTIME CHECKS PASSED SUCCESSFULLY!               ');
  } else {
    console.error('  BROWSER RUNTIME CHECKS FAILED!                                ');
    process.exit(1);
  }
  console.log('================================================================\n');
}

verify().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});

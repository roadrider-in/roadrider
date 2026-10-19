import { readFileSync } from "fs"
import { resolve } from "path"

console.log("================================================================")
console.log("  TESTING WELCOME SCREEN REDESIGN & BUSINESS TYPE GUARDS        ")
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

// -------------------------------------------------------------
// Suite 1: SplashScreen Redesign Audit
// -------------------------------------------------------------
console.log("--- Suite 1: Welcome Screen (SplashScreen.jsx) Audit ---")
const splashSrc = readFileSync(
  resolve("src/screens/onboarding/SplashScreen.jsx"),
  "utf-8",
)

assert(
  splashSrc.includes(
    "import welcomeHeroImg from '../../assets/images/welcome-hero.jpg';",
  ),
  "SplashScreen imports high-quality restaurant/vendor hero photograph",
)

assert(
  splashSrc.includes("heroOverlayGradient") &&
    (splashSrc.includes("#064E3B") || splashSrc.includes("#059669")),
  "SplashScreen includes subtle green visual treatment overlay on hero photography",
)

assert(
  splashSrc.includes("<AppLogo") &&
    splashSrc.includes("from '../../components/common/AppLogo'"),
  "SplashScreen uses official RoadRider AppLogo asset without approximation or replacement",
)

assert(
  splashSrc.includes("Run your business.{'\\n'}We’ll move the rest.") ||
    splashSrc.includes("Run your business.\nWe’ll move the rest."),
  "SplashScreen displays exact existing welcome tagline",
)

assert(
  splashSrc.includes("navigate('role')") &&
    splashSrc.includes("Get Started as New Partner"),
  'SplashScreen provides "Get Started as New Partner" action navigating to role selection',
)

assert(
  splashSrc.includes("navigate('signin')") &&
    splashSrc.includes("Sign In with OTP"),
  'SplashScreen provides "Sign In with OTP" action navigating to signin',
)

assert(
  splashSrc.includes("isMobile") &&
    splashSrc.includes("desktopCard") &&
    splashSrc.includes("mobileHeroContainer"),
  "SplashScreen includes dedicated responsive desktop/tablet and mobile layouts",
)

// -------------------------------------------------------------
// Suite 2: OnboardingContext State Management & Persistence
// -------------------------------------------------------------
console.log("\n--- Suite 2: OnboardingContext State Management ---")
const contextSrc = readFileSync(
  resolve("src/context/OnboardingContext.jsx"),
  "utf-8",
)

assert(
  contextSrc.includes("sessionStorage.getItem('rr_vendor_role')") &&
    contextSrc.includes("return null;"),
  "vendorRole defaults to null when starting fresh without saved selection",
)

assert(
  contextSrc.includes("sessionStorage.setItem('rr_vendor_role', role)") &&
    contextSrc.includes("sessionStorage.removeItem('rr_vendor_role')"),
  "setVendorRole persists valid role to sessionStorage and cleans up on null",
)

assert(
  contextSrc.includes(
    "businessType: role === 'grocery' ? 'Grocery' : role === 'restaurant' ? 'Restaurant' : ''",
  ),
  "setVendorRole synchronizes businessDetails.businessType with selected role",
)

assert(
  contextSrc.includes("setVendorRole(null)"),
  "resetOnboarding resets vendorRole to null",
)

// -------------------------------------------------------------
// Suite 3: ChooseBusinessScreen Enforced Selection UI
// -------------------------------------------------------------
console.log("\n--- Suite 3: ChooseBusinessScreen Enforced Selection ---")
const chooseSrc = readFileSync(
  resolve("src/screens/onboarding/ChooseBusinessScreen.jsx"),
  "utf-8",
)

assert(
  chooseSrc.includes(
    "useState(\n    vendorRole === 'restaurant' || vendorRole === 'grocery' ? vendorRole : null\n  )",
  ) ||
    chooseSrc.includes("vendorRole ===") ||
    chooseSrc.includes("setSelectedRole"),
  "ChooseBusinessScreen initializes selection with null by default",
)

assert(
  chooseSrc.includes("disabled={!selectedRole}"),
  "ChooseBusinessScreen explicitly disables continue action when neither option is selected",
)

assert(
  chooseSrc.includes("roleCardSelected") && chooseSrc.includes("#059669"),
  "ChooseBusinessScreen renders prominent green visual indication for selected option",
)

assert(
  chooseSrc.includes("radioIndicatorSelected"),
  "ChooseBusinessScreen renders active checkmark/radio indicator on selected role",
)

assert(
  chooseSrc.includes("handleContinue") &&
    chooseSrc.includes("navigate('phone')") &&
    chooseSrc.includes("setVendorRole(selectedRole)"),
  "ChooseBusinessScreen handleContinue commits selection to state and navigates to phone verification",
)

// -------------------------------------------------------------
// Suite 4: Navigation Guards Against Bypass & Portal Isolation
// -------------------------------------------------------------
console.log("\n--- Suite 4: Navigation Guarding & Route Validation ---")
const navSrc = readFileSync(
  resolve("src/navigation/RootNavigator.jsx"),
  "utf-8",
)
const shellSrc = readFileSync(
  resolve("src/components/layout/DesktopOnboardingShell.jsx"),
  "utf-8",
)

assert(
  navSrc.includes("SUBSEQUENT_ONBOARDING_STEPS") &&
    navSrc.includes(
      "SUBSEQUENT_ONBOARDING_STEPS.includes(currentScreen) && !vendorRole",
    ),
  "RootNavigator includes useEffect navigation guard redirecting unselected users to role",
)

assert(
  navSrc.includes(
    "if (SUBSEQUENT_ONBOARDING_STEPS.includes(currentScreen) && !vendorRole) {\n      return <ChooseBusinessScreen />;",
  ) || navSrc.includes("return <ChooseBusinessScreen />;"),
  "RootNavigator renderScreen provides immediate render guard preventing unauthorized step rendering",
)

assert(
  shellSrc.includes("if (stepId !== 'role' && !vendorRole) {") &&
    shellSrc.includes("navigate('role');"),
  "DesktopOnboardingShell stepper blocks skipping ahead when vendorRole is not selected",
)

assert(
  shellSrc.includes("handlePortalPress") &&
    shellSrc.includes("if (!vendorRole) {\n      navigate('role');"),
  "DesktopOnboardingShell portal jump button guards against unselected vendorRole",
)

assert(
  navSrc.includes("RESTAURANT_PORTAL_SCREENS") &&
    navSrc.includes("GROCERY_PORTAL_SCREENS") &&
    navSrc.includes(
      "activeRole === 'restaurant' && GROCERY_PORTAL_SCREENS.includes(currentScreen)",
    ) &&
    navSrc.includes(
      "activeRole === 'grocery' && RESTAURANT_PORTAL_SCREENS.includes(currentScreen)",
    ),
  "RootNavigator strictly preserves portal isolation between Restaurant and Grocery vendors",
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

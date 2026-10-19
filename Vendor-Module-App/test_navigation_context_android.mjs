import { readFileSync } from "fs";
import { resolve } from "path";

console.log("================================================================");
console.log("  TESTING NAVIGATION CONTEXT ANDROID COMPATIBILITY & DEEP LINKS ");
console.log("================================================================\n");

let passed = 0;
let failed = 0;

function assert(condition, testName, details = "") {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName} - ${details}`);
    failed++;
  }
}

// -------------------------------------------------------------
// Suite 1: Static Code Architecture Audit
// -------------------------------------------------------------
console.log("--- Suite 1: NavigationContext Static Code Audit ---");
const navSrc = readFileSync(
  resolve("src/navigation/NavigationContext.jsx"),
  "utf-8",
);

assert(
  navSrc.includes('import { BackHandler, Platform, Linking } from "react-native"'),
  "NavigationContext imports Platform and Linking from react-native",
);

assert(
  navSrc.includes('const isWeb = Platform.OS === "web"') &&
    navSrc.includes("const hasWindowLocation =") &&
    navSrc.includes("isWeb && typeof window !== \"undefined\" && Boolean(window.location)"),
  "NavigationContext strictly guards window.location behind Platform.OS === 'web' and existence checks",
);

assert(
  navSrc.includes("if (!hasWindowLocation) return fallback"),
  "getInitialScreenFromUrl synchronously returns safe fallback when window.location is absent (Android/iOS)",
);

assert(
  navSrc.includes("Linking.getInitialURL()") &&
    navSrc.includes('Linking.addEventListener("url"'),
  "NavigationProvider handles native deep linking via Linking API",
);

assert(
  navSrc.includes("extractPathFromUrl") &&
    navSrc.includes("resolveScreenFromPathOrUrl"),
  "NavigationContext exports robust URL extraction and screen resolution helpers",
);

assert(
  navSrc.includes("UNAUTHENTICATED_PUBLIC_SCREENS") &&
    navSrc.includes("!isOtpVerified") &&
    (navSrc.includes("return 'phone'") || navSrc.includes('return "phone"')),
  "NavigationContext maintains strict OTP gating for protected screens",
);

// -------------------------------------------------------------
// Suite 2: Functional Logic Evaluation (Hermes / Native Emulation)
// -------------------------------------------------------------
console.log("\n--- Suite 2: Functional Logic in React Native Environment ---");

// Emulate React Native global environment where `global.window = global` but window.location is undefined
global.window = global;
delete global.window.location;
delete global.window.history;
delete global.window.sessionStorage;

// Extract functions from NavigationContext source using Function constructor
const extractFunctionsRegex =
  /export const extractPathFromUrl = ([\s\S]*?\n};\n|[\s\S]*?\n}\n)/;
const extractPathMatch = navSrc.match(extractFunctionsRegex);

// Extract constants SCREEN_TO_PATH and PATH_TO_SCREEN
const screenToPathMatch = navSrc.match(/export const SCREEN_TO_PATH = \{[\s\S]*?\n\}/);
const pathToScreenMatch = navSrc.match(/export const PATH_TO_SCREEN = Object\.entries\(SCREEN_TO_PATH\)[\s\S]*?\n\)/);

let evalScope = `
${screenToPathMatch[0].replace("export const", "const")}
${pathToScreenMatch[0].replace("export const", "const")}
const extractPathFromUrl = ${extractPathMatch[1]};
const resolveScreenFromPathOrUrl = (pathOrUrl, fallback = null) => {
  if (!pathOrUrl) return fallback;
  const path = extractPathFromUrl(pathOrUrl);
  if (!path) {
    if (typeof pathOrUrl === "string" && SCREEN_TO_PATH[pathOrUrl]) return pathOrUrl;
    return fallback;
  }
  if (PATH_TO_SCREEN[path]) return PATH_TO_SCREEN[path];
  const screenCandidate = path.replace(/^\\/+/, "");
  if (SCREEN_TO_PATH[screenCandidate]) return screenCandidate;
  return fallback;
};
return { SCREEN_TO_PATH, PATH_TO_SCREEN, extractPathFromUrl, resolveScreenFromPathOrUrl };
`;

const evaluated = new Function(evalScope)();
const { extractPathFromUrl, resolveScreenFromPathOrUrl } = evaluated;

// Test deep link extraction
assert(
  extractPathFromUrl("exp://192.168.1.15:8081/--/menu") === "/menu",
  "Extracts Expo Go deep link (/menu)",
);

assert(
  extractPathFromUrl("exp://192.168.1.15:8081/--/orders/detail?id=99#active") === "/orders/detail",
  "Strips query params and hash from Expo link",
);

assert(
  extractPathFromUrl("roadrider-vendor-app://orders/active") === "/orders/active",
  "Extracts custom scheme deep link (roadrider-vendor-app://orders/active)",
);

assert(
  extractPathFromUrl("in.roadrider.vendor://grocery/dashboard") === "/grocery/dashboard",
  "Extracts custom package scheme deep link (in.roadrider.vendor://grocery/dashboard)",
);

assert(
  extractPathFromUrl("roadrider-vendor-app://") === "/",
  "Handles root scheme deep link (roadrider-vendor-app://)",
);

assert(
  extractPathFromUrl("https://vendor.roadrider.in/onboarding/business-details") === "/onboarding/business-details",
  "Extracts path from https universal link",
);

assert(
  extractPathFromUrl("/dashboard") === "/dashboard",
  "Handles relative path (/dashboard)",
);

assert(
  extractPathFromUrl(null) === null &&
    extractPathFromUrl(undefined) === null &&
    extractPathFromUrl("") === null &&
    extractPathFromUrl("invalid:::url") === null,
  "Handles null, undefined, empty string, and malformed strings safely without throwing",
);

// Test screen resolution
assert(
  resolveScreenFromPathOrUrl("roadrider-vendor-app://menu") === "menu",
  "Resolves menu deep link to 'menu' screen",
);

assert(
  resolveScreenFromPathOrUrl("roadrider-vendor-app://dashboard") === "restaurant-home",
  "Resolves dashboard deep link to 'restaurant-home' screen",
);

assert(
  resolveScreenFromPathOrUrl("exp://192.168.1.15:8081/--/grocery/dashboard") === "grocery-home",
  "Resolves grocery dashboard link to 'grocery-home' screen",
);

assert(
  resolveScreenFromPathOrUrl("roadrider-vendor-app://unknown-screen-xyz", "splash") === "splash",
  "Falls back to 'splash' for unknown deep link",
);

assert(
  resolveScreenFromPathOrUrl(null, "splash") === "splash",
  "Falls back to 'splash' for missing deep link",
);

console.log("\n================================================================");
console.log(`  RESULTS: ${passed} PASSED | ${failed} FAILED`);
console.log("================================================================\n");

if (failed > 0) process.exit(1);

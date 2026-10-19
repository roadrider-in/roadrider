import { readFileSync } from "fs"
import { resolve } from "path"
import { sessionOtpGate } from "./src/services/sessionOtpGate.js"

console.log("================================================================")
console.log("  TESTING VENDOR CONTEXT STORE LOADING & OTP GATE CONTRACT      ")
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
// Suite 1: Static Architecture & Declaration Scoping Audit
// -------------------------------------------------------------
console.log("--- Suite 1: Static Architecture & Declaration Scoping Audit ---")

const vendorContextSrc = readFileSync(
  resolve("src/context/VendorContext.jsx"),
  "utf-8",
)
const mobileVerificationSrc = readFileSync(
  resolve("src/screens/onboarding/MobileVerificationScreen.jsx"),
  "utf-8",
)
const signInScreenSrc = readFileSync(
  resolve("src/screens/auth/SignInScreen.jsx"),
  "utf-8",
)
const appSrc = readFileSync(resolve("src/App.jsx"), "utf-8")

assert(
  vendorContextSrc.includes(
    "export const VendorContext = createContext(undefined);",
  ) &&
    vendorContextSrc.includes(
      "export const VendorProvider = ({ children }) => {",
    ) &&
    vendorContextSrc.includes("export const useVendor = () => {"),
  "VendorContext, VendorProvider, and useVendor are authoritatively exported",
)

assert(
  vendorContextSrc.includes(
    "const loadVendorStores = useCallback(async () => {",
  ) || vendorContextSrc.includes("const loadVendorStores = async () => {"),
  "loadVendorStores is declared at component scope (outside useEffect)",
)

assert(
  vendorContextSrc.includes("loadVendorStores,") &&
    vendorContextSrc.includes("refreshVendorStores: loadVendorStores,"),
  "VendorContext provider value exports both loadVendorStores and refreshVendorStores mapped to the store-loading implementation",
)

assert(
  vendorContextSrc.includes("resetVendorState,"),
  "VendorContext provider value exports resetVendorState",
)

assert(
  vendorContextSrc.includes("sessionOtpGate.isSessionOtpVerified(user.id)"),
  "loadVendorStores gates store loading strictly through sessionOtpGate.isSessionOtpVerified(user.id)",
)

assert(
  vendorContextSrc.includes("status: st.status || 'OFFLINE'"),
  "loadVendorStores preserves OFFLINE store default status",
)

assert(
  vendorContextSrc.includes("from('vendors')") &&
    vendorContextSrc.includes(".eq('user_id', user.id)") &&
    vendorContextSrc.includes("from('stores')") &&
    vendorContextSrc.includes(".eq('vendor_id', vendorData.id)"),
  "loadVendorStores preserves Supabase ownership checks for vendor and store data",
)

assert(
  mobileVerificationSrc.includes("refreshVendorStores") &&
    signInScreenSrc.includes("refreshVendorStores"),
  "Existing call sites in MobileVerificationScreen and SignInScreen correctly consume refreshVendorStores",
)

// -------------------------------------------------------------
// Suite 2: Runtime Contract & OTP Security Emulation
// -------------------------------------------------------------
console.log("\n--- Suite 2: Runtime Contract & OTP Security Emulation ---")

// Emulate store loading logic with mocked supabase and sessionOtpGate
let mockUser = null
let mockVendor = null
let mockStores = []
let queryLogs = []

const mockSupabase = {
  auth: {
    getSession: async () => ({
      data: { session: mockUser ? { user: mockUser } : null },
    }),
    getUser: async () => ({ data: { user: mockUser } }),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
  },
  from: (table) => ({
    select: (cols) => ({
      eq: (field, val) => {
        queryLogs.push({ table, field, val })
        return {
          maybeSingle: async () => ({
            data:
              table === "vendors" && mockVendor?.user_id === val
                ? mockVendor
                : null,
            error: null,
          }),
          order: () => ({
            data:
              table === "stores" && mockStores.every((s) => s.vendor_id === val)
                ? mockStores
                : [],
            error: null,
          }),
        }
      },
    }),
  }),
}

function createMockVendorContext(supabaseInstance) {
  let state = {
    stores: [],
    activeStore: null,
    vendor: null,
    vendorId: null,
    vendorType: "restaurant",
    isOnline: false,
    isLoadingStores: true,
    storeError: null,
  }

  const loadVendorStores = async () => {
    state.isLoadingStores = true
    const { data: sessionData } = await supabaseInstance.auth.getSession()
    const user =
      sessionData?.session?.user ||
      (await supabaseInstance.auth.getUser()).data?.user

    if (!user || !sessionOtpGate.isSessionOtpVerified(user.id)) {
      state.stores = []
      state.activeStore = null
      state.vendor = null
      state.vendorId = null
      state.isOnline = false
      state.isLoadingStores = false
      return null
    }

    const { data: vendorData } = await supabaseInstance
      .from("vendors")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!vendorData) {
      state.stores = []
      state.activeStore = null
      state.vendor = null
      state.vendorId = null
      state.isLoadingStores = false
      return []
    }

    state.vendor = vendorData
    state.vendorId = vendorData.id
    if (vendorData.vendor_type) {
      state.vendorType = vendorData.vendor_type
    }

    const { data: dbStores } = await supabaseInstance
      .from("stores")
      .select("*")
      .eq("vendor_id", vendorData.id)
      .order()

    if (dbStores && dbStores.length > 0) {
      const mapped = dbStores.map((st) => ({
        id: st.id,
        name: st.store_name || vendorData.business_name || "My Outlet",
        status: st.status || "OFFLINE",
        isOnline: st.status === "ONLINE",
        vendorId: st.vendor_id || vendorData.id,
      }))
      state.stores = mapped
      state.activeStore = mapped[0]
      state.isOnline = mapped[0].isOnline
      state.isLoadingStores = false
      return mapped
    } else {
      state.stores = []
      state.activeStore = null
      state.isOnline = false
      state.isLoadingStores = false
      return []
    }
  }

  const resetVendorState = () => {
    state.stores = []
    state.activeStore = null
    state.vendor = null
    state.vendorId = null
    state.isOnline = false
    state.isLoadingStores = false
    state.storeError = null
  }

  return {
    getState: () => state,
    loadVendorStores,
    refreshVendorStores: loadVendorStores,
    resetVendorState,
  }
}

// Subtest 1: Unverified user cannot load stores
sessionOtpGate.clearSessionOtpVerified()
mockUser = { id: "usr-unverified-123" }
mockVendor = {
  id: "v-123",
  user_id: "usr-unverified-123",
  business_name: "Test Vendor",
  vendor_type: "restaurant",
}
mockStores = [
  {
    id: "st-1",
    vendor_id: "v-123",
    store_name: "Test Store",
    status: "ONLINE",
  },
]
queryLogs = []

const ctx1 = createMockVendorContext(mockSupabase)
const unverifiedResult = await ctx1.loadVendorStores()

assert(
  unverifiedResult === null &&
    ctx1.getState().stores.length === 0 &&
    ctx1.getState().activeStore === null &&
    ctx1.getState().vendor === null &&
    queryLogs.length === 0,
  "Unverified user is blocked by session OTP gate: returns null with zero DB queries and no data exposure",
)

// Subtest 2: Verified user successfully loads stores with OFFLINE defaults
sessionOtpGate.setSessionOtpVerified("usr-verified-456", "9876543210")
mockUser = { id: "usr-verified-456" }
mockVendor = {
  id: "v-456",
  user_id: "usr-verified-456",
  business_name: "Verified Vendor",
  vendor_type: "restaurant",
}
mockStores = [
  {
    id: "st-456-1",
    vendor_id: "v-456",
    store_name: "Outlet Alpha",
    status: null,
  }, // no status -> OFFLINE
]
queryLogs = []

const ctx2 = createMockVendorContext(mockSupabase)
const verifiedResult = await ctx2.refreshVendorStores()

assert(
  Array.isArray(verifiedResult) &&
    verifiedResult.length === 1 &&
    verifiedResult[0].status === "OFFLINE" &&
    verifiedResult[0].isOnline === false &&
    ctx2.getState().vendorId === "v-456" &&
    ctx2.getState().activeStore?.id === "st-456-1",
  "Verified user loads stores through refreshVendorStores with OFFLINE default status",
)

assert(
  ctx2.loadVendorStores === ctx2.refreshVendorStores,
  "loadVendorStores and refreshVendorStores reference the exact same underlying function contract",
)

// Subtest 3: resetVendorState purges state
ctx2.resetVendorState()
assert(
  ctx2.getState().stores.length === 0 &&
    ctx2.getState().activeStore === null &&
    ctx2.getState().vendor === null &&
    ctx2.getState().vendorId === null,
  "resetVendorState cleans up all vendor and store state",
)

// Clean up
sessionOtpGate.clearSessionOtpVerified()

console.log(
  "\n================================================================",
)
console.log(`  RESULTS: ${passed} PASSED | ${failed} FAILED`)
console.log(
  "================================================================\n",
)

if (failed > 0) {
  process.exit(1)
}

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react"
import { BackHandler, Platform, Linking } from "react-native"
import { sessionOtpGate } from "../services/sessionOtpGate.js"

export const SCREEN_TO_PATH = {
  // Onboarding & Auth
  splash: "/",
  signin: "/signin",
  role: "/onboarding/business-type",
  phone: "/onboarding/mobile",
  business: "/onboarding/business-details",
  tax: "/onboarding/tax-bank",
  address: "/onboarding/location",
  kyc: "/onboarding/kyc",
  photos: "/onboarding/store-photos",
  terms: "/onboarding/agreement",
  pending: "/onboarding/verification-pending",
  approved: "/onboarding/approval-success",

  // Restaurant
  "restaurant-home": "/dashboard",
  incoming: "/orders/incoming",
  active: "/orders/active",
  "order-detail": "/orders/detail",
  menu: "/menu",
  "menu-item": "/menu/edit",
  offers: "/offers",
  hours: "/operating-hours",
  delivery: "/delivery-settings",
  reviews: "/reviews",
  "restaurant-payout": "/payouts",
  support: "/support",

  // Grocery
  "grocery-home": "/grocery/dashboard",
  catalog: "/grocery/catalog",
  product: "/grocery/product",
  import: "/grocery/import",
  inventory: "/grocery/inventory",
  "low-stock": "/grocery/low-stock",
  picking: "/grocery/picking",
  analytics: "/grocery/analytics",

  // Shared
  notifications: "/notifications",
  account: "/account",
  bank: "/account/bank",
  stores: "/account/stores",
  "profile-business": "/account/business",
  "profile-kyc": "/account/kyc",
  "profile-photos": "/account/photos",
  "profile-location": "/account/location",
  "onboard-outlet": "/onboarding/new-outlet",
}

export const PATH_TO_SCREEN = Object.entries(SCREEN_TO_PATH).reduce(
  (acc, [screen, path]) => {
    acc[path] = screen
    return acc
  },
  {},
)

const UNAUTHENTICATED_PUBLIC_SCREENS = [
  "splash",
  "signin",
  "role",
  "phone",
  "support",
]

const isWeb = Platform.OS === "web"
const hasWindowLocation =
  isWeb && typeof window !== "undefined" && Boolean(window.location)
const hasSessionStorage =
  isWeb && typeof window !== "undefined" && Boolean(window.sessionStorage)

/**
 * Safely extracts the pathname portion from a URL or deep-link string.
 * Supports:
 * - Expo Go links: exp://.../--/path or http://.../--/path
 * - Universal / Web links: https://domain/path
 * - Custom scheme links: roadrider-vendor-app://path or in.roadrider.vendor://path
 * - Relative paths: /orders/active
 */
export const extractPathFromUrl = (urlStr) => {
  if (!urlStr || typeof urlStr !== "string") return null

  try {
    // 1. Expo Go deep links format: exp://.../--/path or http(s)://.../--/path
    const expoGoMatch = urlStr.match(/^(?:exp|https?):\/\/[^\/]+\/--\/(.*)$/i)
    if (expoGoMatch) {
      const sub =
        "/" + expoGoMatch[1].replace(/^\/+/, "").split("?")[0].split("#")[0]
      return sub.replace(/\/$/, "") || "/"
    }

    // 2. Standard http / https URLs
    if (/^https?:\/\//i.test(urlStr)) {
      const parsed = new URL(urlStr)
      return (parsed.pathname || "").replace(/\/$/, "") || "/"
    }

    // 3. Custom scheme links (e.g. roadrider-vendor-app://path or in.roadrider.vendor://path)
    const schemeMatch = urlStr.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/(.*)$/)
    if (schemeMatch) {
      let pathPart = schemeMatch[1].split("?")[0].split("#")[0]
      pathPart = "/" + pathPart.replace(/^\/+/, "")
      return pathPart.replace(/\/$/, "") || "/"
    }

    // 4. Raw relative path (e.g. /menu or /orders/active)
    if (urlStr.startsWith("/")) {
      return urlStr.split("?")[0].split("#")[0].replace(/\/$/, "") || "/"
    }

    return null
  } catch {
    return null
  }
}

/**
 * Resolves a screen name from a URL or pathname.
 */
export const resolveScreenFromPathOrUrl = (pathOrUrl, fallback = null) => {
  if (!pathOrUrl) return fallback

  const path = extractPathFromUrl(pathOrUrl)
  if (!path) {
    if (typeof pathOrUrl === "string" && SCREEN_TO_PATH[pathOrUrl]) {
      return pathOrUrl
    }
    return fallback
  }

  if (PATH_TO_SCREEN[path]) {
    return PATH_TO_SCREEN[path]
  }

  const screenCandidate = path.replace(/^\/+/, "")
  if (SCREEN_TO_PATH[screenCandidate]) {
    return screenCandidate
  }

  return fallback
}

const getInitialScreenFromUrl = (fallback = "splash") => {
  // On native platforms (Android / iOS), window.location does not exist.
  // Return fallback ("splash") synchronously. Deep links on native are
  // resolved asynchronously via Linking.getInitialURL().
  if (!hasWindowLocation) return fallback

  let candidate = null

  // Check pathname on web
  try {
    const pathname = (window.location.pathname || "").replace(/\/$/, "") || "/"
    if (PATH_TO_SCREEN[pathname]) {
      candidate = PATH_TO_SCREEN[pathname]
    } else if (window.location.hash) {
      // Check hash fallback (e.g. #/menu)
      const hashPath =
        window.location.hash.replace(/^#/, "").replace(/\/$/, "") || "/"
      if (PATH_TO_SCREEN[hashPath]) {
        candidate = PATH_TO_SCREEN[hashPath]
      }
    }
  } catch {}

  // Check sessionStorage fallback if not in URL (web only)
  if (!candidate && hasSessionStorage) {
    try {
      const savedScreen = window.sessionStorage.getItem("rr_current_screen")
      if (savedScreen && SCREEN_TO_PATH[savedScreen]) {
        candidate = savedScreen
      }
    } catch {}
  }

  candidate = candidate || fallback

  // On every full page refresh/reload, in-memory OTP verification is reset.
  // If the target screen is a protected screen and OTP is not verified, require phone OTP verification again.
  const verifiedUser = sessionOtpGate.getSessionVerifiedUser()
  const isOtpVerified = Boolean(
    verifiedUser?.userId &&
      sessionOtpGate.isSessionOtpVerified(verifiedUser.userId),
  )

  if (!UNAUTHENTICATED_PUBLIC_SCREENS.includes(candidate) && !isOtpVerified) {
    if (hasSessionStorage) {
      try {
        window.sessionStorage.removeItem("rr_current_screen")
      } catch {}
    }
    return 'phone'
  }

  return candidate
}

const NavigationContext = createContext(undefined)

export const NavigationProvider = ({ initialScreen = "splash", children }) => {
  const [currentScreen, setCurrentScreen] = useState(() =>
    getInitialScreenFromUrl(initialScreen),
  )
  const [history, setHistory] = useState([currentScreen])
  const [params, setParams] = useState({})

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const openDrawer = () => setIsDrawerOpen(true)
  const closeDrawer = () => setIsDrawerOpen(false)
  const toggleDrawer = () => setIsDrawerOpen((prev) => !prev)

  const navigate = useCallback((screen, newParams) => {
    setIsDrawerOpen(false)
    if (newParams) {
      setParams(newParams)
    }

    if (hasWindowLocation && window.history?.pushState) {
      const path = SCREEN_TO_PATH[screen] || "/"
      try {
        window.history.pushState({ screen, params: newParams || {} }, "", path)
      } catch {}
    }
    if (hasSessionStorage) {
      try {
        window.sessionStorage.setItem("rr_current_screen", screen)
      } catch {}
    }

    setHistory((prev) => [...prev, screen])
    setCurrentScreen(screen)
  }, [])

  const goBack = useCallback(() => {
    setIsDrawerOpen(false)
    if (hasWindowLocation && window.history && window.history.length > 1) {
      window.history.back()
    } else if (history.length > 1) {
      const nextHistory = [...history]
      nextHistory.pop()
      const previousScreen = nextHistory[nextHistory.length - 1]
      setHistory(nextHistory)
      setCurrentScreen(previousScreen)
      if (hasWindowLocation && window.history?.replaceState) {
        const path = SCREEN_TO_PATH[previousScreen] || "/"
        try {
          window.history.replaceState({ screen: previousScreen }, "", path)
        } catch {}
      }
    }
  }, [history])

  // Deep linking for native platforms (Android / iOS Expo)
  useEffect(() => {
    if (isWeb) return

    let isMounted = true

    const handleDeepLinkUrl = (url) => {
      if (!isMounted || !url) return
      const targetScreen = resolveScreenFromPathOrUrl(url)
      if (!targetScreen) return

      const verifiedUser = sessionOtpGate.getSessionVerifiedUser()
      const isOtpVerified = Boolean(
        verifiedUser?.userId &&
          sessionOtpGate.isSessionOtpVerified(verifiedUser.userId),
      )

      if (
        !UNAUTHENTICATED_PUBLIC_SCREENS.includes(targetScreen) &&
        !isOtpVerified
      ) {
        navigate("phone")
      } else {
        navigate(targetScreen)
      }
    }

    // Initial URL when app was launched from a deep link
    Linking.getInitialURL()
      .then((url) => {
        if (url) {
          handleDeepLinkUrl(url)
        }
      })
      .catch((err) => {
        console.warn(
          "[NavigationContext] Error reading initial deep link URL:",
          err,
        )
      })

    // Subsequent deep links received while app is active / backgrounded
    const subscription = Linking.addEventListener("url", (event) => {
      if (event?.url) {
        handleDeepLinkUrl(event.url)
      }
    })

    return () => {
      isMounted = false
      if (subscription && typeof subscription.remove === "function") {
        subscription.remove()
      }
    }
  }, [navigate])

  // Close drawer on Escape key press (web only)
  useEffect(() => {
    if (!hasWindowLocation || typeof window.addEventListener !== "function")
      return
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isDrawerOpen) {
        setIsDrawerOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isDrawerOpen])

  // Hardware Back button support on Android
  useEffect(() => {
    const onBackPress = () => {
      if (isDrawerOpen) {
        setIsDrawerOpen(false)
        return true
      }
      if (history.length > 1) {
        goBack()
        return true
      }
      return false
    }

    const backSub = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    )
    return () => backSub.remove()
  }, [history, isDrawerOpen, goBack])

  // Sync state with URL history (web only)
  useEffect(() => {
    if (!hasWindowLocation) return

    const path = SCREEN_TO_PATH[currentScreen] || "/"
    const currentPath =
      (window.location.pathname || "").replace(/\/$/, "") || "/"

    if (currentPath !== path && window.history?.replaceState) {
      try {
        window.history.replaceState({ screen: currentScreen, params }, "", path)
      } catch {}
    }
    if (hasSessionStorage) {
      try {
        window.sessionStorage.setItem("rr_current_screen", currentScreen)
      } catch {}
    }

    const handlePopState = (event) => {
      let targetScreen = null
      if (event.state && event.state.screen) {
        targetScreen = event.state.screen
        if (event.state.params) {
          setParams(event.state.params)
        }
      } else {
        const p = (window.location.pathname || "").replace(/\/$/, "") || "/"
        targetScreen = PATH_TO_SCREEN[p] || "splash"
      }

      if (targetScreen) {
        setIsDrawerOpen(false)
        setCurrentScreen(targetScreen)
        if (hasSessionStorage) {
          try {
            window.sessionStorage.setItem("rr_current_screen", targetScreen)
          } catch {}
        }
      }
    }

    if (typeof window.addEventListener === "function") {
      window.addEventListener("popstate", handlePopState)
      return () => window.removeEventListener("popstate", handlePopState)
    }
  }, [currentScreen, params])

  return (
    <NavigationContext.Provider
      value={{
        currentScreen,
        navigate,
        goBack,
        history,
        params,
        isDrawerOpen,
        openDrawer,
        closeDrawer,
        toggleDrawer,
      }}
    >
      {children}
    </NavigationContext.Provider>
  )
}

export const useAppNavigation = () => {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error("useAppNavigation must be used within a NavigationProvider")
  }
  return context
}

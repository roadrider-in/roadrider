import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon, Button, Logo, type Service } from "./ui";
import { NavCtx, type Route, type Screen, type NavApi } from "./nav";
import { StoreProvider, orderTotal, inr, methodsFor, PAY_METHODS, MIN_ORDER, STOCK, ORDER_TITLE, RIDE_NAMES, useStore } from "./store";
import { BottomNav, CourierHome, FoodHome, GroceryHome, RidesHome, type TabId } from "./home";
import { CheckoutScreen, K1_AccountHome, NavCart, OrdersScreen, ServiceDetail } from "./flow";
import { A2_FoodSkeleton, A3_RidesSkeleton, A4_GrocerySkeleton, A5_CourierSkeleton, A6_ListSkeleton, SkeletonFor } from "./states";
import { A8_ProcessingLoader, A9_NoInternet, A10_ServerError, A11_Maintenance, A12_ForceUpdate, A13_LocationDenied, A14_NotificationPrompt, A15_SessionExpired, A16_ServiceUnavailable, A17_NotFound, A18_PaymentProcessing, A19_PaymentSuccess, A20_PaymentFailed } from "./screens/system";
import { B1_Welcome, B3_PhoneEntry, B4_OtpVerify, B7_LocationPrompt, B8_SetLocation, B9_SocialHandoff } from "./screens/onboarding";
import { C5_LocationPicker, C9_SearchResults, C12_Notifications, D13_RestaurantClosed, D14_CartConflict, E9_NoDrivers, F13_GroceryWarning, I7_NoFavorites, I8_NoOffers, I1_EmptyCart, I2_NothingInProgress, I3_NoOrders, I6_NoNotifications } from "./screens/shared";
import { MoreScreen } from "./screens/more";
import { K2_EditProfile, K3_SavedAddresses, K4_ReferAndEarn, K5_NotificationSettings, K6_Language } from "./screens/account";
import { B10_TermsViewer, K7_PrivacyPermissions, K8_DeleteAccount, K10_About, K11_RateApp, K12_ChangePhone } from "./screens/account2";
import { C7_AddressForm } from "./screens/address";
import { C13_Offers, C15_ApplyCoupon, D12_Favorites, H3_AddCardUpi, H4_PaymentMethods, L1_HelpHome } from "./screens/related";
import { J7_RefundStatus, OrderDetail } from "./screens/orders";
import { OrderJourney } from "./screens/OrderJourney";
import { LocationBottomSheet } from "./screens/LocationBottomSheet";
import { SupportChat } from "./screens/SupportChat";
import { Dialog } from "./kit";
import { signOutUser, getCurrentCustomer } from "./services/auth.service";
import { I18nProvider } from "./i18n";
import { ErrorBoundary } from "./components/ErrorBoundary";

type Entry = "splash" | "phone" | "social" | "otp" | "locperm" | "setloc" | "notif" | "app" | "init_error";
const FLOW: Screen[] = ["detail", "cart", "address", "payment", "confirmed", "tracking", "complete"];
const RIDE_FLOW: Screen[] = ["detail", "cart", "payment", "confirmed", "tracking", "complete"];
const SKELETON_SCREENS: Screen[] = ["home", "orders", "account"];
const NEUTRAL_SCREENS: Screen[] = ["orders", "account"];
const VERTICAL_OVERLAY = /^(C9|D13|D14|E|F|G)/;
/** Full-screen states with no bottom navigation: no internet, maintenance, force update, session expired, processing, delete account, change phone. */
const HIDE_NAV = /^(A8|A9|A11|A12|A15|A18|B_LOC|K8|K12)$/;
/** Account sub-screens; opening one from the screen index switches the underlying tab to Account. */
const ACCOUNT_IDS = /^(K[1-9]|K1[0-2]|B10|H3|H4|D12|C13|L1)$/;
/** Underlying screen to bottom-nav tab. Vertical landing and detail screens belong to Home; checkout to Cart; post-order screens to Orders. */
const TAB_OF: Record<Screen, TabId> = { home: "home", detail: "home", cart: "navcart", address: "navcart", payment: "navcart", navcart: "navcart", confirmed: "orders", tracking: "orders", complete: "orders", orders: "orders", account: "account" };
const TONE_ICON = { success: "check", error: "alert", info: "info", warning: "alert" } as const;
const TONE_LABEL = { success: "Success", error: "Error", info: "Info", warning: "Heads up" } as const;

function Shell({ onReset }: { onReset: () => void }) {
  const store = useStore();
  const [entry, setEntry] = useState<Entry>("splash");
  const [initStatus, setInitStatus] = useState<"pending" | "authenticated" | "unauthenticated" | "error">("pending");
  const [splashFinished, setSplashFinished] = useState(false);
  const [initErrorMsg, setInitErrorMsg] = useState("");

  const [service, setService] = useState<Service>("food");
  const [screen, setScreen] = useState<Screen>("home");
  const [stack, setStack] = useState<Route[]>([]);
  const [phone, setPhone] = useState("98765 43210");
  const [provider, setProvider] = useState<"google" | "apple" | "email">("google");
  const [loaded, setLoaded] = useState("");
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ id: number; message: string; tone: keyof typeof TONE_ICON } | null>(null);
  const toastId = useRef(0);
  const toast = useCallback((message: string, tone: keyof typeof TONE_ICON = "success") => {
    const id = ++toastId.current; setToastMsg({ id, message, tone });
    setTimeout(() => setToastMsg((t) => (t && t.id === id ? null : t)), 2600);
  }, []);
  const drag = useRef<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const open = useCallback((id: string, params?: any) => setStack((s) => [...s, { id, params }]), []);
  const replace = useCallback((id: string, params?: any) => setStack((s) => [...s.slice(0, -1), { id, params }]), []);
  const close = useCallback(() => setStack((s) => s.slice(0, -1)), []);
  const closeAll = useCallback(() => setStack([]), []);
  const top = stack[stack.length - 1];

  // 1. Application Initialization & Session Restoration
  useEffect(() => {
    let active = true;

    async function initializeSystem() {
      try {
        const cust = await getCurrentCustomer();
        if (!active) return;

        if (cust) {
          if (cust.phone) setPhone(cust.phone.replace("+91", "").trim());
          store.updateProfile({
            id: cust.id,
            name: cust.full_name || store.profile.name,
            email: cust.email || store.profile.email,
            phone: cust.phone || store.profile.phone,
          });

          // Check if location was previously confirmed and saved
          const hasConfirmed = localStorage.getItem("roadrider_location_confirmed") === "true";
          const savedAddr = localStorage.getItem("roadrider_selected_address");
          if (hasConfirmed && savedAddr) {
            store.setLocationConfirmed(true);
            store.setPlace(savedAddr);
            store.setPickup(savedAddr);
            try {
              const rawCoords = localStorage.getItem("roadrider_selected_coords");
              if (rawCoords) store.setDeliveryCoords(JSON.parse(rawCoords));
            } catch {}
          }
          setInitStatus("authenticated");
        } else {
          setInitStatus("unauthenticated");
        }
      } catch (err: any) {
        console.warn("[App] Initialization warning:", err);
        if (!active) return;
        // Non-blocking fallback: permit user to proceed to phone login screen
        setInitStatus("unauthenticated");
      }
    }

    initializeSystem();
    return () => { active = false; };
  }, []);

  // 2. Splash Screen -> Auth Check -> Location Check -> Correct Destination Screen
  useEffect(() => {
    if (!splashFinished || entry !== "splash") return;
    if (initStatus === "pending") return;

    if (initStatus === "error") {
      setEntry("init_error");
      return;
    }

    if (initStatus === "authenticated") {
      const hasConfirmed = store.locationConfirmed || localStorage.getItem("roadrider_location_confirmed") === "true";
      setEntry("app");
      if (!hasConfirmed) {
        open("LOCATION_SHEET");
      }
    } else {
      // First-time or unauthenticated user: navigate to login screen
      setEntry("phone");
    }
  }, [splashFinished, initStatus, entry, store.locationConfirmed, open]);

  // Real connectivity: going offline opens A9.
  useEffect(() => {
    const off = () => setStack((s) => (s[s.length - 1]?.id === "A9" ? s : [...s, { id: "A9" }]));
    window.addEventListener("offline", off); return () => window.removeEventListener("offline", off);
  }, []);

  // Skeleton loading (A2–A6) whenever a landing/list screen is entered or refreshed.
  const key = `${screen}|${service}`;
  useEffect(() => {
    if (entry !== "app" || loaded === key) return;
    const t = setTimeout(() => setLoaded(key), screen === "home" ? 750 : 450);
    return () => clearTimeout(t);
  }, [entry, key, loaded, screen]);
  const showSkeleton = entry === "app" && loaded !== key && SKELETON_SCREENS.includes(screen) && !top;

  const refresh = () => { setRefreshing(true); setLoaded(""); setTimeout(() => setRefreshing(false), 1100); };
  const onPointerDown = (e: React.PointerEvent) => { if (!top && screen === "home" && (scroller.current?.scrollTop ?? 1) === 0) drag.current = e.clientY; };
  const onPointerMove = (e: React.PointerEvent) => { if (drag.current !== null) setPull(Math.max(0, Math.min(90, (e.clientY - drag.current) * 0.5))); };
  const endPull = () => { if (drag.current !== null && pull >= 55) refresh(); drag.current = null; setPull(0); };

  const selectService = (value: Service) => { setService(value); setScreen("home"); };
  const q = store.qty[service];
  const startFlow = () => {
    if (service === "rides" || service === "courier") store.setQtyFor(service, 1);
    else if (q === 0) store.setQtyFor(service, 1);
    setScreen("detail");
  };
  const order = service === "rides" ? RIDE_FLOW : FLOW;
  const back = () => { const i = order.indexOf(screen); setScreen(i <= 0 ? "home" : order[i - 1]); };

  const confirmRide = () => open("A8", {
    message: "Confirming your booking", sub: `Finding the best ${RIDE_NAMES[store.rideType]} near you`,
    done: () => { if (store.rideType === 3) replace("E9"); else { close(); setScreen("cart"); } },
  });
  const next = () => {
    if (screen === "complete") { store.completeOrder(service); setScreen("home"); return; }
    if (screen === "detail" && service === "rides") { confirmRide(); return; }
    const i = order.indexOf(screen);
    setScreen(order[Math.min(i + 1, order.length - 1)]);
  };

  /** Cart quantity changes with stock (D14 / F13) rules. */
  const changeQty = (delta: number) => {
    const n = q + delta;
    if (n > STOCK[service]) { open(service === "food" ? "D14" : "F13", { kind: "stock", available: STOCK[service] }); return; }
    store.setQtyFor(service, n);
  };
  const checkout = () => {
    if (service === "grocery" && store.qty.grocery * 164 < MIN_ORDER.grocery) { open("F13", { kind: "minimum", needed: inr(MIN_ORDER.grocery - store.qty.grocery * 164) }); return; }
    setScreen("cart");
  };

  /** Payment pipeline: A18 processing -> A19 success or A20 failure. */
  const startPayment = () => {
    const amount = orderTotal(service, q, store.rideType, store.pkg, store.coupon, store.referrals).total;
    const method = methodsFor(service).includes(store.payMethod) ? store.payMethod : 0;
    const run = () => {
      let reason = "";
      if (method === 1 && store.attempts === 0) reason = "Your bank declined the card.";
      if (reason) { store.setAttempts((a) => a + 1); replace("A20", { reason, amount }); return; }
      replace("A19", { amount, method });
    };
    open("A18", { amount, method, done: run });
  };

  const guard = useRef(false);
  const [leave, setLeave] = useState<TabId | null>(null);
  const toTab = (id: TabId) => {
    setLeave(null); closeAll();
    setScreen(id);
    scroller.current?.scrollTo({ top: 0 });
  };
  /** Bottom-nav tap. Home returns to the last-used vertical's landing screen; re-tapping the active tab scrolls to top. */
  const jumpTab = (id: TabId) => {
    const atRoot = !top && screen === id;
    if (atRoot) { scroller.current?.scrollTo({ top: 0, behavior: "smooth" }); return; }
    if (guard.current || screen === "address" || screen === "payment") { setLeave(id); return; }
    toTab(id);
  };

  const goHome = () => { closeAll(); setScreen("home"); };
  const goBrowse = (s: Service = "food") => { closeAll(); selectService(s); };
  const renderOverlay = (r: Route): ReactNode => {
    const p = r.params ?? {};
    switch (r.id) {
      case "A2": return <Preview onClose={close}><A2_FoodSkeleton/></Preview>;
      case "A3": return <Preview onClose={close}><A3_RidesSkeleton/></Preview>;
      case "A4": return <Preview onClose={close}><A4_GrocerySkeleton/></Preview>;
      case "A5": return <Preview onClose={close}><A5_CourierSkeleton/></Preview>;
      case "A6": return <Preview onClose={close}><A6_ListSkeleton/></Preview>;
      case "A8": return <A8_ProcessingLoader message={p.message ?? "Processing"} sub={p.sub} onDone={p.done ?? close}/>;
      case "A9": return <A9_NoInternet onRetry={close} onBack={close}/>;
      case "A10": return <A10_ServerError onRetry={close} onSupport={() => replace("L1")} onBack={close}/>;
      case "A11": return <A11_Maintenance onSupport={() => replace("L1")} onBack={close}/>;
      case "A12": return <A12_ForceUpdate onUpdate={close}/>;
      case "A13": return <A13_LocationDenied onEnable={() => { store.setGps(true); close(); }} onManual={() => replace("C5", { target: "deliver" })}/>;
      case "A15": return <A15_SessionExpired onLogin={() => { closeAll(); setScreen("home"); setEntry("phone"); }} onSupport={() => replace("L1")}/>;
      case "A16": return <A16_ServiceUnavailable place={p.place ?? "your area"} onChange={() => replace("C5", { target: "deliver" })} onBack={close}/>;
      case "A17": return <A17_NotFound onHome={goHome} onBack={close}/>;
      case "A18": return <A18_PaymentProcessing amount={inr(p.amount)} method={PAY_METHODS[p.method ?? 0]} onDone={p.done ?? close}/>;
      case "A19": return <A19_PaymentSuccess title={p.method === 3 ? "Order confirmed" : undefined} tag={p.method === 3 ? "Confirmed" : undefined} amount={inr(p.amount)} lines={[["Order", ORDER_TITLE[service]], [p.method === 3 ? "Payment" : "Paid with", p.method === 3 ? "Pay on delivery" : PAY_METHODS[p.method]], ["Reference", "RR" + String(p.amount * 13 + 7102)]]} cta={service === "rides" ? "View my driver" : "Track my order"} onDone={() => { store.recordPayment(service, p.method, p.amount); closeAll(); setScreen("confirmed"); }}/>;
      case "A20": return <A20_PaymentFailed reason={p.reason} amount={inr(p.amount)} onRetry={() => replace("A18", { amount: p.amount, method: store.payMethod, done: () => { store.setAttempts((a) => a + 1); replace("A19", { amount: p.amount, method: store.payMethod }); } })} onChangeMethod={close} onSupport={() => replace("L1")}/>;
      case "B_LOC": return <B8_SetLocation onConfirm={close} onUnavailable={(pl) => open("A16", { place: pl })}/>;
      case "LOCATION_SHEET": return <LocationBottomSheet canDismiss={store.locationConfirmed} onClose={close} onConfirmed={() => close()} />;
      case "SUPPORT_CHAT": return <SupportChat onBack={close} />;
      case "C5": return <C5_LocationPicker target={p.target} courier={service === "courier"} onClose={close} onUnavailable={(pl) => replace("A16", { place: pl })} onLocationOff={() => replace("A13")} onAddAddress={() => replace("C7")}/>;
      case "C9": return <C9_SearchResults service={p.service} initial={p.query ?? ""} onBack={close} onPick={(name, openNow) => {
        if (!openNow) { replace("D13", { name: name.includes("Paneer") ? "Spice Garden" : name }); return; }
        closeAll();
        setService(p.service);
        const matched = store.restaurants.find((r) => r.name.toLowerCase() === name.toLowerCase());
        if (matched) store.setSelectedStoreId(matched.id);
        if (store.qty[p.service as Service] === 0) store.setQtyFor(p.service, 1);
        setScreen("detail");
      }}/>;
      case "C12": return <C12_Notifications onBack={close} onBrowse={() => goBrowse("food")}/>;
      case "D13": return <D13_RestaurantClosed name={p.name} onBrowse={goHome} onBack={close}/>;
      case "D14": return <D14_CartConflict item="Lucknowi Chicken Biryani" available={p.available} onKeep={() => { store.setQtyFor("food", p.available); close(); }} onRemove={() => { store.setQtyFor("food", 0); close(); }} onBack={close}/>;
      case "E9": return <E9_NoDrivers rideName={RIDE_NAMES[store.rideType]} onRetry={close} onChange={() => { store.setRideType(1); closeAll(); setScreen("home"); }} onBack={() => { closeAll(); setScreen("detail"); }}/>;
      case "F13": return <F13_GroceryWarning kind={p.kind} needed={p.needed ?? ""} available={p.available ?? 0} onFix={() => { store.setQtyFor("grocery", p.kind === "stock" ? p.available : store.qty.grocery + 1); closeAll(); setService("grocery"); setScreen("navcart"); }} onBack={close}/>;
      case "I1": return <Preview onClose={close}><I1_EmptyCart service="food" onBrowse={goHome}/></Preview>;
      case "I2": return <Preview onClose={close}><I2_NothingInProgress service="rides" onStart={goHome}/></Preview>;
      case "I3": return <Preview onClose={close}><I3_NoOrders onBrowse={goHome}/></Preview>;
      case "I6": return <Preview onClose={close}><I6_NoNotifications onBrowse={goHome}/></Preview>;
      case "I7": return <Preview onClose={close}><I7_NoFavorites onBrowse={goHome}/></Preview>;
      case "I8": return <Preview onClose={close}><I8_NoOffers onBrowse={goHome}/></Preview>;
      case "K2": return <K2_EditProfile/>;
      case "K3": return <K3_SavedAddresses/>;
      case "K4": return <K4_ReferAndEarn/>;
      case "K5": return <K5_NotificationSettings/>;
      case "K6": return <K6_Language/>;
      case "K7": return <K7_PrivacyPermissions/>;
      case "K8": return <K8_DeleteAccount onDeleted={onReset}/>;
      case "K10": return <K10_About/>;
      case "K11": return <K11_RateApp/>;
      case "K12": return <K12_ChangePhone/>;
      case "B10": return <B10_TermsViewer doc={p.doc}/>;
      case "C7": return <C7_AddressForm id={p.id}/>;
      case "H3": return <H3_AddCardUpi/>;
      case "H4": return <H4_PaymentMethods/>;
      case "D12": return <D12_Favorites/>;
      case "C13": return <C13_Offers/>;
      case "L1": return <L1_HelpHome/>;
      case "C15": return <C15_ApplyCoupon service={p.service ?? service}/>;
      case "ORDER": return <OrderDetail id={p.id}/>;
      case "ORDER_JOURNEY": return <OrderJourney orderId={p.id} onBack={close} onHome={goHome}/>;
      case "J7": return <J7_RefundStatus id={p.id}/>;
      case "MORE": return <MoreScreen label={p.label ?? ""} onBack={close}/>;
      default: return <A17_NotFound onHome={goHome} onBack={close}/>;
    }
  };

  // Legacy buttons without their own handler still fall back to the placeholder (removed in Batch 3).
  const fallback = (event: React.MouseEvent<HTMLDivElement>) => {
    const button = (event.target as HTMLElement).closest("button");
    if (!button || button.dataset.interactive === "true" || button.disabled) return;
    open("MORE", { label: button.getAttribute("aria-label") || button.textContent?.trim() || "More options" });
  };

  const navApi: NavApi = {
    service,
    selectService,
    go: (s) => { closeAll(); setScreen(s); },
    open,
    replace,
    close,
    closeAll,
    browse: (s) => { closeAll(); selectService(s); },
    startFlow: (s) => {
      closeAll();
      setService(s);
      if (store.qty[s] === 0 || s === "rides" || s === "courier") store.setQtyFor(s, 1);
      setScreen("detail");
    },
    setGuard: (v) => { guard.current = v; },
    toast,
  };

  const renderShellContent = () => {
    const wrap = (n: ReactNode) => (
      <div className="app-shell theme-neutral">
        <div className="mobile-frame">
          <div className="screen-scroll" style={{ paddingBottom: 0, height: "100%", display: "flex", flexDirection: "column" }}>
            {n}
          </div>
        </div>
        <ScreenIndex
          onOpen={(id, params) => {
            if (entry !== "app") setEntry("app");
            if (ACCOUNT_IDS.test(id)) setScreen("account");
            open(id, params);
          }}
          onSignOut={() => {
            closeAll();
            setInitStatus("unauthenticated");
            setSplashFinished(false);
            setEntry("splash");
          }}
        />
      </div>
    );

    if (entry === "splash") {
      return wrap(
        <B1_Welcome
          onStart={() => setSplashFinished(true)}
          onComplete={() => setSplashFinished(true)}
        />
      );
    }

    if (entry === "init_error") {
      return wrap(
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: "2.5rem 1.5rem",
            textAlign: "center",
            minHeight: "100%",
            backgroundColor: "#FFFFFF",
            border: "1px solid #F3F4F6",
            borderRadius: "20px",
            margin: "auto",
          }}
        >
          <Logo />
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "#FEE2E2",
              color: "#DC2626",
              display: "grid",
              placeItems: "center",
              margin: "1.5rem 0 1rem",
            }}
          >
            <Icon name="alert" size={28} />
          </div>
          <h2 style={{ fontSize: "1.25rem", margin: "0 0 0.5rem", fontWeight: 700 }}>
            Unable to start RoadRider
          </h2>
          <p style={{ color: "#64748B", fontSize: "0.88rem", marginBottom: "1.5rem", lineHeight: 1.5 }}>
            {initErrorMsg || "Please check your internet connection and try again."}
          </p>
          <Button onClick={() => { setInitStatus("pending"); setSplashFinished(false); setEntry("splash"); }}>
            Retry
          </Button>
        </div>
      );
    }

    if (entry !== "app" && !top) {
      if (entry === "phone") return wrap(<B3_PhoneEntry phone={phone} setPhone={setPhone} onBack={() => { setSplashFinished(false); setEntry("splash"); }} onNext={() => setEntry("otp")} onSocial={(p) => { setProvider(p); setEntry("social"); }}/>);
      if (entry === "social") return wrap(<B9_SocialHandoff provider={provider} onCancel={() => setEntry("phone")} onDone={() => setEntry("locperm")}/>);
      if (entry === "otp") return wrap(<B4_OtpVerify phone={phone} onBack={() => setEntry("phone")} onVerified={() => { const d = phone.replace(/\D/g, ""); store.updateProfile({ phone: `${d.slice(0, 5)} ${d.slice(5)}`.trim() }); setEntry("locperm"); }}/>);
      if (entry === "locperm") return wrap(<B7_LocationPrompt onAllow={() => { store.setGps(true); setEntry("setloc"); }} onManual={() => { store.setGps(false); setEntry("setloc"); }}/>);
      if (entry === "setloc") return wrap(<B8_SetLocation onConfirm={() => setEntry("notif")} onUnavailable={(p) => open("A16", { place: p })}/>);
      if (entry === "notif") return wrap(<A14_NotificationPrompt onAllow={() => { store.setNotifyAllowed(true); setEntry("app"); if (!store.locationConfirmed) open("LOCATION_SHEET"); }} onLater={() => { store.setNotifyAllowed(false); setEntry("app"); if (!store.locationConfirmed) open("LOCATION_SHEET"); }}/>);
    }

    const neutral = entry !== "app" || NEUTRAL_SCREENS.includes(screen) || (top && !VERTICAL_OVERLAY.test(top.id));
    const showNav = entry === "app" && (top ? !HIDE_NAV.test(top.id) : screen !== "tracking");

    return (
      <div className={`app-shell ${neutral ? "theme-neutral" : `theme-${service}`}`}>
        <div className={`mobile-frame ${showNav ? "has-nav" : ""}`}>
          {pull > 0 || refreshing ? <div className="pull-indicator" style={{ height: refreshing ? 44 : pull }}><Icon name="refresh" size={16}/><span>{refreshing ? "Refreshing…" : pull >= 55 ? "Release to refresh" : "Pull to refresh"}</span></div> : null}
          <div ref={scroller} className="screen-scroll" onClick={top ? undefined : fallback} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endPull} onPointerLeave={endPull} onPointerCancel={endPull} data-overlay={top ? top.id : undefined}>
            {top ? renderOverlay(top)
              : showSkeleton ? (screen === "home" ? <SkeletonFor service={service}/> : <A6_ListSkeleton/>)
              : <>
                {screen === "home" && service === "food" && <FoodHome onOpen={startFlow} onService={selectService}/>}
                {screen === "home" && service === "rides" && <RidesHome onOpen={startFlow} onService={selectService}/>}
                {screen === "home" && service === "grocery" && <GroceryHome onOpen={startFlow} onService={selectService}/>}
                {screen === "home" && service === "courier" && <CourierHome onOpen={startFlow} onService={selectService}/>}
                {screen === "detail" && <ServiceDetail service={service} onBack={back} onNext={next}/>}
                {["cart", "address", "payment", "confirmed", "tracking", "complete"].includes(screen) && <CheckoutScreen service={service} screen={screen} onBack={back} onNext={next} onPay={startPayment} onQty={changeQty}/>}
                {screen === "navcart" && <NavCart service={service} onBrowse={() => selectService(service)} onCheckout={checkout} onQty={changeQty}/>}
                {screen === "orders" && <OrdersScreen onBrowse={() => selectService("food")}/>}
                {screen === "account" && <K1_AccountHome onLogout={async () => { await signOutUser(); closeAll(); setScreen("home"); setService("food"); setInitStatus("unauthenticated"); setSplashFinished(false); setEntry("phone"); }}/>}
              </>}
          </div>
          {toastMsg && <div className={`toast tone-${toastMsg.tone}`} role="status" aria-live="polite"><Icon name={TONE_ICON[toastMsg.tone]} size={16}/><span><b>{TONE_LABEL[toastMsg.tone]}</b> {toastMsg.message}</span></div>}
          {showNav && <BottomNav active={TAB_OF[screen]} count={store.qty[service]} onSelect={jumpTab}/>}
          {leave && <Dialog title="Leave this screen?" text="You have an unfinished step. Your cart stays saved, but anything you have entered here will be lost." confirm="Leave" cancel="Stay" onCancel={() => setLeave(null)} onConfirm={() => toTab(leave)}/>}
        </div>
        <ScreenIndex onOpen={(id, params) => { if (entry !== "app") setEntry("app"); if (ACCOUNT_IDS.test(id)) setScreen("account"); open(id, params); }} onSignOut={() => { closeAll(); setInitStatus("unauthenticated"); setSplashFinished(false); setEntry("splash"); }}/>
      </div>
    );
  };

  return <NavCtx.Provider value={navApi}>{renderShellContent()}</NavCtx.Provider>;
}

/** Wraps an inline state (skeleton / empty) so it can be previewed full screen. */
function Preview({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return <div className="preview-page">{children}<div className="preview-close"><Button secondary onClick={onClose}>Close preview</Button></div></div>;
}

/** Side index of every built screen, keyed by checklist ID, for progress tracking. */
const INDEX: [string, [string, string, any?][]][] = [
  ["A · System & feedback", [["A2", "Skeleton: Food"], ["A3", "Skeleton: Rides"], ["A4", "Skeleton: Grocery"], ["A5", "Skeleton: Courier"], ["A6", "Skeleton: list/detail"], ["A8", "Processing loader", { message: "Processing", done: undefined }], ["A9", "No internet"], ["A10", "Server error"], ["A11", "Maintenance"], ["A12", "Force update"], ["A13", "Location denied"], ["A15", "Session expired"], ["A16", "Not in your area", { place: "Civil Lines, Kanpur" }], ["A17", "Page not found"]]],
  ["Payments", [["A18", "Processing", { amount: 307, method: 0 }], ["A19", "Success", { amount: 307, method: 0 }], ["A20", "Failed", { amount: 346, reason: "Your bank declined the card." }]]],
  ["Empty states", [["I1", "Empty cart"], ["I2", "Nothing in progress"], ["I3", "No orders"], ["I6", "No notifications"], ["I7", "No favorites"], ["I8", "No offers"]]],
  ["Vertical warnings", [["D13", "Restaurant closed", { name: "Spice Garden" }], ["D14", "Cart conflict", { available: 3 }], ["E9", "No drivers"], ["F13", "Grocery warning", { kind: "minimum", needed: "₹86" }]]],
  ["Account (K)", [["K2", "Edit profile"], ["K3", "Saved addresses"], ["C7", "Address form"], ["K4", "Refer & earn"], ["K5", "Notification settings"], ["K6", "Language"], ["K7", "Privacy & permissions"], ["B10", "Terms viewer", { doc: "terms" }], ["K8", "Delete account"], ["K10", "About"], ["K11", "Rate the app"], ["K12", "Change phone"], ["H3", "Add card / UPI"], ["H4", "Payment methods"], ["D12", "Favorites"], ["C13", "Offers"], ["L1", "Help & Support"]]],
  ["Shared", [["C5", "Location picker", { target: "deliver" }], ["C9", "Search results", { service: "food", query: "" }], ["C12", "Notifications"], ["C15", "Apply coupon"], ["J7", "Refund status", { id: 5 }]]],
];
function ScreenIndex({ onOpen, onSignOut }: { onOpen: (id: string, params?: any) => void; onSignOut: () => void }) {
  return <aside className="screen-index" aria-label="Prototype screen index">
    <h2>Screen index</h2><p>Batch 1 + Account screens</p>
    {INDEX.map(([group, items]) => <div key={group}><h3>{group}</h3>{items.map(([id, label, params]) => <button key={id} onClick={() => onOpen(id, params)}><b>{id}</b>{label}</button>)}</div>)}
    <button className="index-out" onClick={onSignOut}>Restart onboarding</button>
  </aside>;
}

export default function App() {
  // Bumping the epoch remounts the store and shell, which clears all app state (used after account deletion).
  const [epoch, setEpoch] = useState(0);
  return (
    <ErrorBoundary onReset={() => setEpoch((e) => e + 1)}>
      <I18nProvider>
        <StoreProvider key={epoch}>
          <Shell onReset={() => setEpoch((e) => e + 1)} />
        </StoreProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}

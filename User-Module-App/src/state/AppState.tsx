import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState as AppStateRN } from "react-native";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  PACKAGE_TYPES,
  PRODUCTS,
  RESTAURANTS,
  RIDE_OPTIONS,
  SEED_PLACES,
  serviceMeta,
  type Place,
  type Service,
} from "../data/demo";
import { computeBill, type Bill } from "../lib/pricing";
import {
  createBackendOrder,
  fetchOrdersFromBackend,
  subscribeToBackendOrders,
} from "../lib/orderService";
import { signOut as authSignOut, getActiveSession, fetchCustomerProfile } from "../lib/authService";
import { isSupabaseConfigured } from "../lib/supabase";

function mergeBackendOrders(currentOrders: Order[], backendOrders: Order[]): Order[] {
  const backendMap = new Map(backendOrders.map((bo) => [bo.id, bo]));
  const updatedOrders = currentOrders.map((o) => {
    const bo = backendMap.get(o.id) || (o.dbId ? backendOrders.find((b) => b.dbId === o.dbId) : undefined);
    if (bo) {
      return {
        ...o,
        dbId: bo.dbId ?? o.dbId,
        status: bo.status,
        completedAt: bo.completedAt ?? o.completedAt,
        subtitle: bo.subtitle,
      };
    }
    return o;
  });

  const existingIds = new Set(currentOrders.map((o) => o.id));
  const existingDbIds = new Set(currentOrders.map((o) => o.dbId).filter(Boolean));
  const newOrders = backendOrders.filter(
    (bo) => !existingIds.has(bo.id) && (!bo.dbId || !existingDbIds.has(bo.dbId))
  );

  return [...newOrders, ...updatedOrders];
}


/* ------------------------------------------------------------------ types */

export type CartLine = {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  qty: number;
};
export type DeliveryService = "food" | "grocery";

export type OrderLine = { name: string; qty: number; price: number };
export type Order = {
  id: string;
  dbId?: string;
  service: Service;
  title: string;
  subtitle: string;
  lines: OrderLine[];
  bill: Bill;
  payment: string;
  destination: string;
  /** 0 Confirmed · 1 Picked up · 2 On the way · 3 Delivered/Completed */
  status: number;
  createdAt: number;
  completedAt?: number;
  rating?: number;
  /** Seeded history from the design; never advanced by the simulator. */
  seeded?: boolean;
};

export type Txn = {
  id: string;
  icon: string;
  label: string;
  when: number;
  amount: number;
};
export type Notice = { id: string; text: string; when: number; read: boolean };

export type PersistedState = {
  version: 1;
  authenticated: boolean;
  isGuest: boolean;
  profile: {
    id?: string;
    name: string;
    phone: string;
    language: string;
    profileCompleted?: boolean;
  };
  service: Service;
  places: Place[];
  defaultPlaceId: string;
  carts: Record<DeliveryService, { storeId: string | null; lines: CartLine[] }>;
  ride: { optionId: string; pickupId: string; dropId: string | null };
  courier: { packageId: string; pickupId: string; dropId: string | null };
  promos: Partial<Record<Service, string>>;
  usedPromos: string[];
  orders: Order[];
  wallet: { balance: number; autoTopUp: boolean; txns: Txn[] };
  notifications: Notice[];
  favorites: string[];
};

const STORAGE_KEY = "roadrider.user-app.v1";

/* ---------------------------------------------------------- seeded state */

function at(daysAgo: number, h: number, m: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

function seedState(): PersistedState {
  return {
    version: 1,
    authenticated: false,
    isGuest: false,
    profile: { name: "", phone: "", language: "English", profileCompleted: false },
    service: "food",
    places: SEED_PLACES,
    defaultPlaceId: "home",
    carts: {
      food: { storeId: null, lines: [] },
      grocery: { storeId: null, lines: [] },
    },
    ride: { optionId: "auto", pickupId: "home", dropId: "work" },
    courier: { packageId: "small", pickupId: "home", dropId: "work" },
    promos: {},
    usedPromos: [],
    orders: [],
    wallet: {
      balance: 320,
      autoTopUp: false,
      txns: [
        {
          id: "t-init-1",
          icon: "card",
          label: "Wallet Top-up",
          when: Date.now() - 3600000 * 3,
          amount: 200,
        },
      ],
    },
    notifications: [],
    favorites: [],
  };
}

/* ---------------------------------------------------------------- context */

type Toast = { id: number; text: string } | null;

export type PendingAction =
  | {
      type: "wishlist";
      itemId: string;
      itemTitle?: string;
    }
  | {
      type: "cart";
      service: DeliveryService;
      line: Omit<CartLine, "qty">;
      storeId: string;
    };

type PlaceOrderResult =
  | { ok: true; order: Order; dbOrderId?: string }
  | { ok: false; error: string };

type Ctx = {
  state: PersistedState;
  toast: Toast;
  showToast: (text: string) => void;
  isReady: boolean;
  // guest action preservation across login
  pendingAction: PendingAction | null;
  setPendingAction: (action: PendingAction | null) => void;
  clearPendingAction: () => void;
  // auth & profile
  signIn: (
    phone: string,
    profileData?: {
      id?: string;
      name?: string;
      walletBalance?: number;
      profileCompleted?: boolean;
    }
  ) => void;
  continueAsGuest: () => void;
  signOut: () => void;
  updateProfile: (patch: Partial<PersistedState["profile"]>) => void;
  // service & places
  setService: (s: Service) => void;
  placeById: (id: string | null | undefined) => Place | undefined;
  setDefaultPlace: (id: string) => void;
  addPlace: (p: Omit<Place, "id">) => Place;
  removePlace: (id: string) => void;
  // carts
  addToCart: (
    service: DeliveryService,
    line: Omit<CartLine, "qty">,
    storeId: string
  ) => void;
  changeQty: (service: DeliveryService, id: string, delta: number) => void;
  cartCount: (service: Service) => number;
  itemTotal: (service: Service) => number;
  // ride & courier
  setRide: (patch: Partial<PersistedState["ride"]>) => void;
  setCourier: (patch: Partial<PersistedState["courier"]>) => void;
  // promo
  applyPromo: (service: Service, code: string | null) => void;
  // orders
  placeOrder: (
    service: Service,
    method: "wallet" | "upi" | "card" | "cod",
    destination: string
  ) => Promise<PlaceOrderResult>;
  syncOrders: () => Promise<void>;
  setOrderStatus: (id: string, status: number) => void;
  rateOrder: (id: string, rating: number) => void;
  // wallet
  addMoney: (amount: number) => void;
  setAutoTopUp: (on: boolean) => void;
  // misc
  toggleFavorite: (id: string) => void;
  markAllRead: () => void;
};

const AppContext = createContext<Ctx | null>(null);

export const STATUS_LABELS = [
  "Confirmed",
  "Picked up",
  "On the way",
  "Delivered",
];

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(seedState);
  const [toast, setToast] = useState<Toast>(null);
  const [pendingActionState, setPendingActionState] = useState<PendingAction | null>(null);
  const pendingActionRef = useRef<PendingAction | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [isReady, setIsReady] = useState(false);
  const isLoaded = useRef(false);

  // Restore state from AsyncStorage and active Supabase session on initial load
  useEffect(() => {
    let mounted = true;

    async function initializeSession() {
      let restored: PersistedState | null = null;
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as PersistedState;
          if (parsed && parsed.version === 1) {
            restored = parsed;
          }
        }
      } catch {}

      // Check real Supabase GoTrue session
      let activeSession: any = null;
      try {
        activeSession = await getActiveSession();
      } catch {}

      if (activeSession?.user) {
        // Authenticated session exists in GoTrue!
        const userPhone = activeSession.user.phone
          ? activeSession.user.phone.replace(/\D/g, "").slice(-10)
          : restored?.profile?.phone || "";

        const customer = userPhone ? await fetchCustomerProfile(userPhone) : null;
        const hasCompleteProfile = Boolean(
          customer?.full_name &&
          customer.full_name.trim().length > 0 &&
          customer.full_name !== "RoadRider Customer"
        );

        const base = restored || seedState();
        const authedState: PersistedState = {
          ...base,
          authenticated: true,
          isGuest: false,
          profile: {
            ...base.profile,
            id: customer?.id || base.profile.id,
            phone: userPhone || base.profile.phone,
            name: customer?.full_name || base.profile.name || "",
            profileCompleted: hasCompleteProfile,
          },
          wallet: {
            ...base.wallet,
            balance:
              customer?.wallet_balance !== undefined
                ? Number(customer.wallet_balance)
                : base.wallet.balance,
          },
        };

        if (mounted) {
          setState(authedState);
          isLoaded.current = true;
          setIsReady(true);
        }

        if (userPhone || customer?.id) {
          fetchOrdersFromBackend(userPhone, customer?.id).then((backendOrders) => {
            if (mounted && backendOrders && backendOrders.length > 0) {
              setState((s) => ({
                ...s,
                orders: mergeBackendOrders(s.orders, backendOrders),
              }));
            }
          });
        }
        return;
      }

      // No active Supabase session
      if (restored) {
        // If Supabase is configured and has no session, the user is unauthenticated
        const isAuth = isSupabaseConfigured ? false : Boolean(restored.authenticated);
        if (mounted) {
          setState({
            ...restored,
            authenticated: isAuth,
            isGuest: isAuth ? false : Boolean(restored.isGuest),
            wallet: isAuth
              ? restored.wallet
              : { balance: 0, autoTopUp: false, txns: [] },
          });
          isLoaded.current = true;
          setIsReady(true);
        }
      } else {
        if (mounted) {
          setState(seedState());
          isLoaded.current = true;
          setIsReady(true);
        }
      }
    }

    initializeSession();

    return () => {
      mounted = false;
    };
  }, []);

  // Sync orders whenever app transitions from background to active (recovery from missed events)
  useEffect(() => {
    const subscription = AppStateRN.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        const phone = state.profile?.phone || undefined;
        const id = state.profile?.id || undefined;
        if (phone || id) {
          fetchOrdersFromBackend(phone, id).then((backendOrders) => {
            if (backendOrders && backendOrders.length > 0) {
              setState((s) => ({
                ...s,
                orders: mergeBackendOrders(s.orders, backendOrders),
              }));
            }
          });
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [state.profile?.phone, state.profile?.id]);

  // Persist state changes to AsyncStorage
  useEffect(() => {
    if (!isLoaded.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {
      // Storage unavailable or quota exceeded
    });
  }, [state]);

  const showToast = useCallback((text: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), text });
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const notify = (s: PersistedState, text: string): PersistedState => ({
    ...s,
    notifications: [
      {
        id: `n${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
        text,
        when: Date.now(),
        read: false,
      },
      ...s.notifications,
    ],
  });

  // Subscribe to live realtime order status updates from Supabase (Vendor, Rider, Admin updates)
  useEffect(() => {
    const userPhone = state.profile.phone ? state.profile.phone.replace(/[^0-9]/g, "") : "";

    const unsubscribe = subscribeToBackendOrders((update) => {
      setState((prev) => {
        // Customer isolation: ignore updates that belong to other customers if customer_phone is present
        if (userPhone && update.raw?.customer_phone) {
          const rawPhone = String(update.raw.customer_phone).replace(/[^0-9]/g, "");
          if (rawPhone && !rawPhone.includes(userPhone) && !userPhone.includes(rawPhone)) {
            return prev;
          }
        }

        const idx = prev.orders.findIndex(
          (o) =>
            o.id === update.displayId ||
            o.id === update.dbId ||
            (update.raw.order_number &&
              o.id.includes(String(update.raw.order_number)))
        );

        if (idx === -1) {
          // If this is a newly created backend order for THIS customer, fetch and sync
          if (!userPhone || (update.raw?.customer_phone && update.raw.customer_phone.includes(userPhone))) {
            fetchOrdersFromBackend(prev.profile.phone).then((freshOrders) => {
              if (freshOrders && freshOrders.length > 0) {
                setState((current) => ({
                  ...current,
                  orders: mergeBackendOrders(current.orders, freshOrders),
                }));
              }
            });
          }
          return prev;
        }

        const existing = prev.orders[idx];
        const statusChanged = existing.status !== update.status;

        const updatedOrder: Order = {
          ...existing,
          status: update.status,
          completedAt:
            update.status >= 3 || update.status === -1
              ? update.completedAt || Date.now()
              : existing.completedAt,
        };

        const nextOrders = [...prev.orders];
        nextOrders[idx] = updatedOrder;

        let nextState: PersistedState = {
          ...prev,
          orders: nextOrders,
        };

        if (statusChanged) {
          const statusMessage =
            update.status === -1
              ? `${existing.title}: Order has been cancelled`
              : update.status === 1
              ? `${existing.title}: Order is being prepared / picked up`
              : update.status === 2
              ? `${existing.title}: On the way to your destination`
              : update.status === 3
              ? `${existing.title}: Delivered successfully!`
              : `${existing.title}: Order status updated to ${update.orderStatus}`;

          nextState = notify(nextState, statusMessage);
          showToast(statusMessage);
        }

        return nextState;
      });
    });

    return () => {
      unsubscribe();
    };
  }, [state.profile.phone, showToast]);

  const value = useMemo<Ctx>(() => {
    const placeById = (id: string | null | undefined) =>
      state.places.find((p) => p.id === id);

    const itemTotal = (service: Service) => {
      if (service === "food" || service === "grocery")
        return state.carts[service].lines.reduce(
          (sum, l) => sum + l.price * l.qty,
          0
        );
      if (service === "rides")
        return (
          RIDE_OPTIONS.find((r) => r.id === state.ride.optionId)?.fare ?? 0
        );
      return (
        PACKAGE_TYPES.find((p) => p.id === state.courier.packageId)?.price ?? 0
      );
    };

    return {
      state,
      toast,
      showToast,
      isReady,
      pendingAction: pendingActionState,
      setPendingAction: (action) => {
        pendingActionRef.current = action;
        setPendingActionState(action);
      },
      clearPendingAction: () => {
        pendingActionRef.current = null;
        setPendingActionState(null);
      },
      continueAsGuest: () => {
        setState((s) => ({
          ...s,
          isGuest: true,
          authenticated: false,
          profile: {
            ...s.profile,
            name: "",
            phone: "",
            profileCompleted: false,
          },
          wallet: { balance: 0, autoTopUp: false, txns: [] },
        }));
      },
      signIn: (phone, profileData) => {
        const actionToExecute = pendingActionRef.current;
        const customerId = profileData?.id;
        setState((s) => {
          const isDifferentUser = Boolean(s.profile.phone && s.profile.phone !== phone);
          let next: PersistedState = {
            ...s,
            authenticated: true,
            isGuest: false,
            // Prevent data leakage across accounts when switching users
            orders: isDifferentUser ? [] : s.orders,
            profile: {
              ...s.profile,
              id: customerId !== undefined ? customerId : (isDifferentUser ? undefined : s.profile.id),
              phone,
              name:
                profileData?.name !== undefined
                  ? profileData.name
                  : s.profile.name,
              profileCompleted:
                profileData?.profileCompleted !== undefined
                  ? profileData.profileCompleted
                  : Boolean(s.profile.name && s.profile.name.trim().length > 0),
            },
            wallet: {
              ...s.wallet,
              balance:
                profileData?.walletBalance !== undefined
                  ? profileData.walletBalance
                  : s.wallet.balance,
            },
          };
          if (actionToExecute) {
            if (actionToExecute.type === "wishlist") {
              if (!next.favorites.includes(actionToExecute.itemId)) {
                next = {
                  ...next,
                  favorites: [...next.favorites, actionToExecute.itemId],
                };
              }
            } else if (actionToExecute.type === "cart") {
              const cart = next.carts[actionToExecute.service];
              const lines =
                cart.storeId && cart.storeId !== actionToExecute.storeId
                  ? []
                  : cart.lines;
              const existing = lines.find((l) => l.id === actionToExecute.line.id);
              const nextLines = existing
                ? lines.map((l) =>
                    l.id === actionToExecute.line.id ? { ...l, qty: l.qty + 1 } : l
                  )
                : [...lines, { ...actionToExecute.line, qty: 1 }];
              next = {
                ...next,
                carts: {
                  ...next.carts,
                  [actionToExecute.service]: {
                    storeId: actionToExecute.storeId,
                    lines: nextLines,
                  },
                },
              };
            }
          }
          return next;
        });

        if (actionToExecute) {
          if (actionToExecute.type === "wishlist") {
            showToast(
              actionToExecute.itemTitle
                ? `Added ${actionToExecute.itemTitle} to favorites!`
                : "Added to favorites!"
            );
          } else if (actionToExecute.type === "cart") {
            showToast(`Added ${actionToExecute.line.name} to cart!`);
          }
          pendingActionRef.current = null;
          setPendingActionState(null);
        }

        // Fetch fresh backend orders for this user upon signing in
        fetchOrdersFromBackend(phone, customerId).then((backendOrders) => {
          if (backendOrders && backendOrders.length > 0) {
            setState((curr) => ({
              ...curr,
              orders: mergeBackendOrders(curr.orders, backendOrders),
            }));
          }
        });
      },
      signOut: () => {
        authSignOut();
        setState((s) => ({
          ...s,
          authenticated: false,
          isGuest: false,
          profile: {
            id: undefined,
            name: "",
            phone: "",
            language: "English",
            profileCompleted: false,
          },
          wallet: { balance: 0, autoTopUp: false, txns: [] },
          orders: [],
          notifications: [],
        }));
        AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
      },
      updateProfile: (patch) =>
        setState((s) => ({ ...s, profile: { ...s.profile, ...patch } })),
      setService: (service) => setState((s) => ({ ...s, service })),
      placeById,
      setDefaultPlace: (id) => setState((s) => ({ ...s, defaultPlaceId: id })),
      addPlace: (p) => {
        const place: Place = { ...p, id: `place-${Date.now()}` };
        setState((s) => ({ ...s, places: [...s.places, place] }));
        return place;
      },
      removePlace: (id) =>
        setState((s) => {
          const places = s.places.filter((p) => p.id !== id);
          const fallback = places[0]?.id ?? "";
          const swap = (v: string | null) => (v === id ? null : v);
          return {
            ...s,
            places,
            defaultPlaceId: s.defaultPlaceId === id ? fallback : s.defaultPlaceId,
            ride: {
              ...s.ride,
              pickupId: s.ride.pickupId === id ? fallback : s.ride.pickupId,
              dropId: swap(s.ride.dropId),
            },
            courier: {
              ...s.courier,
              pickupId:
                s.courier.pickupId === id ? fallback : s.courier.pickupId,
              dropId: swap(s.courier.dropId),
            },
          };
        }),
      addToCart: (service, line, storeId) =>
        setState((s) => {
          const cart = s.carts[service];
          const lines =
            cart.storeId && cart.storeId !== storeId ? [] : cart.lines;
          const existing = lines.find((l) => l.id === line.id);
          const nextLines = existing
            ? lines.map((l) =>
                l.id === line.id ? { ...l, qty: l.qty + 1 } : l
              )
            : [...lines, { ...line, qty: 1 }];
          return {
            ...s,
            carts: { ...s.carts, [service]: { storeId, lines: nextLines } },
          };
        }),
      changeQty: (service, id, delta) =>
        setState((s) => {
          const cart = s.carts[service];
          const lines = cart.lines
            .map((l) => (l.id === id ? { ...l, qty: l.qty + delta } : l))
            .filter((l) => l.qty > 0);
          return {
            ...s,
            carts: {
              ...s.carts,
              [service]: {
                storeId: lines.length ? cart.storeId : null,
                lines,
              },
            },
          };
        }),
      cartCount: (service) => {
        if (service === "food" || service === "grocery")
          return state.carts[service].lines.reduce((n, l) => n + l.qty, 0);
        if (service === "rides") return state.ride.dropId ? 1 : 0;
        return state.courier.dropId ? 1 : 0;
      },
      itemTotal,
      setRide: (patch) =>
        setState((s) => ({ ...s, ride: { ...s.ride, ...patch } })),
      setCourier: (patch) =>
        setState((s) => ({ ...s, courier: { ...s.courier, ...patch } })),
      applyPromo: (service, code) =>
        setState((s) => {
          const promos = { ...s.promos };
          if (code) promos[service] = code;
          else delete promos[service];
          return { ...s, promos };
        }),
      placeOrder: async (service, method, destination) => {
        const total = itemTotal(service);
        const bill = computeBill(service, total, state.promos[service] ?? null);
        if (total <= 0) return { ok: false, error: "Your cart is empty." };
        if (method !== "wallet" && method !== "cod") {
          return {
            ok: false,
            error:
              "Online payments aren't connected in this build. Please pay with Cash on Delivery (COD) or RoadRider Wallet.",
          };
        }
        if (method === "wallet" && state.wallet.balance < bill.toPay) {
          return {
            ok: false,
            error: `Insufficient wallet balance. Add ₹${
              bill.toPay - state.wallet.balance
            } or more to continue.`,
          };
        }
        let title = "";
        let subtitle = "";
        let lines: OrderLine[] = [];
        let storeId: string | null = null;
        if (service === "food" || service === "grocery") {
          const cart = state.carts[service];
          storeId = cart.storeId;
          lines = cart.lines.map((l) => ({
            name: l.name,
            qty: l.qty,
            price: l.price,
          }));
          const count = cart.lines.reduce((n, l) => n + l.qty, 0);
          title =
            service === "food"
              ? RESTAURANTS.find((r) => r.id === cart.storeId)?.name ??
                "Food order"
              : "Fresh grocery basket";
          subtitle = `${count} item${count > 1 ? "s" : ""} · ${cart.lines
            .map((l) => l.name)
            .join(", ")}`;
        } else if (service === "rides") {
          const opt = RIDE_OPTIONS.find((r) => r.id === state.ride.optionId)!;
          const from = placeById(state.ride.pickupId);
          const to = placeById(state.ride.dropId);
          title = `Ride to ${to?.area.split(",")[0] ?? "destination"}`;
          subtitle = `${opt.name} · ${from?.area.split(",")[0] ?? "Pickup"} → ${
            to?.area.split(",")[0] ?? ""
          }`;
          lines = [{ name: `${opt.name} ride`, qty: 1, price: opt.fare }];
        } else {
          const pkg = PACKAGE_TYPES.find(
            (p) => p.id === state.courier.packageId
          )!;
          const to = placeById(state.courier.dropId);
          title = `Package to ${to?.area.split(",")[0] ?? "destination"}`;
          subtitle = `${pkg.name} · ${pkg.weight.toLowerCase()}`;
          lines = [
            {
              name: `${pkg.name} · ${pkg.weight.toLowerCase()}`,
              qty: 1,
              price: pkg.price,
            },
          ];
        }

        // Persist order to Supabase backend (orders & order_items)
        const backendRes = await createBackendOrder({
          service,
          paymentMethod: method,
          destination,
          total,
          promoCode: state.promos[service] ?? null,
          lines,
          storeId,
          customerProfile: state.profile,
        });

        if (!backendRes.ok || !backendRes.order) {
          return {
            ok: false,
            error: backendRes.error || "Failed to place order.",
          };
        }

        const order: Order = {
          ...backendRes.order,
          dbId: backendRes.dbOrderId || backendRes.order.dbId,
          title,
          subtitle,
        };

        setState((s) => {
          let next: PersistedState = {
            ...s,
            orders: [order, ...s.orders],
            usedPromos: bill.promo ? [...s.usedPromos, bill.promo] : s.usedPromos,
            promos: { ...s.promos, [service]: undefined },
          };

          if (method === "wallet") {
            next = {
              ...next,
              wallet: {
                ...s.wallet,
                balance: s.wallet.balance - bill.toPay,
                txns: [
                  {
                    id: `t${Date.now()}`,
                    icon: serviceMeta[service].icon,
                    label: title,
                    when: Date.now(),
                    amount: -bill.toPay,
                  },
                  ...s.wallet.txns,
                ],
              },
            };
          }

          if (service === "food" || service === "grocery")
            next = {
              ...next,
              carts: { ...next.carts, [service]: { storeId: null, lines: [] } },
            };
          if (service === "rides")
            next = { ...next, ride: { ...next.ride, dropId: null } };
          if (service === "courier")
            next = { ...next, courier: { ...next.courier, dropId: null } };
          return notify(next, `${title}: booking confirmed`);
        });
        return { ok: true, order, dbOrderId: backendRes.dbOrderId };
      },
      syncOrders: async () => {
        const phone = state.profile.phone;
        const id = state.profile.id;
        if (!phone && !id) return;
        const backendOrders = await fetchOrdersFromBackend(phone, id);
        if (backendOrders && backendOrders.length > 0) {
          setState((s) => ({
            ...s,
            orders: mergeBackendOrders(s.orders, backendOrders),
          }));
        }
      },
      setOrderStatus: (id, status) =>
        setState((s) => ({
          ...s,
          orders: s.orders.map((o) =>
            o.id === id
              ? {
                  ...o,
                  status,
                  completedAt: status >= 3 ? Date.now() : o.completedAt,
                }
              : o
          ),
        })),
      rateOrder: (id, rating) =>
        setState((s) => ({
          ...s,
          orders: s.orders.map((o) => (o.id === id ? { ...o, rating } : o)),
        })),
      addMoney: (amount) =>
        setState((s) =>
          notify(
            {
              ...s,
              wallet: {
                ...s.wallet,
                balance: s.wallet.balance + amount,
                txns: [
                  {
                    id: `t${Date.now()}`,
                    icon: "wallet",
                    label: "Money added (demo)",
                    when: Date.now(),
                    amount,
                  },
                  ...s.wallet.txns,
                ],
              },
            },
            `₹${amount} demo credit added to your wallet`
          )
        ),
      setAutoTopUp: (on) =>
        setState((s) => ({
          ...s,
          wallet: { ...s.wallet, autoTopUp: on },
        })),
      toggleFavorite: (id) =>
        setState((s) => ({
          ...s,
          favorites: s.favorites.includes(id)
            ? s.favorites.filter((f) => f !== id)
            : [...s.favorites, id],
        })),
      markAllRead: () =>
        setState((s) => ({
          ...s,
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        })),
    };
  }, [state, toast, showToast]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppStateProvider");
  return ctx;
}

export { PRODUCTS };

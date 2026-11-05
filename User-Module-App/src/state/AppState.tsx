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
  RIDE_OPTIONS,
  SEED_PLACES,
  serviceMeta,
  type Place,
  type Service,
} from "../data/demo";
import { computeBill, type Bill } from "../lib/pricing";
import { type LatLng } from "../lib/googleMaps";
import {
  createBackendOrder,
  fetchOrdersFromBackend,
  subscribeToBackendOrders,
  isOrderActive,
  TERMINAL_ORDER_STATUSES,
} from "../lib/orderService";
import { signOut as authSignOut, getActiveSession, fetchCustomerProfile } from "../lib/authService";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import {
  syncCustomerFavoritesFromBackend,
  saveCustomerFavoriteToBackend,
  removeCustomerFavoriteFromBackend,
} from "../lib/supabaseData";

function mergeBackendOrders(currentOrders: Order[], backendOrders: Order[]): Order[] {
  const backendMap = new Map(backendOrders.map((bo) => [bo.id, bo]));
  const updatedOrders = currentOrders.map((o) => {
    const bo = backendMap.get(o.id) || (o.dbId ? backendOrders.find((b) => b.dbId === o.dbId) : undefined);
    if (bo) {
      return {
        ...o,
        dbId: bo.dbId ?? o.dbId,
        status: bo.status,
        orderStatus: bo.orderStatus ?? o.orderStatus,
        restaurantStatus: bo.restaurantStatus ?? o.restaurantStatus,
        deliveryStatus: bo.deliveryStatus ?? o.deliveryStatus,
        cancellationReason: bo.cancellationReason ?? o.cancellationReason,
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
  photo?: string;
};
export type DeliveryService = "food" | "grocery";

export type OrderLine = { name: string; qty: number; price: number; photo?: string };
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
  /** -1 Cancelled · 0 Placed/Confirmed · 1 Preparing · 2 Ready · 3 Handed over / On the way · 4 Delivered */
  status: number;
  orderStatus?: string;
  restaurantStatus?: string;
  deliveryStatus?: string;
  cancellationReason?: string;
  prepMinutes?: number;
  prepDeadline?: string;
  promisedBy?: string;
  acceptedAt?: string;
  readyAt?: string;
  handedOverAt?: string;
  createdAt: number;
  completedAt?: number;
  rating?: number;
  partnerId?: string;
  driverName?: string;
  driverPhone?: string;
  driverVehicle?: string;
  pickupAddress?: string;
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
  ride: {
    optionId: string;
    pickupId: string;
    dropId: string | null;
    pickupCoords?: LatLng;
    pickupAddress?: string;
    dropCoords?: LatLng;
    dropAddress?: string;
    routePolyline?: string;
    roadDistanceKm?: number;
    estimatedDurationMins?: number;
  };
  courier: {
    packageId: string;
    pickupId: string;
    dropId: string | null;
    vehicleType?: "bike" | "3wheeler";
    payAt?: "pickup" | "drop";
    category?: string;
    weight?: string;
    isFragile?: boolean;
    receiverName?: string;
    receiverPhone?: string;
    senderName?: string;
    senderPhone?: string;
    fare?: number;
    pickupCoords?: LatLng;
    pickupAddress?: string;
    dropCoords?: LatLng;
    dropAddress?: string;
    routePolyline?: string;
    roadDistanceKm?: number;
    estimatedDurationMins?: number;
  };
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
    places: [],
    defaultPlaceId: "",
    carts: {
      food: { storeId: null, lines: [] },
      grocery: { storeId: null, lines: [] },
    },
    ride: { optionId: "auto", pickupId: "", dropId: null },
    courier: { packageId: "small", pickupId: "", dropId: null },
    promos: {},
    usedPromos: [],
    orders: [],
    wallet: {
      balance: 0,
      autoTopUp: false,
      txns: [],
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

export type AuthStatus = "initializing" | "guest" | "authenticated";

type Ctx = {
  state: PersistedState;
  authStatus: AuthStatus;
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
  updatePlace: (id: string, patch: Partial<Place>) => void;
  deletePlace: (id: string) => Promise<void>;
  syncCustomerAddresses: () => Promise<void>;
  // Location selection bottom sheet
  isLocationSheetVisible: boolean;
  openLocationSheet: () => void;
  closeLocationSheet: () => void;
  // carts
  addToCart: (
    service: DeliveryService,
    line: Omit<CartLine, "qty">,
    storeId: string
  ) => void;
  changeQty: (service: DeliveryService, id: string, delta: number) => void;
  clearCart: (service: DeliveryService) => void;
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
  cancelOrder: (orderId: string, reason?: string) => Promise<{ ok: boolean; error?: string }>;
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
  const [isLocationSheetVisible, setIsLocationSheetVisible] = useState(false);

  const openLocationSheet = useCallback(() => {
    setIsLocationSheetVisible(true);
  }, []);

  const closeLocationSheet = useCallback(() => {
    setIsLocationSheetVisible(false);
  }, []);

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
            // Cold start order sanitization: terminal or expired orders must never reopen active screens
            const sanitizedOrders = (parsed.orders || []).map((o: Order) => {
              if (
                o.orderStatus &&
                TERMINAL_ORDER_STATUSES.has(o.orderStatus.toLowerCase().trim())
              ) {
                return { ...o, status: -1 };
              }
              if (
                o.status >= 0 &&
                o.status < 4 &&
                o.createdAt &&
                Date.now() - o.createdAt > 18 * 3600 * 1000
              ) {
                return { ...o, status: -1, orderStatus: "expired" };
              }
              return o;
            });
            restored = { ...parsed, orders: sanitizedOrders };
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
        let initialOrders = base.orders;

        if (userPhone || customer?.id) {
          try {
            const fetchPromise = fetchOrdersFromBackend(userPhone, customer?.id);
            const timeoutPromise = new Promise<Order[]>((resolve) =>
              setTimeout(() => resolve([]), 2000)
            );
            const backendOrders = await Promise.race([fetchPromise, timeoutPromise]);
            if (backendOrders && backendOrders.length > 0) {
              initialOrders = mergeBackendOrders(base.orders, backendOrders);
            }
          } catch (e) {
            console.warn("[AppState] Startup order sync notice:", e);
          }
        }

        const authedState: PersistedState = {
          ...base,
          authenticated: true,
          isGuest: false,
          orders: initialOrders,
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
      // Check first launch for location selection bottom sheet
      try {
        const firstLaunchDone = await AsyncStorage.getItem("roadrider.first_launch_done");
        if (!firstLaunchDone && mounted) {
          setIsLocationSheetVisible(true);
        }
      } catch {}
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
          orderStatus: update.orderStatus || existing.orderStatus,
          partnerId: update.raw?.partner_id || existing.partnerId,
          prepMinutes: update.raw?.prep_minutes ?? existing.prepMinutes,
          prepDeadline: update.raw?.prep_deadline || update.raw?.promised_by || existing.prepDeadline,
          promisedBy: update.raw?.promised_by || existing.promisedBy,
          acceptedAt: update.raw?.accepted_at || existing.acceptedAt,
          readyAt: update.raw?.ready_at || existing.readyAt,
          handedOverAt: update.raw?.handed_over_at || existing.handedOverAt,
          completedAt:
            update.status >= 4 || update.status === -1
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
      authStatus: !isReady
        ? "initializing"
        : state.authenticated
        ? "authenticated"
        : "guest",
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
      signOut: async () => {
        try {
          await authSignOut();
        } catch {}
        setState((s) => ({
          ...s,
          authenticated: false,
          isGuest: true,
          profile: {
            id: undefined,
            name: "",
            phone: "",
            language: s.profile.language || "English",
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
        setState((s) => ({
          ...s,
          places: [...s.places, place],
          defaultPlaceId: s.defaultPlaceId || place.id,
        }));

        // Asynchronously sync to Supabase customer_addresses if authenticated
        if (state.authenticated && isSupabaseConfigured && supabase) {
          (async () => {
            try {
              const { data: session } = await supabase.auth.getSession();
              const authUser = session?.session?.user;
              if (authUser) {
                const { data: cust } = await supabase
                  .from("customers")
                  .select("id")
                  .eq("auth_user_id", authUser.id)
                  .maybeSingle();

                if (cust?.id) {
                  const fullAddr = [p.houseDetails, p.line, p.landmark, p.area]
                    .filter(Boolean)
                    .join(", ");
                  const { data: inserted } = await supabase
                    .from("customer_addresses")
                    .insert({
                      customer_id: cust.id,
                      latitude: p.coords?.lat ?? null,
                      longitude: p.coords?.lng ?? null,
                      full_address: fullAddr,
                      label: p.label || "Home",
                      city: p.area?.split(",")[0]?.trim() || "Lucknow",
                      is_default: false,
                    })
                    .select("id")
                    .maybeSingle();

                  if (inserted?.id) {
                    setState((curr) => ({
                      ...curr,
                      places: curr.places.map((pl) => (pl.id === place.id ? { ...pl, id: inserted.id } : pl)),
                      defaultPlaceId: curr.defaultPlaceId === place.id ? inserted.id : curr.defaultPlaceId,
                    }));
                  }
                }
              }
            } catch (err) {
              console.warn("[AppState] Error syncing address to customer_addresses:", err);
            }
          })();
        }
        return place;
      },
      updatePlace: (id, patch) => {
        setState((s) => ({
          ...s,
          places: s.places.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }));

        if (state.authenticated && isSupabaseConfigured && supabase) {
          (async () => {
            try {
              const updatePayload: any = { updated_at: new Date().toISOString() };
              if (patch.label) updatePayload.label = patch.label;
              if (patch.line || patch.area) {
                updatePayload.full_address = [patch.houseDetails, patch.line, patch.landmark, patch.area]
                  .filter(Boolean)
                  .join(", ");
              }
              if (patch.coords?.lat) updatePayload.latitude = patch.coords.lat;
              if (patch.coords?.lng) updatePayload.longitude = patch.coords.lng;
              await supabase.from("customer_addresses").update(updatePayload).eq("id", id);
            } catch (err) {
              console.warn("[AppState] Error updating address in customer_addresses:", err);
            }
          })();
        }
      },
      deletePlace: async (id) => {
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
              pickupId: s.courier.pickupId === id ? fallback : s.courier.pickupId,
              dropId: swap(s.courier.dropId),
            },
          };
        });

        if (state.authenticated && isSupabaseConfigured && supabase) {
          try {
            await supabase.from("customer_addresses").delete().eq("id", id);
          } catch (err) {
            console.warn("[AppState] Error deleting address from customer_addresses:", err);
          }
        }
      },
      syncCustomerAddresses: async () => {
        if (!isSupabaseConfigured || !supabase) return;
        try {
          const { data: session } = await supabase.auth.getSession();
          const authUser = session?.session?.user;
          if (!authUser) return;

          const { data: cust } = await supabase
            .from("customers")
            .select("id")
            .eq("auth_user_id", authUser.id)
            .maybeSingle();

          if (!cust?.id) return;

          const { data: dbAddrs, error } = await supabase
            .from("customer_addresses")
            .select("*")
            .eq("customer_id", cust.id);

          if (error || !dbAddrs || dbAddrs.length === 0) return;

          const mappedPlaces: Place[] = dbAddrs.map((a: any) => {
            const icon = (a.label || "").toLowerCase() === "home" ? ("home" as const) : ("pin" as const);
            return {
              id: a.id,
              label: a.label || "Home",
              line: a.full_address || a.city || "Lucknow",
              area: a.city || "Lucknow, Uttar Pradesh",
              icon,
              coords: a.latitude && a.longitude ? { lat: Number(a.latitude), lng: Number(a.longitude) } : undefined,
              addressType: (a.label || "Home") as any,
            };
          });

          setState((curr) => {
            const existingIds = new Set(mappedPlaces.map((p) => p.id));
            const filteredCurrent = curr.places.filter((p) => !existingIds.has(p.id));
            const newPlaces = [...mappedPlaces, ...filteredCurrent];
            const defaultId = curr.defaultPlaceId || mappedPlaces[0]?.id || "";
            return {
              ...curr,
              places: newPlaces,
              defaultPlaceId: defaultId,
            };
          });
        } catch (err) {
          console.warn("[AppState] syncCustomerAddresses error:", err);
        }
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
      clearCart: (service) =>
        setState((s) => ({
          ...s,
          carts: {
            ...s.carts,
            [service]: { storeId: null, lines: [] },
          },
        })),
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
        if (!state.authenticated) {
          return {
            ok: false,
            error: "Please sign in to place an order.",
          };
        }
        const total = itemTotal(service);
        const bill = computeBill(service, total, state.promos[service] ?? null);
        if (total <= 0) return { ok: false, error: "Your cart is empty." };
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
              ? "Food order"
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
          const vehicleTitle =
            state.courier.vehicleType === "3wheeler"
              ? "Parcel on 3-wheeler"
              : "Parcel on Bike";
          const to = placeById(state.courier.dropId);
          const from = placeById(state.courier.pickupId);
          const weightLabel =
            state.courier.weight ||
            (state.courier.vehicleType === "3wheeler" ? "Upto 500 kgs" : "Upto 20 kgs");
          const payAtLabel =
            state.courier.payAt === "drop" ? "Pay at Drop" : "Pay at Pickup";
          title = `${vehicleTitle} to ${to?.area?.split(",")[0] ?? "destination"}`;
          subtitle = `${vehicleTitle} · ${weightLabel} · ${payAtLabel}`;
          const fare =
            state.courier.fare ||
            (state.courier.vehicleType === "3wheeler" ? 141 : 86);
          lines = [
            {
              name: `${vehicleTitle} (${weightLabel})`,
              qty: 1,
              price: fare,
            },
          ];
        }

        // Resolve exact snapshot delivery place and coordinates
        const deliveryPlace =
          service === "rides"
            ? placeById(state.ride.dropId)
            : service === "courier"
            ? placeById(state.courier.dropId)
            : (placeById(state.defaultPlaceId) ?? state.places[0]);

        const pickupPlace =
          service === "rides"
            ? placeById(state.ride.pickupId)
            : service === "courier"
            ? placeById(state.courier.pickupId)
            : null;

        const pickupLat =
          service === "courier"
            ? state.courier.pickupCoords?.lat ?? pickupPlace?.coords?.lat ?? null
            : pickupPlace?.coords?.lat ?? null;

        const pickupLng =
          service === "courier"
            ? state.courier.pickupCoords?.lng ?? pickupPlace?.coords?.lng ?? null
            : pickupPlace?.coords?.lng ?? null;

        const pickupAddr =
          service === "courier"
            ? state.courier.pickupAddress || pickupPlace?.line || pickupPlace?.label || null
            : pickupPlace?.line || pickupPlace?.label || null;

        // Persist order to Supabase backend (orders & order_items) with exact coordinate snapshot
        const backendRes = await createBackendOrder({
          service,
          paymentMethod: method,
          destination,
          total,
          promoCode: state.promos[service] ?? null,
          lines,
          storeId,
          customerProfile: state.profile,
          deliveryLatitude: deliveryPlace?.coords?.lat ?? null,
          deliveryLongitude: deliveryPlace?.coords?.lng ?? null,
          deliveryLandmark: deliveryPlace?.landmark ?? null,
          recipientName:
            service === "courier" && state.courier.receiverName
              ? state.courier.receiverName
              : deliveryPlace?.recipientName || state.profile.name || null,
          recipientMobile:
            service === "courier" && state.courier.receiverPhone
              ? state.courier.receiverPhone
              : deliveryPlace?.recipientMobile || state.profile.phone || null,
          pickupAddress: pickupAddr,
          pickupLatitude: pickupLat,
          pickupLongitude: pickupLng,
          routePolyline:
            service === "courier"
              ? state.courier.routePolyline || null
              : service === "rides"
              ? state.ride.routePolyline || null
              : null,
          roadDistanceKm:
            service === "courier"
              ? state.courier.roadDistanceKm || null
              : service === "rides"
              ? state.ride.roadDistanceKm || null
              : null,
          estimatedDurationMins:
            service === "courier"
              ? state.courier.estimatedDurationMins || null
              : service === "rides"
              ? state.ride.estimatedDurationMins || null
              : null,
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
      cancelOrder: async (orderId: string, reason = "Cancelled by customer") => {
        if (!orderId) return { ok: false, error: "Missing order ID" };

        const target = state.orders.find(
          (o) =>
            o.id === orderId ||
            (o.dbId && o.dbId === orderId) ||
            o.id.includes(orderId) ||
            orderId.includes(o.id)
        );
        const cleanDbId = target?.dbId || (!orderId.startsWith("RR-") ? orderId : null);

        // 1. Synchronously update local state & persist immediately
        setState((prev) => {
          const nextOrders = prev.orders.map((o) => {
            const isMatch =
              o.id === orderId ||
              (cleanDbId && (o.id === cleanDbId || o.dbId === cleanDbId)) ||
              (target && (o.id === target.id || o.dbId === target.dbId));
            if (!isMatch) return o;
            return {
              ...o,
              status: -1,
              orderStatus: "cancelled",
              cancellationReason: reason,
              completedAt: Date.now(),
            };
          });

          let nextState: PersistedState = {
            ...prev,
            orders: nextOrders,
          };

          if (target?.service === "rides") {
            nextState.ride = {
              ...nextState.ride,
              dropId: null,
              routePolyline: undefined,
              roadDistanceKm: undefined,
              estimatedDurationMins: undefined,
            };
          } else if (target?.service === "courier") {
            nextState.courier = {
              ...nextState.courier,
              dropId: null,
              dropCoords: undefined,
              dropAddress: undefined,
              routePolyline: undefined,
              roadDistanceKm: undefined,
              estimatedDurationMins: undefined,
            };
          }

          // Force immediate AsyncStorage write so restart NEVER sees active status
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextState)).catch(() => {});
          return nextState;
        });

        // 2. Persist cancellation to Supabase
        if (supabase) {
          try {
            if (cleanDbId) {
              await supabase
                .from("orders")
                .update({
                  order_status: "cancelled",
                  cancellation_reason: reason,
                  cancelled_at: new Date().toISOString(),
                })
                .eq("id", cleanDbId);

              await supabase
                .from("rides")
                .update({
                  status: "cancelled",
                  cancelled_at: new Date().toISOString(),
                })
                .eq("id", cleanDbId);
            } else {
              const numOnly = orderId.replace(/\D/g, "");
              if (numOnly) {
                await supabase
                  .from("orders")
                  .update({
                    order_status: "cancelled",
                    cancellation_reason: reason,
                    cancelled_at: new Date().toISOString(),
                  })
                  .eq("order_number", numOnly);
              }
            }
          } catch (err) {
            console.warn("[AppState:cancelOrder] Supabase sync notice:", err);
          }
        }

        showToast("Booking cancelled successfully");
        return { ok: true };
      },
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
        setState((s) => {
          const isFav = s.favorites.includes(id);
          const nextFavs = isFav
            ? s.favorites.filter((f) => f !== id)
            : [...s.favorites, id];

          // Asynchronously sync with Supabase backend if authenticated
          if (s.authenticated && s.profile.id) {
            if (isFav) {
              removeCustomerFavoriteFromBackend(s.profile.id, id).catch(() => {});
            } else {
              saveCustomerFavoriteToBackend(s.profile.id, id).catch(() => {});
            }
          }

          return {
            ...s,
            favorites: nextFavs,
          };
        }),
      markAllRead: () =>
        setState((s) => ({
          ...s,
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        })),
      isLocationSheetVisible,
      openLocationSheet,
      closeLocationSheet,
    };
  }, [state, toast, showToast, isLocationSheetVisible, openLocationSheet, closeLocationSheet]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppStateProvider");
  return ctx;
}

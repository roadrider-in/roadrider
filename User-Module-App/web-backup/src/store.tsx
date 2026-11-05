import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Service } from "./ui";
import {
  getCurrentCustomer,
  updateCustomerProfile,
  deleteAccount,
  type CustomerProfile,
} from "./services/auth.service";
import {
  fetchCustomerAddresses,
  addCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
  setDefaultAddress as setDefaultAddressApi,
  type SavedAddress,
} from "./services/address.service";
import {
  fetchCustomerOrders,
  placeOrder,
  cancelCustomerOrder,
  subscribeToOrders,
  type UserOrder,
} from "./services/orders.service";
import { fetchRestaurants, type RestaurantStore } from "./services/food.service";
import { fetchGroceryProducts, type GroceryProduct } from "./services/grocery.service";
import { createRideBooking, cancelRideBooking } from "./services/rides.service";
import { createCourierBooking } from "./services/courier.service";
import { fetchActiveOffers, validateCouponCode, type OfferItem } from "./services/offers.service";
import { fetchUserNotifications, markNotificationAsRead, type AppNotification } from "./services/notification.service";

export type Order = {
  id: number;
  dbId?: string;
  orderNumber?: string;
  service: Service;
  title: string;
  status: string;
  price: number;
  state: "active" | "past";
  date: string;
  paidWith: string;
  refund?: boolean;
};

export type PlaceKind = "Home" | "Work" | "Other";
export type Place = {
  id: number;
  dbId?: string;
  label: string;
  address: string;
  icon: string;
  kind: PlaceKind;
  house: string;
  street: string;
  landmark: string;
  receiver: string;
  phone: string;
  isDefault: boolean;
  latitude?: number | null;
  longitude?: number | null;
};

export type Profile = {
  id?: string;
  name: string;
  email: string;
  dob: string;
  gender: string;
  phone: string;
  avatar: string | null;
  city?: string;
};

export type Method = { id: number; type: "card" | "upi"; title: string; sub: string; isDefault: boolean };
export type Referral = { id: number; name: string; status: "Joined" | "Pending" | "Coupon earned"; date: string; amount: number };
export type NotifKey = "order" | "ride" | "offers" | "payments" | "account";
export type Channels = { push: boolean; sms: boolean; email: boolean };
export type Perms = { location: boolean; notifications: boolean; camera: boolean; contacts: boolean };
export const LANGUAGES: [string, string][] = [
  ["English", "English"],
  ["हिन्दी", "Hindi"],
];

export const REFERRAL_CODE = "ROADRIDER100";
export type Notice = { id: number; dbId?: string; icon: string; title: string; body: string; time: string };

export const UNIT: Record<Service, number> = { food: 289, rides: 96, grocery: 164, courier: 139 };
export const FEES: Record<Service, number> = { food: 18, rides: 0, grocery: 18, courier: 0 };
export const MIN_ORDER: Record<Service, number> = { food: 0, rides: 0, grocery: 250, courier: 0 };
export const STOCK: Record<Service, number> = { food: 3, rides: 1, grocery: 6, courier: 1 };
export const ORDER_TITLE: Record<Service, string> = {
  food: "Royal Biryani House",
  rides: "Ride to Gomti Nagar",
  grocery: "Fresh grocery basket",
  courier: "Package to Gomti Nagar",
};

export const PAY_METHODS = ["UPI", "Credit or debit card", "Netbanking", "Cash on delivery"] as const;
/** Cash on delivery is offered for food, grocery and rides (pay the driver), not for prepaid courier bookings. */
export const methodsFor = (service: Service): number[] => (service === "courier" ? [0, 1, 2] : [0, 1, 2, 3]);
export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
export const RIDE_NAMES = ["Bike", "Auto", "Cab", "Cab XL", "1 hr rental", "2 hr rental", "4 hr rental", "8 hr rental"];
export const RIDE_FARE = [55, 96, 162, 231, 199, 349, 599, 999];
export const PKG_NAMES = ["Document", "Small box", "Medium box", "Large box"];
export const PKG_FARE = [79, 139, 199, 299];

/** Unit price for a service given the current ride / package selection. */
export const unitFor = (service: Service, rideType: number, pkg: number) =>
  service === "rides" ? RIDE_FARE[rideType] : service === "courier" ? PKG_FARE[pkg] : UNIT[service];

export const payable = (service: Service, qty: number, rideType = 1, pkg = 1) =>
  unitFor(service, rideType, pkg) * Math.max(qty, 1) + FEES[service];

export type Offer = {
  code: string;
  title: string;
  sub: string;
  service: "Food" | "Rides" | "Grocery" | "Courier" | "Rewards";
};

export const OFFERS: Offer[] = [
  { code: "WELCOME50", title: "Flat 50% off", sub: "First food order, up to ₹100", service: "Food" },
  { code: "FREEDEL", title: "Free delivery", sub: "On food orders above ₹299", service: "Food" },
  { code: "RIDE20", title: "20% off rides", sub: "Up to ₹60 on your next Auto or Cab", service: "Rides" },
  { code: "FRESH30", title: "30% off fresh produce", sub: "Fruits and vegetables, up to ₹120", service: "Grocery" },
  { code: "SEND15", title: "₹15 off parcels", sub: "On any courier booking", service: "Courier" },
];

/** Referral rewards are ₹100 discount coupons, one per friend who completed a first order. */
export const rewardOffers = (referrals: Referral[]): Offer[] =>
  referrals
    .filter((r) => r.status === "Coupon earned")
    .map((r) => ({
      code: `REFER100-${r.id}`,
      title: "₹100 referral coupon",
      sub: `Earned when ${r.name} joined`,
      service: "Rewards",
    }));

const COUPON_SERVICE: Record<string, Service> = {
  WELCOME50: "food",
  FREEDEL: "food",
  RIDE20: "rides",
  FRESH30: "grocery",
  SEND15: "courier",
};

const SERVICE_NAME: Record<Service, string> = {
  food: "Food",
  rides: "Rides",
  grocery: "Grocery",
  courier: "Courier",
};

export type CouponResult = { ok: true; code: string; discount: number; note: string } | { ok: false; error: string };

/** Validates a coupon code against the current order and returns the discount in rupees. */
export function couponInfo(
  code: string,
  service: Service,
  items: number,
  referrals: Referral[] = []
): CouponResult {
  const clean = code.trim().toUpperCase();
  const reward = rewardOffers(referrals).find((r) => r.code === clean);
  if (reward) return { ok: true, code: clean, discount: 100, note: "₹100 referral reward applied" };
  const target = COUPON_SERVICE[clean];
  if (!target) return { ok: false, error: "We don't recognise that code. Check the spelling and try again." };
  if (target !== service) return { ok: false, error: `${clean} is valid on ${SERVICE_NAME[target]} only.` };
  if (clean === "FREEDEL" && items < 299) return { ok: false, error: "FREEDEL requires a minimum food order of ₹299." };
  const discount =
    clean === "WELCOME50"
      ? Math.min(100, Math.round(items * 0.5))
      : clean === "FREEDEL"
      ? 35
      : clean === "RIDE20"
      ? Math.min(60, Math.round(items * 0.2))
      : clean === "FRESH30"
      ? Math.min(120, Math.round(items * 0.3))
      : 15;
  return { ok: true, code: clean, discount, note: `${clean} applied (-${inr(discount)})` };
}

export function orderTotal(
  service: Service,
  qty: number,
  rideType = 1,
  pkg = 1,
  coupon: string | null = null,
  referrals: Referral[] = []
) {
  const items = unitFor(service, rideType, pkg) * Math.max(qty, 1);
  const info = coupon ? couponInfo(coupon, service, items, referrals) : null;
  return {
    items,
    discount: info && info.ok ? info.discount : 0,
    total: payable(service, qty, rideType, pkg) - (info && info.ok ? info.discount : 0),
  };
}

function useStoreState() {
  const seq = useRef(100);
  const nextId = () => ++seq.current;

  // Real Profile State
  const [profile, setProfile] = useState<Profile>({
    name: "RoadRider Customer",
    email: "",
    dob: "",
    gender: "",
    phone: "",
    avatar: null,
    city: "Lucknow",
  });

  // Location and Saved Addresses
  const [place, setPlace] = useState("Hazratganj, Lucknow");
  const [pickup, setPickup] = useState("Hazratganj, Lucknow");
  const [drop, setDrop] = useState("");
  const [places, setPlaces] = useState<Place[]>([
    {
      id: 1,
      label: "Home",
      address: "15, Shahnajaf Road, Hazratganj",
      icon: "home",
      kind: "Home",
      house: "15",
      street: "Shahnajaf Road, Hazratganj",
      landmark: "Near Sahu Cinema",
      receiver: "RoadRider Customer",
      phone: "98765 43210",
      isDefault: true,
    },
    {
      id: 2,
      label: "Work",
      address: "Vibhuti Khand, Gomti Nagar",
      icon: "pin",
      kind: "Work",
      house: "Floor 3",
      street: "Vibhuti Khand, Gomti Nagar",
      landmark: "",
      receiver: "RoadRider Customer",
      phone: "98765 43210",
      isDefault: false,
    },
  ]);

  // Payment methods
  const [methods, setMethods] = useState<Method[]>([
    { id: 1, type: "upi", title: "UPI", sub: "Google Pay, PhonePe, Paytm", isDefault: true },
    { id: 2, type: "card", title: "Credit or debit card", sub: "Visa, Mastercard, RuPay", isDefault: false },
  ]);

  // Notifications preferences
  const [notif, setNotifState] = useState<Record<NotifKey, Channels>>({
    order: { push: true, sms: true, email: false },
    ride: { push: true, sms: false, email: false },
    offers: { push: true, sms: false, email: true },
    payments: { push: true, sms: true, email: true },
    account: { push: true, sms: true, email: true },
  });

  const [language, setLanguageState] = useState(() => {
    try {
      const s = localStorage.getItem("roadrider_lang");
      if (s === "हिन्दी" || s === "Hindi" || s === "hi") return "हिन्दी";
      return "English";
    } catch {
      return "English";
    }
  });
  const setLanguage = (lang: string) => {
    const chosen = lang === "हिन्दी" || lang === "Hindi" ? "हिन्दी" : "English";
    setLanguageState(chosen);
    try {
      localStorage.setItem("roadrider_lang", chosen);
    } catch {}
  };
  const [perms, setPerms] = useState<Perms>({ location: true, notifications: true, camera: false, contacts: false });
  const [privacy, setPrivacy] = useState({ personalized: true, share: false });

  // Referrals
  const [referrals] = useState<Referral[]>([
    { id: 1, name: "Riya Sharma", status: "Coupon earned", date: "12 May", amount: 100 },
    { id: 2, name: "Karan Mehta", status: "Coupon earned", date: "03 May", amount: 100 },
    { id: 3, name: "Neha Verma", status: "Joined", date: "Yesterday", amount: 0 },
    { id: 4, name: "+91 91234 56780", status: "Pending", date: "2 days ago", amount: 0 },
  ]);

  const [coupon, setCoupon] = useState<string | null>(null);

  // Real Orders
  const [orders, setOrders] = useState<Order[]>([
    { id: 1, service: "food", title: "Royal Biryani House", status: "Arriving in 18 minutes", price: 289, state: "active", date: "Today", paidWith: "UPI" },
    { id: 2, service: "courier", title: "Package to Gomti Nagar", status: "Courier is at pickup", price: 139, state: "active", date: "Today", paidWith: "Credit or debit card" },
    { id: 3, service: "rides", title: "Ride to Aminabad", status: "Completed · 18 May", price: 124, state: "past", date: "18 May", paidWith: "UPI" },
    { id: 4, service: "grocery", title: "Fresh grocery basket", status: "Delivered · 16 May", price: 346, state: "past", date: "16 May", paidWith: "Cash on delivery" },
    { id: 5, service: "rides", title: "Ride to Charbagh", status: "Cancelled · 12 May", price: 96, state: "past", date: "12 May", paidWith: "UPI", refund: true },
  ]);

  // Live Restaurants and Grocery Products
  const [restaurants, setRestaurants] = useState<RestaurantStore[]>([]);
  const [groceryProducts, setGroceryProducts] = useState<GroceryProduct[]>([]);
  const [activeOffers, setActiveOffers] = useState<OfferItem[]>([]);

  const [qty, setQty] = useState<Record<Service, number>>({ food: 1, rides: 0, grocery: 2, courier: 0 });
  const [notices, setNotices] = useState<Notice[]>([
    { id: 1, icon: "food", title: "Your food order is being prepared", body: "Royal Biryani House has started cooking.", time: "2 min ago" },
    { id: 2, icon: "receipt", title: "Refund of ₹96 initiated", body: "It will reach your original payment method in 5–7 working days.", time: "1 hr ago" },
    { id: 3, icon: "box", title: "Courier partner reached pickup", body: "Arjun is collecting your package.", time: "Yesterday" },
  ]);

  const [favorites, setFavorites] = useState<string[]>([]);
  const [payMethod, setPayMethod] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [lastPaid, setLastPaid] = useState(0);
  const [currentOrder, setCurrentOrder] = useState<number | null>(null);
  const [activeOrderDbId, setActiveOrderDbId] = useState<string | null>(null);
  const [rideType, setRideType] = useState(1);
  const [pkg, setPkg] = useState(1);
  const [gps, setGps] = useState<boolean | null>(null);
  const [notifyAllowed, setNotifyAllowed] = useState<boolean | null>(null);

  // Selected Store & Dynamic Location States
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(() => {
    try {
      const stored = localStorage.getItem("roadrider_selected_coords");
      return stored ? JSON.parse(stored) : { lat: 26.8467, lng: 80.9462 };
    } catch {
      return { lat: 26.8467, lng: 80.9462 };
    }
  });
  const [locationConfirmed, setLocationConfirmed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("roadrider_location_confirmed") === "true";
    } catch {
      return false;
    }
  });
  const [customerNote, setCustomerNote] = useState<string>("");

  const fetchLiveRestaurants = async () => {
    try {
      const realStores = await fetchRestaurants();
      if (realStores.length > 0) {
        setRestaurants(realStores);
      }
    } catch (e) {
      console.warn("[Store] Error reloading restaurants:", e);
    }
  };

  // 1. Initial Load: Auth Customer Profile, Addresses, Orders, Notifications, Stores
  useEffect(() => {
    let isMounted = true;

    async function initBackendData() {
      try {
        const cust = await getCurrentCustomer();
        if (cust && isMounted) {
          setProfile({
            id: cust.id,
            name: cust.full_name || "RoadRider Customer",
            email: cust.email || "",
            dob: "",
            gender: "",
            phone: cust.phone || "",
            avatar: cust.avatar_url || null,
            city: cust.city || "Lucknow",
          });

          // Fetch saved addresses from Supabase
          const dbAddresses = await fetchCustomerAddresses(cust.id);
          if (dbAddresses.length > 0 && isMounted) {
            const mappedPlaces: Place[] = dbAddresses.map((a, idx) => ({
              id: idx + 1,
              dbId: a.id,
              label: a.label || "Home",
              address: a.full_address,
              icon: a.label?.toLowerCase() === "work" ? "pin" : "home",
              kind: (a.label === "Work" ? "Work" : a.label === "Home" ? "Home" : "Other") as PlaceKind,
              house: a.full_address.split(",")[0] || "",
              street: a.full_address.split(",").slice(1).join(",").trim() || a.full_address,
              landmark: "",
              receiver: cust.full_name,
              phone: cust.phone,
              isDefault: a.is_default,
              latitude: a.latitude,
              longitude: a.longitude,
            }));
            setPlaces(mappedPlaces);
            const defaultPlace = mappedPlaces.find((p) => p.isDefault) || mappedPlaces[0];
            if (defaultPlace) {
              setPlace(defaultPlace.address);
              setPickup(defaultPlace.address);
            }
          }

          // Fetch user orders from Supabase
          const dbOrders = await fetchCustomerOrders(cust.id, cust.phone);
          if (dbOrders.length > 0 && isMounted) {
            setOrders(
              dbOrders.map((o) => ({
                id: o.id,
                dbId: o.dbId,
                orderNumber: o.orderNumber,
                service: o.service,
                title: o.title,
                status: o.status,
                price: o.price,
                state: o.state,
                date: o.date,
                paidWith: o.paidWith,
                refund: o.refund,
              }))
            );
          }

          // Fetch notifications from Supabase
          const dbNotices = await fetchUserNotifications(cust.id);
          if (dbNotices.length > 0 && isMounted) {
            setNotices(
              dbNotices.map((n, idx) => ({
                id: idx + 1,
                dbId: n.id,
                icon: n.icon,
                title: n.title,
                body: n.body,
                time: n.time,
              }))
            );
          }
        }

        // Fetch restaurants and grocery products from live database
        const [liveStores, liveGrocery, liveOffers] = await Promise.all([
          fetchRestaurants(),
          fetchGroceryProducts(),
          fetchActiveOffers(),
        ]);

        if (isMounted) {
          if (liveStores.length > 0) setRestaurants(liveStores);
          if (liveGrocery.length > 0) setGroceryProducts(liveGrocery);
          if (liveOffers.length > 0) setActiveOffers(liveOffers);
        }
      } catch (err) {
        console.warn("[Store] Background sync notice:", err);
      }
    }

    initBackendData();

    // 2. Realtime Order Subscription
    const unsubscribe = subscribeToOrders((newOrder) => {
      if (!isMounted || !newOrder) return;
      setOrders((prev) => {
        const existingIdx = prev.findIndex((o) => o.dbId === newOrder.id);
        if (existingIdx >= 0) {
          const updated = [...prev];
          const st = newOrder.order_status?.toLowerCase();
          const isDone = st === "delivered" || st === "completed";
          const isCancel = st === "cancelled" || st === "rejected";
          updated[existingIdx] = {
            ...updated[existingIdx],
            status: isDone ? "Delivered · Today" : isCancel ? "Cancelled" : "Preparing your order",
            state: isDone || isCancel ? "past" : "active",
            refund: isCancel && updated[existingIdx].paidWith !== "Cash on delivery",
          };
          return updated;
        }
        return prev;
      });
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const setQtyFor = (s: Service, n: number) => setQty((q) => ({ ...q, [s]: Math.max(0, n) }));

  /** Records a real order / payment in Supabase database */
  const recordPayment = async (service: Service, methodIndex: number, amount: number) => {
    const id = nextId();
    const methodName = PAY_METHODS[methodIndex] || "UPI";

    // Optimistic UI update
    setOrders((o) => [
      {
        id,
        service,
        title: ORDER_TITLE[service],
        status: "Confirmed",
        price: amount,
        state: "active",
        date: "Today",
        paidWith: methodName,
      },
      ...o,
    ]);
    setCurrentOrder(id);
    setAttempts(0);
    setCoupon(null);
    setLastPaid(amount);

    // Persist real transaction to Supabase
    try {
      if (service === "rides") {
        const res = await createRideBooking({
          customerId: profile.id,
          pickup,
          drop: drop || "Gomti Nagar, Lucknow",
          fare: amount,
          paymentMethod: methodName,
        });
        if (res.ride?.id) {
          setActiveOrderDbId(res.ride.id);
        }
      } else if (service === "courier") {
        const res = await createCourierBooking({
          pickup,
          drop: drop || "Gomti Nagar, Lucknow",
          packageType: PKG_NAMES[pkg] || "Small box",
          fare: amount,
          paymentMethod: methodName,
        });
        if (res.job?.id) {
          setActiveOrderDbId(res.job.id);
        }
      } else {
        const currentStore = restaurants.find((r) => r.id === selectedStoreId) || restaurants[0];
        const res = await placeOrder({
          service,
          storeId: selectedStoreId || (currentStore ? currentStore.id : undefined),
          customerId: profile.id,
          customerName: profile.name,
          customerPhone: profile.phone,
          deliveryAddress: place,
          deliveryLatitude: deliveryCoords?.lat || 26.8467,
          deliveryLongitude: deliveryCoords?.lng || 80.9984,
          customerNote: customerNote || undefined,
          paymentMethod: methodName,
          subtotal: amount,
          discount: 0,
          deliveryFee: FEES[service] || 0,
          totalAmount: amount,
          items:
            currentStore?.menu && currentStore.menu.length > 0
              ? [
                  {
                    name: currentStore.menu[0].name,
                    quantity: Math.max(qty[service], 1),
                    price: currentStore.menu[0].price || amount,
                  },
                ]
              : [
                  {
                    name: ORDER_TITLE[service],
                    quantity: Math.max(qty[service], 1),
                    price: amount,
                  },
                ],
        });

        if (res.order?.dbId) {
          setActiveOrderDbId(res.order.dbId);
          setOrders((prev) =>
            prev.map((o) =>
              o.id === id
                ? { ...o, dbId: res.order!.dbId, orderNumber: res.order!.orderNumber }
                : o
            )
          );
        }
      }
    } catch (err) {
      console.warn("[Store] Error saving order to Supabase:", err);
    }
  };

  const completeOrder = (service: Service) => {
    setOrders((o) =>
      o.map((x) => (x.id === currentOrder ? { ...x, state: "past", status: "Delivered · Today" } : x))
    );
    setQtyFor(service, 0);
    setCurrentOrder(null);
    setActiveOrderDbId(null);
  };

  const updateProfile = async (patch: Partial<Profile>) => {
    setProfile((p) => ({ ...p, ...patch }));
    if (profile.id) {
      await updateCustomerProfile(profile.id, {
        full_name: patch.name,
        email: patch.email,
        city: patch.city,
        avatar_url: patch.avatar,
      });
    }
  };

  const savePlace = async (p: Omit<Place, "id" | "icon"> & { id?: number }) => {
    const icon = p.kind === "Home" ? "home" : p.kind === "Work" ? "pin" : "star";
    const id = p.id ?? nextId();
    const fullAddress = `${p.house ? p.house + ", " : ""}${p.street}${p.landmark ? " (" + p.landmark + ")" : ""}`;
    const existing = places.find((x) => x.id === id);

    setPlaces((list) => {
      const base = p.isDefault || list.length === 0 ? list.map((x) => ({ ...x, isDefault: false })) : list;
      const next = { ...p, id, icon, isDefault: p.isDefault || list.length === 0, address: fullAddress, dbId: existing?.dbId };
      return base.some((x) => x.id === id) ? base.map((x) => (x.id === id ? next : x)) : [...base, next];
    });

    // Persist to Supabase `customer_addresses`
    if (profile.id) {
      if (existing?.dbId) {
        await updateCustomerAddress(existing.dbId, profile.id, {
          label: p.label || p.kind,
          full_address: fullAddress,
          city: profile.city || "Lucknow",
          is_default: p.isDefault,
        });
      } else {
        const res = await addCustomerAddress(profile.id, {
          label: p.label || p.kind,
          full_address: fullAddress,
          city: profile.city || "Lucknow",
          is_default: p.isDefault,
        });
        if (res.data?.id) {
          setPlaces((list) => list.map((x) => (x.id === id ? { ...x, dbId: res.data!.id } : x)));
        }
      }
    }
  };

  const removePlace = async (id: number) => {
    const placeToDelete = places.find((p) => p.id === id);
    setPlaces((list) => {
      const rest = list.filter((x) => x.id !== id);
      return rest.length && !rest.some((x) => x.isDefault)
        ? rest.map((x, i) => ({ ...x, isDefault: i === 0 }))
        : rest;
    });

    if (placeToDelete?.dbId) {
      await deleteCustomerAddress(placeToDelete.dbId);
    }
  };

  const setDefaultPlace = async (id: number) => {
    setPlaces((list) => list.map((x) => ({ ...x, isDefault: x.id === id })));
    const targetPlace = places.find((p) => p.id === id);
    if (targetPlace) {
      setPlace(targetPlace.address);
      if (profile.id && targetPlace.dbId) {
        await setDefaultAddressApi(profile.id, targetPlace.dbId);
      }
    }
  };

  const addMethod = (m: Omit<Method, "id" | "isDefault">) =>
    setMethods((l) => [...l, { ...m, id: nextId(), isDefault: l.length === 0 }]);

  const removeMethod = (id: number) =>
    setMethods((l) => {
      const r = l.filter((x) => x.id !== id);
      return r.length && !r.some((x) => x.isDefault) ? r.map((x, i) => ({ ...x, isDefault: i === 0 })) : r;
    });

  const setDefaultMethod = (id: number) => setMethods((l) => l.map((x) => ({ ...x, isDefault: x.id === id })));
  const setNotif = (key: NotifKey, patch: Partial<Channels>) =>
    setNotifState((n) => ({ ...n, [key]: { ...n[key], ...patch } }));
  const setPerm = (key: keyof Perms, value: boolean) => {
    setPerms((p) => ({ ...p, [key]: value }));
    if (key === "location") setGps(value);
    if (key === "notifications") setNotifyAllowed(value);
  };

  const cancelActiveOrders = async () => {
    const activeOnes = orders.filter((x) => x.state === "active");
    setOrders((o) =>
      o.map((x) =>
        x.state === "active"
          ? { ...x, state: "past", status: "Cancelled · Today", refund: x.paidWith !== "Cash on delivery" }
          : x
      )
    );

    for (const o of activeOnes) {
      if (o.dbId) {
        if (o.service === "rides") {
          await cancelRideBooking(o.dbId);
        } else {
          await cancelCustomerOrder(o.dbId);
        }
      }
    }
  };

  const toggleFavorite = (name: string) =>
    setFavorites((f) => (f.includes(name) ? f.filter((x) => x !== name) : [...f, name]));

  const dismissNotice = async (id: number) => {
    const target = notices.find((x) => x.id === id);
    setNotices((l) => l.filter((x) => x.id !== id));
    if (target?.dbId) {
      await markNotificationAsRead(target.dbId);
    }
  };

  return {
    profile,
    updateProfile,
    methods,
    addMethod,
    removeMethod,
    setDefaultMethod,
    notif,
    setNotif,
    language,
    setLanguage,
    perms,
    setPerm,
    privacy,
    setPrivacy,
    referrals,
    coupon,
    setCoupon,
    savePlace,
    removePlace,
    setDefaultPlace,
    cancelActiveOrders,
    place,
    setPlace,
    pickup,
    setPickup,
    drop,
    setDrop,
    places,
    setPlaces,
    orders,
    setOrders,
    qty,
    setQtyFor,
    notices,
    setNotices,
    dismissNotice,
    favorites,
    toggleFavorite,
    payMethod,
    setPayMethod,
    attempts,
    setAttempts,
    lastPaid,
    recordPayment,
    completeOrder,
    activeOrderDbId,
    setActiveOrderDbId,
    rideType,
    setRideType,
    pkg,
    setPkg,
    gps,
    setGps,
    notifyAllowed,
    setNotifyAllowed,
    restaurants,
    groceryProducts,
    activeOffers,
    selectedStoreId,
    setSelectedStoreId,
    deliveryCoords,
    setDeliveryCoords,
    locationConfirmed,
    setLocationConfirmed,
    customerNote,
    setCustomerNote,
    fetchLiveRestaurants,
  };
}

type Store = ReturnType<typeof useStoreState>;
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={useStoreState()}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const value = useContext(Ctx);
  if (!value) throw new Error("useStore must be used inside StoreProvider");
  return value;
}

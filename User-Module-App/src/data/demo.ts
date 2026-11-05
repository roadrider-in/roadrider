/**
 * DEMO DATA — RoadRider has no backend integration in this project.
 * Everything in this file is demonstration content taken from the approved Figma reference
 * (names, prices, photos, copy). Replace with API calls when a backend becomes available.
 */

export type Service = "food" | "rides" | "grocery" | "courier";

export const PHOTOS = {
  rider: "https://images.unsplash.com/photo-1768423083233-b3f696c9b703?auto=format&fit=crop&w=1080&q=85",
  food: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1080&q=85",
  food2: "https://images.unsplash.com/photo-1705174299330-939dd03cc864?auto=format&fit=crop&w=800&q=80",
  grocery: "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?auto=format&fit=crop&w=1080&q=85",
  produce: "https://images.unsplash.com/photo-1590779033100-9f60a05a013d?auto=format&fit=crop&w=800&q=80",
  ride: "https://images.unsplash.com/photo-1541702467897-41915a07d3a7?auto=format&fit=crop&w=1080&q=80",
};

export const SERVICES: Service[] = ["food", "rides", "grocery", "courier"];

export const serviceMeta: Record<Service, { label: string; kicker: string; photo: string; icon: string }> = {
  food: { label: "Food", kicker: "GOOD FOOD · BRIGHTER DAYS", photo: PHOTOS.food, icon: "food" },
  rides: { label: "Rides", kicker: "YOUR CITY, YOUR WAY", photo: PHOTOS.ride, icon: "car" },
  grocery: { label: "Grocery", kicker: "FARM FRESH · EVERYDAY", photo: PHOTOS.grocery, icon: "bag" },
  courier: { label: "Courier", kicker: "FAST · SAFE · RELIABLE", photo: PHOTOS.rider, icon: "box" },
};

/* ---------- Food ---------- */
export type PortionOption = { id: string; name: string; price: number };
export type AddonOption = { id: string; name: string; price: number };

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  photo?: string;
  portions?: PortionOption[];
  addons?: AddonOption[];
  isVeg?: boolean;
  isSpicy?: boolean;
  isBestseller?: boolean;
  isHighlyReordered?: boolean;
  category?: string;
  storeId?: string;
  storeName?: string;
  storeDistanceKm?: number;
  storeEtaShort?: string;
};

export type ActiveOffer = {
  id: string;
  code: string;
  description: string;
  discountType: "percentage" | "flat";
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  formattedHeadline: string;
};

export type Restaurant = {
  id: string;
  name: string;
  cuisines: string[];
  eta: string;
  etaShort: string;
  rating: number;
  detailRating: number;
  discount: string;
  photo: string;
  photos?: string[];
  featuredDish?: MenuItem;
  activeOffer?: ActiveOffer | null;
  offers?: ActiveOffer[];
  isPureVeg?: boolean;
  onTimePrep?: boolean;
  address: string;
  coords: { lat: number; lng: number };
  status?: "ONLINE" | "OFFLINE" | "SUSPENDED";
  isOnline?: boolean;
  menu: MenuItem[];
  distanceKm?: number;
  isSponsored?: boolean;
  campaignBadge?: string;
  promotionalHeadline?: string;
  totalReviews?: number;
};

/** Real approved restaurants are fetched dynamically from Supabase `stores` & `vendors` */
export const RESTAURANTS: Restaurant[] = [];

export const FOOD_CATEGORIES: { icon: string; label: string; bg?: string }[] = [
  { icon: "🍕", label: "Pizza", bg: "#ffedd5" },
  { icon: "🍔", label: "Burgers", bg: "#fef3c7" },
  { icon: "🍜", label: "Chinese", bg: "#ffedd5" },
  { icon: "🍰", label: "Desserts", bg: "#fee2e2" },
  { icon: "☕", label: "Beverages", bg: "#f5ebe0" },
];
export const MORE_CUISINES = ["Mughlai", "North Indian", "South Indian", "Desserts", "Italian", "Fast Food"];

/* ---------- Grocery ---------- */
export type Product = {
  id: string;
  name: string;
  unit: string;
  price: number;
  mrp: number;
  category: string;
  photo: string;
};

/** Real approved grocery products are fetched dynamically from Supabase */
export const PRODUCTS: Product[] = [];

export const GROCERY_CATEGORIES: { abbr: string; label: string; icon: string; bg: string }[] = [
  { abbr: "FR", label: "Fruits", icon: "🍎", bg: "#fde8e8" },
  { abbr: "VG", label: "Veggies", icon: "🥬", bg: "#def7ec" },
  { abbr: "ML", label: "Dairy", icon: "🥛", bg: "#e1effe" },
  { abbr: "SN", label: "Snacks", icon: "🧀", bg: "#fdf6b2" },
];

/* ---------- Rides ---------- */
export type RideOption = { id: string; abbr: string; name: string; range: string; eta: string; fare: number; tagline: string };
/** `fare` is a demonstration estimate inside the designed range. */
export const RIDE_OPTIONS: RideOption[] = [
  { id: "bike", abbr: "BIKE", name: "Bike", range: "₹48–62", eta: "3 min", fare: 55, tagline: "Quick solo rides" },
  { id: "auto", abbr: "AUTO", name: "Auto", range: "₹86–102", eta: "5 min", fare: 96, tagline: "Comfortable everyday rides" },
  { id: "cab", abbr: "CAB", name: "Cab", range: "₹148–176", eta: "7 min", fare: 162, tagline: "AC hatchbacks & sedans" },
  { id: "xl", abbr: "XL", name: "Cab XL", range: "₹218–245", eta: "9 min", fare: 232, tagline: "Room for 6 riders" },
];

export type RentalPackage = { id: string; hours: number; km: number; fare: number; name: string };
export const RENTAL_PACKAGES: RentalPackage[] = [
  { id: "pkg-2h", hours: 2, km: 20, fare: 349, name: "2 Hours · 20 km" },
  { id: "pkg-4h", hours: 4, km: 40, fare: 649, name: "4 Hours · 40 km" },
  { id: "pkg-8h", hours: 8, km: 80, fare: 1199, name: "8 Hours · 80 km" },
];

/* ---------- Courier ---------- */
export type PackageType = { id: string; abbr: string; name: string; weight: string; range: string; time: string; price: number };
export const PACKAGE_TYPES: PackageType[] = [
  { id: "doc", abbr: "DOC", name: "Document", weight: "Up to 500 g", range: "₹79 – ₹99", time: "30–40 min", price: 89 },
  { id: "small", abbr: "S", name: "Small box", weight: "Up to 2 kg", range: "₹129 – ₹149", time: "35–45 min", price: 139 },
  { id: "medium", abbr: "M", name: "Medium box", weight: "Up to 5 kg", range: "₹179 – ₹209", time: "40–50 min", price: 194 },
  { id: "large", abbr: "L", name: "Large box", weight: "Up to 10 kg", range: "₹249 – ₹289", time: "45–60 min", price: 269 },
];

/* ---------- Grocery Hub ---------- */
export const GROCERY_HUB = {
  id: "store-hub",
  name: "RoadRider Partner Outlet",
  address: "Lucknow, Uttar Pradesh",
  coords: { lat: 26.8467, lng: 80.9462 },
};

/* ---------- Places ---------- */
export type Place = {
  id: string;
  label: string;
  line: string;
  area: string;
  icon: "home" | "pin";
  coords?: { lat: number; lng: number };
  landmark?: string;
  houseDetails?: string;
  recipientName?: string;
  recipientMobile?: string;
  addressType?: "Home" | "Work" | "Other";
};
export const SEED_PLACES: Place[] = [
  {
    id: "home",
    label: "Home",
    line: "15, Shahnajaf Road, Hazratganj",
    area: "Hazratganj, Lucknow",
    icon: "home",
    coords: { lat: 26.8467, lng: 80.9462 },
  },
  {
    id: "work",
    label: "Work",
    line: "Vibhuti Khand, Gomti Nagar",
    area: "Gomti Nagar, Lucknow",
    icon: "pin",
    coords: { lat: 26.8665, lng: 81.0063 },
  },
];

export const PARTNER = { name: "Assigned Delivery Partner", initials: "DP", rating: 5.0, trips: 0 };

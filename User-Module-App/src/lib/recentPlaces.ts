import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Place } from "../data/demo";

export interface RecentDestination {
  id: string;
  title: string;
  address: string;
  coords: { lat: number; lng: number };
  isFavorite?: boolean;
  timestamp: number;
  contactName?: string;
  contactPhone?: string;
  iconType?: "history" | "building" | "home" | "pin";
}

const STORAGE_KEY = "roadrider.recent_destinations.v1";
const COURIER_STORAGE_KEY = "roadrider.courier_destinations.v1";

export const COURIER_SEED_DESTINATIONS: RecentDestination[] = [
  {
    id: "courier-dest-1",
    title: "Omm's Place",
    address: "Park view apartment, Sector 1, Gomti Nagar, Lucknow",
    coords: { lat: 26.8665, lng: 81.0063 },
    isFavorite: false,
    timestamp: Date.now() - 1000 * 60 * 15,
    contactName: "Omm Lenka",
    contactPhone: "7897069137",
    iconType: "history",
  },
  {
    id: "courier-dest-2",
    title: "Hostel",
    address: "171, Malak Rd, Roberts Lines, Lucknow, Malak...",
    coords: { lat: 26.7932, lng: 80.9214 },
    isFavorite: true,
    timestamp: Date.now() - 1000 * 60 * 60,
    contactName: "Omm Prakash",
    contactPhone: "9876543210",
    iconType: "building",
  },
  {
    id: "courier-dest-3",
    title: "Home",
    address: "665, Nai Basti, Arjunganj, Lucknow, Sarsawa...",
    coords: { lat: 26.8123, lng: 80.9782 },
    isFavorite: true,
    timestamp: Date.now() - 1000 * 60 * 180,
    contactName: "Omm Lenka",
    contactPhone: "7897069137",
    iconType: "home",
  },
  {
    id: "courier-dest-4",
    title: "Hook UP chinese point",
    address: "Hook UP chinese point, Gomti Nagar, Lucknow",
    coords: { lat: 26.8524, lng: 80.9921 },
    isFavorite: false,
    timestamp: Date.now() - 1000 * 60 * 360,
    contactName: "Restaurant Manager",
    contactPhone: "9123456789",
    iconType: "history",
  },
];

export const SEED_RECENT_DESTINATIONS: RecentDestination[] = [
  {
    id: "recent-1",
    title: "Gomti nagar",
    address: "Gomti Nagar Railway Station Road, Vibhuti Khand, Lucknow",
    coords: { lat: 26.8665, lng: 81.0063 },
    isFavorite: false,
    timestamp: Date.now() - 1000 * 60 * 30, // 30 mins ago
  },
  {
    id: "recent-2",
    title: "Raja Rahul City",
    address: "Malak Road, Sector A, Vijay Nagar, Roberts Lines, Lucknow",
    coords: { lat: 26.7932, lng: 80.9214 },
    isFavorite: true,
    timestamp: Date.now() - 1000 * 60 * 120, // 2 hours ago
  },
  {
    id: "recent-3",
    title: "Stumps & Posts Arena",
    address: "Ghusval - Haripurm Rd, opposite Medanta Hospital, Lucknow",
    coords: { lat: 26.7784, lng: 80.9981 },
    isFavorite: false,
    timestamp: Date.now() - 1000 * 60 * 360, // 6 hours ago
  },
  {
    id: "recent-4",
    title: "Chaudhary Charan Singh International Airport",
    address: "Amausi, Kanpur Road, Lucknow, Uttar Pradesh 226009",
    coords: { lat: 26.7606, lng: 80.8893 },
    isFavorite: false,
    timestamp: Date.now() - 1000 * 60 * 1440, // 1 day ago
  },
  {
    id: "recent-5",
    title: "Lucknow Junction",
    address: "Charbagh, Preeti Nagar, Lucknow, Uttar Pradesh 226004",
    coords: { lat: 26.8315, lng: 80.9238 },
    isFavorite: true,
    timestamp: Date.now() - 1000 * 60 * 2880, // 2 days ago
  },
];

export async function getRecentDestinations(): Promise<RecentDestination[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_RECENT_DESTINATIONS));
      return SEED_RECENT_DESTINATIONS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return SEED_RECENT_DESTINATIONS;
  } catch (err) {
    console.warn("[recentPlaces] Failed to load recent destinations:", err);
    return SEED_RECENT_DESTINATIONS;
  }
}

export async function addRecentDestination(
  dest: Omit<RecentDestination, "timestamp" | "id"> & { id?: string }
): Promise<RecentDestination[]> {
  try {
    const current = await getRecentDestinations();
    const existingIndex = current.findIndex(
      (c) =>
        c.title.toLowerCase() === dest.title.toLowerCase() ||
        (Math.abs(c.coords.lat - dest.coords.lat) < 0.0005 &&
          Math.abs(c.coords.lng - dest.coords.lng) < 0.0005)
    );

    let updated: RecentDestination[];
    if (existingIndex >= 0) {
      const match = current[existingIndex];
      const nextItem: RecentDestination = {
        ...match,
        title: dest.title,
        address: dest.address,
        coords: dest.coords,
        timestamp: Date.now(),
      };
      updated = [nextItem, ...current.filter((_, i) => i !== existingIndex)].slice(0, 10);
    } else {
      const newItem: RecentDestination = {
        id: dest.id || `rd-${Date.now()}`,
        title: dest.title,
        address: dest.address,
        coords: dest.coords,
        isFavorite: dest.isFavorite ?? false,
        timestamp: Date.now(),
      };
      updated = [newItem, ...current].slice(0, 10);
    }

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn("[recentPlaces] Failed to save recent destination:", err);
    return SEED_RECENT_DESTINATIONS;
  }
}

export async function toggleFavoriteDestination(id: string): Promise<RecentDestination[]> {
  try {
    const current = await getRecentDestinations();
    const updated = current.map((item) =>
      item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
    );
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn("[recentPlaces] Failed to toggle favorite destination:", err);
    return [];
  }
}

export async function clearRecentDestinations(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn("[recentPlaces] Failed to clear recent destinations:", err);
  }
}

export function destinationToPlace(dest: RecentDestination): Place {
  return {
    id: dest.id,
    label: dest.title,
    line: dest.address,
    area: dest.address.split(",")[0] || dest.title,
    icon: dest.isFavorite ? "home" : "pin",
    coords: dest.coords,
  };
}

export async function getCourierDestinations(): Promise<RecentDestination[]> {
  try {
    const raw = await AsyncStorage.getItem(COURIER_STORAGE_KEY);
    if (!raw) {
      await AsyncStorage.setItem(
        COURIER_STORAGE_KEY,
        JSON.stringify(COURIER_SEED_DESTINATIONS)
      );
      return COURIER_SEED_DESTINATIONS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return COURIER_SEED_DESTINATIONS;
  } catch (err) {
    console.warn("[recentPlaces] Failed to load courier destinations:", err);
    return COURIER_SEED_DESTINATIONS;
  }
}

export async function toggleFavoriteCourierDestination(
  id: string
): Promise<RecentDestination[]> {
  try {
    const current = await getCourierDestinations();
    const updated = current.map((item) =>
      item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
    );
    await AsyncStorage.setItem(COURIER_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn("[recentPlaces] Failed to toggle favorite courier destination:", err);
    return [];
  }
}

export async function addCourierDestination(
  dest: Omit<RecentDestination, "timestamp" | "id"> & { id?: string }
): Promise<RecentDestination[]> {
  try {
    const current = await getCourierDestinations();
    const existingIndex = current.findIndex(
      (c) =>
        c.title.toLowerCase() === dest.title.toLowerCase() ||
        (Math.abs(c.coords.lat - dest.coords.lat) < 0.0005 &&
          Math.abs(c.coords.lng - dest.coords.lng) < 0.0005)
    );

    let updated: RecentDestination[];
    if (existingIndex >= 0) {
      const match = current[existingIndex];
      const nextItem: RecentDestination = {
        ...match,
        title: dest.title,
        address: dest.address,
        coords: dest.coords,
        contactName: dest.contactName || match.contactName,
        contactPhone: dest.contactPhone || match.contactPhone,
        timestamp: Date.now(),
      };
      updated = [nextItem, ...current.filter((_, i) => i !== existingIndex)].slice(0, 10);
    } else {
      const newItem: RecentDestination = {
        id: dest.id || `courier-dest-${Date.now()}`,
        title: dest.title,
        address: dest.address,
        coords: dest.coords,
        isFavorite: dest.isFavorite ?? false,
        contactName: dest.contactName || "Contact Person",
        contactPhone: dest.contactPhone || "9876543210",
        iconType: dest.iconType || "history",
        timestamp: Date.now(),
      };
      updated = [newItem, ...current].slice(0, 10);
    }

    await AsyncStorage.setItem(COURIER_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn("[recentPlaces] Failed to save courier destination:", err);
    return COURIER_SEED_DESTINATIONS;
  }
}

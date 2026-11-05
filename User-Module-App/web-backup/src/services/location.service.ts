import { supabase, isSupabaseConfigured } from "./supabase";

export interface ServiceArea {
  id: string;
  name: string;
  city: string;
  isServiceable: boolean;
  statusText: "Available" | "Coming soon";
  foodEnabled: boolean;
  groceryEnabled: boolean;
  ridesEnabled: boolean;
  courierEnabled: boolean;
  latitude?: number;
  longitude?: number;
}

export interface ResolvedAddress {
  formattedAddress: string;
  locality: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  isServiceable: boolean;
}

export type GeolocationStatus =
  | "idle"
  | "requesting"
  | "resolving"
  | "success"
  | "permission_denied"
  | "position_unavailable"
  | "timeout"
  | "unsupported";

const GOOGLE_MAPS_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
  import.meta.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  "AIzaSyCLjnY7CYUYSrkzPJpug2hTrZZbk-PzJlE";

// Default fallback areas if database connection is offline
export const FALLBACK_AREAS: ServiceArea[] = [
  { id: "1", name: "Hazratganj", city: "Lucknow", isServiceable: true, statusText: "Available", foodEnabled: true, groceryEnabled: true, ridesEnabled: true, courierEnabled: true, latitude: 26.8467, longitude: 80.9462 },
  { id: "2", name: "Gomti Nagar", city: "Lucknow", isServiceable: true, statusText: "Available", foodEnabled: true, groceryEnabled: true, ridesEnabled: true, courierEnabled: true, latitude: 26.8532, longitude: 80.9984 },
  { id: "3", name: "Aminabad", city: "Lucknow", isServiceable: true, statusText: "Available", foodEnabled: true, groceryEnabled: true, ridesEnabled: true, courierEnabled: true, latitude: 26.8436, longitude: 80.9274 },
  { id: "4", name: "Aliganj", city: "Lucknow", isServiceable: true, statusText: "Available", foodEnabled: true, groceryEnabled: true, ridesEnabled: true, courierEnabled: true, latitude: 26.8906, longitude: 80.9422 },
  { id: "5", name: "Indira Nagar", city: "Lucknow", isServiceable: true, statusText: "Available", foodEnabled: true, groceryEnabled: true, ridesEnabled: true, courierEnabled: true, latitude: 26.8774, longitude: 80.9892 },
  { id: "6", name: "Alambagh", city: "Lucknow", isServiceable: true, statusText: "Available", foodEnabled: true, groceryEnabled: true, ridesEnabled: true, courierEnabled: true, latitude: 26.8142, longitude: 80.9015 },
  { id: "7", name: "Civil Lines", city: "Kanpur", isServiceable: false, statusText: "Coming soon", foodEnabled: false, groceryEnabled: false, ridesEnabled: false, courierEnabled: false, latitude: 26.4725, longitude: 80.3475 },
  { id: "8", name: "Cantonment", city: "Varanasi", isServiceable: false, statusText: "Coming soon", foodEnabled: false, groceryEnabled: false, ridesEnabled: false, courierEnabled: false, latitude: 25.3216, longitude: 82.9873 },
];

/**
 * Fetches real supported cities and zones from Supabase `cities` and `zones` tables
 */
export async function fetchSupportedServiceAreas(): Promise<ServiceArea[]> {
  if (!isSupabaseConfigured || !supabase) return FALLBACK_AREAS;

  try {
    const { data: citiesData, error: citiesErr } = await supabase
      .from("cities")
      .select("id, name, status, food_enabled, grocery_enabled, rides_enabled, courier_enabled");

    if (citiesErr || !citiesData || citiesData.length === 0) {
      return FALLBACK_AREAS;
    }

    const { data: zonesData } = await supabase
      .from("zones")
      .select("id, city_id, name, is_active, food_enabled, grocery_enabled, rides_enabled, courier_enabled");

    const mapped: ServiceArea[] = [];

    // Map active zones under cities
    citiesData.forEach((city) => {
      const isCityActive = city.status === "active";
      const cityZones = (zonesData || []).filter((z) => z.city_id === city.id);

      if (cityZones.length > 0) {
        cityZones.forEach((z) => {
          // Clean zone label (e.g. "Zone A - Gomti Nagar" -> "Gomti Nagar")
          const zoneName = z.name.replace(/^Zone\s+[A-Z]\s*-\s*/i, "").trim() || z.name;
          mapped.push({
            id: z.id,
            name: zoneName,
            city: city.name,
            isServiceable: isCityActive && z.is_active !== false,
            statusText: isCityActive && z.is_active !== false ? "Available" : "Coming soon",
            foodEnabled: isCityActive && z.food_enabled !== false,
            groceryEnabled: isCityActive && z.grocery_enabled !== false,
            ridesEnabled: isCityActive && z.rides_enabled !== false,
            courierEnabled: isCityActive && z.courier_enabled !== false,
          });
        });
      } else {
        mapped.push({
          id: city.id,
          name: city.name,
          city: city.name,
          isServiceable: isCityActive,
          statusText: isCityActive ? "Available" : "Coming soon",
          foodEnabled: city.food_enabled || false,
          groceryEnabled: city.grocery_enabled || false,
          ridesEnabled: city.rides_enabled || false,
          courierEnabled: city.courier_enabled || false,
        });
      }
    });

    return mapped.length > 0 ? mapped : FALLBACK_AREAS;
  } catch (err) {
    console.warn("[LocationService] fetchSupportedServiceAreas notice:", err);
    return FALLBACK_AREAS;
  }
}

/**
 * Checks whether a given city or locality is currently serviced by RoadRider
 */
export function checkServiceability(
  localityOrCity: string,
  areas: ServiceArea[] = FALLBACK_AREAS
): { isServiceable: boolean; area?: ServiceArea } {
  const clean = localityOrCity.toLowerCase().trim();
  const found = areas.find(
    (a) =>
      clean.includes(a.name.toLowerCase()) ||
      clean.includes(a.city.toLowerCase()) ||
      a.name.toLowerCase().includes(clean)
  );

  if (found) {
    return { isServiceable: found.isServiceable, area: found };
  }

  // Check default serviceable city (Lucknow)
  if (clean.includes("lucknow")) {
    return { isServiceable: true };
  }

  return { isServiceable: false };
}

/**
 * Reverse geocodes coordinates (lat, lng) to a human-readable street address
 */
export async function reverseGeocodeCoords(
  latitude: number,
  longitude: number
): Promise<ResolvedAddress> {
  // 1. Try Google Maps Geocoding API
  if (GOOGLE_MAPS_KEY) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_KEY}`;
      const res = await fetch(url);
      const json = await res.json();

      if (json.status === "OK" && json.results && json.results.length > 0) {
        const top = json.results[0];
        let locality = "";
        let city = "";
        let state = "";
        let postalCode = "";

        top.address_components.forEach((c: any) => {
          if (c.types.includes("sublocality_level_1") || c.types.includes("sublocality") || c.types.includes("neighborhood")) {
            if (!locality) locality = c.long_name;
          }
          if (c.types.includes("locality")) {
            city = c.long_name;
            if (!locality) locality = c.long_name;
          }
          if (c.types.includes("administrative_area_level_1")) {
            state = c.long_name;
          }
          if (c.types.includes("postal_code")) {
            postalCode = c.long_name;
          }
        });

        const resolvedCity = city || "Lucknow";
        const resolvedLocality = locality || "Hazratganj";
        const serviceableCheck = checkServiceability(`${resolvedLocality}, ${resolvedCity}`);

        return {
          formattedAddress: top.formatted_address,
          locality: resolvedLocality,
          city: resolvedCity,
          state: state || "Uttar Pradesh",
          postalCode,
          latitude,
          longitude,
          isServiceable: serviceableCheck.isServiceable,
        };
      }
    } catch (err) {
      console.warn("[LocationService] Google Maps geocoding fallback:", err);
    }
  }

  // 2. OpenStreetMap Nominatim Fallback
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`;
    const res = await fetch(url, { headers: { "User-Agent": "RoadRider-App/1.0" } });
    const json = await res.json();

    if (json && json.address) {
      const addr = json.address;
      const locality = addr.suburb || addr.neighbourhood || addr.residential || addr.road || "Hazratganj";
      const city = addr.city || addr.town || addr.county || "Lucknow";
      const state = addr.state || "Uttar Pradesh";
      const postalCode = addr.postcode || "";
      const serviceableCheck = checkServiceability(`${locality}, ${city}`);

      return {
        formattedAddress: json.display_name || `${locality}, ${city}`,
        locality,
        city,
        state,
        postalCode,
        latitude,
        longitude,
        isServiceable: serviceableCheck.isServiceable,
      };
    }
  } catch (err) {
    console.warn("[LocationService] Nominatim reverse geocode fallback:", err);
  }

  // 3. Coordinate fallback
  return {
    formattedAddress: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
    locality: "Hazratganj",
    city: "Lucknow",
    state: "Uttar Pradesh",
    postalCode: "",
    latitude,
    longitude,
    isServiceable: true,
  };
}

/**
 * Accesses device hardware GPS coordinates and performs reverse geocoding
 */
export async function detectCurrentLocation(): Promise<{
  success: boolean;
  address?: ResolvedAddress;
  error?: string;
  statusCode?: GeolocationStatus;
}> {
  if (!navigator || !navigator.geolocation) {
    return {
      success: false,
      error: "Location services are not supported by this browser or device.",
      statusCode: "unsupported",
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const resolved = await reverseGeocodeCoords(latitude, longitude);
          resolve({
            success: true,
            address: resolved,
            statusCode: "success",
          });
        } catch (err: any) {
          resolve({
            success: false,
            error: "Failed to resolve address from GPS coordinates.",
            statusCode: "position_unavailable",
          });
        }
      },
      (err: GeolocationPositionError) => {
        let statusCode: GeolocationStatus = "position_unavailable";
        let message = "Unable to determine your current location.";

        if (err.code === err.PERMISSION_DENIED) {
          statusCode = "permission_denied";
          message = "Location permission was denied. Please allow location access in your device settings or enter an address manually.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          statusCode = "position_unavailable";
          message = "GPS signal unavailable. Please ensure location is turned on in your device.";
        } else if (err.code === err.TIMEOUT) {
          statusCode = "timeout";
          message = "Location request timed out. Please try again.";
        }

        resolve({
          success: false,
          error: message,
          statusCode,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  });
}

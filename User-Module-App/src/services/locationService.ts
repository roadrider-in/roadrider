import * as Location from "expo-location";
import { Platform } from "react-native";
import { type LatLng } from "../lib/googleMaps";

export interface DeviceLocationResult {
  coords: LatLng;
  formattedAddress: string;
  name?: string;
  district?: string;
  city?: string;
  postalCode?: string;
  accuracyMeters?: number | null;
}

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || "https://sjahblquggmzlihqgzyt.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "";

/**
 * Requests foreground location permission with standard rationale.
 */
export async function requestLocationPermission(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
    if (existingStatus === Location.PermissionStatus.GRANTED) {
      return true;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === Location.PermissionStatus.GRANTED;
  } catch (error) {
    console.warn("[locationService] Error requesting location permission:", error);
    return false;
  }
}

/**
 * Checks if location services (GPS hardware) are enabled on the device.
 */
export async function isLocationServicesEnabled(): Promise<boolean> {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch (error) {
    console.warn("[locationService] Error checking services enabled:", error);
    return false;
  }
}

/**
 * Reverse geocodes coordinates to a human-readable address.
 * Primary: Secure Supabase Edge Function with Geocoding API.
 * Fallback: expo-location native geocoding.
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{
  formattedAddress: string;
  name?: string;
  district?: string;
  city?: string;
  postalCode?: string;
}> {
  // 1. Try Supabase Edge Function proxy (Google Geocoding API)
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/google-maps-proxy?action=reverse-geocode&lat=${lat}&lng=${lng}`,
        {
          headers: {
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            apikey: SUPABASE_ANON_KEY,
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        if (data && data.results && data.results.length > 0) {
          const top = data.results[0];
          const formattedAddress = top.formatted_address;

          let name = "";
          let district = "";
          let city = "Lucknow";
          let postalCode = "";

          for (const comp of top.address_components || []) {
            if (comp.types.includes("sublocality") || comp.types.includes("route")) {
              name = name || comp.long_name;
            }
            if (comp.types.includes("sublocality_level_1") || comp.types.includes("sublocality")) {
              district = district || comp.long_name;
            }
            if (comp.types.includes("locality")) {
              city = comp.long_name;
            }
            if (comp.types.includes("postal_code")) {
              postalCode = comp.long_name;
            }
          }

          return {
            formattedAddress,
            name: name || top.formatted_address.split(",")[0],
            district,
            city,
            postalCode,
          };
        }
      }
    } catch (e) {
      console.warn("[locationService] Edge function reverse geocoding notice:", e);
    }
  }

  // 2. Native expo-location fallback
  try {
    const rev = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (rev && rev.length > 0) {
      const r = rev[0];
      const parts = [
        r.name,
        r.street,
        r.district || r.subregion,
        r.city || "Lucknow",
        r.region,
        r.postalCode,
      ].filter(Boolean);

      const formattedAddress = parts.join(", ") || `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;

      return {
        formattedAddress,
        name: r.name || r.street || undefined,
        district: r.district || r.subregion || undefined,
        city: r.city || "Lucknow",
        postalCode: r.postalCode || undefined,
      };
    }
  } catch (err) {
    console.warn("[locationService] Expo reverse geocoding notice:", err);
  }

  return {
    formattedAddress: `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`,
  };
}

/**
 * Fetches the current real GPS position of the device.
 */
export async function getCurrentDeviceLocation(): Promise<DeviceLocationResult | null> {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) {
    throw new Error("LOCATION_PERMISSION_DENIED");
  }

  const servicesEnabled = await isLocationServicesEnabled();
  if (!servicesEnabled) {
    throw new Error("LOCATION_SERVICES_DISABLED");
  }

  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy:
        Platform.OS === "android"
          ? Location.Accuracy.Balanced
          : Location.Accuracy.High,
    });

    const { latitude, longitude, accuracy } = pos.coords;

    const geocoded = await reverseGeocode(latitude, longitude);

    return {
      coords: {
        lat: latitude,
        lng: longitude,
        label: geocoded.name || geocoded.formattedAddress.split(",")[0],
      },
      formattedAddress: geocoded.formattedAddress,
      name: geocoded.name,
      district: geocoded.district,
      city: geocoded.city,
      postalCode: geocoded.postalCode,
      accuracyMeters: accuracy,
    };
  } catch (error: any) {
    console.warn("[locationService] Error getting current position:", error);
    // If high accuracy failed, try with Lowest/Balanced as last resort
    try {
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown) {
        const { latitude, longitude, accuracy } = lastKnown.coords;
        const geocoded = await reverseGeocode(latitude, longitude);
        return {
          coords: {
            lat: latitude,
            lng: longitude,
            label: geocoded.name || geocoded.formattedAddress.split(",")[0],
          },
          formattedAddress: geocoded.formattedAddress,
          name: geocoded.name,
          district: geocoded.district,
          city: geocoded.city,
          postalCode: geocoded.postalCode,
          accuracyMeters: accuracy,
        };
      }
    } catch {}

    throw new Error(error?.message || "LOCATION_FETCH_FAILED");
  }
}

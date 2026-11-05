import { type LatLng } from "../lib/googleMaps";

export interface GooglePlaceSuggestion {
  placeId: string;
  primaryText: string;
  secondaryText: string;
  fullText: string;
}

export interface GooglePlaceDetails {
  placeId: string;
  displayName: string;
  formattedAddress: string;
  coords: { lat: number; lng: number };
}

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || "https://sjahblquggmzlihqgzyt.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "";

// Generate a random UUID v4 session token for Google Places billing grouping
export function createPlacesSessionToken(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let activeAbortController: AbortController | null = null;

/**
 * Searches Google Places (New) autocomplete via the secure Supabase Edge Function proxy.
 */
export async function searchGooglePlaces(
  query: string,
  userLocation?: LatLng,
  sessionToken?: string
): Promise<GooglePlaceSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  // Cancel any existing pending autocomplete request
  if (activeAbortController) {
    activeAbortController.abort();
  }
  activeAbortController = new AbortController();

  const lat = userLocation?.lat ?? 26.8467;
  const lng = userLocation?.lng ?? 80.9462;
  const token = sessionToken || createPlacesSessionToken();

  try {
    const edgeUrl = `${SUPABASE_URL}/functions/v1/google-maps-proxy?action=autocomplete&input=${encodeURIComponent(
      trimmed
    )}&lat=${lat}&lng=${lng}&sessionToken=${encodeURIComponent(token)}`;

    const response = await fetch(edgeUrl, {
      signal: activeAbortController.signal,
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
    });

    if (!response.ok) {
      console.warn("[placesService] Autocomplete HTTP error:", response.status);
      return [];
    }

    const data = await response.json();
    if (!data.suggestions || !Array.isArray(data.suggestions)) {
      return [];
    }

    return data.suggestions
      .map((item: any) => {
        const placePred = item.placePrediction;
        if (!placePred) return null;

        const placeId = placePred.placeId;
        const primaryText =
          placePred.structuredFormat?.mainText?.text ||
          placePred.text?.text ||
          "";
        const secondaryText =
          placePred.structuredFormat?.secondaryText?.text || "";
        const fullText = placePred.text?.text || `${primaryText}, ${secondaryText}`;

        return {
          placeId,
          primaryText,
          secondaryText,
          fullText,
        };
      })
      .filter(Boolean) as GooglePlaceSuggestion[];
  } catch (err: any) {
    if (err.name === "AbortError") {
      return [];
    }
    console.warn("[placesService] Places autocomplete request error:", err);
    return [];
  }
}

/**
 * Retrieves exact coordinates and formatted address for a selected place.
 */
export async function getGooglePlaceDetails(
  placeId: string,
  sessionToken?: string
): Promise<GooglePlaceDetails | null> {
  if (!placeId) return null;

  try {
    let edgeUrl = `${SUPABASE_URL}/functions/v1/google-maps-proxy?action=place-details&placeId=${encodeURIComponent(
      placeId
    )}`;
    if (sessionToken) {
      edgeUrl += `&sessionToken=${encodeURIComponent(sessionToken)}`;
    }

    const response = await fetch(edgeUrl, {
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
    });

    if (!response.ok) {
      console.warn("[placesService] Place details HTTP error:", response.status);
      return null;
    }

    const data = await response.json();
    if (!data || !data.location) {
      return null;
    }

    return {
      placeId: data.id || placeId,
      displayName: data.displayName?.text || data.formattedAddress?.split(",")[0] || "Location",
      formattedAddress: data.formattedAddress || "",
      coords: {
        lat: data.location.latitude,
        lng: data.location.longitude,
      },
    };
  } catch (err) {
    console.warn("[placesService] Place details request error:", err);
    return null;
  }
}

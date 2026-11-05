import { type LatLng } from "../lib/googleMaps";

export interface ComputedRouteResult {
  distanceMeters: number;
  distanceKm: number;
  distanceText: string;
  durationSeconds: number;
  durationMinutes: number;
  durationText: string;
  encodedPolyline: string;
  coordinates: Array<{ latitude: number; longitude: number }>;
}

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || "https://sjahblquggmzlihqgzyt.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "";

/**
 * Decodes Google's Encoded Polyline Algorithm string into an array of LatLng coordinates.
 */
export function decodePolyline(
  encoded: string
): Array<{ latitude: number; longitude: number }> {
  if (!encoded) return [];

  const points: Array<{ latitude: number; longitude: number }> = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return points;
}

/**
 * Computes a real driving road route between two points using Google Routes API via Supabase.
 */
export async function calculateRoadRoute(
  origin: LatLng,
  destination: LatLng,
  travelMode: "DRIVE" | "TWO_WHEELER" = "DRIVE"
): Promise<ComputedRouteResult | null> {
  if (!origin || !destination) return null;

  try {
    const edgeUrl = `${SUPABASE_URL}/functions/v1/google-maps-proxy?action=compute-routes`;

    const response = await fetch(edgeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        travelMode,
      }),
    });

    if (!response.ok) {
      console.warn("[routesService] Routes API HTTP error:", response.status);
      return null;
    }

    const data = await response.json();
    if (!data.routes || !Array.isArray(data.routes) || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];
    const distanceMeters = Number(route.distanceMeters) || 0;
    const distanceKm = Math.round((distanceMeters / 1000) * 10) / 10;
    const distanceText = `${distanceKm} km`;

    // Duration in seconds (e.g. "1240s")
    const durationSeconds = route.duration
      ? parseInt(route.duration.replace("s", ""), 10) || 0
      : Math.round(distanceKm * 3.2 * 60);

    const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));
    const durationText = `${durationMinutes} mins`;

    const encodedPolyline = route.polyline?.encodedPolyline || "";
    const coordinates = decodePolyline(encodedPolyline);

    return {
      distanceMeters,
      distanceKm,
      distanceText,
      durationSeconds,
      durationMinutes,
      durationText,
      encodedPolyline,
      coordinates:
        coordinates.length > 0
          ? coordinates
          : [
              { latitude: origin.lat, longitude: origin.lng },
              { latitude: destination.lat, longitude: destination.lng },
            ],
    };
  } catch (err) {
    console.warn("[routesService] Error calculating road route:", err);
    return null;
  }
}

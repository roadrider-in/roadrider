/**
 * Coordinates and utilities for RoadRider Maps in React Native.
 */

export interface LatLng {
  lat: number;
  lng: number;
  label?: string;
}

// Known coordinates for RoadRider seed locations in Lucknow, India
export const PRESET_COORDS: Record<string, LatLng> = {
  home: { lat: 26.8467, lng: 80.9462, label: "Home (Hazratganj)" },
  work: { lat: 26.8665, lng: 81.0063, label: "Work (Gomti Nagar)" },
  aminabad: { lat: 26.8437, lng: 80.9262, label: "Aminabad" },
  driver: { lat: 26.854, lng: 80.968, label: "RoadRider Driver" },
  restaurant: { lat: 26.8512, lng: 80.949, label: "Royal Biryani House" },
};

export const DEFAULT_CENTER: LatLng = PRESET_COORDS.home;

// Haversine formula to compute distance in km
export function computeDistanceKm(p1: LatLng, p2: LatLng): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightKm = R * c;
  // Estimate road driving distance with 1.25 winding factor
  return Math.round(straightKm * 1.25 * 10) / 10;
}

export function computeEstimatedEta(distanceKm: number): {
  durationText: string;
  distanceText: string;
  durationSeconds: number;
} {
  const driveMinutes = Math.max(6, Math.round(distanceKm * 3.2));
  return {
    durationText: `${driveMinutes} mins`,
    distanceText: `${distanceKm} km`,
    durationSeconds: driveMinutes * 60,
  };
}

// Dark style JSON for react-native-maps
export const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#171c26" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#171c26" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a96a3" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d69a7c" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8a96a3" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#1e2c24" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9c7d" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#283344" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1c2533" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca7b5" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#d96526" }, { weight: 1.5 }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#87380f" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f7d5c3" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#242f3e" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#111823" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
];

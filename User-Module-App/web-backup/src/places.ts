import { fetchSupportedServiceAreas, FALLBACK_AREAS } from "./services/location.service";

export type Spot = {
  name: string;
  area: string;
  served: boolean;
  statusText?: string;
  foodEnabled?: boolean;
  groceryEnabled?: boolean;
  lat?: number;
  lng?: number;
};

export const SPOTS: Spot[] = FALLBACK_AREAS.map((a) => ({
  name: a.name,
  area: a.city,
  served: a.isServiceable,
  statusText: a.statusText,
  foodEnabled: a.foodEnabled,
  groceryEnabled: a.groceryEnabled,
  lat: a.latitude,
  lng: a.longitude,
}));

export const spotLabel = (s: { name: string; area?: string; city?: string }) =>
  `${s.name}, ${s.area || s.city || "Lucknow"}`;

export async function getLiveServiceSpots(): Promise<Spot[]> {
  const areas = await fetchSupportedServiceAreas();
  return areas.map((a) => ({
    name: a.name,
    area: a.city,
    served: a.isServiceable,
    statusText: a.statusText,
    foodEnabled: a.foodEnabled,
    groceryEnabled: a.groceryEnabled,
    lat: a.latitude,
    lng: a.longitude,
  }));
}

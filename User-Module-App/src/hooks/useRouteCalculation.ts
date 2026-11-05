import { useState, useEffect, useCallback, useRef } from "react";
import { type LatLng } from "../lib/googleMaps";
import {
  calculateRoadRoute,
  type ComputedRouteResult,
} from "../services/routesService";

export function useRouteCalculation(
  origin?: LatLng | null,
  destination?: LatLng | null,
  travelMode: "DRIVE" | "TWO_WHEELER" = "DRIVE"
) {
  const [route, setRoute] = useState<ComputedRouteResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prevPointsRef = useRef<string>("");

  const compute = useCallback(async () => {
    if (
      !origin ||
      !destination ||
      typeof origin.lat !== "number" ||
      typeof origin.lng !== "number" ||
      typeof destination.lat !== "number" ||
      typeof destination.lng !== "number"
    ) {
      setRoute(null);
      return;
    }

    const key = `${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}-${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}-${travelMode}`;
    if (key === prevPointsRef.current) return;
    prevPointsRef.current = key;

    setIsLoading(true);
    setError(null);

    try {
      const res = await calculateRoadRoute(origin, destination, travelMode);
      if (res) {
        setRoute(res);
      } else {
        setError("Could not compute road route");
      }
    } catch (err: any) {
      setError(err?.message || "Route calculation failed");
    } finally {
      setIsLoading(false);
    }
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng, travelMode]);

  useEffect(() => {
    compute();
  }, [compute]);

  return {
    route,
    isLoading,
    error,
    recalculate: compute,
  };
}

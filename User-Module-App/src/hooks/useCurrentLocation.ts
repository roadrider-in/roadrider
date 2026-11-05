import { useState, useEffect, useCallback, useRef } from "react";
import {
  getCurrentDeviceLocation,
  requestLocationPermission,
  type DeviceLocationResult,
} from "../services/locationService";

export function useCurrentLocation(autoFetch = true) {
  const [location, setLocation] = useState<DeviceLocationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const isMountedRef = useRef(true);

  const fetchLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setPermissionDenied(false);

    try {
      const result = await getCurrentDeviceLocation();
      if (isMountedRef.current && result) {
        setLocation(result);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        if (err?.message === "LOCATION_PERMISSION_DENIED") {
          setPermissionDenied(true);
          setError("Location permission denied. Please enable in Settings.");
        } else if (err?.message === "LOCATION_SERVICES_DISABLED") {
          setError("Device GPS is turned off. Please turn on location.");
        } else {
          setError(err?.message || "Could not fetch current GPS location.");
        }
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    if (autoFetch) {
      fetchLocation();
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [autoFetch, fetchLocation]);

  return {
    location,
    isLoading,
    error,
    permissionDenied,
    refreshLocation: fetchLocation,
  };
}

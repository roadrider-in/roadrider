import { useState, useEffect, useRef, useCallback } from "react";
import { type LatLng } from "../lib/googleMaps";
import {
  searchGooglePlaces,
  getGooglePlaceDetails,
  createPlacesSessionToken,
  type GooglePlaceSuggestion,
  type GooglePlaceDetails,
} from "../services/placesService";

export function usePlacesAutocomplete(
  query: string,
  userLocation?: LatLng,
  debounceMs = 280
) {
  const [suggestions, setSuggestions] = useState<GooglePlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const sessionTokenRef = useRef(createPlacesSessionToken());

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchGooglePlaces(
          trimmed,
          userLocation,
          sessionTokenRef.current
        );
        setSuggestions(results);
      } catch (err) {
        console.warn("[usePlacesAutocomplete] Search notice:", err);
      } finally {
        setIsSearching(false);
      }
    }, debounceMs);

    return () => {
      clearTimeout(timer);
    };
  }, [query, userLocation?.lat, userLocation?.lng, debounceMs]);

  const selectPlace = useCallback(
    async (placeId: string): Promise<GooglePlaceDetails | null> => {
      try {
        const details = await getGooglePlaceDetails(
          placeId,
          sessionTokenRef.current
        );
        // Regenerate session token after selecting place
        sessionTokenRef.current = createPlacesSessionToken();
        return details;
      } catch (err) {
        console.warn("[usePlacesAutocomplete] Select place notice:", err);
        return null;
      }
    },
    []
  );

  const resetSession = useCallback(() => {
    sessionTokenRef.current = createPlacesSessionToken();
    setSuggestions([]);
    setIsSearching(false);
  }, []);

  return {
    suggestions,
    isSearching,
    selectPlace,
    resetSession,
  };
}

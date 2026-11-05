import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Dimensions,
  Platform,
  Switch,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from "react-native-maps";
import FlowHeader from "../../components/FlowHeader";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import type { PlacesMode } from "../../navigation/types";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { colors, radii } from "../../theme/tokens";
import { DARK_MAP_STYLE, DEFAULT_CENTER, type LatLng, computeDistanceKm } from "../../lib/googleMaps";
import type { Place } from "../../data/demo";
import {
  searchSmartPlaces,
  type AutocompleteResult,
  REGIONAL_PLACES,
} from "../../lib/autocomplete";
import { usePlacesAutocomplete } from "../../hooks/usePlacesAutocomplete";
import type { GooglePlaceSuggestion } from "../../services/placesService";

interface PlacesProps {
  mode: PlacesMode;
}

export default function Places({ mode }: PlacesProps) {
  const insets = useSafeAreaInsets();
  const { back, push } = useNav();
  const {
    state,
    placeById,
    setDefaultPlace,
    setRide,
    setCourier,
    addPlace,
    removePlace,
    showToast,
  } = useApp();

  const isRide = mode === "ridePickup" || mode === "rideDrop";
  const isCourier = mode === "courierPickup" || mode === "courierDrop";
  const isDelivery = mode === "delivery";

  // Dual field state for ride flow
  const [activeRideField, setActiveRideField] = useState<"pickup" | "drop">(
    mode === "rideDrop" ? "drop" : "pickup"
  );

  // Initial pickup and drop places
  const initialPickup = useMemo<Place>(() => {
    const id = isCourier ? state.courier.pickupId : state.ride.pickupId;
    return (
      (id ? placeById(id) : null) ??
      state.places[0] ?? {
        id: "default-pickup",
        label: "Charbagh Railway Station",
        line: "Station Road, Charbagh",
        area: "Charbagh, Lucknow",
        icon: "pin",
        coords: { lat: 26.8315, lng: 80.9238 },
      }
    );
  }, []);

  const initialDrop = useMemo<Place | null>(() => {
    const id = isCourier ? state.courier.dropId : state.ride.dropId;
    return id ? placeById(id) ?? null : null;
  }, []);

  const [pickupPlace, setPickupPlace] = useState<Place>(initialPickup);
  const [dropPlace, setDropPlace] = useState<Place | null>(initialDrop);

  // Search and suggestions state
  const [search, setSearch] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [viewOnMap, setViewOnMap] = useState(isRide); // Default to map view for ride
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [liveGpsPlace, setLiveGpsPlace] = useState<Place | null>(null);

  // Food section: save for future orders toggle
  const [saveForFutureOrders, setSaveForFutureOrders] = useState(true);

  // Live map preview coordinate
  const [previewCoords, setPreviewCoords] = useState<LatLng | null>(
    (isRide && activeRideField === "drop" && dropPlace?.coords)
      ? dropPlace.coords
      : pickupPlace.coords ?? DEFAULT_CENTER
  );
  const [previewLabel, setPreviewLabel] = useState<string>(
    (isRide && activeRideField === "drop" && dropPlace)
      ? dropPlace.label
      : pickupPlace.label
  );

  const mapRef = useRef<MapView>(null);
  const lastAnimatedQueryRef = useRef<string>("");
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  useEffect(() => {
    setIsMapLoaded(false);
    setHasTimedOut(false);
    const timer = setTimeout(() => {
      setHasTimedOut(true);
    }, 4500);
    return () => clearTimeout(timer);
  }, []);

  // Typed location mode: do not automatically preselect or fetch GPS on mount.
  // Coordinates are only populated when the user explicitly selects a suggestion.

  const searchReferenceCoords =
    previewCoords || pickupPlace.coords || DEFAULT_CENTER;

  // Real Google Places (New) autocomplete hook
  const {
    suggestions: googleSuggestions,
    isSearching: isGoogleSearching,
    selectPlace,
  } = usePlacesAutocomplete(search, searchReferenceCoords);

  // Compute smart autocomplete suggestions with typo correction and 250km filter
  const smartSuggestions = useMemo(() => {
    return searchSmartPlaces(search, searchReferenceCoords, 250);
  }, [search, searchReferenceCoords]);

  // Handle selecting a Google Places suggestion
  const handleSelectGoogleSuggestion = async (suggestion: GooglePlaceSuggestion) => {
    setIsGeocoding(true);
    try {
      const details = await selectPlace(suggestion.placeId);
      if (details) {
        const placeObj: Place = {
          id: `gplace-${suggestion.placeId}`,
          label: details.displayName || suggestion.primaryText,
          line: details.formattedAddress || suggestion.fullText,
          area: suggestion.secondaryText || "Lucknow, Uttar Pradesh",
          icon: "pin",
          coords: details.coords,
        };
        handleSelectPlace(placeObj);
      } else {
        showToast("Could not load place coordinates");
      }
    } catch {
      showToast("Could not select place");
    } finally {
      setIsGeocoding(false);
    }
  };

  // Live map preview update when typing: pans map immediately to top match
  useEffect(() => {
    const q = search.trim();
    if (q.length >= 2 && smartSuggestions.length > 0) {
      const topMatch = smartSuggestions[0];
      if (
        topMatch &&
        topMatch.coords &&
        lastAnimatedQueryRef.current !== topMatch.id
      ) {
        lastAnimatedQueryRef.current = topMatch.id;
        setPreviewCoords(topMatch.coords);
        setPreviewLabel(topMatch.label);

        // Smooth camera animation to the live previewed place
        mapRef.current?.animateToRegion(
          {
            latitude: topMatch.coords.lat,
            longitude: topMatch.coords.lng,
            latitudeDelta: 0.035,
            longitudeDelta: 0.035,
          },
          400
        );
      }
    }
  }, [search, smartSuggestions]);

  // Handle detecting user's live GPS location
  const detectCurrentLocation = async (confirmImmediately = false) => {
    setDetecting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setDetecting(false);
        if (confirmImmediately) {
          showToast("Location permission denied. Please search or pick on map.");
        }
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = pos.coords;
      let label = "Current Location (GPS)";
      let area = "Lucknow, Uttar Pradesh";
      let line = `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`;

      try {
        const rev = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (rev && rev.length > 0) {
          const r = rev[0];
          label = r.name || r.street || "Current Location";
          area = [r.district, r.city || "Lucknow"].filter(Boolean).join(", ");
          line = [r.street, r.district, r.city].filter(Boolean).join(", ") || line;
        }
      } catch {}

      const gpsPlace: Place = {
        id: `gps-${Date.now()}`,
        label,
        line,
        area,
        icon: "pin",
        coords: { lat: latitude, lng: longitude },
      };

      setLiveGpsPlace(gpsPlace);
      setDetecting(false);

      if (confirmImmediately) {
        handleSelectCurrentLocation(gpsPlace);
      }
    } catch (err) {
      setDetecting(false);
      if (confirmImmediately) {
        showToast("Could not detect GPS location. Please choose from list.");
      }
    }
  };

  // Selection handler for Current Location (Food & general)
  const handleSelectCurrentLocation = (placeToUse: Place) => {
    if (isDelivery) {
      if (saveForFutureOrders) {
        const saved = addPlace({
          label: placeToUse.label === "Current Location (GPS)" ? "Current Location" : placeToUse.label,
          line: placeToUse.line,
          area: placeToUse.area,
          icon: "pin",
          coords: placeToUse.coords,
        });
        setDefaultPlace(saved.id);
        showToast("📍 Delivery address saved for future orders");
      } else {
        const temp = addPlace({
          label: placeToUse.label,
          line: placeToUse.line,
          area: placeToUse.area,
          icon: "pin",
          coords: placeToUse.coords,
        });
        setDefaultPlace(temp.id);
        showToast("📍 Current location set for delivery");
      }
      back();
      return;
    }

    if (isRide) {
      if (activeRideField === "pickup") {
        setPickupPlace(placeToUse);
        setPreviewCoords(placeToUse.coords ?? DEFAULT_CENTER);
        setPreviewLabel(placeToUse.label);
        showToast("Pickup set to current location");
      } else {
        setDropPlace(placeToUse);
        setPreviewCoords(placeToUse.coords ?? DEFAULT_CENTER);
        setPreviewLabel(placeToUse.label);
        showToast("Drop-off set to current location");
      }
      return;
    }

    // Default manage / fallback
    const saved = addPlace({
      label: placeToUse.label,
      line: placeToUse.line,
      area: placeToUse.area,
      icon: "pin",
      coords: placeToUse.coords,
    });
    setDefaultPlace(saved.id);
    showToast("Address saved");
    back();
  };

  // Invalidate stale coordinates when the user edits the typed address
  const handleSearchChange = (text: string) => {
    setSearch(text);
    if (isRide) {
      if (activeRideField === "pickup") {
        setPickupPlace((prev) => ({
          ...prev,
          id: `typed-pickup-${Date.now()}`,
          label: text || "Type pickup location",
          line: text ? "Please select a suggestion below to confirm coordinates" : "",
          area: "",
          coords: undefined,
        }));
      } else {
        setDropPlace((prev) => ({
          id: prev?.id || `typed-drop-${Date.now()}`,
          label: text || "Type destination",
          line: text ? "Please select a suggestion below to confirm coordinates" : "",
          area: "",
          icon: "pin",
          coords: undefined,
        }));
      }
      setPreviewCoords(null);
    }
  };

  // Select place from suggestions or saved places
  const handleSelectPlace = (place: Place | AutocompleteResult) => {
    let targetPlace: Place;
    if ("score" in place) {
      targetPlace = {
        id: place.id,
        label: place.label,
        line: place.line,
        area: place.area,
        icon: place.icon,
        coords: place.coords,
      };
    } else {
      targetPlace = place;
    }

    // Validate that the suggestion has real, non-null numeric coordinates
    if (
      !targetPlace.coords ||
      typeof targetPlace.coords.lat !== "number" ||
      typeof targetPlace.coords.lng !== "number" ||
      isNaN(targetPlace.coords.lat) ||
      isNaN(targetPlace.coords.lng)
    ) {
      showToast("Selected place has invalid coordinates. Please pick another suggestion.");
      return;
    }

    if (isRide) {
      if (activeRideField === "pickup") {
        setPickupPlace(targetPlace);
        setPreviewCoords(targetPlace.coords);
        setPreviewLabel(targetPlace.label);
        setSearch("");
        // If drop is not yet chosen, automatically transition to choosing drop-off
        if (!dropPlace || !dropPlace.coords) {
          setActiveRideField("drop");
          showToast("Pickup selected. Now choose destination.");
        } else {
          showToast(`Pickup set to ${targetPlace.label}`);
        }
      } else {
        setDropPlace(targetPlace);
        setPreviewCoords(targetPlace.coords);
        setPreviewLabel(targetPlace.label);
        setSearch("");
        showToast(`Drop-off set to ${targetPlace.label}`);
      }

      // Smooth camera pan to chosen spot
      if (targetPlace.coords) {
        mapRef.current?.animateToRegion(
          {
            latitude: targetPlace.coords.lat,
            longitude: targetPlace.coords.lng,
            latitudeDelta: 0.035,
            longitudeDelta: 0.035,
          },
          400
        );
      }
      return;
    }

    // Courier flow
    if (isCourier) {
      const saved = state.places.find((p) => p.id === targetPlace.id)
        ? targetPlace
        : addPlace({
            label: targetPlace.label,
            line: targetPlace.line,
            area: targetPlace.area,
            icon: targetPlace.icon,
            coords: targetPlace.coords,
          });
      if (mode === "courierPickup") {
        setCourier({ pickupId: saved.id });
        showToast("Courier pickup set");
        back();
      } else {
        setCourier({ dropId: saved.id });
        showToast("Courier drop-off set");
        push({ name: "courierRouteSelect" });
      }
      return;
    }

    // Delivery (Food / Grocery)
    if (isDelivery) {
      const existing = state.places.find((p) => p.id === targetPlace.id);
      const chosen = existing
        ? existing
        : addPlace({
            label: targetPlace.label,
            line: targetPlace.line,
            area: targetPlace.area,
            icon: targetPlace.icon,
            coords: targetPlace.coords,
          });
      setDefaultPlace(chosen.id);
      showToast("Delivery address confirmed");
      back();
      return;
    }

    // Manage addresses
    const existing = state.places.find((p) => p.id === targetPlace.id);
    const chosen = existing
      ? existing
      : addPlace({
          label: targetPlace.label,
          line: targetPlace.line,
          area: targetPlace.area,
          icon: targetPlace.icon,
          coords: targetPlace.coords,
        });
    setDefaultPlace(chosen.id);
    showToast("Default address updated");
    back();
  };

  // Confirm both pickup & drop-off locations for ride
  const handleConfirmRideLocations = () => {
    // Validate pickup coordinates
    if (
      !pickupPlace.coords ||
      typeof pickupPlace.coords.lat !== "number" ||
      typeof pickupPlace.coords.lng !== "number" ||
      isNaN(pickupPlace.coords.lat) ||
      isNaN(pickupPlace.coords.lng)
    ) {
      showToast("Please type and select a pickup location from the suggestions.");
      setActiveRideField("pickup");
      return;
    }

    // Validate drop-off coordinates
    if (
      !dropPlace ||
      !dropPlace.coords ||
      typeof dropPlace.coords.lat !== "number" ||
      typeof dropPlace.coords.lng !== "number" ||
      isNaN(dropPlace.coords.lat) ||
      isNaN(dropPlace.coords.lng)
    ) {
      showToast("Please type and select a destination from the suggestions.");
      setActiveRideField("drop");
      return;
    }

    // Ensure pickup is saved
    let finalPickupId = pickupPlace.id;
    if (!state.places.some((p) => p.id === finalPickupId)) {
      const added = addPlace({
        label: pickupPlace.label,
        line: pickupPlace.line,
        area: pickupPlace.area,
        icon: pickupPlace.icon,
        coords: pickupPlace.coords,
      });
      finalPickupId = added.id;
    }

    // Ensure drop is saved
    let finalDropId = dropPlace.id;
    if (!state.places.some((p) => p.id === finalDropId)) {
      const added = addPlace({
        label: dropPlace.label,
        line: dropPlace.line,
        area: dropPlace.area,
        icon: dropPlace.icon,
        coords: dropPlace.coords,
      });
      finalDropId = added.id;
    }

    setRide({
      pickupId: finalPickupId,
      dropId: finalDropId,
    });

    showToast("📍 Pickup & Drop-off confirmed");
    back();
  };

  // Swap pickup and drop-off
  const handleSwapRideLocations = () => {
    if (!dropPlace) return;
    const prevPickup = pickupPlace;
    setPickupPlace(dropPlace);
    setDropPlace(prevPickup);
    setPreviewCoords(dropPlace.coords ?? DEFAULT_CENTER);
    setPreviewLabel(dropPlace.label);
    showToast("Swapped pickup & drop-off");
  };

  // Fit map to show both pickup and drop
  useEffect(() => {
    if (isRide && pickupPlace.coords && dropPlace?.coords) {
      mapRef.current?.fitToCoordinates(
        [
          { latitude: pickupPlace.coords.lat, longitude: pickupPlace.coords.lng },
          { latitude: dropPlace.coords.lat, longitude: dropPlace.coords.lng },
        ],
        {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        }
      );
    }
  }, [pickupPlace.coords, dropPlace?.coords]);

  const mapProvider = Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <FlowHeader
        title={
          isRide
            ? "Ride location & route"
            : isDelivery
            ? "Choose delivery address"
            : mode === "manage"
            ? "Saved addresses"
            : "Choose location"
        }
        onBack={back}
        showHelp={false}
      />

      {/* Ride Dual Input Section */}
      {isRide && (
        <View style={styles.rideSelectorCard}>
          <View style={styles.rideInputsCol}>
            {/* Pickup Input Tab */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setActiveRideField("pickup");
                if (pickupPlace.coords) {
                  setPreviewCoords(pickupPlace.coords);
                  setPreviewLabel(pickupPlace.label);
                  mapRef.current?.animateToRegion(
                    {
                      latitude: pickupPlace.coords.lat,
                      longitude: pickupPlace.coords.lng,
                      latitudeDelta: 0.035,
                      longitudeDelta: 0.035,
                    },
                    300
                  );
                }
              }}
              style={[
                styles.rideInputTab,
                activeRideField === "pickup" && styles.rideInputTabActivePickup,
              ]}
            >
              <View style={styles.dotGreen} />
              <View style={styles.tabTextCol}>
                <Text style={styles.tabSubText}>PICKUP LOCATION</Text>
                <Text style={styles.tabMainText} numberOfLines={1}>
                  {pickupPlace.label}
                </Text>
              </View>
              {activeRideField === "pickup" && (
                <View style={styles.activeFieldIndicator}>
                  <Text style={styles.activeFieldIndicatorText}>Editing</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Drop-off Input Tab */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setActiveRideField("drop");
                if (dropPlace?.coords) {
                  setPreviewCoords(dropPlace.coords);
                  setPreviewLabel(dropPlace.label);
                  mapRef.current?.animateToRegion(
                    {
                      latitude: dropPlace.coords.lat,
                      longitude: dropPlace.coords.lng,
                      latitudeDelta: 0.035,
                      longitudeDelta: 0.035,
                    },
                    300
                  );
                }
              }}
              style={[
                styles.rideInputTab,
                activeRideField === "drop" && styles.rideInputTabActiveDrop,
              ]}
            >
              <View style={styles.dotOrange} />
              <View style={styles.tabTextCol}>
                <Text style={styles.tabSubText}>DESTINATION (DROP-OFF)</Text>
                <Text
                  style={[
                    styles.tabMainText,
                    !dropPlace && { color: colors.muted },
                  ]}
                  numberOfLines={1}
                >
                  {dropPlace ? dropPlace.label : "Where to? (tap to choose)"}
                </Text>
              </View>
              {activeRideField === "drop" && (
                <View style={styles.activeFieldIndicator}>
                  <Text style={styles.activeFieldIndicatorText}>Editing</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Swap Button */}
          {dropPlace && (
            <TouchableOpacity
              onPress={handleSwapRideLocations}
              style={styles.swapBtn}
              accessibilityLabel="Swap pickup and drop-off"
            >
              <Text style={styles.swapIcon}>⇅</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Search Input Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchRow}>
          <Icon name="search" size={17} color={colors.muted} />
          <TextInput
            placeholder={
              isRide
                ? activeRideField === "pickup"
                  ? "Type pickup location (smart preview on map)..."
                  : "Type drop-off location (within 250 km)..."
                : "Search address, landmark, or hub..."
            }
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={handleSearchChange}
            style={styles.searchInput}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => handleSearchChange("")} style={styles.clearBtn}>
              <Icon name="close" size={14} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* View toggle for non-ride modes */}
        {!isRide && (
          <View style={styles.toggleRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setViewOnMap(false)}
              style={[styles.toggleBtn, !viewOnMap && styles.toggleBtnActive]}
            >
              <Icon
                name="list"
                size={14}
                color={!viewOnMap ? "#ffffff" : colors.muted}
              />
              <Text
                style={[
                  styles.toggleBtnText,
                  !viewOnMap && styles.toggleBtnTextActive,
                ]}
              >
                List & Suggestions
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setViewOnMap(true)}
              style={[styles.toggleBtn, viewOnMap && styles.toggleBtnActive]}
            >
              <Icon
                name="pin"
                size={14}
                color={viewOnMap ? "#ffffff" : colors.muted}
              />
              <Text
                style={[
                  styles.toggleBtnText,
                  viewOnMap && styles.toggleBtnTextActive,
                ]}
              >
                Choose on map
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Live Map Preview (Always visible for ride, or when viewOnMap toggled) */}
      {(isRide || viewOnMap) && (
        <View style={[styles.mapContainer, isRide && styles.mapContainerRide]}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            provider={mapProvider}
            initialRegion={{
              latitude: previewCoords?.lat ?? DEFAULT_CENTER.lat,
              longitude: previewCoords?.lng ?? DEFAULT_CENTER.lng,
              latitudeDelta: 0.04,
              longitudeDelta: 0.04,
            }}
            onPress={(e) => {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              const tappedCoords = { lat: latitude, lng: longitude };
              setPreviewCoords(tappedCoords);
              setPreviewLabel("Selected Map Point");
              if (isRide) {
                const mapPlace: Place = {
                  id: `map-point-${Date.now()}`,
                  label: "Pinned Map Location",
                  line: `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`,
                  area: "Lucknow Area",
                  icon: "pin",
                  coords: tappedCoords,
                };
                if (activeRideField === "pickup") {
                  setPickupPlace(mapPlace);
                } else {
                  setDropPlace(mapPlace);
                }
              }
            }}
            customMapStyle={DARK_MAP_STYLE}
            onMapLoaded={() => setIsMapLoaded(true)}
          >
            {/* Pickup Marker (Green) */}
            {pickupPlace.coords && (
              <Marker
                coordinate={{
                  latitude: pickupPlace.coords.lat,
                  longitude: pickupPlace.coords.lng,
                }}
                title={`Pickup: ${pickupPlace.label}`}
                tracksViewChanges={false}
              >
                <View style={styles.pickupMarkerPill}>
                  <View style={styles.markerDotGreen} />
                  <Text style={styles.markerTextGreen}>PICKUP</Text>
                </View>
              </Marker>
            )}

            {/* Drop-off Marker (Orange) */}
            {dropPlace?.coords && (
              <Marker
                coordinate={{
                  latitude: dropPlace.coords.lat,
                  longitude: dropPlace.coords.lng,
                }}
                title={`Drop-off: ${dropPlace.label}`}
                tracksViewChanges={false}
              >
                <View style={styles.dropMarkerPill}>
                  <View style={styles.markerDotOrange} />
                  <Text style={styles.markerTextOrange}>DROP-OFF</Text>
                </View>
              </Marker>
            )}

            {/* Live Typing Preview Marker */}
            {previewCoords &&
              (!pickupPlace.coords ||
                previewCoords.lat !== pickupPlace.coords.lat ||
                previewCoords.lng !== pickupPlace.coords.lng) &&
              (!dropPlace?.coords ||
                previewCoords.lat !== dropPlace.coords.lat ||
                previewCoords.lng !== dropPlace.coords.lng) && (
                <Marker
                  coordinate={{
                    latitude: previewCoords.lat,
                    longitude: previewCoords.lng,
                  }}
                  title={previewLabel}
                  tracksViewChanges={false}
                >
                  <View style={styles.previewMarkerPill}>
                    <View style={styles.markerDotBlue} />
                    <Text style={styles.markerTextBlue}>LIVE PREVIEW</Text>
                  </View>
                </Marker>
              )}

            {/* Route polyline between pickup and drop-off */}
            {pickupPlace.coords && dropPlace?.coords && (
              <Polyline
                coordinates={[
                  {
                    latitude: pickupPlace.coords.lat,
                    longitude: pickupPlace.coords.lng,
                  },
                  {
                    latitude: dropPlace.coords.lat,
                    longitude: dropPlace.coords.lng,
                  },
                ]}
                strokeColor="#e05a0f"
                strokeWidth={4}
              />
            )}
          </MapView>

          {/* Floating Live Preview Banner */}
          <View style={styles.previewChip}>
            <View style={styles.previewPulseDot} />
            <Text style={styles.previewChipText} numberOfLines={1}>
              Live Map: {previewLabel}
            </Text>
          </View>

          {/* Map Loading Indicator */}
          {!isMapLoaded && !hasTimedOut && (
            <View style={styles.mapLoadingOverlay} pointerEvents="none">
              <ActivityIndicator size="small" color="#e05a0f" />
              <Text style={styles.mapLoadingText}>Loading map...</Text>
            </View>
          )}

          {/* Map Offline Status */}
          {!isMapLoaded && hasTimedOut && (
            <View style={styles.mapOfflineBanner}>
              <View style={styles.warningDot} />
              <Text style={styles.mapOfflineText}>
                Map tiles offline (Billing/Key Required)
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Suggestions & List Section */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 80 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Real GPS Current Location Card */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => detectCurrentLocation(true)}
          style={styles.currentLocationCard}
        >
          <View style={styles.currentLocationRow}>
            <View style={styles.gpsIconCircle}>
              {detecting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Icon name="pin" size={20} color="#ffffff" />
              )}
            </View>
            <View style={styles.currentLocationTextCol}>
              <View style={styles.badgeRow}>
                <Text style={styles.currentLocationTitle}>Use Current Location</Text>
                <View style={styles.liveTag}>
                  <Text style={styles.liveTagText}>GPS</Text>
                </View>
              </View>
              <Text style={styles.currentLocationSubtitle} numberOfLines={1}>
                {detecting
                  ? "Accessing device GPS & reverse geocoding..."
                  : liveGpsPlace
                  ? `${liveGpsPlace.label} · ${liveGpsPlace.area}`
                  : "Tap to detect real coordinates & set delivery address"}
              </Text>
            </View>
            <Icon name="arrow" size={16} color={colors.accent} />
          </View>
        </TouchableOpacity>

        {/* Set Exact Pin on Interactive Map Card */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => push({ name: "addAddress", mode })}
          style={styles.pinMapCard}
        >
          <View style={styles.currentLocationRow}>
            <View style={styles.mapPinIconCircle}>
              <Icon name="pin" size={18} color={colors.accent} />
            </View>
            <View style={styles.currentLocationTextCol}>
              <View style={styles.badgeRow}>
                <Text style={styles.currentLocationTitle}>Set Exact Pin on Map</Text>
                <View style={[styles.liveTag, { backgroundColor: "#e8f5e9" }]}>
                  <Text style={[styles.liveTagText, { color: "#2e7d32" }]}>ACCURATE</Text>
                </View>
              </View>
              <Text style={styles.currentLocationSubtitle}>
                Drag pin to your doorstep & specify house/flat/landmark
              </Text>
            </View>
            <Icon name="arrow" size={16} color={colors.muted} />
          </View>
        </TouchableOpacity>

        {/* Saved Addresses Section (if available) */}
        {state.places.length > 0 && (
          <View style={styles.savedSectionWrap}>
            <Text style={styles.savedSectionTitle}>SAVED ADDRESSES</Text>
            <View style={styles.savedPlacesRow}>
              {state.places.map((place) => {
                const isSelected = state.defaultPlaceId === place.id;
                return (
                  <TouchableOpacity
                    key={place.id}
                    activeOpacity={0.75}
                    onPress={() => handleSelectPlace(place)}
                    style={[
                      styles.savedPlaceChip,
                      isSelected && styles.savedPlaceChipSelected,
                    ]}
                  >
                    <Icon
                      name={place.icon}
                      size={13}
                      color={isSelected ? "#ffffff" : colors.ink}
                    />
                    <Text
                      style={[
                        styles.savedPlaceText,
                        isSelected && styles.savedPlaceTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {place.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Autocomplete / Suggested Places */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeadingTitle}>
            {search.length > 0
              ? googleSuggestions.length > 0
                ? `Google Places results (${googleSuggestions.length})`
                : `Search results (${smartSuggestions.length}) · ≤ 250 km`
              : "Suggested places & hubs · ≤ 250 km"}
          </Text>
          {isGoogleSearching ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Text style={styles.sectionHeadingSub}>
              {googleSuggestions.length > 0 ? "Google Verified" : "Typo-corrected"}
            </Text>
          )}
        </View>

        <View style={styles.suggestionsContainer}>
          {isGeocoding && (
            <View style={{ paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={{ fontSize: 12, color: colors.ink, fontWeight: "600" }}>Fetching exact place coordinates...</Text>
            </View>
          )}

          {googleSuggestions.length > 0 ? (
            googleSuggestions.map((suggestion) => (
              <TouchableOpacity
                key={suggestion.placeId}
                activeOpacity={0.75}
                onPress={() => handleSelectGoogleSuggestion(suggestion)}
                style={styles.suggestionRow}
                disabled={isGeocoding}
              >
                <View style={styles.suggestionIconBox}>
                  <Icon name="pin" size={16} color={colors.accent} />
                </View>

                <View style={styles.suggestionDetails}>
                  <View style={styles.suggestionTitleRow}>
                    <Text style={styles.suggestionLabel} numberOfLines={1}>
                      {suggestion.primaryText}
                    </Text>
                    <View style={[styles.distanceBadge, { backgroundColor: "#e8f0fe" }]}>
                      <Text style={[styles.distanceBadgeText, { color: "#1a73e8" }]}>
                        GOOGLE
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.suggestionAddress} numberOfLines={1}>
                    {suggestion.secondaryText || suggestion.fullText}
                  </Text>
                </View>

                <Icon name="arrow" size={14} color={colors.muted} />
              </TouchableOpacity>
            ))
          ) : smartSuggestions.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No locations found within 250 km</Text>
              <Text style={styles.emptySub}>
                Try typing another city (Kanpur, Ayodhya, Prayagraj) or landmark.
              </Text>
            </View>
          ) : (
            smartSuggestions.map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.75}
                onPress={() => handleSelectPlace(item)}
                style={styles.suggestionRow}
              >
                <View style={styles.suggestionIconBox}>
                  <Icon name="pin" size={16} color={colors.accent} />
                </View>

                <View style={styles.suggestionDetails}>
                  <View style={styles.suggestionTitleRow}>
                    <Text style={styles.suggestionLabel} numberOfLines={1}>
                      {item.label}
                    </Text>
                    <View style={styles.distanceBadge}>
                      <Text style={styles.distanceBadgeText}>
                        {item.distanceKm.toFixed(1)} km
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.suggestionAddress} numberOfLines={1}>
                    {item.line || item.area} · {item.city}
                  </Text>

                  {/* Typo Correction Badge */}
                  {item.isTypoCorrection && (
                    <View style={styles.typoCorrectionPill}>
                      <Text style={styles.typoCorrectionText}>
                        💡 Typo matched: "{item.correctedWord || item.label}"
                      </Text>
                    </View>
                  )}
                </View>

                <Icon name="arrow" size={14} color={colors.muted} />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Add custom address */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => push({ name: "addAddress", mode })}
          style={styles.addCustomRow}
        >
          <View style={styles.addCustomIcon}>
            <Icon name="plus" size={16} color={colors.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.addCustomTitle}>Add a custom address</Text>
            <Text style={styles.addCustomSub}>Manually enter house, street & pin</Text>
          </View>
          <Icon name="arrow" size={14} color={colors.muted} />
        </TouchableOpacity>
      </ScrollView>

      {/* Confirmation CTA for Ride */}
      {isRide && (
        <SafeAreaView style={styles.bottomBar} edges={["bottom"]}>
          <Button onPress={handleConfirmRideLocations}>
            {dropPlace
              ? "Confirm Pickup & Drop-off"
              : "Confirm Pickup Location"}
          </Button>
        </SafeAreaView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  rideSelectorCard: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rideInputsCol: {
    flex: 1,
    gap: 8,
  },
  rideInputTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radii.md,
    backgroundColor: colors.canvas,
    borderWidth: 1.5,
    borderColor: "transparent",
    gap: 8,
  },
  rideInputTabActivePickup: {
    borderColor: "#22c55e",
    backgroundColor: "rgba(34, 197, 94, 0.08)",
  },
  rideInputTabActiveDrop: {
    borderColor: "#e05a0f",
    backgroundColor: "rgba(224, 90, 15, 0.08)",
  },
  dotGreen: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22c55e",
  },
  dotOrange: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#e05a0f",
  },
  tabTextCol: {
    flex: 1,
  },
  tabSubText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.muted,
    letterSpacing: 0.5,
  },
  tabMainText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 1,
  },
  activeFieldIndicator: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.ink,
  },
  activeFieldIndicatorText: {
    fontSize: 9,
    color: "#ffffff",
    fontWeight: "700",
  },
  swapBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  swapIcon: {
    fontSize: 18,
    color: colors.ink,
    fontWeight: "bold",
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.canvas,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.ink,
    marginLeft: 8,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 6,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#ffffff",
  },
  toggleBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
  },
  toggleBtnTextActive: {
    color: "#ffffff",
  },
  mapContainer: {
    height: 250,
    width: "100%",
    backgroundColor: "#161c24",
    position: "relative",
    overflow: "hidden",
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    zIndex: 5,
  },
  mapLoadingText: {
    color: "#9ca3af",
    fontSize: 12,
  },
  mapOfflineBanner: {
    position: "absolute",
    bottom: 36,
    alignSelf: "center",
    backgroundColor: "rgba(17, 24, 39, 0.92)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
    zIndex: 10,
  },
  warningDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#f59e0b",
  },
  mapOfflineText: {
    color: "#fbbf24",
    fontSize: 10,
    fontWeight: "600",
  },
  mapContainerRide: {
    height: 220,
  },
  pickupMarkerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#14532d",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#22c55e",
  },
  markerDotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
  },
  markerTextGreen: {
    fontSize: 10,
    fontWeight: "800",
    color: "#ffffff",
  },
  dropMarkerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#7c2d12",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e05a0f",
  },
  markerDotOrange: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e05a0f",
  },
  markerTextOrange: {
    fontSize: 10,
    fontWeight: "800",
    color: "#ffffff",
  },
  previewMarkerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#1e3a8a",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#3b82f6",
  },
  markerDotBlue: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#60a5fa",
  },
  markerTextBlue: {
    fontSize: 10,
    fontWeight: "800",
    color: "#ffffff",
  },
  previewChip: {
    position: "absolute",
    top: 10,
    left: 12,
    right: 12,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  previewPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
  },
  previewChipText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  currentLocationCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.accent,
    padding: 14,
    marginBottom: 10,
    shadowColor: colors.accent,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  pinMapCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#e4ded8",
    padding: 14,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  mapPinIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  savedSectionWrap: {
    marginBottom: 16,
  },
  savedSectionTitle: {
    fontSize: 9.5,
    fontWeight: "800",
    color: colors.muted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  savedPlacesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  savedPlaceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e4ded8",
  },
  savedPlaceChipSelected: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  savedPlaceText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
  },
  savedPlaceTextSelected: {
    color: "#ffffff",
  },
  currentLocationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  gpsIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  currentLocationTextCol: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  currentLocationTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  liveTag: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.accent,
  },
  currentLocationSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  saveFutureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  saveFutureTextCol: {
    flex: 1,
    marginRight: 12,
  },
  saveFutureTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
  },
  saveFutureSub: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 1,
  },
  gpsRideRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(224, 90, 15, 0.2)",
  },
  gpsRideIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  gpsRideTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.accent,
  },
  gpsRideSub: {
    fontSize: 10,
    color: colors.muted,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
    paddingHorizontal: 2,
  },
  sectionHeadingTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.muted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  sectionHeadingSub: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.accent,
  },
  suggestionsContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    gap: 12,
  },
  suggestionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionDetails: {
    flex: 1,
  },
  suggestionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  suggestionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
    flex: 1,
  },
  distanceBadge: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  distanceBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.muted,
  },
  suggestionAddress: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  typoCorrectionPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(224, 90, 15, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  typoCorrectionText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.accent,
  },
  emptyBox: {
    padding: 24,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  emptySub: {
    fontSize: 11,
    color: colors.muted,
    textAlign: "center",
    marginTop: 4,
  },
  addCustomRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 12,
  },
  addCustomIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
  },
  addCustomTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  addCustomSub: {
    fontSize: 11,
    color: colors.muted,
  },
  bottomBar: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});

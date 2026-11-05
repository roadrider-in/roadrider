import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Platform,
  Dimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from "react-native-maps";
import FlowHeader from "../../components/FlowHeader";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import type { PlacesMode } from "../../navigation/types";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { colors, radii } from "../../theme/tokens";
import { DARK_MAP_STYLE, DEFAULT_CENTER, type LatLng } from "../../lib/googleMaps";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface AddAddressProps {
  mode: PlacesMode;
}

export default function AddAddress({ mode }: AddAddressProps) {
  const insets = useSafeAreaInsets();
  const { back } = useNav();
  const { state, addPlace, setDefaultPlace, setRide, setCourier, showToast } =
    useApp();

  const mapRef = useRef<MapView>(null);
  const geocodeTimeoutRef = useRef<any>(null);

  // Address Tag
  const [label, setLabel] = useState<"Home" | "Work" | "Other">("Home");

  // Detailed fields
  const [houseDetails, setHouseDetails] = useState("");
  const [roadArea, setRoadArea] = useState("Hazratganj, Lucknow");
  const [landmark, setLandmark] = useState("");
  const [recipientName, setRecipientName] = useState(state.profile.name || "");
  const [recipientMobile, setRecipientMobile] = useState(state.profile.phone || "");

  // Coordinates
  const [currentCoords, setCurrentCoords] = useState<LatLng>(DEFAULT_CENTER);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [error, setError] = useState("");

  // Map state
  const [mapLoaded, setMapLoaded] = useState(false);

  // Reverse geocode whenever pin changes
  const reverseGeocode = async (coords: LatLng) => {
    setIsGeocoding(true);
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude: coords.lat,
        longitude: coords.lng,
      });

      if (results && results.length > 0) {
        const r = results[0];
        const locality = r.district || r.subregion || r.city || "Lucknow";
        const city = r.city || "Lucknow";
        const stateName = r.region || "Uttar Pradesh";
        const postal = r.postalCode ? ` · ${r.postalCode}` : "";

        const areaStr = `${locality}, ${city}, ${stateName}${postal}`;
        setRoadArea(areaStr);

        // If street or landmark is found and houseDetails is empty, suggest it
        if (r.street && !landmark) {
          setLandmark(r.name || r.street);
        }
      }
    } catch (e) {
      // Non-blocking fallback
    } finally {
      setIsGeocoding(false);
    }
  };

  // Detect current GPS coordinates
  const handleDetectGps = async () => {
    setIsDetectingGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showToast("Location permission was denied. Please pick on the map.");
        setIsDetectingGps(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newCoords: LatLng = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      setCurrentCoords(newCoords);

      // Animate map to current GPS location
      mapRef.current?.animateToRegion(
        {
          latitude: newCoords.lat,
          longitude: newCoords.lng,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        500
      );

      // Run reverse geocoding
      await reverseGeocode(newCoords);
      showToast("📍 Pin set to your current GPS location");
    } catch (err: any) {
      showToast("Could not detect GPS location. You can drag the map pin.");
    } finally {
      setIsDetectingGps(false);
    }
  };

  // When map region changes, update coordinates and debounced reverse geocode
  const handleRegionChangeComplete = (region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }) => {
    const nextCoords: LatLng = {
      lat: region.latitude,
      lng: region.longitude,
    };
    setCurrentCoords(nextCoords);

    // Debounced reverse geocoding to prevent flooding
    if (geocodeTimeoutRef.current) {
      clearTimeout(geocodeTimeoutRef.current);
    }
    geocodeTimeoutRef.current = setTimeout(() => {
      reverseGeocode(nextCoords);
    }, 700);
  };

  // Save address handler
  const handleSave = () => {
    if (!houseDetails.trim()) {
      setError("Please enter house, flat, building or floor details.");
      return;
    }
    if (!roadArea.trim()) {
      setError("Please enter the road, area or locality.");
      return;
    }

    // Validate coordinates
    if (
      typeof currentCoords.lat !== "number" ||
      typeof currentCoords.lng !== "number" ||
      isNaN(currentCoords.lat) ||
      isNaN(currentCoords.lng) ||
      currentCoords.lat < -90 ||
      currentCoords.lat > 90 ||
      currentCoords.lng < -180 ||
      currentCoords.lng > 180
    ) {
      setError("Invalid GPS coordinates. Please re-adjust the map pin.");
      return;
    }

    const icon = label === "Home" ? ("home" as const) : ("pin" as const);
    const lineFormatted = [houseDetails.trim(), landmark.trim()]
      .filter(Boolean)
      .join(", Near ");

    const created = addPlace({
      label,
      line: lineFormatted || houseDetails.trim(),
      area: roadArea.trim(),
      icon,
      coords: currentCoords,
      landmark: landmark.trim() || undefined,
      houseDetails: houseDetails.trim(),
      recipientName: recipientName.trim() || undefined,
      recipientMobile: recipientMobile.trim() || undefined,
      addressType: label,
    });

    if (mode === "delivery" || mode === "manage") {
      setDefaultPlace(created.id);
    } else if (mode === "ridePickup") {
      setRide({ pickupId: created.id });
    } else if (mode === "rideDrop") {
      setRide({ dropId: created.id });
    } else if (mode === "courierPickup") {
      setCourier({ pickupId: created.id });
    } else if (mode === "courierDrop") {
      setCourier({ dropId: created.id });
    }

    showToast(`📍 Added "${label}" address with exact pin coordinates!`);
    back();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />
      <FlowHeader title="Add delivery address" onBack={back} showHelp={false} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 90 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Interactive Map Pin Drop Container */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            provider={Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
            style={styles.map}
            initialRegion={{
              latitude: currentCoords.lat,
              longitude: currentCoords.lng,
              latitudeDelta: 0.008,
              longitudeDelta: 0.008,
            }}
            customMapStyle={DARK_MAP_STYLE}
            onMapReady={() => setMapLoaded(true)}
            onRegionChangeComplete={handleRegionChangeComplete}
            showsUserLocation={true}
            showsMyLocationButton={false}
          />

          {/* Fixed Center Pin Crosshair */}
          <View style={styles.centerPinWrapper} pointerEvents="none">
            <View style={styles.pinShadow} />
            <View style={styles.pinBody}>
              <Icon name="pin" size={24} color="#ffffff" />
            </View>
            <View style={styles.pinTip} />
          </View>

          {/* Floating Live Coordinates & Geocode Card */}
          <View style={styles.liveCoordsCard}>
            <View style={styles.coordsHeaderRow}>
              <View style={styles.pulseDot} />
              <Text style={styles.coordsHeading}>EXACT PIN COORDINATES</Text>
              {isGeocoding && <ActivityIndicator size="small" color="#e05a0f" />}
            </View>
            <Text style={styles.coordsValues}>
              {currentCoords.lat.toFixed(5)}° N, {currentCoords.lng.toFixed(5)}° E
            </Text>
            <Text style={styles.dragHintText}>
              Drag the map to align the pin to your exact doorstep or gate
            </Text>
          </View>

          {/* Floating Current GPS Button */}
          <TouchableOpacity
            style={styles.gpsFloatingBtn}
            activeOpacity={0.85}
            onPress={handleDetectGps}
            disabled={isDetectingGps}
          >
            {isDetectingGps ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <View style={styles.gpsBtnContent}>
                <Icon name="pin" size={16} color={colors.accent} />
                <Text style={styles.gpsBtnText}>Use Current GPS</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Address Input Form */}
        <View style={styles.formContainer}>
          <Text style={styles.formSectionTitle}>Address & contact details</Text>

          {/* Label selector: Home, Work, Other */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>SAVE ADDRESS AS</Text>
            <View style={styles.labelTabsRow}>
              {(["Home", "Work", "Other"] as const).map((tag) => {
                const isSelected = label === tag;
                return (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => setLabel(tag)}
                    style={[
                      styles.labelTabBtn,
                      isSelected && styles.labelTabBtnSelected,
                    ]}
                  >
                    <Icon
                      name={tag === "Home" ? "home" : "pin"}
                      size={14}
                      color={isSelected ? "#ffffff" : colors.ink}
                    />
                    <Text
                      style={[
                        styles.labelTabText,
                        isSelected && styles.labelTabTextSelected,
                      ]}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* House / Flat / Block */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              HOUSE / FLAT / BLOCK / FLOOR NO. *
            </Text>
            <TextInput
              placeholder="e.g. Flat 304, Block B, Krishna Apartments"
              placeholderTextColor={colors.muted}
              value={houseDetails}
              onChangeText={(t) => {
                setHouseDetails(t);
                if (error) setError("");
              }}
              style={[styles.textInput, error ? styles.textInputError : null]}
            />
            {!!error && <Text style={styles.errorText}>{error}</Text>}
          </View>

          {/* Road / Area / Locality */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>ROAD / APARTMENT / AREA *</Text>
            <TextInput
              placeholder="e.g. Shahnajaf Road, Hazratganj, Lucknow"
              placeholderTextColor={colors.muted}
              value={roadArea}
              onChangeText={setRoadArea}
              style={styles.textInput}
            />
          </View>

          {/* Landmark */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>LANDMARK (OPTIONAL)</Text>
            <TextInput
              placeholder="e.g. Near Sahara Ganj Mall / Opp. SBI Bank"
              placeholderTextColor={colors.muted}
              value={landmark}
              onChangeText={setLandmark}
              style={styles.textInput}
            />
          </View>

          {/* Contact Details */}
          <View style={styles.divider} />
          <Text style={styles.subHeading}>Receiver contact (For delivery captain)</Text>

          {/* Recipient Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>RECIPIENT NAME</Text>
            <TextInput
              placeholder="e.g. Pranav Sharma"
              placeholderTextColor={colors.muted}
              value={recipientName}
              onChangeText={setRecipientName}
              style={styles.textInput}
            />
          </View>

          {/* Recipient Phone */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>RECIPIENT MOBILE NUMBER</Text>
            <TextInput
              placeholder="e.g. 9876543210"
              placeholderTextColor={colors.muted}
              value={recipientMobile}
              onChangeText={setRecipientMobile}
              keyboardType="phone-pad"
              style={styles.textInput}
            />
          </View>
        </View>
      </ScrollView>

      {/* Bottom Save Action */}
      <SafeAreaView style={styles.bottomBar} edges={["bottom"]}>
        <Button onPress={handleSave}>Confirm & Save Location</Button>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  mapContainer: {
    height: 250,
    width: "100%",
    position: "relative",
    backgroundColor: "#171c26",
  },
  map: {
    flex: 1,
  },
  centerPinWrapper: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -18,
    marginTop: -38,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  pinBody: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 6,
  },
  pinTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderStyle: "solid",
    backgroundColor: "transparent",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: colors.accent,
    marginTop: -1,
  },
  pinShadow: {
    position: "absolute",
    bottom: -4,
    width: 14,
    height: 6,
    borderRadius: 7,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  liveCoordsCard: {
    position: "absolute",
    top: 12,
    left: 14,
    right: 14,
    backgroundColor: "rgba(22, 17, 14, 0.92)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 5,
  },
  coordsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#52ff94",
  },
  coordsHeading: {
    fontSize: 9.5,
    fontWeight: "800",
    color: colors.accent,
    letterSpacing: 0.8,
    flex: 1,
  },
  coordsValues: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  dragHintText: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.65)",
    marginTop: 2,
  },
  gpsFloatingBtn: {
    position: "absolute",
    bottom: 12,
    right: 14,
    backgroundColor: "#ffffff",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 9,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
  },
  gpsBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  gpsBtnText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: colors.accent,
  },
  formContainer: {
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  formSectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.4,
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  labelTabsRow: {
    flexDirection: "row",
    gap: 10,
  },
  labelTabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radii.sm,
    backgroundColor: "#f0ede9",
    borderWidth: 1,
    borderColor: "#e4ded8",
  },
  labelTabBtnSelected: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  labelTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
  },
  labelTabTextSelected: {
    color: "#ffffff",
  },
  textInput: {
    backgroundColor: "#ffffff",
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    color: colors.ink,
    borderWidth: 1,
    borderColor: "#e4ded8",
  },
  textInputError: {
    borderColor: colors.accent,
  },
  errorText: {
    fontSize: 11,
    color: colors.accent,
    marginTop: 4,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#ebe6e0",
    marginVertical: 14,
  },
  subHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6b6560",
    marginBottom: 14,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#ebe6e0",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: -3 },
    shadowRadius: 8,
    elevation: 6,
  },
});

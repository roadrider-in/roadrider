import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Animated,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "./Icon";
import { useApp } from "../state/AppState";
import { useNav } from "../navigation/Navigation";
import { colors, radii } from "../theme/tokens";
import { searchSmartPlaces, type AutocompleteResult } from "../lib/autocomplete";
import { DEFAULT_CENTER, computeDistanceKm } from "../lib/googleMaps";
import { fetchStoreById } from "../lib/supabaseData";
import { usePlacesAutocomplete } from "../hooks/usePlacesAutocomplete";
import type { GooglePlaceSuggestion } from "../services/placesService";
import type { Place } from "../data/demo";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function LocationSelectionBottomSheet() {
  const insets = useSafeAreaInsets();
  const { push } = useNav();
  const {
    state,
    isLocationSheetVisible,
    closeLocationSheet,
    setDefaultPlace,
    addPlace,
    deletePlace,
    placeById,
    showToast,
    clearCart,
  } = useApp();

  // Animation values for smooth entrance & dismissal
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // View mode inside sheet: "sheet" | "seeAll" | "search"
  const [viewMode, setViewMode] = useState<"sheet" | "seeAll" | "search">("sheet");

  // GPS state
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean | null>(null);
  const [isEnablingLocation, setIsEnablingLocation] = useState(false);
  const [currentGpsAddress, setCurrentGpsAddress] = useState<string | null>(null);

  // Manual search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Check permission on sheet open
  useEffect(() => {
    if (isLocationSheetVisible) {
      setViewMode("sheet");
      setSearchQuery("");
      (async () => {
        try {
          const { status } = await Location.getForegroundPermissionsAsync();
          setHasLocationPermission(status === "granted");
          if (status === "granted") {
            // Quick reverse geocode of last known or current position
            const pos = await Location.getLastKnownPositionAsync();
            if (pos) {
              const rev = await Location.reverseGeocodeAsync({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              });
              if (rev && rev[0]) {
                const r = rev[0];
                const area = [r.district || r.subregion, r.city || "Lucknow"].filter(Boolean).join(", ");
                setCurrentGpsAddress(area);
              }
            }
          }
        } catch {}
      })();

      // Slide up animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 24,
          stiffness: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animation on close
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isLocationSheetVisible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      closeLocationSheet();
    });
  };

  // Cart serviceability check when changing address
  const checkCartServiceability = async (newCoords?: { lat: number; lng: number }) => {
    if (!newCoords) return true;
    const foodCart = state.carts.food;
    if (foodCart.storeId && foodCart.lines.length > 0) {
      try {
        const { data: store } = await fetchStoreById(foodCart.storeId);
        if (store && store.coords) {
          const distKm = computeDistanceKm(newCoords, store.coords);
          if (distKm > 15) {
            Alert.alert(
              "Restaurant Outside Delivery Range",
              `"${store.name}" is ${distKm.toFixed(1)} km away from your newly selected location (standard range is 15 km). Would you like to keep or clear your cart?`,
              [
                { text: "Keep Cart", style: "cancel" },
                {
                  text: "Clear Cart",
                  style: "destructive",
                  onPress: () => {
                    clearCart("food");
                    showToast("Cart cleared for new delivery address");
                  },
                },
              ]
            );
            return false;
          }
        }
      } catch {}
      showToast("📍 Delivery location updated. Items are in delivery range!");
    }
    return true;
  };

  // Enable / Use Device GPS Location
  const handleEnableGps = async () => {
    setIsEnablingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setIsEnablingLocation(false);
        setHasLocationPermission(false);
        Alert.alert(
          "Location Permission Required",
          "RoadRider needs device location permission to accurately deliver orders to your doorstep. You can enable it in device Settings or search manually.",
          [
            { text: "Search Manually", onPress: () => setViewMode("search") },
            {
              text: "Open Settings",
              onPress: () => {
                if (Platform.OS === "ios") Linking.openURL("app-settings:");
                else Linking.openSettings();
              },
            },
          ]
        );
        return;
      }

      setHasLocationPermission(true);

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = pos.coords;
      let label = "Current Location";
      let area = "Lucknow, Uttar Pradesh";
      let line = `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`;

      try {
        const rev = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (rev && rev.length > 0) {
          const r = rev[0];
          label = r.name || r.street || "Current Location";
          area = [r.district || r.subregion, r.city || "Lucknow"].filter(Boolean).join(", ");
          line = [r.street, r.district, r.city].filter(Boolean).join(", ") || line;
        }
      } catch {}

      const created = addPlace({
        label,
        line,
        area,
        icon: "pin",
        coords: { lat: latitude, lng: longitude },
      });

      setDefaultPlace(created.id);
      await AsyncStorage.setItem("roadrider.first_launch_done", "true");
      checkCartServiceability(created.coords);

      showToast(`📍 Location set to ${label} (${area.split(",")[0]})`);
      handleDismiss();
    } catch (err: any) {
      showToast("Could not detect GPS coordinates. Please search manually.");
    } finally {
      setIsEnablingLocation(false);
    }
  };

  // Select a saved address
  const handleSelectSavedPlace = async (place: Place) => {
    setDefaultPlace(place.id);
    await AsyncStorage.setItem("roadrider.first_launch_done", "true");
    checkCartServiceability(place.coords);
    showToast(`📍 Delivering to ${place.label}`);
    handleDismiss();
  };

  // Delete a saved address with confirmation
  const handleDeleteAddress = (place: Place) => {
    Alert.alert(
      "Delete Address",
      `Are you sure you want to delete "${place.label}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deletePlace(place.id);
            showToast(`Removed "${place.label}" from saved addresses`);
          },
        },
      ]
    );
  };

  // Smart suggestions for manual search
  const currentCoords =
    placeById(state.defaultPlaceId)?.coords || DEFAULT_CENTER;

  // Real Google Places (New) autocomplete hook
  const {
    suggestions: googleSuggestions,
    isSearching: isGoogleSearching,
    selectPlace,
  } = usePlacesAutocomplete(searchQuery, currentCoords);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchSmartPlaces(searchQuery, currentCoords, 250);
  }, [searchQuery, currentCoords]);

  // Select a Google Place suggestion
  const handleSelectGooglePlace = async (suggestion: GooglePlaceSuggestion) => {
    try {
      setIsSearching(true);
      const details = await selectPlace(suggestion.placeId);
      if (details) {
        const created = addPlace({
          label: details.displayName || suggestion.primaryText,
          line: details.formattedAddress || suggestion.fullText,
          area: suggestion.secondaryText || "Lucknow, Uttar Pradesh",
          icon: "pin",
          coords: details.coords,
        });

        setDefaultPlace(created.id);
        await AsyncStorage.setItem("roadrider.first_launch_done", "true");
        checkCartServiceability(created.coords);
        showToast(`📍 Location set to ${created.label}`);
        handleDismiss();
      } else {
        showToast("Could not load place details");
      }
    } catch (e) {
      showToast("Could not select place");
    } finally {
      setIsSearching(false);
    }
  };

  // Select a search result fallback
  const handleSelectSearchResult = async (result: AutocompleteResult) => {
    const created = addPlace({
      label: result.label,
      line: result.line || result.area,
      area: `${result.city}, Uttar Pradesh`,
      icon: "pin",
      coords: result.coords,
    });

    setDefaultPlace(created.id);
    await AsyncStorage.setItem("roadrider.first_launch_done", "true");
    checkCartServiceability(created.coords);
    showToast(`📍 Location set to ${result.label}`);
    handleDismiss();
  };

  const savedPlaces = state.places;
  const activePlaceId = state.defaultPlaceId || (savedPlaces[0]?.id ?? "");

  return (
    <Modal
      transparent
      visible={isLocationSheetVisible}
      animationType="none"
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        {/* Semi-transparent Dimmed Backdrop */}
        <TouchableWithoutFeedback onPress={handleDismiss}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
        </TouchableWithoutFeedback>

        {/* Sliding Bottom Sheet Container */}
        <Animated.View
          style={[
            styles.sheetContainer,
            {
              transform: [{ translateY: slideAnim }],
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
        >
          {/* Top Handle Bar */}
          <View style={styles.handleBar} />

          {/* ===================== VIEW 1: MAIN LOCATION SHEET ===================== */}
          {viewMode === "sheet" && (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Header Row */}
              <View style={styles.sheetHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetHeaderTitle}>Select location</Text>
                  <Text style={styles.sheetHeaderSub}>
                    Choose delivery location for RoadRider orders
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleDismiss}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.closeBtn}
                >
                  <Icon name="close" size={16} color={colors.ink} />
                </TouchableOpacity>
              </View>

              {/* ---------------- 1. Device Location Card (Matching Reference Screenshot) ---------------- */}
              <View style={styles.deviceLocationCard}>
                <View style={styles.deviceLocationLeft}>
                  {/* Stylized Location Radar Illustration Circle */}
                  <View style={styles.radarIllustrationBox}>
                    <View style={styles.radarWaveOuter}>
                      <View style={styles.radarWaveInner}>
                        <Icon name="pin" size={20} color={colors.accent} />
                      </View>
                    </View>
                  </View>

                  <View style={styles.deviceLocationTextCol}>
                    <Text style={styles.deviceLocationHeading}>
                      {hasLocationPermission
                        ? "Device location is on"
                        : "Device location is off"}
                    </Text>
                    <Text style={styles.deviceLocationDesc}>
                      {hasLocationPermission
                        ? currentGpsAddress
                          ? `Current area: ${currentGpsAddress}`
                          : "Device GPS ready for doorstep delivery"
                        : "Enable your device location for a better experience"}
                    </Text>
                  </View>
                </View>

                {/* Enable / Refresh Button */}
                <TouchableOpacity
                  style={styles.enableGpsBtn}
                  activeOpacity={0.85}
                  onPress={handleEnableGps}
                  disabled={isEnablingLocation}
                >
                  {isEnablingLocation ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.enableGpsBtnText}>
                      {hasLocationPermission ? "Use GPS" : "Enable"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* ---------------- 2. Select a Saved Address ---------------- */}
              <View style={styles.savedSectionHeader}>
                <Text style={styles.savedSectionTitle}>Select a saved address</Text>
                {savedPlaces.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setViewMode("seeAll")}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.seeAllText}>See All →</Text>
                  </TouchableOpacity>
                )}
              </View>

              {savedPlaces.length > 0 ? (
                <View style={styles.savedCardsContainer}>
                  {savedPlaces.slice(0, 3).map((place) => {
                    const isSelected = activePlaceId === place.id;
                    const isHome = (place.label || "").toLowerCase() === "home";

                    return (
                      <TouchableOpacity
                        key={place.id}
                        activeOpacity={0.8}
                        onPress={() => handleSelectSavedPlace(place)}
                        style={[
                          styles.savedAddressCard,
                          isSelected && styles.savedAddressCardSelected,
                        ]}
                      >
                        <View
                          style={[
                            styles.addressIconCircle,
                            isSelected && styles.addressIconCircleSelected,
                          ]}
                        >
                          <Icon
                            name={isHome ? "home" : "pin"}
                            size={18}
                            color={isSelected ? "#ffffff" : colors.accent}
                          />
                        </View>

                        <View style={styles.addressInfoCol}>
                          <View style={styles.addressTitleRow}>
                            <Text style={styles.addressLabel}>{place.label}</Text>
                            {place.coords && (
                              <View style={styles.gpsVerifiedBadge}>
                                <Text style={styles.gpsVerifiedText}>📍 GPS</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.addressLine} numberOfLines={1}>
                            {place.line}
                          </Text>
                          <Text style={styles.addressArea} numberOfLines={1}>
                            {place.area}
                          </Text>
                        </View>

                        {/* Selected Radio Indicator */}
                        <View
                          style={[
                            styles.radioCircle,
                            isSelected && styles.radioCircleSelected,
                          ]}
                        >
                          {isSelected && <View style={styles.radioInnerDot} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptySavedBox}>
                  <Text style={styles.emptySavedTitle}>No saved addresses yet</Text>
                  <Text style={styles.emptySavedSub}>
                    Enable device location above or search your area below.
                  </Text>
                </View>
              )}

              {/* ---------------- 3. Search Location Manually (Bottom Prominent Field) ---------------- */}
              <View style={styles.manualSearchWrap}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setViewMode("search")}
                  style={styles.manualSearchButton}
                >
                  <Icon name="search" size={18} color="#78716c" />
                  <Text style={styles.manualSearchPlaceholder}>
                    Search location manually
                  </Text>
                  <Icon name="arrow" size={16} color="#a8a29e" />
                </TouchableOpacity>

                {/* Direct Map Pin Drop Action */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    handleDismiss();
                    push({ name: "addAddress", mode: "delivery" });
                  }}
                  style={styles.dropPinLink}
                >
                  <Icon name="pin" size={14} color={colors.accent} />
                  <Text style={styles.dropPinLinkText}>
                    Set exact pin on interactive map →
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* ===================== VIEW 2: SEE ALL SAVED ADDRESSES ===================== */}
          {viewMode === "seeAll" && (
            <View style={styles.subViewContainer}>
              <View style={styles.subViewHeader}>
                <TouchableOpacity
                  onPress={() => setViewMode("sheet")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.backBtn}
                >
                  <Icon name="arrow" size={18} color={colors.ink} />
                </TouchableOpacity>
                <Text style={styles.subViewTitle}>Saved Addresses</Text>
                <TouchableOpacity
                  onPress={() => {
                    handleDismiss();
                    push({ name: "addAddress", mode: "delivery" });
                  }}
                  style={styles.addNewAddressBtn}
                >
                  <Text style={styles.addNewAddressText}>+ Add New</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.seeAllListContent}
              >
                {savedPlaces.map((place) => {
                  const isSelected = activePlaceId === place.id;
                  const isHome = (place.label || "").toLowerCase() === "home";

                  return (
                    <View
                      key={`seeall-${place.id}`}
                      style={[
                        styles.seeAllCard,
                        isSelected && styles.seeAllCardSelected,
                      ]}
                    >
                      <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={() => handleSelectSavedPlace(place)}
                        style={styles.seeAllCardTouchable}
                      >
                        <View
                          style={[
                            styles.addressIconCircle,
                            isSelected && styles.addressIconCircleSelected,
                          ]}
                        >
                          <Icon
                            name={isHome ? "home" : "pin"}
                            size={18}
                            color={isSelected ? "#ffffff" : colors.accent}
                          />
                        </View>

                        <View style={{ flex: 1 }}>
                          <View style={styles.addressTitleRow}>
                            <Text style={styles.addressLabel}>{place.label}</Text>
                            {isSelected && (
                              <View style={styles.activeDefaultPill}>
                                <Text style={styles.activeDefaultText}>DEFAULT</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.addressLine}>{place.line}</Text>
                          <Text style={styles.addressArea}>{place.area}</Text>
                          {place.landmark && (
                            <Text style={styles.landmarkText}>
                              Near {place.landmark}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>

                      {/* Card Action Row: Delete & Edit */}
                      <View style={styles.cardActionsRow}>
                        <TouchableOpacity
                          onPress={() => handleDeleteAddress(place)}
                          style={styles.deleteActionBtn}
                        >
                          <Icon name="trash" size={14} color="#ef4444" />
                          <Text style={styles.deleteActionText}>Delete</Text>
                        </TouchableOpacity>

                        {!isSelected && (
                          <TouchableOpacity
                            onPress={() => handleSelectSavedPlace(place)}
                            style={styles.setDefaultActionBtn}
                          >
                            <Text style={styles.setDefaultActionText}>
                              Set as Delivery Location
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ===================== VIEW 3: MANUAL LOCATION SEARCH ===================== */}
          {viewMode === "search" && (
            <View style={styles.subViewContainer}>
              <View style={styles.subViewHeader}>
                <TouchableOpacity
                  onPress={() => setViewMode("sheet")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.backBtn}
                >
                  <Icon name="arrow" size={18} color={colors.ink} />
                </TouchableOpacity>
                <Text style={styles.subViewTitle}>Search Location</Text>
                <View style={{ width: 40 }} />
              </View>

              {/* Search Field */}
              <View style={styles.searchFieldBox}>
                <Icon name="search" size={18} color={colors.accent} />
                <TextInput
                  placeholder="Search area, landmark, or PIN code..."
                  placeholderTextColor="#a8a29e"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                  style={styles.searchTextInput}
                  autoCorrect={false}
                />
                {isGoogleSearching ? (
                  <ActivityIndicator size="small" color={colors.accent} style={{ marginRight: 4 }} />
                ) : searchQuery.length > 0 ? (
                  <TouchableOpacity
                    onPress={() => setSearchQuery("")}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Icon name="close" size={15} color="#78716c" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Suggestions List */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.searchResultsContent}
                keyboardShouldPersistTaps="handled"
              >
                {googleSuggestions.length > 0 ? (
                  googleSuggestions.map((suggestion) => (
                    <TouchableOpacity
                      key={suggestion.placeId}
                      activeOpacity={0.75}
                      onPress={() => handleSelectGooglePlace(suggestion)}
                      style={styles.searchResultRow}
                    >
                      <View style={styles.searchResultPinBox}>
                        <Icon name="pin" size={16} color={colors.accent} />
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={styles.resultTitleRow}>
                          <Text style={styles.resultLabel} numberOfLines={1}>
                            {suggestion.primaryText}
                          </Text>
                        </View>
                        <Text style={styles.resultArea} numberOfLines={1}>
                          {suggestion.secondaryText || suggestion.fullText}
                        </Text>
                      </View>

                      <Icon name="arrow" size={14} color="#a8a29e" />
                    </TouchableOpacity>
                  ))
                ) : searchResults.length > 0 ? (
                  searchResults.map((result) => (
                    <TouchableOpacity
                      key={result.id}
                      activeOpacity={0.75}
                      onPress={() => handleSelectSearchResult(result)}
                      style={styles.searchResultRow}
                    >
                      <View style={styles.searchResultPinBox}>
                        <Icon name="pin" size={16} color={colors.accent} />
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={styles.resultTitleRow}>
                          <Text style={styles.resultLabel} numberOfLines={1}>
                            {result.label}
                          </Text>
                          <Text style={styles.resultDist}>
                            {result.distanceKm.toFixed(1)} km
                          </Text>
                        </View>
                        <Text style={styles.resultArea} numberOfLines={1}>
                          {result.line || result.area} · {result.city}
                        </Text>
                      </View>

                      <Icon name="arrow" size={14} color="#a8a29e" />
                    </TouchableOpacity>
                  ))
                ) : searchQuery.length >= 2 && !isGoogleSearching ? (
                  <View style={styles.noSearchBox}>
                    <Text style={styles.noSearchTitle}>
                      No locations found for "{searchQuery}"
                    </Text>
                    <Text style={styles.noSearchSub}>
                      Try searching for Gomti Nagar, Hazratganj, Indiranagar, Aliganj, or a landmark.
                    </Text>
                  </View>
                ) : null}
              </ScrollView>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(18, 14, 12, 0.58)",
  },
  sheetContainer: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: SCREEN_HEIGHT * 0.88,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: -6 },
    shadowRadius: 16,
    elevation: 20,
  },
  handleBar: {
    width: 44,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: "#d6d3d1",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 6,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 20,
  },
  sheetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sheetHeaderTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.4,
  },
  sheetHeaderSub: {
    fontSize: 11.5,
    color: "#78716c",
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f5f5f4",
    alignItems: "center",
    justifyContent: "center",
  },
  /* Device Location Permission Card */
  deviceLocationCard: {
    backgroundColor: "#fff7f2",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#fed7aa",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  deviceLocationLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  radarIllustrationBox: {
    marginRight: 12,
  },
  radarWaveOuter: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(224, 90, 15, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  radarWaveInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  deviceLocationTextCol: {
    flex: 1,
  },
  deviceLocationHeading: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1c1917",
  },
  deviceLocationDesc: {
    fontSize: 11,
    color: "#78716c",
    marginTop: 2.5,
    lineHeight: 15,
  },
  enableGpsBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    shadowColor: colors.accent,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  enableGpsBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#ffffff",
  },
  /* Saved Addresses Section */
  savedSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  savedSectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1c1917",
    letterSpacing: -0.2,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.accent,
  },
  savedCardsContainer: {
    gap: 10,
    marginBottom: 20,
  },
  savedAddressCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#e7e5e4",
  },
  savedAddressCardSelected: {
    borderColor: colors.accent,
    backgroundColor: "#fffaf7",
  },
  addressIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(224, 90, 15, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  addressIconCircleSelected: {
    backgroundColor: colors.accent,
  },
  addressInfoCol: {
    flex: 1,
    marginRight: 10,
  },
  addressTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  addressLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1c1917",
  },
  gpsVerifiedBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  gpsVerifiedText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#166534",
  },
  addressLine: {
    fontSize: 11.5,
    color: "#44403c",
    marginBottom: 1,
  },
  addressArea: {
    fontSize: 10.5,
    color: "#78716c",
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#d6d3d1",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    borderColor: colors.accent,
  },
  radioInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  emptySavedBox: {
    padding: 16,
    backgroundColor: "#fafaf9",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e7e5e4",
    alignItems: "center",
    marginBottom: 20,
  },
  emptySavedTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#44403c",
    marginBottom: 2,
  },
  emptySavedSub: {
    fontSize: 11,
    color: "#78716c",
    textAlign: "center",
  },
  /* Manual Search Box */
  manualSearchWrap: {
    gap: 10,
  },
  manualSearchButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f4",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "#e7e5e4",
    gap: 10,
  },
  manualSearchPlaceholder: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#78716c",
  },
  dropPinLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
  },
  dropPinLinkText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.accent,
  },
  /* Sub-Views (See All & Search) */
  subViewContainer: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 16,
    minHeight: 380,
  },
  subViewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f5f5f4",
    alignItems: "center",
    justifyContent: "center",
  },
  subViewTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.ink,
  },
  addNewAddressBtn: {
    backgroundColor: "rgba(224, 90, 15, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addNewAddressText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.accent,
  },
  seeAllListContent: {
    gap: 12,
    paddingBottom: 20,
  },
  seeAllCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#e7e5e4",
    padding: 12,
  },
  seeAllCardSelected: {
    borderColor: colors.accent,
    backgroundColor: "#fffaf7",
  },
  seeAllCardTouchable: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  activeDefaultPill: {
    backgroundColor: colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeDefaultText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#ffffff",
  },
  landmarkText: {
    fontSize: 11,
    color: colors.accent,
    marginTop: 2,
    fontWeight: "600",
  },
  cardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f5f5f4",
  },
  deleteActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
  },
  deleteActionText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#ef4444",
  },
  setDefaultActionBtn: {
    paddingVertical: 4,
  },
  setDefaultActionText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: colors.accent,
  },
  /* Search View Styles */
  searchFieldBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f4",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: colors.accent,
    gap: 8,
    marginBottom: 14,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 13,
    color: colors.ink,
    paddingVertical: 0,
  },
  searchResultsContent: {
    gap: 8,
    paddingBottom: 20,
  },
  noSearchBox: {
    padding: 24,
    alignItems: "center",
  },
  noSearchTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 4,
  },
  noSearchSub: {
    fontSize: 11,
    color: "#78716c",
    textAlign: "center",
    lineHeight: 16,
  },
  searchResultRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e7e5e4",
    gap: 10,
  },
  searchResultPinBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(224, 90, 15, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  resultTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  resultLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
    flex: 1,
    marginRight: 6,
  },
  resultDist: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent,
  },
  resultArea: {
    fontSize: 11,
    color: "#78716c",
  },
});

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import Icon from "../../components/Icon";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { useI18n } from "../../lib/i18n";
import { colors, radii } from "../../theme/tokens";
import {
  searchSmartPlaces,
  type AutocompleteResult,
} from "../../lib/autocomplete";
import {
  searchGooglePlaces,
  getGooglePlaceDetails,
  createPlacesSessionToken,
  type GooglePlaceSuggestion,
} from "../../services/placesService";
import {
  getRecentDestinations,
  toggleFavoriteDestination,
  addRecentDestination,
  type RecentDestination,
} from "../../lib/recentPlaces";
import type { Place } from "../../data/demo";

export interface IntermediateStop {
  id: string;
  address: string;
  coords: { lat: number; lng: number };
}

export default function RidePickupDrop() {
  const { back, push } = useNav();
  const { state, setRide, placeById, addPlace } = useApp();
  const { t } = useI18n();

  // Active places from state
  const activePickup = placeById(state.ride.pickupId) ?? state.places[0];
  const activeDrop = placeById(state.ride.dropId);

  // Input states
  const [pickupText, setPickupText] = useState(
    activePickup?.line || activePickup?.area || ""
  );
  const [dropText, setDropText] = useState(
    activeDrop?.line || activeDrop?.area || ""
  );
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(
    activePickup?.coords ?? null
  );
  const [dropCoords, setDropCoords] = useState<{ lat: number; lng: number } | null>(
    activeDrop?.coords ?? null
  );

  // Intermediate stops
  const [stops, setStops] = useState<IntermediateStop[]>([]);
  const [activeFocusedField, setActiveFocusedField] = useState<"pickup" | "drop" | number>("drop");

  // Autocomplete and recents
  const [suggestions, setSuggestions] = useState<AutocompleteResult[]>([]);
  const [googleSuggestions, setGoogleSuggestions] = useState<GooglePlaceSuggestion[]>([]);
  const [recents, setRecents] = useState<RecentDestination[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isResolvingDetails, setIsResolvingDetails] = useState(false);
  const [hasLocationWarning, setHasLocationWarning] = useState(!pickupCoords);
  const sessionTokenRef = useRef(createPlacesSessionToken());
  const searchTimerRef = useRef<any>(null);

  // Passenger selection
  const [passengerType, setPassengerType] = useState<"me" | "other">("me");
  const [passengerSheetVisible, setPassengerSheetVisible] = useState(false);
  const [otherName, setOtherName] = useState("");
  const [otherPhone, setOtherPhone] = useState("");

  const dropInputRef = useRef<TextInput>(null);

  // Load recents on mount
  useEffect(() => {
    getRecentDestinations().then(setRecents);
  }, []);

  // Hardware back press handler
  useEffect(() => {
    const onBackPress = () => {
      back();
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [back]);

  // Attempt auto GPS detection if pickup coords are missing
  useEffect(() => {
    if (!pickupCoords) {
      Location.getForegroundPermissionsAsync().then(({ status }) => {
        if (status === "granted") {
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
            .then((pos) => {
              setPickupCoords({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              });
              setHasLocationWarning(false);
              Location.reverseGeocodeAsync({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              }).then((geo) => {
                if (geo && geo.length > 0) {
                  const placeName = [geo[0].name, geo[0].district, geo[0].city]
                    .filter(Boolean)
                    .join(", ");
                  setPickupText(placeName);
                }
              });
            })
            .catch(() => {
              setHasLocationWarning(true);
            });
        } else {
          setHasLocationWarning(true);
        }
      });
    }
  }, [pickupCoords]);

  // Handle autocomplete query with real Google Places API (New) & debounce
  const handleQueryChange = (text: string) => {
    if (activeFocusedField === "pickup") {
      setPickupText(text);
    } else {
      setDropText(text);
    }

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    const trimmed = text.trim();
    if (trimmed.length >= 2) {
      setIsSearching(true);
      searchTimerRef.current = setTimeout(async () => {
        try {
          const results = await searchGooglePlaces(
            trimmed,
            pickupCoords ?? undefined,
            sessionTokenRef.current
          );
          setGoogleSuggestions(results);
          if (results.length === 0) {
            const fallback = searchSmartPlaces(trimmed, pickupCoords ?? undefined, 250);
            setSuggestions(fallback);
          } else {
            setSuggestions([]);
          }
        } catch {
          const fallback = searchSmartPlaces(trimmed, pickupCoords ?? undefined, 250);
          setSuggestions(fallback);
        } finally {
          setIsSearching(false);
        }
      }, 260);
    } else {
      setGoogleSuggestions([]);
      setSuggestions([]);
      setIsSearching(false);
    }
  };

  const handleSelectGoogleSuggestion = async (item: GooglePlaceSuggestion) => {
    try {
      setIsResolvingDetails(true);
      const details = await getGooglePlaceDetails(
        item.placeId,
        sessionTokenRef.current
      );
      sessionTokenRef.current = createPlacesSessionToken();

      const resolvedCoords = details?.coords ?? {
        lat: (pickupCoords?.lat ?? 26.8467) + 0.015,
        lng: (pickupCoords?.lng ?? 80.9462) + 0.012,
      };

      const resolvedLabel = details?.displayName || item.primaryText;
      const resolvedLine = details?.formattedAddress || item.fullText;

      handleSelectPlace({
        label: resolvedLabel,
        line: resolvedLine,
        coords: resolvedCoords,
      });
    } catch {
      handleSelectPlace({
        label: item.primaryText,
        line: item.fullText,
        coords: {
          lat: (pickupCoords?.lat ?? 26.8467) + 0.015,
          lng: (pickupCoords?.lng ?? 80.9462) + 0.012,
        },
      });
    } finally {
      setIsResolvingDetails(false);
    }
  };

  // Select place from recents or suggestions
  const handleSelectPlace = (place: {
    label: string;
    line: string;
    coords: { lat: number; lng: number };
  }) => {
    if (activeFocusedField === "pickup") {
      setPickupText(place.label);
      setPickupCoords(place.coords);
      setHasLocationWarning(false);
      // Save pickup place to state
      const newPlace = addPlace({
        label: place.label,
        line: place.line,
        area: place.line.split(",")[0] || place.label,
        icon: "pin",
        coords: place.coords,
      });
      setRide({ pickupId: newPlace.id });
      // Switch focus to drop
      setActiveFocusedField("drop");
      dropInputRef.current?.focus();
    } else if (typeof activeFocusedField === "number") {
      // Intermediate stop
      const stopIdx = activeFocusedField;
      const updatedStops = [...stops];
      updatedStops[stopIdx] = {
        id: `stop-${Date.now()}-${stopIdx}`,
        address: place.label,
        coords: place.coords,
      };
      setStops(updatedStops);
      setActiveFocusedField("drop");
    } else {
      // Drop location
      setDropText(place.label);
      setDropCoords(place.coords);

      // Save drop place to state
      const dropPlaceItem = addPlace({
        label: place.label,
        line: place.line,
        area: place.line.split(",")[0] || place.label,
        icon: "pin",
        coords: place.coords,
      });
      setRide({ dropId: dropPlaceItem.id });

      // Save to recent destinations
      addRecentDestination({
        title: place.label,
        address: place.line,
        coords: place.coords,
      }).then(setRecents);

      // Navigate directly to RideConfirm
      push({ name: "rideConfirm" });
    }
  };

  const handleToggleFav = async (id: string) => {
    const updated = await toggleFavoriteDestination(id);
    setRecents(updated);
  };

  const handleAddStop = () => {
    if (stops.length >= 3) return; // Limit to 3 intermediate stops
    const newStop: IntermediateStop = {
      id: `stop-${Date.now()}`,
      address: "",
      coords: { lat: 26.8467, lng: 80.9462 },
    };
    const nextStops = [...stops, newStop];
    setStops(nextStops);
    setActiveFocusedField(nextStops.length - 1);
  };

  const handleRemoveStop = (index: number) => {
    setStops(stops.filter((_, i) => i !== index));
    setActiveFocusedField("drop");
  };

  const handleOpenMap = () => {
    if (activeFocusedField === "pickup") {
      push({ name: "ridePickupPoint" });
    } else {
      push({
        name: "places",
        mode: "rideDrop",
      });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={back}
            accessibilityLabel="Back"
          >
            <Icon name="back" size={22} color="#1e1e24" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            {t("rides_pickup_title", "Pickup")}
          </Text>

          {/* Passenger Selector */}
          <TouchableOpacity
            style={styles.passengerPill}
            onPress={() => setPassengerSheetVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.passengerText}>
              {passengerType === "me"
                ? t("rides_for_me", "For me")
                : otherName || t("rides_for_someone_else", "For someone else")}
            </Text>
            <Icon name="chevron-down" size={14} color="#3c4043" />
          </TouchableOpacity>
        </View>

        {/* Warning Banner if pickup location is missing */}
        {hasLocationWarning && (
          <View style={styles.warningBanner}>
            <View style={styles.warningIcon}>
              <Icon name="info" size={16} color="#1a73e8" />
            </View>
            <Text style={styles.warningText}>
              {t(
                "rides_cant_find_you",
                "Uh oh, we can't find you! Enter your pickup location for a smooth ride."
              )}
            </Text>
          </View>
        )}

        {/* Connected Pickup & Drop Location Card */}
        <View style={styles.cardContainer}>
          <View style={styles.locationCard}>
            {/* Visual Route Indicator Line */}
            <View style={styles.connectorColumn}>
              <View style={styles.greenDot} />
              <View style={styles.dashedLine} />
              {stops.map((_, i) => (
                <React.Fragment key={i}>
                  <View style={styles.stopDot} />
                  <View style={styles.dashedLine} />
                </React.Fragment>
              ))}
              <View style={styles.orangeDot} />
            </View>

            {/* Inputs Column */}
            <View style={styles.inputsColumn}>
              {/* Pickup Input */}
              <View style={styles.inputWrap}>
                <TextInput
                  style={[
                    styles.inputField,
                    activeFocusedField === "pickup" && styles.inputFieldFocused,
                  ]}
                  value={pickupText}
                  onChangeText={handleQueryChange}
                  onFocus={() => {
                    setActiveFocusedField("pickup");
                    if (pickupText.length >= 2) handleQueryChange(pickupText);
                  }}
                  placeholder={t("rides_pickup_location", "Pickup location")}
                  placeholderTextColor="#80868b"
                  returnKeyType="next"
                />
              </View>

              {/* Intermediate Stops Inputs */}
              {stops.map((stop, index) => (
                <View key={stop.id} style={styles.stopInputWrap}>
                  <TextInput
                    style={[
                      styles.inputField,
                      activeFocusedField === index && styles.inputFieldFocused,
                    ]}
                    value={stop.address}
                    placeholder={`${t("rides_intermediate_stop", "Stop")} ${index + 1}`}
                    placeholderTextColor="#80868b"
                    onFocus={() => setActiveFocusedField(index)}
                    onChangeText={(val) => {
                      const updated = [...stops];
                      updated[index].address = val;
                      setStops(updated);
                    }}
                  />
                  <TouchableOpacity
                    style={styles.removeStopBtn}
                    onPress={() => handleRemoveStop(index)}
                  >
                    <Icon name="close" size={14} color="#80868b" />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Drop Input */}
              <View style={styles.inputWrap}>
                <TextInput
                  ref={dropInputRef}
                  style={[
                    styles.inputField,
                    activeFocusedField === "drop" && styles.inputFieldFocused,
                  ]}
                  value={dropText}
                  onChangeText={handleQueryChange}
                  onFocus={() => {
                    setActiveFocusedField("drop");
                    if (dropText.length >= 2) handleQueryChange(dropText);
                  }}
                  placeholder={t("rides_drop_location", "Drop location")}
                  placeholderTextColor="#80868b"
                  autoFocus={true}
                  returnKeyType="search"
                />
              </View>
            </View>
          </View>

          {/* Action Buttons: Select on map & Add stops */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={styles.actionPill}
              activeOpacity={0.7}
              onPress={handleOpenMap}
            >
              <Icon name="pin" size={17} color="#1e1e24" />
              <Text style={styles.actionPillText}>
                {t("rides_select_on_map", "Select on map")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionPill}
              activeOpacity={0.7}
              onPress={handleAddStop}
            >
              <Icon name="plus" size={16} color="#1e1e24" />
              <Text style={styles.actionPillText}>
                {t("rides_add_stops", "Add stops")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Results List: Autocomplete Suggestions or Recents */}
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {isSearching && (
            <ActivityIndicator style={{ marginTop: 20 }} color="#1a73e8" />
          )}

          {/* Suggestions if query entered */}
          {googleSuggestions.length > 0
            ? googleSuggestions.map((item) => (
                <TouchableOpacity
                  key={item.placeId}
                  style={styles.placeRow}
                  activeOpacity={0.7}
                  onPress={() => handleSelectGoogleSuggestion(item)}
                >
                  <View style={styles.rowIconCircle}>
                    <Icon name="pin" size={18} color="#1769E8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.placeTitle} numberOfLines={1}>
                      {item.primaryText}
                    </Text>
                    <Text style={styles.placeAddress} numberOfLines={1}>
                      {item.secondaryText || item.fullText}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            : suggestions.length > 0
            ? suggestions.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.placeRow}
                  activeOpacity={0.7}
                  onPress={() =>
                    handleSelectPlace({
                      label: item.label,
                      line: item.line,
                      coords: item.coords,
                    })
                  }
                >
                  <View style={styles.rowIconCircle}>
                    <Icon name="pin" size={18} color="#5f6368" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.placeTitle} numberOfLines={1}>
                      {item.label}
                    </Text>
                    <Text style={styles.placeAddress} numberOfLines={1}>
                      {item.line}
                    </Text>
                  </View>
                  <Text style={styles.distanceBadge}>
                    {item.distanceKm > 0 ? `${item.distanceKm} km` : ""}
                  </Text>
                </TouchableOpacity>
              ))
            : recents.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.placeRow}
                  activeOpacity={0.7}
                  onPress={() =>
                    handleSelectPlace({
                      label: item.title,
                      line: item.address,
                      coords: item.coords,
                    })
                  }
                >
                  <View style={styles.rowIconCircle}>
                    <Icon name="history" size={18} color="#5f6368" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.placeTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.placeAddress} numberOfLines={1}>
                      {item.address}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.heartBtn}
                    onPress={() => handleToggleFav(item.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Icon
                      name="heart"
                      size={18}
                      color={item.isFavorite ? "#1a73e8" : "#80868b"}
                      filled={item.isFavorite}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Resolving Details Indicator */}
      {isResolvingDetails && (
        <View style={styles.resolvingOverlay}>
          <ActivityIndicator size="small" color="#1769E8" />
          <Text style={styles.resolvingText}>Locating address...</Text>
        </View>
      )}

      {/* Passenger Selection Modal */}
      <Modal
        visible={passengerSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPassengerSheetVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setPassengerSheetVisible(false)}
        >
          <View
            style={styles.modalSheet}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.modalTitle}>
              {t("rides_passenger_details", "Passenger Details")}
            </Text>

            <TouchableOpacity
              style={[
                styles.passengerOption,
                passengerType === "me" && styles.passengerOptionSelected,
              ]}
              onPress={() => {
                setPassengerType("me");
                setPassengerSheetVisible(false);
              }}
            >
              <View style={styles.optionRadio}>
                {passengerType === "me" && <View style={styles.radioInner} />}
              </View>
              <View>
                <Text style={styles.optionTitle}>
                  {t("rides_for_me", "For me")}
                </Text>
                <Text style={styles.optionSub}>
                  {state.profile.name || "Default Account Profile"} · {state.profile.phone}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.passengerOption,
                passengerType === "other" && styles.passengerOptionSelected,
              ]}
              onPress={() => setPassengerType("other")}
            >
              <View style={styles.optionRadio}>
                {passengerType === "other" && <View style={styles.radioInner} />}
              </View>
              <View>
                <Text style={styles.optionTitle}>
                  {t("rides_for_someone_else", "For someone else")}
                </Text>
                <Text style={styles.optionSub}>
                  Book ride for family, friends or colleagues
                </Text>
              </View>
            </TouchableOpacity>

            {passengerType === "other" && (
              <View style={styles.otherInputsWrap}>
                <TextInput
                  style={styles.modalInput}
                  placeholder={t("rides_passenger_name", "Passenger Name")}
                  placeholderTextColor="#80868b"
                  value={otherName}
                  onChangeText={setOtherName}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder={t("rides_passenger_phone", "Mobile Number")}
                  placeholderTextColor="#80868b"
                  keyboardType="phone-pad"
                  value={otherPhone}
                  onChangeText={setOtherPhone}
                />
              </View>
            )}

            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={() => setPassengerSheetVisible(false)}
            >
              <Text style={styles.modalDoneText}>
                {t("confirm", "Confirm")}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e1e24",
    flex: 1,
    marginLeft: 6,
  },
  passengerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#dadce0",
    backgroundColor: "#ffffff",
  },
  passengerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#202124",
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef7f0",
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fce8e6",
    gap: 10,
  },
  warningIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fde7e4",
    alignItems: "center",
    justifyContent: "center",
  },
  warningText: {
    flex: 1,
    fontSize: 12.5,
    color: "#b03820",
    fontWeight: "500",
    lineHeight: 17,
  },
  cardContainer: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e8eaed",
  },
  locationCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e0e3e7",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  connectorColumn: {
    width: 24,
    alignItems: "center",
    paddingVertical: 14,
  },
  greenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#1e8e3e",
  },
  stopDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#f9ab00",
  },
  orangeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ea580c",
  },
  dashedLine: {
    flex: 1,
    width: 1.5,
    backgroundColor: "#dadce0",
    marginVertical: 4,
  },
  inputsColumn: {
    flex: 1,
    marginLeft: 8,
    justifyContent: "space-around",
  },
  inputWrap: {
    paddingVertical: 4,
  },
  stopInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  inputField: {
    fontSize: 15,
    color: "#202124",
    paddingVertical: 8,
    paddingHorizontal: 4,
    fontWeight: "500",
  },
  inputFieldFocused: {
    fontWeight: "600",
  },
  removeStopBtn: {
    padding: 6,
  },
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#dadce0",
    backgroundColor: "#ffffff",
  },
  actionPillText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#202124",
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  placeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f1f3f4",
    gap: 14,
  },
  rowIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f8f9fa",
    alignItems: "center",
    justifyContent: "center",
  },
  placeTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#202124",
    marginBottom: 2,
  },
  placeAddress: {
    fontSize: 12.5,
    color: "#5f6368",
  },
  distanceBadge: {
    fontSize: 12,
    fontWeight: "500",
    color: "#80868b",
  },
  heartBtn: {
    padding: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e1e24",
    marginBottom: 16,
  },
  passengerOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f1f3f4",
    gap: 12,
  },
  passengerOptionSelected: {
    backgroundColor: "rgba(26, 115, 232, 0.06)",
  },
  optionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#1a73e8",
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#1a73e8",
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#202124",
  },
  optionSub: {
    fontSize: 12,
    color: "#5f6368",
    marginTop: 2,
  },
  otherInputsWrap: {
    marginTop: 12,
    gap: 10,
  },
  modalInput: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#dadce0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#202124",
  },
  modalDoneBtn: {
    backgroundColor: "#1a73e8",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  modalDoneText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  resolvingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99,
  },
  resolvingText: {
    color: "#202124",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
  },
});

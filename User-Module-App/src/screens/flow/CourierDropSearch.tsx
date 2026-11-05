import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "../../components/Icon";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import {
  getCourierDestinations,
  toggleFavoriteCourierDestination,
  addCourierDestination,
  destinationToPlace,
  type RecentDestination,
} from "../../lib/recentPlaces";
import { searchSmartPlaces, type AutocompleteResult } from "../../lib/autocomplete";
import { DEFAULT_CENTER } from "../../lib/googleMaps";
import {
  searchGooglePlaces,
  getGooglePlaceDetails,
  createPlacesSessionToken,
  type GooglePlaceSuggestion,
} from "../../services/placesService";

export default function CourierDropSearch() {
  const insets = useSafeAreaInsets();
  const { back, push } = useNav();
  const { state, setCourier, addPlace, showToast } = useApp();

  const [query, setQuery] = useState("");
  const [destinations, setDestinations] = useState<RecentDestination[]>([]);
  const [googleSuggestions, setGoogleSuggestions] = useState<GooglePlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isResolvingDetails, setIsResolvingDetails] = useState(false);
  const sessionTokenRef = useRef(createPlacesSessionToken());
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    let isMounted = true;
    getCourierDestinations().then((data) => {
      if (isMounted) setDestinations(data);
    });
    // Auto-focus search input
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  const handleToggleFavorite = async (id: string, e: any) => {
    e.stopPropagation();
    const updated = await toggleFavoriteCourierDestination(id);
    setDestinations(updated);
  };

  const currentPickupCoords = useMemo(() => {
    if (state.courier.pickupCoords) return state.courier.pickupCoords;
    const pickup = state.places.find((p) => p.id === state.courier.pickupId);
    return pickup?.coords || DEFAULT_CENTER;
  }, [state.places, state.courier.pickupId, state.courier.pickupCoords]);

  // Debounced Google Places (New) autocomplete query
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setGoogleSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchGooglePlaces(
          trimmed,
          currentPickupCoords,
          sessionTokenRef.current
        );
        setGoogleSuggestions(results);
      } catch (e) {
        console.warn("[CourierDropSearch] Places autocomplete notice:", e);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => {
      clearTimeout(timer);
    };
  }, [query, currentPickupCoords]);

  // Fallback smart autocomplete search suggestions
  const fallbackSuggestions = useMemo(() => {
    if (!query.trim()) return [];
    return searchSmartPlaces(query, currentPickupCoords, 250);
  }, [query, currentPickupCoords]);

  const handleSelectRecent = (dest: RecentDestination) => {
    Keyboard.dismiss();
    const place = destinationToPlace(dest);
    const existing = state.places.find(
      (p) =>
        p.label.toLowerCase() === place.label.toLowerCase() ||
        (p.coords &&
          Math.abs(p.coords.lat - place.coords!.lat) < 0.0005 &&
          Math.abs(p.coords.lng - place.coords!.lng) < 0.0005)
    );
    const chosen = existing || addPlace(place);
    setCourier({
      dropId: chosen.id,
      dropAddress: dest.address,
      dropCoords: dest.coords,
      receiverName: dest.contactName || "Omm Prakash",
      receiverPhone: dest.contactPhone || "9876543210",
    });
    push({ name: "courierRouteSelect" });
  };

  const handleSelectGoogleSuggestion = async (item: GooglePlaceSuggestion) => {
    try {
      Keyboard.dismiss();
      setIsResolvingDetails(true);

      const details = await getGooglePlaceDetails(
        item.placeId,
        sessionTokenRef.current
      );

      // Reset session token for next search session
      sessionTokenRef.current = createPlacesSessionToken();

      if (details) {
        const saved = addPlace({
          label: details.displayName || item.primaryText,
          line: details.formattedAddress || item.fullText,
          area: details.formattedAddress.split(",")[1]?.trim() || "Lucknow",
          icon: "pin",
          coords: details.coords,
        });

        addCourierDestination({
          title: details.displayName || item.primaryText,
          address: details.formattedAddress || item.fullText,
          coords: details.coords,
          contactName: state.profile.name || "Receiver",
          contactPhone: state.profile.phone || "9876543210",
          iconType: "history",
        });

        setCourier({
          dropId: saved.id,
          dropAddress: details.formattedAddress,
          dropCoords: details.coords,
          receiverName: state.profile.name || "Receiver",
          receiverPhone: state.profile.phone || "9876543210",
        });

        push({ name: "courierRouteSelect" });
      } else {
        const fallbackCoords = {
          lat: currentPickupCoords.lat + 0.015,
          lng: currentPickupCoords.lng + 0.012,
        };
        const saved = addPlace({
          label: item.primaryText,
          line: item.fullText,
          area: item.secondaryText || "Lucknow",
          icon: "pin",
          coords: fallbackCoords,
        });
        addCourierDestination({
          title: item.primaryText,
          address: item.fullText,
          coords: fallbackCoords,
          contactName: state.profile.name || "Receiver",
          contactPhone: state.profile.phone || "9876543210",
          iconType: "history",
        });
        setCourier({
          dropId: saved.id,
          dropAddress: item.fullText,
          dropCoords: fallbackCoords,
          receiverName: state.profile.name || "Receiver",
          receiverPhone: state.profile.phone || "9876543210",
        });
        push({ name: "courierRouteSelect" });
      }
    } catch (e: any) {
      showToast("Error retrieving place details. Please try again.");
    } finally {
      setIsResolvingDetails(false);
    }
  };

  const handleSelectSuggestion = (item: AutocompleteResult) => {
    Keyboard.dismiss();
    const saved = addPlace({
      label: item.label,
      line: item.line,
      area: item.area,
      icon: "pin",
      coords: item.coords,
    });
    addCourierDestination({
      title: item.label,
      address: item.line,
      coords: item.coords,
      contactName: state.profile.name || "Receiver",
      contactPhone: state.profile.phone || "9876543210",
      iconType: "history",
    });
    setCourier({
      dropId: saved.id,
      dropAddress: item.line,
      dropCoords: item.coords,
      receiverName: state.profile.name || "Receiver",
      receiverPhone: state.profile.phone || "9876543210",
    });
    push({ name: "courierRouteSelect" });
  };

  const handleSelectOnMap = () => {
    Keyboard.dismiss();
    push({ name: "places", mode: "courierDrop" });
  };

  const renderIcon = (type?: string, isFav?: boolean) => {
    if (type === "home") {
      return <Icon name="home" size={20} color="#68758A" />;
    }
    if (type === "building") {
      return <Icon name="building" size={20} color="#68758A" />;
    }
    return <Icon name="history" size={20} color="#68758A" />;
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={back}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="arrow" size={22} color="#151B2B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Drop to</Text>
      </View>

      {/* Search Input Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchRow}>
          {/* Red Destination Dot */}
          <View style={styles.redDotOuter}>
            <View style={styles.redDotInner} />
          </View>

          <View style={styles.inputBox}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Search drop address"
              placeholderTextColor="#94A3B8"
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              autoCorrect={false}
            />
            {isSearching ? (
              <ActivityIndicator size="small" color="#1769E8" style={{ marginRight: 8 }} />
            ) : query.length > 0 ? (
              <TouchableOpacity
                onPress={() => setQuery("")}
                style={styles.clearBtn}
                accessibilityRole="button"
                accessibilityLabel="Clear search input"
              >
                <Icon name="close" size={14} color="#68758A" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Quick Action: Select on Map */}
        <TouchableOpacity
          style={styles.selectOnMapBtn}
          onPress={handleSelectOnMap}
          activeOpacity={0.8}
        >
          <Icon name="pin" size={16} color="#151B2B" />
          <Text style={styles.selectOnMapText}>Select on map</Text>
        </TouchableOpacity>
      </View>

      {/* Suggestions or Recent Saved List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {query.trim().length > 0 ? (
          // Google Places Autocomplete results
          googleSuggestions.length > 0 ? (
            googleSuggestions.map((item) => (
              <TouchableOpacity
                key={item.placeId}
                style={styles.destItem}
                onPress={() => handleSelectGoogleSuggestion(item)}
                activeOpacity={0.7}
              >
                <View style={styles.itemIconCol}>
                  <Icon name="pin" size={18} color="#1769E8" />
                </View>
                <View style={styles.itemDetailsCol}>
                  <Text style={styles.destTitle} numberOfLines={1}>
                    {item.primaryText}
                  </Text>
                  <Text style={styles.destAddress} numberOfLines={1}>
                    {item.secondaryText || item.fullText}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : fallbackSuggestions.length > 0 ? (
            fallbackSuggestions.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.destItem}
                onPress={() => handleSelectSuggestion(item)}
                activeOpacity={0.7}
              >
                <View style={styles.itemIconCol}>
                  <Icon name="pin" size={18} color="#E87518" />
                </View>
                <View style={styles.itemDetailsCol}>
                  <Text style={styles.destTitle} numberOfLines={1}>
                    {item.label}
                  </Text>
                  <Text style={styles.destAddress} numberOfLines={1}>
                    {item.line}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={{ padding: 24, alignItems: "center" }}>
              <Text style={{ color: "#64748B", fontSize: 13 }}>
                {isSearching ? "Searching Google Places..." : "No matching addresses found"}
              </Text>
            </View>
          )
        ) : (
          // Recent / Saved Destinations matching Screenshot 2
          destinations.map((dest) => (
            <TouchableOpacity
              key={dest.id}
              style={styles.destItem}
              onPress={() => handleSelectRecent(dest)}
              activeOpacity={0.7}
            >
              <View style={styles.itemIconCol}>
                {renderIcon(dest.iconType, dest.isFavorite)}
              </View>

              <View style={styles.itemDetailsCol}>
                <Text style={styles.destTitle} numberOfLines={1}>
                  {dest.title}
                </Text>
                <Text style={styles.destAddress} numberOfLines={1}>
                  {dest.address}
                </Text>

                {dest.contactName && (
                  <View style={styles.contactRow}>
                    <Icon name="phone" size={12} color="#68758A" />
                    <Text style={styles.contactText}>
                      {dest.contactName}
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.heartBtn}
                onPress={(e) => handleToggleFavorite(dest.id, e)}
                accessibilityRole="button"
                accessibilityLabel={
                  dest.isFavorite
                    ? `Remove ${dest.title} from favorites`
                    : `Add ${dest.title} to favorites`
                }
              >
                <Icon
                  name="heart"
                  size={19}
                  color={dest.isFavorite ? "#E87518" : "#94A3B8"}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Resolving Coordinates Overlay */}
      {isResolvingDetails && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#1769E8" />
          <Text style={styles.loadingOverlayText}>Locating address coordinates...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "180deg" }],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#151B2B",
    letterSpacing: -0.4,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  redDotOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  redDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  inputBox: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#1E293B",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#151B2B",
  },
  clearBtn: {
    padding: 6,
  },
  selectOnMapBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  selectOnMapText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#151B2B",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 30,
  },
  destItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 14,
  },
  itemIconCol: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  itemDetailsCol: {
    flex: 1,
  },
  destTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#151B2B",
    letterSpacing: -0.2,
  },
  destAddress: {
    fontSize: 12.5,
    color: "#68758A",
    marginTop: 2,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  contactText: {
    fontSize: 12,
    color: "#68758A",
    fontWeight: "600",
  },
  heartBtn: {
    padding: 8,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99,
  },
  loadingOverlayText: {
    color: "#151B2B",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 10,
  },
});

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import FlowHeader from "../../components/FlowHeader";
import GoogleMap from "../../components/GoogleMap";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import { type Service, type Place } from "../../data/demo";
import { fetchStoreById } from "../../lib/supabaseData";
import { PRESET_COORDS, DEFAULT_CENTER, type LatLng } from "../../lib/googleMaps";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { colors } from "../../theme/tokens";
import { getServiceTheme } from "../../theme/themes";
import { useRouteCalculation } from "../../hooks/useRouteCalculation";

interface DeliveryDetailsProps {
  service: Service;
}

export default function DeliveryDetails({ service }: DeliveryDetailsProps) {
  const { push } = useNav();
  const theme = getServiceTheme(service);
  const { state, setDefaultPlace, addPlace, showToast } = useApp();

  const [selectedPlaceId, setSelectedPlaceId] = useState<string>(
    state.defaultPlaceId || (state.places[0]?.id ?? "")
  );

  const currentCart =
    service === "food" || service === "grocery" ? state.carts[service] : null;

  const [activeStore, setActiveStore] = useState<{
    name: string;
    coords: { lat: number; lng: number };
    etaShort?: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    if ((service === "food" || service === "grocery") && currentCart?.storeId) {
      fetchStoreById(currentCart.storeId).then((res) => {
        if (!isMounted) return;
        if (res.data) {
          setActiveStore({
            name: res.data.name,
            coords: res.data.coords,
            etaShort: res.data.etaShort,
          });
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [service, currentCart?.storeId]);

  const activePlace =
    state.places.find((p) => p.id === selectedPlaceId) ??
    state.places[0];

  const originCoords: LatLng = activeStore
    ? { ...activeStore.coords, label: activeStore.name }
    : PRESET_COORDS.restaurant;
  const destCoords: LatLng = activePlace?.coords
    ? { ...activePlace.coords, label: activePlace.label }
    : DEFAULT_CENTER;

  // Real route calculation via Google Routes API
  const { route } = useRouteCalculation(originCoords, destCoords);
  const polylineCoords = route?.coordinates || [];
  const distanceKm = route?.distanceKm;
  const durationMins = route?.durationMinutes;

  const handleSelectPlace = (id: string) => {
    setSelectedPlaceId(id);
    setDefaultPlace(id);
  };

  const handleDeliverHere = () => {
    const chosenPlace = state.places.find((p) => p.id === selectedPlaceId) ?? state.places[0];
    if (!chosenPlace || !chosenPlace.coords?.lat || !chosenPlace.coords?.lng) {
      showToast("Please select a delivery address with valid coordinates.");
      push({ name: "places", mode: "delivery" });
      return;
    }

    setDefaultPlace(chosenPlace.id);
    push({ name: "payment", service });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <FlowHeader title="Delivery details" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Real Google Map Preview with Road Route */}
        <View style={styles.mapMini}>
          <GoogleMap
            origin={originCoords}
            destination={destCoords}
            routeCoordinates={polylineCoords.length > 0 ? polylineCoords : undefined}
            showRoute
            theme="default"
            interactive={false}
          />
          <View style={styles.etaOverlayBadge}>
            <Icon name="clock" size={13} color="#FFFFFF" />
            <Text style={styles.etaOverlayText}>
              {durationMins ? `${durationMins} mins` : activeStore?.etaShort || "20-25 mins"}
              {distanceKm ? ` · ${distanceKm.toFixed(1)} km` : ""}
            </Text>
          </View>
        </View>

        {/* Section Heading matching Figma */}
        <View style={styles.sectionHeading}>
          <Text style={styles.headingTitle}>Choose an address</Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              onPress={() => push({ name: "places", mode: "delivery" })}
            >
              <Text style={styles.addNewBtn}>🔍 Search address</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => push({ name: "addAddress", mode: "delivery" })}
            >
              <Text style={styles.addNewBtn}>+ Add new</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Address Selection Cards matching Figma */}
        <View style={styles.cardsContainer}>
          {state.places.length === 0 && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => push({ name: "places", mode: "delivery" })}
              style={styles.emptyAddressCard}
            >
              <Icon name="search" size={20} color="#c84b31" />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>No saved addresses</Text>
                <Text style={styles.cardSubtitle}>
                  Tap to search and select your delivery address
                </Text>
              </View>
              <Icon name="arrow" size={16} color="#c84b31" />
            </TouchableOpacity>
          )}

          {/* Saved Addresses List */}
          {state.places.map((place) => {
            const isSelected = selectedPlaceId === place.id;
            return (
              <TouchableOpacity
                key={place.id}
                activeOpacity={0.8}
                onPress={() => handleSelectPlace(place.id)}
                style={[
                  styles.addressCard,
                  isSelected && styles.addressCardSelected,
                ]}
              >
                <View style={styles.cardIconBox}>
                  <Icon name={place.icon} size={18} color="#c84b31" />
                </View>
                <View style={styles.cardDetails}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={styles.cardTitle}>{place.label}</Text>
                    {place.coords && (
                      <Text style={{ fontSize: 9.5, color: "#288153", fontWeight: "700" }}>
                        📍 Exact Pin ({place.coords.lat.toFixed(3)}, {place.coords.lng.toFixed(3)})
                      </Text>
                    )}
                  </View>
                  <Text style={styles.cardSubtitle} numberOfLines={1}>
                    {place.line} · {place.area}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radioDot,
                    isSelected && styles.radioDotSelected,
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Deliver Here CTA */}
      <SafeAreaView style={styles.bottomBar} edges={["bottom"]}>
        <Button accentColor={theme.primary} onPress={handleDeliverHere}>Deliver here</Button>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#faf9f7",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 95,
  },
  mapMini: {
    height: 180,
    width: "100%",
    position: "relative",
    overflow: "hidden",
  },
  etaOverlayBadge: {
    position: "absolute",
    bottom: 12,
    right: 14,
    backgroundColor: "rgba(23, 21, 20, 0.85)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  etaOverlayText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  sectionHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    marginTop: 18,
    marginBottom: 12,
  },
  headingTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#171514",
  },
  addNewBtn: {
    fontSize: 11,
    fontWeight: "700",
    color: "#c84b31",
  },
  cardsContainer: {
    paddingHorizontal: 18,
  },
  addressCard: {
    borderWidth: 1,
    borderColor: "#ebe7e2",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    marginBottom: 9,
    padding: 13,
  },
  addressCardSelected: {
    borderColor: "#c84b31",
    backgroundColor: "#fdf8f6",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  cardIconBox: {
    backgroundColor: "#f8e7e2",
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardDetails: {
    flex: 1,
  },
  titleTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#171514",
  },
  badge: {
    backgroundColor: "#c84b31",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#ffffff",
  },
  cardSubtitle: {
    fontSize: 9,
    color: "#77716e",
    marginTop: 2,
  },
  radioDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#bbb3ad",
  },
  radioDotSelected: {
    borderWidth: 4,
    borderColor: "#c84b31",
  },
  futureSaveRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(200, 75, 49, 0.15)",
  },
  futureSaveTextCol: {
    flex: 1,
  },
  futureSaveTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#171514",
  },
  futureSaveSub: {
    fontSize: 8,
    color: "#77716e",
  },
  emptyAddressCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#c84b31",
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
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
    borderTopColor: "#ebe7e2",
  },
});

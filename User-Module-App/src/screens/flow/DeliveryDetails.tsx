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
import MapArt from "../../components/MapArt";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import { RESTAURANTS, GROCERY_HUB, type Service, type Place } from "../../data/demo";
import { PRESET_COORDS, DEFAULT_CENTER, type LatLng } from "../../lib/googleMaps";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { colors } from "../../theme/tokens";

interface DeliveryDetailsProps {
  service: Service;
}

export default function DeliveryDetails({ service }: DeliveryDetailsProps) {
  const { push } = useNav();
  const { state, setDefaultPlace, addPlace, showToast } = useApp();

  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsPlace, setGpsPlace] = useState<Place | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>(
    service === "food" ? "current-gps" : state.defaultPlaceId
  );
  const [saveForFutureOrders, setSaveForFutureOrders] = useState(true);

  // Fetch current GPS location on mount
  useEffect(() => {
    let isMounted = true;
    const fetchGps = async () => {
      setDetectingGps(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (isMounted) setDetectingGps(false);
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

        if (isMounted) {
          const detected: Place = {
            id: "current-gps",
            label,
            line,
            area,
            icon: "pin",
            coords: { lat: latitude, lng: longitude },
          };
          setGpsPlace(detected);
          setDetectingGps(false);
        }
      } catch (err) {
        if (isMounted) setDetectingGps(false);
      }
    };

    fetchGps();

    return () => {
      isMounted = false;
    };
  }, []);

  const currentCart =
    service === "food" || service === "grocery" ? state.carts[service] : null;
  const store =
    service === "food"
      ? RESTAURANTS.find((r) => r.id === currentCart?.storeId) || RESTAURANTS[0]
      : service === "grocery"
      ? GROCERY_HUB
      : null;

  const activePlace =
    selectedPlaceId === "current-gps" && gpsPlace
      ? gpsPlace
      : state.places.find((p) => p.id === selectedPlaceId) ??
        state.places[0];

  const originCoords: LatLng = store
    ? { ...store.coords, label: store.name }
    : PRESET_COORDS.restaurant;
  const destCoords: LatLng = activePlace?.coords
    ? { ...activePlace.coords, label: activePlace.label }
    : DEFAULT_CENTER;

  const handleSelectPlace = (id: string) => {
    setSelectedPlaceId(id);
    if (id !== "current-gps") {
      setDefaultPlace(id);
    }
  };

  const handleDeliverHere = () => {
    if (selectedPlaceId === "current-gps" && gpsPlace) {
      if (saveForFutureOrders) {
        const saved = addPlace({
          label:
            gpsPlace.label === "Current Location (GPS)"
              ? "Current Location"
              : gpsPlace.label,
          line: gpsPlace.line,
          area: gpsPlace.area,
          icon: "pin",
          coords: gpsPlace.coords,
        });
        setDefaultPlace(saved.id);
        showToast("📍 Address saved for future orders");
      } else {
        const temp = addPlace({
          label: gpsPlace.label,
          line: gpsPlace.line,
          area: gpsPlace.area,
          icon: "pin",
          coords: gpsPlace.coords,
        });
        setDefaultPlace(temp.id);
        showToast("📍 Current location confirmed");
      }
      push({ name: "payment", service });
      return;
    }

    if (!state.defaultPlaceId && state.places.length === 0) {
      showToast("Please add a delivery address.");
      push({ name: "addAddress", mode: "delivery" });
      return;
    }

    push({ name: "payment", service });
  };

  const isCurrentGpsSelected = selectedPlaceId === "current-gps";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <FlowHeader title="Delivery details" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Map Mini Banner matching Figma */}
        <View style={styles.mapMini}>
          <MapArt
            origin={originCoords}
            destination={destCoords}
            etaText={
              service === "food" && store && "etaShort" in store
                ? (store as any).etaShort
                : "20 min"
            }
          />
        </View>

        {/* Section Heading matching Figma */}
        <View style={styles.sectionHeading}>
          <Text style={styles.headingTitle}>Choose an address</Text>
          <TouchableOpacity
            onPress={() => push({ name: "addAddress", mode: "delivery" })}
          >
            <Text style={styles.addNewBtn}>+ Add new</Text>
          </TouchableOpacity>
        </View>

        {/* Address Selection Cards matching Figma */}
        <View style={styles.cardsContainer}>
          {/* Option: User's Current Location (GPS) */}
          <View
            style={[
              styles.addressCard,
              isCurrentGpsSelected && styles.addressCardSelected,
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSelectPlace("current-gps")}
              style={styles.cardRow}
            >
              <View style={styles.cardIconBox}>
                {detectingGps ? (
                  <ActivityIndicator size="small" color="#c84b31" />
                ) : (
                  <Icon name="pin" size={18} color="#c84b31" />
                )}
              </View>

              <View style={styles.cardDetails}>
                <View style={styles.titleTagRow}>
                  <Text style={styles.cardTitle}>
                    {gpsPlace ? gpsPlace.label : "Current Location (GPS)"}
                  </Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>GPS</Text>
                  </View>
                </View>
                <Text style={styles.cardSubtitle} numberOfLines={1}>
                  {gpsPlace
                    ? gpsPlace.line || gpsPlace.area
                    : detectingGps
                    ? "Detecting live GPS location..."
                    : "Tap to use device coordinates"}
                </Text>
              </View>

              <View
                style={[
                  styles.radioDot,
                  isCurrentGpsSelected && styles.radioDotSelected,
                ]}
              />
            </TouchableOpacity>

            {isCurrentGpsSelected && (
              <View style={styles.futureSaveRow}>
                <View style={styles.futureSaveTextCol}>
                  <Text style={styles.futureSaveTitle}>Save for future orders</Text>
                  <Text style={styles.futureSaveSub}>Save to profile</Text>
                </View>
                <Switch
                  value={saveForFutureOrders}
                  onValueChange={setSaveForFutureOrders}
                  trackColor={{ false: "#d1d5db", true: "#c84b31" }}
                  thumbColor="#ffffff"
                />
              </View>
            )}
          </View>

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
                  <Text style={styles.cardTitle}>{place.label}</Text>
                  <Text style={styles.cardSubtitle} numberOfLines={1}>
                    {place.line}
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
        <Button onPress={handleDeliverHere}>Deliver here</Button>
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
    height: 160,
    width: "100%",
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

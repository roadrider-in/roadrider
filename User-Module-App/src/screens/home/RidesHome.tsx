import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  ActivityIndicator,
  Easing,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import UnifiedServiceHeader from "../../components/UnifiedServiceHeader";
import Header from "../../components/Header";
import ServiceTabs from "../../components/ServiceTabs";
import Icon from "../../components/Icon";
import LocationAccuracyModal from "../../components/LocationAccuracyModal";
import { HEADER_TOKENS } from "../../theme/headerTokens";
import { RIDE_OPTIONS, type Service } from "../../data/demo";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { useI18n } from "../../lib/i18n";
import { useServiceTheme } from "../../theme/themes";
import {
  getRecentDestinations,
  toggleFavoriteDestination,
  destinationToPlace,
  type RecentDestination,
} from "../../lib/recentPlaces";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function RidesHome() {
  const insets = useSafeAreaInsets();
  const { push } = useNav();
  const theme = useServiceTheme("rides");
  const {
    state,
    setService,
    setRide,
    placeById,
    addPlace,
    openLocationSheet,
    showToast,
  } = useApp();
  const { t } = useI18n();

  // Location accuracy permission modal state
  const [showAccuracyModal, setShowAccuracyModal] = useState(false);
  const [recentDestinations, setRecentDestinations] = useState<RecentDestination[]>([]);

  // Pulse animation for location radar
  const radarPulse = useRef(new Animated.Value(1)).current;
  const radarWave = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(radarPulse, {
          toValue: 1.25,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(radarPulse, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    );
    const wave = Animated.loop(
      Animated.timing(radarWave, {
        toValue: 1,
        duration: 2200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );
    pulse.start();
    wave.start();
    return () => {
      pulse.stop();
      wave.stop();
    };
  }, [radarPulse, radarWave]);

  const waveScale = radarWave.interpolate({
    inputRange: [0, 1],
    outputRange: [0.75, 1.4],
  });
  const waveOpacity = radarWave.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.55, 0.25, 0],
  });

  // Load recent destinations on mount
  useEffect(() => {
    getRecentDestinations().then(setRecentDestinations);
  }, []);

  // Location Check on Entry
  useEffect(() => {
    async function checkLocationStatus() {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== "granted") {
          setShowAccuracyModal(true);
        } else {
          const currentPickup = placeById(state.ride.pickupId);
          if (!currentPickup || !currentPickup.coords?.lat) {
            const pos = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            const geo = await Location.reverseGeocodeAsync({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            });
            const label = geo[0]?.name || geo[0]?.district || "Current Location";
            const area = geo[0]?.city || "Lucknow";
            const newPlace = addPlace({
              label,
              line: [geo[0]?.name, geo[0]?.street, geo[0]?.district, geo[0]?.city]
                .filter(Boolean)
                .join(", "),
              area,
              icon: "pin",
              coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
            });
            setRide({ pickupId: newPlace.id });
          }
        }
      } catch (e) {
        console.warn("[RidesHome] Location check notice:", e);
      }
    }
    checkLocationStatus();
  }, []);

  const handleLocationGranted = async (coords: { lat: number; lng: number }) => {
    setShowAccuracyModal(false);
    try {
      const geo = await Location.reverseGeocodeAsync({
        latitude: coords.lat,
        longitude: coords.lng,
      });
      const label = geo[0]?.name || geo[0]?.district || "Current Location";
      const area = geo[0]?.city || "Lucknow";
      const newPlace = addPlace({
        label,
        line: [geo[0]?.name, geo[0]?.street, geo[0]?.district, geo[0]?.city]
          .filter(Boolean)
          .join(", "),
        area,
        icon: "pin",
        coords,
      });
      setRide({ pickupId: newPlace.id });
      showToast(`Location updated: ${label}`);
    } catch {
      const newPlace = addPlace({
        label: "Current Location",
        line: "Device GPS Location, Lucknow",
        area: "Lucknow",
        icon: "pin",
        coords,
      });
      setRide({ pickupId: newPlace.id });
    }
  };

  const handleLocationDeclined = () => {
    setShowAccuracyModal(false);
    showToast(t("rides_manual_location_notice" as any, "Using saved delivery location"));
  };

  const pickupPlace = placeById(state.ride.pickupId) ?? state.places[0] ?? {
    label: "Hazratganj",
    area: "Hazratganj, Lucknow",
    line: "15, Shahnajaf Road, Hazratganj",
    coords: { lat: 26.8467, lng: 80.9462 },
  };

  const activeRideOrder = state.orders.find(
    (o) => o.service === "rides" && o.status >= 0 && o.status < 4
  );

  // Quick categories matching Screenshot 2: Shared Auto, Bike, Auto, Cab Economy
  const quickCategories = [
    { id: "shared", name: t("rides_shared_auto", "Shared Auto"), icon: "truck" },
    { id: "bike", name: t("rides_bike", "Bike"), icon: "bike" },
    { id: "auto", name: t("rides_auto", "Auto"), icon: "auto" },
    { id: "cab", name: t("rides_cab_economy", "Cab Economy"), icon: "car" },
  ];

  const transitHubs = [
    {
      id: "hub-airport",
      title: "Chaudhary Charan Singh International…",
      sub: "Amausi Airport, Lucknow",
      coords: { lat: 26.7606, lng: 80.8893 },
    },
    {
      id: "hub-charbagh",
      title: "Lucknow Junction",
      sub: "Charbagh Railway Station",
      coords: { lat: 26.8315, lng: 80.9238 },
    },
  ];

  const handleSelectRecentPlace = (dest: RecentDestination) => {
    const place = addPlace(destinationToPlace(dest));
    setRide({ dropId: place.id });
    push({ name: "rideConfirm" });
  };

  const handleToggleFav = async (id: string) => {
    const updated = await toggleFavoriteDestination(id);
    setRecentDestinations(updated);
  };

  const handleSelectCategory = (catId: string) => {
    const mappedOption = catId === "shared" ? "auto" : catId;
    setRide({ optionId: mappedOption });
    push({ name: "ridePickupDrop" });
  };

  return (
    <View style={styles.container}>
      <LocationAccuracyModal
        visible={showAccuracyModal}
        onGranted={handleLocationGranted}
        onDeclined={handleLocationDeclined}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= UNIFIED SERVICE NAVIGATION HEADER ================= */}
        <UnifiedServiceHeader service="rides" onSelectService={setService} />

        {/* Active Ride Banner if trip in progress */}
        {activeRideOrder && (
          <TouchableOpacity
            style={styles.activeRideBanner}
            activeOpacity={0.85}
            onPress={() => {
              if (activeRideOrder.status === 0) {
                push({ name: "waitingForRider", orderId: activeRideOrder.id });
              } else {
                push({ name: "rideTracking", orderId: activeRideOrder.id });
              }
            }}
          >
            <View style={styles.activeRidePulse}>
              <Animated.View
                style={[
                  styles.activeRideRadar,
                  { transform: [{ scale: radarPulse }] },
                ]}
              />
              <View style={styles.activeRideDot} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.activeRideTitle}>
                {activeRideOrder.status === 0
                  ? t("rides_finding_driver", "Looking for nearby drivers…")
                  : activeRideOrder.status === 1
                  ? t("rides_driver_assigned", "Driver accepted · On the way")
                  : activeRideOrder.status === 2
                  ? t("rides_driver_arrived", "Driver arrived at pickup")
                  : t("rides_trip_started", "Trip in progress")}
              </Text>
              <Text style={styles.activeRideSub}>
                Tap to return to live ride tracking
              </Text>
            </View>
            <Icon name="arrow" size={16} color="#ffffff" />
          </TouchableOpacity>
        )}

        {/* ================= MAP CARD (Screenshot 2) ================= */}
        <View style={styles.mapCard}>
          {/* Stylized River & Roads SVG-like view */}
          <View style={styles.mapCanvas}>
            <View style={styles.mapRoad1} />
            <View style={styles.mapRoad2} />
            <View style={styles.mapRiver} />

            {/* Radar Concentric Circles */}
            <Animated.View
              style={[
                styles.radarOuterRing,
                {
                  transform: [
                    { translateX: -40 },
                    { translateY: -40 },
                    { scale: waveScale },
                  ],
                  opacity: waveOpacity,
                },
              ]}
            />
            <View style={styles.radarMiddleRing} />
            <Animated.View
              style={[
                styles.radarCenterPin,
                { transform: [{ scale: radarPulse }] },
              ]}
            >
              <View style={styles.radarCenterCore} />
            </Animated.View>
          </View>

          {/* Top Right Gear / Settings Button */}
          <TouchableOpacity
            style={styles.mapGearBtn}
            activeOpacity={0.8}
            onPress={openLocationSheet}
          >
            <Icon name="settings" size={18} color="#475569" />
          </TouchableOpacity>

          {/* Floating Location Pill at bottom of map (Opens Screen 2: Pickup Point Selection) */}
          <TouchableOpacity
            style={styles.mapLocationPill}
            activeOpacity={0.85}
            onPress={() => push({ name: "ridePickupPoint" })}
          >
            <View style={styles.mapBlueDot} />
            <Text style={styles.mapLocationText} numberOfLines={1}>
              {pickupPlace?.label
                ? `Pickup location: ${pickupPlace.label}`
                : "Pickup location: Gomti Nagar"}
            </Text>
            <Icon name="chevron-right" size={13} color="#1769E8" />
          </TouchableOpacity>
        </View>

        {/* ================= "WHERE DO YOU WANT TO GO?" SEARCH BAR (Screenshot 2) ================= */}
        <View style={styles.searchBarSection}>
          <TouchableOpacity
            style={styles.ridesSearchBar}
            activeOpacity={0.85}
            onPress={() => push({ name: "ridePickupDrop" })}
          >
            <Icon name="search" size={20} color="#1a73e8" />
            <Text style={styles.ridesSearchPlaceholder}>
              {t("rides_where_to_go", "Where do you want to go?")}
            </Text>
            <View style={styles.micBtn}>
              <Icon name="microphone" size={18} color="#1a73e8" />
            </View>
          </TouchableOpacity>
        </View>

        {/* ================= QUICK VEHICLE OPTIONS (Screenshot 2) ================= */}
        <View style={styles.quickVehiclesRow}>
          {quickCategories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={styles.vehicleCol}
              activeOpacity={0.75}
              onPress={() => handleSelectCategory(cat.id)}
            >
              <View style={styles.vehicleCircleBg}>
                <Icon name={cat.icon} size={26} color="#1a73e8" />
              </View>
              <Text style={styles.vehicleName} numberOfLines={1}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ================= "IN A HURRY?" PROMO CARD (Screenshot 2) ================= */}
        <TouchableOpacity
          style={styles.hurryPromoCard}
          activeOpacity={0.85}
          onPress={() => {
            setRide({ optionId: "auto" });
            push({ name: "ridePickupDrop" });
          }}
        >
          <View style={styles.hurryLeftCol}>
            <Text style={styles.hurryTitle}>
              {t("rides_hurry_title", "In a hurry?")}
            </Text>
            <Text style={styles.hurrySubtitle}>
              {t("rides_hurry_sub", "An auto will arrive in 5 mins.")}
            </Text>
            <View style={styles.bookNowPill}>
              <Text style={styles.bookNowText}>
                {t("rides_book_now_cta", "Book Now")} →
              </Text>
            </View>
          </View>

          {/* Auto graphic with pin */}
          <View style={styles.hurryAutoWrap}>
            <View style={styles.hurryAutoIconBox}>
              <Icon name="auto" size={42} color="#ffffff" />
            </View>
            <View style={styles.hurryMapPin}>
              <Icon name="pin" size={24} color="#ffffff" />
            </View>
          </View>
        </TouchableOpacity>

        {/* ================= RECENT DESTINATIONS (Screenshot 2) ================= */}
        <View style={styles.recentSectionWrap}>
          {recentDestinations.slice(0, 3).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.recentRow}
              activeOpacity={0.7}
              onPress={() => handleSelectRecentPlace(item)}
            >
              <View style={styles.recentClockWrap}>
                <Icon name="history" size={17} color="#1a73e8" />
              </View>
              <View style={styles.recentTextCol}>
                <Text style={styles.recentTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.recentAddress} numberOfLines={1}>
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
                  size={19}
                  color={item.isFavorite ? "#1a73e8" : "#94a3b8"}
                  filled={item.isFavorite}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

        {/* Transit Hubs */}
        <View style={styles.hubsSection}>
          <Text style={styles.hubsSectionTitle}>Popular Transit Hubs</Text>
          <View style={styles.hubsRow}>
            {transitHubs.map((hub) => (
              <TouchableOpacity
                key={hub.id}
                style={styles.hubCard}
                activeOpacity={0.8}
                onPress={() => {
                  const place = addPlace({
                    label: hub.title.split("…")[0],
                    line: hub.sub,
                    area: hub.sub,
                    icon: "pin",
                    coords: hub.coords,
                  });
                  setRide({ dropId: place.id });
                  push({ name: "rideConfirm" });
                }}
              >
                <Icon name="pin" size={18} color="#1a73e8" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.hubTitle} numberOfLines={1}>
                    {hub.title}
                  </Text>
                  <Text style={styles.hubSub} numberOfLines={1}>
                    {hub.sub}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Driver Partner Banner */}
        <TouchableOpacity
          style={styles.driverBanner}
          activeOpacity={0.85}
          onPress={() => showToast("Driver Partner onboarding: roadrider.in/drive")}
        >
          <View style={styles.driverLeftCol}>
            <Text style={styles.driverTag}>DRIVER PARTNER</Text>
            <Text style={styles.driverTitle}>
              Turn your free time into extra income.
            </Text>
            <View style={styles.driveCtaPill}>
              <Text style={styles.driveCtaText}>Drive with RoadRider →</Text>
            </View>
          </View>
          <View style={styles.driverIconBox}>
            <Icon name="bike" size={40} color="#1a73e8" />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f8fd",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 36,
  },
  // Royal Blue Gradient Header (Screenshot 2)
  blueGradientHeader: {
    backgroundColor: "#1a73e8",
    paddingBottom: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: "#1a73e8",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 6,
  },
  serviceTabsWrap: {
    marginTop: 10,
  },
  activeRideBanner: {
    backgroundColor: "#1557b0",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  activeRidePulse: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  activeRideRadar: {
    position: "absolute",
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255, 255, 255, 0.35)",
  },
  activeRideDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ffffff",
  },
  activeRideTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
  },
  activeRideSub: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.75)",
    marginTop: 2,
  },
  // Map Card (Screenshot 2)
  mapCard: {
    marginHorizontal: HEADER_TOKENS.horizontalMargin,
    marginTop: 0,
    height: 170,
    borderRadius: 22,
    backgroundColor: "#dbeafe",
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    shadowColor: "#1a73e8",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  mapCanvas: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#e0edff",
  },
  mapRiver: {
    position: "absolute",
    top: 40,
    left: -40,
    right: -40,
    height: 24,
    backgroundColor: "#93c5fd",
    transform: [{ rotate: "-15deg" }],
    opacity: 0.7,
  },
  mapRoad1: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 80,
    width: 16,
    backgroundColor: "#ffffff",
    transform: [{ rotate: "25deg" }],
    opacity: 0.8,
  },
  mapRoad2: {
    position: "absolute",
    top: 70,
    left: 0,
    right: 0,
    height: 14,
    backgroundColor: "#ffffff",
    opacity: 0.8,
  },
  radarOuterRing: {
    position: "absolute",
    top: "32%",
    left: "40%",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: "rgba(26, 115, 232, 0.25)",
    transform: [{ translateX: -40 }, { translateY: -40 }],
  },
  radarMiddleRing: {
    position: "absolute",
    top: "32%",
    left: "40%",
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: "rgba(26, 115, 232, 0.4)",
    transform: [{ translateX: -25 }, { translateY: -25 }],
  },
  radarCenterPin: {
    position: "absolute",
    top: "32%",
    left: "40%",
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(26, 115, 232, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateX: -11 }, { translateY: -11 }],
  },
  radarCenterCore: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#1a73e8",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  mapGearBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  mapLocationPill: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
    maxWidth: "90%",
  },
  mapBlueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1a73e8",
  },
  mapLocationText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },
  // Search Bar Section (Screenshot 2)
  searchBarSection: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  ridesSearchBar: {
    height: 54,
    borderRadius: 27,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#93c5fd",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    gap: 12,
    shadowColor: "#1a73e8",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  ridesSearchPlaceholder: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
  },
  micBtn: {
    padding: 4,
  },
  // Quick Vehicles (Screenshot 2)
  quickVehiclesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  vehicleCol: {
    alignItems: "center",
    width: 72,
  },
  vehicleCircleBg: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    shadowColor: "#1a73e8",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  vehicleName: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
  },
  // "In a Hurry?" Card (Screenshot 2)
  hurryPromoCard: {
    backgroundColor: "#2563eb",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 22,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#2563eb",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 4,
  },
  hurryLeftCol: {
    flex: 1,
  },
  hurryTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#ffffff",
  },
  hurrySubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.85)",
    fontWeight: "600",
    marginTop: 3,
    marginBottom: 12,
  },
  bookNowPill: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  bookNowText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#1d4ed8",
  },
  hurryAutoWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  hurryAutoIconBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  hurryMapPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  // Recent Destinations
  recentSectionWrap: {
    marginTop: 20,
    paddingHorizontal: 16,
    gap: 12,
  },
  recentRow: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  recentClockWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  recentTextCol: {
    flex: 1,
    marginLeft: 12,
  },
  recentTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 2,
  },
  recentAddress: {
    fontSize: 11.5,
    color: "#64748b",
  },
  heartBtn: {
    padding: 6,
  },
  // Transit Hubs
  hubsSection: {
    marginTop: 22,
    paddingHorizontal: 16,
  },
  hubsSectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 10,
  },
  hubsRow: {
    gap: 10,
  },
  hubCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  hubTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  hubSub: {
    fontSize: 11,
    color: "#64748b",
  },
  // Driver Banner
  driverBanner: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    shadowColor: "#1a73e8",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  driverLeftCol: {
    flex: 1,
    paddingRight: 10,
  },
  driverTag: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#1a73e8",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  driverTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0f172a",
    lineHeight: 18,
    marginBottom: 8,
  },
  driveCtaPill: {
    alignSelf: "flex-start",
  },
  driveCtaText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#1a73e8",
  },
  driverIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
});

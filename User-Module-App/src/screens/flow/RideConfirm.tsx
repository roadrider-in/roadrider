import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FlowHeader from "../../components/FlowHeader";
import GoogleMap from "../../components/GoogleMap";
import Icon from "../../components/Icon";
import Button from "../../components/Button";
import { computeDistanceKm, DEFAULT_CENTER, type LatLng } from "../../lib/googleMaps";
import { useRouteCalculation } from "../../hooks/useRouteCalculation";
import { rupees } from "../../lib/pricing";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { useI18n } from "../../lib/i18n";
import { colors, radii } from "../../theme/tokens";

interface RideTierConfig {
  id: string;
  name: string;
  icon: string;
  baseFare: number;
  perKm: number;
  minFare: number;
  eta: string;
  tagline: string;
}

const RIDE_TIERS: RideTierConfig[] = [
  {
    id: "bike",
    name: "Bike Taxi",
    icon: "bike",
    baseFare: 30,
    perKm: 10,
    minFare: 45,
    eta: "3 mins",
    tagline: "Fast solo rides, beat traffic",
  },
  {
    id: "auto",
    name: "Auto",
    icon: "auto",
    baseFare: 50,
    perKm: 14,
    minFare: 75,
    eta: "5 mins",
    tagline: "Comfortable doorstep auto",
  },
  {
    id: "shared_auto",
    name: "Shared Auto",
    icon: "auto",
    baseFare: 25,
    perKm: 8,
    minFare: 35,
    eta: "6 mins",
    tagline: "Pocket-friendly shared commute",
  },
  {
    id: "cab",
    name: "Cab Economy",
    icon: "car",
    baseFare: 90,
    perKm: 18,
    minFare: 140,
    eta: "7 mins",
    tagline: "AC hatchbacks & sedans",
  },
  {
    id: "xl",
    name: "Cab Premium",
    icon: "car",
    baseFare: 140,
    perKm: 24,
    minFare: 220,
    eta: "9 mins",
    tagline: "Spacious SUVs for extra comfort",
  },
];

export default function RideConfirm() {
  const { push, back } = useNav();
  const { state, setRide, placeById, placeOrder, showToast } = useApp();
  const { t } = useI18n();

  const [paymentMethod, setPaymentMethod] = useState<"cod" | "upi" | "wallet">("cod");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Locations
  const pickupPlace = placeById(state.ride.pickupId) ?? state.places[0] ?? {
    label: "Current Location",
    line: "Hazratganj, Lucknow",
    area: "Hazratganj, Lucknow",
    coords: { lat: 26.8467, lng: 80.9462 },
  };

  const dropPlace = placeById(state.ride.dropId) ?? {
    label: "Destination",
    line: "Gomti Nagar, Lucknow",
    area: "Gomti Nagar, Lucknow",
    coords: { lat: 26.8665, lng: 81.0063 },
  };

  const pickupCoords: LatLng = pickupPlace.coords ?? DEFAULT_CENTER;
  const dropCoords: LatLng = dropPlace.coords ?? { lat: 26.8665, lng: 81.0063 };

  // Stable memoized map points to prevent unnecessary re-renders
  const originMapProp: LatLng = useMemo(() => ({
    lat: pickupCoords.lat,
    lng: pickupCoords.lng,
    label: pickupPlace.label,
  }), [pickupCoords.lat, pickupCoords.lng, pickupPlace.label]);

  const dropMapProp: LatLng = useMemo(() => ({
    lat: dropCoords.lat,
    lng: dropCoords.lng,
    label: dropPlace.label,
  }), [dropCoords.lat, dropCoords.lng, dropPlace.label]);

  // Calculate actual distance and trip duration
  const distanceKm = useMemo(() => {
    return computeDistanceKm(pickupCoords, dropCoords);
  }, [pickupCoords, dropCoords]);

  const durationMins = useMemo(() => {
    return Math.max(5, Math.round(distanceKm * 2.6 + 4));
  }, [distanceKm]);

  // Real Google Routes API road calculation
  const { route: roadRoute, isLoading: isRouteLoading } = useRouteCalculation(
    pickupCoords,
    dropCoords,
    "DRIVE"
  );

  const effectiveDistanceKm = roadRoute?.distanceKm ?? distanceKm;
  const effectiveDurationMins = roadRoute?.durationMinutes ?? durationMins;

  // Selected option
  const activeOptionId = state.ride.optionId || "auto";
  const selectedTier =
    RIDE_TIERS.find((tier) => tier.id === activeOptionId) ?? RIDE_TIERS[1];

  // Dynamic fare calculation based on real road distance
  const calculateTierFare = (tier: RideTierConfig): number => {
    const raw = tier.baseFare + effectiveDistanceKm * tier.perKm;
    return Math.max(tier.minFare, Math.round(raw));
  };

  const currentFare = calculateTierFare(selectedTier);

  // Handle booking confirmation
  const handleConfirmBooking = async () => {
    if (isSubmitting) return;

    if (!state.authenticated) {
      showToast("Please sign in to confirm and book your ride.");
      push({ name: "phone" });
      return;
    }

    if (!pickupPlace.coords?.lat || !dropPlace.coords?.lat) {
      showToast("Valid pickup and destination locations are required.");
      push({ name: "ridePickupDrop" });
      return;
    }

    setIsSubmitting(true);
    try {
      setRide({
        routePolyline: roadRoute?.encodedPolyline,
        roadDistanceKm: effectiveDistanceKm,
        estimatedDurationMins: effectiveDurationMins,
      });

      const destination = `${pickupPlace.area || pickupPlace.label} → ${
        dropPlace.area || dropPlace.label
      }`;

      const res = await placeOrder("rides", paymentMethod, destination);
      if (!res.ok) {
        showToast(res.error || "Booking failed.");
        setIsSubmitting(false);
        return;
      }

      showToast("Ride request created! Searching for nearby drivers…");
      push({ name: "waitingForRider", orderId: res.order.id });
    } catch (err: any) {
      console.warn("[RideConfirm] Booking error:", err);
      showToast(err?.message || "Failed to create ride booking.");
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <FlowHeader title={t("rides_confirm_booking", "Confirm Booking")} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Map Route Preview */}
        <View style={styles.mapContainer}>
          <GoogleMap
            origin={originMapProp}
            destination={dropMapProp}
            routeCoordinates={roadRoute?.coordinates}
            theme="blue"
            interactive={true}
            showsUserLocation={true}
            showRecenterBtn={true}
          />
        </View>

        {/* Route Details Card */}
        <View style={styles.routeSummaryCard}>
          <View style={styles.routeHeader}>
            <View style={styles.routeMetric}>
              <Icon name="clock" size={15} color="#1769E8" />
              <Text style={styles.metricText}>
                {isRouteLoading ? "..." : `${effectiveDurationMins} mins`}
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.routeMetric}>
              <Icon name="pin" size={15} color="#1769E8" />
              <Text style={styles.metricText}>
                {isRouteLoading ? "..." : `${effectiveDistanceKm} km`}
              </Text>
            </View>
          </View>

          {/* Connected Addresses */}
          <View style={styles.addressRow}>
            <View style={styles.greenDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.addressLabel}>
                {t("rides_pickup_location", "Pickup Location")}
              </Text>
              <Text style={styles.addressText} numberOfLines={1}>
                {pickupPlace.line || pickupPlace.label}
              </Text>
            </View>
          </View>

          <View style={styles.routeConnectorLine} />

          <View style={styles.addressRow}>
            <View style={styles.orangeDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.addressLabel}>
                {t("rides_drop_location", "Drop Location")}
              </Text>
              <Text style={styles.addressText} numberOfLines={1}>
                {dropPlace.line || dropPlace.label}
              </Text>
            </View>
          </View>
        </View>

        {/* Ride Category Selection (Phase 5) */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>
            {t("rides_explore", "Choose a ride")}
          </Text>

          {RIDE_TIERS.map((tier) => {
            const isSelected = tier.id === selectedTier.id;
            const fare = calculateTierFare(tier);

            return (
              <TouchableOpacity
                key={tier.id}
                style={[
                  styles.tierCard,
                  isSelected && styles.tierCardSelected,
                ]}
                activeOpacity={0.8}
                onPress={() => setRide({ optionId: tier.id })}
              >
                <View style={styles.tierIconWrap}>
                  <Icon
                    name={tier.icon}
                    size={26}
                    color={isSelected ? "#3983f7" : "#1e1e24"}
                  />
                </View>

                <View style={styles.tierInfo}>
                  <View style={styles.tierTitleRow}>
                    <Text style={styles.tierName}>{tier.name}</Text>
                    <Text style={styles.tierEta}>· {tier.eta}</Text>
                  </View>
                  <Text style={styles.tierTagline} numberOfLines={1}>
                    {tier.tagline}
                  </Text>
                </View>

                <View style={styles.tierPriceWrap}>
                  <Text
                    style={[
                      styles.tierPrice,
                      isSelected && styles.tierPriceSelected,
                    ]}
                  >
                    {rupees(fare)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Passenger Information */}
        <View style={styles.passengerCard}>
          <View style={styles.passengerRow}>
            <Icon name="user" size={18} color="#3983f7" />
            <Text style={styles.passengerLabel}>
              {t("rides_passenger_details", "Passenger")}:
            </Text>
            <Text style={styles.passengerValue}>
              {state.profile.name || "Me"} ({state.profile.phone || "Account Mobile"})
            </Text>
          </View>
        </View>

        {/* Payment Method Selector */}
        <View style={styles.paymentSelectorWrap}>
          <Text style={styles.paymentHeading}>
            {t("payment_method", "Payment Method")}
          </Text>
          <View style={styles.paymentMethodsRow}>
            <TouchableOpacity
              style={[
                styles.payOption,
                paymentMethod === "cod" && styles.payOptionActive,
              ]}
              onPress={() => setPaymentMethod("cod")}
            >
              <Text
                style={[
                  styles.payOptionText,
                  paymentMethod === "cod" && styles.payOptionTextActive,
                ]}
              >
                Cash
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.payOption,
                paymentMethod === "upi" && styles.payOptionActive,
              ]}
              onPress={() => setPaymentMethod("upi")}
            >
              <Text
                style={[
                  styles.payOptionText,
                  paymentMethod === "upi" && styles.payOptionTextActive,
                ]}
              >
                UPI
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.payOption,
                paymentMethod === "wallet" && styles.payOptionActive,
              ]}
              onPress={() => setPaymentMethod("wallet")}
            >
              <Text
                style={[
                  styles.payOptionText,
                  paymentMethod === "wallet" && styles.payOptionTextActive,
                ]}
              >
                Wallet (₹{state.wallet.balance})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Confirm CTA */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomFareSummary}>
          <Text style={styles.bottomTotalLabel}>Total Fare</Text>
          <Text style={styles.bottomTotalPrice}>{rupees(currentFare)}</Text>
        </View>

        <TouchableOpacity
          style={styles.confirmBtn}
          activeOpacity={0.85}
          onPress={handleConfirmBooking}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Text style={styles.confirmBtnText}>
                Book {selectedTier.name}
              </Text>
              <Icon name="arrow" size={16} color="#ffffff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F9FF",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 140,
  },
  mapContainer: {
    height: 220,
    width: "100%",
  },
  routeSummaryCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DCE8F8",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  routeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 12,
  },
  routeMetric: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metricText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#172033",
  },
  metricDivider: {
    width: 1,
    height: 14,
    backgroundColor: "#CBD5E1",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  greenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#16A34A",
  },
  orangeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#DC2626",
  },
  routeConnectorLine: {
    width: 2,
    height: 16,
    backgroundColor: "#CBD5E1",
    marginLeft: 4,
    marginVertical: 2,
  },
  addressLabel: {
    fontSize: 11,
    color: "#68758A",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  addressText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#172033",
    marginTop: 1,
  },
  sectionWrap: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#172033",
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  tierCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#DCE8F8",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  tierCardSelected: {
    backgroundColor: "#EAF3FF",
    borderColor: "#1769E8",
    borderWidth: 1.5,
  },
  tierIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EAF3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  tierInfo: {
    flex: 1,
    marginLeft: 14,
  },
  tierTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  tierName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#172033",
  },
  tierEta: {
    fontSize: 12,
    color: "#68758A",
    marginLeft: 4,
  },
  tierTagline: {
    fontSize: 12,
    color: "#68758A",
    marginTop: 2,
  },
  tierPriceWrap: {
    alignItems: "flex-end",
  },
  tierPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: "#172033",
  },
  tierPriceSelected: {
    color: "#1769E8",
  },
  passengerCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#DCE8F8",
  },
  passengerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  passengerLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#68758A",
  },
  passengerValue: {
    fontSize: 13,
    color: "#172033",
    fontWeight: "600",
    flex: 1,
  },
  paymentSelectorWrap: {
    marginHorizontal: 16,
    marginTop: 18,
  },
  paymentHeading: {
    fontSize: 14,
    fontWeight: "700",
    color: "#172033",
    marginBottom: 8,
  },
  paymentMethodsRow: {
    flexDirection: "row",
    gap: 10,
  },
  payOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DCE8F8",
  },
  payOptionActive: {
    backgroundColor: "#EAF3FF",
    borderColor: "#1769E8",
  },
  payOptionText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#68758A",
  },
  payOptionTextActive: {
    color: "#1769E8",
    fontWeight: "800",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#DCE8F8",
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: -3 },
    shadowRadius: 8,
    elevation: 8,
  },
  bottomFareSummary: {
    justifyContent: "center",
  },
  bottomTotalLabel: {
    fontSize: 12,
    color: "#68758A",
  },
  bottomTotalPrice: {
    fontSize: 20,
    fontWeight: "800",
    color: "#172033",
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1769E8",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    shadowColor: "#1769E8",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
});

import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
} from "react-native";
import Header from "../../components/Header";
import ServiceTabs from "../../components/ServiceTabs";
import MapArt from "../../components/MapArt";
import LocationRows from "../../components/LocationRows";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import { RIDE_OPTIONS, RENTAL_PACKAGES, type Service } from "../../data/demo";
import { rupees } from "../../lib/pricing";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { colors } from "../../theme/tokens";

export default function RidesHome() {
  const { push } = useNav();
  const { setService, state, setRide, placeById, showToast } = useApp();
  const [segment, setSegment] = useState<"book" | "rental">("book");
  const [selectedPackageId, setSelectedPackageId] = useState("pkg-2h");

  const selectedOption =
    RIDE_OPTIONS.find((r) => r.id === state.ride.optionId) ?? RIDE_OPTIONS[1];
  const selectedRental =
    RENTAL_PACKAGES.find((p) => p.id === selectedPackageId) ??
    RENTAL_PACKAGES[0];

  const handleSelectService = (s: Service) => {
    setService(s);
  };

  const handleSelectRide = (id: string) => {
    setRide({ optionId: id });
  };

  const handleBook = () => {
    if (segment === "rental") {
      if (!state.ride.dropId) {
        setRide({ dropId: state.ride.pickupId ?? "home" });
      }
      showToast(`${selectedRental.name} selected. Confirm your rental booking.`);
      push({ name: "rideConfirm" });
      return;
    }
    if (!state.ride.dropId) {
      const defaultDrop = state.places[1] ?? state.places[0];
      if (defaultDrop) {
        setRide({ dropId: defaultDrop.id });
      }
    }
    push({ name: "rideConfirm" });
  };

  const pickupPlace = placeById(state.ride.pickupId) ?? state.places[0];
  const dropPlace = placeById(state.ride.dropId);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header & ServiceTabs */}
      <View style={styles.topSection}>
        <Header dark />
        <ServiceTabs service="rides" onSelect={handleSelectService} />

        {/* Figma Segment Switcher */}
        <View style={styles.segment}>
          <Pressable
            onPress={() => setSegment("book")}
            style={[
              styles.segmentBtn,
              segment === "book" && styles.segmentBtnActive,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                segment === "book" && styles.segmentTextActive,
              ]}
            >
              Book a ride
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setSegment("rental")}
            style={[
              styles.segmentBtn,
              segment === "rental" && styles.segmentBtnActive,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                segment === "rental" && styles.segmentTextActive,
              ]}
            >
              Hourly rental
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Map Preview */}
      <View style={styles.mapBox}>
        <MapArt
          origin={pickupPlace?.coords}
          destination={dropPlace?.coords}
          etaText={selectedOption.eta}
          etaUnit={dropPlace ? "to arrival" : "away"}
        />
      </View>

      {/* Pickup & Destination Rows */}
      <View style={styles.locationWrap}>
        <LocationRows />
      </View>

      {/* Hourly Rental Package Selector */}
      {segment === "rental" && (
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Select package duration</Text>
            <Text style={styles.sectionSub}>Multiple stops included</Text>
          </View>

          <View style={styles.rentalGrid}>
            {RENTAL_PACKAGES.map((pkg) => {
              const isSel = pkg.id === selectedPackageId;
              return (
                <Pressable
                  key={pkg.id}
                  onPress={() => setSelectedPackageId(pkg.id)}
                  style={[
                    styles.rentalCard,
                    isSel && styles.rentalCardActive,
                  ]}
                >
                  <Text style={[styles.rentalHours, isSel && styles.rentalAccent]}>
                    {pkg.hours} Hours
                  </Text>
                  <Text style={styles.rentalKm}>{pkg.km} km</Text>
                  <Text style={[styles.rentalFare, isSel && styles.rentalAccent]}>
                    {rupees(pkg.fare)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Figma 4-Column Ride Options Grid */}
      <View style={styles.sectionWrap}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>
            {segment === "rental" ? "Choose vehicle" : "Choose a ride"}
          </Text>
          <Text style={styles.sectionSub}>Fare estimate</Text>
        </View>

        <View style={styles.vehicleGrid}>
          {RIDE_OPTIONS.map((opt) => {
            const isSelected = opt.id === selectedOption.id;
            const displayFare =
              segment === "rental"
                ? opt.id === "bike"
                  ? rupees(Math.round(selectedRental.fare * 0.6))
                  : opt.id === "auto"
                  ? rupees(selectedRental.fare)
                  : opt.id === "cab"
                  ? rupees(Math.round(selectedRental.fare * 1.5))
                  : rupees(Math.round(selectedRental.fare * 2.1))
                : opt.range;

            return (
              <Pressable
                key={opt.name}
                onPress={() => handleSelectRide(opt.id)}
                style={[
                  styles.vehicleCard,
                  isSelected && styles.vehicleCardActive,
                ]}
              >
                <View
                  style={[
                    styles.vehicleBadge,
                    isSelected && styles.vehicleBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.vehicleBadgeText,
                      isSelected && styles.vehicleBadgeTextActive,
                    ]}
                  >
                    {opt.abbr}
                  </Text>
                </View>
                <Text style={styles.vehicleName}>{opt.name}</Text>
                <Text style={styles.vehicleFare}>{displayFare}</Text>
                <Text style={styles.vehicleEta}>{opt.eta}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Book CTA */}
      <View style={styles.ctaWrap}>
        <Button
          onPress={handleBook}
          accentColor="#3983f7"
        >
          <Text style={styles.ctaText}>
            {segment === "rental"
              ? `Book ${selectedOption.name} · ${selectedRental.name}`
              : `Book ${selectedOption.name} · ${selectedOption.range}`}
          </Text>
          <Icon name="arrow" size={18} color="#ffffff" />
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d1b2c",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  topSection: {
    backgroundColor: "transparent",
    paddingBottom: 4,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginHorizontal: 18,
    borderRadius: 13,
    padding: 4,
    marginTop: 4,
    marginBottom: 14,
  },
  segmentBtn: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentBtnActive: {
    backgroundColor: "#3983f7",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 14,
    elevation: 3,
  },
  segmentText: {
    color: "rgba(255, 255, 255, 0.55)",
    fontSize: 11,
    fontWeight: "700",
  },
  segmentTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  mapBox: {
    height: 214,
    marginHorizontal: 18,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#152c42",
  },
  locationWrap: {
    paddingHorizontal: 18,
    marginTop: 12,
  },
  sectionWrap: {
    paddingHorizontal: 18,
    marginTop: 14,
  },
  sectionHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.4,
  },
  sectionSub: {
    fontSize: 10,
    fontWeight: "700",
    color: "#3983f7",
  },
  rentalGrid: {
    flexDirection: "row",
    gap: 8,
  },
  rentalCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 13,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    gap: 3,
  },
  rentalCardActive: {
    backgroundColor: "rgba(57, 131, 247, 0.16)",
    borderColor: "#3983f7",
    borderWidth: 1.5,
  },
  rentalHours: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
  },
  rentalKm: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.5)",
  },
  rentalFare: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
    marginTop: 2,
  },
  rentalAccent: {
    color: "#3983f7",
  },
  vehicleGrid: {
    flexDirection: "row",
    gap: 7,
  },
  vehicleCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 13,
    minHeight: 104,
    paddingVertical: 7,
    paddingHorizontal: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleCardActive: {
    borderColor: "#3983f7",
    backgroundColor: "rgba(57, 131, 247, 0.16)",
  },
  vehicleBadge: {
    width: 42,
    height: 27,
    borderRadius: 6,
    backgroundColor: "#26394b",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  vehicleBadgeActive: {
    backgroundColor: "#3983f7",
  },
  vehicleBadgeText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#d9e6f2",
  },
  vehicleBadgeTextActive: {
    color: "#ffffff",
  },
  vehicleName: {
    fontSize: 10,
    fontWeight: "700",
    color: "#ffffff",
  },
  vehicleFare: {
    fontSize: 8,
    fontWeight: "800",
    color: "#3983f7",
    marginTop: 2,
  },
  vehicleEta: {
    fontSize: 7,
    color: "rgba(255, 255, 255, 0.45)",
    marginTop: 1,
  },
  ctaWrap: {
    paddingHorizontal: 18,
    marginTop: 20,
  },
  ctaText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    marginRight: 6,
  },
});

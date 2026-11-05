import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Modal,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import UnifiedServiceHeader from "../../components/UnifiedServiceHeader";
import Icon from "../../components/Icon";
import CourierProhibitedModal from "../../components/CourierProhibitedModal";
import FadeInView from "../../components/animations/FadeInView";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { DEFAULT_CENTER } from "../../lib/googleMaps";
import { useCurrentLocation } from "../../hooks/useCurrentLocation";
import { reverseGeocode } from "../../services/locationService";
import type { Service } from "../../data/demo";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function CourierHome() {
  const insets = useSafeAreaInsets();
  const { push, back } = useNav();
  const { state, setService, setCourier, placeById, showToast } = useApp();

  const [showProhibitedModal, setShowProhibitedModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Real device GPS hook
  const {
    location: gpsLocation,
    isLoading: isGpsLoading,
    permissionDenied: gpsDenied,
    refreshLocation,
  } = useCurrentLocation(true);

  // Sync live GPS position once detected
  useEffect(() => {
    let isMounted = true;
    if (gpsLocation && !state.courier.pickupAddress) {
      const formatted =
        gpsLocation.formattedAddress ||
        `${gpsLocation.name || "Current Location"}, ${gpsLocation.city || "Lucknow"}`;

      setCourier({
        pickupAddress: formatted,
        pickupCoords: {
          lat: gpsLocation.coords.lat,
          lng: gpsLocation.coords.lng,
          label: gpsLocation.name || "Current Location",
        },
      });
    }
    return () => {
      isMounted = false;
    };
  }, [gpsLocation]);

  // Sender / Pickup place resolution
  const currentPlace = placeById(state.defaultPlaceId) ?? state.places[0] ?? {
    label: "104, Golf City",
    line: "104, Golf City, Lucknow, Muzaffar Nagar Ghusval, Uttar Pradesh 226002",
    coords: DEFAULT_CENTER,
  };

  const resolvedPickupAddress =
    state.courier.pickupAddress ||
    currentPlace.line ||
    currentPlace.label;

  const senderName = state.profile.name || "Omm lenka";
  const senderPhone = state.profile.phone || "7897069137";

  // Drop place if any already selected
  const dropPlace = state.courier.dropId ? placeById(state.courier.dropId) : null;

  const handleSelectService = (s: Service) => {
    setService(s);
  };

  const handleEditPickup = () => {
    push({ name: "places", mode: "courierPickup" });
  };

  const handleOpenDropSearch = () => {
    push({ name: "courierDropSearch" });
  };

  const swapAnim = useRef(new Animated.Value(0)).current;

  const handleSwapAddresses = () => {
    if (!dropPlace && !state.courier.dropAddress) {
      showToast("Please select a drop address first before swapping.");
      handleOpenDropSearch();
      return;
    }

    Animated.sequence([
      Animated.timing(swapAnim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(swapAnim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
    ]).start();

    const currentPickupId = state.courier.pickupId || state.defaultPlaceId;
    const currentDropId = state.courier.dropId;
    const currentPickupAddr = resolvedPickupAddress;
    const currentDropAddr = state.courier.dropAddress || dropPlace?.line || dropPlace?.label || "";
    const currentPickupCoords = state.courier.pickupCoords || currentPlace.coords;
    const currentDropCoords = state.courier.dropCoords || dropPlace?.coords;

    setCourier({
      pickupId: currentDropId || "",
      dropId: currentPickupId,
      pickupAddress: currentDropAddr,
      dropAddress: currentPickupAddr,
      pickupCoords: currentDropCoords,
      dropCoords: currentPickupCoords,
    });
    showToast("⇅ Swapped pickup and drop locations");
  };

  const switchRotation = swapAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ================= UNIFIED SERVICE NAVIGATION HEADER ================= */}
      <UnifiedServiceHeader
        service="courier"
        onSelectService={handleSelectService}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= PROMOTIONAL FESTIVE HERO BANNER ================= */}
        <View style={styles.bannerContainer}>
          <View style={styles.bannerContentRow}>
            {/* Left Copy & Coupon */}
            <View style={styles.bannerLeftCol}>
              <Text style={styles.bannerTitle}>First Parcel Free</Text>

              <TouchableOpacity
                style={styles.couponBadge}
                onPress={() => {
                  showToast("Coupon DIWALI100 copied! Apply at checkout for flat ₹50 OFF.");
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.couponCode}>DIWALI100</Text>
              </TouchableOpacity>

              <Text style={styles.bannerSubtitle}>Use code at checkout</Text>
            </View>

            {/* Right Festive Hero Illustration */}
            <View style={styles.bannerIllustrationCol}>
              <View style={styles.festiveDoorway}>
                {/* Decorative festive lanterns and marigolds */}
                <View style={styles.lanternRow}>
                  <Text style={styles.lanternEmoji}>🏮</Text>
                  <Text style={styles.garlandEmoji}>✨</Text>
                  <Text style={styles.lanternEmoji}>🏮</Text>
                </View>

                {/* Delivery partner handing package to customer */}
                <View style={styles.characterRow}>
                  <View style={styles.riderAvatar}>
                    <Text style={styles.riderCap}>🧢</Text>
                    <Text style={styles.riderFace}>🛵</Text>
                  </View>
                  <View style={styles.parcelBoxGraphic}>
                    <Text style={styles.parcelEmoji}>🎁</Text>
                  </View>
                  <View style={styles.customerAvatar}>
                    <Text style={styles.customerFace}>🪔</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ================= LOCATION SELECTION CARDS ================= */}
        <FadeInView duration={350} style={styles.cardsWrapper}>
          {/* 1. Pickup Card */}
          <View style={styles.locationCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.iconCol}>
                <View style={styles.dotGreenOuter}>
                  <View style={styles.dotGreenInner} />
                </View>
              </View>

              <View style={styles.cardTextCol}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={styles.cardTitle}>Pickup from current location</Text>
                  {isGpsLoading && (
                    <ActivityIndicator size="small" color="#16a34a" style={{ marginLeft: 6 }} />
                  )}
                </View>
                <Text style={styles.addressLine} numberOfLines={2}>
                  {resolvedPickupAddress}
                </Text>
                {gpsDenied && (
                  <Text style={{ fontSize: 11, color: "#d97706", marginTop: 2, fontWeight: "500" }}>
                    GPS disabled · Using saved address
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.editBtn}
                onPress={handleEditPickup}
                accessibilityRole="button"
                accessibilityLabel="Edit pickup location"
              >
                <Icon name="arrow" size={16} color="#68758A" />
              </TouchableOpacity>
            </View>

            {/* Dotted horizontal divider */}
            <View style={styles.dottedDivider} />

            {/* Sender Contact Row */}
            <View style={styles.contactRow}>
              <Text style={styles.contactText}>
                {senderName} ({senderPhone})
              </Text>
            </View>
          </View>

          {/* Floating Switch Button */}
          <View style={styles.switchRow}>
            <TouchableOpacity
              style={styles.switchBtn}
              onPress={handleSwapAddresses}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Switch pickup and drop addresses"
            >
              <Animated.Text style={[styles.switchIcon, { transform: [{ rotate: switchRotation }] }]}>
                ⇅
              </Animated.Text>
              <Text style={styles.switchText}>Switch</Text>
            </TouchableOpacity>
          </View>

          {/* 2. Drop Card */}
          <View style={styles.locationCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.iconCol}>
                <View style={styles.dotRedOuter}>
                  <View style={styles.dotRedInner} />
                </View>
              </View>

              <View style={styles.cardTextCol}>
                <Text style={styles.cardTitle}>Drop to</Text>
              </View>
            </View>

            {/* Drop Search Bar */}
            <TouchableOpacity
              style={styles.dropSearchBar}
              onPress={handleOpenDropSearch}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Search drop address"
            >
              <Icon name="search" size={18} color="#151B2B" />
              <Text
                style={[
                  styles.dropSearchPlaceholder,
                  dropPlace && styles.dropSearchValue,
                ]}
                numberOfLines={1}
              >
                {dropPlace ? dropPlace.label : "Search drop address"}
              </Text>
            </TouchableOpacity>
          </View>
        </FadeInView>

        {/* ================= FOOTER LINKS & LEGAL ================= */}
        <View style={styles.footerWrap}>
          <TouchableOpacity
            onPress={() => setShowProhibitedModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.footerLinkText}>
              Read about <Text style={styles.blueLink}>prohibited items</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowTermsModal(true)}
            activeOpacity={0.7}
            style={styles.termsRow}
          >
            <Text style={styles.footerLinkText}>
              By continuing, you agree to our <Text style={styles.blueLink}>T&Cs</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Prohibited Items Modal */}
      <CourierProhibitedModal
        visible={showProhibitedModal}
        onClose={() => setShowProhibitedModal(false)}
      />

      {/* Terms and Conditions Modal */}
      <Modal
        visible={showTermsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTermsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.termsCard}>
            <Text style={styles.termsTitle}>Courier Terms & Conditions</Text>
            <ScrollView style={styles.termsScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.termsParagraph}>
                1. RoadRider parcel delivery service facilitates transportation of lawful packages within permissible weight categories (Bike: up to 20 kgs, 3-wheeler: up to 500 kgs).
              </Text>
              <Text style={styles.termsParagraph}>
                2. Senders are strictly responsible for lawful content. Prohibited, hazardous, flammable, or contraband items are not permitted.
              </Text>
              <Text style={styles.termsParagraph}>
                3. Pickup and Delivery OTPs must be shared directly with the assigned RoadRider captain to confirm parcel handover and successful receipt.
              </Text>
              <Text style={styles.termsParagraph}>
                4. For fragile items, senders must ensure sufficient protective cushioning.
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.termsCloseBtn}
              onPress={() => setShowTermsModal(false)}
            >
              <Text style={styles.termsCloseText}>I Agree</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F8FC",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  // Hero Banner matching Screenshot 1
  bannerContainer: {
    backgroundColor: "#FFF3E0",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FFE0B2",
    shadowColor: "#E87518",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  bannerContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bannerLeftCol: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#B71C1C",
    letterSpacing: -0.5,
    fontFamily: "System",
  },
  couponBadge: {
    alignSelf: "flex-start",
    marginTop: 8,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#C62828",
    backgroundColor: "#FFEBEE",
  },
  couponCode: {
    fontSize: 14,
    fontWeight: "900",
    color: "#C62828",
    letterSpacing: 0.8,
  },
  bannerSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#B71C1C",
  },
  bannerIllustrationCol: {
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 10,
  },
  festiveDoorway: {
    alignItems: "center",
    backgroundColor: "#FFE082",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#FFD54F",
  },
  lanternRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  lanternEmoji: {
    fontSize: 16,
  },
  garlandEmoji: {
    fontSize: 12,
  },
  characterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  riderAvatar: {
    alignItems: "center",
  },
  riderCap: {
    fontSize: 12,
    marginBottom: -4,
  },
  riderFace: {
    fontSize: 22,
  },
  parcelBoxGraphic: {
    paddingHorizontal: 2,
  },
  parcelEmoji: {
    fontSize: 20,
  },
  customerAvatar: {
    alignItems: "center",
  },
  customerFace: {
    fontSize: 22,
  },
  // Location Selection Cards
  cardsWrapper: {
    gap: 4,
  },
  locationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E4EAF1",
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCol: {
    width: 20,
    alignItems: "center",
  },
  dotGreenOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  dotGreenInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#16A34A",
  },
  dotRedOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  dotRedInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  cardTextCol: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#151B2B",
    letterSpacing: -0.2,
  },
  addressLine: {
    fontSize: 12.5,
    color: "#475569",
    marginTop: 2,
    lineHeight: 17,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dottedDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    marginVertical: 10,
  },
  contactRow: {
    paddingLeft: 32,
  },
  contactText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#151B2B",
  },
  // Switch Button floating between cards
  switchRow: {
    alignItems: "flex-end",
    marginVertical: -8,
    zIndex: 10,
    paddingRight: 16,
  },
  switchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  switchIcon: {
    fontSize: 14,
    color: "#151B2B",
    fontWeight: "800",
  },
  switchText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#151B2B",
  },
  dropSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#3B82F6",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    marginTop: 10,
  },
  dropSearchPlaceholder: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#151B2B",
  },
  dropSearchValue: {
    fontWeight: "700",
    color: "#151B2B",
  },
  // Footer
  footerWrap: {
    alignItems: "center",
    marginTop: 36,
    gap: 6,
  },
  footerLinkText: {
    fontSize: 12,
    color: "#68758A",
    fontWeight: "500",
  },
  blueLink: {
    color: "#2563EB",
    fontWeight: "700",
  },
  termsRow: {
    marginTop: 2,
  },
  // Terms modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  termsCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  termsTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#151B2B",
    marginBottom: 12,
  },
  termsScroll: {
    maxHeight: 300,
  },
  termsParagraph: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
    marginBottom: 10,
  },
  termsCloseBtn: {
    height: 46,
    backgroundColor: "#E87518",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  termsCloseText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});

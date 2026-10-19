import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ImageBackground,
  TextInput,
  Pressable,
} from "react-native";
import Header from "../../components/Header";
import ServiceTabs from "../../components/ServiceTabs";
import LocationRows from "../../components/LocationRows";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import { PACKAGE_TYPES, PHOTOS, type Service } from "../../data/demo";
import { fetchPackageTypes } from "../../lib/supabaseData";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { colors } from "../../theme/tokens";

export default function CourierHome() {
  const { push } = useNav();
  const { setService, state, setCourier, showToast } = useApp();
  const [segment, setSegment] = useState<"send" | "track">("send");
  const [trackInput, setTrackInput] = useState("");
  const [packageTypes, setPackageTypes] = useState<typeof PACKAGE_TYPES>(PACKAGE_TYPES);

  useEffect(() => {
    let isMounted = true;
    fetchPackageTypes().then((types) => {
      if (isMounted && types.length > 0) {
        setPackageTypes(types);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const selectedPackage =
    packageTypes.find((p) => p.id === state.courier.packageId) ??
    packageTypes[1] ??
    packageTypes[0];

  const handleSelectService = (s: Service) => {
    setService(s);
  };

  const handleSelectPackage = (id: string) => {
    setCourier({ packageId: id });
  };

  const handleGetQuote = () => {
    if (!state.courier.dropId) {
      showToast("Please enter the delivery address.");
      push({ name: "places", mode: "courierDrop" });
      return;
    }
    push({ name: "detail", service: "courier" });
  };

  const handleTrack = () => {
    const courierOrder = state.orders.find(
      (o) =>
        o.service === "courier" &&
        (o.id.toLowerCase() === trackInput.trim().toLowerCase() ||
          !trackInput.trim())
    );
    if (courierOrder) {
      push({ name: "status", orderId: courierOrder.id, view: "tracking" });
    } else {
      showToast("Tracking active courier order RR10418.");
      push({ name: "status", orderId: "RR10418", view: "tracking" });
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Section (Figma .courier-hero) */}
      <ImageBackground
        source={{ uri: PHOTOS.rider }}
        style={styles.hero}
        resizeMode="cover"
      >
        <View style={styles.heroOverlay} />
        <Header dark />
        <ServiceTabs service="courier" onSelect={handleSelectService} />
        <View style={styles.heroCopy}>
          <Text style={styles.heroKicker}>FAST · SAFE · RELIABLE</Text>
          <Text style={styles.heroTitle}>
            Send anything,{"\n"}anywhere.
          </Text>
          <View style={styles.heroBadge}>
            <Text style={styles.heroSub}>Doorstep pickup in minutes</Text>
          </View>
        </View>
      </ImageBackground>

      {/* Main Sheet (Figma .courier-sheet) */}
      <View style={styles.sheet}>
        {/* Segment */}
        <View style={styles.segment}>
          <Pressable
            onPress={() => setSegment("send")}
            style={[
              styles.segmentBtn,
              segment === "send" && styles.segmentBtnActive,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                segment === "send" && styles.segmentTextActive,
              ]}
            >
              Send package
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setSegment("track")}
            style={[
              styles.segmentBtn,
              segment === "track" && styles.segmentBtnActive,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                segment === "track" && styles.segmentTextActive,
              ]}
            >
              Track package
            </Text>
          </Pressable>
        </View>

        {segment === "send" ? (
          <>
            <LocationRows courier />

            {/* Package Type (Figma .package-grid) */}
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeading}>
                <Text style={styles.sectionTitle}>Package type</Text>
              </View>

              <View style={styles.packageGrid}>
                {packageTypes.map((pkg) => {
                  const isSelected = pkg.id === selectedPackage.id;
                  return (
                    <Pressable
                      key={pkg.id || pkg.name}
                      onPress={() => handleSelectPackage(pkg.id)}
                      style={[
                        styles.packageCard,
                        isSelected && styles.packageCardActive,
                      ]}
                    >
                      <View
                        style={[
                          styles.packageBadge,
                          isSelected && styles.packageBadgeActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.packageBadgeText,
                            isSelected && styles.packageBadgeTextActive,
                          ]}
                        >
                          {pkg.abbr}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.packageName,
                          isSelected && styles.packageNameActive,
                        ]}
                      >
                        {pkg.name}
                      </Text>
                      <Text style={styles.packageWeight}>{pkg.weight}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Price Estimate Card (Figma .estimate) */}
            <View style={styles.estimateCard}>
              <Text style={styles.estimateSub}>ESTIMATED PRICE</Text>
              <Text style={styles.estimateTitle}>{selectedPackage.range}</Text>
              <Text style={styles.estimateDelivery}>Delivery in 35–45 min</Text>
              <Button
                onPress={handleGetQuote}
                accentColor="#ef801f"
              >
                <Text style={styles.ctaText}>Continue to booking</Text>
                <Icon name="arrow" size={18} color="#ffffff" />
              </Button>
            </View>
          </>
        ) : (
          <View style={styles.trackSection}>
            <Text style={styles.trackSub}>
              Enter your RoadRider tracking number or parcel code:
            </Text>
            <View style={styles.trackInputRow}>
              <TextInput
                value={trackInput}
                onChangeText={setTrackInput}
                placeholder="e.g. RR10418"
                placeholderTextColor={colors.muted}
                style={styles.trackInput}
                autoCapitalize="characters"
              />
              <Pressable onPress={handleTrack} style={styles.trackBtn}>
                <Text style={styles.trackBtnText}>Track</Text>
              </Pressable>
            </View>

            <View style={styles.trackHelper}>
              <Text style={styles.trackHelperText}>
                Active test tracking code: <Text style={styles.boldCode}>RR10418</Text>
              </Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f5f2",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  hero: {
    height: 250,
    backgroundColor: "#171514",
    position: "relative",
    justifyContent: "space-between",
    paddingBottom: 22,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(20, 8, 5, 0.55)",
  },
  heroCopy: {
    paddingHorizontal: 18,
    zIndex: 1,
  },
  heroKicker: {
    fontSize: 7,
    fontWeight: "700",
    color: "#ffb880",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 23,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.6,
    lineHeight: 27,
    marginBottom: 6,
  },
  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  heroSub: {
    color: "#ffffff",
    fontSize: 8,
    fontWeight: "700",
  },
  sheet: {
    backgroundColor: "#faf9f7",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -18,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 30,
    zIndex: 2,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: "#ffffff14",
    borderWidth: 1,
    borderColor: "#e5e0d8",
    borderRadius: 13,
    padding: 4,
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
    backgroundColor: "#ef801f",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  segmentText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
  },
  segmentTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  sectionWrap: {
    marginTop: 14,
  },
  sectionHeading: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.4,
  },
  packageGrid: {
    flexDirection: "row",
    gap: 7,
  },
  packageCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e9e4df",
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  packageCardActive: {
    borderColor: "#ef801f",
    backgroundColor: "#fff0de",
  },
  packageBadge: {
    width: 30,
    height: 26,
    borderRadius: 6,
    backgroundColor: "#f1eeeb",
    alignItems: "center",
    justifyContent: "center",
  },
  packageBadgeActive: {
    backgroundColor: "#ef801f",
  },
  packageBadgeText: {
    fontSize: 8,
    fontWeight: "700",
    color: colors.ink,
  },
  packageBadgeTextActive: {
    color: "#ffffff",
  },
  packageName: {
    fontSize: 8,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 5,
    textAlign: "center",
  },
  packageNameActive: {
    color: "#b95211",
  },
  packageWeight: {
    fontSize: 6,
    color: "#948e89",
    marginTop: 2,
    textAlign: "center",
  },
  estimateCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 18,
    padding: 16,
  },
  estimateSub: {
    fontSize: 7,
    fontWeight: "700",
    color: "#8c8580",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  estimateTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.ink,
    marginTop: 2,
  },
  estimateDelivery: {
    fontSize: 8,
    color: "#8c8580",
    marginTop: 2,
    marginBottom: 14,
  },
  ctaText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    marginRight: 6,
  },
  trackSection: {
    paddingVertical: 14,
  },
  trackSub: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 12,
  },
  trackInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  trackInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    fontSize: 13,
    color: colors.ink,
    fontWeight: "700",
  },
  trackBtn: {
    paddingHorizontal: 20,
    height: 48,
    backgroundColor: "#ef801f",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  trackBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  trackHelper: {
    marginTop: 14,
    padding: 12,
    backgroundColor: "#f0ece7",
    borderRadius: 10,
  },
  trackHelperText: {
    fontSize: 11,
    color: colors.muted,
  },
  boldCode: {
    color: colors.ink,
    fontWeight: "700",
  },
});

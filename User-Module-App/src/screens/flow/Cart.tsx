import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FlowHeader from "../../components/FlowHeader";
import BillSummary from "../../components/BillSummary";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import LocationRows from "../../components/LocationRows";
import { PACKAGE_TYPES, RIDE_OPTIONS, type Service } from "../../data/demo";
import { rupees, validatePromo } from "../../lib/pricing";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { colors } from "../../theme/tokens";

interface CartProps {
  service: Service;
}

const SERVICE_THEMES: Record<
  Service,
  { accent: string; accentSoft: string }
> = {
  food: { accent: "#c84b31", accentSoft: "#f8e7e2" },
  rides: { accent: "#3983f7", accentSoft: "rgba(57, 131, 247, 0.16)" },
  grocery: { accent: "#318454", accentSoft: "#e5f3e8" },
  courier: { accent: "#ef801f", accentSoft: "#fff0de" },
};

export default function Cart({ service }: CartProps) {
  const { push } = useNav();
  const {
    state,
    changeQty,
    itemTotal,
    applyPromo,
    showToast,
    setCourier,
    setRide,
  } = useApp();
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoInput, setPromoInput] = useState("");

  const theme = SERVICE_THEMES[service] ?? SERVICE_THEMES.food;
  const rawTotal = itemTotal(service);
  const fallbackCourierPrice =
    PACKAGE_TYPES.find((p) => p.id === state.courier.packageId)?.price ?? 139;
  const total =
    service === "courier" && rawTotal <= 0 ? fallbackCourierPrice : rawTotal;
  const appliedPromo = state.promos[service] ?? null;

  const handleApplyPromoCode = () => {
    const res = validatePromo(promoInput, service, state.usedPromos, total);
    if (!res.ok) {
      showToast(res.error);
      return;
    }
    applyPromo(service, res.code);
    showToast(`Code ${res.code} applied successfully!`);
    setShowPromoModal(false);
    setPromoInput("");
  };

  const handleRemovePromo = () => {
    applyPromo(service, null);
    showToast("Promo removed");
  };

  const handleCourierNext = () => {
    const currentIndex = PACKAGE_TYPES.findIndex(
      (p) => p.id === (state.courier.packageId || "small")
    );
    if (currentIndex < PACKAGE_TYPES.length - 1) {
      const nextPkg = PACKAGE_TYPES[currentIndex + 1];
      setCourier({ packageId: nextPkg.id });
      showToast(`Selected ${nextPkg.name} (${nextPkg.weight})`);
    } else {
      showToast("Maximum package tier reached");
    }
  };

  const handleCourierPrev = () => {
    const currentIndex = PACKAGE_TYPES.findIndex(
      (p) => p.id === (state.courier.packageId || "small")
    );
    if (currentIndex > 0) {
      const prevPkg = PACKAGE_TYPES[currentIndex - 1];
      setCourier({ packageId: prevPkg.id });
      showToast(`Selected ${prevPkg.name} (${prevPkg.weight})`);
    } else {
      showToast("Minimum package tier reached");
    }
  };

  const handleRideNext = () => {
    const currentIndex = RIDE_OPTIONS.findIndex(
      (r) => r.id === (state.ride.optionId || "auto")
    );
    if (currentIndex < RIDE_OPTIONS.length - 1) {
      const nextOpt = RIDE_OPTIONS[currentIndex + 1];
      setRide({ optionId: nextOpt.id });
      showToast(`Switched vehicle to ${nextOpt.name}`);
    } else {
      showToast("Highest vehicle tier selected");
    }
  };

  const handleRidePrev = () => {
    const currentIndex = RIDE_OPTIONS.findIndex(
      (r) => r.id === (state.ride.optionId || "auto")
    );
    if (currentIndex > 0) {
      const prevOpt = RIDE_OPTIONS[currentIndex - 1];
      setRide({ optionId: prevOpt.id });
      showToast(`Switched vehicle to ${prevOpt.name}`);
    } else {
      showToast("Lowest vehicle tier selected");
    }
  };

  const handleContinue = () => {
    if (total <= 0) {
      showToast("Your cart is empty. Please add items.");
      return;
    }
    if (!state.authenticated && !state.isGuest) {
      showToast("Please sign in to proceed with your order");
      push({ name: "phone" });
      return;
    }
    if (service === "rides") {
      push({ name: "payment", service: "rides" });
    } else if (service === "courier") {
      if (!state.courier.dropId) {
        showToast("Please select a delivery location for courier");
        push({ name: "places", mode: "courierDrop" });
        return;
      }
      push({ name: "payment", service: "courier" });
    } else {
      push({ name: "address", service });
    }
  };

  const title = service === "rides" ? "Finding your driver" : "Your cart";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <FlowHeader title={title} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cart Line Items */}
        {service === "food" || service === "grocery" ? (
          <>
            {state.carts[service].lines.length === 0 ? (
              <View style={styles.emptyCartCard}>
                <Text style={styles.emptyCartText}>
                  Your {service} cart is currently empty.
                </Text>
                <TouchableOpacity
                  onPress={() => push({ name: "detail", service })}
                  style={styles.browseBtn}
                >
                  <Text style={[styles.browseBtnText, { color: theme.accent }]}>
                    Browse items
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              state.carts[service].lines.map((line) => (
                <View key={line.id} style={styles.cartItem}>
                  <View
                    style={[
                      styles.itemThumb,
                      { backgroundColor: theme.accentSoft },
                    ]}
                  >
                    <Icon
                      name={service === "food" ? "food" : "bag"}
                      size={20}
                      color={theme.accent}
                    />
                  </View>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName}>{line.name}</Text>
                    <Text style={styles.itemSubtitle}>{line.subtitle}</Text>
                    <Text style={styles.itemPrice}>
                      {rupees(line.price * line.qty)}
                    </Text>
                  </View>
                  <View style={[styles.stepper, { borderColor: theme.accent }]}>
                    <TouchableOpacity
                      onPress={() => changeQty(service, line.id, -1)}
                      style={styles.stepperBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={[styles.stepperBtnText, { color: theme.accent }]}>
                        −
                      </Text>
                    </TouchableOpacity>
                    <Text style={[styles.stepperQty, { color: theme.accent }]}>
                      {line.qty}
                    </Text>
                    <TouchableOpacity
                      onPress={() => changeQty(service, line.id, 1)}
                      style={styles.stepperBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={[styles.stepperBtnText, { color: theme.accent }]}>
                        +
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        ) : service === "rides" ? (
          (() => {
            const opt =
              RIDE_OPTIONS.find((r) => r.id === state.ride.optionId) ??
              RIDE_OPTIONS[1];
            const currentIndex = RIDE_OPTIONS.findIndex((r) => r.id === opt.id);
            return (
              <View style={styles.serviceCartCard}>
                <View style={styles.cartItem}>
                  <View
                    style={[
                      styles.itemThumb,
                      { backgroundColor: theme.accentSoft },
                    ]}
                  >
                    <Icon name="car" size={20} color={theme.accent} />
                  </View>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName}>{opt.name}</Text>
                    <Text style={styles.itemSubtitle}>{opt.tagline}</Text>
                    <Text style={styles.itemPrice}>{rupees(opt.fare)}</Text>
                  </View>
                  <View style={[styles.stepper, { borderColor: theme.accent }]}>
                    <TouchableOpacity
                      onPress={handleRidePrev}
                      style={styles.stepperBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.stepperBtnText,
                          { color: theme.accent },
                        ]}
                      >
                        −
                      </Text>
                    </TouchableOpacity>
                    <Text style={[styles.stepperQty, { color: theme.accent }]}>
                      {currentIndex + 1}
                    </Text>
                    <TouchableOpacity
                      onPress={handleRideNext}
                      style={styles.stepperBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.stepperBtnText,
                          { color: theme.accent },
                        ]}
                      >
                        +
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Ride Route details */}
                <View style={styles.routeContainer}>
                  <LocationRows courier={false} />
                </View>
              </View>
            );
          })()
        ) : (
          (() => {
            const pkg =
              PACKAGE_TYPES.find((p) => p.id === state.courier.packageId) ??
              PACKAGE_TYPES[1];
            const currentIndex = PACKAGE_TYPES.findIndex(
              (p) => p.id === pkg.id
            );
            return (
              <View style={styles.serviceCartCard}>
                <View style={styles.cartItem}>
                  <View
                    style={[
                      styles.itemThumb,
                      { backgroundColor: theme.accentSoft },
                    ]}
                  >
                    <Icon name="box" size={20} color={theme.accent} />
                  </View>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName}>
                      {pkg.name} ({pkg.weight})
                    </Text>
                    <Text style={styles.itemSubtitle}>
                      Standard delivery · {pkg.time}
                    </Text>
                    <Text style={styles.itemPrice}>{rupees(pkg.price)}</Text>
                  </View>
                  <View style={[styles.stepper, { borderColor: theme.accent }]}>
                    <TouchableOpacity
                      onPress={handleCourierPrev}
                      style={styles.stepperBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.stepperBtnText,
                          { color: theme.accent },
                        ]}
                      >
                        −
                      </Text>
                    </TouchableOpacity>
                    <Text style={[styles.stepperQty, { color: theme.accent }]}>
                      {currentIndex + 1}
                    </Text>
                    <TouchableOpacity
                      onPress={handleCourierNext}
                      style={styles.stepperBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.stepperBtnText,
                          { color: theme.accent },
                        ]}
                      >
                        +
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Package Quick Selectors */}
                <View style={styles.packageTiersRow}>
                  {PACKAGE_TYPES.map((p) => {
                    const isSelected = p.id === pkg.id;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => {
                          setCourier({ packageId: p.id });
                          showToast(`Selected ${p.name}`);
                        }}
                        style={[
                          styles.packageTierChip,
                          isSelected && [
                            styles.packageTierChipActive,
                            {
                              borderColor: theme.accent,
                              backgroundColor: theme.accentSoft,
                            },
                          ],
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.packageTierChipText,
                            isSelected && {
                              color: theme.accent,
                              fontWeight: "700",
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {p.name.split(" ")[0]} ({p.weight.replace("Up to ", "")})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Route Summary */}
                <View style={styles.routeContainer}>
                  <LocationRows courier />
                </View>
              </View>
            );
          })()
        )}

        {/* Promo code button matching Figma */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setShowPromoModal(true)}
          style={styles.promoRow}
        >
          <View
            style={[
              styles.promoBadge,
              { backgroundColor: theme.accentSoft },
            ]}
          >
            <Text style={[styles.promoBadgeText, { color: theme.accent }]}>
              %
            </Text>
          </View>
          <View style={styles.promoTextContainer}>
            <Text style={styles.promoTitle}>
              {appliedPromo
                ? `Promo ${appliedPromo} applied`
                : "Apply a promo code"}
            </Text>
            <Text style={styles.promoSubtitle}>
              {appliedPromo
                ? "Tap to change or remove"
                : "Save more on this order"}
            </Text>
          </View>
          <Icon name="arrow" size={16} color={colors.muted} />
        </TouchableOpacity>

        {/* Bill Summary */}
        <BillSummary service={service} />
      </ScrollView>

      {/* Promo Modal Sheet */}
      <Modal
        visible={showPromoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPromoModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowPromoModal(false)}
        >
          <Pressable
            style={styles.promoDialog}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.dialogHeader}>
              <Text style={styles.dialogTitle}>Enter Coupon Code</Text>
              <TouchableOpacity onPress={() => setShowPromoModal(false)}>
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.promoInputRow}>
              <TextInput
                placeholder="e.g. WELCOME50"
                placeholderTextColor={colors.muted}
                value={promoInput}
                onChangeText={(text) => setPromoInput(text.toUpperCase())}
                autoCapitalize="characters"
                style={styles.promoTextInput}
              />
              <TouchableOpacity
                onPress={handleApplyPromoCode}
                style={[styles.promoApplyBtn, { backgroundColor: theme.accent }]}
              >
                <Text style={styles.promoApplyBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>

            {Boolean(appliedPromo) && (
              <TouchableOpacity
                onPress={handleRemovePromo}
                style={styles.removePromoBtn}
              >
                <Text style={styles.removePromoText}>
                  Remove current code ({appliedPromo})
                </Text>
              </TouchableOpacity>
            )}

            <Text style={styles.promoHint}>
              Available for you: <Text style={styles.boldText}>WELCOME50</Text>{" "}
              (50% off first order)
            </Text>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Bottom Continue Action */}
      <SafeAreaView style={styles.bottomBar} edges={["bottom"]}>
        <Button
          onPress={handleContinue}
          disabled={total <= 0}
          accentColor={theme.accent}
        >
          {service === "rides" || service === "courier"
            ? "Continue to payment"
            : "Continue"}
        </Button>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  serviceCartCard: {
    marginBottom: 8,
  },
  packageTiersRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
  },
  packageTierChip: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ebe7e2",
    alignItems: "center",
    justifyContent: "center",
  },
  packageTierChipActive: {
    borderWidth: 1.5,
  },
  packageTierChipText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#77716e",
    textAlign: "center",
  },
  routeContainer: {
    marginHorizontal: -16,
    marginBottom: 4,
  },
  container: {
    flex: 1,
    backgroundColor: "#faf9f7",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 95,
  },
  emptyCartCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ebe7e2",
    marginTop: 10,
  },
  emptyCartText: {
    fontSize: 12,
    color: "#77716e",
    marginBottom: 12,
  },
  browseBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  browseBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  cartItem: {
    borderWidth: 1,
    borderColor: "#ebe7e2",
    backgroundColor: "#ffffff",
    borderRadius: 17,
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    padding: 13,
    marginBottom: 10,
  },
  itemThumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#171514",
    marginBottom: 3,
  },
  itemSubtitle: {
    fontSize: 9,
    color: "#77716e",
    marginBottom: 5,
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: "700",
    color: "#171514",
  },
  stepper: {
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
  },
  stepperBtn: {
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  stepperBtnText: {
    fontSize: 13,
    fontWeight: "800",
  },
  stepperQty: {
    fontSize: 10,
    fontWeight: "700",
    minWidth: 16,
    textAlign: "center",
  },
  promoRow: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#d8cec5",
    borderRadius: 14,
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    padding: 12,
  },
  promoBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  promoBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  promoTextContainer: {
    flex: 1,
  },
  promoTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#171514",
  },
  promoSubtitle: {
    fontSize: 9,
    color: "#77716e",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  promoDialog: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#ebe7e2",
  },
  dialogHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dialogTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#171514",
  },
  dialogCancelText: {
    fontSize: 12,
    color: "#77716e",
  },
  promoInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  promoTextInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ebe7e2",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#171514",
  },
  promoApplyBtn: {
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  promoApplyBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  removePromoBtn: {
    marginTop: 8,
  },
  removePromoText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#dc2626",
  },
  promoHint: {
    marginTop: 12,
    fontSize: 11,
    color: "#77716e",
  },
  boldText: {
    fontWeight: "700",
    color: "#171514",
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

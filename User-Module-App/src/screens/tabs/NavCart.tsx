import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import UtilityHeader from "../../components/UtilityHeader";
import LocationRows from "../../components/LocationRows";
import BillSummary from "../../components/BillSummary";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import GlobalLocationHeader from "../../components/GlobalLocationHeader";
import {
  PACKAGE_TYPES,
  RIDE_OPTIONS,
  serviceMeta,
} from "../../data/demo";
import { rupees } from "../../lib/pricing";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { colors } from "../../theme/tokens";
import { useServiceTheme } from "../../theme/themes";
import CouponBottomSheet from "../../components/CouponBottomSheet";

export default function NavCart() {
  const { push, switchTab } = useNav();
  const { state, changeQty, itemTotal, applyPromo, showToast } = useApp();
  const service = state.service;
  const theme = useServiceTheme(service);
  const [showPromoSheet, setShowPromoSheet] = useState(false);

  const total = itemTotal(service);
  const appliedPromo = state.promos[service] ?? null;

  const getServiceContent = () => {
    switch (service) {
      case "food": {
        const lines = state.carts.food.lines;
        const main = lines[0];
        if (!main) {
          return {
            title: "Your food cart",
            subtitle: "No items yet",
            item: "Your cart is empty",
            detail: "Explore dishes from approved restaurants",
            price: rupees(0),
            icon: "food" as const,
            qty: 0,
            id: "empty",
            isEmpty: true,
          };
        }
        return {
          title: "Your food cart",
          subtitle: main.subtitle || "Approved Restaurant",
          item: main.name,
          detail: `${lines.length} item${lines.length > 1 ? "s" : ""} · Total ${rupees(total)}`,
          price: rupees(total),
          icon: "food" as const,
          qty: main.qty,
          id: main.id,
          isEmpty: false,
        };
      }
      case "rides": {
        const opt =
          RIDE_OPTIONS.find((r) => r.id === state.ride.optionId) ??
          RIDE_OPTIONS[1];
        return {
          title: "Current ride",
          subtitle: "Booking summary",
          item: `${opt.name} to Gomti Nagar`,
          detail: `Pickup: Hazratganj · ${opt.eta} away`,
          price: rupees(opt.fare),
          icon: "car" as const,
          qty: 1,
          id: opt.id,
          isEmpty: false,
        };
      }
      case "grocery": {
        const lines = state.carts.grocery.lines;
        const main = lines[0];
        if (!main) {
          return {
            title: "Your grocery cart",
            subtitle: "No items yet",
            item: "Your basket is empty",
            detail: "Explore fresh grocery essentials",
            price: rupees(0),
            icon: "bag" as const,
            qty: 0,
            id: "empty",
            isEmpty: true,
          };
        }
        const count = lines.reduce((n, l) => n + l.qty, 0);
        return {
          title: "Your grocery cart",
          subtitle: `${count} item${count > 1 ? "s" : ""}`,
          item: main.name,
          detail: `${lines.length} unique item${lines.length > 1 ? "s" : ""} · Express delivery`,
          price: rupees(total),
          icon: "bag" as const,
          qty: count,
          id: main.id,
          isEmpty: false,
        };
      }
      case "courier": {
        const pkg =
          PACKAGE_TYPES.find((p) => p.id === state.courier.packageId) ??
          PACKAGE_TYPES[1];
        return {
          title: "Package in progress",
          subtitle: "Your delivery quote",
          item: `${pkg.name} · ${pkg.weight}`,
          detail: "Hazratganj to Gomti Nagar · 6.2 km",
          price: rupees(pkg.price),
          icon: "box" as const,
          qty: 1,
          id: pkg.id,
          isEmpty: false,
        };
      }
    }
  };

  const content = getServiceContent();

  const handleCheckout = () => {
    push({ name: "cart", service });
  };

  const handleBrowse = () => {
    switchTab("home");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <UtilityHeader
        title={content.title}
        subtitle={serviceMeta[service].label.toUpperCase()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Delivery Location Selection Header */}
        <View style={styles.locationBarContainer}>
          <GlobalLocationHeader />
        </View>

        {/* Figma Context Chip */}
        <View style={[styles.contextChip, { backgroundColor: theme.primarySoft }]}>
          <View style={styles.contextChipIconCircle}>
            <Icon name={content.icon} size={15} color={theme.primary} />
          </View>
          <Text style={[styles.contextChipText, { color: theme.primary }]}>
            {serviceMeta[service].label}
          </Text>
        </View>

        {/* Figma Dark Nav Cart Card */}
        <View style={styles.navCartCard}>
          <View style={[styles.navCartIcon, { backgroundColor: theme.primary }]}>
            <Icon name={content.icon} size={25} color="#ffffff" />
          </View>
          <View style={styles.navCartDetails}>
            <Text style={[styles.navCartSubtitle, { color: theme.primary }]}>{content.subtitle}</Text>
            <Text style={styles.navCartTitle}>{content.item}</Text>
            <Text style={styles.navCartDetail}>{content.detail}</Text>
            <Text style={styles.navCartPrice}>{content.price}</Text>
          </View>
        </View>

        {/* Quantity Steppers per line (Food / Grocery) or Route Summary (Rides / Courier) */}
        {(service === "food" || service === "grocery") && state.carts[service].lines.length > 0 ? (
          <View style={styles.cartLinesContainer}>
            {state.carts[service].lines.map((line) => (
              <View key={line.id} style={styles.lineItemRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.lineItemTitle}>{line.name}</Text>
                  <Text style={styles.lineItemSub}>
                    {rupees(line.price)} × {line.qty} = {rupees(line.price * line.qty)}
                  </Text>
                </View>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    onPress={() => changeQty(service, line.id, -1)}
                    style={styles.stepperBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.stepperBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepperQty}>{line.qty}</Text>
                  <TouchableOpacity
                    onPress={() => changeQty(service, line.id, 1)}
                    style={styles.stepperBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.stepperBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : service === "rides" || service === "courier" ? (
          <View style={styles.routeSummary}>
            <LocationRows courier={service === "courier"} />
          </View>
        ) : null}

        {/* Promo code button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setShowPromoSheet(true)}
          style={styles.promoRow}
        >
          <View style={[styles.promoBadge, { backgroundColor: theme.primarySoft }]}>
            <Text style={[styles.promoBadgeText, { color: theme.primary }]}>%</Text>
          </View>
          <View style={styles.promoTextContainer}>
            <Text style={styles.promoTitle}>
              {appliedPromo ? `Promo ${appliedPromo} applied` : "Apply a promo code"}
            </Text>
            <Text style={styles.promoSubtitle}>
              {appliedPromo ? "Tap to change or remove" : "Save more with available coupons"}
            </Text>
          </View>
          <Icon name="arrow" size={14} color="#77716e" />
        </TouchableOpacity>

        <BillSummary service={service} />

        <CouponBottomSheet
          visible={showPromoSheet}
          onClose={() => setShowPromoSheet(false)}
          service={service}
          storeId={service === "food" ? state.carts.food.storeId : undefined}
          cartTotal={total}
          appliedPromo={appliedPromo}
          usedPromos={state.usedPromos}
          onApply={(code) => {
            applyPromo(service, code);
            showToast(`Coupon ${code} applied successfully!`);
          }}
          onRemove={() => {
            applyPromo(service, null);
            showToast("Coupon removed.");
          }}
        />

        <TouchableOpacity onPress={handleBrowse} style={styles.browseLink} activeOpacity={0.7}>
          <Text style={[styles.browseLinkText, { color: theme.primary }]}>
            Browse more in {serviceMeta[service].label}
          </Text>
        </TouchableOpacity>

        <View style={styles.utilityAction}>
          <Button
            accentColor={theme.primary}
            onPress={
              content.qty > 0 || service === "rides" || service === "courier"
                ? handleCheckout
                : handleBrowse
            }
          >
            {content.qty > 0 || service === "rides" || service === "courier"
              ? `Proceed to checkout · ${content.price}`
              : `Explore ${serviceMeta[service].label}`}
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f5f2",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 90,
  },
  locationBarContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  contextChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.accentSoft,
    paddingVertical: 5,
    paddingRight: 9,
    paddingLeft: 6,
    borderRadius: 20,
    marginBottom: 10,
  },
  contextChipIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  contextChipText: {
    fontSize: 8,
    fontWeight: "700",
    color: colors.accent,
  },
  navCartCard: {
    backgroundColor: "#211e1c",
    borderRadius: 19,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    shadowColor: "#291f19",
    shadowOpacity: 0.13,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 30,
    elevation: 5,
  },
  navCartIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  navCartDetails: {
    flex: 1,
  },
  navCartSubtitle: {
    color: colors.accent,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    fontSize: 7,
    fontWeight: "700",
    marginBottom: 2,
  },
  navCartTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 3,
  },
  navCartDetail: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 8,
  },
  navCartPrice: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 7,
  },
  cartLinesContainer: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  lineItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f3f0",
  },
  lineItemTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
  },
  lineItemSub: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 2,
  },
  quantityRow: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    height: 54,
    marginTop: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  quantityLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.ink,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#f5f3f0",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
  },
  stepperQty: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
    minWidth: 16,
    textAlign: "center",
  },
  routeSummary: {
    marginTop: 10,
  },
  promoRow: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#d8cec5",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    marginBottom: 4,
    padding: 12,
  },
  promoBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  promoBadgeText: {
    fontSize: 13,
    fontWeight: "800",
  },
  promoTextContainer: {
    flex: 1,
  },
  promoTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#171514",
  },
  promoSubtitle: {
    fontSize: 10,
    color: "#77716e",
    marginTop: 1,
  },
  browseLink: {
    alignSelf: "center",
    marginVertical: 15,
  },
  browseLinkText: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: "700",
  },
  utilityAction: {
    marginTop: 10,
  },
});

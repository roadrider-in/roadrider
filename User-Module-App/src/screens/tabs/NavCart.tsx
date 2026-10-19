import React from "react";
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
import {
  PACKAGE_TYPES,
  RESTAURANTS,
  RIDE_OPTIONS,
  serviceMeta,
} from "../../data/demo";
import { rupees } from "../../lib/pricing";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { colors } from "../../theme/tokens";

export default function NavCart() {
  const { push, switchTab } = useNav();
  const { state, changeQty, itemTotal } = useApp();
  const service = state.service;

  const total = itemTotal(service);

  const getServiceContent = () => {
    switch (service) {
      case "food": {
        const lines = state.carts.food.lines;
        const main = lines[0] ?? {
          name: "Lucknowi Chicken Biryani",
          subtitle: "Royal Biryani House",
          price: 289,
          qty: 1,
        };
        const store =
          RESTAURANTS.find((r) => r.id === state.carts.food.storeId) ??
          RESTAURANTS[0];
        return {
          title: "Your food cart",
          subtitle: store.name,
          item: main.name,
          detail: `${lines.length || 1} item · Delivery in ${store.eta}`,
          price: rupees(total > 0 ? total : 289),
          icon: "food" as const,
          qty: main.qty,
          id: main.id,
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
        };
      }
      case "grocery": {
        const lines = state.carts.grocery.lines;
        const count = lines.reduce((n, l) => n + l.qty, 0) || 2;
        return {
          title: "Your grocery cart",
          subtitle: `${count} daily essentials`,
          item: "Fresh produce basket",
          detail: "Tomatoes, organic broccoli · 15 min",
          price: rupees(total > 0 ? total : 328),
          icon: "bag" as const,
          qty: count,
          id: lines[0]?.id ?? "gr-tomatoes",
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
        {/* Figma Context Chip */}
        <View style={styles.contextChip}>
          <View style={styles.contextChipIconCircle}>
            <Icon name={content.icon} size={15} color={colors.accent} />
          </View>
          <Text style={styles.contextChipText}>
            {serviceMeta[service].label}
          </Text>
        </View>

        {/* Figma Dark Nav Cart Card */}
        <View style={styles.navCartCard}>
          <View style={styles.navCartIcon}>
            <Icon name={content.icon} size={25} color="#ffffff" />
          </View>
          <View style={styles.navCartDetails}>
            <Text style={styles.navCartSubtitle}>{content.subtitle}</Text>
            <Text style={styles.navCartTitle}>{content.item}</Text>
            <Text style={styles.navCartDetail}>{content.detail}</Text>
            <Text style={styles.navCartPrice}>{content.price}</Text>
          </View>
        </View>

        {/* Quantity Stepper (Food / Grocery) or Route Summary (Rides / Courier) */}
        {service === "food" || service === "grocery" ? (
          <View style={styles.quantityRow}>
            <Text style={styles.quantityLabel}>Quantity</Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                onPress={() => changeQty(service, content.id, -1)}
                style={styles.stepperBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.stepperBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepperQty}>{content.qty}</Text>
              <TouchableOpacity
                onPress={() => changeQty(service, content.id, 1)}
                style={styles.stepperBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.stepperBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.routeSummary}>
            <LocationRows courier={service === "courier"} />
          </View>
        )}

        <BillSummary service={service} />

        <TouchableOpacity onPress={handleBrowse} style={styles.browseLink} activeOpacity={0.7}>
          <Text style={styles.browseLinkText}>
            Browse more in {serviceMeta[service].label}
          </Text>
        </TouchableOpacity>

        <View style={styles.utilityAction}>
          <Button onPress={handleCheckout}>
            Proceed to checkout · {content.price}
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

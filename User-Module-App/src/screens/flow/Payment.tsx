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
import FlowHeader from "../../components/FlowHeader";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import type { Service } from "../../data/demo";
import { computeBill, rupees } from "../../lib/pricing";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";

interface PaymentProps {
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

export default function Payment({ service }: PaymentProps) {
  const { push } = useNav();
  const { state, itemTotal, placeOrder, placeById, showToast } = useApp();
  const [selectedMethod, setSelectedMethod] = useState<
    "wallet" | "upi" | "card" | "cod"
  >("wallet");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const theme = SERVICE_THEMES[service] ?? SERVICE_THEMES.food;
  const total = itemTotal(service);
  const bill = computeBill(service, total, state.promos[service] ?? null);

  const currentPlace =
    placeById(state.defaultPlaceId) ??
    state.places[0] ?? {
      label: "Home",
      line: "15, Shahnajaf Road, Hazratganj",
    };
  const destination =
    service === "rides"
      ? `${placeById(state.ride.dropId)?.area ?? "Gomti Nagar, Lucknow"}`
      : `${currentPlace.label} · ${currentPlace.line}`;

  const handlePay = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      let finalMethod = selectedMethod;
      if (selectedMethod === "wallet") {
        if (state.wallet.balance < bill.toPay) {
          // If wallet has insufficient funds, notify and smoothly proceed with COD
          showToast(
            `Insufficient wallet balance. Completing booking with Cash on Delivery.`
          );
          finalMethod = "cod";
        }
      } else if (selectedMethod === "card" || selectedMethod === "upi") {
        // In prototype mode, simulate online payment via COD/Wallet order record
        finalMethod = "cod";
      }

      const res = await placeOrder(service, finalMethod as any, destination);
      if (!res.ok) {
        showToast(res.error);
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
      push({ name: "status", orderId: res.order.id, view: "confirmed" });
    } catch (err: any) {
      showToast(err?.message || "Order creation failed.");
      setIsSubmitting(false);
    }
  };

  const methods: {
    id: "wallet" | "upi" | "card" | "cod";
    icon: "card" | "box";
    label: string;
    sub: string;
  }[] = [
    {
      id: "wallet",
      icon: "card",
      label: "RoadRider Wallet",
      sub: `Balance ₹${state.wallet?.balance ?? 320}`,
    },
    {
      id: "upi",
      icon: "card",
      label: "UPI",
      sub: "Google Pay, PhonePe and more",
    },
    {
      id: "card",
      icon: "card",
      label: "Credit or debit card",
      sub: "Visa, Mastercard, RuPay",
    },
    {
      id: "cod",
      icon: "box",
      label: "Cash on Delivery",
      sub: "Pay on arrival at your destination",
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <FlowHeader title="Payment" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Dynamic Total Card matching Figma */}
        <View
          style={[
            styles.totalCard,
            { backgroundColor: theme.accent, shadowColor: theme.accent },
          ]}
        >
          <Text style={styles.totalSmall}>TOTAL TO PAY</Text>
          <Text style={styles.totalValue}>{rupees(bill.toPay)}</Text>
          <Text style={styles.totalSpan}>Secure checkout</Text>
        </View>

        {/* Section Heading matching Figma */}
        <View style={styles.sectionHeading}>
          <Text style={styles.headingTitle}>Payment method</Text>
        </View>

        {/* Payment Methods matching Figma */}
        <View style={styles.methodsList}>
          {methods.map(({ id, icon, label, sub }) => {
            const isSelected = selectedMethod === id;
            return (
              <TouchableOpacity
                key={id}
                activeOpacity={0.8}
                onPress={() => setSelectedMethod(id)}
                style={[
                  styles.paymentCard,
                  isSelected && {
                    borderColor: theme.accent,
                    backgroundColor: theme.accentSoft,
                  },
                ]}
              >
                <View
                  style={[
                    styles.cardIconBox,
                    { backgroundColor: theme.accentSoft },
                  ]}
                >
                  <Icon name={icon} size={18} color={theme.accent} />
                </View>
                <View style={styles.cardDetails}>
                  <Text style={styles.cardTitle}>{label}</Text>
                  <Text style={styles.cardSubtitle}>{sub}</Text>
                </View>
                <View
                  style={[
                    styles.radioDot,
                    isSelected && {
                      borderWidth: 4,
                      borderColor: theme.accent,
                    },
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Pay CTA matching Figma */}
      <SafeAreaView style={styles.bottomBar} edges={["bottom"]}>
        <Button
          onPress={handlePay}
          disabled={isSubmitting}
          accentColor={theme.accent}
        >
          {isSubmitting ? "Processing..." : `Pay ${rupees(bill.toPay)}`}
        </Button>
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
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 95,
  },
  totalCard: {
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.25,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  totalSmall: {
    fontSize: 8,
    fontWeight: "700",
    color: "#ffffff",
    opacity: 0.7,
    letterSpacing: 1,
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 30,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  totalSpan: {
    fontSize: 8,
    color: "#ffffff",
    opacity: 0.7,
    marginTop: 4,
  },
  sectionHeading: {
    marginTop: 20,
    marginBottom: 10,
  },
  headingTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#171514",
  },
  methodsList: {
    gap: 9,
  },
  paymentCard: {
    borderWidth: 1,
    borderColor: "#ebe7e2",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 13,
  },
  cardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardDetails: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#171514",
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

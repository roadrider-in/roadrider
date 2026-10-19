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
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import { rupees } from "../../lib/pricing";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import type { Service } from "../../data/demo";

interface OrderCompleteProps {
  orderId: string;
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

export default function OrderComplete({ orderId }: OrderCompleteProps) {
  const { reset } = useNav();
  const { state, rateOrder, showToast } = useApp();

  const order = state.orders.find((o) => o.id === orderId) ?? state.orders[0];
  const service: Service = order?.service ?? "food";
  const theme = SERVICE_THEMES[service] ?? SERVICE_THEMES.food;
  const isRide = service === "rides";

  const [selectedRating, setSelectedRating] = useState<number>(
    order?.rating ?? 5
  );

  const totalPaid = order ? rupees(order.bill.toPay) : isRide ? "₹96" : "₹289";

  const handleRate = (stars: number) => {
    setSelectedRating(stars);
    if (order) {
      rateOrder(order.id, stars);
    }
    showToast(`Thanks for rating ${stars} stars!`);
  };

  const handleBackToHome = () => {
    reset([{ name: "mainTabs" }]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Mark matching Figma */}
        <View
          style={[
            styles.successMark,
            { backgroundColor: theme.accentSoft },
          ]}
        >
          <Icon name="check" size={42} color={theme.accent} />
        </View>

        <Text style={[styles.eyebrow, { color: theme.accent }]}>ALL DONE</Text>
        <Text style={styles.title}>
          {isRide ? "Hope you enjoyed\nthe ride!" : "Delivered with care."}
        </Text>
        <Text style={styles.subTitle}>
          {isRide
            ? "You arrived at Gomti Nagar at 4:42 PM."
            : "Thanks for choosing RoadRider. Your order has been completed."}
        </Text>

        {/* Receipt Breakdown Card matching Figma */}
        <View style={styles.receipt}>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Total paid</Text>
            <Text style={styles.receiptAmount}>{totalPaid}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Payment</Text>
            <Text style={styles.receiptMethod}>
              {order?.payment === "card"
                ? "Credit or debit card"
                : order?.payment === "upi"
                ? "UPI"
                : order?.payment === "cod"
                ? "Cash on Delivery"
                : "RoadRider Wallet"}
            </Text>
          </View>
        </View>

        {/* Rating Section matching Figma */}
        <Text style={styles.ratingTitle}>How was your experience?</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              activeOpacity={0.7}
              onPress={() => handleRate(star)}
              style={styles.starBtn}
            >
              <Icon
                name="star"
                size={28}
                filled={star <= selectedRating}
                color={star <= selectedRating ? "#edb63d" : "#ded6d0"}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Back to Home CTA matching Figma */}
        <View style={styles.actionPad}>
          <Button onPress={handleBackToHome} accentColor={theme.accent}>
            Back to home
          </Button>
        </View>
      </ScrollView>
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
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 40,
    alignItems: "center",
  },
  successMark: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 25,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  title: {
    fontSize: 27,
    fontWeight: "800",
    color: "#171514",
    textAlign: "center",
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  subTitle: {
    fontSize: 11,
    color: "#77716e",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
    maxWidth: 290,
  },
  receipt: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ebe7e2",
    borderRadius: 16,
    marginVertical: 24,
    padding: 15,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  receiptLabel: {
    fontSize: 10,
    color: "#77716e",
  },
  receiptAmount: {
    fontSize: 14,
    fontWeight: "800",
    color: "#171514",
  },
  receiptMethod: {
    fontSize: 10,
    fontWeight: "700",
    color: "#171514",
  },
  ratingTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#171514",
    marginTop: 8,
  },
  stars: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    marginBottom: 28,
  },
  starBtn: {
    padding: 4,
  },
  actionPad: {
    width: "100%",
  },
});

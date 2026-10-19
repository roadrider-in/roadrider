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
import FlowHeader from "../../components/FlowHeader";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import BillSummary from "../../components/BillSummary";
import { formatWhen } from "../../lib/format";
import { rupees } from "../../lib/pricing";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { colors, radii } from "../../theme/tokens";

interface OrderDetailProps {
  orderId: string;
}

export default function OrderDetail({ orderId }: OrderDetailProps) {
  const { back, push } = useNav();
  const { state, showToast } = useApp();

  const order =
    state.orders.find((o) => o.id === orderId || o.dbId === orderId) ??
    state.orders[0];
  const isActive = order?.status < 3;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />
      <FlowHeader title="" onBack={back} showHelp={false} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <View style={styles.heroIconBox}>
            <Icon name="list" size={28} color={colors.accent} />
          </View>
          <Text style={styles.heroEyebrow}>ORDER DETAILS</Text>
          <Text style={styles.heroTitle}>
            {order?.title ?? "Order summary"}
          </Text>
          <Text style={styles.heroSub}>
            Order #{order?.id} · {order ? formatWhen(order.createdAt) : "Today"}
          </Text>
        </View>

        {/* Address & Status Card */}
        <View style={styles.cardPad}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardSectionTitle}>Delivery Address</Text>
            <View
              style={[
                styles.statusBadge,
                isActive ? styles.statusBadgeActive : styles.statusBadgeDone,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  isActive
                    ? styles.statusBadgeTextActive
                    : styles.statusBadgeTextDone,
                ]}
              >
                {isActive ? "ACTIVE" : "COMPLETED"}
              </Text>
            </View>
          </View>
          <Text style={styles.cardAddressText}>{order?.destination}</Text>
        </View>

        {/* Items in this Order Card */}
        <View style={styles.cardPad}>
          <Text style={[styles.cardSectionTitle, { marginBottom: 10 }]}>
            Items in this order
          </Text>
          {order?.lines.map((l, i) => (
            <View
              key={i}
              style={[styles.itemLineRow, i > 0 && styles.itemLineBorder]}
            >
              <Text style={styles.itemLineName}>
                {l.qty}x {l.name}
              </Text>
              <Text style={styles.itemLinePrice}>
                {rupees(l.price * l.qty)}
              </Text>
            </View>
          ))}
        </View>

        {/* Bill Summary */}
        {order && (
          <BillSummary service={order.service} billOverride={order.bill} />
        )}

        {/* Action Links */}
        <View style={styles.actionLinksList}>
          {isActive && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                push({
                  name: "status",
                  orderId: order.id,
                  view: "tracking",
                })
              }
              style={styles.actionRow}
            >
              <View style={styles.actionIconBox}>
                <Icon name="pin" size={15} color={colors.accent} />
              </View>
              <Text style={styles.actionRowTitle}>View live tracking</Text>
              <Icon name="arrow" size={16} color={colors.muted} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              showToast(
                `Invoice #${order?.id}.pdf downloaded to your device`
              )
            }
            style={styles.actionRow}
          >
            <View style={styles.actionIconBox}>
              <Icon name="card" size={15} color={colors.accent} />
            </View>
            <Text style={styles.actionRowTitle}>Download invoice</Text>
            <Icon name="arrow" size={16} color={colors.muted} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => push({ name: "help", orderId: order?.id })}
            style={styles.actionRow}
          >
            <View style={styles.actionIconBox}>
              <Icon name="shield" size={15} color={colors.accent} />
            </View>
            <Text style={styles.actionRowTitle}>Get help with this order</Text>
            <Icon name="arrow" size={16} color={colors.muted} />
          </TouchableOpacity>
        </View>

        <View style={styles.actionPad}>
          <Button onPress={back}>Done</Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  heroIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.accent,
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.ink,
    marginTop: 4,
    textAlign: "center",
  },
  heroSub: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
    marginTop: 4,
  },
  cardPad: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeActive: {
    backgroundColor: colors.accentSoft,
  },
  statusBadgeDone: {
    backgroundColor: "#e5f3e8",
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: "700",
  },
  statusBadgeTextActive: {
    color: colors.accent,
  },
  statusBadgeTextDone: {
    color: "#288153",
  },
  cardAddressText: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
  },
  itemLineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
  },
  itemLineBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  itemLineName: {
    fontSize: 12,
    color: colors.ink,
  },
  itemLinePrice: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
  },
  actionLinksList: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
    marginTop: 14,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  actionIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  actionRowTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  actionPad: {
    marginTop: 24,
  },
});

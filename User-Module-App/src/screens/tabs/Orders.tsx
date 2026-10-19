import React, { useEffect, useState } from "react";
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
import Icon from "../../components/Icon";
import { serviceMeta, type Service } from "../../data/demo";
import { formatDay } from "../../lib/format";
import { rupees } from "../../lib/pricing";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { colors } from "../../theme/tokens";

export default function Orders() {
  const { push } = useNav();
  const { state, syncOrders } = useApp();
  const [tab, setTab] = useState<"active" | "past">("active");

  useEffect(() => {
    syncOrders?.();
  }, []);

  const activeOrders = state.orders.filter((o) => o.status >= 0 && o.status < 3);
  const pastOrders = state.orders.filter((o) => o.status >= 3 || o.status === -1);

  // Fallback demo orders matching Figma UI
  const defaultOrders = [
    {
      id: "demo-food-1",
      service: "food" as Service,
      title: "Royal Biryani House",
      statusText: "Arriving in 18 minutes",
      price: "₹289",
      isActive: true,
    },
    {
      id: "demo-courier-1",
      service: "courier" as Service,
      title: "Package to Gomti Nagar",
      statusText: "Courier is at pickup",
      price: "₹139",
      isActive: true,
    },
    {
      id: "demo-rides-1",
      service: "rides" as Service,
      title: "Ride to Aminabad",
      statusText: "Completed · 18 May",
      price: "₹124",
      isActive: false,
    },
    {
      id: "demo-grocery-1",
      service: "grocery" as Service,
      title: "Fresh grocery basket",
      statusText: "Delivered · 16 May",
      price: "₹346",
      isActive: false,
    },
  ];

  const hasLiveOrders = state.orders.length > 0;
  const activeCount = hasLiveOrders ? activeOrders.length : 2;

  const serviceColors = {
    food: { color: "#c84b31", bg: "#f7e6e1" },
    rides: { color: "#3983f7", bg: "#e4efff" },
    grocery: { color: "#318454", bg: "#e5f3e8" },
    courier: { color: "#ef801f", bg: "#fff0de" },
  };

  const serviceIcons = {
    food: "food",
    rides: "car",
    grocery: "bag",
    courier: "box",
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <UtilityHeader title="Your orders" subtitle="ALL ROADRIDER SERVICES" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Figma Utility Tabs */}
        <View style={styles.utilityTabs}>
          <TouchableOpacity
            onPress={() => setTab("active")}
            style={[styles.utilityTabBtn, tab === "active" && styles.utilityTabBtnActive]}
            activeOpacity={0.7}
          >
            <View style={styles.tabContentRow}>
              <Text
                style={[
                  styles.utilityTabText,
                  tab === "active" && styles.utilityTabTextActive,
                ]}
              >
                Active
              </Text>
              <View style={styles.badgeI}>
                <Text style={styles.badgeIText}>{activeCount}</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTab("past")}
            style={[styles.utilityTabBtn, tab === "past" && styles.utilityTabBtnActive]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.utilityTabText,
                tab === "past" && styles.utilityTabTextActive,
              ]}
            >
              Past
            </Text>
          </TouchableOpacity>
        </View>

        {/* Figma Cross-Order List */}
        <View style={styles.crossOrderList}>
          {hasLiveOrders ? (
            (tab === "active" ? activeOrders : pastOrders).map((o) => {
              const sColor = serviceColors[o.service] || serviceColors.food;
              const iconName = serviceIcons[o.service] || "food";
              const label = serviceMeta[o.service]?.label || "Food";
              const statusDesc =
                o.status < 3 ? "Arriving in 18 minutes" : `Completed · ${formatDay(o.completedAt ?? o.createdAt)}`;

              return (
                <TouchableOpacity
                  key={o.id}
                  style={styles.orderArticle}
                  activeOpacity={0.8}
                  onPress={() =>
                    o.status < 3
                      ? push({ name: "status", orderId: o.id })
                      : push({ name: "orderDetail", orderId: o.id })
                  }
                >
                  <View style={[styles.serviceOrderIcon, { backgroundColor: sColor.bg }]}>
                    <Icon name={iconName} size={20} color={sColor.color} />
                  </View>
                  <View style={styles.orderArticleMid}>
                    <Text style={[styles.orderServiceTag, { color: sColor.color }]}>
                      {label} · {tab === "active" ? "ACTIVE" : "PAST"}
                    </Text>
                    <Text style={styles.orderArticleTitle} numberOfLines={1}>
                      {o.title || "RoadRider Order"}
                    </Text>
                    <Text style={styles.orderArticleSmall}>{statusDesc}</Text>
                  </View>
                  <View style={styles.orderPriceRow}>
                    <Text style={styles.orderPriceStrong}>{rupees(o.bill.toPay)}</Text>
                    <Icon name="arrow" size={16} color={colors.ink} />
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            defaultOrders
              .filter((item) => (tab === "active" ? item.isActive : !item.isActive))
              .map((item) => {
                const sColor = serviceColors[item.service];
                const iconName = serviceIcons[item.service];
                const label = serviceMeta[item.service]?.label;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.orderArticle}
                    activeOpacity={0.8}
                    onPress={() => push({ name: "status", orderId: item.id })}
                  >
                    <View style={[styles.serviceOrderIcon, { backgroundColor: sColor.bg }]}>
                      <Icon name={iconName} size={20} color={sColor.color} />
                    </View>
                    <View style={styles.orderArticleMid}>
                      <Text style={[styles.orderServiceTag, { color: sColor.color }]}>
                        {label} · {item.isActive ? "ACTIVE" : "PAST"}
                      </Text>
                      <Text style={styles.orderArticleTitle}>{item.title}</Text>
                      <Text style={styles.orderArticleSmall}>{item.statusText}</Text>
                    </View>
                    <View style={styles.orderPriceRow}>
                      <Text style={styles.orderPriceStrong}>{item.price}</Text>
                      <Icon name="arrow" size={16} color={colors.ink} />
                    </View>
                  </TouchableOpacity>
                );
              })
          )}
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
    paddingTop: 4,
    paddingBottom: 90,
  },
  utilityTabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    marginBottom: 12,
  },
  utilityTabBtn: {
    minWidth: 80,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -1,
  },
  utilityTabBtnActive: {
    borderBottomColor: colors.ink,
  },
  tabContentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  utilityTabText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.muted,
  },
  utilityTabTextActive: {
    color: colors.ink,
    fontWeight: "700",
  },
  badgeI: {
    backgroundColor: colors.ink,
    borderRadius: 8,
    minWidth: 15,
    height: 15,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeIText: {
    color: "#ffffff",
    fontSize: 7,
    fontWeight: "700",
  },
  crossOrderList: {
    gap: 10,
  },
  orderArticle: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    padding: 13,
    gap: 11,
  },
  serviceOrderIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  orderArticleMid: {
    flex: 1,
    justifyContent: "center",
  },
  orderServiceTag: {
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  orderArticleTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 2,
  },
  orderArticleSmall: {
    fontSize: 8,
    color: colors.muted,
  },
  orderPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  orderPriceStrong: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.ink,
  },
});

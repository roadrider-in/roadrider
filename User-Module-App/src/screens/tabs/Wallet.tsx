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
import Icon from "../../components/Icon";
import { formatWhen } from "../../lib/format";
import { rupees } from "../../lib/pricing";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { colors } from "../../theme/tokens";

export default function Wallet() {
  const { push } = useNav();
  const { state, setAutoTopUp, showToast } = useApp();

  const isAuth = state.authenticated;

  const handleToggleAutoTopUp = () => {
    if (!isAuth) {
      showToast("Please sign in to configure auto top-up");
      push({ name: "phone" });
      return;
    }
    const next = !state.wallet.autoTopUp;
    setAutoTopUp(next);
    showToast(
      next
        ? "Auto top-up enabled when balance falls below ₹100"
        : "Auto top-up disabled"
    );
  };

  const balanceDisplay = isAuth
    ? `${rupees(state.wallet.balance)}.00`
    : "₹320.00";

  // Demo fallback transactions matching Figma
  const defaultTxns = [
    {
      id: "demo-food",
      icon: "food",
      label: "Royal Biryani House",
      when: "Today, 1:24 PM",
      amount: -289,
    },
    {
      id: "demo-cab",
      icon: "car",
      label: "Ride to Gomti Nagar",
      when: "Yesterday, 6:42 PM",
      amount: -96,
    },
    {
      id: "demo-wallet",
      icon: "wallet",
      label: "Money added",
      when: "18 May, 10:10 AM",
      amount: 500,
    },
  ];

  const recentTxns =
    isAuth && state.wallet.txns.length > 0
      ? state.wallet.txns.slice(0, 4)
      : defaultTxns;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <UtilityHeader title="Wallet" subtitle="PAYMENTS & BALANCE" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Figma Wallet Hero Card */}
        <View style={styles.walletHero}>
          {/* Decorative radial blur/ring */}
          <View style={styles.heroDecorativeCircle} />

          <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
          <Text style={styles.balanceValue}>{balanceDisplay}</Text>
          <Text style={styles.walletBrandText}>RoadRider Wallet</Text>

          <TouchableOpacity
            onPress={() => {
              if (isAuth) {
                push({ name: "addMoney" });
              } else {
                push({ name: "addMoney" });
              }
            }}
            style={styles.addMoneyBtn}
            activeOpacity={0.85}
          >
            <Text style={styles.addMoneyBtnText}>+ Add money</Text>
          </TouchableOpacity>
        </View>

        {/* Figma Quick Actions */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => push({ name: "paymentMethods" })}
            style={styles.actionCard}
          >
            <View style={styles.actionIconBox}>
              <Icon name="card" size={20} color={colors.accent} />
            </View>
            <Text style={styles.actionText}>Payment methods</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleToggleAutoTopUp}
            style={styles.actionCard}
          >
            <View style={styles.actionIconBox}>
              <Icon
                name="shield"
                size={20}
                color={
                  isAuth && state.wallet.autoTopUp ? "#22c55e" : colors.accent
                }
              />
            </View>
            <Text style={styles.actionText}>
              {isAuth && state.wallet.autoTopUp ? "Auto top-up: ON" : "Auto top-up"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => push({ name: "transactions" })}
            style={styles.actionCard}
          >
            <View style={styles.actionIconBox}>
              <Icon name="list" size={20} color={colors.accent} />
            </View>
            <Text style={styles.actionText}>Statements</Text>
          </TouchableOpacity>
        </View>

        {/* Section Heading */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent transactions</Text>
          <TouchableOpacity onPress={() => push({ name: "transactions" })}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        {/* Transaction List */}
        <View style={styles.txnList}>
          {recentTxns.map((txn, index) => {
            const isCredit = txn.amount > 0;
            const isLast = index === recentTxns.length - 1;
            const dateStr =
              typeof txn.when === "number"
                ? formatWhen(txn.when)
                : txn.when;

            return (
              <View
                key={txn.id || `txn-${index}`}
                style={[styles.txnRow, isLast && { borderBottomWidth: 0 }]}
              >
                <View style={styles.txnIconBox}>
                  <Icon
                    name={txn.icon || (isCredit ? "wallet" : "food")}
                    size={18}
                    color="#7e7670"
                  />
                </View>
                <View style={styles.txnDetails}>
                  <Text style={styles.txnLabel}>{txn.label}</Text>
                  <Text style={styles.txnDate}>{dateStr}</Text>
                </View>
                <Text
                  style={[
                    styles.txnAmount,
                    isCredit && styles.txnAmountCredit,
                  ]}
                >
                  {isCredit
                    ? `+ ${typeof txn.amount === "number" ? rupees(txn.amount) : txn.amount}`
                    : `− ${typeof txn.amount === "number" ? rupees(Math.abs(txn.amount)) : txn.amount}`}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Linked Card (Figma .linked-card) */}
        <View style={styles.linkedCard}>
          <View style={styles.linkedCardIcon}>
            <Icon name="card" size={18} color={colors.accent} />
          </View>
          <View style={styles.linkedCardInfo}>
            <Text style={styles.linkedCardSub}>AUTO TOP-UP LINKED</Text>
            <Text style={styles.linkedCardTitle}>HDFC Bank •••• 4821</Text>
          </View>
          <TouchableOpacity
            onPress={() => push({ name: "paymentMethods" })}
            activeOpacity={0.7}
          >
            <Text style={styles.linkedCardBtn}>Manage</Text>
          </TouchableOpacity>
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
  walletHero: {
    backgroundColor: "#24201e",
    borderRadius: 21,
    minHeight: 165,
    padding: 22,
    position: "relative",
    overflow: "hidden",
    shadowColor: "#261d18",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 15 },
    shadowRadius: 35,
    elevation: 6,
  },
  heroDecorativeCircle: {
    position: "absolute",
    top: -65,
    right: -50,
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 32,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  balanceLabel: {
    fontSize: 7,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.5)",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  balanceValue: {
    fontSize: 31,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  walletBrandText: {
    fontSize: 8,
    color: "rgba(255, 255, 255, 0.45)",
    marginTop: 3,
  },
  addMoneyBtn: {
    position: "absolute",
    bottom: 18,
    right: 18,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  addMoneyBtnText: {
    color: "#171514",
    fontSize: 9,
    fontWeight: "700",
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: 9,
    marginTop: 13,
  },
  actionCard: {
    flex: 1,
    minHeight: 75,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    gap: 7,
  },
  actionIconBox: {
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    fontSize: 8,
    fontWeight: "600",
    color: colors.ink,
    textAlign: "center",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: colors.ink,
  },
  seeAllText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.accent,
  },
  txnList: {
    backgroundColor: "#ffffff",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
  },
  txnRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 61,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  txnIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#f3f0ed",
    alignItems: "center",
    justifyContent: "center",
  },
  txnDetails: {
    flex: 1,
  },
  txnLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.ink,
  },
  txnDate: {
    fontSize: 8,
    color: colors.muted,
    marginTop: 2,
  },
  txnAmount: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.ink,
  },
  txnAmountCredit: {
    color: "#288153",
  },
  linkedCard: {
    backgroundColor: "#ffffff",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 13,
    padding: 13,
  },
  linkedCardIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  linkedCardInfo: {
    flex: 1,
  },
  linkedCardSub: {
    fontSize: 6,
    letterSpacing: 0.7,
    color: colors.muted,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  linkedCardTitle: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 2,
  },
  linkedCardBtn: {
    fontSize: 8,
    fontWeight: "700",
    color: colors.accent,
  },
});

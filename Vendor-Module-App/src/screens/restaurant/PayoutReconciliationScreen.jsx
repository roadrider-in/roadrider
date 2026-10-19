import React, { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native"
import { colors } from "../../theme/colors"
import { radius } from "../../theme/radius"
import { AppHeader } from "../../components/common/AppHeader"
import { AppButton } from "../../components/common/AppButton"
import { AppCard } from "../../components/common/AppCard"
import { MetricCard } from "../../components/common/MetricCard"
import { AppIcon } from "../../components/common/AppIcon"
import { useAppNavigation } from "../../navigation/NavigationContext"

export const PayoutReconciliationScreen = () => {
  const { navigate, goBack } = useAppNavigation()
  // Real vendors start with empty transaction history; populated as payouts are settled
  const [transactions, setTransactions] = useState([])

  const handleDownloadReport = () => {
    if (transactions.length === 0) return
    const headers = "Date,Transaction ID,Description,Amount,Type\n"
    const rows = transactions
      .map(
        (tx, idx) =>
          `"${new Date().toISOString().slice(0, 10)}","TXN-${tx.id || idx}","${(tx.title || "").replace(/"/g, '""')}","${tx.amount}","${
            tx.isCredit ? "Credit" : "Debit"
          }"`,
      )
      .join("\n")
    const csvContent = headers + rows

    if (Platform.OS === "web" && typeof document !== "undefined") {
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", "RoadRider_Payout_Settlement_Report.csv")
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } else {
      Alert.alert(
        "Settlement Report",
        `${transactions.length} settlement transaction(s) exported successfully.`,
      )
    }
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="Payouts"
        onBack={goBack}
        action={
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigate("bank")}
            accessibilityLabel="Bank account"
          >
            <AppIcon name="wallet" size={20} color={colors.black} />
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Dark Hero Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
          <Text style={styles.balanceAmount}>₹0</Text>
          <Text style={styles.balanceSchedule}>
            Daily automated settlements to your bank account
          </Text>
          <AppButton style={styles.settleBtn} onPress={() => navigate("bank")}>
            View settlement details
          </AppButton>
        </View>

        {/* Metric Grid */}
        <View style={styles.metricGrid}>
          <MetricCard label="Gross sales" value="₹0" />
          <MetricCard label="Net earnings" value="₹0" keyMetric />
        </View>

        {/* Transactions Section */}
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Recent transactions</Text>
          {transactions.length > 0 && (
            <TouchableOpacity
              onPress={handleDownloadReport}
              activeOpacity={0.7}
            >
              <Text style={styles.downloadLink}>Download CSV</Text>
            </TouchableOpacity>
          )}
        </View>

        {transactions.length === 0 ? (
          <AppCard style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <AppIcon name="wallet" size={32} color={colors.terracotta} />
            </View>
            <Text style={styles.emptyTitle}>No transactions yet</Text>
            <Text style={styles.emptySub}>
              Completed order earnings and bank settlements will appear here
              once your store begins receiving and fulfilling customer orders.
            </Text>
            <AppButton
              secondary
              onPress={() => navigate("bank")}
              style={styles.emptyBankBtn}
            >
              Bank Account Details
            </AppButton>
          </AppCard>
        ) : (
          <AppCard style={styles.txCard}>
            {transactions.map((tx, idx) => (
              <View
                key={tx.id}
                style={[
                  styles.txRow,
                  idx === transactions.length - 1 && styles.lastTxRow,
                ]}
              >
                <View style={styles.txInfo}>
                  <Text style={styles.txTitle}>{tx.title}</Text>
                  <Text style={styles.txTime}>{tx.time}</Text>
                </View>
                <Text
                  style={[styles.txAmount, tx.isCredit && styles.creditAmount]}
                >
                  {tx.amount}
                </Text>
              </View>
            ))}
          </AppCard>
        )}
      </ScrollView>
    </View>
  )
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F7F6",
  },
  headerBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 28,
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
  },
  balanceCard: {
    backgroundColor: colors.black,
    borderRadius: radius.card,
    padding: 20,
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 9,
    fontFamily: "Poppins, sans-serif",
    fontWeight: "700",
    color: colors.warmGrey,
    letterSpacing: 1.4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.white,
    marginVertical: 6,
  },
  balanceSchedule: {
    fontSize: 10,
    fontFamily: "DM Sans, sans-serif",
    color: colors.warmGrey,
    marginBottom: 16,
  },
  settleBtn: {
    minHeight: 42,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  sectionHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
  },
  downloadLink: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "DM Sans, sans-serif",
    color: colors.terracotta,
  },
  txCard: {
    padding: 6,
  },
  txRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(156, 154, 154, 0.18)",
  },
  lastTxRow: {
    borderBottomWidth: 0,
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
  },
  txTime: {
    fontSize: 9.5,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.charcoal,
  },
  creditAmount: {
    color: colors.terracotta,
  },
  emptyCard: {
    alignItems: "center",
    padding: 32,
    borderRadius: radius.card,
    backgroundColor: colors.white,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(163, 94, 71, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
    marginBottom: 6,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 12,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 320,
    marginBottom: 20,
  },
  emptyBankBtn: {
    minWidth: 180,
  },
})

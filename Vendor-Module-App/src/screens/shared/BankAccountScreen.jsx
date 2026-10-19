import React, { useState, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView } from "react-native"
import { colors } from "../../theme/colors"
import { radius } from "../../theme/radius"
import { AppHeader } from "../../components/common/AppHeader"
import { AppCard } from "../../components/common/AppCard"
import { AppIcon } from "../../components/common/AppIcon"
import { StatusBadge } from "../../components/common/StatusBadge"
import { useAppNavigation } from "../../navigation/NavigationContext"
import { useVendor } from "../../context/VendorContext"
import { useOnboarding } from "../../context/OnboardingContext"
import { supabase, isSupabaseConfigured } from "../../lib/supabase.js"

export const BankAccountScreen = () => {
  const { goBack } = useAppNavigation()
  const { activeStore } = useVendor()
  const { businessDetails } = useOnboarding()

  const [bankDetails, setBankDetails] = useState(null)
  const [settlementHistory, setSettlementHistory] = useState([])
  const [totalSettled, setTotalSettled] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const loadBankAndPayouts = async () => {
      if (!isSupabaseConfigured) {
        if (isMounted) setLoading(false)
        return
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          if (isMounted) setLoading(false)
          return
        }

        const { data: vendor } = await supabase
          .from("vendors")
          .select("id, business_name, owner_name")
          .eq("user_id", user.id)
          .maybeSingle()

        if (vendor) {
          const [bankRes, payoutsRes] = await Promise.all([
            supabase
              .from("bank_accounts")
              .select("*")
              .eq("vendor_id", vendor.id)
              .maybeSingle(),
            supabase
              .from("payouts")
              .select("*")
              .eq("vendor_id", vendor.id)
              .order("created_at", { ascending: false }),
          ])

          if (isMounted) {
            if (bankRes.data) {
              setBankDetails(bankRes.data)
            }
            if (payoutsRes.data) {
              const mappedPayouts = payoutsRes.data.map((p) => ({
                id: p.id,
                date: new Date(p.created_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }),
                amount: `₹${(Number(p.amount) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
                utr:
                  p.reference_number || `RR-${p.id.slice(0, 8).toUpperCase()}`,
                status: p.status || "Pending",
                account:
                  bankRes.data?.account_number_masked || "Primary Account",
              }))
              setSettlementHistory(mappedPayouts)

              const sum = payoutsRes.data.reduce(
                (acc, p) => acc + (Number(p.amount) || 0),
                0,
              )
              setTotalSettled(sum)
            }
          }
        }
      } catch (err) {
        console.warn("[BankAccountScreen] Error loading bank details:", err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadBankAndPayouts()

    return () => {
      isMounted = false
    }
  }, [])

  const maskedAccount = bankDetails?.account_number_masked
    ? bankDetails.account_number_masked
    : bankDetails?.account_number
      ? `•••• •••• ${String(bankDetails.account_number).slice(-4)}`
      : "Not yet configured"

  const accountHolder =
    bankDetails?.account_holder_name ||
    businessDetails?.businessName ||
    "Business Outlet"
  const bankName = bankDetails?.bank_name || "Bank details pending verification"
  const ifsc = bankDetails?.ifsc_code || "—"
  const accountType = bankDetails?.account_type || "Current Business Account"

  return (
    <View style={styles.container}>
      <AppHeader title="Settlement Details" onBack={goBack} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>SETTLEMENT RECONCILIATION</Text>
        <Text style={styles.title}>Account & Settlements</Text>
        <Text style={styles.subtitle}>
          All earnings from RoadRider customer orders are automatically
          deposited into your verified bank account.
        </Text>

        {/* Current Settlement Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>TOTAL TRANSFERRED TO BANK</Text>
          <Text style={styles.summaryAmount}>
            ₹{totalSettled.toLocaleString("en-IN")}
          </Text>
          <View style={styles.summaryMetaRow}>
            <View style={styles.summaryMetaItem}>
              <Text style={styles.metaLabel}>Last Payout Transferred</Text>
              <Text style={styles.metaValue}>
                {settlementHistory.length > 0
                  ? `${settlementHistory[0].amount} on ${settlementHistory[0].date}`
                  : "No transfers yet"}
              </Text>
            </View>
            <View style={styles.summaryMetaItem}>
              <Text style={styles.metaLabel}>Next Auto Settlement</Text>
              <Text style={styles.metaValueHighlight}>
                Daily automated (T+1)
              </Text>
            </View>
          </View>
        </View>

        {/* Destination Bank Account Card */}
        <View style={styles.bankCard}>
          <View style={styles.bankCardTop}>
            <Text style={styles.bankName}>DESTINATION BANK ACCOUNT</Text>
            <StatusBadge>
              {bankDetails ? "Verified & Active" : "Pending Setup"}
            </StatusBadge>
          </View>
          <Text style={styles.accountNumber}>{maskedAccount}</Text>
          <View style={styles.bankMetaList}>
            <View style={styles.bankMetaRow}>
              <Text style={styles.bankMetaKey}>Account Holder:</Text>
              <Text style={styles.bankMetaVal}>{accountHolder}</Text>
            </View>
            <View style={styles.bankMetaRow}>
              <Text style={styles.bankMetaKey}>Bank & Branch:</Text>
              <Text style={styles.bankMetaVal}>{bankName}</Text>
            </View>
            <View style={styles.bankMetaRow}>
              <Text style={styles.bankMetaKey}>IFSC Code:</Text>
              <Text style={styles.bankMetaVal}>{ifsc}</Text>
            </View>
            <View style={styles.bankMetaRow}>
              <Text style={styles.bankMetaKey}>Account Type:</Text>
              <Text style={styles.bankMetaVal}>{accountType}</Text>
            </View>
          </View>
        </View>

        {/* Settlement Information Card */}
        <AppCard style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>Automated Settlement Policy</Text>
          <View style={styles.infoRow}>
            <AppIcon name="clock" size={16} color={colors.terracotta} />
            <Text style={styles.infoText}>
              Daily automated settlement schedule (T+1). All completed orders
              are cleared and transferred overnight.
            </Text>
          </View>
          <View style={styles.infoRow}>
            <AppIcon name="receipt" size={16} color={colors.terracotta} />
            <Text style={styles.infoText}>
              Vendor net earnings = Gross sales − platform commission − GST on
              platform fee.
            </Text>
          </View>
        </AppCard>

        {/* Withdrawal / Transfer History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionHeading}>Previous Transfer History</Text>
          {settlementHistory.length === 0 ? (
            <AppCard style={styles.emptyHistoryCard}>
              <View style={styles.emptyHistoryCircle}>
                <AppIcon name="wallet" size={28} color={colors.terracotta} />
              </View>
              <Text style={styles.emptyHistoryTitle}>
                No settlements transferred yet
              </Text>
              <Text style={styles.emptyHistorySub}>
                Daily settlement transfers will appear here once customer orders
                are completed and processed.
              </Text>
            </AppCard>
          ) : (
            <AppCard style={styles.historyCard}>
              {settlementHistory.map((item, idx) => (
                <View
                  key={item.id}
                  style={[
                    styles.historyRow,
                    idx === settlementHistory.length - 1 &&
                      styles.lastHistoryRow,
                  ]}
                >
                  <View style={styles.historyLeft}>
                    <View style={styles.historyTopRow}>
                      <Text style={styles.historyAmount}>{item.amount}</Text>
                      <View style={styles.depositedBadge}>
                        <Text style={styles.depositedText}>{item.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.historyDetails}>
                      {item.account} · UTR: {item.utr}
                    </Text>
                  </View>
                  <Text style={styles.historyDate}>{item.date}</Text>
                </View>
              ))}
            </AppCard>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F7F6",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    maxWidth: 720,
    width: "100%",
    marginHorizontal: "auto",
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    letterSpacing: 1.4,
    color: colors.terracotta,
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
    lineHeight: 28,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12.5,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
    lineHeight: 18,
    marginBottom: 18,
  },
  summaryCard: {
    backgroundColor: colors.black,
    borderRadius: radius.card,
    padding: 20,
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 9.5,
    fontFamily: "Poppins, sans-serif",
    fontWeight: "700",
    color: colors.warmGrey,
    letterSpacing: 1.2,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.white,
    marginVertical: 8,
  },
  summaryMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.12)",
    paddingTop: 12,
    marginTop: 4,
    gap: 12,
  },
  summaryMetaItem: {
    flex: 1,
    minWidth: 120,
  },
  metaLabel: {
    fontSize: 9.5,
    fontFamily: "DM Sans, sans-serif",
    color: colors.warmGrey,
  },
  metaValue: {
    fontSize: 11.5,
    fontWeight: "600",
    fontFamily: "Poppins, sans-serif",
    color: colors.white,
    marginTop: 2,
  },
  metaValueHighlight: {
    fontSize: 11.5,
    fontWeight: "600",
    fontFamily: "Poppins, sans-serif",
    color: colors.terracotta,
    marginTop: 2,
  },
  bankCard: {
    borderRadius: radius.card,
    backgroundColor: colors.white,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E6E3E0",
    marginBottom: 16,
  },
  bankCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  bankName: {
    fontSize: 10,
    fontFamily: "Poppins, sans-serif",
    fontWeight: "700",
    color: colors.charcoal,
    letterSpacing: 1,
  },
  accountNumber: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
    marginBottom: 14,
  },
  bankMetaList: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: "#F0ECE8",
    paddingTop: 12,
  },
  bankMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bankMetaKey: {
    fontSize: 11,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
  },
  bankMetaVal: {
    fontSize: 11,
    fontFamily: "DM Sans, sans-serif",
    fontWeight: "600",
    color: colors.black,
  },
  infoCard: {
    padding: 16,
    marginBottom: 20,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.card,
    gap: 10,
  },
  infoCardTitle: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 11.5,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
    lineHeight: 16,
  },
  historySection: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
    marginBottom: 12,
  },
  historyCard: {
    padding: 0,
    borderRadius: radius.card,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E6E3E0",
    overflow: "hidden",
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F2EFEB",
  },
  lastHistoryRow: {
    borderBottomWidth: 0,
  },
  historyLeft: {
    flex: 1,
  },
  historyTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
  },
  depositedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  depositedText: {
    fontSize: 9,
    fontFamily: "Poppins, sans-serif",
    fontWeight: "600",
    color: "#059669",
  },
  historyDetails: {
    fontSize: 10,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
    marginTop: 2,
  },
  historyDate: {
    fontSize: 11,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
  },
  emptyHistoryCard: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.card,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E6E3E0",
  },
  emptyHistoryCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(235, 94, 65, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyHistoryTitle: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
    marginBottom: 4,
  },
  emptyHistorySub: {
    fontSize: 11,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
    textAlign: "center",
    lineHeight: 16,
  },
})

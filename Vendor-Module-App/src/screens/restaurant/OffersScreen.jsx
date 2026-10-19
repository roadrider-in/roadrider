import React, { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native"
import { colors } from "../../theme/colors"
import { AppHeader } from "../../components/common/AppHeader"
import { AppButton } from "../../components/common/AppButton"
import { AppCard } from "../../components/common/AppCard"
import { AppIcon } from "../../components/common/AppIcon"
import { useAppNavigation } from "../../navigation/NavigationContext"
import { useVendor } from "../../context/VendorContext"
import { supabase, isSupabaseConfigured } from "../../lib/supabase.js"

export const OffersScreen = () => {
  const { goBack } = useAppNavigation()
  const { activeStore } = useVendor()
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const loadOffers = async () => {
      if (!isSupabaseConfigured) {
        if (isMounted) setLoading(false)
        return
      }
      try {
        let query = supabase.from("promotions").select("*")
        if (activeStore?.id) {
          query = query.or(`store_id.eq.${activeStore.id},store_id.is.null`)
        }
        const { data, error } = await query.order("created_at", {
          ascending: false,
        })
        if (!error && data && isMounted) {
          const mapped = data.map((o) => ({
            code: o.code || "PROMO",
            desc: o.description || `${o.discount_percent || 0}% off order`,
            valid: o.end_date
              ? `Valid until ${new Date(o.end_date).toLocaleDateString()}`
              : "Active promotion",
          }))
          setOffers(mapped)
        }
      } catch (err) {
        console.warn("[OffersScreen] Error loading offers:", err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadOffers()
    return () => {
      isMounted = false
    }
  }, [activeStore?.id])

  return (
    <View style={styles.container}>
      <AppHeader
        title="Offers & coupons"
        onBack={goBack}
        action={
          <TouchableOpacity style={styles.headerBtn}>
            <AppIcon name="plus" size={20} color={colors.black} />
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.eyebrow}>
          {offers.length > 0
            ? `${offers.length} ACTIVE OFFERS`
            : "STORE PROMOTIONS & DISCOUNTS"}
        </Text>

        {offers.length === 0 ? (
          <AppCard style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <AppIcon name="receipt" size={32} color={colors.terracotta} />
            </View>
            <Text style={styles.emptyTitle}>No active offers yet</Text>
            <Text style={styles.emptySub}>
              Create coupons and special promotions to attract new customers and
              drive repeat orders.
            </Text>
          </AppCard>
        ) : (
          <View style={styles.offersList}>
            {offers.map((offer) => (
              <AppCard key={offer.code} style={styles.offerCard}>
                <View style={styles.offerInfo}>
                  <View style={styles.codeRow}>
                    <Text style={styles.offerCode}>{offer.code}</Text>
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>ACTIVE</Text>
                    </View>
                  </View>
                  <Text style={styles.offerDesc}>{offer.desc}</Text>
                  <Text style={styles.offerValid}>{offer.valid}</Text>
                </View>
                <AppIcon name="chevron" size={18} color={colors.charcoal} />
              </AppCard>
            ))}
          </View>
        )}

        <AppButton
          icon={<AppIcon name="plus" size={16} color={colors.white} />}
          style={styles.createBtn}
        >
          Create new offer
        </AppButton>
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
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    letterSpacing: 1.4,
    color: colors.terracotta,
    marginBottom: 14,
  },
  emptyCard: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(235, 94, 65, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 11,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
    textAlign: "center",
    lineHeight: 17,
  },
  offersList: {
    gap: 12,
    marginBottom: 24,
  },
  offerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  offerInfo: {
    flex: 1,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  offerCode: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
  },
  activeBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 8.5,
    fontFamily: "Poppins, sans-serif",
    fontWeight: "700",
    color: colors.success,
  },
  offerDesc: {
    fontSize: 11,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
    marginBottom: 2,
  },
  offerValid: {
    fontSize: 9,
    fontFamily: "DM Sans, sans-serif",
    color: colors.warmGrey,
  },
  createBtn: {
    marginTop: 8,
  },
})

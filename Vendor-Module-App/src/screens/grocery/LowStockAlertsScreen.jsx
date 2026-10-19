import React, { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native"
import { colors } from "../../theme/colors"
import { radius } from "../../theme/radius"
import { AppHeader } from "../../components/common/AppHeader"
import { AppButton } from "../../components/common/AppButton"
import { AppCard } from "../../components/common/AppCard"
import { AppIcon } from "../../components/common/AppIcon"
import { useAppNavigation } from "../../navigation/NavigationContext"
export const LowStockAlertsScreen = () => {
  const { navigate, goBack } = useAppNavigation()
  const [filter, setFilter] = useState("critical")
  // Real vendors start with empty inventory alerts; complete own setup
  const [products, setProducts] = useState([])
  const [stockLevels, setStockLevels] = useState({})
  const handleAdjustStock = (prodId, delta) => {
    setStockLevels((prev) => ({
      ...prev,
      [prodId]: Math.max(0, (prev[prodId] || 0) + delta),
    }))
  }
  const lowProducts = products.filter((p) => {
    const qty = stockLevels[p.id] ?? p.stockCount
    if (filter === "critical") return qty <= 2
    if (filter === "low") return qty > 2 && qty <= 6
    if (filter === "out") return qty === 0
    return qty <= 6
  })
  return (
    <View style={styles.container}>
      <AppHeader
        title="Low-stock alerts"
        onBack={goBack}
        action={
          <TouchableOpacity style={styles.headerBtn}>
            <AppIcon name="search" size={20} color={colors.black} />
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Low Stock Summary Card */}
        <AppCard style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>Needs restocking</Text>
            <Text style={styles.summaryValue}>{lowProducts.length} items</Text>
          </View>
          <AppButton
            secondary
            onPress={() => navigate("import")}
            style={styles.importBtn}
          >
            Bulk import
          </AppButton>
        </AppCard>

        {/* Filter Pills */}
        <View style={styles.filterPills}>
          <TouchableOpacity
            style={[styles.pill, filter === "critical" && styles.pillActive]}
            onPress={() => setFilter("critical")}
          >
            <Text
              style={[
                styles.pillText,
                filter === "critical" && styles.pillTextActive,
              ]}
            >
              Critical
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pill, filter === "low" && styles.pillActive]}
            onPress={() => setFilter("low")}
          >
            <Text
              style={[
                styles.pillText,
                filter === "low" && styles.pillTextActive,
              ]}
            >
              Low
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pill, filter === "out" && styles.pillActive]}
            onPress={() => setFilter("out")}
          >
            <Text
              style={[
                styles.pillText,
                filter === "out" && styles.pillTextActive,
              ]}
            >
              Out of stock
            </Text>
          </TouchableOpacity>
        </View>

        {/* Low Stock List or Empty State */}
        {lowProducts.length === 0 ? (
          <AppCard style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <AppIcon name="inventory" size={32} color={colors.terracotta} />
            </View>
            <Text style={styles.emptyTitle}>No low-stock items</Text>
            <Text style={styles.emptySub}>
              All products currently have healthy stock levels. Any items
              falling below reorder thresholds will appear here.
            </Text>
            <View style={styles.emptyActionsRow}>
              <AppButton
                onPress={() => navigate("catalog")}
                style={styles.emptyAddBtn}
              >
                View Catalog
              </AppButton>
              <AppButton
                secondary
                onPress={() => navigate("product")}
                style={styles.emptyImportBtn}
              >
                Add Product
              </AppButton>
            </View>
          </AppCard>
        ) : (
          <View style={styles.inventoryList}>
            {lowProducts.map((p, idx) => {
              const currentStock = stockLevels[p.id] ?? p.stockCount
              return (
                <AppCard key={p.id} style={styles.inventoryRow}>
                  <View
                    style={[
                      styles.miniProduct,
                      idx % 2 === 1 ? styles.imgTintTerra : styles.imgTintDark,
                    ]}
                  >
                    <AppIcon name="catalog" size={20} color={colors.charcoal} />
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{p.name}</Text>
                    <Text style={styles.productDetails}>
                      ₹{p.sellingPrice} · {currentStock} in stock
                    </Text>
                  </View>
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      onPress={() => handleAdjustStock(p.id, -1)}
                      style={styles.stepperBtn}
                    >
                      <Text style={styles.stepperBtnText}>−</Text>
                    </TouchableOpacity>
                    <View style={styles.stepperValBox}>
                      <Text style={styles.stepperValText}>{currentStock}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleAdjustStock(p.id, 1)}
                      style={[styles.stepperBtn, styles.stepperAddBtn]}
                    >
                      <Text
                        style={[styles.stepperBtnText, styles.stepperAddText]}
                      >
                        +
                      </Text>
                    </TouchableOpacity>
                  </View>
                </AppCard>
              )
            })}
          </View>
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
  summaryCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    padding: 16,
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 10,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.terracotta,
    marginTop: 2,
  },
  importBtn: {
    width: 110,
    minHeight: 38,
  },
  filterPills: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  pill: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(156, 154, 154, 0.35)",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.white,
  },
  pillActive: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  pillText: {
    fontSize: 10,
    fontFamily: "Poppins, sans-serif",
    fontWeight: "500",
    color: colors.charcoal,
  },
  pillTextActive: {
    color: colors.white,
    fontWeight: "600",
  },
  inventoryList: {
    gap: 10,
  },
  inventoryRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    padding: 12,
    gap: 12,
  },
  miniProduct: {
    width: 42,
    height: 42,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  imgTintTerra: {
    backgroundColor: "rgba(163, 94, 71, 0.12)",
  },
  imgTintDark: {
    backgroundColor: "rgba(0, 0, 0, 0.08)",
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 11.5,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
  },
  productDetails: {
    fontSize: 9.5,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
    marginTop: 2,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(156, 154, 154, 0.35)",
    borderRadius: 8,
    overflow: "hidden",
    height: 30,
  },
  stepperBtn: {
    width: 28,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.white,
  },
  stepperAddBtn: {
    backgroundColor: colors.black,
  },
  stepperBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.black,
  },
  stepperAddText: {
    color: colors.white,
  },
  stepperValBox: {
    width: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  stepperValText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
  },
  emptyCard: {
    alignItems: "center",
    padding: 28,
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
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 15,
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
  emptyActionsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    justifyContent: "center",
  },
  emptyAddBtn: {
    flex: 1,
    maxWidth: 150,
  },
  emptyImportBtn: {
    flex: 1,
    maxWidth: 150,
  },
})

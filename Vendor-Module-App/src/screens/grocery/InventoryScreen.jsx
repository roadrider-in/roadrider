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
export const InventoryScreen = () => {
  const { navigate, goBack } = useAppNavigation()
  const [filter, setFilter] = useState("all")
  // Real vendors start with empty inventory; complete own setup
  const [products, setProducts] = useState([])
  const [stockLevels, setStockLevels] = useState({})
  const handleAdjustStock = (prodId, delta) => {
    setStockLevels((prev) => ({
      ...prev,
      [prodId]: Math.max(0, (prev[prodId] || 0) + delta),
    }))
  }
  const filteredProducts = products.filter((p) => {
    const qty = stockLevels[p.id] ?? p.stockCount
    if (filter === "low") return qty > 0 && qty <= 6
    if (filter === "out") return qty === 0
    return true
  })
  const inStockCount = products.filter(
    (p) => (stockLevels[p.id] ?? p.stockCount) > 0,
  ).length
  const healthPercent =
    products.length > 0
      ? `${Math.round((inStockCount / products.length) * 100)}%`
      : "100%"

  return (
    <View style={styles.container}>
      <AppHeader
        title="Inventory"
        onBack={goBack}
        action={
          <TouchableOpacity style={styles.headerBtn}>
            <AppIcon name="search" size={20} color={colors.black} />
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Inventory Summary Card */}
        <AppCard style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>Inventory health</Text>
            <Text style={styles.summaryValue}>{healthPercent}</Text>
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
            style={[styles.pill, filter === "all" && styles.pillActive]}
            onPress={() => setFilter("all")}
          >
            <Text
              style={[
                styles.pillText,
                filter === "all" && styles.pillTextActive,
              ]}
            >
              All items
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
              Low stock
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

        {/* Inventory List with Steppers or Actionable Empty State */}
        {filteredProducts.length === 0 ? (
          <AppCard style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <AppIcon name="inventory" size={34} color={colors.terracotta} />
            </View>
            <Text style={styles.emptyTitle}>Inventory is currently empty</Text>
            <Text style={styles.emptySub}>
              Add products or import your catalog to monitor live stock
              quantities and trigger automatic low-stock reorder alerts.
            </Text>
            <View style={styles.emptyActionsRow}>
              <AppButton
                onPress={() => navigate("product")}
                icon={<AppIcon name="plus" size={15} color={colors.white} />}
                style={styles.emptyAddBtn}
              >
                Add Product
              </AppButton>
              <AppButton
                secondary
                onPress={() => navigate("import")}
                icon={
                  <AppIcon name="upload" size={15} color={colors.terracotta} />
                }
                style={styles.emptyImportBtn}
              >
                Bulk Import
              </AppButton>
            </View>
          </AppCard>
        ) : (
          <View style={styles.inventoryList}>
            {filteredProducts.map((p, idx) => {
              const currentStock = stockLevels[p.id] ?? p.stockCount
              return (
                <AppCard key={p.id} style={styles.inventoryRow}>
                  <View
                    style={[
                      styles.miniProduct,
                      idx % 3 === 1
                        ? styles.imgTintTerra
                        : idx % 3 === 2
                          ? styles.imgTintDark
                          : styles.imgTintGrey,
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
  },
  summaryCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    color: colors.black,
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
  imgTintGrey: {
    backgroundColor: "rgba(156, 154, 154, 0.18)",
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
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.terracottaLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Poppins, sans-serif",
    fontWeight: "700",
    color: colors.black,
    marginBottom: 6,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 13,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoalLight,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 340,
    marginBottom: 20,
  },
  emptyActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    width: "100%",
    justifyContent: "center",
  },
  emptyAddBtn: {
    flex: 1,
    minWidth: 120,
  },
  emptyImportBtn: {
    flex: 1,
    minWidth: 120,
  },
})

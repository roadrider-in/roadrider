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

export const ProductCatalogScreen = () => {
  const { navigate, goBack } = useAppNavigation()
  // Real vendors begin with empty catalog; complete own inventory setup
  const [products, setProducts] = useState([])
  const [filter, setFilter] = useState("all")

  const filteredProducts = products.filter((p) => {
    if (filter === "low") return p.stockCount > 0 && p.stockCount <= 6
    if (filter === "out") return p.stockCount === 0
    return true
  })

  const totalCount = products.length
  const availableCount = products.filter((p) => p.isAvailable).length

  return (
    <View style={styles.container}>
      <AppHeader
        title="Product catalog"
        onBack={goBack}
        action={
          <TouchableOpacity style={styles.headerBtn}>
            <AppIcon name="search" size={20} color={colors.black} />
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Summary Row */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryStat}>
            <Text style={styles.statNumber}>{totalCount}</Text>
            <Text style={styles.statLabel}>Total products</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={[styles.statNumber, styles.terraNumber]}>
              {availableCount}
            </Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
          <AppButton
            onPress={() => navigate("product")}
            icon={<AppIcon name="plus" size={16} color={colors.white} />}
            style={styles.addBtn}
          >
            Add
          </AppButton>
        </View>

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
              All
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
              Unavailable
            </Text>
          </TouchableOpacity>
        </View>

        {/* 2-Column Product Grid or Actionable Empty State */}
        {filteredProducts.length === 0 ? (
          <AppCard style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <AppIcon name="catalog" size={36} color={colors.terracotta} />
            </View>
            <Text style={styles.emptyTitle}>No products in catalog yet</Text>
            <Text style={styles.emptySub}>
              Set up your grocery store catalog by adding individual items or
              uploading a bulk CSV product file.
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
          <View style={styles.productGrid}>
            {filteredProducts.map((p, idx) => (
              <TouchableOpacity
                key={p.id}
                activeOpacity={0.8}
                onPress={() => navigate("product")}
                style={styles.gridItem}
              >
                <AppCard style={styles.productCard}>
                  <View
                    style={[
                      styles.productImage,
                      idx % 3 === 1
                        ? styles.imgTintTerra
                        : idx % 3 === 2
                          ? styles.imgTintDark
                          : styles.imgTintGrey,
                    ]}
                  >
                    <AppIcon
                      name={idx % 2 === 0 ? "catalog" : "orders"}
                      size={28}
                      color={colors.charcoal}
                    />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.productName} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={styles.productPrice}>
                      ₹{p.sellingPrice} / {p.unit}
                    </Text>
                    <Text
                      style={[
                        styles.stockCount,
                        p.stockCount <= 5 && styles.stockAlert,
                      ]}
                    >
                      {p.stockCount === 0
                        ? "Out of stock"
                        : `${p.stockCount} in stock`}
                    </Text>
                  </View>
                </AppCard>
              </TouchableOpacity>
            ))}
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
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  },
  summaryStat: {
    flex: 1,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
  },
  terraNumber: {
    color: colors.terracotta,
  },
  statLabel: {
    fontSize: 9,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
    marginTop: 1,
  },
  addBtn: {
    width: 90,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  filterPills: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
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
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    width: "100%",
  },
  gridItem: {
    flexGrow: 1,
    flexBasis: 140,
    maxWidth: 280,
  },
  productCard: {
    padding: 0,
    overflow: "hidden",
  },
  productImage: {
    height: 92,
    justifyContent: "center",
    alignItems: "center",
  },
  imgTintGrey: {
    backgroundColor: "rgba(156, 154, 154, 0.20)",
  },
  imgTintTerra: {
    backgroundColor: "rgba(163, 94, 71, 0.12)",
  },
  imgTintDark: {
    backgroundColor: "rgba(0, 0, 0, 0.08)",
  },
  cardInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
  },
  productPrice: {
    fontSize: 9.5,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
    marginTop: 3,
  },
  stockCount: {
    fontSize: 8.5,
    fontFamily: "Poppins, sans-serif",
    fontWeight: "600",
    color: colors.charcoal,
    marginTop: 6,
  },
  stockAlert: {
    color: colors.terracotta,
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

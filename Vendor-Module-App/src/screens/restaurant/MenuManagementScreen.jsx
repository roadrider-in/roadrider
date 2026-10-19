import React, { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native"
import { colors } from "../../theme/colors"
import { radius } from "../../theme/radius"
import { AppHeader } from "../../components/common/AppHeader"
import { AppButton } from "../../components/common/AppButton"
import { AppCard } from "../../components/common/AppCard"
import { AppIcon } from "../../components/common/AppIcon"
import { ToggleSwitch } from "../../components/common/ToggleSwitch"
import { useAppNavigation } from "../../navigation/NavigationContext"
import { useMenu } from "../../context/MenuContext"

export const MenuManagementScreen = () => {
  const { navigate, goBack } = useAppNavigation()
  const {
    categories,
    items,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    setEditingItem,
    toggleItemAvailability,
  } = useMenu()

  const [showSearch, setShowSearch] = useState(true)

  // Filter items by category and search query
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !searchQuery.trim() ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.variants &&
        item.variants.some((v) =>
          v.toLowerCase().includes(searchQuery.toLowerCase()),
        ))

    const matchesCategory =
      selectedCategory === "All" ||
      item.category.toLowerCase() === selectedCategory.toLowerCase() ||
      (selectedCategory === "Momos & Dimsums" &&
        item.name.toLowerCase().includes("momo"))

    return matchesSearch && matchesCategory
  })

  const totalItemsCount = items.length
  const availableItemsCount = items.filter((i) => i.isAvailable).length

  const handleEditItem = (item) => {
    setEditingItem(item)
    navigate("menu-item")
  }

  const handleAddNewItem = () => {
    setEditingItem(null)
    navigate("menu-item")
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Menu Management" onBack={goBack} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <AppIcon name="search" size={18} color={colors.warmGrey} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search dishes (e.g. momos, paneer, flatbread)..."
            placeholderTextColor={colors.warmGrey}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearSearchBtn}
            >
              <AppIcon name="close" size={14} color={colors.charcoal} />
            </TouchableOpacity>
          )}
        </View>

        {/* Summary Row */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryStat}>
            <Text style={styles.statNumber}>{totalItemsCount}</Text>
            <Text style={styles.statLabel}>Total items</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={[styles.statNumber, styles.terraNumber]}>
              {availableItemsCount}
            </Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
          <AppButton
            onPress={handleAddNewItem}
            icon={<AppIcon name="plus" size={16} color={colors.white} />}
            style={styles.addBtn}
          >
            Add Item
          </AppButton>
        </View>

        {/* Categories Bar */}
        <View style={styles.categoriesWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {categories.map((cat) => {
              const isSelected =
                selectedCategory.toLowerCase() === cat.name.toLowerCase()
              return (
                <TouchableOpacity
                  key={cat.id}
                  activeOpacity={0.7}
                  onPress={() => setSelectedCategory(cat.name)}
                  style={[
                    styles.categoryPill,
                    isSelected && styles.categoryPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      isSelected && styles.categoryPillTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>

        {/* Category Header & Count */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.listSectionTitle}>
            {searchQuery
              ? `Search Results for "${searchQuery}"`
              : selectedCategory}
          </Text>
          <Text style={styles.listCountBadge}>
            {filteredItems.length} dishes
          </Text>
        </View>

        {/* Dishes List */}
        {filteredItems.length === 0 ? (
          <AppCard style={styles.emptyCard}>
            <AppIcon name="catalog" size={36} color={colors.warmGrey} />
            <Text style={styles.emptyTitle}>No dishes found</Text>
            <Text style={styles.emptySub}>
              {searchQuery
                ? `No items match "${searchQuery}". Try a different keyword.`
                : `No items in ${selectedCategory} category yet.`}
            </Text>
            {searchQuery ? (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={styles.resetFilterBtn}
              >
                <Text style={styles.resetFilterText}>Clear Search</Text>
              </TouchableOpacity>
            ) : (
              <AppButton
                onPress={handleAddNewItem}
                style={{ marginTop: 12, minWidth: 140 }}
              >
                + Add Dish to Category
              </AppButton>
            )}
          </AppCard>
        ) : (
          <View style={styles.dishesList}>
            {filteredItems.map((item) => {
              const isItemAvailable = item.isAvailable
              return (
                <AppCard
                  key={item.id}
                  style={[
                    styles.dishCard,
                    !isItemAvailable && styles.dishCardDisabled,
                  ]}
                >
                  <View style={styles.dishTopRow}>
                    {/* Veg / Non-Veg Indicator Symbol */}
                    <View
                      style={[
                        styles.dietSymbolContainer,
                        item.isVeg
                          ? styles.vegSymbolBox
                          : styles.nonVegSymbolBox,
                      ]}
                    >
                      <View
                        style={[
                          styles.dietSymbolDot,
                          item.isVeg
                            ? styles.vegSymbolDot
                            : styles.nonVegSymbolDot,
                        ]}
                      />
                    </View>

                    <View style={styles.dishHeaderInfo}>
                      <Text
                        style={[
                          styles.dishName,
                          !isItemAvailable && styles.dishNameDisabled,
                        ]}
                      >
                        {item.name}
                      </Text>
                      <Text style={styles.dishCategoryTag}>
                        {item.category}
                      </Text>
                    </View>

                    <View style={styles.dishRightControl}>
                      <Text
                        style={[
                          styles.availabilityText,
                          isItemAvailable
                            ? styles.availGreen
                            : styles.availGrey,
                        ]}
                      >
                        {isItemAvailable ? "Available" : "Unavailable"}
                      </Text>
                      <ToggleSwitch
                        on={isItemAvailable}
                        setOn={() => toggleItemAvailability(item.id)}
                      />
                    </View>
                  </View>

                  {item.description ? (
                    <Text style={styles.dishDesc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}

                  {/* Variants and Add-ons badges */}
                  {(item.variants?.length > 0 || item.addOns?.length > 0) && (
                    <View style={styles.tagsContainer}>
                      {item.variants?.map((v, i) => (
                        <View key={`v-${i}`} style={styles.variantBadge}>
                          <Text style={styles.variantBadgeText}>{v}</Text>
                        </View>
                      ))}
                      {item.addOns?.map((a, i) => (
                        <View key={`a-${i}`} style={styles.addonBadge}>
                          <Text style={styles.addonBadgeText}>+{a}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Card Bottom Row: Price + Edit Button */}
                  <View style={styles.dishBottomRow}>
                    <Text style={styles.dishPrice}>₹{item.price}</Text>

                    <View style={styles.dishActions}>
                      <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => handleEditItem(item)}
                      >
                        <AppIcon
                          name="edit"
                          size={14}
                          color={colors.terracotta}
                        />
                        <Text style={styles.editBtnText}>Edit</Text>
                      </TouchableOpacity>
                    </View>
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
    padding: 16,
    paddingBottom: 40,
    maxWidth: 960,
    width: "100%",
    marginHorizontal: "auto",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E8E5E3",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: "DM Sans, sans-serif",
    color: colors.black,
    padding: 0,
    outlineStyle: "none",
    outlineWidth: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    backgroundColor: colors.white,
    padding: 14,
    borderRadius: radius.card,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#E8E5E3",
  },
  summaryStat: {
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
  },
  terraNumber: {
    color: colors.terracotta,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
    marginTop: 1,
  },
  addBtn: {
    width: 105,
    minHeight: 38,
    paddingHorizontal: 12,
  },
  categoriesWrapper: {
    marginBottom: 16,
  },
  categoriesScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E0DDD9",
  },
  categoryPillActive: {
    backgroundColor: colors.terracotta,
    borderColor: colors.terracotta,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Poppins, sans-serif",
    color: colors.charcoal,
  },
  categoryPillTextActive: {
    color: colors.white,
  },
  listHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  listSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
  },
  listCountBadge: {
    fontSize: 11,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
  },
  emptyCard: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderRadius: radius.card,
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
    textAlign: "center",
    marginTop: 4,
    maxWidth: 280,
  },
  resetFilterBtn: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
  },
  resetFilterText: {
    fontSize: 12,
    fontFamily: "Poppins, sans-serif",
    fontWeight: "600",
    color: colors.terracotta,
  },
  dishesList: {
    gap: 12,
  },
  dishCard: {
    padding: 14,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "#EAE7E4",
  },
  dishCardDisabled: {
    opacity: 0.65,
    backgroundColor: "#FAF9F8",
  },
  dishTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 6,
  },
  dietSymbolContainer: {
    width: 16,
    height: 16,
    borderWidth: 1.5,
    borderRadius: 3,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  vegSymbolBox: {
    borderColor: "#10B981",
  },
  nonVegSymbolBox: {
    borderColor: "#EF4444",
  },
  dietSymbolDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  vegSymbolDot: {
    backgroundColor: "#10B981",
  },
  nonVegSymbolDot: {
    backgroundColor: "#EF4444",
  },
  dishHeaderInfo: {
    flex: 1,
  },
  dishName: {
    fontSize: 13.5,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
  },
  dishNameDisabled: {
    textDecorationLine: "line-through",
    color: colors.warmGrey,
  },
  dishCategoryTag: {
    fontSize: 10,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
    marginTop: 1,
  },
  dishRightControl: {
    alignItems: "flex-end",
    gap: 4,
  },
  availabilityText: {
    fontSize: 9.5,
    fontFamily: "Poppins, sans-serif",
    fontWeight: "600",
  },
  availGreen: {
    color: "#059669",
  },
  availGrey: {
    color: colors.warmGrey,
  },
  dishDesc: {
    fontSize: 11.5,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
    lineHeight: 16,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  variantBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: "#F0ECE9",
  },
  variantBadgeText: {
    fontSize: 10,
    fontFamily: "DM Sans, sans-serif",
    fontWeight: "500",
    color: colors.charcoal,
  },
  addonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: "rgba(163, 94, 71, 0.1)",
  },
  addonBadgeText: {
    fontSize: 10,
    fontFamily: "DM Sans, sans-serif",
    fontWeight: "500",
    color: colors.terracotta,
  },
  dishBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F2EFEB",
  },
  dishPrice: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
  },
  dishActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: "rgba(163, 94, 71, 0.1)",
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Poppins, sans-serif",
    color: colors.terracotta,
  },
})

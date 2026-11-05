import React from "react";
import {
  StyleSheet,
  View,
  Dimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import ShimmerPlaceholder from "./ShimmerPlaceholder";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CAROUSEL_CARD_WIDTH = Math.min(SCREEN_WIDTH - 36, 380);

/**
 * 1. Food Module Restaurant Card Skeleton
 * Matches PremiumRestaurantCard in layout, dimensions and warm terracotta theme.
 */
export function FoodCardSkeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.foodCardContainer, style]}>
      {/* Hero Image Box */}
      <ShimmerPlaceholder height={180} borderRadius={18} theme="food" />

      <View style={styles.foodCardBody}>
        {/* Title & Rating Badge */}
        <View style={styles.rowBetween}>
          <ShimmerPlaceholder width="58%" height={18} borderRadius={6} theme="food" />
          <ShimmerPlaceholder width={48} height={22} borderRadius={11} theme="food" />
        </View>

        {/* Cuisine Subtitle */}
        <View style={{ marginTop: 8 }}>
          <ShimmerPlaceholder width="38%" height={12} borderRadius={4} theme="food" />
        </View>

        {/* Distance & ETA Row */}
        <View style={[styles.row, { marginTop: 12, gap: 10 }]}>
          <ShimmerPlaceholder width={85} height={24} borderRadius={12} theme="food" />
          <ShimmerPlaceholder width={70} height={24} borderRadius={12} theme="food" />
        </View>
      </View>
    </View>
  );
}

/**
 * 2. Food Module Carousel Card Skeleton
 * Matches PopularRestaurantsCarousel hero slide in dimensions and styling.
 */
export function FoodCarouselSkeleton() {
  return (
    <View style={styles.carouselContainer}>
      <View style={styles.carouselCard}>
        <ShimmerPlaceholder
          width="100%"
          height={200}
          borderRadius={20}
          theme="food"
        />
        <View style={styles.carouselBodyOverlay}>
          <ShimmerPlaceholder width="50%" height={20} borderRadius={6} theme="dark" />
          <View style={[styles.row, { marginTop: 10, gap: 8 }]}>
            <ShimmerPlaceholder width={75} height={22} borderRadius={11} theme="dark" />
            <ShimmerPlaceholder width={65} height={22} borderRadius={11} theme="dark" />
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * 3. Grocery Module Product Card Skeleton
 * Matches productCard in GroceryHome with green accent theme.
 */
export function GroceryCardSkeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.groceryCard, style]}>
      {/* Product Photo Box */}
      <ShimmerPlaceholder height={96} borderRadius={12} theme="grocery" />

      {/* Product Name */}
      <View style={{ marginTop: 8 }}>
        <ShimmerPlaceholder width="80%" height={12} borderRadius={4} theme="grocery" />
      </View>

      {/* Weight / Unit */}
      <View style={{ marginTop: 4 }}>
        <ShimmerPlaceholder width="50%" height={10} borderRadius={4} theme="grocery" />
      </View>

      {/* Bottom Pricing Row & Plus Button */}
      <View style={[styles.rowBetween, { marginTop: 10 }]}>
        <ShimmerPlaceholder width={45} height={16} borderRadius={4} theme="grocery" />
        <ShimmerPlaceholder width={28} height={28} borderRadius={14} theme="grocery" />
      </View>
    </View>
  );
}

/**
 * 4. Grocery Module Category Skeleton
 * Matches circular category tiles.
 */
export function GroceryCategorySkeleton() {
  return (
    <View style={styles.categoryItem}>
      <ShimmerPlaceholder width={60} height={60} borderRadius={30} theme="grocery" />
      <View style={{ marginTop: 6 }}>
        <ShimmerPlaceholder width={46} height={10} borderRadius={4} theme="grocery" />
      </View>
    </View>
  );
}

/**
 * 5. Store / Restaurant Detail Page Skeleton
 * Matches StoreDetail header and menu list structure.
 */
export function StoreDetailSkeleton({ theme = "food" }: { theme?: "food" | "grocery" }) {
  return (
    <View style={styles.storeDetailContainer}>
      {/* Hero Image */}
      <ShimmerPlaceholder height={210} borderRadius={0} theme={theme} />

      <View style={styles.storeDetailBody}>
        {/* Title */}
        <ShimmerPlaceholder width="70%" height={24} borderRadius={6} theme={theme} />

        {/* Cuisine & Tags */}
        <View style={{ marginTop: 8 }}>
          <ShimmerPlaceholder width="45%" height={14} borderRadius={4} theme={theme} />
        </View>

        {/* Info badges row */}
        <View style={[styles.row, { marginTop: 14, gap: 10 }]}>
          <ShimmerPlaceholder width={90} height={28} borderRadius={14} theme={theme} />
          <ShimmerPlaceholder width={80} height={28} borderRadius={14} theme={theme} />
          <ShimmerPlaceholder width={85} height={28} borderRadius={14} theme={theme} />
        </View>

        {/* Menu Section Heading */}
        <View style={{ marginTop: 28, marginBottom: 14 }}>
          <ShimmerPlaceholder width="40%" height={18} borderRadius={6} theme={theme} />
        </View>

        {/* Dish Row Skeletons */}
        {[1, 2, 3].map((key) => (
          <View key={key} style={styles.dishRow}>
            <View style={{ flex: 1, paddingRight: 14 }}>
              <ShimmerPlaceholder width="60%" height={16} borderRadius={4} theme={theme} />
              <View style={{ marginTop: 6 }}>
                <ShimmerPlaceholder width={50} height={14} borderRadius={4} theme={theme} />
              </View>
              <View style={{ marginTop: 6 }}>
                <ShimmerPlaceholder width="85%" height={10} borderRadius={4} theme={theme} />
              </View>
            </View>
            <ShimmerPlaceholder width={90} height={90} borderRadius={14} theme={theme} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  foodCardContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#f0eae1",
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: "hidden",
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  foodCardBody: {
    paddingHorizontal: 4,
    paddingTop: 10,
    paddingBottom: 4,
  },
  carouselContainer: {
    paddingHorizontal: 16,
    marginVertical: 4,
  },
  carouselCard: {
    width: CAROUSEL_CARD_WIDTH,
    height: 200,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
  },
  carouselBodyOverlay: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
  },
  groceryCard: {
    width: 140,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d6ebd9",
    padding: 8,
    marginRight: 12,
  },
  categoryItem: {
    alignItems: "center",
    marginRight: 16,
  },
  storeDetailContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  storeDetailBody: {
    padding: 16,
  },
  dishRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});

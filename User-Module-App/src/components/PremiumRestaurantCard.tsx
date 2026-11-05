import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  Pressable,
  TouchableOpacity,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ActivityIndicator,
} from "react-native";
import Icon from "./Icon";
import type { Restaurant, MenuItem } from "../data/demo";

const { width: WINDOW_WIDTH } = Dimensions.get("window");

export interface PremiumRestaurantCardProps {
  restaurant: Restaurant;
  onSelect: (restaurant: Restaurant) => void;
  onSelectFeaturedDish?: (restaurant: Restaurant, dish: MenuItem) => void;
  onToggleFavorite?: (restaurant: Restaurant) => void;
  isFavorite?: boolean;
  style?: any;
}

/**
 * Standard FSSAI Indian Veg / Non-Veg Indicator Icon
 */
function VegNonVegBadge({ isVeg }: { isVeg: boolean }) {
  const iconColor = isVeg ? "#16a34a" : "#dc2626";
  return (
    <View style={[styles.vegSquare, { borderColor: iconColor }]}>
      {isVeg ? (
        <View style={[styles.vegCircle, { backgroundColor: iconColor }]} />
      ) : (
        <View style={[styles.nonVegTriangle, { borderBottomColor: iconColor }]} />
      )}
    </View>
  );
}

/**
 * Food Cloche Silhouette Icon SVG-like representation for warm brown card watermark
 */
function ClocheWatermark() {
  return (
    <View style={styles.clocheContainer} pointerEvents="none">
      <View style={styles.clocheHandle} />
      <View style={styles.clocheDome} />
      <View style={styles.clocheBase} />
    </View>
  );
}

export default function PremiumRestaurantCard({
  restaurant,
  onSelect,
  onSelectFeaturedDish,
  onToggleFavorite,
  isFavorite = false,
  style,
}: PremiumRestaurantCardProps) {
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [imageLoading, setImageLoading] = useState(false);
  const [cardWidth, setCardWidth] = useState(WINDOW_WIDTH - 32);

  // Collect vendor-uploaded store photos or food photos
  const photos = useMemo(() => {
    const list: string[] = [];
    if (restaurant.photo) list.push(restaurant.photo);
    if (restaurant.photos && restaurant.photos.length > 0) {
      restaurant.photos.forEach((p) => {
        if (p && !list.includes(p)) list.push(p);
      });
    }
    return list.length > 0 ? list : [restaurant.photo];
  }, [restaurant.photo, restaurant.photos]);

  const hasMultiplePhotos = photos.length > 1;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / cardWidth);
    if (idx >= 0 && idx < photos.length && idx !== activePhotoIdx) {
      setActivePhotoIdx(idx);
    }
  };

  const featured = restaurant.featuredDish;
  const ratingVal = restaurant.rating ? restaurant.rating.toFixed(1) : "5.0";
  const cuisinesSubtitle =
    restaurant.cuisines && restaurant.cuisines.length > 0
      ? restaurant.cuisines.slice(0, 2).join(" & ").toUpperCase()
      : "RESTAURANT & DINING";

  const bestOfferHeadline =
    restaurant.activeOffer?.formattedHeadline || "Flat ₹50 OFF above ₹249";

  return (
    <Pressable
      onPress={() => onSelect(restaurant)}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - cardWidth) > 2) {
          setCardWidth(w);
        }
      }}
      style={({ pressed }) => [
        styles.cardContainer,
        pressed && styles.cardPressed,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`View ${restaurant.name}`}
    >
      {/* ================= 1. COVER IMAGE / CAROUSEL ================= */}
      <View style={styles.imageSection}>
        {hasMultiplePhotos ? (
          <FlatList
            data={photos}
            keyExtractor={(item, index) => `${restaurant.id}-photo-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={cardWidth}
            snapToAlignment="center"
            onScroll={handleScroll}
            scrollEventThrottle={16}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item }}
                style={[styles.coverImage, { width: cardWidth }]}
                resizeMode="cover"
              />
            )}
          />
        ) : (
          <Image
            source={{ uri: photos[0] }}
            style={[styles.coverImage, { width: "100%" }]}
            resizeMode="cover"
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => setImageLoading(false)}
          />
        )}

        {imageLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="#ffffff" />
          </View>
        )}

        {/* Top-Left: Circular Back/View Action */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onSelect(restaurant)}
          style={styles.floatingCircleBtn}
          accessibilityRole="button"
          accessibilityLabel="Open restaurant"
        >
          <Icon name="arrow-left" size={16} color="#ffffff" />
        </TouchableOpacity>

        {/* Top-Right Floating Controls (Bookmark & Settings) */}
        <View style={styles.topRightControls}>
          <TouchableOpacity
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={(e) => {
              e.stopPropagation();
              onToggleFavorite?.(restaurant);
            }}
            style={styles.floatingCircleBtn}
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Icon
              name="bookmark"
              size={17}
              color={isFavorite ? "#fbbf24" : "#ffffff"}
              filled={isFavorite}
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={(e) => {
              e.stopPropagation();
              onSelect(restaurant);
            }}
            style={styles.floatingCircleBtn}
            accessibilityRole="button"
            accessibilityLabel="More options"
          >
            <Icon name="settings" size={17} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Top-Left Dynamic Food Highlight Badge (if available) */}
        {featured ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={(e) => {
              e.stopPropagation();
              if (onSelectFeaturedDish) {
                onSelectFeaturedDish(restaurant, featured);
              } else {
                onSelect(restaurant);
              }
            }}
            style={styles.featuredBadge}
          >
            <VegNonVegBadge isVeg={featured.isVeg !== false} />
            <Text style={styles.featuredBadgeText} numberOfLines={1}>
              {featured.name} · ₹{featured.price}
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Bottom-Center Carousel Pagination Dots */}
        {hasMultiplePhotos && (
          <View style={styles.paginationCenterRow}>
            {photos.map((_, idx) => (
              <View
                key={`dot-${idx}`}
                style={[
                  styles.dot,
                  idx === activePhotoIdx && styles.dotActive,
                ]}
              />
            ))}
          </View>
        )}
      </View>

      {/* ================= 2. WARM BROWN INFORMATION PANEL ================= */}
      <View style={styles.warmBrownPanel}>
        {/* Background Cloche Watermark */}
        <ClocheWatermark />

        {/* Title & Rating Row */}
        <View style={styles.titleAndRatingRow}>
          <View style={styles.titleCol}>
            <Text style={styles.restaurantTitle} numberOfLines={1}>
              {restaurant.name}
            </Text>
            <View style={styles.subtitleRow}>
              <View style={styles.subLine} />
              <Text style={styles.subtitleText}>{cuisinesSubtitle}</Text>
              <View style={styles.subLine} />
            </View>
          </View>

          {/* Deep Warm Brown Rating Badge */}
          <View style={styles.warmBrownRatingBadge}>
            <Icon name="star" size={13} color="#fbbf24" filled />
            <Text style={styles.warmBrownRatingText}>{ratingVal}</Text>
          </View>
        </View>

        {/* Meta Pill Row: ETA | Distance */}
        <View style={styles.metaPill}>
          <Icon name="clock" size={14} color="#3e1c0d" />
          <Text style={styles.metaPillText}>{restaurant.eta}</Text>
          <Text style={styles.metaDivider}>|</Text>
          <Icon name="pin" size={14} color="#3e1c0d" />
          <Text style={styles.metaPillText}>
            {restaurant.distanceKm !== undefined
              ? `${restaurant.distanceKm.toFixed(1)} km`
              : "Nearby"}
          </Text>
        </View>

        {/* Best Active Restaurant Offer Pill */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onSelect(restaurant)}
          style={styles.offerPill}
        >
          <View style={styles.offerLeft}>
            <Icon name="badge-percent" size={16} color="#8c4a23" filled />
            <Text style={styles.offerHeadline} numberOfLines={1}>
              {bestOfferHeadline}
            </Text>
          </View>
          <Icon name="chevron-right" size={14} color="#3e1c0d" />
        </TouchableOpacity>

        {/* Bottom Warm Brown Curved Accent Wave */}
        <View style={styles.bottomWaveAccent} pointerEvents="none" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: "#ebe2d5",
    shadowColor: "#3e1c0d",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  cardPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.995 }],
  },
  imageSection: {
    height: 215,
    width: "100%",
    position: "relative",
    backgroundColor: "#2a150c",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  coverImage: {
    height: 215,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  // Floating Circle Controls
  floatingCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  topRightControls: {
    position: "absolute",
    top: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 10,
  },
  // Top-left food highlight
  featuredBadge: {
    position: "absolute",
    top: 56,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(23, 21, 20, 0.78)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    maxWidth: "75%",
    zIndex: 8,
  },
  vegSquare: {
    width: 13,
    height: 13,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 3,
    backgroundColor: "#ffffff",
  },
  vegCircle: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  nonVegTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  featuredBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  // Pagination Center Dots
  paginationCenterRow: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    zIndex: 5,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  dotActive: {
    width: 14,
    borderRadius: 3,
    backgroundColor: "#ffffff",
  },
  // ================= 2. WARM BROWN INFORMATION PANEL =================
  warmBrownPanel: {
    backgroundColor: "#fcf7f0",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    position: "relative",
    overflow: "hidden",
  },
  titleAndRatingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  titleCol: {
    flex: 1,
    paddingRight: 10,
  },
  restaurantTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#2a150c",
    letterSpacing: -0.4,
    lineHeight: 26,
    marginBottom: 4,
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  subLine: {
    width: 18,
    height: 1,
    backgroundColor: "#bda592",
  },
  subtitleText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#735a4b",
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  warmBrownRatingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#3e1c0d",
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 14,
    shadowColor: "#3e1c0d",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  warmBrownRatingText: {
    color: "#ffffff",
    fontSize: 13.5,
    fontWeight: "900",
  },
  // Meta Pill: Time | Distance
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#f2eae0",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e8dcce",
  },
  metaPillText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#3e1c0d",
  },
  metaDivider: {
    fontSize: 11,
    color: "#b09c8d",
    marginHorizontal: 2,
  },
  // Offer Pill
  offerPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ebdbcc",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#dfc7b2",
    marginTop: 2,
    zIndex: 2,
  },
  offerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    paddingRight: 6,
  },
  offerHeadline: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#2a150c",
  },
  // Cloche Watermark Graphic
  clocheContainer: {
    position: "absolute",
    right: 14,
    top: 52,
    width: 60,
    height: 40,
    alignItems: "center",
    opacity: 0.22,
  },
  clocheHandle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#7a4627",
    marginBottom: -1,
  },
  clocheDome: {
    width: 50,
    height: 24,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    backgroundColor: "#7a4627",
  },
  clocheBase: {
    width: 56,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#7a4627",
    marginTop: 2,
  },
  // Bottom Wave Accent
  bottomWaveAccent: {
    position: "absolute",
    bottom: -15,
    right: -20,
    width: 140,
    height: 35,
    borderRadius: 20,
    backgroundColor: "#4a2412",
    opacity: 0.08,
    transform: [{ rotate: "-8deg" }],
  },
});

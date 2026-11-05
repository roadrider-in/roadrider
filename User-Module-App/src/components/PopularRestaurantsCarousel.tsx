import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  ImageBackground,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ActivityIndicator,
  Animated,
} from "react-native";
import Icon from "./Icon";
import type { Restaurant } from "../data/demo";
import { colors } from "../theme/tokens";
import { FoodCarouselSkeleton } from "./animations/ModuleSkeletons";
import FadeInView from "./animations/FadeInView";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 36, 380);
const CARD_GAP = 14;
const AUTO_SLIDE_INTERVAL_MS = 4500;

interface PopularRestaurantsCarouselProps {
  restaurants: Restaurant[];
  isLoading?: boolean;
  onSelect: (restaurant: Restaurant) => void;
  onAdClick?: (restaurant: Restaurant) => void;
}

export default function PopularRestaurantsCarousel({
  restaurants,
  isLoading = false,
  onSelect,
  onAdClick,
}: PopularRestaurantsCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const autoSlideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Deduplicate restaurants by name/id so each slide is a distinct, genuine restaurant
  const carouselItems = React.useMemo(() => {
    if (!restaurants || restaurants.length === 0) return [];
    const seenNames = new Set<string>();
    const unique: Restaurant[] = [];

    for (const r of restaurants) {
      const normName = (r.name || "").trim().toLowerCase();
      if (!seenNames.has(normName)) {
        seenNames.add(normName);
        unique.push(r);
      }
    }
    return unique.slice(0, 6);
  }, [restaurants]);

  // Slide navigation
  const scrollToIndex = useCallback(
    (index: number, animated: boolean = true) => {
      if (!scrollRef.current || carouselItems.length === 0) return;
      const targetX = index * (CARD_WIDTH + CARD_GAP);
      scrollRef.current.scrollTo({ x: targetX, animated });
      setActiveIndex(index);
    },
    [carouselItems.length]
  );

  // Auto sliding logic with clean pause/resume
  useEffect(() => {
    if (isLoading || carouselItems.length <= 1 || isInteracting) {
      if (autoSlideTimer.current) {
        clearInterval(autoSlideTimer.current);
        autoSlideTimer.current = null;
      }
      return;
    }

    autoSlideTimer.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % carouselItems.length;
        if (scrollRef.current) {
          scrollRef.current.scrollTo({
            x: next * (CARD_WIDTH + CARD_GAP),
            animated: true,
          });
        }
        return next;
      });
    }, AUTO_SLIDE_INTERVAL_MS);

    return () => {
      if (autoSlideTimer.current) {
        clearInterval(autoSlideTimer.current);
        autoSlideTimer.current = null;
      }
    };
  }, [isLoading, carouselItems.length, isInteracting]);

  // Handle scroll events and update active indicator
  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / (CARD_WIDTH + CARD_GAP));
    if (index !== activeIndex && index >= 0 && index < carouselItems.length) {
      setActiveIndex(index);
    }
  };

  const handleTouchStart = () => {
    setIsInteracting(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  };

  const handleTouchEnd = () => {
    // Resume auto-sliding 2.5s after user interaction ends
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      setIsInteracting(false);
    }, 2500);
  };

  const handleCardPress = (r: Restaurant) => {
    if (r.isSponsored && onAdClick) {
      onAdClick(r);
    }
    onSelect(r);
  };

  // Render Skeleton Loader while fetching
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.eyebrow}>FEATURED & POPULAR</Text>
            <Text style={styles.title}>Promotions & top picks</Text>
          </View>
          <View style={styles.badgePill}>
            <Text style={styles.badgePillText}>✨ NEARBY</Text>
          </View>
        </View>

        <FoodCarouselSkeleton />
      </View>
    );
  }

  if (carouselItems.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.eyebrow}>FEATURED & POPULAR</Text>
          <Text style={styles.title}>Promotions & top picks</Text>
        </View>
        <View style={styles.badgePill}>
          <Text style={styles.badgePillText}>✨ NEARBY</Text>
        </View>
      </View>

      {/* Horizontal Carousel */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled={false}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + CARD_GAP}
        snapToAlignment="start"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onScrollBeginDrag={handleTouchStart}
        onScrollEndDrag={handleTouchEnd}
        onMomentumScrollEnd={(e) => {
          handleScroll(e);
          handleTouchEnd();
        }}
      >
        {carouselItems.map((r, idx) => {
          const isSponsored = Boolean(r.isSponsored);
          const distanceStr =
            r.distanceKm !== undefined ? `${r.distanceKm} km` : "Nearby";
          const offerHeadline =
            r.activeOffer?.formattedHeadline || r.discount || null;

          return (
            <Pressable
              key={`carousel-${r.id}-${idx}`}
              onPress={() => handleCardPress(r)}
              style={({ pressed }) => [
                styles.card,
                pressed && styles.pressed,
                { width: CARD_WIDTH },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`View ${r.name}`}
            >
              <ImageBackground
                source={{ uri: r.photo }}
                style={styles.cardImage}
                imageStyle={styles.cardImageStyle}
              >
                {/* Dark gradient overlay for text readability */}
                <View style={styles.overlay} />

                {/* Top Badges Row */}
                <View style={styles.topBadgesRow}>
                  {/* Left: Sponsored OR Offer Badge. Never label ordinary as sponsored */}
                  {isSponsored ? (
                    <View style={styles.sponsoredBadge}>
                      <Text style={styles.sponsoredText}>AD · SPONSORED</Text>
                    </View>
                  ) : offerHeadline ? (
                    <View style={styles.offerBadge}>
                      <Text style={styles.offerText}>{offerHeadline}</Text>
                    </View>
                  ) : (
                    <View style={styles.featuredBadge}>
                      <Text style={styles.featuredBadgeText}>FEATURED</Text>
                    </View>
                  )}

                  {/* Right: Open Now / Closed Status */}
                  <View
                    style={[
                      styles.statusPill,
                      !r.isOnline && styles.statusPillOffline,
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        !r.isOnline && styles.statusDotOffline,
                      ]}
                    />
                    <Text style={styles.statusText}>
                      {r.isOnline ? "OPEN NOW" : "OFFLINE"}
                    </Text>
                  </View>
                </View>

                {/* Floating Bottom Card Details inside hero */}
                <View style={styles.imageBottomContent}>
                  {/* Row 1: Restaurant Name & Rating */}
                  <View style={styles.titleRow}>
                    <Text style={styles.restaurantName} numberOfLines={1}>
                      {r.name}
                    </Text>
                    <View style={styles.ratingBox}>
                      <Icon name="star" size={11} color="#ffffff" filled />
                      <Text style={styles.ratingNumber}>
                        {" "}
                        {r.rating ? r.rating.toFixed(1) : "4.1"}
                      </Text>
                    </View>
                  </View>

                  {/* Row 2: Cuisine Category */}
                  <Text style={styles.cuisinesText} numberOfLines={1}>
                    {r.cuisines.join(" · ")}
                  </Text>

                  {/* Row 3: Distance, ETA & Order Now Button */}
                  <View style={styles.metaRow}>
                    <View style={styles.metaChip}>
                      <Text style={styles.metaChipText}>📍 {distanceStr}</Text>
                    </View>
                    <View style={styles.metaChip}>
                      <Text style={styles.metaChipText}>⏱ {r.eta}</Text>
                    </View>
                    <Pressable
                      style={styles.orderNowBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleCardPress(r);
                      }}
                    >
                      <Text style={styles.orderNowText}>Order Now →</Text>
                    </Pressable>
                  </View>
                </View>
              </ImageBackground>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Pagination Indicators (active dot elongated in brand accent) */}
      {carouselItems.length > 1 && (
        <View style={styles.paginationRow}>
          {carouselItems.map((_, i) => (
            <Pressable
              key={`dot-${i}`}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              onPress={() => scrollToIndex(i)}
              style={[styles.dot, activeIndex === i && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 18,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  headerLeft: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 9.5,
    fontWeight: "800",
    color: colors.accent,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.4,
  },
  badgePill: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.accent,
  },
  scrollContent: {
    paddingHorizontal: 18,
    gap: CARD_GAP,
  },
  card: {
    height: 200,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#221d1b",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 4,
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  cardImage: {
    width: "100%",
    height: "100%",
    justifyContent: "space-between",
  },
  cardImageStyle: {
    borderRadius: 18,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.42)",
  },
  topBadgesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  sponsoredBadge: {
    backgroundColor: "#ea580c",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sponsoredText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  offerBadge: {
    backgroundColor: "rgba(26, 115, 232, 0.92)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  offerText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 0.3,
  },
  featuredBadge: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  featuredBadgeText: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30, 142, 62, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  statusPillOffline: {
    backgroundColor: "rgba(0, 0, 0, 0.65)",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ffffff",
  },
  statusDotOffline: {
    backgroundColor: "#9ca3af",
  },
  statusText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 0.4,
  },
  imageBottomContent: {
    padding: 12,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
    flex: 1,
    marginRight: 8,
    letterSpacing: -0.3,
  },
  ratingBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e8e3e",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingNumber: {
    fontSize: 11,
    fontWeight: "800",
    color: "#ffffff",
  },
  cuisinesText: {
    fontSize: 11.5,
    color: "#d1d5db",
    fontWeight: "500",
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaChip: {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaChipText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#ffffff",
  },
  orderNowBtn: {
    backgroundColor: "#c84b31",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  orderNowText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#ffffff",
  },
  paginationRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#d1d5db",
  },
  dotActive: {
    width: 18,
    backgroundColor: "#c84b31",
  },
  skeletonCard: {
    marginHorizontal: 18,
    height: 190,
    borderRadius: 18,
    backgroundColor: "#f5f3f0",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  skeletonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9ca3af",
  },
});

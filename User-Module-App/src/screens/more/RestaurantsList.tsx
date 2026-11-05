import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FlowHeader from "../../components/FlowHeader";
import SearchBar from "../../components/SearchBar";
import Icon from "../../components/Icon";
import PremiumRestaurantCard from "../../components/PremiumRestaurantCard";
import { FoodCardSkeleton } from "../../components/animations/ModuleSkeletons";
import FadeInView from "../../components/animations/FadeInView";
import { FOOD_CATEGORIES, type Restaurant } from "../../data/demo";
import { fetchCuisines, fetchApprovedRestaurants } from "../../lib/supabaseData";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { colors, radii } from "../../theme/tokens";

interface RestaurantsListProps {
  cuisine?: string;
}

export default function RestaurantsList({ cuisine }: RestaurantsListProps) {
  const { back, push } = useNav();
  const { state, toggleFavorite, setPendingAction, showToast, placeById } = useApp();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const currentPlace = placeById(state.defaultPlaceId) ?? state.places[0];

  const loadRestaurants = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    const res = await fetchApprovedRestaurants(currentPlace?.coords ?? null);
    if (res.error) {
      setLoadError(res.error);
      setRestaurants([]);
    } else {
      setRestaurants(res.data);
    }
    setIsLoading(false);
  }, [currentPlace?.coords?.lat, currentPlace?.coords?.lng]);

  useEffect(() => {
    loadRestaurants();
  }, [loadRestaurants]);

  const handleToggleFav = (r: Restaurant) => {
    if (!state.authenticated) {
      setPendingAction({
        type: "wishlist",
        itemId: r.id,
        itemTitle: r.name,
      });
      showToast("Please log in to save to your wishlist");
      push({ name: "phone" });
      return;
    }
    toggleFavorite(r.id);
  };

  const [search, setSearch] = useState("");
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(
    cuisine ?? null
  );
  const [sortBy, setSortBy] = useState<"rating" | "eta">("rating");
  const [allCuisines, setAllCuisines] = useState<string[]>([
    "All",
    ...FOOD_CATEGORIES.map((c) => c.label),
    "South Indian",
  ]);

  useEffect(() => {
    let isMounted = true;
    fetchCuisines().then((res) => {
      if (isMounted && res.length > 0) {
        setAllCuisines(["All", ...res]);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = restaurants.filter((r) => {
    const matchesSearch =
      !search.trim() ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.cuisines.some((c) => c.toLowerCase().includes(search.toLowerCase())) ||
      r.menu.some((m) => m.name.toLowerCase().includes(search.toLowerCase()));

    const matchesCuisine =
      !selectedCuisine ||
      selectedCuisine === "All" ||
      r.cuisines.some(
        (c) => c.toLowerCase() === selectedCuisine.toLowerCase()
      );

    return matchesSearch && matchesCuisine;
  }).sort((a, b) => {
    if (sortBy === "rating") return b.rating - a.rating;
    return parseInt(a.eta, 10) - parseInt(b.eta, 10);
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <FlowHeader title="All Restaurants" onBack={back} showHelp={false} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <SearchBar
          placeholder="Search restaurant or cuisine..."
          value={search}
          onChange={setSearch}
        />

        {/* Cuisine Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cuisinesScroll}
        >
          {allCuisines.map((c) => {
            const active =
              selectedCuisine === c || (!selectedCuisine && c === "All");
            return (
              <TouchableOpacity
                key={c}
                activeOpacity={0.8}
                onPress={() => setSelectedCuisine(c === "All" ? null : c)}
                style={[styles.cuisineChip, active && styles.cuisineChipActive]}
              >
                <Text
                  style={[
                    styles.cuisineChipText,
                    active && styles.cuisineChipTextActive,
                  ]}
                >
                  {c}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Count and Sort Bar */}
        <View style={styles.filterMetaRow}>
          <Text style={styles.countText}>
            {filtered.length} places near Hazratganj
          </Text>
          <TouchableOpacity
            onPress={() => setSortBy(sortBy === "rating" ? "eta" : "rating")}
          >
            <Text style={styles.sortText}>
              Sort: {sortBy === "rating" ? "Top Rated" : "Fastest Delivery"} ▾
            </Text>
          </TouchableOpacity>
        </View>

        {/* Restaurants List */}
        <View style={styles.restaurantsList}>
          {isLoading ? (
            <View style={{ paddingTop: 8 }}>
              <FoodCardSkeleton />
              <FoodCardSkeleton />
              <FoodCardSkeleton />
            </View>
          ) : loadError ? (
            <View style={{ padding: 24, margin: 16, backgroundColor: "#fff5f5", borderRadius: radii.md, alignItems: "center", borderWidth: 1, borderColor: "#fed7d7" }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#c53030", marginBottom: 4 }}>
                Failed to load restaurants
              </Text>
              <Text style={{ fontSize: 12, color: "#742a2a", textAlign: "center", marginBottom: 12 }}>
                {loadError}
              </Text>
              <TouchableOpacity onPress={loadRestaurants} style={{ backgroundColor: colors.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radii.sm }}>
                <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "700" }}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : filtered.length === 0 ? (
            <View style={{ padding: 36, alignItems: "center", backgroundColor: "rgba(0,0,0,0.02)", borderRadius: radii.md, margin: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: colors.ink, marginBottom: 4 }}>
                {restaurants.length === 0 ? "No approved restaurants available yet." : "No restaurants match your search."}
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted, textAlign: "center", lineHeight: 18 }}>
                {restaurants.length === 0
                  ? "All restaurant partners undergo strict verification and admin review. Check back soon!"
                  : "Try clearing search filters or selecting another cuisine."}
              </Text>
            </View>
          ) : (
            <FadeInView triggerKey={filtered.length}>
              {filtered.map((restaurant) => {
                const isFav = state.favorites.includes(restaurant.id);
                return (
                  <PremiumRestaurantCard
                    key={restaurant.id}
                    restaurant={restaurant}
                    isFavorite={isFav}
                    onSelect={(r) =>
                      push({
                        name: "detail",
                        service: "food",
                        storeId: r.id,
                      })
                    }
                    onSelectFeaturedDish={(r, dish) =>
                      push({
                        name: "detail",
                        service: "food",
                        storeId: r.id,
                        highlightItemId: dish.id,
                      })
                    }
                    onToggleFavorite={(r) => handleToggleFav(r)}
                  />
                );
              })}
            </FadeInView>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 90,
  },
  cuisinesScroll: {
    gap: 8,
    paddingVertical: 10,
  },
  cuisineChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.full,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.line,
  },
  cuisineChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  cuisineChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.ink,
  },
  cuisineChipTextActive: {
    color: "#ffffff",
  },
  filterMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 10,
  },
  countText: {
    fontSize: 11,
    color: colors.muted,
  },
  sortText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent,
  },
  restaurantsList: {
    gap: 14,
    marginTop: 4,
  },
  restaurantCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardCoverWrapper: {
    height: 140,
    width: "100%",
    position: "relative",
  },
  cardPhoto: {
    width: "100%",
    height: "100%",
  },
  discountBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
  },
  favBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    padding: 14,
  },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  restaurantName: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink,
  },
  cuisinesText: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 3,
  },
  ratingBadge: {
    backgroundColor: "#288153",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
  },
  cardFooter: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  etaText: {
    fontSize: 11,
    color: colors.muted,
  },
  menuLinkText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent,
  },
});

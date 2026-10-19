import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FlowHeader from "../../components/FlowHeader";
import SearchBar from "../../components/SearchBar";
import Icon from "../../components/Icon";
import { RESTAURANTS, FOOD_CATEGORIES } from "../../data/demo";
import { fetchCuisines } from "../../lib/supabaseData";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { colors, radii } from "../../theme/tokens";

interface RestaurantsListProps {
  cuisine?: string;
}

export default function RestaurantsList({ cuisine }: RestaurantsListProps) {
  const { back, push } = useNav();
  const { state, toggleFavorite, setPendingAction, showToast } = useApp();

  const handleToggleFav = (r: (typeof RESTAURANTS)[0]) => {
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

  const filtered = RESTAURANTS.filter((r) => {
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
          {filtered.map((restaurant) => {
            const isFav = state.favorites.includes(restaurant.id);
            return (
              <TouchableOpacity
                key={restaurant.id}
                activeOpacity={0.85}
                onPress={() =>
                  push({
                    name: "detail",
                    service: "food",
                    storeId: restaurant.id,
                  })
                }
                style={styles.restaurantCard}
              >
                {/* Photo & Badges */}
                <View style={styles.cardCoverWrapper}>
                  <Image
                    source={{ uri: restaurant.photo }}
                    style={styles.cardPhoto}
                    resizeMode="cover"
                  />
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>
                      {restaurant.discount}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleToggleFav(restaurant)}
                    style={styles.favBtn}
                  >
                    <Icon
                      name="heart"
                      size={16}
                      filled={isFav}
                      color={isFav ? "#ff4d2e" : "#777777"}
                    />
                  </TouchableOpacity>
                </View>

                {/* Info Content */}
                <View style={styles.cardContent}>
                  <View style={styles.cardTitleRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.restaurantName}>
                        {restaurant.name}
                      </Text>
                      <Text style={styles.cuisinesText}>
                        {restaurant.cuisines.join(" · ")}
                      </Text>
                    </View>
                    <View style={styles.ratingBadge}>
                      <Icon name="star" size={10} filled color="#ffffff" />
                      <Text style={styles.ratingText}>
                        {" "}
                        {restaurant.rating}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={styles.etaText}>
                      🕒 {restaurant.eta} delivery
                    </Text>
                    <Text style={styles.menuLinkText}>View Menu →</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
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

import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ImageBackground,
  Pressable,
} from "react-native";
import Header from "../../components/Header";
import ServiceTabs from "../../components/ServiceTabs";
import SearchBar from "../../components/SearchBar";
import Icon from "../../components/Icon";
import {
  FOOD_CATEGORIES,
  MORE_CUISINES,
  PHOTOS,
  RESTAURANTS,
  serviceMeta,
  type Service,
} from "../../data/demo";
import { fetchCuisines } from "../../lib/supabaseData";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { rupees } from "../../lib/pricing";
import { colors, radii } from "../../theme/tokens";

export default function FoodHome() {
  const { push } = useNav();
  const {
    setService,
    state,
    toggleFavorite,
    applyPromo,
    showToast,
    setPendingAction,
  } = useApp();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showMoreCuisines, setShowMoreCuisines] = useState(false);
  const [filterOnlyLiked, setFilterOnlyLiked] = useState(false);
  const [cuisinesList, setCuisinesList] = useState<string[]>(MORE_CUISINES);

  const handleToggleRestaurantFav = (r: (typeof RESTAURANTS)[0]) => {
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

  useEffect(() => {
    let isMounted = true;
    fetchCuisines().then((res) => {
      if (isMounted && res.length > 0) {
        setCuisinesList(res);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectService = (s: Service) => {
    setService(s);
  };

  // Aggregated preview list for "Your favorites" slider
  const favRestaurants = RESTAURANTS.filter((r) =>
    state.favorites.includes(r.id)
  );
  const favDishes: {
    id: string;
    title: string;
    subtitle: string;
    meta: string;
    tag: "DISH" | "RESTAURANT";
    photo: string;
    onClick: () => void;
  }[] = [];
  for (const r of RESTAURANTS) {
    for (const m of r.menu) {
      if (state.favorites.includes(m.id)) {
        favDishes.push({
          id: m.id,
          title: m.name,
          subtitle: r.name,
          meta: rupees(m.price),
          tag: "DISH",
          photo: r.photo,
          onClick: () =>
            push({ name: "detail", service: "food", storeId: r.id }),
        });
      }
    }
  }

  const favoritePreviews = [
    ...favRestaurants.map((r) => ({
      id: r.id,
      title: r.name,
      subtitle: r.cuisines.join(" · "),
      meta: `⭐ ${r.rating} · ${r.eta}`,
      tag: "RESTAURANT" as const,
      photo: r.photo,
      onClick: () => push({ name: "detail", service: "food", storeId: r.id }),
    })),
    ...favDishes,
  ];

  const matchingRestaurants = RESTAURANTS.filter((r) => {
    const matchesSearch =
      !search.trim() ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.cuisines.some((c) => c.toLowerCase().includes(search.toLowerCase())) ||
      r.menu.some((m) => m.name.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      !activeCategory ||
      r.cuisines.some((c) => c.toLowerCase() === activeCategory.toLowerCase());

    const matchesLiked =
      !filterOnlyLiked ||
      state.favorites.includes(r.id) ||
      r.menu.some((m) => state.favorites.includes(m.id));

    return matchesSearch && matchesCategory && matchesLiked;
  });

  const handleApplyPromo = (code: string) => {
    applyPromo("food", code);
    showToast(`Promo code ${code} applied to your food cart!`);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Section */}
      <ImageBackground
        source={{ uri: PHOTOS.food }}
        style={styles.hero}
        resizeMode="cover"
      >
        <View style={styles.heroOverlay} />
        <Header dark />
        <ServiceTabs service="food" onSelect={handleSelectService} />
        <View style={styles.heroCopy}>
          <Text style={styles.heroKicker}>{serviceMeta.food.kicker}</Text>
          <Text style={styles.heroTitle}>
            Delicious food,{"\n"}delivered fast.
          </Text>
        </View>
      </ImageBackground>

      {/* Main Body */}
      <View style={styles.body}>
        <View style={styles.floatingSearchWrap}>
          <SearchBar
            placeholder="Search dishes or restaurants"
            value={search}
            onChange={setSearch}
            onFilter={() => setShowMoreCuisines((v) => !v)}
          />
        </View>

        {/* Your Favorites Slider */}
        {favoritePreviews.length > 0 && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeading}>
              <View style={styles.headingLeft}>
                <Text style={styles.heartEmoji}>❤️</Text>
                <Text style={styles.sectionTitle}>Your favorites</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{favoritePreviews.length}</Text>
                </View>
              </View>
              <Pressable onPress={() => push({ name: "favorites", service: "food" })}>
                <Text style={styles.linkText}>See all</Text>
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.favSlider}
            >
              {favoritePreviews.map((fav) => (
                <Pressable
                  key={fav.id}
                  onPress={fav.onClick}
                  style={({ pressed }) => [
                    styles.favCard,
                    pressed && styles.pressed,
                  ]}
                >
                  <ImageBackground
                    source={{ uri: fav.photo }}
                    style={styles.favThumb}
                    imageStyle={{ borderRadius: radii.sm }}
                  >
                    <View style={styles.favHeartIcon}>
                      <Icon name="heart" size={12} color="#ff5232" filled />
                    </View>
                    <View style={styles.favTagBadge}>
                      <Text style={styles.favTagText}>{fav.tag}</Text>
                    </View>
                  </ImageBackground>
                  <Text style={styles.favTitle} numberOfLines={1}>
                    {fav.title}
                  </Text>
                  <Text style={styles.favSub} numberOfLines={1}>
                    {fav.subtitle}
                  </Text>
                  <Text style={styles.favMeta}>{fav.meta}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Categories Section */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>What are you craving?</Text>
          </View>

          <View style={styles.categoriesRow}>
            {FOOD_CATEGORIES.map(({ icon, label }) => {
              const selected = activeCategory === label;
              return (
                <Pressable
                  key={label}
                  onPress={() => setActiveCategory(selected ? null : label)}
                  style={[
                    styles.categoryBtn,
                    selected && styles.categoryBtnActive,
                  ]}
                >
                  <View
                    style={[
                      styles.categoryIconCircle,
                      selected && styles.categoryIconCircleActive,
                    ]}
                  >
                    <Text style={styles.categoryEmoji}>{icon}</Text>
                  </View>
                  <Text
                    style={[
                      styles.categoryLabel,
                      selected && styles.categoryLabelActive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => setShowMoreCuisines((v) => !v)}
              style={[
                styles.categoryBtn,
                showMoreCuisines && styles.categoryBtnActive,
              ]}
            >
              <View style={styles.categoryIconCircle}>
                <Text style={styles.categoryEmoji}>＋</Text>
              </View>
              <Text style={styles.categoryLabel}>More</Text>
            </Pressable>
          </View>

          {/* More cuisines drawer */}
          {showMoreCuisines && (
            <View style={styles.moreCuisinesBox}>
              {cuisinesList.map((cuisine) => {
                const isSelected = activeCategory === cuisine;
                return (
                  <Pressable
                    key={cuisine}
                    onPress={() =>
                      setActiveCategory(isSelected ? null : cuisine)
                    }
                    style={[
                      styles.cuisinePill,
                      isSelected && styles.cuisinePillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.cuisinePillText,
                        isSelected && styles.cuisinePillTextActive,
                      ]}
                    >
                      {cuisine}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Popular Near You */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeading}>
            <View style={styles.headingLeft}>
              <Text style={styles.sectionTitle}>Popular near you</Text>
              {state.favorites.length > 0 && (
                <Pressable
                  onPress={() => setFilterOnlyLiked((v) => !v)}
                  style={[
                    styles.likedPill,
                    filterOnlyLiked && styles.likedPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.likedPillText,
                      filterOnlyLiked && styles.likedPillTextActive,
                    ]}
                  >
                    ❤️ Liked ({state.favorites.length})
                  </Text>
                </Pressable>
              )}
            </View>
            <Pressable
              onPress={() => {
                if (search || activeCategory || filterOnlyLiked) {
                  setSearch("");
                  setActiveCategory(null);
                  setFilterOnlyLiked(false);
                } else {
                  push({ name: "restaurantsList" });
                }
              }}
            >
              <Text style={styles.linkText}>
                {search || activeCategory || filterOnlyLiked
                  ? "Reset filter"
                  : "See all"}
              </Text>
            </Pressable>
          </View>

          {matchingRestaurants.length > 0 ? (
            <View style={styles.restaurantsCol}>
              {matchingRestaurants.map((restaurant) => {
                const isFav = state.favorites.includes(restaurant.id);
                return (
                  <Pressable
                    key={restaurant.id}
                    onPress={() =>
                      push({
                        name: "detail",
                        service: "food",
                        storeId: restaurant.id,
                      })
                    }
                    style={({ pressed }) => [
                      styles.restaurantCard,
                      pressed && styles.pressed,
                    ]}
                  >
                    <ImageBackground
                      source={{ uri: restaurant.photo }}
                      style={styles.restaurantPhoto}
                      imageStyle={{
                        borderRadius: 16,
                      }}
                    >
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>
                          {restaurant.discount}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => handleToggleRestaurantFav(restaurant)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.heartBtn}
                      >
                        <Icon
                          name="heart"
                          size={17}
                          color={isFav ? "#ff5232" : "#ffffff"}
                          filled={isFav}
                        />
                      </Pressable>
                      <View style={styles.etaBadge}>
                        <Text style={styles.etaText}>
                          {restaurant.etaShort}
                        </Text>
                      </View>
                    </ImageBackground>

                    <View style={styles.restaurantInfo}>
                      <View style={styles.restaurantTitleCol}>
                        <Text style={styles.restaurantName}>
                          {restaurant.name}
                        </Text>
                        <Text style={styles.restaurantCuisines}>
                          {restaurant.cuisines.join(" · ")}
                        </Text>
                      </View>
                      <View style={styles.ratingBadge}>
                        <Icon name="star" size={11} color="#288153" filled />
                        <Text style={styles.ratingText}>
                          {" "}{restaurant.rating}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>
                No restaurants matching "{search || activeCategory}"
              </Text>
              <Pressable
                onPress={() => {
                  setSearch("");
                  setActiveCategory(null);
                }}
              >
                <Text style={styles.clearLink}>Clear filters</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Offers Section */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Offers for you</Text>
          </View>
          <View style={styles.offersRow}>
            <Pressable
              onPress={() => handleApplyPromo("WELCOME50")}
              style={[styles.offerCard, { backgroundColor: "#962b1c" }]}
            >
              <Text style={styles.offerTag}>FIRST ORDER</Text>
              <Text style={styles.offerTitle}>Flat 50% off</Text>
              <Text style={styles.offerSub}>Use WELCOME50</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                showToast("Free delivery is already applied on all orders!")
              }
              style={[styles.offerCard, { backgroundColor: "#57301c" }]}
            >
              <Text style={styles.offerTag}>
                FREE DELIVERY
              </Text>
              <Text style={styles.offerTitle}>Weekend treat</Text>
              <Text style={styles.offerSub}>On orders over ₹299</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  hero: {
    paddingBottom: 20,
    backgroundColor: "#171514",
    position: "relative",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(16, 10, 8, 0.65)",
  },
  heroCopy: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  heroKicker: {
    fontSize: 9,
    fontWeight: "800",
    color: "#f27955",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  floatingSearchWrap: {
    marginTop: -14,
    marginBottom: 4,
    zIndex: 3,
  },
  body: {
    paddingTop: 0,
  },
  sectionWrap: {
    marginTop: 18,
    paddingHorizontal: 18,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heartEmoji: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.4,
  },
  countBadge: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  countText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.accent,
  },
  linkText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.accent,
  },
  favSlider: {
    gap: 12,
  },
  favCard: {
    width: 130,
    backgroundColor: "#ffffff",
    borderRadius: radii.sm,
    padding: 8,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
  },
  favThumb: {
    width: "100%",
    height: 90,
    borderRadius: radii.sm,
    position: "relative",
    marginBottom: 6,
    overflow: "hidden",
  },
  favHeartIcon: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  favTagBadge: {
    position: "absolute",
    bottom: 5,
    left: 6,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  favTagText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#ffffff",
  },
  favTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
  },
  favSub: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 1,
  },
  favMeta: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 3,
  },
  categoriesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryBtn: {
    alignItems: "center",
    justifyContent: "center",
  },
  categoryBtnActive: {},
  categoryIconCircle: {
    width: 51,
    height: 51,
    borderRadius: 25.5,
    backgroundColor: "#2d1915",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 7,
  },
  categoryIconCircleActive: {
    borderColor: colors.accent,
    backgroundColor: "#3d221c",
  },
  categoryEmoji: {
    fontSize: 22,
  },
  categoryLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.ink,
  },
  categoryLabelActive: {
    color: colors.accent,
    fontWeight: "700",
  },
  moreCuisinesBox: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: "#2a1510",
    borderRadius: radii.md,
  },
  cuisinePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.sm,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  cuisinePillActive: {
    backgroundColor: colors.accent,
  },
  cuisinePillText: {
    fontSize: 11,
    color: "#ffffff",
    fontWeight: "600",
  },
  cuisinePillTextActive: {
    fontWeight: "700",
  },
  likedPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.15)",
  },
  likedPillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  likedPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.ink,
  },
  likedPillTextActive: {
    color: "#ffffff",
  },
  restaurantsCol: {
    gap: 14,
  },
  restaurantCard: {
    backgroundColor: "#ffffff",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
    overflow: "hidden",
  },
  restaurantPhoto: {
    width: "100%",
    height: 140,
    position: "relative",
  },
  discountBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.xs,
  },
  discountText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
  },
  heartBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  etaBadge: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.xs,
  },
  etaText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  restaurantInfo: {
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  restaurantTitleCol: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  restaurantCuisines: {
    fontSize: 9,
    color: colors.muted,
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eef9f2",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingText: {
    color: "#288153",
    fontSize: 9,
    fontWeight: "700",
  },
  emptyBox: {
    padding: 28,
    backgroundColor: "rgba(0, 0, 0, 0.03)",
    borderRadius: radii.md,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 8,
  },
  clearLink: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.accent,
  },
  offersRow: {
    flexDirection: "row",
    gap: 10,
  },
  offerCard: {
    flex: 1,
    minHeight: 105,
    padding: 14,
    borderRadius: 15,
    justifyContent: "center",
  },
  offerTag: {
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 1,
    color: "rgba(255, 255, 255, 0.7)",
    textTransform: "uppercase",
  },
  offerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#ffffff",
    marginTop: 5,
  },
  offerSub: {
    fontSize: 8,
    color: "rgba(255, 255, 255, 0.65)",
    marginTop: 4,
  },
  pressed: {
    opacity: 0.85,
  },
});

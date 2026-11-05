import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ImageBackground,
  Pressable,
  ActivityIndicator,
  Image,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import UnifiedServiceHeader from "../../components/UnifiedServiceHeader";
import Header from "../../components/Header";
import ServiceTabs from "../../components/ServiceTabs";
import SearchBar from "../../components/SearchBar";
import Icon from "../../components/Icon";
import PopularRestaurantsCarousel from "../../components/PopularRestaurantsCarousel";
import PremiumRestaurantCard from "../../components/PremiumRestaurantCard";
import { FoodCardSkeleton } from "../../components/animations/ModuleSkeletons";
import FadeInView from "../../components/animations/FadeInView";
import { VendorDishImage } from "../../lib/dishImages";
import { HEADER_TOKENS } from "../../theme/headerTokens";
import {
  FOOD_CATEGORIES,
  MORE_CUISINES,
  PHOTOS,
  serviceMeta,
  type Restaurant,
  type MenuItem,
  type Service,
} from "../../data/demo";
import { fetchCuisines, fetchApprovedRestaurants } from "../../lib/supabaseData";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { useI18n } from "../../lib/i18n";
import { rupees } from "../../lib/pricing";
import { colors, radii } from "../../theme/tokens";
import { useServiceTheme } from "../../theme/themes";
import LoginPromptModal from "../../components/LoginPromptModal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function FoodHome() {
  const insets = useSafeAreaInsets();
  const { push } = useNav();
  const theme = useServiceTheme("food");
  const {
    setService,
    state,
    toggleFavorite,
    applyPromo,
    showToast,
    setPendingAction,
    placeById,
    addToCart,
  } = useApp();
  const { t } = useI18n();

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [search, setSearch] = useState("");
  const [searchTab, setSearchTab] = useState<"all" | "dishes" | "restaurants">("all");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showMoreCuisines, setShowMoreCuisines] = useState(false);
  const [filterOnlyLiked, setFilterOnlyLiked] = useState(false);
  const [cuisinesList, setCuisinesList] = useState<string[]>(MORE_CUISINES);
  const [isScrolled, setIsScrolled] = useState(false);

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

  const handleToggleRestaurantFav = (r: Restaurant) => {
    if (!state.authenticated) {
      setPendingAction({
        type: "wishlist",
        itemId: r.id,
        itemTitle: r.name,
      });
      setShowLoginModal(true);
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

  // Scroll listener for sticky search bar
  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const shouldStick = y > 160;
    if (shouldStick !== isScrolled) {
      setIsScrolled(shouldStick);
    }
  };

  const matchingRestaurants = restaurants.filter((r) => {
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

  const allDishes = useMemo(() => {
    const list: (MenuItem & {
      storeId: string;
      storeName: string;
      storeDistanceKm?: number;
      storeEtaShort?: string;
      storePhoto?: string;
    })[] = [];

    for (const r of restaurants) {
      for (const m of r.menu) {
        list.push({
          ...m,
          storeId: r.id,
          storeName: r.name,
          storeDistanceKm: r.distanceKm,
          storeEtaShort: r.etaShort,
          storePhoto: r.photo,
        });
      }
    }
    return list;
  }, [restaurants]);

  const matchingDishes = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase().trim();
    return allDishes.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.description && d.description.toLowerCase().includes(q)) ||
        d.storeName.toLowerCase().includes(q)
    );
  }, [search, allDishes]);

  const handleQuickAddDish = (dish: any) => {
    addToCart(
      "food",
      {
        id: dish.id,
        name: dish.name,
        subtitle: dish.storeName,
        price: dish.price,
        photo: dish.photo,
      },
      dish.storeId
    );
    showToast(`Added "${dish.name}" to cart!`);
  };

  // Top picks dishes (Screenshot 1: Biryani, Burger, Noodles, Cake)
  const topPickDishes = useMemo(() => {
    return [
      {
        id: "top-biryani",
        name: "Dum Handi Biryani",
        price: 249,
        photo: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80",
        hasCrown: true,
      },
      {
        id: "top-burger",
        name: "Classic Cheeseburger",
        price: 179,
        photo: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80",
        hasCrown: false,
      },
      {
        id: "top-noodles",
        name: "Hakka Veg Noodles",
        price: 159,
        photo: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=400&q=80",
        hasCrown: false,
      },
      {
        id: "top-cake",
        name: "Chocolate Truffle Cake",
        price: 199,
        photo: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=400&q=80",
        hasCrown: false,
      },
    ];
  }, []);

  // SECTION A: Featured Restaurants (selected by campaign / sponsored status or high rating + offer)
  const featuredRestaurants = useMemo(() => {
    const sponsored = restaurants.filter(
      (r) => r.isSponsored || (r.rating >= 4.5 && r.activeOffer)
    );
    if (sponsored.length > 0) return sponsored;
    return restaurants.slice(0, 2);
  }, [restaurants]);

  const featuredIds = useMemo(
    () => new Set(featuredRestaurants.map((r) => r.id)),
    [featuredRestaurants]
  );

  // SECTION B: Popular Near You (Deduplicated from Featured Restaurants)
  const popularNearYouRestaurants = useMemo(() => {
    if (search.trim() || activeCategory || filterOnlyLiked) {
      return matchingRestaurants;
    }
    const nonFeatured = matchingRestaurants.filter((r) => !featuredIds.has(r.id));
    return nonFeatured.length > 0 ? nonFeatured : matchingRestaurants;
  }, [matchingRestaurants, featuredIds, search, activeCategory, filterOnlyLiked]);

  // SECTION C: Top Picks for You (Personalized food/dish recommendations using actual menu items)
  const topPicksMenuDishes = useMemo(() => {
    const list: (MenuItem & {
      storeId: string;
      storeName: string;
      hasCrown?: boolean;
    })[] = [];

    restaurants.forEach((r, idx) => {
      if (r.menu && r.menu.length > 0) {
        r.menu.slice(0, 2).forEach((m, mIdx) => {
          list.push({
            ...m,
            storeId: r.id,
            storeName: r.name,
            hasCrown: idx === 0 && mIdx === 0,
          });
        });
      }
    });

    if (list.length > 0) return list.slice(0, 8);
    return topPickDishes.map((d) => ({
      ...d,
      storeId: restaurants[0]?.id || "store-1",
      storeName: restaurants[0]?.name || "Kitchen Alpha Express",
    }));
  }, [restaurants, topPickDishes]);

  return (
    <View style={styles.outerContainer}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[2]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* ================= INDEX 0: UNIFIED SERVICE HEADER ================= */}
        <UnifiedServiceHeader
          service="food"
          onSelectService={handleSelectService}
        />

        {/* ================= INDEX 1: FOOD HERO BANNER ================= */}
        <View style={styles.foodHeroWrap}>
          <ImageBackground
            source={{ uri: PHOTOS.food }}
            style={styles.foodHeroImage}
            imageStyle={styles.foodHeroRadius}
            resizeMode="cover"
          >
            <View style={styles.foodHeroOverlay} />
            <View style={styles.foodHeroCopy}>
              <Text style={styles.heroKicker}>{serviceMeta.food.kicker}</Text>
              <Text style={styles.heroTitle}>
                Delicious food,{"\n"}delivered fast.
              </Text>
            </View>
          </ImageBackground>
        </View>

        {/* ================= INDEX 2: STICKY SEARCH BAR ================= */}
        <View
          style={[
            styles.stickySearchWrapper,
            isScrolled && [
              styles.stickySearchWrapperActive,
              { paddingTop: insets.top + 6 },
            ],
          ]}
        >
          <SearchBar
            placeholder={t("search_food_placeholder", "Search dishes or restaurants...")}
            value={search}
            onChange={setSearch}
            onFilter={() => setShowMoreCuisines((v) => !v)}
            rightAction="filter"
            service="food"
          />
        </View>

        {/* ================= INDEX 2: MAIN BODY CONTENT ================= */}
        <View style={styles.body}>
          {/* ---------------- LIVE SEARCH RESULTS VIEW ---------------- */}
          {search.trim().length > 0 ? (
            <View style={styles.sectionWrap}>
              {/* Search Scopes: All | Dishes | Restaurants */}
              <View style={styles.searchScopeTabsRow}>
                {(["all", "dishes", "restaurants"] as const).map((tab) => {
                  const isSel = searchTab === tab;
                  const count =
                    tab === "all"
                      ? matchingDishes.length + matchingRestaurants.length
                      : tab === "dishes"
                      ? matchingDishes.length
                      : matchingRestaurants.length;
                  const title =
                    tab === "all"
                      ? `All (${count})`
                      : tab === "dishes"
                      ? `Dishes (${count})`
                      : `Restaurants (${count})`;
                  return (
                    <Pressable
                      key={tab}
                      onPress={() => setSearchTab(tab)}
                      style={[
                        styles.searchScopeTab,
                        isSel && styles.searchScopeTabActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.searchScopeTabText,
                          isSel && styles.searchScopeTabTextActive,
                        ]}
                      >
                        {title}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Matching Dishes */}
              {(searchTab === "all" || searchTab === "dishes") &&
                matchingDishes.length > 0 && (
                  <View style={styles.searchGroupWrap}>
                    <Text style={styles.searchGroupHeading}>
                      DISHES ({matchingDishes.length})
                    </Text>
                    <View style={styles.dishesList}>
                      {matchingDishes.map((dish) => (
                        <Pressable
                          key={`search-dish-${dish.id}`}
                          onPress={() =>
                            push({
                              name: "detail",
                              service: "food",
                              storeId: dish.storeId,
                            })
                          }
                          style={({ pressed }) => [
                            styles.dishCard,
                            pressed && styles.pressed,
                          ]}
                        >
                          <View style={styles.dishThumb}>
                            <VendorDishImage
                              uri={dish.photo}
                              name={dish.name}
                              isVeg={dish.isVeg}
                              style={{ width: "100%", height: "100%", borderRadius: 10 }}
                            />
                          </View>

                          <View style={styles.dishDetails}>
                            <Text style={styles.dishName} numberOfLines={1}>
                              {dish.name}
                            </Text>
                            <Text style={styles.dishStoreText} numberOfLines={1}>
                              {dish.storeName} · 📍 {dish.storeDistanceKm || "2.1"} km · ⏱ {dish.storeEtaShort || "25 min"}
                            </Text>
                            <Text style={styles.dishPriceText}>₹{dish.price}</Text>
                          </View>

                          <Pressable
                            onPress={() => handleQuickAddDish(dish)}
                            style={styles.dishAddBtn}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text style={styles.dishAddBtnText}>ADD +</Text>
                          </Pressable>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}

              {/* Matching Restaurants */}
              {(searchTab === "all" || searchTab === "restaurants") &&
                matchingRestaurants.length > 0 && (
                  <View style={styles.searchGroupWrap}>
                    <Text style={styles.searchGroupHeading}>
                      RESTAURANTS ({matchingRestaurants.length})
                    </Text>
                    <View style={styles.restaurantsCol}>
                      {matchingRestaurants.map((restaurant) => (
                        <PremiumRestaurantCard
                          key={restaurant.id}
                          restaurant={restaurant}
                          isFavorite={state.favorites.includes(restaurant.id)}
                          onSelect={(r) =>
                            push({ name: "detail", service: "food", storeId: r.id })
                          }
                          onToggleFavorite={(r) => handleToggleRestaurantFav(r)}
                        />
                      ))}
                    </View>
                  </View>
                )}

              {matchingDishes.length === 0 && matchingRestaurants.length === 0 && (
                <View style={styles.searchEmptyBox}>
                  <Text style={styles.searchEmptyTitle}>No food matches found</Text>
                  <Text style={styles.searchEmptySubtitle}>
                    Try searching for another dish, cuisine, or restaurant name.
                  </Text>
                  <Pressable onPress={() => setSearch("")} style={styles.clearSearchBtn}>
                    <Text style={styles.clearSearchBtnText}>Clear search</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ) : (
            /* ---------------- STANDARD HOMEPAGE VIEW (Screenshot 1) ---------------- */
            <>
              {/* 1. Categories Section (Pastel Rounded Square Cards) */}
              <View style={styles.categoriesSection}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoriesRowScroll}
                >
                  {FOOD_CATEGORIES.map(({ icon, label, bg }) => {
                    const selected = activeCategory === label;
                    return (
                      <Pressable
                        key={label}
                        onPress={() => setActiveCategory(selected ? null : label)}
                        style={styles.categoryCardPressable}
                      >
                        <View
                          style={[
                            styles.categorySquare,
                            { backgroundColor: bg || "#ffedd5" },
                            selected && styles.categorySquareSelected,
                          ]}
                        >
                          <Text style={styles.categoryIconEmoji}>{icon}</Text>
                        </View>
                        <Text
                          style={[
                            styles.categoryCardLabel,
                            selected && styles.categoryCardLabelSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}

                  {/* "More" Category Card */}
                  <Pressable
                    onPress={() => setShowMoreCuisines((v) => !v)}
                    style={styles.categoryCardPressable}
                  >
                    <View style={[styles.categorySquare, { backgroundColor: "#f3e8ff" }]}>
                      <Icon name="grid" size={20} color="#7c3aed" />
                    </View>
                    <Text style={styles.categoryCardLabel}>{t("cat_more", "More")}</Text>
                  </Pressable>
                </ScrollView>

                {/* More Cuisines Drawer */}
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

              {/* 2. Promotional Banner: Weekend Food Fest (Screenshot 1) */}
              <View style={styles.weekendPromoWrap}>
                <View style={styles.weekendPromoBanner}>
                  <View style={styles.weekendPromoTextCol}>
                    <Text style={styles.weekendPromoTitle}>Weekend</Text>
                    <Text style={styles.weekendPromoSubtitle}>Food Fest</Text>
                    <Text style={styles.weekendPromoOffer}>
                      Flat ₹50 OFF{"\n"}on orders above ₹249
                    </Text>
                    <Pressable
                      onPress={() => {
                        applyPromo("food", "WEEKEND50");
                        showToast("Applied Flat ₹50 OFF for Weekend Food Fest!");
                        if (restaurants.length > 0) {
                          push({ name: "detail", service: "food", storeId: restaurants[0].id });
                        }
                      }}
                      style={styles.orderNowBtn}
                    >
                      <Text style={styles.orderNowBtnText}>Order Now →</Text>
                    </Pressable>
                  </View>

                  <Image
                    source={{
                      uri: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80",
                    }}
                    style={styles.pizzaImage}
                    resizeMode="cover"
                  />
                </View>

                {/* Pagination Dots */}
                <View style={styles.promoPaginationDots}>
                  <View style={[styles.promoDot, styles.promoDotActive]} />
                  <View style={styles.promoDot} />
                  <View style={styles.promoDot} />
                </View>
              </View>

              {/* 3. Featured & Popular Section (Section A: Featured Carousel) */}
              <View style={styles.sectionWrap}>
                <View style={styles.sectionHeadingRow}>
                  <Text style={styles.featuredSectionTitle}>Featured & Popular</Text>
                  <View style={styles.nearbyBadge}>
                    <Text style={styles.nearbyBadgeText}>✨ NEARBY</Text>
                  </View>
                </View>

                <PopularRestaurantsCarousel
                  restaurants={featuredRestaurants}
                  isLoading={isLoading}
                  onSelect={(r) =>
                    push({ name: "detail", service: "food", storeId: r.id })
                  }
                  onAdClick={(r) => {
                    console.log("[AdClick] Opened:", r.name);
                  }}
                />
              </View>

              {/* 4. Top Picks for You (Section C: Personalized Menu Dish Recommendations) */}
              <View style={styles.sectionWrap}>
                <View style={styles.sectionHeadingRow}>
                  <Text style={styles.topPicksTitle}>Top Picks for You</Text>
                  <Pressable
                    onPress={() => {
                      if (restaurants.length > 0) {
                        push({ name: "detail", service: "food", storeId: restaurants[0].id });
                      }
                    }}
                  >
                    <Text style={styles.seeAllRedText}>See All →</Text>
                  </Pressable>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.topPicksScroll}
                >
                  {topPicksMenuDishes.map((dish) => (
                    <Pressable
                      key={`${dish.storeId}-${dish.id}`}
                      onPress={() => {
                        push({
                          name: "detail",
                          service: "food",
                          storeId: dish.storeId,
                          highlightItemId: dish.id,
                        });
                      }}
                      style={styles.topPickCard}
                    >
                      <View style={styles.topPickImageWrap}>
                        <Image
                          source={{ uri: dish.photo }}
                          style={styles.topPickImage}
                          resizeMode="cover"
                        />
                        {dish.hasCrown && (
                          <View style={styles.crownBadge}>
                            <Icon name="crown" size={12} color="#f59e0b" filled />
                          </View>
                        )}
                      </View>
                      <Text style={styles.topPickName} numberOfLines={1}>
                        {dish.name}
                      </Text>
                      {dish.storeName ? (
                        <Text style={styles.topPickStoreName} numberOfLines={1}>
                          {dish.storeName}
                        </Text>
                      ) : null}
                      <View style={styles.topPickPriceRow}>
                        <Text style={styles.topPickPrice}>₹{dish.price}</Text>
                        <Pressable
                          onPress={() => handleQuickAddDish(dish)}
                          style={styles.dishQuickAddBtn}
                          hitSlop={6}
                        >
                          <Text style={styles.dishQuickAddBtnText}>+ ADD</Text>
                        </Pressable>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* 5. Popular Restaurants Near You (Section B: Warm Brown Cards, Deduplicated) */}
              <View style={styles.sectionWrap}>
                <View style={styles.sectionHeadingRow}>
                  <Text style={styles.sectionTitle}>
                    {t("popular_near_you", "Popular restaurants near you")}
                  </Text>
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

                {isLoading ? (
                  <View style={{ paddingTop: 4 }}>
                    <FoodCardSkeleton />
                    <FoodCardSkeleton />
                  </View>
                ) : loadError ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorTitle}>Failed to load restaurants</Text>
                    <Text style={styles.errorSubtitle}>{loadError}</Text>
                    <Pressable onPress={loadRestaurants} style={styles.retryBtn}>
                      <Text style={styles.retryBtnText}>Retry</Text>
                    </Pressable>
                  </View>
                ) : restaurants.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyTitle}>
                      No approved restaurants available yet.
                    </Text>
                    <Text style={styles.emptySubtitle}>
                      All restaurant partners undergo strict verification and admin review. Check back soon!
                    </Text>
                  </View>
                ) : popularNearYouRestaurants.length > 0 ? (
                  <FadeInView style={styles.restaurantsCol} triggerKey={popularNearYouRestaurants.length}>
                    {popularNearYouRestaurants.map((restaurant) => {
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
                          onToggleFavorite={(r) => handleToggleRestaurantFav(r)}
                        />
                      );
                    })}
                  </FadeInView>
                ) : (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyTitle}>No matching restaurants</Text>
                    <Text style={styles.emptySubtitle}>
                      No restaurants found matching your criteria. Try resetting filters.
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Guest Login Modal */}
      <LoginPromptModal
        visible={showLoginModal}
        title="Sign in to save favorites"
        subtitle="Create your RoadRider account or sign in to save your favorite restaurants and dishes across all your devices."
        onClose={() => setShowLoginModal(false)}
        onLogin={() => {
          setShowLoginModal(false);
          push({ name: "phone" });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: "#faf7f2",
  },
  container: {
    flex: 1,
    backgroundColor: "#faf7f2",
  },
  scrollContent: {
    paddingBottom: 32,
  },
  heroSection: {
    position: "relative",
  },
  foodHeroWrap: {
    marginHorizontal: HEADER_TOKENS.horizontalMargin,
    marginTop: 0,
    marginBottom: 8,
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#c84b31",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  foodHeroImage: {
    width: "100%",
    height: 125,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  foodHeroRadius: {
    borderRadius: 22,
  },
  foodHeroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(16, 10, 8, 0.58)",
    borderRadius: 22,
  },
  foodHeroCopy: {
    zIndex: 2,
  },
  hero: {
    width: "100%",
    minHeight: 240,
    justifyContent: "space-between",
    paddingBottom: 16,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(16, 10, 8, 0.7)",
  },
  serviceTabsWrapper: {
    marginTop: 8,
    marginBottom: 4,
  },
  heroCopy: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  heroKicker: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#ea580c",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  // Sticky Search Bar
  stickySearchWrapper: {
    backgroundColor: "transparent",
    paddingVertical: 10,
    zIndex: 100,
  },
  stickySearchWrapperActive: {
    backgroundColor: "#faf7f2",
    borderBottomWidth: 1,
    borderBottomColor: "#ede7dd",
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  body: {
    paddingTop: 4,
  },
  // Categories Section (Screenshot 1)
  categoriesSection: {
    marginTop: 6,
    marginBottom: 16,
  },
  categoriesRowScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  categoryCardPressable: {
    alignItems: "center",
    width: 68,
  },
  categorySquare: {
    width: 62,
    height: 62,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)",
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  categorySquareSelected: {
    borderColor: "#c84b31",
    borderWidth: 2,
    transform: [{ scale: 1.04 }],
  },
  categoryIconEmoji: {
    fontSize: 28,
  },
  categoryCardLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#292524",
    textAlign: "center",
  },
  categoryCardLabelSelected: {
    color: "#c84b31",
    fontWeight: "800",
  },
  moreCuisinesBox: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 12,
  },
  cuisinePill: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e5e0d8",
  },
  cuisinePillActive: {
    backgroundColor: "#c84b31",
    borderColor: "#c84b31",
  },
  cuisinePillText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  cuisinePillTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
  // Weekend Promo Banner (Screenshot 1)
  weekendPromoWrap: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  weekendPromoBanner: {
    backgroundColor: "#7c1c11",
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 16,
    overflow: "hidden",
    minHeight: 140,
    shadowColor: "#7c1c11",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 4,
  },
  weekendPromoTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  weekendPromoTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#ffffff",
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  weekendPromoSubtitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#fbbf24",
    lineHeight: 22,
    marginBottom: 6,
  },
  weekendPromoOffer: {
    fontSize: 11.5,
    color: "rgba(255, 255, 255, 0.88)",
    fontWeight: "600",
    lineHeight: 16,
    marginBottom: 10,
  },
  orderNowBtn: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  orderNowBtnText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#7c1c11",
  },
  pizzaImage: {
    width: 135,
    height: 125,
    borderRadius: 16,
  },
  promoPaginationDots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    gap: 6,
  },
  promoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(0, 0, 0, 0.15)",
  },
  promoDotActive: {
    width: 18,
    backgroundColor: "#c84b31",
  },
  // Section Headers
  sectionWrap: {
    marginBottom: 20,
  },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  featuredSectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#171514",
    letterSpacing: -0.3,
  },
  nearbyBadge: {
    backgroundColor: "#fef3ee",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  nearbyBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#c84b31",
    letterSpacing: 0.5,
  },
  topPicksTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#171514",
    letterSpacing: -0.3,
  },
  seeAllRedText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#c84b31",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#171514",
    letterSpacing: -0.3,
  },
  linkText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#c84b31",
  },
  // Top Picks Scroll
  topPicksScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  topPickCard: {
    width: 124,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: "#f1ece4",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  topPickImageWrap: {
    width: 108,
    height: 90,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#f0eae1",
    marginBottom: 6,
  },
  topPickImage: {
    width: "100%",
    height: "100%",
  },
  crownBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },
  topPickName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#292524",
    textAlign: "left",
    width: "100%",
  },
  topPickStoreName: {
    fontSize: 10,
    fontWeight: "500",
    color: "#8d8580",
    textAlign: "left",
    width: "100%",
    marginTop: 1,
  },
  topPickPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 6,
  },
  topPickPrice: {
    fontSize: 12,
    fontWeight: "800",
    color: "#c84b31",
  },
  dishQuickAddBtn: {
    backgroundColor: "#fff5f2",
    borderWidth: 1,
    borderColor: "#e5a898",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
  },
  dishQuickAddBtnText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#c84b31",
    letterSpacing: 0.3,
  },
  // Restaurants Column
  restaurantsCol: {
    paddingHorizontal: 16,
    gap: 16,
  },
  loadingBox: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
  },
  errorBox: {
    backgroundColor: "#fee2e2",
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#b91c1c",
    marginBottom: 4,
  },
  errorSubtitle: {
    fontSize: 12,
    color: "#7f1d1d",
    textAlign: "center",
    marginBottom: 10,
  },
  retryBtn: {
    backgroundColor: "#c84b31",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
  },
  emptyBox: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e0d8",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#171514",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: "#77716e",
    textAlign: "center",
    lineHeight: 18,
  },
  // Search Results
  searchScopeTabsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  searchScopeTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e0d8",
  },
  searchScopeTabActive: {
    backgroundColor: "#c84b31",
    borderColor: "#c84b31",
  },
  searchScopeTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#57534e",
  },
  searchScopeTabTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
  searchGroupWrap: {
    marginBottom: 20,
  },
  searchGroupHeading: {
    fontSize: 11,
    fontWeight: "800",
    color: "#8d8580",
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  dishesList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  dishCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f0eae1",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  dishThumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
    overflow: "hidden",
  },
  dishDetails: {
    flex: 1,
    marginLeft: 12,
  },
  dishName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#171514",
    marginBottom: 2,
  },
  dishStoreText: {
    fontSize: 11,
    color: "#78716c",
    marginBottom: 4,
  },
  dishPriceText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#c84b31",
  },
  dishAddBtn: {
    backgroundColor: "#fcebe6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dishAddBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#c84b31",
  },
  searchEmptyBox: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e0d8",
  },
  searchEmptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#171514",
    marginBottom: 4,
  },
  searchEmptySubtitle: {
    fontSize: 12.5,
    color: "#77716e",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 14,
  },
  clearSearchBtn: {
    backgroundColor: "#c84b31",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  clearSearchBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
  },
  pressed: {
    opacity: 0.8,
  },
});

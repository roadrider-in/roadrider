import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import FlowHeader from "../../components/FlowHeader";
import Icon from "../../components/Icon";
import {
  PRODUCTS,
  RESTAURANTS,
  type MenuItem,
  type Restaurant,
  type Service,
} from "../../data/demo";
import { rupees } from "../../lib/pricing";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { colors, radii } from "../../theme/tokens";

export interface FavoritesProps {
  service?: Service;
}

export default function Favorites({ service }: FavoritesProps) {
  const insets = useSafeAreaInsets();
  const { push, switchTab } = useNav();
  const {
    state,
    toggleFavorite,
    addToCart,
    showToast,
    setService,
    setPendingAction,
  } = useApp();

  const isFoodContext = service === "food";
  const isGroceryContext = service === "grocery";

  const [activeTab, setActiveTab] = useState<
    "all" | "dishes" | "restaurants" | "groceries"
  >(isGroceryContext ? "groceries" : "all");

  // Collect favorited restaurants
  const favoriteRestaurants: Restaurant[] = RESTAURANTS.filter((r) =>
    state.favorites.includes(r.id)
  );

  // Collect favorited dishes across all restaurant menus
  const favoriteDishes: { dish: MenuItem; restaurant: Restaurant }[] = [];
  for (const r of RESTAURANTS) {
    for (const m of r.menu) {
      if (state.favorites.includes(m.id)) {
        favoriteDishes.push({ dish: m, restaurant: r });
      }
    }
  }

  // Collect favorited groceries
  const favoriteGroceries = PRODUCTS.filter((p) =>
    state.favorites.includes(p.id)
  );

  // Filter based on active category / service context
  const displayedRestaurants = isGroceryContext ? [] : favoriteRestaurants;
  const displayedDishes = isGroceryContext ? [] : favoriteDishes;
  const displayedGroceries = isFoodContext ? [] : favoriteGroceries;

  const totalCount =
    displayedRestaurants.length +
    displayedDishes.length +
    displayedGroceries.length;

  const handleToggleFav = (id: string, name?: string) => {
    if (!state.authenticated) {
      setPendingAction({
        type: "wishlist",
        itemId: id,
        itemTitle: name,
      });
      showToast("Please sign in to save items to your favorites");
      push({ name: "phone" });
      return;
    }
    const isFav = state.favorites.includes(id);
    toggleFavorite(id);
    showToast(isFav ? `Removed ${name || "item"} from favorites` : `Added to favorites`);
  };

  const handleAddDish = (dish: MenuItem, restaurant: Restaurant) => {
    if (dish.portions && dish.portions.length > 0) {
      setService("food");
      push({ name: "detail", service: "food", storeId: restaurant.id });
      showToast(`Select portion size for ${dish.name}`);
      return;
    }

    if (!state.authenticated) {
      setPendingAction({
        type: "cart",
        service: "food",
        line: {
          id: dish.id,
          name: dish.name,
          subtitle: `${restaurant.name} · Fragrant & freshly cooked`,
          price: dish.price,
        },
        storeId: restaurant.id,
      });
      showToast("Please sign in to add items to your cart");
      push({ name: "phone" });
      return;
    }

    addToCart(
      "food",
      {
        id: dish.id,
        name: dish.name,
        subtitle: `${restaurant.name} · Fragrant & freshly cooked`,
        price: dish.price,
      },
      restaurant.id
    );
    showToast(`Added ${dish.name} to cart`);
  };

  const handleAddGrocery = (product: (typeof PRODUCTS)[0]) => {
    if (!state.authenticated) {
      setPendingAction({
        type: "cart",
        service: "grocery",
        line: {
          id: product.id,
          name: product.name,
          subtitle: `${product.unit} · Fresh daily essentials`,
          price: product.price,
        },
        storeId: "roadrider-grocery",
      });
      showToast("Please sign in to add items to your basket");
      push({ name: "phone" });
      return;
    }

    addToCart(
      "grocery",
      {
        id: product.id,
        name: product.name,
        subtitle: `${product.unit} · Fresh daily essentials`,
        price: product.price,
      },
      "roadrider-grocery"
    );
    showToast(`Added ${product.name} to basket`);
  };

  const headerTitle = isFoodContext
    ? "Food Favorites"
    : isGroceryContext
    ? "Grocery Favorites"
    : "Your Favorites";

  const eyebrowText = isFoodContext
    ? "SAVED FOOD & MEALS"
    : isGroceryContext
    ? "SAVED GROCERIES & ESSENTIALS"
    : "SAVED & LIKED ITEMS";

  const mainTitleText = isFoodContext
    ? "Your favorite food"
    : isGroceryContext
    ? "Your favorite groceries"
    : "Everything you love";

  const subTitleText = isFoodContext
    ? "Quickly reorder your favorite meals and top restaurants."
    : isGroceryContext
    ? "Fresh essentials and produce you've liked, all in one place."
    : "Quickly reorder your favorite meals, top restaurants, and everyday essentials.";

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />
      <FlowHeader title={headerTitle} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerTitleBlock}>
          <Text style={styles.eyebrow}>{eyebrowText}</Text>
          <Text style={styles.mainTitle}>{mainTitleText}</Text>
          <Text style={styles.subTitle}>{subTitleText}</Text>
        </View>

        {/* Category Tabs */}
        {!isGroceryContext && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScroll}
          >
            <TouchableOpacity
              onPress={() => setActiveTab("all")}
              style={[
                styles.tabPill,
                activeTab === "all" && styles.tabPillActive,
              ]}
            >
              <Text
                style={[
                  styles.tabPillText,
                  activeTab === "all" && styles.tabPillTextActive,
                ]}
              >
                All ({totalCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab("dishes")}
              style={[
                styles.tabPill,
                activeTab === "dishes" && styles.tabPillActive,
              ]}
            >
              <Text
                style={[
                  styles.tabPillText,
                  activeTab === "dishes" && styles.tabPillTextActive,
                ]}
              >
                Dishes ({displayedDishes.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab("restaurants")}
              style={[
                styles.tabPill,
                activeTab === "restaurants" && styles.tabPillActive,
              ]}
            >
              <Text
                style={[
                  styles.tabPillText,
                  activeTab === "restaurants" && styles.tabPillTextActive,
                ]}
              >
                Restaurants ({displayedRestaurants.length})
              </Text>
            </TouchableOpacity>

            {!isFoodContext && (
              <TouchableOpacity
                onPress={() => setActiveTab("groceries")}
                style={[
                  styles.tabPill,
                  activeTab === "groceries" && styles.tabPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabPillText,
                    activeTab === "groceries" && styles.tabPillTextActive,
                  ]}
                >
                  Groceries ({displayedGroceries.length})
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}

        {totalCount === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyHeartBox}>
              <Icon name="heart" size={32} color={colors.accent} />
            </View>
            <Text style={styles.emptyTitle}>
              No {isFoodContext ? "food" : isGroceryContext ? "grocery" : ""}{" "}
              favorites saved yet
            </Text>
            <Text style={styles.emptySub}>
              {isFoodContext
                ? "Tap the heart icon on any dish or restaurant to keep it handy here."
                : isGroceryContext
                ? "Tap the heart icon on any grocery item to keep it handy here."
                : "Tap the heart icon on any dish, restaurant, or grocery item to keep it handy here."}
            </Text>
            <View style={styles.emptyBtnRow}>
              {!isGroceryContext && (
                <TouchableOpacity
                  onPress={() => {
                    setService("food");
                    switchTab("home");
                  }}
                  style={styles.browseFoodBtn}
                >
                  <Text style={styles.browseFoodBtnText}>Browse Food</Text>
                </TouchableOpacity>
              )}
              {!isFoodContext && (
                <TouchableOpacity
                  onPress={() => {
                    setService("grocery");
                    switchTab("home");
                  }}
                  style={styles.browseGroceryBtn}
                >
                  <Text style={styles.browseGroceryBtnText}>
                    Browse Groceries
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.favoritesGrid}>
            {/* Favorite Dishes */}
            {(activeTab === "all" || activeTab === "dishes") &&
              displayedDishes.map(({ dish, restaurant }) => (
                <View key={dish.id} style={styles.dishCard}>
                  <View style={styles.dishIconBox}>
                    <Icon name="food" size={24} color={colors.accent} />
                  </View>
                  <View style={styles.dishInfo}>
                    <View style={styles.dishBadgeRow}>
                      <View style={styles.dishTagBadge}>
                        <Text style={styles.dishTagText}>DISH</Text>
                      </View>
                      <Text style={styles.dishRestaurantName}>
                        {restaurant.name}
                      </Text>
                    </View>
                    <Text style={styles.dishTitle} numberOfLines={1}>
                      {dish.name}
                    </Text>
                    <Text style={styles.dishDesc} numberOfLines={1}>
                      {dish.description}
                    </Text>
                    <Text style={styles.dishPrice}>
                      {dish.portions && dish.portions.length > 0
                        ? `From ${rupees(dish.portions[0].price)}`
                        : rupees(dish.price)}
                    </Text>
                  </View>

                  <View style={styles.dishActionCol}>
                    <TouchableOpacity
                      onPress={() => handleToggleFav(dish.id, dish.name)}
                      style={styles.heartBtn}
                    >
                      <Icon
                        name="heart"
                        size={18}
                        filled
                        color={colors.accent}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleAddDish(dish, restaurant)}
                      style={styles.dishAddBtn}
                    >
                      <Text style={styles.dishAddBtnText}>
                        {dish.portions?.length ? "Options +" : "Add +"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

            {/* Favorite Restaurants */}
            {(activeTab === "all" || activeTab === "restaurants") &&
              displayedRestaurants.map((restaurant) => (
                <View key={restaurant.id} style={styles.restaurantCard}>
                  <View style={styles.restaurantCover}>
                    <Image
                      source={{ uri: restaurant.photo }}
                      style={styles.restaurantImage}
                      resizeMode="cover"
                    />
                    <View style={styles.restaurantCoverOverlay} />
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>
                        {restaurant.discount}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() =>
                        handleToggleFav(restaurant.id, restaurant.name)
                      }
                      style={styles.restaurantHeartBtn}
                    >
                      <Icon
                        name="heart"
                        size={16}
                        filled
                        color={colors.accent}
                      />
                    </TouchableOpacity>

                    <View style={styles.coverBottomInfo}>
                      <Text style={styles.coverMeta}>
                        ⭐ {restaurant.rating} · {restaurant.eta}
                      </Text>
                      <View style={styles.restaurantTagBadge}>
                        <Text style={styles.restaurantTagText}>
                          RESTAURANT
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.restaurantCardBody}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.restCardTitle}>
                        {restaurant.name}
                      </Text>
                      <Text style={styles.restCardCuisines}>
                        {restaurant.cuisines.join(" · ")}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setService("food");
                        push({
                          name: "detail",
                          service: "food",
                          storeId: restaurant.id,
                        });
                      }}
                      style={styles.viewMenuBtn}
                    >
                      <Text style={styles.viewMenuBtnText}>View Menu</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

            {/* Favorite Groceries */}
            {(activeTab === "all" || activeTab === "groceries") &&
              displayedGroceries.map((product) => (
                <View key={product.id} style={styles.groceryCard}>
                  <View style={styles.groceryIconBox}>
                    <Icon name="bag" size={24} color="#2e7d32" />
                  </View>
                  <View style={styles.groceryInfo}>
                    <View style={styles.dishBadgeRow}>
                      <View style={styles.groceryTagBadge}>
                        <Text style={styles.groceryTagText}>GROCERY</Text>
                      </View>
                      <Text style={styles.dishRestaurantName}>
                        15 min express
                      </Text>
                    </View>
                    <Text style={styles.dishTitle}>{product.name}</Text>
                    <Text style={styles.dishDesc}>
                      {product.unit} · Fresh daily stock
                    </Text>
                    <Text style={styles.groceryPrice}>
                      {rupees(product.price)}
                    </Text>
                  </View>

                  <View style={styles.dishActionCol}>
                    <TouchableOpacity
                      onPress={() => handleToggleFav(product.id, product.name)}
                      style={styles.heartBtn}
                    >
                      <Icon
                        name="heart"
                        size={18}
                        filled
                        color={colors.accent}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleAddGrocery(product)}
                      style={[styles.dishAddBtn, styles.groceryAddBtn]}
                    >
                      <Text style={styles.dishAddBtnText}>Add +</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
          </View>
        )}
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  headerTitleBlock: {
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.accent,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.5,
  },
  subTitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
    lineHeight: 18,
  },
  tabsScroll: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#ffffff",
  },
  tabPillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
  },
  tabPillTextActive: {
    color: "#ffffff",
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 10,
  },
  emptyHeartBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.ink,
    textAlign: "center",
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 24,
    maxWidth: 280,
  },
  emptyBtnRow: {
    flexDirection: "row",
    gap: 12,
  },
  browseFoodBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  browseFoodBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  browseGroceryBtn: {
    backgroundColor: "#2e7d32",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  browseGroceryBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  favoritesGrid: {
    gap: 14,
  },
  dishCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.line,
  },
  dishIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  dishInfo: {
    flex: 1,
    marginRight: 8,
  },
  dishBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  dishTagBadge: {
    backgroundColor: "rgba(224, 90, 15, 0.12)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dishTagText: {
    fontSize: 8,
    fontWeight: "800",
    color: colors.accent,
  },
  dishRestaurantName: {
    fontSize: 10,
    color: colors.muted,
    fontWeight: "600",
  },
  dishTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.ink,
  },
  dishDesc: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  dishPrice: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.ink,
    marginTop: 4,
  },
  dishActionCol: {
    alignItems: "flex-end",
    gap: 8,
  },
  heartBtn: {
    padding: 4,
  },
  dishAddBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dishAddBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  groceryAddBtn: {
    backgroundColor: "#2e7d32",
  },
  restaurantCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.line,
  },
  restaurantCover: {
    height: 120,
    width: "100%",
    position: "relative",
  },
  restaurantImage: {
    width: "100%",
    height: "100%",
  },
  restaurantCoverOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.28)",
  },
  discountBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  discountText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "800",
  },
  restaurantHeartBtn: {
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
  coverBottomInfo: {
    position: "absolute",
    bottom: 8,
    left: 10,
    right: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  coverMeta: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  restaurantTagBadge: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  restaurantTagText: {
    color: "#ffffff",
    fontSize: 8,
    fontWeight: "800",
  },
  restaurantCardBody: {
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  restCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.ink,
  },
  restCardCuisines: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  viewMenuBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  viewMenuBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent,
  },
  groceryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.line,
  },
  groceryIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(46, 125, 50, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  groceryInfo: {
    flex: 1,
    marginRight: 8,
  },
  groceryTagBadge: {
    backgroundColor: "rgba(46, 125, 50, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  groceryTagText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#2e7d32",
  },
  groceryPrice: {
    fontSize: 13,
    fontWeight: "800",
    color: "#2e7d32",
    marginTop: 4,
  },
});

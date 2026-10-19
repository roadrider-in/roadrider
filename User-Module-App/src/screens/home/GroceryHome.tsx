import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ImageBackground,
  Image,
  Pressable,
} from "react-native";
import Header from "../../components/Header";
import ServiceTabs from "../../components/ServiceTabs";
import SearchBar from "../../components/SearchBar";
import Icon from "../../components/Icon";
import {
  GROCERY_CATEGORIES,
  PHOTOS,
  PRODUCTS,
  type Product,
  type Service,
} from "../../data/demo";
import { fetchGroceryProducts } from "../../lib/supabaseData";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { rupees } from "../../lib/pricing";
import { colors } from "../../theme/tokens";

export default function GroceryHome() {
  const { push } = useNav();
  const {
    setService,
    state,
    toggleFavorite,
    addToCart,
    showToast,
    setPendingAction,
  } = useApp();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [productsList, setProductsList] = useState<Product[]>(PRODUCTS);

  const handleSelectService = (s: Service) => {
    setService(s);
  };

  useEffect(() => {
    let isMounted = true;
    fetchGroceryProducts().then((data) => {
      if (isMounted && data.length > 0) {
        setProductsList(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredProducts = productsList.filter((p) => {
    const matchesSearch =
      !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      !activeCategory ||
      p.category.toLowerCase() === activeCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const handleAddToCart = (product: Product) => {
    if (!state.authenticated && !state.isGuest) {
      setPendingAction({
        type: "cart",
        service: "grocery",
        line: {
          id: product.id,
          name: product.name,
          subtitle: `${product.unit} · Fresh essentials`,
          price: product.price,
        },
        storeId: "roadrider-grocery",
      });
      showToast("Please log in to add items to your basket");
      push({ name: "phone" });
      return;
    }
    addToCart(
      "grocery",
      {
        id: product.id,
        name: product.name,
        subtitle: `${product.unit} · Fresh essentials`,
        price: product.price,
      },
      "roadrider-grocery"
    );
    showToast(`Added ${product.name} to grocery basket`);
  };

  const handleToggleFav = (product: Product) => {
    if (!state.authenticated) {
      setPendingAction({
        type: "wishlist",
        itemId: product.id,
        itemTitle: product.name,
      });
      showToast("Please log in to save to your wishlist");
      push({ name: "phone" });
      return;
    }
    toggleFavorite(product.id);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Header />
      <ServiceTabs service="grocery" onSelect={handleSelectService} />

      {/* Hero Banner (Figma .grocery-hero) */}
      <View style={styles.heroWrap}>
        <ImageBackground
          source={{ uri: PHOTOS.grocery }}
          style={styles.hero}
          imageStyle={{ borderRadius: 20 }}
        >
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.heroKicker}>FARM FRESH · EVERYDAY</Text>
            <Text style={styles.heroTitle}>
              Fresh groceries{"\n"}at your doorstep.
            </Text>
            <View style={styles.heroBadge}>
              <Text style={styles.heroSub}>Delivery in 15 minutes</Text>
            </View>
          </View>
        </ImageBackground>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <SearchBar
          placeholder="Search 10,000+ products"
          value={search}
          onChange={setSearch}
        />
      </View>

      {/* Categories (Figma .grocery-categories) */}
      <View style={styles.sectionWrap}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Shop by category</Text>
          <Pressable
            onPress={() => {
              setActiveCategory(null);
              setSearch("");
            }}
          >
            <Text style={styles.linkText}>
              {activeCategory ? "Show all" : "See all"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.categoriesRow}>
          {GROCERY_CATEGORIES.map(({ abbr, label }) => {
            const isSelected = activeCategory === label;
            return (
              <Pressable
                key={label}
                onPress={() => setActiveCategory(isSelected ? null : label)}
                style={styles.categoryBtn}
              >
                <View
                  style={[
                    styles.categoryCircle,
                    isSelected && styles.categoryCircleActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryAbbr,
                      isSelected && styles.categoryAbbrActive,
                    ]}
                  >
                    {abbr}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.categoryLabel,
                    isSelected && styles.categoryLabelActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() =>
              showToast("Explore more: Bakery, Beverages, Personal Care")
            }
            style={styles.categoryBtn}
          >
            <View style={styles.categoryCircle}>
              <Text style={styles.categoryAbbr}>＋</Text>
            </View>
            <Text style={styles.categoryLabel}>More</Text>
          </Pressable>
        </View>
      </View>

      {/* Discount Green Banner (Figma .green-banner) */}
      <View style={styles.bannerWrap}>
        <View style={styles.greenBanner}>
          <View style={styles.bannerTextCol}>
            <Text style={styles.bannerTag}>FRESH & HEALTHY</Text>
            <Text style={styles.bannerTitle}>Up to 30% off</Text>
            <Pressable
              onPress={() => push({ name: "detail", service: "grocery" })}
              style={styles.bannerBtn}
            >
              <Text style={styles.bannerBtnText}>Shop now</Text>
              <Icon name="arrow" size={13} color="#171514" />
            </Pressable>
          </View>
          <Image source={{ uri: PHOTOS.produce }} style={styles.bannerImage} />
        </View>
      </View>

      {/* Daily Essentials Products Grid (Figma .product-grid) */}
      <View style={styles.sectionWrap}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Daily essentials</Text>
          <Pressable onPress={() => push({ name: "detail", service: "grocery" })}>
            <Text style={styles.linkText}>See all</Text>
          </Pressable>
        </View>

        <View style={styles.productsGrid}>
          {filteredProducts.map((p, i) => {
            const isFav = state.favorites.includes(p.id);
            const discountPct = Math.round(((p.mrp - p.price) / p.mrp) * 100);
            return (
              <View key={p.id || p.name} style={styles.productCard}>
                <ImageBackground
                  source={{ uri: i === 0 ? PHOTOS.produce : PHOTOS.grocery }}
                  style={styles.productPhoto}
                  imageStyle={{ borderRadius: 12 }}
                >
                  <View style={styles.discountTag}>
                    <Text style={styles.discountTagText}>
                      {discountPct > 0 ? `${discountPct}% OFF` : "FRESH"}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleToggleFav(p)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.favBtn}
                  >
                    <Icon
                      name="heart"
                      size={15}
                      color={isFav ? "#ff5232" : "#ffffff"}
                      filled={isFav}
                    />
                  </Pressable>
                </ImageBackground>

                <Text style={styles.productName} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={styles.productUnit}>{p.unit}</Text>

                <View style={styles.priceRow}>
                  <View style={styles.priceCol}>
                    <Text style={styles.priceCurrent}>{rupees(p.price)}</Text>
                    {p.mrp > p.price && (
                      <Text style={styles.priceMrp}>{rupees(p.mrp)}</Text>
                    )}
                  </View>
                  <Pressable
                    onPress={() => handleAddToCart(p)}
                    style={styles.addBtn}
                  >
                    <Icon name="plus" size={16} color="#ffffff" />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4faf2",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroWrap: {
    paddingHorizontal: 18,
    marginTop: 8,
  },
  hero: {
    height: 185,
    borderRadius: 20,
    justifyContent: "flex-end",
    padding: 20,
    overflow: "hidden",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(15, 62, 31, 0.72)",
  },
  heroContent: {
    zIndex: 1,
  },
  heroKicker: {
    fontSize: 7,
    fontWeight: "700",
    color: "#bfe6b9",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.6,
    lineHeight: 25,
    marginBottom: 7,
  },
  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  heroSub: {
    color: "#ffffff",
    fontSize: 8,
    fontWeight: "700",
  },
  searchWrap: {
    marginTop: 12,
    marginBottom: 4,
  },
  sectionWrap: {
    marginTop: 18,
    paddingHorizontal: 18,
  },
  sectionHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.4,
  },
  linkText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#318454",
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
  categoryCircle: {
    width: 51,
    height: 51,
    borderRadius: 25.5,
    backgroundColor: "#e6f3e5",
    borderWidth: 1,
    borderColor: "#d5e9d2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  categoryCircleActive: {
    backgroundColor: "#318454",
    borderColor: "#318454",
  },
  categoryAbbr: {
    fontSize: 11,
    fontWeight: "700",
    color: "#3e7550",
  },
  categoryAbbrActive: {
    color: "#ffffff",
  },
  categoryLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#666f67",
  },
  categoryLabelActive: {
    color: "#318454",
    fontWeight: "700",
  },
  bannerWrap: {
    paddingHorizontal: 18,
    marginTop: 22,
  },
  greenBanner: {
    backgroundColor: "#225e39",
    borderRadius: 17,
    height: 115,
    flexDirection: "row",
    overflow: "hidden",
  },
  bannerTextCol: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },
  bannerTag: {
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#a8e5b6",
    textTransform: "uppercase",
  },
  bannerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#ffffff",
    marginTop: 3,
    marginBottom: 8,
  },
  bannerBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  bannerBtnText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#171514",
  },
  bannerImage: {
    width: 120,
    height: "100%",
    resizeMode: "cover",
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  productCard: {
    width: "48.5%",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5ede3",
    borderRadius: 16,
    padding: 10,
  },
  productPhoto: {
    height: 108,
    borderRadius: 12,
    position: "relative",
    overflow: "hidden",
  },
  discountTag: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "#257041",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  discountTagText: {
    color: "#ffffff",
    fontSize: 7,
    fontWeight: "700",
  },
  favBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  productName: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 8,
    marginBottom: 2,
  },
  productUnit: {
    fontSize: 8,
    color: colors.muted,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  priceCol: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  priceCurrent: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.ink,
  },
  priceMrp: {
    fontSize: 9,
    color: "#999999",
    textDecorationLine: "line-through",
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#318454",
    alignItems: "center",
    justifyContent: "center",
  },
});

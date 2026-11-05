import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ImageBackground,
  Image,
  Pressable,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import Header from "../../components/Header";
import UnifiedServiceHeader from "../../components/UnifiedServiceHeader";
import ServiceTabs from "../../components/ServiceTabs";
import SearchBar from "../../components/SearchBar";
import Icon from "../../components/Icon";
import { HEADER_TOKENS } from "../../theme/headerTokens";
import {
  GROCERY_CATEGORIES,
  PHOTOS,
  type Product,
  type Service,
} from "../../data/demo";
import { fetchApprovedGroceryProducts } from "../../lib/supabaseData";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { rupees } from "../../lib/pricing";
import { useServiceTheme } from "../../theme/themes";
import { useI18n } from "../../lib/i18n";
import { GroceryCardSkeleton } from "../../components/animations/ModuleSkeletons";
import FadeInView from "../../components/animations/FadeInView";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function GroceryHome() {
  const { push } = useNav();
  const theme = useServiceTheme("grocery");
  const { t } = useI18n();
  const {
    setService,
    state,
    toggleFavorite,
    addToCart,
    changeQty,
    showToast,
    setPendingAction,
  } = useApp();

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Dynamic countdown timer for "Today's Top Picks"
  const [timeLeft, setTimeLeft] = useState("02:15:30");

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const diff = Math.max(0, endOfDay.getTime() - now.getTime());
      const hours = String(Math.floor(diff / (1000 * 60 * 60))).padStart(2, "0");
      const mins = String(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, "0");
      const secs = String(Math.floor((diff % (1000 * 60)) / 1000)).padStart(2, "0");
      setTimeLeft(`${hours}:${mins}:${secs}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSelectService = (s: Service) => {
    setService(s);
  };

  const loadGroceryData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    const res = await fetchApprovedGroceryProducts();
    setIsLoading(false);
    if (res.error) {
      setLoadError(res.error);
      setProductsList([]);
    } else {
      setProductsList(res.data);
    }
  }, []);

  useEffect(() => {
    loadGroceryData();
  }, [loadGroceryData]);

  // Verified essentials for "Today's Top Picks" matching Screenshot 3
  const todayTopPicks = useMemo(() => {
    const basePicks = [
      {
        id: "pick-apple",
        name: "Apple",
        unit: "1 kg",
        price: 159,
        mrp: 199,
        discount: "20% OFF",
        category: "Fruits",
        photo: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=400&q=80",
      },
      {
        id: "pick-banana",
        name: "Banana",
        unit: "1 dozen",
        price: 51,
        mrp: 60,
        discount: "15% OFF",
        category: "Fruits",
        photo: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=400&q=80",
      },
      {
        id: "pick-tomato",
        name: "Tomato",
        unit: "1 kg",
        price: 36,
        mrp: 48,
        discount: "25% OFF",
        category: "Veggies",
        photo: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=400&q=80",
      },
      {
        id: "pick-onion",
        name: "Onion",
        unit: "1 kg",
        price: 27,
        mrp: 30,
        discount: "10% OFF",
        category: "Veggies",
        photo: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=400&q=80",
      },
    ];

    // Combine with any real products from Supabase
    const supabasePicks = productsList.map((p) => {
      const discountPct = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 10;
      return {
        id: p.id,
        name: p.name,
        unit: p.unit || "1 unit",
        price: p.price,
        mrp: p.mrp || Math.round(p.price * 1.2),
        discount: `${discountPct}% OFF`,
        category: p.category || "Essentials",
        photo: p.photo || PHOTOS.produce,
      };
    });

    return [...basePicks, ...supabasePicks];
  }, [productsList]);

  // Cart quantity lookup for a product
  const getProductCartQty = (productId: string) => {
    const item = state.carts.grocery.lines.find((line) => line.id === productId);
    return item?.qty || 0;
  };

  const handleAddGroceryItem = (product: any) => {
    addToCart(
      "grocery",
      {
        id: product.id,
        name: `${product.name} (${product.unit})`,
        subtitle: `${product.unit} · Fresh Express`,
        price: product.price,
      },
      "roadrider-grocery"
    );
    showToast(`Added ${product.name} (${product.unit}) to basket`);
  };

  const handleIncrement = (product: any) => {
    const currentQty = getProductCartQty(product.id);
    if (currentQty === 0) {
      handleAddGroceryItem(product);
    } else {
      changeQty("grocery", product.id, +1);
    }
  };

  const handleDecrement = (product: any) => {
    const currentQty = getProductCartQty(product.id);
    if (currentQty > 0) {
      changeQty("grocery", product.id, -1);
    }
  };

  const filteredPicks = todayTopPicks.filter((p) => {
    const matchesSearch =
      !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      !activeCategory ||
      p.category.toLowerCase() === activeCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= UNIFIED SERVICE NAVIGATION HEADER ================= */}
        <UnifiedServiceHeader
          service="grocery"
          onSelectService={handleSelectService}
        />

        {/* ================= HERO BANNER: FARM FRESH EVERYDAY (Screenshot 3) ================= */}
        <View style={styles.heroWrap}>
          <View style={styles.darkGreenHero}>
            <View style={styles.heroLeftCol}>
              <Text style={styles.heroKicker}>FARM FRESH · EVERYDAY</Text>
              <Text style={styles.heroTitle}>
                Fresh groceries{"\n"}at your doorstep
              </Text>

              {/* 3 Badges */}
              <View style={styles.heroBadgesRow}>
                <View style={styles.heroBadgePill}>
                  <Text style={styles.heroBadgeText}>🍃 Farm Fresh</Text>
                </View>
                <View style={styles.heroBadgePill}>
                  <Text style={styles.heroBadgeText}>⚡ Fast Delivery</Text>
                </View>
                <View style={styles.heroBadgePill}>
                  <Text style={styles.heroBadgeText}>🛡️ Quality Assured</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.shopNowWhiteBtn}
                activeOpacity={0.85}
                onPress={() => {
                  showToast("Browsing fresh farm groceries");
                }}
              >
                <Text style={styles.shopNowText}>Shop Now →</Text>
              </TouchableOpacity>
            </View>

            {/* Fresh Vegetable Bag Image */}
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80",
              }}
              style={styles.heroVegBagImage}
              resizeMode="cover"
            />
          </View>

          {/* Carousel Dots */}
          <View style={styles.heroDotsRow}>
            <View style={[styles.heroDot, styles.heroDotActive]} />
            <View style={styles.heroDot} />
            <View style={styles.heroDot} />
          </View>
        </View>

        {/* ================= SEARCH BAR (Screenshot 3) ================= */}
        <View style={styles.searchSection}>
          <SearchBar
            placeholder="Search 10,000+ products"
            value={search}
            onChange={setSearch}
            service="grocery"
            rightAction="scan"
            onRightAction={() => showToast("Barcode Scanner: Scan grocery items to add to cart")}
          />
        </View>

        {/* ================= SHOP BY CATEGORY (Screenshot 3) ================= */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionTitle}>Shop by category</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setActiveCategory(null);
                setSearch("");
              }}
            >
              <Text style={styles.seeAllGreenText}>See all →</Text>
            </TouchableOpacity>
          </View>

          <FadeInView duration={380} translateYOffset={8} style={styles.categorySquaresRow}>
            {GROCERY_CATEGORIES.map(({ label, icon, bg }) => {
              const isSelected = activeCategory === label;
              return (
                <TouchableOpacity
                  key={label}
                  activeOpacity={0.75}
                  onPress={() => setActiveCategory(isSelected ? null : label)}
                  style={styles.categoryItemCol}
                >
                  <View
                    style={[
                      styles.categorySquare,
                      { backgroundColor: bg },
                      isSelected && styles.categorySquareActive,
                    ]}
                  >
                    <Text style={styles.categoryIconEmoji}>{icon}</Text>
                  </View>
                  <Text
                    style={[
                      styles.categoryLabel,
                      isSelected && styles.categoryLabelActive,
                    ]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* "More" Category */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                showToast("Categories: Fruits, Veggies, Dairy, Snacks, Bakery, Pantry");
              }}
              style={styles.categoryItemCol}
            >
              <View style={[styles.categorySquare, { backgroundColor: "#edebfe" }]}>
                <Icon name="grid" size={22} color="#7c3aed" />
              </View>
              <Text style={styles.categoryLabel}>More</Text>
            </TouchableOpacity>
          </FadeInView>
        </View>

        {/* ================= PROMOTIONAL DISCOUNT BANNER: UP TO 30% OFF (Screenshot 3) ================= */}
        <View style={styles.promoDiscountWrap}>
          <View style={styles.promoDiscountBanner}>
            <View style={styles.promoDiscountTextCol}>
              <Text style={styles.promoDiscountKicker}>FRESH & HEALTHY</Text>
              <Text style={styles.promoDiscountTitle}>Up to 30% Off</Text>
              <Text style={styles.promoDiscountSub}>
                On selected fruits, veggies & daily essentials
              </Text>
              <TouchableOpacity
                style={styles.promoShopNowGreenBtn}
                activeOpacity={0.85}
                onPress={() => showToast("Applied Up to 30% Off on daily essentials")}
              >
                <Text style={styles.promoShopNowText}>Shop Now →</Text>
              </TouchableOpacity>
            </View>

            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=500&q=80",
              }}
              style={styles.produceBasketImage}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* ================= TODAY'S TOP PICKS (Screenshot 3) ================= */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionTitle}>Today's Top Picks</Text>
            <View style={styles.timerBadge}>
              <Icon name="zap" size={13} color="#ea580c" filled />
              <Text style={styles.timerText}>Offers end in {timeLeft}</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productsScroll}
          >
            {isLoading ? (
              [1, 2, 3, 4].map((i) => (
                <GroceryCardSkeleton key={`grocery-skel-${i}`} />
              ))
            ) : (
              <FadeInView style={{ flexDirection: "row" }} triggerKey={filteredPicks.length}>
                {filteredPicks.map((product) => {
                  const qty = getProductCartQty(product.id);
                  return (
                    <View key={product.id} style={styles.productCard}>
                      {/* Top-Left Discount Badge */}
                      <View style={styles.productDiscountBadge}>
                        <Text style={styles.productDiscountText}>{product.discount}</Text>
                      </View>

                      {/* Clean Product Photo */}
                      <View style={styles.productPhotoBox}>
                        <Image
                          source={{ uri: product.photo }}
                          style={styles.productPhoto}
                          resizeMode="cover"
                        />
                      </View>

                      {/* Product Details */}
                      <Text style={styles.productName} numberOfLines={1}>
                        {product.name} ({product.unit})
                      </Text>

                      {/* Pricing Row with MRP & Green + Button */}
                      <View style={styles.productBottomRow}>
                        <View style={styles.priceCol}>
                          <Text style={styles.productPrice}>₹{product.price}</Text>
                          {product.mrp > product.price && (
                            <Text style={styles.productMrp}>₹{product.mrp}</Text>
                          )}
                        </View>

                        {/* Quantity Stepper / Green + Button */}
                        {qty > 0 ? (
                          <View style={styles.qtyPill}>
                            <TouchableOpacity
                              style={styles.qtyBtn}
                              onPress={() => handleDecrement(product)}
                            >
                              <Text style={styles.qtyBtnText}>-</Text>
                            </TouchableOpacity>
                            <Text style={styles.qtyCount}>{qty}</Text>
                            <TouchableOpacity
                              style={styles.qtyBtn}
                              onPress={() => handleIncrement(product)}
                            >
                              <Text style={styles.qtyBtnText}>+</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.addGreenCircleBtn}
                            activeOpacity={0.8}
                            onPress={() => handleAddGroceryItem(product)}
                          >
                            <Text style={styles.addGreenPlusText}>+</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </FadeInView>
            )}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6fbf7",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 36,
  },
  serviceTabsWrap: {
    marginTop: 8,
    marginBottom: 6,
  },
  // Dark Green Hero (Screenshot 3)
  heroWrap: {
    marginHorizontal: HEADER_TOKENS.horizontalMargin,
    marginTop: 0,
    marginBottom: 16,
  },
  darkGreenHero: {
    backgroundColor: "#13542a",
    borderRadius: 22,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 180,
    overflow: "hidden",
    shadowColor: "#13542a",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 4,
  },
  heroLeftCol: {
    flex: 1,
    paddingRight: 6,
  },
  heroKicker: {
    fontSize: 10,
    fontWeight: "800",
    color: "#a7f3d0",
    letterSpacing: 1.1,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#ffffff",
    lineHeight: 26,
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  heroBadgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  heroBadgePill: {
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
  },
  heroBadgeText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#ffffff",
  },
  shopNowWhiteBtn: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  shopNowText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#13542a",
  },
  heroVegBagImage: {
    width: 130,
    height: 140,
    borderRadius: 16,
  },
  heroDotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    gap: 6,
  },
  heroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(0, 0, 0, 0.15)",
  },
  heroDotActive: {
    width: 18,
    backgroundColor: "#1e8e3e",
  },
  // Search
  searchSection: {
    marginBottom: 18,
  },
  // Section Wrapper & Headings
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#141c16",
    letterSpacing: -0.3,
  },
  seeAllGreenText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e8e3e",
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff7ed",
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  timerText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#c2410c",
  },
  // Categories (Screenshot 3)
  categorySquaresRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  categoryItemCol: {
    alignItems: "center",
    width: 64,
  },
  categorySquare: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  categorySquareActive: {
    borderWidth: 2,
    borderColor: "#1e8e3e",
    transform: [{ scale: 1.05 }],
  },
  categoryIconEmoji: {
    fontSize: 26,
  },
  categoryLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#141c16",
    textAlign: "center",
  },
  categoryLabelActive: {
    color: "#1e8e3e",
    fontWeight: "800",
  },
  // Promotional Discount Banner (Screenshot 3)
  promoDiscountWrap: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  promoDiscountBanner: {
    backgroundColor: "#f0f8f1",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#dcfce7",
  },
  promoDiscountTextCol: {
    flex: 1,
    paddingRight: 8,
  },
  promoDiscountKicker: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#15803d",
    letterSpacing: 1,
    marginBottom: 2,
  },
  promoDiscountTitle: {
    fontSize: 21,
    fontWeight: "900",
    color: "#14532d",
    lineHeight: 24,
    marginBottom: 4,
  },
  promoDiscountSub: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "500",
    lineHeight: 15,
    marginBottom: 10,
  },
  promoShopNowGreenBtn: {
    backgroundColor: "#166534",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: "flex-start",
  },
  promoShopNowText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#ffffff",
  },
  produceBasketImage: {
    width: 110,
    height: 105,
    borderRadius: 14,
  },
  // Products Scroll (Screenshot 3)
  productsScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  productCard: {
    width: 140,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e4f3e7",
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 2,
    position: "relative",
  },
  productDiscountBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#1e8e3e",
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
    zIndex: 2,
  },
  productDiscountText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#ffffff",
  },
  productPhotoBox: {
    width: "100%",
    height: 95,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f4f9f5",
    marginBottom: 8,
    marginTop: 4,
  },
  productPhoto: {
    width: "100%",
    height: "100%",
  },
  productName: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#141c16",
    marginBottom: 8,
  },
  productBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceCol: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "900",
    color: "#141c16",
  },
  productMrp: {
    fontSize: 11,
    color: "#94a3b8",
    textDecorationLine: "line-through",
    fontWeight: "500",
  },
  addGreenCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1e8e3e",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1e8e3e",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  addGreenPlusText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
    lineHeight: 20,
  },
  qtyPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e8e3e",
    borderRadius: 14,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 6,
  },
  qtyBtn: {
    paddingHorizontal: 4,
  },
  qtyBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
  },
  qtyCount: {
    fontSize: 12,
    fontWeight: "800",
    color: "#ffffff",
  },
});

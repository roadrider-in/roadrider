import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Pressable,
  Modal,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Dimensions,
  Share,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "../../components/Icon";
import Button from "../../components/Button";
import FlowHeader from "../../components/FlowHeader";
import GlobalLocationHeader from "../../components/GlobalLocationHeader";
import {
  PACKAGE_TYPES,
  serviceMeta,
  type MenuItem,
  type Restaurant,
  type Product,
  type ActiveOffer,
} from "../../data/demo";
import {
  fetchStoreById,
  fetchApprovedRestaurants,
  fetchApprovedGroceryProducts,
} from "../../lib/supabaseData";
import { VendorDishImage, getVerifiedDishPhoto } from "../../lib/dishImages";
import { rupees } from "../../lib/pricing";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { useI18n } from "../../lib/i18n";
import { colors, radii } from "../../theme/tokens";
import { StoreDetailSkeleton } from "../../components/animations/ModuleSkeletons";
import FadeInView from "../../components/animations/FadeInView";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface StoreDetailProps {
  service: "food" | "grocery" | "courier";
  storeId?: string;
  highlightItemId?: string;
}

type FilterKey =
  | "all"
  | "reordered"
  | "spicy"
  | "veg"
  | "nonveg"
  | "bestseller"
  | "price_asc"
  | "price_desc";

export default function StoreDetail({
  service,
  storeId,
  highlightItemId,
}: StoreDetailProps) {
  const insets = useSafeAreaInsets();
  const { push, back } = useNav();
  const {
    state,
    addToCart,
    changeQty,
    itemTotal,
    toggleFavorite,
    showToast,
    setPendingAction,
    placeById,
  } = useApp();
  const { t } = useI18n();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [groceryProducts, setGroceryProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search in Menu
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filters and Sorting
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  // Modals
  const [showOffersSheet, setShowOffersSheet] = useState(false);
  const [showStoreInfoModal, setShowStoreInfoModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [scheduleOption, setScheduleOption] = useState<"asap" | "later">("asap");

  // Section collapse states
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  // Description expand states (...more / ...less)
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});

  // Item customization
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [selectedPortionId, setSelectedPortionId] = useState<string>("");
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);

  // Ref to scroll to sections
  const scrollViewRef = useRef<ScrollView>(null);
  const sectionPositions = useRef<Record<string, number>>({});

  // Active customer coordinates from selected address or GPS
  const customerPlace = placeById(state.defaultPlaceId) ?? state.places[0];
  const customerCoords = customerPlace?.coords ?? null;

  // Load store data
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      setErrorMsg(null);

      if (service === "food") {
        if (storeId) {
          const res = await fetchStoreById(storeId, customerCoords);
          if (!isMounted) return;
          if (res.error || !res.data) {
            setErrorMsg(res.error || "This store is not approved or currently unavailable.");
            setRestaurant(null);
          } else {
            setRestaurant(res.data);
          }
        } else {
          const res = await fetchApprovedRestaurants(customerCoords);
          if (!isMounted) return;
          if (res.error || res.data.length === 0) {
            setErrorMsg(res.error || "No approved restaurants found.");
            setRestaurant(null);
          } else {
            setRestaurant(res.data[0]);
          }
        }
      } else if (service === "grocery") {
        const res = await fetchApprovedGroceryProducts();
        if (!isMounted) return;
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          setGroceryProducts(res.data);
        }
      }
      setIsLoading(false);
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [service, storeId, customerCoords?.lat, customerCoords?.lng]);

  const total = itemTotal(service);
  const cartLines = state.carts[service === "grocery" ? "grocery" : "food"].lines;
  const cartItemCount = cartLines.reduce((sum, l) => sum + l.qty, 0);

  // Group dishes into menu categories
  const menuCategories = useMemo(() => {
    if (!restaurant) return [];

    let items = [...restaurant.menu];

    // Search filter
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q))
      );
    }

    // Quick filters
    if (activeFilter === "veg") {
      items = items.filter((item) => item.isVeg);
    } else if (activeFilter === "nonveg") {
      items = items.filter((item) => !item.isVeg);
    } else if (activeFilter === "spicy") {
      items = items.filter((item) => item.isSpicy);
    } else if (activeFilter === "reordered") {
      items = items.filter((item) => item.isHighlyReordered);
    } else if (activeFilter === "bestseller") {
      items = items.filter((item) => item.isBestseller);
    } else if (activeFilter === "price_asc") {
      items.sort((a, b) => a.price - b.price);
    } else if (activeFilter === "price_desc") {
      items.sort((a, b) => b.price - a.price);
    }

    // Grouping
    const groups: { title: string; items: MenuItem[] }[] = [];
    const categoryMap = new Map<string, MenuItem[]>();

    // 1. Recommended / Bestseller section first
    const recommended = items.filter((i) => i.isBestseller || i.isHighlyReordered);
    if (recommended.length > 0 && activeFilter === "all" && !searchQuery.trim()) {
      groups.push({
        title: t("menu_recommended", "Recommended for you"),
        items: recommended,
      });
    }

    // 2. Map other categories
    items.forEach((item) => {
      const cat = item.category || "Main Menu";
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, []);
      }
      categoryMap.get(cat)!.push(item);
    });

    categoryMap.forEach((catItems, title) => {
      // If we already have Recommended, avoid duplicate header if same name
      if (title === t("menu_recommended", "Recommended for you") && groups.length > 0) return;
      groups.push({ title, items: catItems });
    });

    if (groups.length === 0 && items.length > 0) {
      groups.push({
        title: t("menu_recommended", "Recommended for you"),
        items,
      });
    }

    return groups;
  }, [restaurant, searchQuery, activeFilter, t]);

  const toggleSectionCollapse = (title: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const toggleDescriptionExpand = (itemId: string) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const scrollToCategory = (title: string) => {
    setShowCategoriesModal(false);
    const pos = sectionPositions.current[title];
    if (typeof pos === "number" && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: Math.max(0, pos - 80), animated: true });
    }
  };

  const handleShare = async () => {
    if (!restaurant) return;
    try {
      await Share.share({
        message: `Order delicious food from ${restaurant.name} on RoadRider! ${restaurant.address}`,
        title: restaurant.name,
      });
    } catch {}
  };

  const handleToggleFav = (targetId: string, title?: string) => {
    if (!state.authenticated) {
      setPendingAction({
        type: "wishlist",
        itemId: targetId,
        itemTitle: title,
      });
      showToast("Please sign in to save favorites");
      push({ name: "phone" });
      return;
    }
    toggleFavorite(targetId);
    showToast(
      state.favorites.includes(targetId)
        ? "Removed from favorites"
        : "Added to favorites"
    );
  };

  const openCustomizer = (item: MenuItem) => {
    setCustomizingItem(item);
    setSelectedPortionId(item.portions?.[0]?.id ?? "");
    setSelectedAddonIds([]);
  };

  const handleApplyCustomization = () => {
    if (!customizingItem || !restaurant) return;
    const activePortion =
      customizingItem.portions?.find((p) => p.id === selectedPortionId) ?? null;
    const basePrice = activePortion ? activePortion.price : customizingItem.price;
    const selectedAddons = (customizingItem.addons ?? []).filter((a) =>
      selectedAddonIds.includes(a.id)
    );
    const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
    const finalPrice = basePrice + addonsTotal;

    const portionPart = activePortion ? activePortion.name : "1 portion";
    const addonsPart =
      selectedAddons.length > 0 ? selectedAddons.map((a) => a.name).join(", ") : "";
    const subtitle = addonsPart ? `${portionPart} · ${addonsPart}` : portionPart;

    const variantId = `${customizingItem.id}${
      selectedPortionId ? `-${selectedPortionId}` : ""
    }${selectedAddonIds.length > 0 ? `-${selectedAddonIds.sort().join("-")}` : ""}`;

    addToCart(
      "food",
      {
        id: variantId,
        name: customizingItem.name,
        subtitle,
        price: finalPrice,
        photo: customizingItem.photo,
      },
      restaurant.id
    );
    setCustomizingItem(null);
  };

  const handleAdd = (item: MenuItem) => {
    if (!restaurant) return;
    if (
      (item.portions && item.portions.length > 0) ||
      (item.addons && item.addons.length > 0)
    ) {
      openCustomizer(item);
      return;
    }

    addToCart(
      "food",
      {
        id: item.id,
        name: item.name,
        subtitle: "1 portion · Freshly prepared",
        price: item.price,
        photo: item.photo,
      },
      restaurant.id
    );
  };

  // Get quantity of dish in cart
  const getItemCartQty = (item: MenuItem): number => {
    return cartLines
      .filter((l) => l.id === item.id || l.id.startsWith(`${item.id}-`))
      .reduce((sum, l) => sum + l.qty, 0);
  };

  const handleDecrement = (item: MenuItem) => {
    const line = cartLines.find(
      (l) => l.id === item.id || l.id.startsWith(`${item.id}-`)
    );
    if (line) {
      changeQty("food", line.id, -1);
    }
  };

  const handleIncrement = (item: MenuItem) => {
    const line = cartLines.find(
      (l) => l.id === item.id || l.id.startsWith(`${item.id}-`)
    );
    if (line) {
      changeQty("food", line.id, 1);
    } else {
      handleAdd(item);
    }
  };

  if (isLoading && service !== "courier") {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: "#ffffff" }]} edges={["top"]}>
        <StatusBar barStyle="dark-content" />
        <StoreDetailSkeleton theme={service === "grocery" ? "grocery" : "food"} />
      </SafeAreaView>
    );
  }

  /* -------------------------------------------------------------
   * 1. FOOD SERVICE (Matching Screenshot 2)
   * ----------------------------------------------------------- */
  if (service === "food") {
    if (!restaurant) {
      return (
        <SafeAreaView style={[styles.container, styles.center]} edges={["top"]}>
          <StatusBar barStyle="dark-content" />
          <Icon name="info" size={48} color="#9aa0a6" />
          <Text style={styles.emptyTitle}>Restaurant Unavailable</Text>
          <Text style={styles.emptySub}>
            {errorMsg || "This restaurant is not currently available."}
          </Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => push({ name: "restaurantsList" })}
          >
            <Text style={styles.browseBtnText}>Browse Restaurants</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }

    const isFav = state.favorites.includes(restaurant.id);

    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="dark-content" />

        {/* TOP NAVIGATION BAR (Matching Screenshot 2) */}
        <View style={styles.topNavBar}>
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={back}
            accessibilityLabel="Back"
          >
            <Icon name="back" size={20} color="#1e1e24" />
          </TouchableOpacity>

          {/* Center Search Pill or Active Input */}
          {isSearchOpen ? (
            <View style={styles.activeSearchWrap}>
              <Icon name="search" size={17} color="#5f6368" />
              <TextInput
                style={styles.activeSearchInput}
                placeholder={t("search_dishes_in_restaurant", "Search in this restaurant")}
                placeholderTextColor="#80868b"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              <TouchableOpacity onPress={() => { setIsSearchOpen(false); setSearchQuery(""); }}>
                <Icon name="close" size={16} color="#5f6368" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.searchPill}
              activeOpacity={0.8}
              onPress={() => setIsSearchOpen(true)}
            >
              <Icon name="search" size={17} color="#3c4043" />
              <Text style={styles.searchPillText}>
                {t("search", "Search")}
              </Text>
            </TouchableOpacity>
          )}

          {/* Right Actions: Group/Share & More */}
          <View style={styles.topRightActions}>
            <TouchableOpacity
              style={styles.circleBtn}
              onPress={handleShare}
              accessibilityLabel="Share Restaurant"
            >
              <Icon name="users" size={19} color="#1e1e24" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.circleBtn}
              onPress={() => setShowStoreInfoModal(true)}
              accessibilityLabel="More Options"
            >
              <Icon name="more-vertical" size={19} color="#1e1e24" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: cartItemCount > 0 ? 140 : 80 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* RESTAURANT HEADER CARD (Warm Brown Design Reference) */}
          <View style={styles.restaurantCard}>
            {/* Pure Veg Badge if applicable */}
            {restaurant.isPureVeg && (
              <View style={styles.pureVegBadge}>
                <Icon name="leaf" size={13} color="#1e8e3e" />
                <Text style={styles.pureVegBadgeText}>
                  {t("pure_veg_badge", "PURE VEG RESTAURANT")}
                </Text>
              </View>
            )}

            {/* Title & Rating Row */}
            <View style={styles.titleRow}>
              <View style={styles.titleWrap}>
                <Text style={styles.restaurantName} numberOfLines={2}>
                  {restaurant.name}
                </Text>
                <TouchableOpacity
                  style={styles.infoIconBtn}
                  onPress={() => setShowStoreInfoModal(true)}
                  hitSlop={6}
                >
                  <Icon name="info" size={16} color="#7d6b5e" />
                </TouchableOpacity>
              </View>

              {/* Warm Brown Rating Badge */}
              <View style={styles.ratingCol}>
                <View style={styles.ratingBadge}>
                  <Icon name="star" size={12} color="#f59e0b" filled />
                  <Text style={styles.ratingText}>
                    {restaurant.rating.toFixed(1)}
                  </Text>
                </View>
                <Text style={styles.reviewCountText}>
                  {t("by_reviews", `${restaurant.totalReviews || 200}+ reviews`)}
                </Text>
              </View>
            </View>

            {/* Subtitle / Category Accent */}
            <View style={styles.subtitleRow}>
              <View style={styles.accentDash} />
              <Text style={styles.subtitleText}>
                {restaurant.cuisines && restaurant.cuisines.length > 0
                  ? restaurant.cuisines.join(" • ").toUpperCase()
                  : "RESTAURANT & DINING"}
              </Text>
              <View style={styles.accentDash} />
            </View>

            {/* Time & Distance Pill */}
            <View style={styles.metaPill}>
              <View style={styles.metaPillItem}>
                <Icon name="clock" size={13} color="#6e5746" />
                <Text style={styles.metaPillText}>{restaurant.eta || "25–35 mins"}</Text>
              </View>
              <View style={styles.metaPillDivider} />
              <View style={styles.metaPillItem}>
                <Icon name="pin" size={13} color="#6e5746" />
                <Text style={styles.metaPillText}>
                  {restaurant.distanceKm ? `${restaurant.distanceKm} km` : "2.4 km"}
                </Text>
              </View>
            </View>

            {/* Schedule Option Link */}
            <View style={styles.scheduleRow}>
              <Icon name="check" size={13} color="#1e8e3e" />
              <Text style={styles.onTimeTagText}>
                {t("on_time_prep", "On-time preparation")} ·{" "}
              </Text>
              <TouchableOpacity
                style={styles.scheduleLink}
                onPress={() => setShowScheduleModal(true)}
              >
                <Text style={styles.scheduleLinkText}>
                  {scheduleOption === "later"
                    ? t("schedule_later", "Scheduled for later")
                    : t("schedule_for_later", "Schedule for later")}
                </Text>
                <Icon name="chevron-down" size={12} color="#6e5746" />
              </TouchableOpacity>
            </View>

            {/* OFFERS BANNER PILL (Matching Warm Brown Design) */}
            {restaurant.activeOffer ? (
              <TouchableOpacity
                style={styles.offersRow}
                activeOpacity={0.85}
                onPress={() => setShowOffersSheet(true)}
              >
                <View style={styles.offerIconWrap}>
                  <Icon name="ticket" size={15} color="#8a481e" />
                </View>
                <Text style={styles.offerHeadline} numberOfLines={1}>
                  {restaurant.activeOffer.formattedHeadline}
                </Text>
                <View style={styles.offerRightPill}>
                  <Text style={styles.offerCountText}>
                    {restaurant.offers?.length || 2} offers
                  </Text>
                  <Icon name="chevron-right" size={13} color="#8a481e" />
                </View>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* HORIZONTAL FILTERS & SORTING BAR (Matching Screenshot 2) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScroll}
          >
            {/* Filter Button */}
            <TouchableOpacity
              style={[
                styles.filterPill,
                activeFilter !== "all" && styles.filterPillActive,
              ]}
              onPress={() => setShowFiltersModal(true)}
            >
              <Icon name="filter" size={14} color={activeFilter !== "all" ? "#c84b31" : "#3c4043"} />
              <Text style={[styles.filterPillText, activeFilter !== "all" && styles.filterPillTextActive]}>
                {t("filter_all", "Filters")}
              </Text>
              <Icon name="chevron-down" size={12} color={activeFilter !== "all" ? "#c84b31" : "#5f6368"} />
            </TouchableOpacity>

            {/* Highly Reordered */}
            <TouchableOpacity
              style={[
                styles.filterPill,
                activeFilter === "reordered" && styles.filterPillActive,
              ]}
              onPress={() => setActiveFilter(activeFilter === "reordered" ? "all" : "reordered")}
            >
              <Icon name="history" size={14} color={activeFilter === "reordered" ? "#c84b31" : "#1e8e3e"} />
              <Text style={[styles.filterPillText, activeFilter === "reordered" && styles.filterPillTextActive]}>
                {t("filter_highly_reordered", "Highly reordered")}
              </Text>
            </TouchableOpacity>

            {/* Spicy */}
            <TouchableOpacity
              style={[
                styles.filterPill,
                activeFilter === "spicy" && styles.filterPillActive,
              ]}
              onPress={() => setActiveFilter(activeFilter === "spicy" ? "all" : "spicy")}
            >
              <Icon name="chilli" size={14} color={activeFilter === "spicy" ? "#c84b31" : "#d93025"} />
              <Text style={[styles.filterPillText, activeFilter === "spicy" && styles.filterPillTextActive]}>
                {t("filter_spicy", "Spicy")}
              </Text>
            </TouchableOpacity>

            {/* Pure Veg */}
            <TouchableOpacity
              style={[
                styles.filterPill,
                activeFilter === "veg" && styles.filterPillActive,
              ]}
              onPress={() => setActiveFilter(activeFilter === "veg" ? "all" : "veg")}
            >
              <Icon name="leaf" size={14} color={activeFilter === "veg" ? "#c84b31" : "#1e8e3e"} />
              <Text style={[styles.filterPillText, activeFilter === "veg" && styles.filterPillTextActive]}>
                {t("filter_veg", "Veg")}
              </Text>
            </TouchableOpacity>

            {/* Non-Veg */}
            <TouchableOpacity
              style={[
                styles.filterPill,
                activeFilter === "nonveg" && styles.filterPillActive,
              ]}
              onPress={() => setActiveFilter(activeFilter === "nonveg" ? "all" : "nonveg")}
            >
              <Text style={[styles.filterPillText, activeFilter === "nonveg" && styles.filterPillTextActive]}>
                🍗 {t("filter_non_veg", "Non-Veg")}
              </Text>
            </TouchableOpacity>

            {/* Bestseller */}
            <TouchableOpacity
              style={[
                styles.filterPill,
                activeFilter === "bestseller" && styles.filterPillActive,
              ]}
              onPress={() => setActiveFilter(activeFilter === "bestseller" ? "all" : "bestseller")}
            >
              <Icon name="star" size={14} color={activeFilter === "bestseller" ? "#c84b31" : "#f9ab00"} filled />
              <Text style={[styles.filterPillText, activeFilter === "bestseller" && styles.filterPillTextActive]}>
                {t("filter_bestseller", "Bestseller")}
              </Text>
            </TouchableOpacity>

            {/* Price: Low to High */}
            <TouchableOpacity
              style={[
                styles.filterPill,
                activeFilter === "price_asc" && styles.filterPillActive,
              ]}
              onPress={() => setActiveFilter(activeFilter === "price_asc" ? "all" : "price_asc")}
            >
              <Text style={[styles.filterPillText, activeFilter === "price_asc" && styles.filterPillTextActive]}>
                ↑ {t("filter_price_l2h", "Price: Low to High")}
              </Text>
            </TouchableOpacity>

            {/* Price: High to Low */}
            <TouchableOpacity
              style={[
                styles.filterPill,
                activeFilter === "price_desc" && styles.filterPillActive,
              ]}
              onPress={() => setActiveFilter(activeFilter === "price_desc" ? "all" : "price_desc")}
            >
              <Text style={[styles.filterPillText, activeFilter === "price_desc" && styles.filterPillTextActive]}>
                ↓ {t("filter_price_h2l", "Price: High to Low")}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Empty state if filtered results are 0 */}
          {menuCategories.length === 0 && (
            <View style={styles.noFilterResultsWrap}>
              <Text style={styles.noFilterText}>
                {t("no_dishes_found_filter", "No dishes match your selected filters.")}
              </Text>
              <TouchableOpacity
                style={styles.clearFilterBtn}
                onPress={() => { setActiveFilter("all"); setSearchQuery(""); }}
              >
                <Text style={styles.clearFilterBtnText}>
                  {t("clear_all_filters", "Clear Filters")}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* MENU CATEGORIES & DISH CARDS (Matching Screenshot 2) */}
          {menuCategories.map((group) => {
            const isCollapsed = Boolean(collapsedSections[group.title]);

            return (
              <View
                key={group.title}
                style={styles.categorySection}
                onLayout={(e) => {
                  sectionPositions.current[group.title] = e.nativeEvent.layout.y;
                }}
              >
                {/* Category Header with Collapse Toggle */}
                <TouchableOpacity
                  style={styles.categoryHeaderRow}
                  activeOpacity={0.8}
                  onPress={() => toggleSectionCollapse(group.title)}
                >
                  <Text style={styles.categoryTitle}>
                    {group.title} ({group.items.length})
                  </Text>
                  <Icon
                    name={isCollapsed ? "chevron-down" : "chevron-up"}
                    size={18}
                    color="#202124"
                  />
                </TouchableOpacity>

                {/* Dishes in this category */}
                {!isCollapsed &&
                  group.items.map((item) => {
                    const qty = getItemCartQty(item);
                    const isItemExpanded = Boolean(expandedDescriptions[item.id]);
                    const hasCustomizations =
                      Boolean(item.portions && item.portions.length > 0) ||
                      Boolean(item.addons && item.addons.length > 0);
                    const isItemFav = state.favorites.includes(item.id);
                    const isHighlighted = highlightItemId === item.id;

                    return (
                      <View
                        key={item.id}
                        style={[
                          styles.dishRow,
                          isHighlighted && styles.dishRowHighlighted,
                        ]}
                      >
                        {/* LEFT COLUMN: Food Info */}
                        <View style={styles.dishLeftCol}>
                          {/* Veg / Non-Veg Indicator + Spicy */}
                          <View style={styles.vegSpicyRow}>
                            <View
                              style={[
                                styles.dietIconBox,
                                item.isVeg ? styles.vegBox : styles.nonVegBox,
                              ]}
                            >
                              {item.isVeg ? (
                                <View style={styles.vegDot} />
                              ) : (
                                <View style={styles.nonVegTriangle} />
                              )}
                            </View>

                            {item.isSpicy && (
                              <View style={styles.chilliWrap}>
                                <Icon name="chilli" size={14} color="#d93025" />
                              </View>
                            )}
                          </View>

                          {/* Food Name */}
                          <Text style={styles.dishName}>{item.name}</Text>

                          {/* Popularity Badge (Highly reordered / Bestseller) */}
                          {item.isHighlyReordered ? (
                            <View style={styles.popularityBadge}>
                              <View style={styles.popBar} />
                              <Text style={styles.popularityText}>
                                Highly reordered
                              </Text>
                            </View>
                          ) : item.isBestseller ? (
                            <View style={styles.popularityBadge}>
                              <View style={[styles.popBar, { backgroundColor: "#f9ab00" }]} />
                              <Text style={styles.popularityText}>Bestseller</Text>
                            </View>
                          ) : null}

                          {/* Price */}
                          <Text style={styles.dishPrice}>{rupees(item.price)}</Text>

                          {/* Description with ...more / ...less */}
                          {item.description ? (
                            <Text style={styles.dishDesc} numberOfLines={isItemExpanded ? undefined : 2}>
                              {item.description}
                              {item.description.length > 50 && (
                                <Text
                                  style={styles.moreLessText}
                                  onPress={() => toggleDescriptionExpand(item.id)}
                                >
                                  {isItemExpanded ? ` ${t("show_less", "less")}` : `...${t("show_more", "more")}`}
                                </Text>
                              )}
                            </Text>
                          ) : null}

                          {/* Bottom Actions: Bookmark & Share */}
                          <View style={styles.dishActionsRow}>
                            <TouchableOpacity
                              style={styles.dishActionCircle}
                              activeOpacity={0.7}
                              onPress={() => handleToggleFav(item.id, item.name)}
                            >
                              <Icon
                                name="bookmark"
                                size={15}
                                color={isItemFav ? "#c84b31" : "#5f6368"}
                                filled={isItemFav}
                              />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.dishActionCircle}
                              activeOpacity={0.7}
                              onPress={() => {
                                Share.share({
                                  message: `Check out ${item.name} at ${restaurant.name} on RoadRider!`,
                                });
                              }}
                            >
                              <Icon name="share" size={15} color="#5f6368" />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* RIGHT COLUMN: Food Image + Floating ADD Button */}
                        <View style={styles.dishRightCol}>
                          <View style={styles.dishImageWrapper}>
                            <View style={styles.dishImageContainer}>
                              <VendorDishImage
                                uri={item.photo}
                                name={item.name}
                                isVeg={item.isVeg}
                                style={styles.dishImage}
                              />
                            </View>

                            {/* Overlapping ADD / Quantity Button */}
                            <View style={styles.addBtnContainer}>
                              {qty > 0 ? (
                                <View style={styles.qtyControlPill}>
                                  <TouchableOpacity
                                    style={styles.qtyBtn}
                                    onPress={() => handleDecrement(item)}
                                  >
                                    <Text style={styles.qtyBtnText}>-</Text>
                                  </TouchableOpacity>
                                  <Text style={styles.qtyValue}>{qty}</Text>
                                  <TouchableOpacity
                                    style={styles.qtyBtn}
                                    onPress={() => handleIncrement(item)}
                                  >
                                    <Text style={styles.qtyBtnText}>+</Text>
                                  </TouchableOpacity>
                                </View>
                              ) : (
                                <TouchableOpacity
                                  style={styles.addBtn}
                                  activeOpacity={0.85}
                                  onPress={() => handleAdd(item)}
                                >
                                  <Text style={styles.addBtnText}>ADD</Text>
                                  <Text style={styles.addBtnPlus}>+</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>

                          {/* Customisable Indicator */}
                          {hasCustomizations && (
                            <Text style={styles.customisableText}>
                              {t("customisable", "customisable")}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
              </View>
            );
          })}
        </ScrollView>

        {/* FLOATING "🍴 Menu" BUTTON (Matching Screenshot 2) */}
        {menuCategories.length > 0 && (
          <TouchableOpacity
            style={[styles.floatingMenuBtn, { bottom: cartItemCount > 0 ? 100 : 24 }]}
            activeOpacity={0.85}
            onPress={() => setShowCategoriesModal(true)}
          >
            <Icon name="cutlery" size={15} color="#ffffff" />
            <Text style={styles.floatingMenuText}>
              {t("menu_pill", "Menu")}
            </Text>
          </TouchableOpacity>
        )}

        {/* STICKY BOTTOM CART BAR (Matching Screenshot 1 & 2) */}
        {cartItemCount > 0 && (
          <View style={styles.stickyBottomBar}>
            {/* Gold Banner Strip */}
            <View style={styles.goldBanner}>
              <Text style={styles.goldBannerText}>
                🛵 {t("free_gold_delivery", "Get FREE delivery above ₹99 with GOLD")}
              </Text>
            </View>

            {/* Main Cart CTA */}
            <TouchableOpacity
              style={styles.cartCta}
              activeOpacity={0.9}
              onPress={() => push({ name: "cart", service: "food" })}
            >
              <View style={styles.cartCtaLeft}>
                <View style={styles.cartCountBadge}>
                  <Text style={styles.cartCountBadgeText}>{cartItemCount}</Text>
                </View>
                <Text style={styles.cartCtaLabel}>
                  {cartItemCount} {cartItemCount === 1 ? t("item", "item") : t("items", "items")}
                </Text>
              </View>

              <View style={styles.cartCtaRight}>
                <Text style={styles.cartCtaTotal}>
                  {t("view_cart", "View Cart")} · {rupees(total)}
                </Text>
                <Icon name="arrow" size={16} color="#ffffff" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* FILTERS & SORTING MODAL */}
        <Modal
          visible={showFiltersModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowFiltersModal(false)}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowFiltersModal(false)}
          >
            <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
              <View style={styles.sheetHandle} />
              <View style={styles.filterModalHeader}>
                <Text style={styles.sheetTitle}>
                  {t("filter_all", "Filters & Sorting")}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setActiveFilter("all");
                    setShowFiltersModal(false);
                  }}
                >
                  <Text style={styles.filterResetText}>Reset All</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                {[
                  { key: "all", label: "All Items", icon: "cutlery" },
                  { key: "reordered", label: "Highly Reordered", icon: "history" },
                  { key: "spicy", label: "Spicy Dishes Only", icon: "chilli" },
                  { key: "veg", label: "Pure Veg Only", icon: "leaf" },
                  { key: "nonveg", label: "Non-Veg Only", icon: "cutlery" },
                  { key: "bestseller", label: "Bestseller Dishes", icon: "star" },
                  { key: "price_asc", label: "Price: Low to High", icon: "arrow" },
                  { key: "price_desc", label: "Price: High to Low", icon: "arrow" },
                ].map((opt) => {
                  const isSelected = activeFilter === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[
                        styles.filterOptionRow,
                        isSelected && styles.filterOptionRowSelected,
                      ]}
                      onPress={() => {
                        setActiveFilter(opt.key as FilterKey);
                        setShowFiltersModal(false);
                      }}
                    >
                      <View style={styles.filterOptionLeft}>
                        <Icon
                          name={opt.icon as any}
                          size={16}
                          color={isSelected ? "#c84b31" : "#5f6368"}
                        />
                        <Text
                          style={[
                            styles.filterOptionLabel,
                            isSelected && styles.filterOptionLabelSelected,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.radioCircle,
                          isSelected && styles.radioCircleActive,
                        ]}
                      >
                        {isSelected && <View style={styles.radioInnerDot} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity
                style={styles.dialogConfirmBtn}
                onPress={() => setShowFiltersModal(false)}
              >
                <Text style={styles.dialogConfirmText}>{t("confirm", "Apply")}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* OFFERS EXPANDABLE BOTTOM SHEET */}
        <Modal
          visible={showOffersSheet}
          transparent
          animationType="slide"
          onRequestClose={() => setShowOffersSheet(false)}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowOffersSheet(false)}
          >
            <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>
                {t("available_offers", "Available Offers")}
              </Text>

              {restaurant?.offers?.map((offer) => (
                <View key={offer.id} style={styles.offerItemCard}>
                  <View style={styles.offerBadgeTag}>
                    <Text style={styles.offerBadgeCode}>{offer.code}</Text>
                  </View>
                  <Text style={styles.offerDescription}>{offer.description}</Text>
                  {offer.minOrderAmount ? (
                    <Text style={styles.offerTerms}>
                      Valid on orders above {rupees(offer.minOrderAmount)}
                    </Text>
                  ) : null}
                  <TouchableOpacity
                    style={styles.applyCouponBtn}
                    onPress={() => {
                      setShowOffersSheet(false);
                      showToast(`Applied offer: ${offer.code}`);
                    }}
                  >
                    <Text style={styles.applyCouponText}>
                      {t("use_code", "Use Code")}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={() => setShowOffersSheet(false)}
              >
                <Text style={styles.sheetCloseText}>{t("close", "Close")}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* SCHEDULE FOR LATER MODAL */}
        <Modal
          visible={showScheduleModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowScheduleModal(false)}
        >
          <View style={styles.modalBackdropCenter}>
            <View style={styles.dialogCard}>
              <Text style={styles.dialogTitle}>
                {t("schedule_modal_title", "Schedule Order")}
              </Text>
              <TouchableOpacity
                style={[
                  styles.scheduleRadioOption,
                  scheduleOption === "asap" && styles.scheduleRadioOptionActive,
                ]}
                onPress={() => setScheduleOption("asap")}
              >
                <View style={styles.radioCircle}>
                  {scheduleOption === "asap" && <View style={styles.radioInnerDot} />}
                </View>
                <View>
                  <Text style={styles.scheduleOptionTitle}>
                    {t("schedule_asap", "Deliver ASAP (Standard)")}
                  </Text>
                  <Text style={styles.scheduleOptionSub}>
                    {restaurant?.eta || "25–30 mins"}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.scheduleRadioOption,
                  scheduleOption === "later" && styles.scheduleRadioOptionActive,
                ]}
                onPress={() => setScheduleOption("later")}
              >
                <View style={styles.radioCircle}>
                  {scheduleOption === "later" && <View style={styles.radioInnerDot} />}
                </View>
                <View>
                  <Text style={styles.scheduleOptionTitle}>
                    {t("schedule_later", "Schedule for a specific time")}
                  </Text>
                  <Text style={styles.scheduleOptionSub}>
                    Today, within next 2 hours
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dialogConfirmBtn}
                onPress={() => {
                  setShowScheduleModal(false);
                  showToast(
                    scheduleOption === "later"
                      ? "Order scheduled for later delivery"
                      : "Standard ASAP delivery confirmed"
                  );
                }}
              >
                <Text style={styles.dialogConfirmText}>{t("confirm", "Confirm")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* RESTAURANT INFO / MORE OPTIONS MODAL */}
        <Modal
          visible={showStoreInfoModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowStoreInfoModal(false)}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowStoreInfoModal(false)}
          >
            <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>
                {restaurant?.name || t("store_info", "Restaurant Details")}
              </Text>
              <Text style={styles.infoAddressText}>{restaurant?.address}</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>FSSAI License:</Text>
                <Text style={styles.infoVal}>12723055000492 (Verified)</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Operational Status:</Text>
                <Text style={[styles.infoVal, { color: "#1e8e3e" }]}>
                  {restaurant?.isOnline ? "Online · Accepting Orders" : "Offline"}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Customer Support:</Text>
                <Text style={styles.infoVal}>RoadRider Certified Merchant</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Delivery Mode:</Text>
                <Text style={styles.infoVal}>Express Doorstep Courier</Text>
              </View>

              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={() => setShowStoreInfoModal(false)}
              >
                <Text style={styles.sheetCloseText}>{t("close", "Close")}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* FLOATING MENU CATEGORIES JUMP MODAL */}
        <Modal
          visible={showCategoriesModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCategoriesModal(false)}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowCategoriesModal(false)}
          >
            <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>{t("menu_pill", "Menu")}</Text>

              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {menuCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat.title}
                    style={styles.menuCatJumpRow}
                    onPress={() => scrollToCategory(cat.title)}
                  >
                    <Text style={styles.menuCatJumpTitle}>{cat.title}</Text>
                    <Text style={styles.menuCatJumpCount}>{cat.items.length}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* CUSTOMIZE ITEM MODAL */}
        {customizingItem && (
          <Modal
            visible={Boolean(customizingItem)}
            transparent
            animationType="slide"
            onRequestClose={() => setCustomizingItem(null)}
          >
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setCustomizingItem(null)}
            >
              <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>{customizingItem.name}</Text>
                <Text style={styles.customPriceText}>
                  Base: {rupees(customizingItem.price)}
                </Text>

                {/* Portions */}
                {customizingItem.portions && customizingItem.portions.length > 0 && (
                  <View style={styles.customSection}>
                    <Text style={styles.customSectionHeading}>Select Portion</Text>
                    {customizingItem.portions.map((portion) => (
                      <TouchableOpacity
                        key={portion.id}
                        style={styles.portionRow}
                        onPress={() => setSelectedPortionId(portion.id)}
                      >
                        <View style={styles.radioCircle}>
                          {selectedPortionId === portion.id && (
                            <View style={styles.radioInnerDot} />
                          )}
                        </View>
                        <Text style={styles.portionName}>{portion.name}</Text>
                        <Text style={styles.portionPrice}>{rupees(portion.price)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Addons */}
                {customizingItem.addons && customizingItem.addons.length > 0 && (
                  <View style={styles.customSection}>
                    <Text style={styles.customSectionHeading}>Optional Add-ons</Text>
                    {customizingItem.addons.map((addon) => {
                      const isChecked = selectedAddonIds.includes(addon.id);
                      return (
                        <TouchableOpacity
                          key={addon.id}
                          style={styles.portionRow}
                          onPress={() => {
                            if (isChecked) {
                              setSelectedAddonIds(selectedAddonIds.filter((id) => id !== addon.id));
                            } else {
                              setSelectedAddonIds([...selectedAddonIds, addon.id]);
                            }
                          }}
                        >
                          <View style={[styles.checkBox, isChecked && styles.checkBoxActive]}>
                            {isChecked && <Icon name="check" size={12} color="#ffffff" />}
                          </View>
                          <Text style={styles.portionName}>{addon.name}</Text>
                          <Text style={styles.portionPrice}>+{rupees(addon.price)}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.applyCustomizationBtn}
                  onPress={handleApplyCustomization}
                >
                  <Text style={styles.applyCustomizationText}>Add to Cart</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        )}
      </SafeAreaView>
    );
  }

  /* -------------------------------------------------------------
   * 2. GROCERY SERVICE
   * ----------------------------------------------------------- */
  if (service === "grocery") {
    const handleAddGrocery = (p: Product) => {
      if (!state.authenticated && !state.isGuest) {
        setPendingAction({
          type: "cart",
          service: "grocery",
          line: {
            id: p.id,
            name: p.name,
            subtitle: `${p.unit} · Fresh essentials`,
            price: p.price,
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
          id: p.id,
          name: p.name,
          subtitle: `${p.unit} · Fresh essentials`,
          price: p.price,
        },
        "roadrider-grocery"
      );
    };

    const handleContinueGrocery = () => {
      if (cartLines.length === 0) {
        showToast("Your basket is empty. Please add items to proceed.");
        return;
      }
      push({ name: "cart", service: "grocery" });
    };

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Delivery destination bar */}
          <View
            style={[
              styles.locationBarContainer,
              { marginHorizontal: 18, marginTop: 12 },
            ]}
          >
            <GlobalLocationHeader />
          </View>
          <View style={styles.coverWrapper}>
            <Image
              source={{ uri: serviceMeta.grocery.photo }}
              style={styles.coverImage}
              resizeMode="cover"
            />
            <View style={styles.coverOverlay} />
            <SafeAreaView style={styles.coverHeader} edges={["top"]}>
              <FlowHeader title="" />
            </SafeAreaView>
            <View style={styles.badgeChip}>
              <Text style={styles.badgeText}>{serviceMeta.grocery.label}</Text>
            </View>
          </View>

          <View style={styles.contentPad}>
            <Text style={styles.eyebrow}>{serviceMeta.grocery.kicker}</Text>
            <Text style={styles.title}>Your basket</Text>
            <Text style={styles.subTitle}>
              Fresh picks delivered in 15 minutes
            </Text>

            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Icon name="star" size={14} filled color="#f59e0b" />
                <Text style={styles.statText}> 4.9 rating</Text>
              </View>
              <View style={styles.statItem}>
                <Icon name="clock" size={14} color={colors.muted} />
                <Text style={styles.statText}> 15 min express</Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>In your basket</Text>
            </View>

            <View style={styles.menuList}>
              {groceryProducts.length > 0 ? (
                groceryProducts.map((p) => {
                  const line = cartLines.find((l) => l.id === p.id);
                  const qty = line?.qty ?? (cartLines.length === 0 ? 1 : 0);

                  return (
                    <View key={p.id} style={styles.menuCard}>
                      <View style={styles.menuInfo}>
                        <Text style={styles.dishName}>{p.name}</Text>
                        <Text style={styles.dishDesc}>
                          {p.unit} · Fresh daily stock
                        </Text>
                        <Text style={styles.dishPrice}>{rupees(p.price)}</Text>
                      </View>

                      <View style={styles.menuActionCol}>
                        {qty > 0 && cartLines.length > 0 ? (
                          <View style={styles.stepper}>
                            <TouchableOpacity
                              onPress={() => changeQty("grocery", p.id, -1)}
                              style={styles.stepperBtn}
                            >
                              <Text style={styles.stepperBtnText}>−</Text>
                            </TouchableOpacity>
                            <Text style={styles.stepperQty}>{qty}</Text>
                            <TouchableOpacity
                              onPress={() => changeQty("grocery", p.id, 1)}
                              style={styles.stepperBtn}
                            >
                              <Text style={styles.stepperBtnText}>+</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => handleAddGrocery(p)}
                            style={styles.addBtnGrocery}
                          >
                            <Text style={styles.addBtnGroceryText}>Add +</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={{ padding: 32, alignItems: "center", backgroundColor: colors.canvas, borderRadius: radii.lg, marginVertical: 12 }}>
                  <Icon name="package" size={40} color={colors.muted} />
                  <Text style={{ fontSize: 15, fontWeight: "700", color: colors.ink, marginTop: 12, textAlign: "center" }}>
                    No approved grocery stores available yet
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.muted, textAlign: "center", marginTop: 6, lineHeight: 18 }}>
                    We are currently onboarding verified grocery partners in Lucknow. Check back soon!
                  </Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        <SafeAreaView style={styles.bottomBar} edges={["bottom"]}>
          <Button onPress={handleContinueGrocery}>
            View basket · {rupees(total)}
          </Button>
        </SafeAreaView>
      </View>
    );
  }

  /* -------------------------------------------------------------
   * 3. COURIER SERVICE
   * ----------------------------------------------------------- */
  const pkg =
    PACKAGE_TYPES.find((p) => p.id === state.courier.packageId) ??
    PACKAGE_TYPES[1];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.coverWrapper}>
          <Image
            source={{ uri: serviceMeta.courier.photo }}
            style={styles.coverImage}
            resizeMode="cover"
          />
          <View style={styles.coverOverlay} />
          <SafeAreaView style={styles.coverHeader} edges={["top"]}>
            <FlowHeader title="" />
          </SafeAreaView>
          <View style={styles.badgeChip}>
            <Text style={styles.badgeText}>{serviceMeta.courier.label}</Text>
          </View>
        </View>

        <View style={styles.contentPad}>
          <Text style={styles.eyebrow}>{serviceMeta.courier.kicker}</Text>
          <Text style={styles.title}>Your delivery quote</Text>
          <Text style={styles.subTitle}>
            Doorstep pickup · Standard city delivery
          </Text>

          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Icon name="star" size={14} filled color="#f59e0b" />
              <Text style={styles.statText}> 4.9 rating</Text>
            </View>
            <View style={styles.statItem}>
              <Icon name="clock" size={14} color={colors.muted} />
              <Text style={styles.statText}> {pkg.time}</Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quote breakdown</Text>
          </View>

          <View style={styles.menuCard}>
            <View style={styles.menuInfo}>
              <Text style={styles.dishName}>
                {pkg.name} · {pkg.weight}
              </Text>
              <Text style={styles.dishDesc}>
                Carefully handled and protected throughout the journey.
              </Text>
              <Text style={styles.dishPrice}>{rupees(pkg.price)}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => push({ name: "cart", service: "courier" })}
              style={styles.addBtnGrocery}
            >
              <Text style={styles.addBtnGroceryText}>Select</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <SafeAreaView style={styles.bottomBar} edges={["bottom"]}>
        <Button onPress={() => push({ name: "cart", service: "courier" })}>
          Continue to payment
        </Button>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: "500",
    color: "#5f6368",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e1e24",
    marginTop: 16,
  },
  emptySub: {
    fontSize: 13,
    color: "#5f6368",
    textAlign: "center",
    marginTop: 8,
    maxWidth: 280,
  },
  browseBtn: {
    marginTop: 20,
    backgroundColor: "#c84b31",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  browseBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },

  /* TOP NAVIGATION BAR */
  topNavBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f1f3f4",
    gap: 10,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#dadce0",
    alignItems: "center",
    justifyContent: "center",
  },
  searchPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#dadce0",
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  searchPillText: {
    fontSize: 13.5,
    fontWeight: "500",
    color: "#5f6368",
  },
  activeSearchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#c84b31",
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  activeSearchInput: {
    flex: 1,
    fontSize: 13.5,
    color: "#1e1e24",
    padding: 0,
  },
  topRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  /* SCROLL CONTENT */
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },

  /* RESTAURANT HEADER CARD (Warm Brown Design Reference) */
  restaurantCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 18,
    backgroundColor: "#fcf7f0",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#ecdcd0",
    shadowColor: "#3e1c0d",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  pureVegBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f5e9",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    gap: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#c8e6c9",
  },
  pureVegBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#1e8e3e",
    letterSpacing: 0.4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  titleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    paddingRight: 8,
  },
  restaurantName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2a160d",
    letterSpacing: -0.3,
  },
  infoIconBtn: {
    padding: 2,
  },
  ratingCol: {
    alignItems: "flex-end",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3e1c0d",
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 12,
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#ffffff",
  },
  reviewCountText: {
    fontSize: 10,
    color: "#7d6b5e",
    marginTop: 3,
    fontWeight: "500",
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    marginBottom: 10,
    gap: 8,
  },
  accentDash: {
    width: 20,
    height: 1,
    backgroundColor: "#d5c1b1",
  },
  subtitleText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#7d6b5e",
    letterSpacing: 1.2,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2eae0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    gap: 8,
  },
  metaPillItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4e392d",
  },
  metaPillDivider: {
    width: 1,
    height: 12,
    backgroundColor: "#d8c7b8",
  },
  metaPillTextAddress: {
    flex: 1,
    fontSize: 11.5,
    color: "#6e5746",
    fontWeight: "500",
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 4,
  },
  scheduleLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  scheduleLinkText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2a160d",
  },
  onTimeTagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1e8e3e",
  },
  offersRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ebdbcc",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  offerIconWrap: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  offerHeadline: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "800",
    color: "#4a2410",
  },
  offerRightPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  offerCountText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#8a481e",
  },

  /* HORIZONTAL FILTERS */
  filtersScroll: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#dadce0",
    backgroundColor: "#ffffff",
    gap: 6,
  },
  filterPillActive: {
    borderColor: "#c84b31",
    backgroundColor: "#fef7f0",
  },
  filterPillText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#3c4043",
  },
  filterPillTextActive: {
    color: "#c84b31",
  },
  noFilterResultsWrap: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  noFilterText: {
    fontSize: 14,
    color: "#5f6368",
    textAlign: "center",
  },
  clearFilterBtn: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#f8f9fa",
  },
  clearFilterBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#c84b31",
  },

  /* CATEGORY SECTION */
  categorySection: {
    paddingHorizontal: 16,
    marginTop: 10,
  },
  categoryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e8eaed",
  },
  categoryTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1e1e24",
  },

  /* DISH CARD (Screenshot 2) */
  dishRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f1f3f4",
    gap: 12,
  },
  dishRowHighlighted: {
    backgroundColor: "#fef7f0",
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  dishLeftCol: {
    flex: 1,
  },
  vegSpicyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  dietIconBox: {
    width: 15,
    height: 15,
    borderRadius: 3,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  vegBox: {
    borderColor: "#1e8e3e",
  },
  nonVegBox: {
    borderColor: "#d93025",
  },
  vegDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#1e8e3e",
  },
  nonVegTriangle: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 7,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#d93025",
  },
  chilliWrap: {
    marginLeft: 2,
  },
  dishName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e1e24",
    lineHeight: 22,
    marginBottom: 4,
  },
  popularityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 6,
  },
  popBar: {
    width: 14,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#1e8e3e",
  },
  popularityText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#5f6368",
  },
  dishPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e1e24",
    marginBottom: 6,
  },
  dishDesc: {
    fontSize: 12.5,
    color: "#5f6368",
    lineHeight: 18,
    marginBottom: 10,
  },
  moreLessText: {
    color: "#1e1e24",
    fontWeight: "700",
  },
  dishActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dishActionCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#dadce0",
    alignItems: "center",
    justifyContent: "center",
  },

  /* RIGHT DISH COLUMN: Image & ADD Button */
  dishRightCol: {
    alignItems: "center",
    width: 140,
  },
  dishImageWrapper: {
    position: "relative",
    width: 140,
    height: 120,
    marginBottom: 10,
    alignItems: "center",
  },
  dishImageContainer: {
    width: 140,
    height: 120,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#f1f3f4",
  },
  dishImage: {
    width: "100%",
    height: "100%",
  },
  addBtnContainer: {
    position: "absolute",
    bottom: -13,
    alignSelf: "center",
    zIndex: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#fce8e6",
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 7,
    gap: 4,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#c84b31",
  },
  addBtnPlus: {
    fontSize: 14,
    fontWeight: "800",
    color: "#c84b31",
  },
  qtyControlPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#100a08",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 12,
  },
  qtyBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  qtyBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },
  qtyValue: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#ffffff",
  },
  customisableText: {
    fontSize: 10.5,
    color: "#80868b",
    marginTop: 8,
    fontWeight: "500",
  },

  /* FLOATING MENU BUTTON (Screenshot 2) */
  floatingMenuBtn: {
    position: "absolute",
    right: 18,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e24",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 24,
    gap: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 10,
  },
  floatingMenuText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
  },

  /* STICKY BOTTOM CART BAR (Screenshot 1 & 2) */
  stickyBottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
    overflow: "hidden",
  },
  goldBanner: {
    backgroundColor: "#f4f8fe",
    paddingVertical: 6,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e8f0fe",
  },
  goldBannerText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#1a73e8",
  },
  cartCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#c84b31",
    marginHorizontal: 14,
    marginVertical: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
  },
  cartCtaLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cartCountBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  cartCountBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#ffffff",
  },
  cartCtaLabel: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#ffffff",
    textTransform: "uppercase",
  },
  cartCtaRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cartCtaTotal: {
    fontSize: 15,
    fontWeight: "800",
    color: "#ffffff",
  },

  /* MODALS & SHEETS */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalBackdropCenter: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#dadce0",
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1e1e24",
    marginBottom: 14,
  },
  filterModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  filterResetText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#c84b31",
  },
  filterOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f1f3f4",
  },
  filterOptionRowSelected: {
    backgroundColor: "rgba(200, 75, 49, 0.04)",
  },
  filterOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  filterOptionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#202124",
  },
  filterOptionLabelSelected: {
    color: "#c84b31",
    fontWeight: "700",
  },
  radioCircleActive: {
    borderColor: "#c84b31",
  },
  offerItemCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e8eaed",
  },
  offerBadgeTag: {
    backgroundColor: "#e8f0fe",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  offerBadgeCode: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1a73e8",
  },
  offerDescription: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e1e24",
    marginBottom: 4,
  },
  offerTerms: {
    fontSize: 12,
    color: "#5f6368",
    marginBottom: 10,
  },
  applyCouponBtn: {
    backgroundColor: "#c84b31",
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  applyCouponText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 12,
  },
  sheetCloseBtn: {
    backgroundColor: "#f1f3f4",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },
  sheetCloseText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#3c4043",
  },
  dialogCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 22,
  },
  dialogTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1e1e24",
    marginBottom: 16,
  },
  scheduleRadioOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f1f3f4",
    gap: 12,
  },
  scheduleRadioOptionActive: {
    backgroundColor: "rgba(200, 75, 49, 0.04)",
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#dadce0",
    alignItems: "center",
    justifyContent: "center",
  },
  radioInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#c84b31",
  },
  scheduleOptionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e1e24",
  },
  scheduleOptionSub: {
    fontSize: 12,
    color: "#5f6368",
    marginTop: 2,
  },
  dialogConfirmBtn: {
    backgroundColor: "#c84b31",
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 18,
  },
  dialogConfirmText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  infoAddressText: {
    fontSize: 13,
    color: "#5f6368",
    marginBottom: 14,
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f1f3f4",
  },
  infoLabel: {
    fontSize: 13,
    color: "#5f6368",
  },
  infoVal: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1e1e24",
  },
  menuCatJumpRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f1f3f4",
  },
  menuCatJumpTitle: {
    fontSize: 14.5,
    fontWeight: "600",
    color: "#202124",
  },
  menuCatJumpCount: {
    fontSize: 13,
    fontWeight: "700",
    color: "#80868b",
  },
  customPriceText: {
    fontSize: 14,
    color: "#5f6368",
    marginBottom: 12,
  },
  customSection: {
    marginTop: 10,
    marginBottom: 14,
  },
  customSectionHeading: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e1e24",
    marginBottom: 8,
  },
  portionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    gap: 10,
  },
  portionName: {
    flex: 1,
    fontSize: 13.5,
    color: "#202124",
  },
  portionPrice: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#1e1e24",
  },
  checkBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#80868b",
    alignItems: "center",
    justifyContent: "center",
  },
  checkBoxActive: {
    backgroundColor: "#c84b31",
    borderColor: "#c84b31",
  },
  applyCustomizationBtn: {
    backgroundColor: "#c84b31",
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 12,
  },
  applyCustomizationText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },

  /* GROCERY & COURIER SERVICE STYLES */
  locationBarContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  coverWrapper: {
    height: 240,
    width: "100%",
    position: "relative",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  coverOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
  },
  coverHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  badgeChip: {
    position: "absolute",
    bottom: 14,
    left: 18,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  contentPad: {
    padding: 18,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "#c84b31",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1e1e24",
    letterSpacing: -0.5,
  },
  subTitle: {
    fontSize: 13,
    color: "#5f6368",
    marginTop: 4,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#5f6368",
  },
  sectionHeader: {
    marginTop: 22,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1e1e24",
  },
  menuList: {
    gap: 12,
  },
  menuCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e8eaed",
  },
  menuInfo: {
    flex: 1,
    paddingRight: 10,
  },
  menuActionCol: {
    alignItems: "flex-end",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#100a08",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 10,
  },
  stepperBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  stepperBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#ffffff",
  },
  stepperQty: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
  },
  addBtnGrocery: {
    backgroundColor: "#fef7f0",
    borderWidth: 1,
    borderColor: "#c84b31",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnGroceryText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#c84b31",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#f1f3f4",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
  },
});

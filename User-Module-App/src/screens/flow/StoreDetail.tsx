import React, { useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FlowHeader from "../../components/FlowHeader";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import {
  PACKAGE_TYPES,
  PRODUCTS,
  RESTAURANTS,
  serviceMeta,
  type MenuItem,
} from "../../data/demo";
import { rupees } from "../../lib/pricing";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { colors, radii } from "../../theme/tokens";

interface StoreDetailProps {
  service: "food" | "grocery" | "courier";
  storeId?: string;
}

export default function StoreDetail({ service, storeId }: StoreDetailProps) {
  const { push } = useNav();
  const {
    state,
    addToCart,
    changeQty,
    itemTotal,
    toggleFavorite,
    showToast,
    setPendingAction,
  } = useApp();

  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [selectedPortionId, setSelectedPortionId] = useState<string>("");
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);

  const total = itemTotal(service);

  /* -------------------------------------------------------------
   * FOOD SERVICE
   * ----------------------------------------------------------- */
  if (service === "food") {
    const restaurant =
      RESTAURANTS.find((r) => r.id === storeId) ?? RESTAURANTS[0];
    const cartLines = state.carts.food.lines;
    const isFav = state.favorites.includes(restaurant.id);

    const openCustomizer = (item: MenuItem) => {
      setCustomizingItem(item);
      setSelectedPortionId(item.portions?.[0]?.id ?? "");
      setSelectedAddonIds([]);
    };

    const handleApplyCustomization = () => {
      if (!customizingItem) return;
      const activePortion =
        customizingItem.portions?.find((p) => p.id === selectedPortionId) ??
        null;
      const basePrice = activePortion
        ? activePortion.price
        : customizingItem.price;
      const selectedAddons = (customizingItem.addons ?? []).filter((a) =>
        selectedAddonIds.includes(a.id)
      );
      const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
      const finalPrice = basePrice + addonsTotal;

      const portionPart = activePortion ? activePortion.name : "1 portion";
      const addonsPart =
        selectedAddons.length > 0
          ? selectedAddons.map((a) => a.name).join(", ")
          : "";
      const subtitle = addonsPart
        ? `${portionPart} · ${addonsPart}`
        : portionPart;

      const variantId = `${customizingItem.id}${
        selectedPortionId ? `-${selectedPortionId}` : ""
      }${
        selectedAddonIds.length > 0
          ? `-${selectedAddonIds.sort().join("-")}`
          : ""
      }`;

      if (!state.authenticated && !state.isGuest) {
        setPendingAction({
          type: "cart",
          service: "food",
          line: {
            id: variantId,
            name: customizingItem.name,
            subtitle,
            price: finalPrice,
          },
          storeId: restaurant.id,
        });
        setCustomizingItem(null);
        showToast("Please sign in to add items to your cart");
        push({ name: "phone" });
        return;
      }

      addToCart(
        "food",
        {
          id: variantId,
          name: customizingItem.name,
          subtitle,
          price: finalPrice,
        },
        restaurant.id
      );
      setCustomizingItem(null);
    };

    const handleAdd = (item: MenuItem) => {
      if (
        (item.portions && item.portions.length > 0) ||
        (item.addons && item.addons.length > 0)
      ) {
        openCustomizer(item);
        return;
      }

      if (!state.authenticated && !state.isGuest) {
        setPendingAction({
          type: "cart",
          service: "food",
          line: {
            id: item.id,
            name: item.name,
            subtitle: "1 portion · Fragrant & freshly cooked",
            price: item.price,
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
          id: item.id,
          name: item.name,
          subtitle: "1 portion · Fragrant & freshly cooked",
          price: item.price,
        },
        restaurant.id
      );
    };

    const handleToggleFav = (targetId: string, title?: string) => {
      if (!state.authenticated) {
        setPendingAction({
          type: "wishlist",
          itemId: targetId,
          itemTitle: title,
        });
        showToast("Please sign in to save items to your favorites");
        push({ name: "phone" });
        return;
      }
      const isTargetFav = state.favorites.includes(targetId);
      toggleFavorite(targetId);
      showToast(
        isTargetFav
          ? `Removed ${title || "item"} from favorites`
          : `Added ${title || "item"} to favorites`
      );
    };

    const handleContinue = () => {
      if (cartLines.length === 0) {
        const defaultItem = restaurant.menu[0];
        if (defaultItem.portions && defaultItem.portions.length > 0) {
          const portion = defaultItem.portions[0];
          addToCart(
            "food",
            {
              id: `${defaultItem.id}-${portion.id}`,
              name: defaultItem.name,
              subtitle: portion.name,
              price: portion.price,
            },
            restaurant.id
          );
        } else {
          handleAdd(defaultItem);
        }
      }
      push({ name: "cart", service: "food" });
    };

    const displayPrice =
      total > 0
        ? rupees(total)
        : restaurant.menu[0].portions?.[0]
        ? rupees(restaurant.menu[0].portions[0].price)
        : rupees(restaurant.menu[0].price);

    const activePortion =
      customizingItem?.portions?.find((p) => p.id === selectedPortionId) ??
      null;
    const baseCustomPrice = activePortion
      ? activePortion.price
      : customizingItem?.price ?? 0;
    const customAddonsTotal = (customizingItem?.addons ?? [])
      .filter((a) => selectedAddonIds.includes(a.id))
      .reduce((sum, a) => sum + a.price, 0);
    const customizedTotal = baseCustomPrice + customAddonsTotal;

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Cover Header Image */}
          <View style={styles.coverWrapper}>
            <Image
              source={{ uri: restaurant.photo }}
              style={styles.coverImage}
              resizeMode="cover"
            />
            <View style={styles.coverOverlay} />

            <SafeAreaView style={styles.coverHeader} edges={["top"]}>
              <FlowHeader title="" />
            </SafeAreaView>

            {/* Favorite button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleToggleFav(restaurant.id, restaurant.name)}
              style={styles.favButton}
            >
              <Icon
                name="heart"
                size={18}
                filled={isFav}
                color={isFav ? "#ff4d2e" : "#ffffff"}
              />
            </TouchableOpacity>

            <View style={styles.badgeChip}>
              <Text style={styles.badgeText}>{serviceMeta.food.label}</Text>
            </View>
          </View>

          {/* Restaurant Details */}
          <View style={styles.contentPad}>
            <Text style={styles.eyebrow}>{serviceMeta.food.kicker}</Text>
            <Text style={styles.title}>{restaurant.name}</Text>
            <Text style={styles.subTitle}>
              {restaurant.cuisines.join(" · ")} · {restaurant.eta}
            </Text>

            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Icon name="star" size={14} filled color="#f59e0b" />
                <Text style={styles.statText}>
                  {" "}
                  {restaurant.detailRating} rating
                </Text>
              </View>
              <View style={styles.statItem}>
                <Icon name="clock" size={14} color={colors.muted} />
                <Text style={styles.statText}> Fast delivery</Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recommended for you</Text>
            </View>

            {/* Menu Items List */}
            <View style={styles.menuList}>
              {restaurant.menu.map((item) => {
                const matchingLines = cartLines.filter(
                  (l) => l.id === item.id || l.id.startsWith(item.id + "-")
                );
                const totalQty = matchingLines.reduce(
                  (sum, l) => sum + l.qty,
                  0
                );
                const hasCustomizations =
                  (item.portions && item.portions.length > 0) ||
                  (item.addons && item.addons.length > 0);
                const isDishFav = state.favorites.includes(item.id);

                return (
                  <View key={item.id} style={styles.menuCard}>
                    <View style={styles.menuInfo}>
                      <View style={styles.menuTitleRow}>
                        <Text style={styles.dishName}>{item.name}</Text>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() =>
                            handleToggleFav(item.id, item.name)
                          }
                          style={styles.dishFavBtn}
                        >
                          <Icon
                            name="heart"
                            size={14}
                            filled={isDishFav}
                            color={isDishFav ? "#ff4d2e" : "#c5bdb6"}
                          />
                        </TouchableOpacity>

                        {item.portions && item.portions.length > 0 && (
                          <View style={styles.portionPill}>
                            <Text style={styles.portionPillText}>
                              Half & Full
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.dishDesc} numberOfLines={2}>
                        {item.description}
                      </Text>

                      <View style={styles.dishPriceRow}>
                        <Text style={styles.dishPrice}>
                          {item.portions && item.portions.length > 0
                            ? `From ${rupees(item.portions[0].price)}`
                            : rupees(item.price)}
                        </Text>
                        {item.portions && item.portions.length > 0 && (
                          <Text style={styles.portionHint}>
                            (
                            {item.portions
                              .map(
                                (p) =>
                                  `${p.name.split(" ")[0]} ${rupees(p.price)}`
                              )
                              .join(" · ")}
                            )
                          </Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.menuActionCol}>
                      {totalQty > 0 ? (
                        <View style={styles.stepper}>
                          <TouchableOpacity
                            onPress={() => {
                              const targetLine =
                                matchingLines[matchingLines.length - 1];
                              if (targetLine) {
                                changeQty("food", targetLine.id, -1);
                              }
                            }}
                            style={styles.stepperBtn}
                          >
                            <Text style={styles.stepperBtnText}>−</Text>
                          </TouchableOpacity>
                          <Text style={styles.stepperQty}>{totalQty}</Text>
                          <TouchableOpacity
                            onPress={() => {
                              if (hasCustomizations) {
                                openCustomizer(item);
                              } else {
                                changeQty("food", item.id, 1);
                              }
                            }}
                            style={styles.stepperBtn}
                          >
                            <Text style={styles.stepperBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => {
                            if (hasCustomizations) {
                              openCustomizer(item);
                            } else {
                              handleAdd(item);
                            }
                          }}
                          style={styles.addBtn}
                        >
                          <Text style={styles.addBtnText}>Add +</Text>
                        </TouchableOpacity>
                      )}

                      {hasCustomizations && (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => openCustomizer(item)}
                          style={styles.customiseBadge}
                        >
                          <Text style={styles.customiseText}>Customise</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* Customization Modal */}
        <Modal
          visible={!!customizingItem}
          transparent
          animationType="slide"
          onRequestClose={() => setCustomizingItem(null)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setCustomizingItem(null)}
          >
            <Pressable
              style={styles.modalSheet}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.sheetDragBar} />
              <View style={styles.sheetHeader}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.sheetTitle}>{customizingItem?.name}</Text>
                  <Text style={styles.sheetSubtitle}>
                    {customizingItem?.description}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setCustomizingItem(null)}
                  style={styles.sheetCloseBtn}
                >
                  <Text style={styles.sheetCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.sheetScroll}
                showsVerticalScrollIndicator={false}
              >
                {/* Portions */}
                {customizingItem?.portions &&
                  customizingItem.portions.length > 0 && (
                    <View style={styles.sheetSection}>
                      <View style={styles.sheetSectionTitleRow}>
                        <Text style={styles.sheetSectionHeading}>
                          Select Portion Size
                        </Text>
                        <View style={styles.requiredPill}>
                          <Text style={styles.requiredText}>Required</Text>
                        </View>
                      </View>

                      {customizingItem.portions.map((portion) => {
                        const isSelected = selectedPortionId === portion.id;
                        return (
                          <TouchableOpacity
                            key={portion.id}
                            activeOpacity={0.8}
                            onPress={() => setSelectedPortionId(portion.id)}
                            style={[
                              styles.sheetOptionCard,
                              isSelected && styles.sheetOptionCardSelected,
                            ]}
                          >
                            <View style={styles.optionLeft}>
                              <View style={styles.radioCircle}>
                                {isSelected && (
                                  <View style={styles.radioSelectedDot} />
                                )}
                              </View>
                              <Text style={styles.optionName}>
                                {portion.name}
                              </Text>
                            </View>
                            <Text style={styles.optionPrice}>
                              {rupees(portion.price)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                {/* Addons */}
                {customizingItem?.addons &&
                  customizingItem.addons.length > 0 && (
                    <View style={styles.sheetSection}>
                      <View style={styles.sheetSectionTitleRow}>
                        <Text style={styles.sheetSectionHeading}>
                          Extra Add-ons & Additionals
                        </Text>
                        <View style={styles.optionalPill}>
                          <Text style={styles.optionalText}>Optional</Text>
                        </View>
                      </View>

                      {customizingItem.addons.map((addon) => {
                        const isSelected = selectedAddonIds.includes(addon.id);
                        return (
                          <TouchableOpacity
                            key={addon.id}
                            activeOpacity={0.8}
                            onPress={() => {
                              setSelectedAddonIds((prev) =>
                                isSelected
                                  ? prev.filter((id) => id !== addon.id)
                                  : [...prev, addon.id]
                              );
                            }}
                            style={[
                              styles.sheetOptionCard,
                              isSelected && styles.sheetOptionCardSelected,
                            ]}
                          >
                            <View style={styles.optionLeft}>
                              <View
                                style={[
                                  styles.checkboxBox,
                                  isSelected && styles.checkboxBoxSelected,
                                ]}
                              >
                                {isSelected && (
                                  <Text style={styles.checkboxCheck}>✓</Text>
                                )}
                              </View>
                              <Text style={styles.optionName}>{addon.name}</Text>
                            </View>
                            <Text style={styles.optionPrice}>
                              +{rupees(addon.price)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
              </ScrollView>

              <View style={styles.sheetFooter}>
                <View>
                  <Text style={styles.sheetFooterSmall}>Total Price</Text>
                  <Text style={styles.sheetFooterPrice}>
                    {rupees(customizedTotal)}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleApplyCustomization}
                  style={styles.sheetSubmitBtn}
                >
                  <Text style={styles.sheetSubmitBtnText}>
                    Add to Cart · {rupees(customizedTotal)}
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Sticky Bottom Bar */}
        <SafeAreaView style={styles.bottomBar} edges={["bottom"]}>
          <Button onPress={handleContinue}>Add to cart · {displayPrice}</Button>
        </SafeAreaView>
      </View>
    );
  }

  /* -------------------------------------------------------------
   * GROCERY SERVICE
   * ----------------------------------------------------------- */
  if (service === "grocery") {
    const cartLines = state.carts.grocery.lines;

    const handleAdd = (p: (typeof PRODUCTS)[0]) => {
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

    const handleContinue = () => {
      if (cartLines.length === 0) {
        handleAdd(PRODUCTS[0]);
        handleAdd(PRODUCTS[1]);
      }
      push({ name: "cart", service: "grocery" });
    };

    const displayPrice = total > 0 ? rupees(total) : "₹328";

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
              {PRODUCTS.map((p) => {
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
                          onPress={() => handleAdd(p)}
                          style={styles.addBtn}
                        >
                          <Text style={styles.addBtnText}>Add +</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <SafeAreaView style={styles.bottomBar} edges={["bottom"]}>
          <Button onPress={handleContinue}>
            View basket · {displayPrice}
          </Button>
        </SafeAreaView>
      </View>
    );
  }

  /* -------------------------------------------------------------
   * COURIER SERVICE
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
              style={styles.addBtn}
            >
              <Text style={styles.addBtnText}>Select</Text>
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
    backgroundColor: colors.canvas,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 90,
  },
  coverWrapper: {
    height: 275,
    width: "100%",
    position: "relative",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  coverOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  coverHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  favButton: {
    position: "absolute",
    top: 50,
    right: 18,
    zIndex: 15,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeChip: {
    position: "absolute",
    bottom: 20,
    left: 18,
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    zIndex: 2,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  contentPad: {
    paddingHorizontal: 18,
    paddingTop: 22,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.accent,
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 25,
    fontWeight: "800",
    color: colors.ink,
    marginTop: 4,
    marginBottom: 6,
    lineHeight: 30,
  },
  subTitle: {
    fontSize: 11,
    color: colors.muted,
  },
  statRow: {
    flexDirection: "row",
    gap: 18,
    marginTop: 15,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#ebe7e2",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statText: {
    fontSize: 10,
    color: colors.ink,
    fontWeight: "600",
  },
  sectionHeader: {
    marginTop: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  menuList: {
    gap: 12,
  },
  menuCard: {
    backgroundColor: "#ffffff",
    borderRadius: 17,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ebe7e2",
    shadowColor: "#241c14",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  menuInfo: {
    flex: 1,
    paddingRight: 10,
  },
  menuTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  dishName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  dishFavBtn: {
    padding: 2,
  },
  portionPill: {
    backgroundColor: "rgba(200, 75, 49, 0.12)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  portionPillText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.accent,
  },
  dishDesc: {
    fontSize: 10,
    color: colors.muted,
    lineHeight: 14,
    marginBottom: 8,
  },
  dishPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    flexWrap: "wrap",
  },
  dishPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  portionHint: {
    fontSize: 9,
    color: colors.muted,
    marginLeft: 6,
  },
  menuActionCol: {
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  addBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.accent,
  },
  customiseBadge: {
    marginTop: 4,
  },
  customiseText: {
    fontSize: 8,
    color: colors.muted,
    fontWeight: "600",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 8,
  },
  stepperBtn: {
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  stepperBtnText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "800",
  },
  stepperQty: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: "700",
    minWidth: 16,
    textAlign: "center",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#ebe7e2",
  },
  // Modal Sheet Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingTop: 10,
  },
  sheetDragBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#d1d5db",
    alignSelf: "center",
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
  },
  sheetSubtitle: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  sheetCloseBtn: {
    padding: 6,
  },
  sheetCloseText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.muted,
  },
  sheetScroll: {
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  sheetSection: {
    marginBottom: 16,
  },
  sheetSectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sheetSectionHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  requiredPill: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requiredText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#dc2626",
  },
  optionalPill: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  optionalText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.muted,
  },
  sheetOptionCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 8,
    backgroundColor: "#ffffff",
  },
  sheetOptionCardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelectedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxBoxSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  checkboxCheck: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },
  optionName: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.ink,
  },
  optionPrice: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
  },
  sheetFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: "#ffffff",
  },
  sheetFooterSmall: {
    fontSize: 9,
    color: colors.muted,
    fontWeight: "600",
  },
  sheetFooterPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink,
  },
  sheetSubmitBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radii.md,
  },
  sheetSubmitBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
});

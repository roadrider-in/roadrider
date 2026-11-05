import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "./Icon";
import { PROMOS, type PromoRule, validatePromo } from "../lib/pricing";
import { fetchActiveOffersForStore } from "../lib/supabaseData";
import type { Service } from "../data/demo";
import { colors } from "../theme/tokens";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface CouponBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  service: Service;
  storeId?: string | null;
  cartTotal: number;
  appliedPromo: string | null;
  usedPromos: string[];
  onApply: (code: string) => void;
  onRemove: () => void;
}

export default function CouponBottomSheet({
  visible,
  onClose,
  service,
  storeId,
  cartTotal,
  appliedPromo,
  usedPromos,
  onApply,
  onRemove,
}: CouponBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const [manualCode, setManualCode] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [couponsList, setCouponsList] = useState<PromoRule[]>(PROMOS);
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  // Fetch real coupons & offers from backend on open
  useEffect(() => {
    if (!visible) return;
    setManualCode("");
    setManualError(null);
    let isMounted = true;

    async function loadOffers() {
      setLoadingCoupons(true);
      try {
        if (storeId) {
          const storeOffers = await fetchActiveOffersForStore(storeId);
          if (isMounted && storeOffers && storeOffers.length > 0) {
            const mappedStorePromos: PromoRule[] = storeOffers.map((o) => ({
              code: o.code.toUpperCase(),
              title: o.formattedHeadline,
              description: o.description,
              discountType: o.discountType,
              discountValue: o.discountValue,
              minOrderAmount: o.minOrderAmount || 0,
              maxDiscountAmount: o.maxDiscountAmount,
              services: [service],
              oneTime: false,
            }));

            // Merge unique with platform promos
            const existingCodes = new Set(mappedStorePromos.map((p) => p.code));
            const merged = [
              ...mappedStorePromos,
              ...PROMOS.filter((p) => !existingCodes.has(p.code) && p.services.includes(service)),
            ];
            setCouponsList(merged);
            setLoadingCoupons(false);
            return;
          }
        }

        // Platform-wide fallback
        const platformPromos = PROMOS.filter((p) => p.services.includes(service));
        if (isMounted) {
          setCouponsList(platformPromos);
        }
      } catch (err) {
        if (isMounted) {
          setCouponsList(PROMOS.filter((p) => p.services.includes(service)));
        }
      } finally {
        if (isMounted) setLoadingCoupons(false);
      }
    }

    loadOffers();
    return () => {
      isMounted = false;
    };
  }, [visible, storeId, service]);

  const handleApplySingle = (code: string) => {
    const res = validatePromo(code, service, usedPromos, cartTotal);
    if (!res.ok) {
      setManualError(res.error);
      return;
    }
    setManualError(null);
    onApply(res.code);
    onClose();
  };

  const handleManualApply = () => {
    const clean = manualCode.trim().toUpperCase();
    if (!clean) {
      setManualError("Please enter a coupon code.");
      return;
    }
    handleApplySingle(clean);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.sheetContainer,
            { paddingBottom: Math.max(insets.bottom, 24) },
          ]}
        >
          {/* Drag Handle Indicator */}
          <View style={styles.dragHandleWrap}>
            <View style={styles.dragHandle} />
          </View>

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle}>Available Coupons</Text>
              <Text style={styles.headerSub}>
                Tap any eligible offer to apply discount instantly
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close coupons"
              hitSlop={12}
            >
              <Icon name="close" size={16} color="#78716c" />
            </TouchableOpacity>
          </View>

          {/* Manual Coupon Input Box */}
          <View style={styles.manualInputWrap}>
            <View style={styles.manualInputRow}>
              <TextInput
                placeholder="Enter coupon code manually"
                placeholderTextColor="#9ca3af"
                value={manualCode}
                onChangeText={(text) => {
                  setManualCode(text.toUpperCase());
                  if (manualError) setManualError(null);
                }}
                autoCapitalize="characters"
                style={styles.manualTextInput}
                returnKeyType="done"
                onSubmitEditing={handleManualApply}
              />
              <TouchableOpacity
                onPress={handleManualApply}
                style={[
                  styles.manualApplyBtn,
                  !manualCode.trim() && styles.manualApplyBtnDisabled,
                ]}
                disabled={!manualCode.trim()}
              >
                <Text style={styles.manualApplyBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>

            {Boolean(manualError) && (
              <View style={styles.errorRow}>
                <Icon name="info" size={13} color="#dc2626" />
                <Text style={styles.errorText}>{manualError}</Text>
              </View>
            )}
          </View>

          {/* Available Coupons Scroll */}
          {loadingCoupons ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#c84b31" />
              <Text style={styles.loadingText}>Fetching available coupons…</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.couponsScroll}
              contentContainerStyle={styles.couponsScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {couponsList.map((coupon) => {
                const isCurrentlyApplied = appliedPromo === coupon.code;
                const isOneTimeUsed = coupon.oneTime && usedPromos.includes(coupon.code);
                const minAmt = coupon.minOrderAmount || 0;
                const isMinMet = cartTotal >= minAmt;
                const shortfall = minAmt - cartTotal;
                const isEligible = isMinMet && !isOneTimeUsed;

                return (
                  <View
                    key={coupon.code}
                    style={[
                      styles.couponCard,
                      isCurrentlyApplied && styles.couponCardApplied,
                      !isEligible && styles.couponCardIneligible,
                    ]}
                  >
                    {/* Top Row: Coupon Code & Action */}
                    <View style={styles.couponTopRow}>
                      <View style={styles.codeBadge}>
                        <Icon name="badge-percent" size={15} color="#c84b31" />
                        <Text style={styles.codeText}>{coupon.code}</Text>
                      </View>

                      {isCurrentlyApplied ? (
                        <View style={styles.appliedStateRow}>
                          <View style={styles.appliedPill}>
                            <Icon name="check" size={12} color="#16a34a" />
                            <Text style={styles.appliedPillText}>APPLIED</Text>
                          </View>
                          <TouchableOpacity
                            onPress={onRemove}
                            style={styles.removeBtn}
                            hitSlop={8}
                          >
                            <Text style={styles.removeBtnText}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      ) : isEligible ? (
                        <TouchableOpacity
                          onPress={() => handleApplySingle(coupon.code)}
                          style={styles.applyBtn}
                          activeOpacity={0.8}
                          accessibilityRole="button"
                          accessibilityLabel={`Apply coupon ${coupon.code}`}
                        >
                          <Text style={styles.applyBtnText}>APPLY</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.ineligiblePill}>
                          <Text style={styles.ineligibleText}>
                            {isOneTimeUsed
                              ? "ALREADY USED"
                              : `Add ₹${shortfall} more`}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Offer Headline & Description */}
                    <Text style={styles.offerTitle}>{coupon.title}</Text>
                    <Text style={styles.offerDesc}>{coupon.description}</Text>

                    {/* Divider */}
                    <View style={styles.cardDivider} />

                    {/* Conditions Footer */}
                    <View style={styles.couponFooterRow}>
                      <Text style={styles.conditionText}>
                        {minAmt > 0 ? `Min. order ₹${minAmt}` : "No min. order required"}
                        {coupon.maxDiscountAmount ? ` · Max savings ₹${coupon.maxDiscountAmount}` : ""}
                      </Text>
                      {isEligible && (
                        <Text style={styles.eligibleTag}>✓ Applicable</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(23, 21, 20, 0.55)",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    backgroundColor: "#faf7f2",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: SCREEN_HEIGHT * 0.82,
    shadowColor: "#000000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: -6 },
    shadowRadius: 18,
    elevation: 8,
  },
  dragHandleWrap: {
    alignItems: "center",
    paddingVertical: 10,
  },
  dragHandle: {
    width: 44,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: "#d6cec5",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee8de",
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#171514",
    letterSpacing: -0.4,
  },
  headerSub: {
    fontSize: 12,
    color: "#78716c",
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#eee7de",
    alignItems: "center",
    justifyContent: "center",
  },
  manualInputWrap: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee8de",
  },
  manualInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  manualTextInput: {
    flex: 1,
    height: 44,
    borderWidth: 1.5,
    borderColor: "#e5ded6",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 13.5,
    fontWeight: "700",
    color: "#171514",
    backgroundColor: "#faf7f2",
    letterSpacing: 0.5,
  },
  manualApplyBtn: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#c84b31",
    alignItems: "center",
    justifyContent: "center",
  },
  manualApplyBtnDisabled: {
    backgroundColor: "#d1c7bc",
  },
  manualApplyBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: "#dc2626",
    fontWeight: "600",
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: "#78716c",
    fontWeight: "600",
  },
  couponsScroll: {
    paddingHorizontal: 20,
  },
  couponsScrollContent: {
    paddingTop: 14,
    paddingBottom: 24,
    gap: 12,
  },
  couponCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#ede5da",
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  couponCardApplied: {
    borderColor: "#16a34a",
    backgroundColor: "#f7fdf9",
  },
  couponCardIneligible: {
    opacity: 0.82,
    backgroundColor: "#faf7f2",
  },
  couponTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  codeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fcebe6",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f5c5ba",
    borderStyle: "dashed",
  },
  codeText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#c84b31",
    letterSpacing: 0.8,
  },
  applyBtn: {
    backgroundColor: "#c84b31",
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: "#c84b31",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  applyBtnText: {
    color: "#ffffff",
    fontSize: 11.5,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  appliedStateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  appliedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#dcfce7",
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
  },
  appliedPillText: {
    fontSize: 10.5,
    fontWeight: "900",
    color: "#15803d",
    letterSpacing: 0.5,
  },
  removeBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  removeBtnText: {
    fontSize: 11.5,
    color: "#dc2626",
    fontWeight: "700",
  },
  ineligiblePill: {
    backgroundColor: "#f1ebe4",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  ineligibleText: {
    fontSize: 10.5,
    color: "#78716c",
    fontWeight: "700",
  },
  offerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#171514",
    marginBottom: 4,
  },
  offerDesc: {
    fontSize: 12,
    color: "#6e6762",
    lineHeight: 16,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#f2ece4",
    marginVertical: 10,
  },
  couponFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  conditionText: {
    fontSize: 11,
    color: "#8c827a",
  },
  eligibleTag: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16a34a",
  },
});

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FlowHeader from "../../components/FlowHeader";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { colors, radii } from "../../theme/tokens";
import {
  createSupportTicket,
  TicketCategory,
  CATEGORY_LABELS,
} from "../../lib/supportService";
import { fetchOrdersFromBackend } from "../../lib/orderService";

interface ReportIssueProps {
  orderId?: string;
  prefillMessage?: string;
}

const ISSUE_CATEGORIES: { key: TicketCategory; label: string; desc: string }[] = [
  {
    key: "missing_items",
    label: "Missing Items",
    desc: "One or more items were missing from your order",
  },
  {
    key: "damaged_items",
    label: "Damaged / Poor Quality",
    desc: "Spilled food, broken seal, or stale items",
  },
  {
    key: "delivery_issue",
    label: "Delivery Problem",
    desc: "Late delivery, wrong drop location, or driver issue",
  },
  {
    key: "wrong_order",
    label: "Incorrect Order",
    desc: "Received someone else's order or wrong items",
  },
  {
    key: "payment_issue",
    label: "Payment & Charges",
    desc: "Charged twice, incorrect total, or missing discount",
  },
  {
    key: "other",
    label: "Other Order Inquiries",
    desc: "General issue or special cancellation request",
  },
];

export default function ReportIssue({
  orderId,
  prefillMessage,
}: ReportIssueProps) {
  const { back, push, replace } = useNav();
  const { state, showToast } = useApp();

  const [orders, setOrders] = useState<any[]>(state.orders || []);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(
    orderId || (state.orders?.[0]?.id ? String(state.orders[0].id) : null)
  );
  const [selectedCategory, setSelectedCategory] =
    useState<TicketCategory>("missing_items");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState(prefillMessage || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Fetch genuine backend orders for current user on mount
  useEffect(() => {
    let isMounted = true;
    async function loadOrders() {
      const userPhone = state.profile.phone;
      const userId = state.profile.id;
      if (!userPhone && !userId) return;

      setIsLoadingOrders(true);
      try {
        const liveOrders = await fetchOrdersFromBackend(userPhone, userId);
        if (isMounted && liveOrders && liveOrders.length > 0) {
          setOrders(liveOrders);
          if (!selectedOrderId) {
            setSelectedOrderId(String(liveOrders[0].id));
          }
        }
      } catch (err) {
        console.warn("[ReportIssue] Failed to load orders:", err);
      } finally {
        if (isMounted) setIsLoadingOrders(false);
      }
    }
    loadOrders();
    return () => {
      isMounted = false;
    };
  }, [state.profile.phone, state.profile.id]);

  const selectedOrder = orders.find(
    (o) => String(o.id) === String(selectedOrderId)
  );

  const handleSubmit = async () => {
    const cleanDesc = description.trim();
    if (!cleanDesc) {
      Alert.alert(
        "Description Required",
        "Please provide details about what went wrong with your order."
      );
      return;
    }

    const finalSubject =
      subject.trim() ||
      `${CATEGORY_LABELS[selectedCategory]} - Order #${
        selectedOrder?.id?.slice(0, 8) || "Support"
      }`;

    setIsSubmitting(true);
    try {
      const targetDbOrderId = selectedOrder?.dbId || selectedOrderId || null;
      const res = await createSupportTicket({
        customerId: state.profile.id || null,
        customerPhone: state.profile.phone || null,
        customerName: state.profile.name || "RoadRider Customer",
        orderId: targetDbOrderId,
        orderNumber: selectedOrder?.id ? String(selectedOrder.id) : undefined,
        category: selectedCategory,
        subject: finalSubject,
        description: cleanDesc,
        priority: "medium",
      });

      if (!res.ok || !res.ticket) {
        Alert.alert(
          "Submission Failed",
          res.error ||
            "Unable to file support ticket. Please check your network and try again."
        );
        setIsSubmitting(false);
        return;
      }

      showToast(`Support Ticket #${res.ticket.ticketNumber} submitted!`);
      // Navigate to the newly created ticket detail
      replace({
        name: "ticketDetail",
        ticketId: res.ticket.id,
      });
    } catch (err: any) {
      Alert.alert(
        "Network Error",
        err?.message || "Failed to submit support ticket. Please retry."
      );
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />
      <FlowHeader title="Report an Order Issue" onBack={back} showHelp={false} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Section: Select Order */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>1. Select Order</Text>
              {isLoadingOrders && (
                <ActivityIndicator size="small" color={colors.accent} />
              )}
            </View>

            {orders.length === 0 ? (
              <View style={styles.emptyOrderBox}>
                <Text style={styles.emptyOrderText}>
                  No previous orders found for your account. You can still file
                  a general inquiry below.
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.ordersCarousel}
              >
                {orders.map((ord) => {
                  const isSelected = String(ord.id) === String(selectedOrderId);
                  const title =
                    ord.title ||
                    ord.store?.name ||
                    ord.pickup ||
                    `Order #${String(ord.id).slice(0, 8)}`;
                  const total = ord.bill?.toPay
                    ? `₹${ord.bill.toPay}`
                    : ord.total
                    ? `₹${ord.total}`
                    : "";
                  const statusLabel =
                    ord.status === 3
                      ? "Delivered"
                      : ord.status === 2
                      ? "On the way"
                      : ord.status === 1
                      ? "In progress"
                      : "Active";

                  return (
                    <TouchableOpacity
                      key={String(ord.id)}
                      activeOpacity={0.8}
                      onPress={() => setSelectedOrderId(String(ord.id))}
                      style={[
                        styles.orderCard,
                        isSelected && styles.orderCardSelected,
                      ]}
                    >
                      <View style={styles.orderCardTop}>
                        <Text
                          style={[
                            styles.orderCardNumber,
                            isSelected && styles.orderCardNumberSelected,
                          ]}
                          numberOfLines={1}
                        >
                          #{String(ord.id).slice(0, 8).toUpperCase()}
                        </Text>
                        {isSelected && (
                          <View style={styles.selectedBadge}>
                            <Icon name="check" size={12} color="#ffffff" />
                          </View>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.orderCardTitle,
                          isSelected && styles.orderCardTitleSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {title}
                      </Text>
                      <View style={styles.orderCardMeta}>
                        <Text style={styles.orderCardTotal}>{total}</Text>
                        <Text style={styles.orderCardStatus}>{statusLabel}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Section: Issue Category */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. What went wrong?</Text>
            <View style={styles.categoryGrid}>
              {ISSUE_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.key;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    activeOpacity={0.8}
                    onPress={() => setSelectedCategory(cat.key)}
                    style={[
                      styles.categoryCard,
                      isSelected && styles.categoryCardSelected,
                    ]}
                  >
                    <View style={styles.categoryHeaderRow}>
                      <Text
                        style={[
                          styles.categoryLabel,
                          isSelected && styles.categoryLabelSelected,
                        ]}
                      >
                        {cat.label}
                      </Text>
                      {isSelected && (
                        <Icon name="check" size={14} color={colors.accent} />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.categoryDesc,
                        isSelected && styles.categoryDescSelected,
                      ]}
                    >
                      {cat.desc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Section: Issue Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Describe the issue</Text>

            <Text style={styles.inputLabel}>Subject (Optional)</Text>
            <TextInput
              placeholder="e.g. Cold food or missing burger"
              placeholderTextColor={colors.muted}
              value={subject}
              onChangeText={setSubject}
              style={styles.subjectInput}
            />

            <Text style={styles.inputLabel}>Detailed Description *</Text>
            <TextInput
              placeholder="Please explain in detail what happened so our support team can resolve it quickly..."
              placeholderTextColor={colors.muted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={styles.descriptionInput}
            />
            <Text style={styles.charCount}>
              {description.length} characters entered
            </Text>
          </View>

          {/* Section: Review Summary */}
          <View style={styles.reviewBox}>
            <Text style={styles.reviewHeading}>Review Summary</Text>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Category</Text>
              <Text style={styles.reviewValue}>
                {CATEGORY_LABELS[selectedCategory]}
              </Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Linked Order</Text>
              <Text style={styles.reviewValue}>
                {selectedOrder
                  ? `#${String(selectedOrder.id).slice(0, 8).toUpperCase()}`
                  : "None specified"}
              </Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Requester Phone</Text>
              <Text style={styles.reviewValue}>
                {state.profile.phone
                  ? `+91 ${state.profile.phone.slice(-10)}`
                  : "Authenticated account"}
              </Text>
            </View>
          </View>

          {/* Submit Action */}
          <View style={styles.actionPad}>
            <Button
              onPress={handleSubmit}
              disabled={isSubmitting || !description.trim()}
            >
              {isSubmitting ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.loadingText}>Submitting Ticket...</Text>
                </View>
              ) : (
                "Submit Support Ticket"
              )}
            </Button>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => push({ name: "supportTickets" })}
              style={styles.viewTicketsLink}
            >
              <Text style={styles.viewTicketsText}>
                View My Existing Tickets →
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 10,
  },
  emptyOrderBox: {
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyOrderText: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
  },
  ordersCarousel: {
    gap: 12,
    paddingVertical: 2,
  },
  orderCard: {
    width: 170,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  orderCardSelected: {
    borderColor: colors.accent,
    backgroundColor: "#fff8f6",
  },
  orderCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  orderCardNumber: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.muted,
  },
  orderCardNumberSelected: {
    color: colors.accent,
  },
  selectedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  orderCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 6,
  },
  orderCardTitleSelected: {
    color: colors.accent,
  },
  orderCardMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderCardTotal: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
  },
  orderCardStatus: {
    fontSize: 10,
    color: colors.muted,
    textTransform: "capitalize",
  },
  categoryGrid: {
    gap: 10,
  },
  categoryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  categoryCardSelected: {
    borderColor: colors.accent,
    backgroundColor: "#fffaf8",
  },
  categoryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  categoryLabelSelected: {
    color: colors.accent,
  },
  categoryDesc: {
    fontSize: 11,
    color: colors.muted,
    lineHeight: 16,
  },
  categoryDescSelected: {
    color: "#5e4b47",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink,
    marginBottom: 6,
    marginTop: 8,
  },
  subjectInput: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 13,
    color: colors.ink,
  },
  descriptionInput: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 14,
    height: 110,
    fontSize: 13,
    color: colors.ink,
  },
  charCount: {
    fontSize: 10,
    color: colors.muted,
    textAlign: "right",
    marginTop: 4,
  },
  reviewBox: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 24,
  },
  reviewHeading: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.line,
  },
  reviewLabel: {
    fontSize: 12,
    color: colors.muted,
  },
  reviewValue: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink,
  },
  actionPad: {
    gap: 14,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  viewTicketsLink: {
    alignItems: "center",
    paddingVertical: 10,
  },
  viewTicketsText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.accent,
  },
});

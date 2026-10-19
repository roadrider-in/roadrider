import React, { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native"
import { colors } from "../../theme/colors"
import { typography } from "../../theme/typography"
import { radius } from "../../theme/radius"
import { AppHeader } from "../../components/common/AppHeader"
import { AppButton } from "../../components/common/AppButton"
import { AppCard } from "../../components/common/AppCard"
import { AppIcon } from "../../components/common/AppIcon"
import { StatusBadge } from "../../components/common/StatusBadge"
import { useResponsive } from "../../theme/useResponsive"
import { useAppNavigation } from "../../navigation/NavigationContext"
import { useOrders } from "../../context/OrderContext"

export const IncomingOrdersScreen = () => {
  const { navigate, goBack } = useAppNavigation()
  const {
    orders,
    acceptOrder,
    rejectOrder,
    selectedOrderId,
    setSelectedOrderId,
  } = useOrders()

  const { isMobile } = useResponsive()
  const [selectedPrepTimes, setSelectedPrepTimes] = useState({})
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearch, setShowSearch] = useState(false)

  // Live Orders strictly contains NEW incoming orders that require vendor action
  const incomingOrders = orders.filter((o) => o.status === "new")
  const preparingOrders = orders.filter((o) => o.status === "preparing")
  const readyOrders = orders.filter((o) => o.status === "ready")
  const activeOrdersCount = preparingOrders.length + readyOrders.length

  const displayedOrders = incomingOrders.filter(
    (o) =>
      (o.orderNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.customerName || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (o.items || []).some((i) =>
        (i.name || "").toLowerCase().includes(searchQuery.toLowerCase()),
      ),
  )

  const activeOrder =
    incomingOrders.find((o) => o.id === selectedOrderId) ||
    displayedOrders[0] ||
    incomingOrders[0] ||
    null

  const handleSelectPrep = (orderId, minutes) => {
    setSelectedPrepTimes((prev) => ({ ...prev, [orderId]: minutes }))
  }

  return (
    <View style={styles.container}>
      {/* Mobile Top Header */}
      {isMobile && (
        <AppHeader
          title="Live Orders"
          onBack={goBack}
          action={
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => setShowSearch((p) => !p)}
              accessibilityLabel="Search orders"
            >
              <AppIcon name="search" size={20} color={colors.black} />
            </TouchableOpacity>
          }
        />
      )}

      {/* Control Bar: Live Status & Quick Jump to Active Orders */}
      <View style={[styles.controlBar, !isMobile && styles.controlBarDesktop]}>
        <View style={styles.liveHeadingRow}>
          <View style={styles.livePulseBox}>
            <View style={styles.livePulseDot} />
            <Text style={styles.liveOrdersHeading}>Live Incoming Orders</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {incomingOrders.length} New
            </Text>
          </View>
        </View>

        <View style={styles.rightControlGroup}>
          <TouchableOpacity
            style={styles.viewActiveOrdersLink}
            onPress={() => navigate("active")}
            activeOpacity={0.7}
          >
            <AppIcon name="clock" size={15} color={colors.terracotta} />
            <Text style={styles.viewActiveOrdersText}>
              Active Orders ({activeOrdersCount})
            </Text>
            <AppIcon name="chevron" size={13} color={colors.terracotta} />
          </TouchableOpacity>

          {!isMobile && (
            <View style={styles.desktopSearchBox}>
              <AppIcon name="search" size={15} color={colors.warmGrey} />
              <TextInput
                placeholder="Filter by Order # or item..."
                placeholderTextColor={colors.warmGrey}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.desktopSearchInput}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery("")}
                  style={styles.clearBtn}
                >
                  <AppIcon name="close" size={13} color={colors.charcoal} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Mobile Search Bar toggle */}
      {isMobile && showSearch && (
        <View style={styles.mobileSearchBox}>
          <AppIcon name="search" size={16} color={colors.warmGrey} />
          <TextInput
            placeholder="Search by #1024, customer, or dish..."
            placeholderTextColor={colors.warmGrey}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.mobileSearchInput}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearBtn}
            >
              <AppIcon name="close" size={14} color={colors.charcoal} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Main Layout: Responsive Split View on Desktop/Tablet, List on Mobile */}
      <View style={[styles.bodyLayout, !isMobile && styles.bodyLayoutDesktop]}>
        {/* Left Orders List */}
        <ScrollView
          style={[styles.listPane, !isMobile && styles.listPaneDesktop]}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {incomingOrders.length > 0 && (
            <View style={styles.alertStrip}>
              <View style={styles.pulseDot} />
              <Text style={styles.alertMainText}>
                {incomingOrders.length} incoming order
                {incomingOrders.length > 1 ? "s" : ""} awaiting immediate
                response
              </Text>
              <Text style={styles.alertSubText}>Kitchen alert on</Text>
            </View>
          )}

          {displayedOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <AppIcon name="orders" size={36} color={colors.terracotta} />
              </View>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? "No matching orders found"
                  : "No new incoming orders"}
              </Text>
              <Text style={styles.emptySub}>
                {searchQuery
                  ? `No incoming orders matched "${searchQuery}". Check the order number or customer name.`
                  : "All incoming orders have been accepted or processed. New customer orders will appear here in real time."}
              </Text>
              <TouchableOpacity
                style={styles.goToActiveBtn}
                onPress={() => navigate("active")}
                activeOpacity={0.8}
              >
                <AppIcon name="clock" size={16} color={colors.white} />
                <Text style={styles.goToActiveText}>
                  View Active Orders ({activeOrdersCount} in progress)
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            displayedOrders.map((ord) => {
              const prepTime =
                selectedPrepTimes[ord.id] || ord.prepMinutes || 20
              const isSelected = !isMobile && activeOrder?.id === ord.id

              return (
                <AppCard
                  key={ord.id}
                  style={[
                    styles.orderCard,
                    ord.isPriority && styles.priorityCard,
                    isSelected && styles.orderCardSelected,
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelectedOrderId(ord.id)
                      if (isMobile) {
                        navigate("order-detail")
                      }
                    }}
                  >
                    <View style={styles.orderHead}>
                      <View style={styles.headLeft}>
                        <Text style={styles.orderNum}>{ord.orderNumber}</Text>
                        <Text style={styles.placedTime}>{ord.placedAt}</Text>
                      </View>
                      <StatusBadge neutral={true}>New Order</StatusBadge>
                    </View>

                    <Text style={styles.orderSummary}>
                      {ord.itemCount} items · ₹{ord.totalAmount}
                    </Text>
                    <Text style={styles.itemNames} numberOfLines={2}>
                      {ord.items
                        .map((i) => `${i.quantity}× ${i.name}`)
                        .join(", ")}
                    </Text>

                    {ord.customerNote ? (
                      <View style={styles.miniNoteBox}>
                        <Text style={styles.miniNoteText} numberOfLines={1}>
                          Note: {ord.customerNote}
                        </Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>

                  {/* Actions for Mobile: Accept and Reject with Prep Time */}
                  {isMobile && (
                    <View style={styles.prepSection}>
                      <View style={styles.prepRow}>
                        <Text style={styles.prepLabel}>Prep time:</Text>
                        <View style={styles.prepPills}>
                          {[15, 20, 30].map((m) => (
                            <TouchableOpacity
                              key={m}
                              onPress={() => handleSelectPrep(ord.id, m)}
                              style={[
                                styles.prepPill,
                                prepTime === m && styles.prepPillActive,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.prepPillText,
                                  prepTime === m && styles.prepPillTextActive,
                                ]}
                              >
                                {m}m
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={styles.mobileActionsRow}>
                        <TouchableOpacity
                          style={styles.mobileRejectBtn}
                          onPress={() => rejectOrder(ord.id)}
                          activeOpacity={0.8}
                        >
                          <AppIcon name="close" size={15} color="#DC2626" />
                          <Text style={styles.mobileRejectBtnText}>Reject</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.mobileAcceptBtn}
                          onPress={() => acceptOrder(ord.id, prepTime)}
                          activeOpacity={0.8}
                        >
                          <AppIcon
                            name="check"
                            size={15}
                            color={colors.white}
                            strokeWidth={2.5}
                          />
                          <Text style={styles.mobileAcceptBtnText}>
                            Accept Order
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </AppCard>
              )
            })
          )}
        </ScrollView>

        {/* Right Detail Pane on Desktop & Tablet */}
        {!isMobile && (
          <View style={styles.detailPaneWrapper}>
            {activeOrder ? (
              <ScrollView
                style={styles.detailPane}
                contentContainerStyle={styles.detailContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.detailCard}>
                  {/* Order Header */}
                  <View style={styles.detailHeader}>
                    <View>
                      <View style={styles.orderIdRow}>
                        <Text style={styles.detailOrderNum}>
                          {activeOrder.orderNumber}
                        </Text>
                        <StatusBadge neutral={true}>
                          New Incoming Order
                        </StatusBadge>
                      </View>
                      <Text style={styles.detailTimePlaced}>
                        Placed at {activeOrder.placedAt} • Payment: Paid Online
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.viewFullDetailBtn}
                      onPress={() => navigate("order-detail")}
                    >
                      <Text style={styles.viewFullDetailText}>
                        Full Details
                      </Text>
                      <AppIcon
                        name="chevron"
                        size={14}
                        color={colors.terracotta}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Customer Info */}
                  <View style={styles.customerBox}>
                    <View style={styles.customerAvatar}>
                      <Text style={styles.customerAvatarText}>
                        {activeOrder.customerName
                          ? activeOrder.customerName[0]
                          : "C"}
                      </Text>
                    </View>
                    <View style={styles.customerDetails}>
                      <Text style={styles.customerName}>
                        {activeOrder.customerName || "Customer"}
                      </Text>
                      <Text style={styles.customerAddress}>
                        Delivery to: Indiranagar, Bangalore (2.4 km)
                      </Text>
                    </View>
                  </View>

                  {/* Customer Note if present */}
                  {activeOrder.customerNote ? (
                    <View style={styles.noteBox}>
                      <AppIcon
                        name="chat"
                        size={15}
                        color={colors.terracotta}
                      />
                      <Text style={styles.noteText}>
                        "{activeOrder.customerNote}"
                      </Text>
                    </View>
                  ) : null}

                  {/* Items Breakdown */}
                  <View style={styles.itemsSection}>
                    <Text style={styles.sectionHeadingTitle}>
                      Order Items ({activeOrder.items?.length || 0})
                    </Text>
                    {activeOrder.items?.map((item, idx) => (
                      <View key={idx} style={styles.itemRow}>
                        <View style={styles.itemQtyBox}>
                          <Text style={styles.itemQty}>{item.quantity}×</Text>
                        </View>
                        <View style={styles.itemMain}>
                          <Text style={styles.itemName}>{item.name}</Text>
                          {item.instructions && (
                            <Text style={styles.itemInstructions}>
                              Note: {item.instructions}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.itemPrice}>
                          ₹{item.price * item.quantity}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Financial Total */}
                  <View style={styles.billTotalRow}>
                    <Text style={styles.billTotalLabel}>Total Order Value</Text>
                    <Text style={styles.billTotalAmount}>
                      ₹{activeOrder.totalAmount}
                    </Text>
                  </View>

                  {/* Action Bar: Accept Order & Reject Order */}
                  <View style={styles.detailActionBar}>
                    <View style={styles.desktopPrepActionBlock}>
                      <View style={styles.prepTimeSelectorRow}>
                        <Text style={styles.prepSelectLabel}>
                          Select Estimated Prep Time:
                        </Text>
                        <View style={styles.prepPills}>
                          {[15, 20, 30, 45].map((m) => {
                            const currentPrep =
                              selectedPrepTimes[activeOrder.id] ||
                              activeOrder.prepMinutes ||
                              20
                            return (
                              <TouchableOpacity
                                key={m}
                                onPress={() =>
                                  handleSelectPrep(activeOrder.id, m)
                                }
                                style={[
                                  styles.prepPill,
                                  currentPrep === m && styles.prepPillActive,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.prepPillText,
                                    currentPrep === m &&
                                      styles.prepPillTextActive,
                                  ]}
                                >
                                  {m} mins
                                </Text>
                              </TouchableOpacity>
                            )
                          })}
                        </View>
                      </View>

                      <View style={styles.desktopActionButtonsRow}>
                        <TouchableOpacity
                          style={styles.actionBtnReject}
                          onPress={() => rejectOrder(activeOrder.id)}
                          activeOpacity={0.8}
                        >
                          <AppIcon name="close" size={16} color="#DC2626" />
                          <Text style={styles.actionBtnRejectText}>
                            Reject Order
                          </Text>
                        </TouchableOpacity>

                        <AppButton
                          onPress={() => {
                            const p =
                              selectedPrepTimes[activeOrder.id] ||
                              activeOrder.prepMinutes ||
                              20
                            acceptOrder(activeOrder.id, p)
                          }}
                          style={styles.actionBtnAccept}
                          icon={
                            <AppIcon
                              name="check"
                              size={16}
                              color={colors.white}
                              strokeWidth={2.5}
                            />
                          }
                        >
                          Accept Order
                        </AppButton>
                      </View>
                    </View>
                  </View>
                </View>
              </ScrollView>
            ) : (
              <View style={styles.emptyDetailPane}>
                <View style={styles.emptyDetailIconCircle}>
                  <AppIcon name="check" size={32} color="#10B981" />
                </View>
                <Text style={styles.emptyDetailTitle}>
                  No Incoming Orders Selected
                </Text>
                <Text style={styles.emptyDetailSub}>
                  All new orders have been accepted or processed. Accepted
                  orders are actively being prepared in the kitchen.
                </Text>
                <TouchableOpacity
                  style={styles.emptyDetailBtn}
                  onPress={() => navigate("active")}
                  activeOpacity={0.8}
                >
                  <AppIcon name="clock" size={15} color={colors.white} />
                  <Text style={styles.emptyDetailBtnText}>
                    Go to Active Orders ({activeOrdersCount})
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  controlBar: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  controlBarDesktop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  liveHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  livePulseBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  livePulseDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#10B981",
  },
  liveOrdersHeading: {
    fontSize: 14,
    fontFamily: typography.fonts.headingBold,
    fontWeight: "700",
    color: colors.black,
  },
  countBadge: {
    backgroundColor: "rgba(163, 94, 71, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 11,
    fontFamily: typography.fonts.headingBold,
    fontWeight: "700",
    color: colors.terracotta,
  },
  rightControlGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 4,
  },
  viewActiveOrdersLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(163, 94, 71, 0.08)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.button,
  },
  viewActiveOrdersText: {
    fontSize: 12,
    fontFamily: typography.fonts.heading,
    fontWeight: "600",
    color: colors.terracotta,
  },
  desktopSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.button,
    paddingHorizontal: 12,
    height: 36,
    width: 240,
    gap: 8,
  },
  desktopSearchInput: {
    flex: 1,
    fontSize: 12,
    fontFamily: typography.fonts.body,
    outlineStyle: "none",
  },
  mobileSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.button,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    height: 38,
    gap: 8,
  },
  mobileSearchInput: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: typography.fonts.body,
    outlineStyle: "none",
  },
  clearBtn: {
    padding: 4,
  },

  // Responsive Layout
  bodyLayout: {
    flex: 1,
  },
  bodyLayoutDesktop: {
    flexDirection: "row",
    height: "100%",
  },
  listPane: {
    flex: 1,
  },
  listPaneDesktop: {
    width: "42%",
    maxWidth: 440,
    minWidth: 300,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    backgroundColor: colors.white,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  detailPaneWrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  detailPane: {
    flex: 1,
  },
  detailContent: {
    padding: 24,
  },

  alertStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(163, 94, 71, 0.08)",
    padding: 12,
    borderRadius: radius.card,
    gap: 10,
    marginBottom: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.terracotta,
  },
  alertMainText: {
    flex: 1,
    fontSize: 12,
    fontFamily: typography.fonts.heading,
    fontWeight: "600",
    color: colors.terracotta,
  },
  alertSubText: {
    fontSize: 10.5,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 56,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(163, 94, 71, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: typography.fonts.headingBold,
    fontWeight: "700",
    color: colors.black,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 12,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
    textAlign: "center",
    maxWidth: 340,
    lineHeight: 18,
  },
  goToActiveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    backgroundColor: colors.terracotta,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.button,
  },
  goToActiveText: {
    fontSize: 12,
    fontFamily: typography.fonts.heading,
    fontWeight: "600",
    color: colors.white,
  },

  // Order Card
  orderCard: {
    padding: 14,
    borderRadius: radius.card,
  },
  priorityCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.terracotta,
  },
  orderCardSelected: {
    borderColor: colors.terracotta,
    backgroundColor: "rgba(163, 94, 71, 0.03)",
  },
  orderHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  headLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  orderNum: {
    fontSize: 13.5,
    fontFamily: typography.fonts.headingBold,
    fontWeight: "700",
    color: colors.black,
  },
  placedTime: {
    fontSize: 11,
    fontFamily: typography.fonts.body,
    color: colors.warmGrey,
  },
  orderSummary: {
    fontSize: 12,
    fontFamily: typography.fonts.heading,
    fontWeight: "600",
    color: colors.black,
    marginBottom: 2,
  },
  itemNames: {
    fontSize: 11,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
    lineHeight: 15,
  },
  miniNoteBox: {
    backgroundColor: "#FEF9F6",
    borderWidth: 1,
    borderColor: "rgba(163, 94, 71, 0.15)",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
  },
  miniNoteText: {
    fontSize: 10.5,
    fontFamily: typography.fonts.body,
    color: colors.terracotta,
  },
  prepSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  prepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  prepLabel: {
    fontSize: 11.5,
    fontFamily: typography.fonts.heading,
    fontWeight: "600",
    color: colors.charcoal,
  },
  prepPills: {
    flexDirection: "row",
    gap: 6,
  },
  prepPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.button,
    backgroundColor: colors.surfaceSubtle,
  },
  prepPillActive: {
    backgroundColor: colors.terracotta,
  },
  prepPillText: {
    fontSize: 11,
    fontFamily: typography.fonts.heading,
    fontWeight: "600",
    color: colors.charcoal,
  },
  prepPillTextActive: {
    color: colors.white,
  },
  mobileActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  mobileRejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: radius.button,
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
  },
  mobileRejectBtnText: {
    fontSize: 12,
    fontFamily: typography.fonts.headingBold,
    fontWeight: "700",
    color: "#DC2626",
  },
  mobileAcceptBtn: {
    flex: 1.6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: radius.button,
    backgroundColor: colors.terracotta,
  },
  mobileAcceptBtnText: {
    fontSize: 12,
    fontFamily: typography.fonts.headingBold,
    fontWeight: "700",
    color: colors.white,
  },

  // Desktop Detail Card
  detailCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  orderIdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  detailOrderNum: {
    fontSize: 20,
    fontFamily: typography.fonts.headingBold,
    fontWeight: "700",
    color: colors.black,
  },
  detailTimePlaced: {
    fontSize: 12,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
  },
  viewFullDetailBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.button,
    backgroundColor: "rgba(163, 94, 71, 0.08)",
  },
  viewFullDetailText: {
    fontSize: 11.5,
    fontFamily: typography.fonts.heading,
    fontWeight: "600",
    color: colors.terracotta,
  },
  customerBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    padding: 14,
    borderRadius: radius.card,
    marginVertical: 16,
    gap: 14,
  },
  customerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.terracotta,
    justifyContent: "center",
    alignItems: "center",
  },
  customerAvatarText: {
    color: colors.white,
    fontSize: 14,
    fontFamily: typography.fonts.headingBold,
    fontWeight: "700",
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 13.5,
    fontFamily: typography.fonts.heading,
    fontWeight: "600",
    color: colors.black,
  },
  customerAddress: {
    fontSize: 11,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
    marginTop: 2,
  },
  noteBox: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: "#FEF9F6",
    borderWidth: 1,
    borderColor: "rgba(163, 94, 71, 0.2)",
    borderRadius: radius.button,
    padding: 10,
    marginBottom: 16,
  },
  noteText: {
    fontSize: 11.5,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
    fontStyle: "italic",
    flex: 1,
  },
  itemsSection: {
    marginBottom: 20,
  },
  sectionHeadingTitle: {
    fontSize: 13,
    fontFamily: typography.fonts.headingBold,
    fontWeight: "700",
    color: colors.black,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSubtle,
    gap: 12,
  },
  itemQtyBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: "center",
    alignItems: "center",
  },
  itemQty: {
    fontSize: 12,
    fontFamily: typography.fonts.headingBold,
    fontWeight: "700",
    color: colors.black,
  },
  itemMain: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontFamily: typography.fonts.bodyMedium,
    fontWeight: "600",
    color: colors.black,
  },
  itemInstructions: {
    fontSize: 11,
    fontFamily: typography.fonts.body,
    color: colors.terracotta,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 13,
    fontFamily: typography.fonts.headingBold,
    fontWeight: "700",
    color: colors.black,
  },
  billTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderTopWidth: 2,
    borderTopColor: colors.border,
    marginBottom: 20,
  },
  billTotalLabel: {
    fontSize: 14,
    fontFamily: typography.fonts.heading,
    fontWeight: "600",
    color: colors.black,
  },
  billTotalAmount: {
    fontSize: 18,
    fontFamily: typography.fonts.headingBold,
    fontWeight: "700",
    color: colors.terracotta,
  },
  detailActionBar: {
    paddingTop: 10,
  },
  desktopPrepActionBlock: {
    gap: 16,
  },
  prepTimeSelectorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  prepSelectLabel: {
    fontSize: 12.5,
    fontFamily: typography.fonts.heading,
    fontWeight: "600",
    color: colors.black,
  },
  desktopActionButtonsRow: {
    flexDirection: "row",
    gap: 14,
  },
  actionBtnReject: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.button,
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
  },
  actionBtnRejectText: {
    fontSize: 13,
    fontFamily: typography.fonts.headingBold,
    fontWeight: "700",
    color: "#DC2626",
  },
  actionBtnAccept: {
    flex: 1.5,
  },

  // Empty Detail Pane
  emptyDetailPane: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  emptyDetailIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  emptyDetailTitle: {
    fontSize: 16,
    fontFamily: typography.fonts.headingBold,
    fontWeight: "700",
    color: colors.black,
    textAlign: "center",
  },
  emptyDetailSub: {
    fontSize: 12.5,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
    textAlign: "center",
    maxWidth: 360,
    lineHeight: 18,
  },
  emptyDetailBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    backgroundColor: colors.terracotta,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.button,
  },
  emptyDetailBtnText: {
    fontSize: 12,
    fontFamily: typography.fonts.heading,
    fontWeight: "600",
    color: colors.white,
  },
})

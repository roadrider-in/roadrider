import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { typography } from '../../theme/typography';
import { AppHeader } from '../../components/common/AppHeader';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppIcon } from '../../components/common/AppIcon';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useResponsive } from '../../theme/useResponsive';
import { useAppNavigation } from '../../navigation/NavigationContext';
import { useOrders } from '../../context/OrderContext';

export const OrderDetailScreen = () => {
  const { navigate, goBack } = useAppNavigation();
  const { selectedOrder, markOrderReady } = useOrders();
  const { isMobile } = useResponsive();

  if (!selectedOrder) {
    return (
      <View style={styles.container}>
        <AppHeader title="Order Breakdown" onBack={goBack} />
        <ScrollView contentContainerStyle={[styles.scrollContent, { alignItems: 'center', justifyContent: 'center', minHeight: 350 }]}>
          <AppCard style={{ padding: 32, alignItems: 'center', maxWidth: 460, width: '100%' }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#FAF8F7', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <AppIcon name="orders" size={28} color={colors.terracotta} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', fontFamily: 'Poppins, sans-serif', color: colors.black, textAlign: 'center' }}>
              No Order Selected
            </Text>
            <Text style={{ fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: colors.charcoal, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
              Please select an incoming or active order from your orders queue to view its item breakdown, customer details, and kitchen notes.
            </Text>
            <View style={{ marginTop: 24, flexDirection: 'row', gap: 12 }}>
              <AppButton secondary onPress={() => navigate('incoming')}>
                Live Orders
              </AppButton>
              <AppButton onPress={() => navigate('active')}>
                Active Orders
              </AppButton>
            </View>
          </AppCard>
        </ScrollView>
      </View>
    );
  }

  const order = selectedOrder;

  const handleMarkReady = () => {
    markOrderReady(order.id);
    navigate('active');
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title={`Order ${order.orderNumber}`}
        onBack={goBack}
        action={
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => navigate('incoming')}
          >
            <AppIcon name="close" size={20} color={colors.black} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          !isMobile && styles.scrollContentDesktop,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.mainLayout, !isMobile && styles.mainLayoutDesktop]}>
          {/* Left Column: Items & Notes */}
          <View style={styles.leftCol}>
            {/* Section Heading */}
            <View style={styles.sectionHeading}>
              <View style={styles.headingTitleRow}>
                <Text style={styles.sectionTitle}>Order Items</Text>
                <Text style={styles.itemCountBadge}>
                  {order.items.length} items
                </Text>
              </View>
              <StatusBadge neutral={order.paymentStatus === 'paid'}>
                Payment: Paid Online
              </StatusBadge>
            </View>

            {/* Item List Card */}
            <AppCard style={styles.listCard}>
              {order.items.map((item, idx) => (
                <View
                  key={item.id}
                  style={[
                    styles.lineItem,
                    idx === order.items.length - 1 && styles.lastLineItem,
                  ]}
                >
                  <View
                    style={[
                      styles.vegBadge,
                      item.isVeg ? styles.vegDot : styles.nonVegDot,
                    ]}
                  />
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName}>
                      {item.quantity}× {item.name}
                    </Text>
                    {item.notes ? (
                      <Text style={styles.itemNote}>Note: {item.notes}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.itemPricing}>
                    ₹{item.price * item.quantity}
                  </Text>
                </View>
              ))}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>₹{order.totalAmount}</Text>
              </View>
            </AppCard>

            {/* Customer Note Card */}
            {order.customerNote ? (
              <AppCard style={styles.noteCard}>
                <View style={styles.noteHead}>
                  <AppIcon name="chat" size={16} color={colors.terracotta} />
                  <Text style={styles.noteTitle}>Customer Cooking Instructions</Text>
                </View>
                <Text style={styles.noteText}>“{order.customerNote}”</Text>
              </AppCard>
            ) : null}

            {/* Delivery Rider Info */}
            <AppCard style={styles.riderCard}>
              <View style={styles.riderIconBox}>
                <AppIcon name="store" size={20} color={colors.terracotta} />
              </View>
              <View style={styles.riderInfo}>
                <Text style={styles.riderTitle}>Delivery Fleet Assigned</Text>
                <Text style={styles.riderSub}>
                  Rider Rahul M. • Arriving in ~8 mins
                </Text>
              </View>
              <TouchableOpacity
                style={styles.callRiderBtn}
                onPress={() => alert('Calling delivery fleet partner...')}
              >
                <Text style={styles.callRiderText}>Call</Text>
              </TouchableOpacity>
            </AppCard>
          </View>

          {/* Right Column: Timer & Actions */}
          <View style={styles.rightCol}>
            {/* Timer Card */}
            <View style={styles.timerCard}>
              <Text style={styles.timerLabel}>KITCHEN PREPARATION TIMER</Text>
              <Text style={styles.timerCountdown}>{order.timeRemaining}</Text>
              <Text style={styles.timerSub}>
                Promised to customer by {order.promisedBy}
              </Text>
            </View>

            {/* Financial Breakdown Card */}
            <AppCard style={styles.billingCard}>
              <Text style={styles.billingTitle}>Settlement Breakdown</Text>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Item Total</Text>
                <Text style={styles.billValue}>₹{order.totalAmount}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Packaging Charge</Text>
                <Text style={styles.billValue}>+ ₹25</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>RoadRider Commission (8%)</Text>
                <Text style={styles.billValueMinus}>- ₹69</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>GST on Commission (18%)</Text>
                <Text style={styles.billValueMinus}>- ₹12</Text>
              </View>
              <View style={styles.netPayoutRow}>
                <Text style={styles.netPayoutLabel}>Net Vendor Payout</Text>
                <Text style={styles.netPayoutValue}>₹{order.totalAmount - 56}</Text>
              </View>
            </AppCard>

            {/* Action Buttons */}
            <View style={styles.actionsBox}>
              <AppButton
                onPress={handleMarkReady}
                style={styles.fullBtn}
              >
                Mark Order Ready for Pickup
              </AppButton>
              <View style={styles.secondaryActions}>
                <AppButton
                  secondary
                  onPress={() => alert('Printing KOT receipt...')}
                  style={styles.halfBtn}
                >
                  Print KOT
                </AppButton>
                <AppButton
                  secondary
                  onPress={() => navigate('support')}
                  style={styles.halfBtn}
                >
                  Need Help
                </AppButton>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerActionBtn: {
    padding: 8,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  scrollContentDesktop: {
    padding: 32,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  mainLayout: {
    flexDirection: 'column',
    gap: 16,
  },
  mainLayoutDesktop: {
    flexDirection: 'row',
    gap: 28,
    alignItems: 'flex-start',
  },
  leftCol: {
    flex: 6,
    width: '100%',
  },
  rightCol: {
    flex: 4,
    width: '100%',
  },
  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  headingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: typography.fonts.headingBold,
    fontWeight: '700',
    color: colors.black,
  },
  itemCountBadge: {
    fontSize: 11,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
  },
  listCard: {
    padding: 16,
    marginBottom: 16,
  },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  lastLineItem: {
    borderBottomWidth: 0,
  },
  vegBadge: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vegDot: {
    borderColor: '#10B981',
    backgroundColor: '#10B981',
  },
  nonVegDot: {
    borderColor: '#EF4444',
    backgroundColor: '#EF4444',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 13.5,
    fontFamily: typography.fonts.heading,
    fontWeight: '600',
    color: colors.black,
  },
  itemNote: {
    fontSize: 11,
    fontFamily: typography.fonts.body,
    color: colors.terracotta,
    marginTop: 2,
  },
  itemPricing: {
    fontSize: 13.5,
    fontFamily: typography.fonts.headingBold,
    fontWeight: '700',
    color: colors.black,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1.5,
    borderTopColor: colors.border,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: typography.fonts.headingBold,
    fontWeight: '700',
    color: colors.black,
  },
  totalValue: {
    fontSize: 17,
    fontFamily: typography.fonts.headingBold,
    fontWeight: '700',
    color: colors.terracotta,
  },
  noteCard: {
    padding: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(163, 94, 71, 0.05)',
    borderColor: 'rgba(163, 94, 71, 0.2)',
  },
  noteHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  noteTitle: {
    fontSize: 12,
    fontFamily: typography.fonts.heading,
    fontWeight: '600',
    color: colors.terracotta,
  },
  noteText: {
    fontSize: 12.5,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  riderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  riderIconBox: {
    width: 38,
    height: 38,
    borderRadius: radius.button,
    backgroundColor: 'rgba(163, 94, 71, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  riderInfo: {
    flex: 1,
  },
  riderTitle: {
    fontSize: 12.5,
    fontFamily: typography.fonts.heading,
    fontWeight: '600',
    color: colors.black,
  },
  riderSub: {
    fontSize: 11,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
    marginTop: 2,
  },
  callRiderBtn: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.button,
  },
  callRiderText: {
    fontSize: 11.5,
    fontFamily: typography.fonts.heading,
    fontWeight: '600',
    color: colors.black,
  },
  timerCard: {
    backgroundColor: colors.black,
    borderRadius: radius.card,
    padding: 22,
    alignItems: 'center',
    marginBottom: 16,
  },
  timerLabel: {
    fontSize: 10,
    fontFamily: typography.fonts.headingBold,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.terracotta,
    marginBottom: 6,
  },
  timerCountdown: {
    fontSize: 34,
    fontFamily: typography.fonts.headingBold,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 1,
    marginVertical: 4,
  },
  timerSub: {
    fontSize: 11,
    fontFamily: typography.fonts.body,
    color: colors.warmGrey,
  },
  billingCard: {
    padding: 18,
    marginBottom: 16,
  },
  billingTitle: {
    fontSize: 13,
    fontFamily: typography.fonts.headingBold,
    fontWeight: '700',
    color: colors.black,
    marginBottom: 12,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  billLabel: {
    fontSize: 11.5,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
  },
  billValue: {
    fontSize: 11.5,
    fontFamily: typography.fonts.bodyMedium,
    fontWeight: '600',
    color: colors.black,
  },
  billValueMinus: {
    fontSize: 11.5,
    fontFamily: typography.fonts.bodyMedium,
    fontWeight: '600',
    color: '#EF4444',
  },
  netPayoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  netPayoutLabel: {
    fontSize: 12.5,
    fontFamily: typography.fonts.heading,
    fontWeight: '700',
    color: colors.black,
  },
  netPayoutValue: {
    fontSize: 14,
    fontFamily: typography.fonts.headingBold,
    fontWeight: '700',
    color: '#10B981',
  },
  actionsBox: {
    gap: 10,
  },
  fullBtn: {
    width: '100%',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 10,
  },
  halfBtn: {
    flex: 1,
  },
});

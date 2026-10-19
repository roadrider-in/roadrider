import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { AppHeader } from '../../components/common/AppHeader';
import { AppCard } from '../../components/common/AppCard';
import { AppButton } from '../../components/common/AppButton';
import { AppIcon } from '../../components/common/AppIcon';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useResponsive } from '../../theme/useResponsive';
import { useAppNavigation } from '../../navigation/NavigationContext';
import { useOrders } from '../../context/OrderContext';

export const ActiveOrdersScreen = () => {
  const { navigate, goBack } = useAppNavigation();
  const {
    orders,
    activeTab,
    setActiveTab,
    setSelectedOrderId,
    markOrderReady,
    completeOrder,
  } = useOrders();
  const { isMobile } = useResponsive();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Active Orders only contain accepted orders: preparing and ready
  const preparingOrders = orders.filter((o) => o.status === 'preparing');
  const readyOrders = orders.filter((o) => o.status === 'ready');
  const incomingOrders = orders.filter((o) => o.status === 'new');

  // Strictly only 'preparing' or 'ready' (remove 'new' completely)
  const currentTab = activeTab === 'ready' ? 'ready' : 'preparing';
  const tabOrders = currentTab === 'ready' ? readyOrders : preparingOrders;

  const displayedOrders = tabOrders.filter(
    (o) =>
      (o.orderNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.items || []).some((i) => (i.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <View style={styles.container}>
      {isMobile && (
        <AppHeader
          title="Active Orders"
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

      {/* Search Bar */}
      {showSearch && (
        <View style={styles.searchBar}>
          <AppIcon name="search" size={16} color={colors.warmGrey} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by #1024, customer, or dish..."
            placeholderTextColor={colors.warmGrey}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
              <AppIcon name="close" size={14} color={colors.charcoal} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Tabs Row: Only Preparing and Ready */}
      <View style={styles.tabsRow}>
        {[
          { key: 'preparing', label: 'Preparing', count: preparingOrders.length },
          { key: 'ready', label: 'Ready', count: readyOrders.length },
        ].map((tab) => {
          const isActive = currentTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.7}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tabButton, isActive && styles.activeTabButton]}
            >
              <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View style={[styles.badge, isActive && styles.badgeActive]}>
                  <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
                    {tab.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {displayedOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <AppIcon name="orders" size={40} color={colors.warmGrey} />
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'No matching orders found'
                : currentTab === 'preparing'
                ? 'No orders currently preparing'
                : 'No orders ready for pickup'}
            </Text>
            <Text style={styles.emptySub}>
              {searchQuery
                ? `No orders matched "${searchQuery}". Check the order number or search terms.`
                : currentTab === 'preparing'
                ? 'Accepted incoming orders will appear here for kitchen preparation.'
                : 'Orders marked ready from the kitchen will appear here for rider handover.'}
            </Text>

            {incomingOrders.length > 0 && currentTab === 'preparing' && (
              <TouchableOpacity
                style={styles.viewIncomingBtn}
                onPress={() => navigate('incoming')}
                activeOpacity={0.8}
              >
                <AppIcon name="orders" size={16} color={colors.white} />
                <Text style={styles.viewIncomingText}>
                  View Live Orders ({incomingOrders.length} New)
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          displayedOrders.map((ord) => (
            <AppCard key={ord.id} style={styles.orderCard}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setSelectedOrderId(ord.id);
                  navigate('order-detail');
                }}
              >
                <View style={styles.orderHead}>
                  <View style={styles.headLeft}>
                    <Text style={styles.orderNum}>{ord.orderNumber}</Text>
                    <Text style={styles.placedTime}>{ord.placedAt}</Text>
                  </View>
                  <StatusBadge neutral={false}>
                    {ord.status === 'ready' ? 'Ready for Pickup' : 'Kitchen Preparing'}
                  </StatusBadge>
                </View>

                <Text style={styles.orderSummary}>
                  {ord.itemCount} items · ₹{ord.totalAmount}
                </Text>
                <Text style={styles.itemNames} numberOfLines={2}>
                  {ord.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                </Text>

                {ord.customerNote ? (
                  <View style={styles.noteBox}>
                    <Text style={styles.noteLabel}>Note:</Text>
                    <Text style={styles.noteText}>{ord.customerNote}</Text>
                  </View>
                ) : null}

                <View style={styles.progressRow}>
                  <View style={styles.progressBars}>
                    <View style={[styles.pBar, styles.pBarDone]} />
                    <View style={[styles.pBar, styles.pBarDone]} />
                    <View style={[styles.pBar, ord.status === 'ready' && styles.pBarDone]} />
                  </View>
                  <Text style={styles.progressStatusText}>
                    {ord.status === 'ready'
                      ? 'Packed & ready · Awaiting delivery partner pickup'
                      : `Kitchen is preparing · Estimated: ${ord.prepMinutes || 20}m`}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Order State Transition Actions */}
              <View style={styles.actionRow}>
                {ord.status === 'preparing' ? (
                  <AppButton
                    onPress={() => markOrderReady(ord.id)}
                    style={styles.markReadyBtn}
                    icon={<AppIcon name="check" size={16} color={colors.white} strokeWidth={2.5} />}
                  >
                    Mark Ready for Pickup
                  </AppButton>
                ) : (
                  <AppButton
                    onPress={() => completeOrder(ord.id)}
                    style={styles.handoverBtn}
                    icon={<AppIcon name="check" size={16} color={colors.white} strokeWidth={2.5} />}
                  >
                    Handover to Rider (Complete)
                  </AppButton>
                )}
              </View>
            </AppCard>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7F6',
  },
  headerBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(156, 154, 154, 0.22)',
    paddingHorizontal: 16,
  },
  tabButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: colors.terracotta,
  },
  tabLabel: {
    fontSize: 13,
    fontFamily: 'Poppins, sans-serif',
    fontWeight: '500',
    color: colors.charcoal,
  },
  activeTabLabel: {
    color: colors.terracotta,
    fontWeight: '700',
  },
  badge: {
    backgroundColor: 'rgba(163, 94, 71, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeActive: {
    backgroundColor: colors.terracotta,
  },
  badgeText: {
    fontSize: 9.5,
    fontFamily: 'Poppins, sans-serif',
    fontWeight: '700',
    color: colors.terracotta,
  },
  badgeTextActive: {
    color: colors.white,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  orderCard: {
    padding: 16,
    marginBottom: 14,
    borderRadius: radius.card,
    backgroundColor: colors.white,
  },
  orderHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  headLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderNum: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Poppins, sans-serif',
    color: colors.black,
  },
  placedTime: {
    fontSize: 10,
    fontFamily: 'DM Sans, sans-serif',
    color: colors.charcoal,
  },
  orderSummary: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Poppins, sans-serif',
    color: colors.black,
    marginTop: 8,
    marginBottom: 4,
  },
  itemNames: {
    fontSize: 11,
    fontFamily: 'DM Sans, sans-serif',
    color: colors.charcoal,
    lineHeight: 16,
    marginBottom: 8,
  },
  noteBox: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#FEF9F6',
    borderWidth: 1,
    borderColor: 'rgba(163, 94, 71, 0.15)',
    borderRadius: 6,
    padding: 8,
    marginBottom: 10,
  },
  noteLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.terracotta,
    fontFamily: 'Poppins, sans-serif',
  },
  noteText: {
    fontSize: 10.5,
    fontFamily: 'DM Sans, sans-serif',
    color: colors.charcoal,
    flex: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(156, 154, 154, 0.18)',
    paddingTop: 10,
    marginBottom: 12,
  },
  progressBars: {
    flexDirection: 'row',
    gap: 4,
  },
  pBar: {
    width: 26,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(156, 154, 154, 0.25)',
  },
  pBarDone: {
    backgroundColor: colors.terracotta,
  },
  progressStatusText: {
    fontSize: 10,
    fontFamily: 'DM Sans, sans-serif',
    color: colors.charcoal,
  },
  actionRow: {
    borderTopWidth: 1,
    borderTopColor: '#F0ECE8',
    paddingTop: 10,
  },
  markReadyBtn: {
    minHeight: 42,
    backgroundColor: colors.terracotta,
  },
  handoverBtn: {
    minHeight: 42,
    backgroundColor: '#059669',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 12,
    height: 38,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: 'DM Sans, sans-serif',
    outlineStyle: 'none',
  },
  clearBtn: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'Poppins, sans-serif',
    fontWeight: '700',
    color: colors.black,
    marginTop: 4,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    fontFamily: 'DM Sans, sans-serif',
    color: colors.charcoal,
    textAlign: 'center',
    maxWidth: 360,
    lineHeight: 18,
  },
  viewIncomingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    backgroundColor: colors.terracotta,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.button,
  },
  viewIncomingText: {
    fontSize: 12,
    fontFamily: 'Poppins, sans-serif',
    fontWeight: '600',
    color: colors.white,
  },
});

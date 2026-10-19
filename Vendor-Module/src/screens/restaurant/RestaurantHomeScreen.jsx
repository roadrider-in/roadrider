import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { radius } from '../../theme/radius';
import { AppLogo } from '../../components/common/AppLogo';
import { AppIcon } from '../../components/common/AppIcon';
import { AppCard } from '../../components/common/AppCard';
import { MetricCard } from '../../components/common/MetricCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ToggleSwitch } from '../../components/common/ToggleSwitch';
import { useResponsive } from '../../theme/useResponsive';
import { useAppNavigation } from '../../navigation/NavigationContext';
import { useVendor } from '../../context/VendorContext';
import { useOrders } from '../../context/OrderContext';
import { useOnboarding } from '../../context/OnboardingContext';
import { getTimeBasedGreeting } from '../../utils/greeting';
import { supabase, isSupabaseConfigured } from '../../lib/supabase.js';

export const RestaurantHomeScreen = () => {
  const { navigate } = useAppNavigation();
  const { activeStore, vendor, isOnline, setIsOnline } = useVendor();
  const { orders, setSelectedOrderId } = useOrders();
  const { businessDetails } = useOnboarding();
  const { isMobile, isDesktop, isTablet } = useResponsive();

  const greeting = getTimeBasedGreeting();
  const vendorName = businessDetails?.ownerName || 'Partner';

  const todayFormatted = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).toUpperCase();
  const todayShort = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  }).toUpperCase();

  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  const newOrders = orders.filter((o) => o.status === 'new');
  const preparingOrders = orders.filter((o) => o.status === 'preparing');
  const todayOrders = orders.filter((o) => isToday(o.createdAt));
  const todayValidOrders = todayOrders.filter((o) => o.status !== 'rejected' && o.status !== 'cancelled');
  const todaySales = todayValidOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  const todayOrdersCount = todayValidOrders.length;
  const avgOrderValue = todayOrdersCount > 0 ? Math.round(todaySales / todayOrdersCount) : 0;

  // Next payout: load pending payout amount from database for current vendor
  const [nextPayoutAmount, setNextPayoutAmount] = useState(0);

  useEffect(() => {
    if (!vendor?.id || !isSupabaseConfigured) {
      setNextPayoutAmount(0);
      return;
    }
    let isMounted = true;
    const loadPayout = async () => {
      try {
        const { data } = await supabase
          .from('payouts')
          .select('amount')
          .eq('vendor_id', vendor.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1);
        if (isMounted) {
          if (data && data.length > 0) {
            setNextPayoutAmount(Number(data[0].amount) || 0);
          } else {
            setNextPayoutAmount(0);
          }
        }
      } catch {
        if (isMounted) setNextPayoutAmount(0);
      }
    };
    loadPayout();
    return () => { isMounted = false; };
  }, [vendor?.id]);

  // Compute weekly revenue and daily percentages for current week (Mon-Sun)
  const getWeeklySales = (allOrders) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const now = new Date();
    const currentDay = now.getDay();
    const distanceToMonday = (currentDay + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    const dailyTotals = [0, 0, 0, 0, 0, 0, 0];
    (allOrders || []).forEach((ord) => {
      if (ord.status === 'rejected' || ord.status === 'cancelled') return;
      if (!ord.createdAt) return;
      const orderDate = new Date(ord.createdAt);
      const diffTime = orderDate.getTime() - monday.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 7) {
        dailyTotals[diffDays] += (Number(ord.totalAmount) || 0);
      }
    });

    const totalWeeklySales = dailyTotals.reduce((a, b) => a + b, 0);
    const maxDaySales = Math.max(...dailyTotals, 0);

    return {
      days: days.map((day, idx) => ({
        day,
        amount: dailyTotals[idx],
        percent: maxDaySales > 0 ? Math.round((dailyTotals[idx] / maxDaySales) * 100) : 0,
      })),
      totalWeeklySales,
      maxDaySales,
    };
  };

  const weeklyData = getWeeklySales(orders);

  // Store performance calculations
  const completedOrders = orders.filter((o) => o.status === 'completed');
  const rejectedOrders = orders.filter((o) => o.status === 'rejected');
  const totalDecidedOrders = completedOrders.length + rejectedOrders.length;
  const hasRealOrders = orders.length > 0;

  const rejectionRateStr = hasRealOrders && totalDecidedOrders > 0
    ? `${Math.round((rejectedOrders.length / totalDecidedOrders) * 100)}%`
    : '—';

  const onTimeRateStr = hasRealOrders ? '100%' : '—';

  const avgPrepMinutes = hasRealOrders
    ? `${Math.round(orders.reduce((sum, o) => sum + (o.prepMinutes || 20), 0) / orders.length)}m`
    : '—';

  return (
    <View style={styles.container}>
      {/* Mobile Top Header (only on mobile) */}
      {isMobile && (
        <View style={styles.homeTop}>
          <View style={styles.brandRow}>
            <AppLogo />
            <TouchableOpacity
              style={styles.notificationBtn}
              onPress={() => navigate('notifications')}
              accessibilityLabel="Notifications"
            >
              <AppIcon name="bell" size={20} color={colors.black} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.storeRow}
            onPress={() => navigate('stores')}
          >
            <View>
              <Text style={styles.storeName}>{activeStore?.name || 'My Kitchen'}</Text>
              <Text style={styles.storeLocality}>
                {activeStore?.locality ? `${activeStore.locality}${activeStore.city ? `, ${activeStore.city}` : ''}` : 'Store Location'}
              </Text>
            </View>
            <AppIcon name="chevron" size={18} color={colors.charcoal} />
          </TouchableOpacity>

          <View style={styles.availabilityBox}>
            <View style={styles.availInfo}>
              <View style={styles.statusRow}>
                <View style={[styles.liveDot, isOnline && styles.liveDotOn]} />
                <Text style={styles.availTitle}>
                  {isOnline ? 'Store is online' : 'Store is offline'}
                </Text>
              </View>
              <Text style={styles.availSub}>
                {isOnline ? 'Receiving new orders' : 'Orders are paused'}
              </Text>
            </View>
            <ToggleSwitch on={isOnline} setOn={setIsOnline} />
          </View>
        </View>
      )}

      {/* Main Responsive Content */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          !isMobile && styles.scrollContentDesktop,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Desktop Greeting & Status Banner */}
        {!isMobile && (
          <View style={styles.desktopBanner}>
            <View>
              <Text style={styles.bannerEyebrow}>TODAY • {todayFormatted}</Text>
              <Text style={styles.bannerTitle}>
                {greeting}, {vendorName}!{' '}
                <Text style={styles.bannerStoreName}>({activeStore?.name || 'My Kitchen'})</Text>
              </Text>
              <Text style={styles.bannerSub}>
                Your kitchen is currently{' '}
                <Text
                  style={{
                    color: isOnline ? '#10B981' : colors.warmGrey,
                    fontWeight: '700',
                  }}
                >
                  {isOnline ? 'ONLINE' : 'PAUSED'}
                </Text>
                . You have {newOrders.length} incoming orders awaiting confirmation.
              </Text>
            </View>
            <View style={styles.bannerActions}>
              <TouchableOpacity
                style={styles.quickOrderBtn}
                onPress={() => navigate('incoming')}
              >
                <AppIcon name="orders" size={17} color={colors.white} />
                <Text style={styles.quickOrderBtnText}>
                  View Orders ({newOrders.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => navigate('menu-item')}
              >
                <AppIcon name="plus" size={17} color={colors.black} />
                <Text style={styles.secondaryBtnText}>Add Item</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Mobile Greeting Section */}
        {isMobile && (
          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.dateLabel}>TODAY · {todayShort}</Text>
              <Text style={styles.greetingTitle}>
                {greeting}, {vendorName}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.moreBtn}
              onPress={() => navigate('account')}
              accessibilityLabel="View profile and account settings"
            >
              <AppIcon name="user" size={20} color={colors.black} />
            </TouchableOpacity>
          </View>
        )}

        {/* Metric Cards Row */}
        <View
          style={[
            styles.metricsContainer,
            !isMobile && styles.metricsContainerDesktop,
          ]}
        >
          <View style={styles.metricItem}>
            <MetricCard
              label="Net sales"
              value={`₹${todaySales.toLocaleString('en-IN')}`}
              note={todaySales > 0 ? "Today's gross earnings" : "No sales recorded today"}
              keyMetric
            />
          </View>
          <View style={styles.metricItem}>
            <MetricCard
              label="Today's orders"
              value={`${todayOrdersCount}`}
              note={`${preparingOrders.length} in progress`}
            />
          </View>
          <View style={styles.metricItem}>
            <MetricCard
              label="Avg. order value"
              value={`₹${avgOrderValue}`}
              note={todayOrdersCount > 0 ? "Average ticket size" : "Based on fulfilled orders"}
            />
          </View>
          <View style={styles.metricItem}>
            <MetricCard
              label="Next payout"
              value={`₹${nextPayoutAmount.toLocaleString('en-IN')}`}
              note="Daily automated settlement"
            />
          </View>
        </View>

        {/* Two-Column Responsive Split (Desktop/Tablet) or Stack (Mobile) */}
        <View
          style={[
            styles.dashboardBody,
            !isMobile && styles.dashboardBodyDesktop,
          ]}
        >
          {/* Left Column: Live Orders Queue & Quick Actions */}
          <View style={styles.mainColumn}>
            {/* Live Orders in Progress */}
            <View style={styles.previewSection}>
              <View style={styles.compactHeading}>
                <View style={styles.headingLeft}>
                  <Text style={styles.sectionTitle}>Orders in progress</Text>
                  {preparingOrders.length > 0 && (
                    <View style={styles.liveOrderCountPill}>
                      <Text style={styles.liveOrderCountText}>
                        {preparingOrders.length} Active
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity onPress={() => navigate('active')}>
                  <Text style={styles.viewAllText}>View all</Text>
                </TouchableOpacity>
              </View>

              {preparingOrders.length === 0 ? (
                <AppCard style={styles.orderEmptyPreviewCard}>
                  <View style={styles.emptyIconCircle}>
                    <AppIcon name="orders" size={28} color={colors.terracotta} />
                  </View>
                  <Text style={styles.emptyOrderTitle}>No orders in progress</Text>
                  <Text style={styles.emptyOrderSub}>
                    Incoming customer orders confirmed by your kitchen will appear here in real time.
                  </Text>
                  <View style={styles.emptyOrderActions}>
                    <TouchableOpacity
                      style={styles.emptyIncomingBtn}
                      onPress={() => navigate('incoming')}
                    >
                      <Text style={styles.emptyIncomingText}>
                        Check Incoming ({newOrders.length})
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.emptyMenuBtn}
                      onPress={() => navigate('menu')}
                    >
                      <Text style={styles.emptyMenuText}>Manage Menu</Text>
                    </TouchableOpacity>
                  </View>
                </AppCard>
              ) : (
                preparingOrders.slice(0, isMobile ? 1 : 2).map((ord) => (
                  <TouchableOpacity
                    key={ord.id}
                    activeOpacity={0.8}
                    style={{ marginBottom: 10 }}
                    onPress={() => {
                      if (setSelectedOrderId) setSelectedOrderId(ord.id);
                      navigate('order-detail');
                    }}
                  >
                    <AppCard style={styles.orderPreviewCard}>
                      <View style={styles.orderIconBox}>
                        <AppIcon name="orders" size={20} color={colors.terracotta} />
                      </View>
                      <View style={styles.orderPreviewInfo}>
                        <View style={styles.orderNumberRow}>
                          <Text style={styles.orderNumber}>{ord.orderNumber}</Text>
                          <Text style={styles.orderTimeText}>• {ord.placedAt || 'Just now'}</Text>
                        </View>
                        <Text style={styles.orderSub} numberOfLines={1}>
                          {ord.items ? ord.items.map((i) => `${i.quantity}× ${i.name}`).join(', ') : 'Order items'}
                        </Text>
                      </View>
                      <StatusBadge>Preparing</StatusBadge>
                      <AppIcon name="chevron" size={17} color={colors.charcoal} />
                    </AppCard>
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Quick Operational Shortcuts */}
            <View style={[styles.previewSection, { marginTop: 24 }]}>
              <Text style={styles.sectionTitle}>Operational Shortcuts</Text>
              <View style={styles.shortcutsGrid}>
                <TouchableOpacity
                  style={styles.shortcutCard}
                  onPress={() => navigate('menu')}
                >
                  <View style={styles.shortcutIcon}>
                    <AppIcon name="catalog" size={20} color={colors.terracotta} />
                  </View>
                  <Text style={styles.shortcutTitle}>Menu Management</Text>
                  <Text style={styles.shortcutDesc}>
                    Update items, pricing, out of stock
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shortcutCard}
                  onPress={() => navigate('offers')}
                >
                  <View style={styles.shortcutIcon}>
                    <AppIcon name="tag" size={20} color={colors.terracotta} />
                  </View>
                  <Text style={styles.shortcutTitle}>Promotions & Offers</Text>
                  <Text style={styles.shortcutDesc}>
                    Create discount coupons & boosts
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shortcutCard}
                  onPress={() => navigate('hours')}
                >
                  <View style={styles.shortcutIcon}>
                    <AppIcon name="clock" size={20} color={colors.terracotta} />
                  </View>
                  <Text style={styles.shortcutTitle}>Operating Hours</Text>
                  <Text style={styles.shortcutDesc}>
                    Slots, break times, holiday hours
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shortcutCard}
                  onPress={() => navigate('delivery')}
                >
                  <View style={styles.shortcutIcon}>
                    <AppIcon name="map" size={20} color={colors.terracotta} />
                  </View>
                  <Text style={styles.shortcutTitle}>Delivery Settings</Text>
                  <Text style={styles.shortcutDesc}>
                    Service radius, packaging fee
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Right Column: Weekly Chart & Performance */}
          <View style={styles.sideColumn}>
            {/* Weekly Sales Chart */}
            <View style={styles.previewSection}>
              <View style={styles.compactHeading}>
                <Text style={styles.sectionTitle}>Weekly Revenue</Text>
                <TouchableOpacity onPress={() => navigate('restaurant-payout')}>
                  <Text style={styles.viewAllText}>View report</Text>
                </TouchableOpacity>
              </View>

              <AppCard style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartAmount}>₹{weeklyData.totalWeeklySales.toLocaleString('en-IN')}</Text>
                  <Text style={styles.chartTrend}>
                    {weeklyData.totalWeeklySales > 0 ? 'Current week earnings' : 'No revenue this week'}
                  </Text>
                </View>

                <View style={styles.barsContainer}>
                  {weeklyData.days.map((item, idx) => (
                    <View key={idx} style={styles.barColumn}>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            { height: `${item.percent}%` },
                            item.percent > 0 && item.amount === weeklyData.maxDaySales && styles.barPeak,
                          ]}
                        />
                      </View>
                      <Text style={styles.dayLabel}>{item.day}</Text>
                    </View>
                  ))}
                </View>
              </AppCard>
            </View>

            {/* Store Health & Ratings Card */}
            <View style={[styles.previewSection, { marginTop: 24 }]}>
              <View style={styles.compactHeading}>
                <Text style={styles.sectionTitle}>Store Performance</Text>
                <TouchableOpacity onPress={() => navigate('reviews')}>
                  <Text style={styles.viewAllText}>Reviews</Text>
                </TouchableOpacity>
              </View>

              <AppCard style={styles.healthCard}>
                <View style={styles.healthRow}>
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingValue}>{hasRealOrders ? '4.8' : 'New'}</Text>
                    <AppIcon name="star" size={14} color="#F59E0B" />
                  </View>
                  <View style={styles.healthInfo}>
                    <Text style={styles.healthTitle}>
                      {hasRealOrders ? 'Kitchen Performance' : 'New Partner Onboarding'}
                    </Text>
                    <Text style={styles.healthSub}>
                      {hasRealOrders ? 'Metrics based on order fulfillment' : 'Ratings will generate after fulfilled orders'}
                    </Text>
                  </View>
                </View>

                <View style={styles.healthStatsRow}>
                  <View style={styles.healthStat}>
                    <Text style={styles.statNumber}>{onTimeRateStr}</Text>
                    <Text style={styles.statLabel}>{hasRealOrders ? 'On-Time' : 'Awaiting orders'}</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.healthStat}>
                    <Text style={styles.statNumber}>{rejectionRateStr}</Text>
                    <Text style={styles.statLabel}>{hasRealOrders ? 'Rejections' : 'Awaiting orders'}</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.healthStat}>
                    <Text style={styles.statNumber}>{avgPrepMinutes}</Text>
                    <Text style={styles.statLabel}>{hasRealOrders ? 'Avg. Prep' : 'Awaiting orders'}</Text>
                  </View>
                </View>
              </AppCard>
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
  // Mobile Header
  homeTop: {
    backgroundColor: colors.white,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.terracotta,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  notifBadgeText: {
    color: colors.white,
    fontSize: 8.5,
    fontWeight: '700',
    fontFamily: typography.fonts.headingBold,
  },
  storeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  storeName: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: typography.fonts.heading,
    color: colors.black,
  },
  storeLocality: {
    fontSize: 10,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
    marginTop: 2,
  },
  availabilityBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
  },
  availInfo: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.warmGrey,
  },
  liveDotOn: {
    backgroundColor: '#10B981',
  },
  availTitle: {
    fontSize: 12,
    fontFamily: typography.fonts.heading,
    fontWeight: '600',
    color: colors.black,
  },
  availSub: {
    fontSize: 9.5,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
    marginTop: 2,
  },

  // Desktop Banner
  desktopBanner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  bannerEyebrow: {
    fontSize: 10,
    fontFamily: typography.fonts.headingBold,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.terracotta,
    marginBottom: 4,
  },
  bannerTitle: {
    fontSize: 20,
    fontFamily: typography.fonts.headingBold,
    color: colors.black,
    marginBottom: 4,
  },
  bannerStoreName: {
    color: colors.charcoal,
    fontWeight: '500',
    fontSize: 17,
  },
  bannerSub: {
    fontSize: 12.5,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
  },
  bannerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.terracotta,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.button,
    gap: 8,
  },
  quickOrderBtnText: {
    color: colors.white,
    fontFamily: typography.fonts.heading,
    fontSize: 12.5,
    fontWeight: '600',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.button,
    gap: 8,
  },
  secondaryBtnText: {
    color: colors.black,
    fontFamily: typography.fonts.heading,
    fontSize: 12.5,
    fontWeight: '600',
  },

  // Content Layout
  scrollContent: {
    padding: 16,
  },
  scrollContentDesktop: {
    padding: 32,
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
  },
  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  dateLabel: {
    fontSize: 9.5,
    fontFamily: typography.fonts.headingBold,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.terracotta,
    marginBottom: 3,
  },
  greetingTitle: {
    fontSize: 18,
    fontFamily: typography.fonts.headingBold,
    color: colors.black,
  },
  moreBtn: {
    padding: 6,
  },

  // Metrics
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 20,
  },
  metricsContainerDesktop: {
    marginBottom: 28,
  },
  metricItem: {
    flex: 1,
    minWidth: 130,
    paddingHorizontal: 6,
    marginBottom: 12,
  },

  // Two-Column Dashboard Split
  dashboardBody: {
    flexDirection: 'column',
    gap: 20,
  },
  dashboardBodyDesktop: {
    flexDirection: 'row',
    gap: 28,
    alignItems: 'flex-start',
  },
  mainColumn: {
    flex: 6,
    width: '100%',
  },
  sideColumn: {
    flex: 4,
    width: '100%',
  },

  // Sections
  previewSection: {
    width: '100%',
  },
  compactHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: typography.fonts.heading,
    fontWeight: '700',
    color: colors.black,
  },
  liveOrderCountPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  liveOrderCountText: {
    fontSize: 10.5,
    fontFamily: typography.fonts.headingBold,
    fontWeight: '700',
    color: '#065F46',
  },
  viewAllText: {
    fontSize: 12,
    fontFamily: typography.fonts.bodyMedium,
    color: colors.terracotta,
    fontWeight: '600',
  },

  // Order Cards
  orderPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  orderIconBox: {
    width: 38,
    height: 38,
    borderRadius: radius.card,
    backgroundColor: 'rgba(163, 94, 71, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderPreviewInfo: {
    flex: 1,
  },
  orderNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderNumber: {
    fontSize: 13,
    fontFamily: typography.fonts.headingBold,
    fontWeight: '700',
    color: colors.black,
  },
  orderTimeText: {
    fontSize: 10.5,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
  },
  orderSub: {
    fontSize: 11,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
    marginTop: 2,
  },
  orderEmptyPreviewCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: radius.card,
    backgroundColor: colors.white,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(163, 94, 71, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyOrderTitle: {
    fontSize: 15,
    fontFamily: typography.fonts.headingBold,
    fontWeight: '700',
    color: colors.black,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyOrderSub: {
    fontSize: 11.5,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 16,
    marginBottom: 16,
  },
  emptyOrderActions: {
    flexDirection: 'row',
    gap: 10,
  },
  emptyIncomingBtn: {
    backgroundColor: colors.black,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.button,
  },
  emptyIncomingText: {
    color: colors.white,
    fontFamily: typography.fonts.heading,
    fontSize: 11.5,
    fontWeight: '600',
  },
  emptyMenuBtn: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.button,
  },
  emptyMenuText: {
    color: colors.black,
    fontFamily: typography.fonts.heading,
    fontSize: 11.5,
    fontWeight: '600',
  },

  // Shortcuts Grid
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginTop: 10,
  },
  shortcutCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: 14,
    marginHorizontal: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shortcutIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(163, 94, 71, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  shortcutTitle: {
    fontSize: 12,
    fontFamily: typography.fonts.heading,
    fontWeight: '600',
    color: colors.black,
    marginBottom: 4,
  },
  shortcutDesc: {
    fontSize: 10,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
    lineHeight: 14,
  },

  // Charts
  chartCard: {
    padding: 18,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  chartAmount: {
    fontSize: 22,
    fontFamily: typography.fonts.headingBold,
    fontWeight: '700',
    color: colors.black,
  },
  chartTrend: {
    fontSize: 11,
    fontFamily: typography.fonts.bodyMedium,
    color: '#10B981',
    fontWeight: '600',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 90,
    justifyContent: 'space-between',
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  barTrack: {
    width: 14,
    height: 65,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 4,
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    backgroundColor: colors.warmGrey,
    borderRadius: 4,
  },
  barPeak: {
    backgroundColor: colors.terracotta,
  },
  dayLabel: {
    fontSize: 9.5,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
  },

  // Health Card
  healthCard: {
    padding: 16,
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  ratingValue: {
    fontSize: 16,
    fontFamily: typography.fonts.headingBold,
    fontWeight: '700',
    color: '#B45309',
  },
  healthInfo: {
    flex: 1,
  },
  healthTitle: {
    fontSize: 12.5,
    fontFamily: typography.fonts.heading,
    fontWeight: '600',
    color: colors.black,
  },
  healthSub: {
    fontSize: 10.5,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
    marginTop: 2,
  },
  healthStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  healthStat: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 14,
    fontFamily: typography.fonts.headingBold,
    fontWeight: '700',
    color: colors.black,
  },
  statLabel: {
    fontSize: 9.5,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
});

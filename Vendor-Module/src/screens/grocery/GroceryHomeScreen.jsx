import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { AppLogo } from '../../components/common/AppLogo';
import { AppIcon } from '../../components/common/AppIcon';
import { AppCard } from '../../components/common/AppCard';
import { MetricCard } from '../../components/common/MetricCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ToggleSwitch } from '../../components/common/ToggleSwitch';
import { useResponsive } from '../../theme/useResponsive';
import { useAppNavigation } from '../../navigation/NavigationContext';
import { useVendor } from '../../context/VendorContext';
import { useOnboarding } from '../../context/OnboardingContext';
import { getTimeBasedGreeting } from '../../utils/greeting';

export const GroceryHomeScreen = () => {
    const { navigate } = useAppNavigation();
    const { activeStore, isOnline, setIsOnline } = useVendor();
    const { businessDetails } = useOnboarding();
    const { isMobile } = useResponsive();

    const greeting = getTimeBasedGreeting();
    const vendorName = businessDetails?.ownerName || 'Partner';

    const todayShort = new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
    }).toUpperCase();

    return (<View style={styles.container}>
      {/* Top Header Card (Mobile Only) */}
      {isMobile && (
        <View style={styles.homeTop}>
          <View style={styles.brandRow}>
            <AppLogo />
            <TouchableOpacity style={styles.notificationBtn} onPress={() => navigate('notifications')} accessibilityLabel="Notifications">
              <AppIcon name="bell" size={20} color={colors.black}/>
            </TouchableOpacity>
          </View>

          <TouchableOpacity activeOpacity={0.8} style={styles.storeRow} onPress={() => navigate('stores')}>
            <View>
              <Text style={styles.storeName}>{activeStore?.name || 'My Grocery Store'}</Text>
              <Text style={styles.storeLocality}>
                {activeStore?.locality ? `${activeStore.locality}${activeStore.city ? `, ${activeStore.city}` : ''}` : 'Store Location'}
              </Text>
            </View>
            <AppIcon name="chevron" size={18} color={colors.charcoal}/>
          </TouchableOpacity>

          <View style={styles.availabilityBox}>
            <View style={styles.availInfo}>
              <View style={styles.statusRow}>
                <View style={[styles.liveDot, isOnline && styles.liveDotOn]}/>
                <Text style={styles.availTitle}>
                  {isOnline ? 'Store is online' : 'Store is offline'}
                </Text>
              </View>
              <Text style={styles.availSub}>
                {isOnline ? 'Receiving new orders' : 'Orders are paused'}
              </Text>
            </View>
            <ToggleSwitch on={isOnline} setOn={setIsOnline}/>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={[styles.scrollContent, !isMobile && styles.scrollContentDesktop]}>
        {/* Greeting Section */}
        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.dateLabel}>TODAY · {todayShort}</Text>
            <Text style={styles.greetingTitle}>{greeting}, {vendorName}</Text>
          </View>
          <TouchableOpacity
            style={styles.moreBtn}
            onPress={() => navigate('account')}
            accessibilityLabel="View profile and account settings"
          >
            <AppIcon name="user" size={20} color={colors.black}/>
          </TouchableOpacity>
        </View>

        {/* Metric Grid */}
        <View style={styles.metricGrid}>
          <MetricCard label="Net sales" value="₹0" note="No sales recorded yet" keyMetric/>
          <MetricCard label="Orders" value="0" note="0 in progress"/>
        </View>
        <View style={[styles.metricGrid, { marginTop: 10 }]}>
          <MetricCard label="Low stock" value="0" note="All stock healthy"/>
          <MetricCard label="Next payout" value="₹0" note="Daily automated settlement"/>
        </View>

        {/* Inventory Attention Preview */}
        <View style={styles.previewSection}>
          <View style={styles.compactHeading}>
            <Text style={styles.sectionTitle}>Inventory attention</Text>
            <TouchableOpacity onPress={() => navigate('low-stock')}>
              <Text style={styles.viewAllText}>View all</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity activeOpacity={0.8} onPress={() => navigate('inventory')}>
            <AppCard style={styles.orderPreviewCard}>
              <View style={styles.orderIconBox}>
                <AppIcon name="catalog" size={20} color={colors.terracotta}/>
              </View>
              <View style={styles.orderPreviewInfo}>
                <Text style={styles.orderNumber}>All stock levels healthy</Text>
                <Text style={styles.orderSub}>No products requiring immediate restocking</Text>
              </View>
              <StatusBadge neutral>Optimal</StatusBadge>
              <AppIcon name="chevron" size={17} color={colors.charcoal}/>
            </AppCard>
          </TouchableOpacity>
        </View>

        {/* Weekly Chart */}
        <View style={styles.previewSection}>
          <View style={styles.compactHeading}>
            <Text style={styles.sectionTitle}>Sales overview</Text>
            <TouchableOpacity onPress={() => navigate('analytics')}>
              <Text style={styles.viewAllText}>View report</Text>
            </TouchableOpacity>
          </View>

          <AppCard style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartAmount}>₹0</Text>
              <Text style={styles.chartTrend}>Weekly sales overview</Text>
            </View>

            <View style={styles.barsContainer}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (<View key={idx} style={styles.barColumn}>
                  <View style={styles.barTrack}>
                    <View style={[
                styles.barFill,
                { height: '6%' },
            ]}/>
                  </View>
                  <Text style={styles.dayLabel}>{day}</Text>
                </View>))}
            </View>
          </AppCard>
        </View>
      </ScrollView>
    </View>);
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F7F6',
    },
    homeTop: {
        backgroundColor: colors.white,
        paddingHorizontal: 18,
        paddingTop: 12,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(156, 154, 154, 0.18)',
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
        fontFamily: 'Poppins, sans-serif',
    },
    storeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(156, 154, 154, 0.16)',
    },
    storeName: {
        fontSize: 13,
        fontWeight: '600',
        fontFamily: 'Poppins, sans-serif',
        color: colors.black,
    },
    storeLocality: {
        fontSize: 10,
        fontFamily: 'DM Sans, sans-serif',
        color: colors.charcoal,
        marginTop: 2,
    },
    availabilityBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(156, 154, 154, 0.12)',
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
        backgroundColor: colors.terracotta,
    },
    availTitle: {
        fontSize: 12,
        fontWeight: '600',
        fontFamily: 'Poppins, sans-serif',
        color: colors.black,
    },
    availSub: {
        fontSize: 10,
        fontFamily: 'DM Sans, sans-serif',
        color: colors.charcoal,
        marginTop: 2,
        marginLeft: 15,
    },
    scrollContent: {
        padding: 18,
        paddingBottom: 28,
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
        fontSize: 9,
        fontFamily: 'Poppins, sans-serif',
        fontWeight: '600',
        color: colors.charcoal,
        letterSpacing: 1,
    },
    greetingTitle: {
        fontSize: 18,
        fontWeight: '700',
        fontFamily: 'Poppins, sans-serif',
        color: colors.black,
        marginTop: 2,
    },
    moreBtn: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    metricGrid: {
        flexDirection: 'row',
        gap: 10,
    },
    previewSection: {
        marginTop: 20,
    },
    compactHeading: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        fontFamily: 'Poppins, sans-serif',
        color: colors.black,
    },
    viewAllText: {
        fontSize: 12,
        fontWeight: '600',
        fontFamily: 'DM Sans, sans-serif',
        color: colors.terracotta,
    },
    orderPreviewCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        gap: 10,
    },
    orderIconBox: {
        width: 38,
        height: 38,
        borderRadius: 11,
        backgroundColor: 'rgba(163, 94, 71, 0.10)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    orderPreviewInfo: {
        flex: 1,
    },
    orderNumber: {
        fontSize: 11.5,
        fontWeight: '700',
        fontFamily: 'Poppins, sans-serif',
        color: colors.black,
    },
    orderSub: {
        fontSize: 9.5,
        fontFamily: 'DM Sans, sans-serif',
        color: colors.charcoal,
        marginTop: 2,
    },
    chartCard: {
        padding: 14,
    },
    chartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 10,
    },
    chartAmount: {
        fontSize: 16,
        fontWeight: '700',
        fontFamily: 'Poppins, sans-serif',
        color: colors.black,
    },
    chartTrend: {
        fontSize: 9.5,
        fontWeight: '600',
        fontFamily: 'DM Sans, sans-serif',
        color: colors.terracotta,
    },
    barsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 80,
        paddingTop: 8,
    },
    barColumn: {
        alignItems: 'center',
        flex: 1,
    },
    barTrack: {
        width: 20,
        height: 60,
        justifyContent: 'flex-end',
    },
    barFill: {
        width: '100%',
        backgroundColor: 'rgba(156, 154, 154, 0.35)',
        borderRadius: 4,
    },
    barPeak: {
        backgroundColor: colors.terracotta,
    },
    dayLabel: {
        fontSize: 8.5,
        fontFamily: 'Poppins, sans-serif',
        fontWeight: '600',
        color: colors.charcoal,
        marginTop: 6,
    },
});

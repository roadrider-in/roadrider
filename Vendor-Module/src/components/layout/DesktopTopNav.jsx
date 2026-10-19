import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { radius } from '../../theme/radius';
import { AppIcon } from '../common/AppIcon';
import { useResponsive } from '../../theme/useResponsive';
import { useAppNavigation } from '../../navigation/NavigationContext';
import { useVendor } from '../../context/VendorContext';
import { useOnboarding } from '../../context/OnboardingContext';

const SCREEN_TITLES = {
  'restaurant-home': 'Restaurant Dashboard',
  'grocery-home': 'Grocery Dashboard',
  'incoming': 'Live Orders',
  'active': 'Active Orders',
  'order-detail': 'Order Breakdown',
  'menu': 'Menu Management',
  'menu-item': 'Add / Edit Menu Item',
  'catalog': 'Product Catalog',
  'product': 'Add Grocery Product',
  'import': 'Bulk Inventory Import',
  'inventory': 'Live Inventory & Stock',
  'low-stock': 'Low Stock Alerts',
  'picking': 'Order Picking Queue',
  'analytics': 'Sales Analytics',
  'offers': 'Promotions & Coupons',
  'hours': 'Operating Hours',
  'delivery': 'Delivery Radius & Fees',
  'reviews': 'Customer Ratings',
  'restaurant-payout': 'Payouts & Banking',
  'support': 'Support Center',
  'notifications': 'Store Notifications',
  'account': 'Profile & Store Settings',
  'bank': 'Bank Account & Settlement',
  'stores': 'Outlets & Switcher',
  'states': 'System States',
  'signin': 'Partner Sign In',
  'profile-kyc': 'KYC & Regulatory Documents',
  'profile-business': 'Business Details',
  'profile-photos': 'Store Photos & Branding',
  'profile-location': 'Location & Service Radius',
  'onboard-outlet': 'Onboard New Outlet',
};

export const DesktopTopNav = () => {
  const { currentScreen, navigate, goBack, history, openDrawer } = useAppNavigation();
  const { activeStore, vendorType, isOnline, setIsOnline } = useVendor();
  const { businessDetails } = useOnboarding();
  const { isMobile, isTablet, isDesktop, isSmallMobile } = useResponsive();
  const [searchText, setSearchText] = React.useState('');

  const ownerName = businessDetails?.ownerName || 'Merchant Partner';
  const initials = ownerName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'RR';

  const title = SCREEN_TITLES[currentScreen] || 'RoadRider Vendor';
  const showBack = history && history.length > 1;

  const handleSearchSubmit = () => {
    if (!searchText.trim()) return;
    if (vendorType === 'grocery') {
      navigate('catalog');
    } else {
      navigate('incoming');
    }
  };

  return (
    <View style={[styles.header, isTablet && styles.headerTablet, isMobile && styles.headerMobile]}>
      {/* Page Title & Breadcrumb & Back / Hamburger */}
      <View style={styles.titleSection}>
        <View style={styles.titleRow}>
          {!isDesktop && (
            <TouchableOpacity
              onPress={openDrawer}
              style={styles.hamburgerButton}
              accessibilityLabel="Open navigation drawer"
              accessibilityRole="button"
            >
              <AppIcon name="hamburger" size={19} color={colors.black} />
            </TouchableOpacity>
          )}

          {showBack && (
            <TouchableOpacity
              onPress={goBack}
              style={styles.backButton}
              accessibilityLabel="Back"
              accessibilityRole="button"
            >
              <AppIcon name="arrow" size={18} color={colors.black} />
            </TouchableOpacity>
          )}

          <View style={styles.titleTexts}>
            {isDesktop && <Text style={styles.breadcrumb}>ROADRIDER VENDOR /</Text>}
            <Text style={[styles.screenTitle, isMobile && styles.screenTitleMobile]} numberOfLines={1}>
              {title}
            </Text>
          </View>
        </View>
      </View>

      {/* Global Search (full search box on desktop, icon on tablet, hidden on small mobile) */}
      {isDesktop ? (
        <View style={styles.searchBox}>
          <TouchableOpacity onPress={handleSearchSubmit} accessibilityLabel="Search">
            <AppIcon name="search" size={17} color={colors.warmGrey} />
          </TouchableOpacity>
          <TextInput
            placeholder="Search orders, menu items, SKUs..."
            placeholderTextColor={colors.warmGrey}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            style={styles.searchInput}
          />
        </View>
      ) : !isSmallMobile ? (
        <TouchableOpacity
          style={styles.tabletSearchBtn}
          onPress={() => navigate(vendorType === 'grocery' ? 'catalog' : 'incoming')}
          accessibilityLabel="Search"
        >
          <AppIcon name="search" size={18} color={colors.charcoal} />
        </TouchableOpacity>
      ) : null}

      {/* Right Actions */}
      <View style={[styles.rightActions, isMobile && styles.rightActionsMobile]}>
        {/* Live Status Pill */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.statusPill, isOnline ? styles.statusPillOn : styles.statusPillOff]}
          onPress={() => setIsOnline(!isOnline)}
        >
          <View style={[styles.statusDot, isOnline ? styles.statusDotOn : styles.statusDotOff]} />
          {!isSmallMobile && (
            <Text style={[styles.statusPillText, isOnline ? styles.statusPillTextOn : styles.statusPillTextOff]}>
              {isMobile
                ? isOnline
                  ? 'Online'
                  : 'Off'
                : isTablet
                ? isOnline
                  ? 'Online'
                  : 'Paused'
                : isOnline
                ? 'Online • Taking Orders'
                : 'Store Paused'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Store Switcher on Desktop */}
        {isDesktop && (
          <TouchableOpacity
            style={styles.storePicker}
            onPress={() => navigate('stores')}
            accessibilityLabel="Switch Store"
          >
            <AppIcon name="store" size={17} color={colors.charcoal} />
            <Text style={styles.storePickerText} numberOfLines={1}>
              {activeStore?.name || 'Select Outlet'}
            </Text>
            <AppIcon name="chevron" size={14} color={colors.warmGrey} />
          </TouchableOpacity>
        )}

        {/* Notifications */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigate('notifications')}
          accessibilityLabel="Notifications"
        >
          <AppIcon name="bell" size={18} color={colors.black} />
        </TouchableOpacity>

        {/* User Profile Pill */}
        <TouchableOpacity
          style={styles.profilePill}
          onPress={() => navigate('account')}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          {isDesktop && (
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{ownerName}</Text>
              <Text style={styles.profileRole}>Owner</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 68,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    zIndex: 9,
  },
  headerTablet: {
    paddingHorizontal: 16,
    height: 60,
  },
  headerMobile: {
    paddingHorizontal: 12,
    height: 56,
  },
  titleSection: {
    minWidth: 100,
    flexShrink: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hamburgerButton: {
    width: 34,
    height: 34,
    borderRadius: radius.button,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: radius.button,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleTexts: {
    flexShrink: 1,
  },
  screenTitleMobile: {
    fontSize: 14.5,
  },
  breadcrumb: {
    fontSize: 9.5,
    fontFamily: typography.fonts.headingBold,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: colors.warmGrey,
  },
  screenTitle: {
    fontSize: 16,
    fontFamily: typography.fonts.heading,
    fontWeight: '700',
    color: colors.black,
    marginTop: 2,
  },
  searchBox: {
    flex: 1,
    maxWidth: 340,
    marginHorizontal: 16,
    height: 38,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  tabletSearchBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.button,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: typography.fonts.body,
    color: colors.black,
    outlineStyle: 'none',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusPillOn: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  statusPillOff: {
    backgroundColor: 'rgba(156, 154, 154, 0.15)',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusDotOn: {
    backgroundColor: '#10B981',
  },
  statusDotOff: {
    backgroundColor: colors.warmGrey,
  },
  statusPillText: {
    fontSize: 11,
    fontFamily: typography.fonts.bodyMedium,
    fontWeight: '600',
  },
  statusPillTextOn: {
    color: '#065F46',
  },
  statusPillTextOff: {
    color: colors.charcoal,
  },
  storePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.button,
    gap: 6,
    maxWidth: 150,
  },
  storePickerText: {
    fontSize: 11,
    fontFamily: typography.fonts.bodyMedium,
    color: colors.black,
    fontWeight: '600',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.button,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 3,
    right: 3,
    backgroundColor: colors.terracotta,
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: colors.white,
    fontSize: 8,
    fontFamily: typography.fonts.headingBold,
    fontWeight: '700',
  },
  profilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 3,
    paddingRight: 8,
    paddingVertical: 3,
    borderRadius: 24,
    backgroundColor: colors.surfaceSubtle,
    gap: 6,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.charcoal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: 10,
    fontFamily: typography.fonts.headingBold,
    fontWeight: '700',
  },
  profileInfo: {},
  profileName: {
    fontSize: 11,
    fontFamily: typography.fonts.heading,
    fontWeight: '600',
    color: colors.black,
    lineHeight: 13,
  },
  profileRole: {
    fontSize: 9,
    fontFamily: typography.fonts.body,
    color: colors.warmGrey,
  },
});

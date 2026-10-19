import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { AppIcon } from '../common/AppIcon';
import { useAppNavigation } from '../../navigation/NavigationContext';
import { useVendor } from '../../context/VendorContext';
export const BottomTabBar = () => {
    const { currentScreen, navigate } = useAppNavigation();
    const { vendorType } = useVendor();
    const isGrocery = vendorType === 'grocery';
    const restaurantTabs = [
        { icon: 'home', label: 'Home', screenId: 'restaurant-home' },
        { icon: 'orders', label: 'Orders', screenId: 'incoming' },
        { icon: 'catalog', label: 'Menu', screenId: 'menu' },
        { icon: 'wallet', label: 'Payouts', screenId: 'restaurant-payout' },
        { icon: 'user', label: 'Account', screenId: 'account' },
    ];
    const groceryTabs = [
        { icon: 'home', label: 'Home', screenId: 'grocery-home' },
        { icon: 'orders', label: 'Picking', screenId: 'picking' },
        { icon: 'catalog', label: 'Catalog', screenId: 'catalog' },
        { icon: 'wallet', label: 'Analytics', screenId: 'analytics' },
        { icon: 'user', label: 'Account', screenId: 'account' },
    ];
    const tabs = isGrocery ? groceryTabs : restaurantTabs;
    return (<View style={styles.container}>
      {tabs.map((tab) => {
            const isActive = currentScreen === tab.screenId ||
                (tab.label === 'Orders' && ['incoming', 'active', 'order-detail'].includes(currentScreen)) ||
                (tab.label === 'Menu' && ['menu', 'menu-item'].includes(currentScreen)) ||
                (tab.label === 'Catalog' && ['catalog', 'product', 'import', 'inventory', 'low-stock'].includes(currentScreen));
            const activeColor = colors.terracotta;
            const inactiveColor = colors.black;
            return (<TouchableOpacity key={tab.label} activeOpacity={0.7} onPress={() => navigate(tab.screenId)} style={styles.tabButton} accessibilityRole="tab" accessibilityState={{ selected: isActive }}>
            <AppIcon name={tab.icon} size={21} color={isActive ? activeColor : inactiveColor} strokeWidth={isActive ? 2.1 : 1.8}/>
            <Text style={[
                    styles.tabLabel,
                    { color: isActive ? activeColor : inactiveColor },
                    isActive && styles.activeTabLabel,
                ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>);
        })}
    </View>);
};
const styles = StyleSheet.create({
    container: {
        height: 70,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: 'rgba(156, 154, 154, 0.25)',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingBottom: 6,
        paddingHorizontal: 8,
    },
    tabButton: {
        flex: 1,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 3,
    },
    tabLabel: {
        fontSize: 9.5,
        fontFamily: 'Poppins, sans-serif',
        fontWeight: '500',
    },
    activeTabLabel: {
        fontWeight: '600',
    },
});

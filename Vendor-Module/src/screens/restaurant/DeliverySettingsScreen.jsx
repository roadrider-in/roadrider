import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../../theme/colors';
import { AppHeader } from '../../components/common/AppHeader';
import { AppCard } from '../../components/common/AppCard';
import { AppIcon } from '../../components/common/AppIcon';
import { useAppNavigation } from '../../navigation/NavigationContext';
export const DeliverySettingsScreen = () => {
    const { goBack } = useAppNavigation();
    const settings = [
        { title: 'Platform delivery', sub: 'RoadRider partners · Active' },
        { title: 'Self-delivery', sub: 'Not configured' },
        { title: 'Delivery radius', sub: '6 km' },
        { title: 'Base delivery fee', sub: '₹35' },
    ];
    return (<View style={styles.container}>
      <AppHeader title="Delivery settings" onBack={goBack}/>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.eyebrow}>FULFILMENT</Text>

        <AppCard style={styles.listCard}>
          {settings.map((item, idx) => (<View key={item.title} style={[styles.row, idx === settings.length - 1 && styles.lastRow]}>
              <View style={styles.rowInfo}>
                <Text style={styles.titleText}>{item.title}</Text>
                <Text style={styles.subText}>{item.sub}</Text>
              </View>
              <AppIcon name="chevron" size={18} color={colors.charcoal}/>
            </View>))}
        </AppCard>
      </ScrollView>
    </View>);
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F7F6',
    },
    scrollContent: {
        padding: 18,
        paddingBottom: 28,
        maxWidth: 680,
        width: '100%',
        alignSelf: 'center',
    },
    eyebrow: {
        fontSize: 10,
        fontWeight: '700',
        fontFamily: 'Poppins, sans-serif',
        letterSpacing: 1.4,
        color: colors.terracotta,
        marginBottom: 10,
    },
    listCard: {
        padding: 6,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(156, 154, 154, 0.18)',
    },
    lastRow: {
        borderBottomWidth: 0,
    },
    rowInfo: {
        flex: 1,
    },
    titleText: {
        fontSize: 12.5,
        fontWeight: '600',
        fontFamily: 'Poppins, sans-serif',
        color: colors.black,
    },
    subText: {
        fontSize: 9.5,
        fontFamily: 'DM Sans, sans-serif',
        color: colors.charcoal,
        marginTop: 2,
    },
});

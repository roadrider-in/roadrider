import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { AppHeader } from '../../components/common/AppHeader';
import { AppCard } from '../../components/common/AppCard';
import { useAppNavigation } from '../../navigation/NavigationContext';
export const SalesAnalyticsScreen = () => {
    const { goBack } = useAppNavigation();
    const [period, setPeriod] = useState('30');
    // Real vendors start with empty analytics; populated as customer orders are placed
    const [topProducts, setTopProducts] = useState([]);
    const [categoryShares, setCategoryShares] = useState([]);

    return (<View style={styles.container}>
      <AppHeader title="Sales analytics" onBack={goBack}/>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Period Filter Pills */}
        <View style={styles.filterPills}>
          {['7', '30', '90'].map((p) => {
            const isActive = period === p;
            return (<TouchableOpacity key={p} onPress={() => setPeriod(p)} style={[styles.pill, isActive && styles.pillActive]}>
                <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                  {p} days
                </Text>
              </TouchableOpacity>);
        })}
        </View>

        {/* Analytics Hero Card with SVG Trend Graph */}
        <AppCard style={styles.heroCard}>
          <Text style={styles.heroLabel}>NET SALES</Text>
          <Text style={styles.heroAmount}>₹0</Text>
          <Text style={styles.heroTrend}>Performance metrics will appear as orders are fulfilled</Text>

          <View style={styles.chartWrapper}>
            <Svg width="100%" height={90} viewBox="0 0 330 90">
              <Path d="M0 79 C40 79 180 79 330 79" fill="none" stroke={colors.warmGrey} strokeWidth={1.5} strokeDasharray="4 4"/>
              <Path d="M0 79 C80 79 200 79 330 79" fill="none" stroke={colors.terracotta} strokeWidth={2.5} strokeLinecap="round"/>
            </Svg>
          </View>
        </AppCard>

        {/* Top Products Section */}
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Top products</Text>
        </View>

        {topProducts.length === 0 ? (
          <AppCard style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No top products yet</Text>
            <Text style={styles.emptySub}>
              Best-selling grocery catalog items will be automatically ranked here by units sold and revenue.
            </Text>
          </AppCard>
        ) : (
          <AppCard style={styles.rankCard}>
            {topProducts.map((p, idx) => (<View key={p.name} style={[
                  styles.rankRow,
                  idx === topProducts.length - 1 && styles.lastRankRow,
              ]}>
                <Text style={styles.rankIndex}>0{idx + 1}</Text>
                <View style={styles.rankInfo}>
                  <Text style={styles.rankTitle}>{p.name}</Text>
                  <Text style={styles.rankSub}>{p.unitsSold} units sold</Text>
                </View>
                <Text style={styles.rankRevenue}>{p.revenue}</Text>
              </View>))}
          </AppCard>
        )}

        {/* Category Performance */}
        <View style={[styles.sectionHeading, { marginTop: 22 }]}>
          <Text style={styles.sectionTitle}>Category performance</Text>
        </View>

        {categoryShares.length === 0 ? (
          <AppCard style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No category sales data yet</Text>
            <Text style={styles.emptySub}>
              Category revenue share percentages will populate as customer purchases are recorded across your catalog.
            </Text>
          </AppCard>
        ) : (
          <AppCard style={styles.categoryCard}>
            {categoryShares.map((cat, idx) => (<View key={cat.category} style={[
                  styles.catRow,
                  idx === categoryShares.length - 1 && styles.lastCatRow,
              ]}>
                <View style={styles.catLabels}>
                  <Text style={styles.catName}>{cat.category}</Text>
                  <Text style={styles.catPercent}>{cat.percentage}%</Text>
                </View>
                <View style={styles.catTrack}>
                  <View style={[styles.catFill, { width: `${cat.percentage}%` }]}/>
                </View>
              </View>))}
          </AppCard>
        )}
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
    filterPills: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    pill: {
        minHeight: 34,
        paddingHorizontal: 14,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: 'rgba(156, 154, 154, 0.35)',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.white,
    },
    pillActive: {
        backgroundColor: colors.black,
        borderColor: colors.black,
    },
    pillText: {
        fontSize: 10,
        fontFamily: 'Poppins, sans-serif',
        fontWeight: '500',
        color: colors.charcoal,
    },
    pillTextActive: {
        color: colors.white,
        fontWeight: '600',
    },
    heroCard: {
        padding: 16,
        marginBottom: 20,
    },
    heroLabel: {
        fontSize: 9,
        fontFamily: 'Poppins, sans-serif',
        fontWeight: '700',
        color: colors.charcoal,
        letterSpacing: 1.4,
    },
    heroAmount: {
        fontSize: 28,
        fontWeight: '700',
        fontFamily: 'Poppins, sans-serif',
        color: colors.black,
        marginVertical: 4,
    },
    heroTrend: {
        fontSize: 10,
        fontWeight: '600',
        fontFamily: 'DM Sans, sans-serif',
        color: colors.terracotta,
    },
    chartWrapper: {
        marginTop: 14,
        height: 90,
    },
    sectionHeading: {
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
    rankCard: {
        padding: 6,
    },
    rankRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(156, 154, 154, 0.18)',
        gap: 12,
    },
    lastRankRow: {
        borderBottomWidth: 0,
    },
    rankIndex: {
        fontSize: 12,
        fontFamily: 'Poppins, sans-serif',
        fontWeight: '700',
        color: colors.warmGrey,
        width: 24,
    },
    rankInfo: {
        flex: 1,
    },
    rankTitle: {
        fontSize: 12,
        fontWeight: '600',
        fontFamily: 'Poppins, sans-serif',
        color: colors.black,
    },
    rankSub: {
        fontSize: 9.5,
        fontFamily: 'DM Sans, sans-serif',
        color: colors.charcoal,
        marginTop: 2,
    },
    rankRevenue: {
        fontSize: 12,
        fontWeight: '700',
        fontFamily: 'Poppins, sans-serif',
        color: colors.black,
    },
    categoryCard: {
        padding: 16,
    },
    catRow: {
        marginBottom: 14,
    },
    lastCatRow: {
        marginBottom: 0,
    },
    catLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    catName: {
        fontSize: 11,
        fontFamily: 'DM Sans, sans-serif',
        color: colors.charcoal,
    },
    catPercent: {
        fontSize: 11,
        fontWeight: '700',
        fontFamily: 'Poppins, sans-serif',
        color: colors.black,
    },
    catTrack: {
        height: 5,
        borderRadius: 3,
        backgroundColor: 'rgba(156, 154, 154, 0.20)',
        overflow: 'hidden',
    },
    catFill: {
        height: '100%',
        backgroundColor: colors.terracotta,
        borderRadius: 3,
    },
    emptyCard: {
        alignItems: 'center',
        padding: 24,
        borderRadius: radius.card,
        backgroundColor: colors.white,
    },
    emptyTitle: {
        fontSize: 14,
        fontWeight: '700',
        fontFamily: 'Poppins, sans-serif',
        color: colors.black,
        marginBottom: 4,
        textAlign: 'center',
    },
    emptySub: {
        fontSize: 11.5,
        fontFamily: 'DM Sans, sans-serif',
        color: colors.charcoal,
        textAlign: 'center',
        lineHeight: 17,
        maxWidth: 320,
    },
});

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { AppHeader } from '../../components/common/AppHeader';
import { AppCard } from '../../components/common/AppCard';
import { AppIcon } from '../../components/common/AppIcon';
import { useAppNavigation } from '../../navigation/NavigationContext';
import { useVendor } from '../../context/VendorContext';
export const StoreSwitcherScreen = () => {
    const { navigate, goBack } = useAppNavigation();
    const { stores, activeStore, switchStore } = useVendor();
    const handleSelectStore = (storeId) => {
        switchStore(storeId);
        const targetStore = stores.find((s) => s.id === storeId);
        if (targetStore?.type === 'grocery') {
            navigate('grocery-home');
        }
        else {
            navigate('restaurant-home');
        }
    };
    return (<View style={styles.container}>
      <AppHeader title="Switch store" onBack={goBack} action={<TouchableOpacity style={styles.headerBtn}>
            <AppIcon name="plus" size={20} color={colors.black}/>
          </TouchableOpacity>}/>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageIntro}>
          Choose which outlet you want to manage.
        </Text>

        {stores.length === 0 ? (
          <AppCard style={{ padding: 24, alignItems: 'center' }}>
            <AppIcon name="store" size={32} color={colors.terracotta} />
            <Text style={{ fontSize: 13, fontWeight: '700', fontFamily: 'Poppins, sans-serif', color: colors.black, marginTop: 8 }}>
              No outlets registered yet
            </Text>
            <Text style={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', color: colors.charcoal, marginTop: 4, textAlign: 'center' }}>
              Your business outlets will appear here once onboarded.
            </Text>
          </AppCard>
        ) : (
          <View style={styles.storeList}>
            {stores.map((st) => {
              const isSelected = st.id === activeStore?.id;
              return (
                <TouchableOpacity key={st.id} activeOpacity={0.8} onPress={() => handleSelectStore(st.id)}>
                  <AppCard style={[
                      styles.storeCard,
                      isSelected && styles.storeCardSelected,
                  ]}>
                    <View style={styles.storeAvatar}>
                      <AppIcon name="store" size={20} color={colors.charcoal}/>
                    </View>

                    <View style={styles.storeInfo}>
                      <Text style={styles.storeName}>{st.name}</Text>
                      <Text style={styles.storeType}>
                        {st.locality} · {st.type === 'restaurant' ? 'Restaurant' : 'Grocery'}
                      </Text>
                    </View>

                    {isSelected ? (
                      <View style={styles.selectedBadge}>
                        <AppIcon name="check" size={13} color={colors.white} strokeWidth={2.8}/>
                      </View>
                    ) : (
                      <AppIcon name="chevron" size={18} color={colors.charcoal}/>
                    )}
                  </AppCard>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>);
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
    scrollContent: {
        padding: 18,
        paddingBottom: 28,
        maxWidth: 680,
        width: '100%',
        alignSelf: 'center',
    },
    pageIntro: {
        fontSize: 12.5,
        fontFamily: 'DM Sans, sans-serif',
        color: colors.charcoal,
        marginBottom: 16,
    },
    storeList: {
        gap: 12,
    },
    storeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        gap: 12,
    },
    storeCardSelected: {
        borderColor: colors.terracotta,
        borderWidth: 1.5,
    },
    storeAvatar: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(156, 154, 154, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    storeInfo: {
        flex: 1,
    },
    storeName: {
        fontSize: 12.5,
        fontWeight: '700',
        fontFamily: 'Poppins, sans-serif',
        color: colors.black,
    },
    storeType: {
        fontSize: 10,
        fontFamily: 'DM Sans, sans-serif',
        color: colors.charcoal,
        marginTop: 2,
    },
    selectedBadge: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: colors.terracotta,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

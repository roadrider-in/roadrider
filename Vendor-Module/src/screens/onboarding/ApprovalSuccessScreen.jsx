import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../../theme/colors';
import { AppLogo } from '../../components/common/AppLogo';
import { AppButton } from '../../components/common/AppButton';
import { AppIcon } from '../../components/common/AppIcon';
import { useAppNavigation } from '../../navigation/NavigationContext';
import { useVendor } from '../../context/VendorContext';
export const ApprovalSuccessScreen = () => {
    const { navigate } = useAppNavigation();
    const { vendorType } = useVendor();
    const handleLaunch = () => {
        if (vendorType === 'grocery') {
            navigate('grocery-home');
        }
        else {
            navigate('restaurant-home');
        }
    };
    return (<View style={styles.container}>
      <View style={styles.header}>
        <AppLogo compact/>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.illustrationWrapper}>
          <View style={styles.circleBg}>
            <View style={styles.innerBadge}>
              <AppIcon name="check" size={38} color={colors.white} strokeWidth={2.8}/>
            </View>
            <View style={styles.decorDot1}/>
            <View style={styles.decorDot2}/>
          </View>
        </View>

        <Text style={styles.eyebrow}>APPLICATION APPROVED</Text>
        <Text style={styles.title}>You’re ready to start selling</Text>
        <Text style={styles.subtitle}>
          Your store is live. Set up your menu and begin accepting orders.
        </Text>

        <View style={styles.actions}>
          <AppButton onPress={handleLaunch}>
            Go to dashboard
          </AppButton>
        </View>
      </ScrollView>
    </View>);
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    header: {
        paddingTop: 16,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    scrollContent: {
        padding: 24,
        alignItems: 'center',
        flexGrow: 1,
        justifyContent: 'center',
    },
    illustrationWrapper: {
        marginVertical: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    circleBg: {
        width: 135,
        height: 135,
        borderRadius: 67.5,
        backgroundColor: 'rgba(156, 154, 154, 0.14)',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    innerBadge: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: colors.terracotta,
        justifyContent: 'center',
        alignItems: 'center',
    },
    decorDot1: {
        position: 'absolute',
        left: 8,
        top: 15,
        width: 11,
        height: 11,
        borderRadius: 3,
        backgroundColor: colors.terracotta,
        transform: [{ rotate: '25deg' }],
    },
    decorDot2: {
        position: 'absolute',
        right: 5,
        bottom: 25,
        width: 11,
        height: 11,
        borderRadius: 3,
        backgroundColor: colors.black,
    },
    eyebrow: {
        fontSize: 10,
        fontWeight: '700',
        fontFamily: 'Poppins, sans-serif',
        letterSpacing: 1.4,
        color: colors.terracotta,
        marginBottom: 8,
        textAlign: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        fontFamily: 'Poppins, sans-serif',
        color: colors.black,
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 12.5,
        fontFamily: 'DM Sans, sans-serif',
        color: colors.charcoal,
        textAlign: 'center',
        lineHeight: 18,
        maxWidth: 290,
        marginBottom: 24,
    },
    actions: {
        width: '100%',
        marginTop: 10,
    },
});

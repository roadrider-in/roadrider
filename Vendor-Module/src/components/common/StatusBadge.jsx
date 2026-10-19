import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { AppIcon } from './AppIcon';
export const StatusBadge = ({ children, neutral = false, iconName, }) => {
    const icon = iconName || (neutral ? 'clock' : 'check');
    const iconColor = neutral ? colors.charcoal : colors.terracotta;
    return (<View style={[styles.badge, neutral ? styles.neutralBadge : styles.terracottaBadge]}>
      <AppIcon name={icon} size={11} color={iconColor} strokeWidth={2.2}/>
      <Text style={[styles.text, neutral ? styles.neutralText : styles.terracottaText]}>
        {children}
      </Text>
    </View>);
};
const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: radius.pill,
        paddingVertical: 4,
        paddingHorizontal: 8,
        alignSelf: 'flex-start',
    },
    terracottaBadge: {
        backgroundColor: 'rgba(163, 94, 71, 0.10)',
    },
    neutralBadge: {
        backgroundColor: 'rgba(156, 154, 154, 0.18)',
    },
    text: {
        fontSize: 9.5,
        fontWeight: '600',
        fontFamily: 'Poppins, sans-serif',
    },
    terracottaText: {
        color: colors.terracotta,
    },
    neutralText: {
        color: colors.charcoal,
    },
});

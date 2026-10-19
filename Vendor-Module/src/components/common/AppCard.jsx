import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';
export const AppCard = ({ children, style }) => {
    return <View style={[styles.card, shadows.card, style]}>{children}</View>;
};
const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: 'rgba(156, 154, 154, 0.18)',
        borderRadius: radius.card,
        padding: 14,
    },
});

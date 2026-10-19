import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { AppCard } from './AppCard';
import { AppButton } from './AppButton';
import { AppIcon } from './AppIcon';
export const EmptyState = ({ title, description, iconName = 'orders', actionText, onAction, style, }) => {
    return (<AppCard style={[styles.card, style]}>
      <View style={styles.iconCircle}>
        <AppIcon name={iconName} size={28} color={colors.charcoal} strokeWidth={1.8}/>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionText && onAction && (<AppButton secondary onPress={onAction} style={styles.button}>
          {actionText}
        </AppButton>)}
    </AppCard>);
};
const styles = StyleSheet.create({
    card: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
    },
    iconCircle: {
        width: 58,
        height: 58,
        borderRadius: 18,
        backgroundColor: 'rgba(156, 154, 154, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        fontFamily: 'Poppins, sans-serif',
        color: colors.black,
        marginBottom: 6,
        textAlign: 'center',
    },
    description: {
        fontSize: 11,
        color: colors.charcoal,
        fontFamily: 'DM Sans, sans-serif',
        textAlign: 'center',
        lineHeight: 16,
        maxWidth: 240,
        marginBottom: 16,
    },
    button: {
        minHeight: 42,
        width: '100%',
    },
});

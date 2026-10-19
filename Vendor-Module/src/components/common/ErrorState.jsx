import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { AppCard } from './AppCard';
import { AppButton } from './AppButton';
import { AppIcon } from './AppIcon';
export const ErrorState = ({ title = 'Something went wrong', description = "We couldn't load your data. Check your connection and try again.", onRetry, style, }) => {
    return (<AppCard style={[styles.card, style]}>
      <View style={styles.iconCircle}>
        <AppIcon name="close" size={28} color={colors.terracotta} strokeWidth={2}/>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {onRetry && (<AppButton onPress={onRetry} style={styles.button}>
          Try again
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
        backgroundColor: 'rgba(163, 94, 71, 0.10)',
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

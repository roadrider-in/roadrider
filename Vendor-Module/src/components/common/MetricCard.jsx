import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { AppCard } from './AppCard';
export const MetricCard = ({ label, value, note, keyMetric = false, style, }) => {
    return (<AppCard style={[styles.card, style]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, keyMetric && styles.keyMetricValue]}>{value}</Text>
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </AppCard>);
};
const styles = StyleSheet.create({
    card: {
        flex: 1,
        minHeight: 96,
        padding: 13,
        justifyContent: 'space-between',
    },
    label: {
        fontSize: 11,
        color: colors.charcoal,
        fontFamily: 'DM Sans, sans-serif',
    },
    value: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.black,
        fontFamily: 'Poppins, sans-serif',
        marginVertical: 4,
    },
    keyMetricValue: {
        color: colors.terracotta,
    },
    note: {
        fontSize: 9.5,
        color: colors.charcoal,
        fontFamily: 'DM Sans, sans-serif',
    },
});

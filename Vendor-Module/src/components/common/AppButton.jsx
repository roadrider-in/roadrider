import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View, } from 'react-native';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
export const AppButton = ({ children, onPress, secondary = false, disabled = false, loading = false, style, textStyle, icon, }) => {
    return (<TouchableOpacity activeOpacity={0.8} onPress={onPress} disabled={disabled || loading} style={[
            styles.button,
            secondary ? styles.secondaryButton : styles.primaryButton,
            disabled && styles.disabledButton,
            style,
        ]}>
      {loading ? (<ActivityIndicator size="small" color={secondary ? colors.black : colors.white}/>) : (<View style={styles.contentRow}>
          {icon && <View style={styles.iconWrapper}>{icon}</View>}
          <Text style={[
                styles.text,
                secondary ? styles.secondaryText : styles.primaryText,
                disabled && styles.disabledText,
                textStyle,
            ]}>
            {children}
          </Text>
        </View>)}
    </TouchableOpacity>);
};
const styles = StyleSheet.create({
    button: {
        minHeight: 48,
        borderRadius: radius.button,
        paddingHorizontal: 18,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    primaryButton: {
        backgroundColor: colors.terracotta,
    },
    secondaryButton: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.black,
    },
    disabledButton: {
        opacity: 0.5,
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    iconWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        fontSize: 14,
        fontWeight: '600',
        fontFamily: 'Poppins, sans-serif',
    },
    primaryText: {
        color: colors.white,
    },
    secondaryText: {
        color: colors.black,
    },
    disabledText: {
        color: colors.warmGrey,
    },
});

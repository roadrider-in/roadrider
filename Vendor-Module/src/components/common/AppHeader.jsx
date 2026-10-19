import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { AppIcon } from './AppIcon';
import { AppLogo } from './AppLogo';
import { useAppNavigation } from '../../navigation/NavigationContext';

export const AppHeader = ({
  title,
  onBack,
  action,
  showLogoWhenNoBack = true,
  showDrawerButton = true,
  style,
}) => {
  const { openDrawer } = useAppNavigation();

  return (
    <View style={[styles.header, style]}>
      <View style={styles.leftContainer}>
        {onBack ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onBack}
            style={styles.iconButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <AppIcon name="arrow" size={20} color={colors.black} />
          </TouchableOpacity>
        ) : showDrawerButton ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={openDrawer}
            style={styles.iconButton}
            accessibilityLabel="Open navigation menu"
            accessibilityRole="button"
          >
            <AppIcon name="hamburger" size={20} color={colors.black} />
          </TouchableOpacity>
        ) : showLogoWhenNoBack ? (
          <AppLogo compact />
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      <View style={styles.titleContainer}>
        {title ? (
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
        ) : null}
      </View>

      <View style={styles.rightContainer}>
        {action ? action : <View style={styles.placeholder} />}
      </View>
    </View>
  );
};
const styles = StyleSheet.create({
    header: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(156, 154, 154, 0.18)',
        zIndex: 10,
    },
    leftContainer: {
        minWidth: 44,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.black,
        fontFamily: 'Poppins, sans-serif',
        textAlign: 'center',
    },
    rightContainer: {
        minWidth: 44,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholder: {
        width: 40,
    },
});

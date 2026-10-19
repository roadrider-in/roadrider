import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useResponsive } from '../../theme/useResponsive';
import { colors } from '../../theme/colors';

export const ResponsiveContainer = ({
  children,
  style,
  maxWidth = 1400,
  noPadding = false,
}) => {
  const { contentPadding, isMobile } = useResponsive();

  return (
    <View
      style={[
        styles.outer,
        !noPadding && { paddingHorizontal: contentPadding, paddingVertical: isMobile ? 12 : 24 },
        style,
      ]}
    >
      <View style={[styles.inner, { maxWidth }]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: colors.background,
    flexGrow: 1,
  },
  inner: {
    width: '100%',
  },
});

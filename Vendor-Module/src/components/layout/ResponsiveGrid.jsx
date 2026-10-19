import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useResponsive } from '../../theme/useResponsive';

export const ResponsiveGrid = ({
  children,
  columns = { mobile: 1, tablet: 2, desktop: 3, wide: 4 },
  gap = 16,
  style,
}) => {
  const { isMobile, isTablet, isDesktop, isWide } = useResponsive();

  const numCols = isWide
    ? columns.wide ?? columns.desktop ?? 4
    : isDesktop
      ? columns.desktop ?? 3
      : isTablet
        ? columns.tablet ?? 2
        : columns.mobile ?? 1;

  // React Native doesn't have native CSS grid in older styling, but flexWrap with percentage width works flawlessly across mobile and web
  const itemWidthPercent = `${100 / numCols}%`;

  const childArray = React.Children.toArray(children);

  return (
    <View style={[styles.container, { marginHorizontal: -gap / 2 }, style]}>
      {childArray.map((child, index) => (
        <View
          key={index}
          style={{
            width: itemWidthPercent,
            paddingHorizontal: gap / 2,
            marginBottom: gap,
          }}
        >
          {child}
        </View>

      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});

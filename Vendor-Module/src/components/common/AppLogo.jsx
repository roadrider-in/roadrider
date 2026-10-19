import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import roadriderLogo from '../../assets/images/roadrider-delivery-logo.png';

export const AppLogo = ({ compact = false, scale = 1, style, maxWidth, maxHeight }) => {
  // Official RoadRider delivery logo aspect ratio: 1681 x 819 (~2.0525:1)
  const baseWidth = compact ? 92 : 144;
  const baseHeight = compact ? 45 : 70;

  const width = maxWidth ? Math.min(maxWidth, baseWidth) : baseWidth;
  const height = maxHeight ? Math.min(maxHeight, baseHeight) : Math.round(width / 2.0525);

  const imageSource =
    typeof roadriderLogo === 'string'
      ? { uri: roadriderLogo }
      : roadriderLogo;

  return (
    <View style={[styles.container, { transform: [{ scale }] }, style]}>
      <Image
        source={imageSource}
        style={{
          width,
          height,
        }}
        resizeMode="contain"
        accessibilityLabel="RoadRider - Aapke Safar Ka Saarthi"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});


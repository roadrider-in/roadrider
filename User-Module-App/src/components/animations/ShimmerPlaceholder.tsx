import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useReducedMotion } from "../../hooks/useReducedMotion";

export type ShimmerTheme =
  | "food"
  | "rides"
  | "grocery"
  | "courier"
  | "neutral"
  | "dark";

interface ShimmerPlaceholderProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  theme?: ShimmerTheme;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

const THEME_COLORS: Record<ShimmerTheme, { base: string; highlight: string }> = {
  food: {
    base: "#f5ede8",
    highlight: "#e8dbd3",
  },
  rides: {
    base: "#edf4fe",
    highlight: "#d8e7fc",
  },
  grocery: {
    base: "#edf7f0",
    highlight: "#d8efe0",
  },
  courier: {
    base: "#fef5ea",
    highlight: "#fce9d2",
  },
  neutral: {
    base: "#f1f5f9",
    highlight: "#e2e8f0",
  },
  dark: {
    base: "#221916",
    highlight: "#352622",
  },
};

export default function ShimmerPlaceholder({
  width = "100%",
  height = 16,
  borderRadius = 8,
  theme = "neutral",
  style,
  children,
}: ShimmerPlaceholderProps) {
  const isReducedMotion = useReducedMotion();
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isReducedMotion) {
      animValue.setValue(0.5);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(animValue, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [animValue, isReducedMotion]);

  const colors = THEME_COLORS[theme] || THEME_COLORS.neutral;

  // Smooth opacity pulse for 60fps native performance
  const opacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 0.95],
  });

  return (
    <View
      style={[
        styles.base,
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.base,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius,
            backgroundColor: colors.highlight,
            opacity,
          },
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
  },
});

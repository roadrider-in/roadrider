import React, { type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { colors, radii } from "../theme/tokens";

export interface ButtonProps {
  children: ReactNode;
  onPress?: () => void;
  secondary?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accentColor?: string;
}

export default function Button({
  children,
  onPress,
  secondary = false,
  disabled = false,
  style,
  textStyle,
  accentColor = colors.accent,
}: ButtonProps) {
  const bg = secondary ? colors.accentSoft : accentColor;
  const textColor = secondary ? accentColor : "#ffffff";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg },
        secondary && styles.secondaryBorder,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {(() => {
        if (typeof children === "string" || typeof children === "number") {
          return (
            <Text style={[styles.text, { color: textColor }, textStyle]}>
              {children}
            </Text>
          );
        }

        const childArray = React.Children.toArray(children);
        const allPrimitives =
          childArray.length > 0 &&
          childArray.every(
            (c) => typeof c === "string" || typeof c === "number"
          );

        if (allPrimitives) {
          return (
            <Text style={[styles.text, { color: textColor }, textStyle]}>
              {children}
            </Text>
          );
        }

        return (
          <View style={styles.contentRow}>
            {React.Children.map(children, (child) => {
              if (
                child === null ||
                child === undefined ||
                typeof child === "boolean"
              ) {
                return null;
              }
              if (typeof child === "string" || typeof child === "number") {
                return (
                  <Text style={[styles.text, { color: textColor }, textStyle]}>
                    {child}
                  </Text>
                );
              }
              return child;
            })}
          </View>
        );
      })()}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    height: 52,
    borderRadius: radii.md,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 16,
  },
  secondaryBorder: {
    borderWidth: 1,
    borderColor: "rgba(200, 75, 49, 0.15)",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.5,
  },
});

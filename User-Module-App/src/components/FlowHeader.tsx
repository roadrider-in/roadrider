import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import Icon from "./Icon";
import { useNav } from "../navigation/Navigation";
import { colors } from "../theme/tokens";

export interface FlowHeaderProps {
  title?: string;
  onBack?: () => void;
  showHelp?: boolean;
  dark?: boolean;
}

export default function FlowHeader({
  title = "",
  onBack,
  showHelp = true,
  dark = false,
}: FlowHeaderProps) {
  const { back, push } = useNav();

  const handleBack = () => {
    if (onBack) onBack();
    else back();
  };

  return (
    <View style={[styles.header, dark && styles.headerDark]}>
      <Pressable
        onPress={handleBack}
        style={({ pressed }) => [
          styles.iconButton,
          dark && styles.iconButtonDark,
          pressed && styles.pressed,
        ]}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Icon name="back" size={18} color={dark ? "#ffffff" : "#29231f"} />
      </Pressable>

      <Text
        style={[styles.title, dark && styles.titleDark]}
        numberOfLines={1}
      >
        {title}
      </Text>

      {showHelp ? (
        <Pressable
          onPress={() => push({ name: "help" })}
          style={({ pressed }) => [
            styles.helpButton,
            dark && styles.iconButtonDark,
            pressed && styles.pressed,
          ]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Help"
        >
          <Text style={[styles.helpText, dark && styles.textDark]}>?</Text>
        </Pressable>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "transparent",
    position: "relative",
    zIndex: 5,
  },
  headerDark: {
    backgroundColor: "#0d1b2c",
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  iconButtonDark: {
    backgroundColor: "#1b2a3d",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    color: "#171514",
    marginHorizontal: 8,
  },
  titleDark: {
    color: "#ffffff",
  },
  helpButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  helpText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#29231f",
  },
  textDark: {
    color: "#ffffff",
  },
  placeholder: {
    width: 36,
    height: 36,
  },
  pressed: {
    opacity: 0.7,
  },
});

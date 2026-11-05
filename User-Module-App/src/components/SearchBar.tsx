import React from "react";
import { StyleSheet, View, TextInput, Pressable, ViewStyle } from "react-native";
import Icon from "./Icon";
import { useServiceTheme } from "../theme/themes";
import type { Service } from "../data/demo";

export interface SearchBarProps {
  placeholder: string;
  value?: string;
  onChange?: (val: string) => void;
  onFilter?: () => void;
  onRightAction?: () => void;
  rightAction?: "filter" | "mic" | "scan" | "none";
  service?: Service;
  style?: ViewStyle;
}

export default function SearchBar({
  placeholder,
  value,
  onChange,
  onFilter,
  onRightAction,
  rightAction = "filter",
  service,
  style,
}: SearchBarProps) {
  const theme = useServiceTheme(service);

  const handleAction = onRightAction || onFilter;

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: theme.searchBorder,
          backgroundColor: theme.searchBg,
        },
        style,
      ]}
    >
      <Icon name="search" size={20} color={theme.searchIconColor || "#948e89"} />
      <TextInput
        style={[styles.input, { color: theme.textPrimary }]}
        placeholder={placeholder}
        placeholderTextColor={theme.searchPlaceholder || "#948e89"}
        value={value ?? ""}
        onChangeText={onChange}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel={placeholder}
      />
      {Boolean(value) && (
        <Pressable
          onPress={() => onChange?.("")}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.clearBtn}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Icon name="close" size={15} color="#948e89" />
        </Pressable>
      )}
      {rightAction !== "none" && Boolean(handleAction) && (
        <Pressable
          onPress={handleAction}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[styles.actionBtn, { borderLeftColor: theme.borderSubtle }]}
          accessibilityRole="button"
          accessibilityLabel="Search action"
        >
          {rightAction === "filter" ? (
            <Icon name="sliders" size={19} color={theme.primary} />
          ) : rightAction === "mic" ? (
            <Icon name="microphone" size={19} color={theme.primary} />
          ) : rightAction === "scan" ? (
            <Icon name="scan" size={19} color={theme.primary} />
          ) : (
            <Icon name="filter" size={18} color={theme.primary} />
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 52,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginHorizontal: 16,
    gap: 10,
    borderWidth: 1,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
    zIndex: 5,
  },
  input: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  actionBtn: {
    paddingLeft: 10,
    borderLeftWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

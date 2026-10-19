import React from "react";
import { StyleSheet, View, TextInput, Pressable } from "react-native";
import Icon from "./Icon";
import { colors } from "../theme/tokens";

export interface SearchBarProps {
  placeholder: string;
  value?: string;
  onChange?: (val: string) => void;
  onFilter?: () => void;
}

export default function SearchBar({
  placeholder,
  value,
  onChange,
  onFilter,
}: SearchBarProps) {
  return (
    <View style={styles.container}>
      <Icon name="search" size={20} color="#948e89" />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#948e89"
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
      {Boolean(onFilter) && (
        <Pressable
          onPress={onFilter}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.filterBtn}
          accessibilityRole="button"
          accessibilityLabel="Search filters"
        >
          <Icon name="filter" size={18} color={colors.accent} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 50,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    marginHorizontal: 18,
    gap: 10,
    shadowColor: "#190a04",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 30,
    elevation: 4,
    zIndex: 3,
  },
  input: {
    flex: 1,
    fontSize: 12,
    color: colors.ink,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  filterBtn: {
    paddingLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: "#eee9e5",
  },
});

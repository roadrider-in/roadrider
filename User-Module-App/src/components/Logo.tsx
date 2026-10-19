import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/tokens";

interface LogoProps {
  light?: boolean;
  size?: number;
}

export default function Logo({ light = false, size = 23 }: LogoProps) {
  return (
    <View style={styles.container}>
      <Text style={[styles.text, { fontSize: size }, light && styles.textLight]}>
        Road<Text style={styles.accent}>Rider</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  text: {
    fontWeight: "700",
    letterSpacing: -1.2,
    color: colors.ink,
  },
  textLight: {
    color: "#ffffff",
  },
  accent: {
    color: colors.accent,
  },
});

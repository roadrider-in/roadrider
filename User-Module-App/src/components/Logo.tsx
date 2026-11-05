import React from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  type StyleProp,
  type ImageStyle,
} from "react-native";
import { colors } from "../theme/tokens";

// Native aspect ratio of the official RoadRider logo asset (1024 x 474)
const LOGO_ASPECT_RATIO = 1024 / 474;

interface LogoProps {
  light?: boolean;
  size?: number;
  image?: boolean;
  width?: number;
  imageStyle?: StyleProp<ImageStyle>;
}

export default function Logo({
  light = false,
  size = 23,
  image = false,
  width = 180,
  imageStyle,
}: LogoProps) {
  if (image) {
    const calculatedHeight = Math.round(width / LOGO_ASPECT_RATIO);
    return (
      <View style={styles.imageContainer}>
        <Image
          source={require("../../assets/roadrider-logo.png")}
          style={[
            {
              width,
              height: calculatedHeight,
            },
            imageStyle,
          ]}
          resizeMode="contain"
          accessibilityRole="image"
          accessibilityLabel="RoadRider - Aapke Safar Ka Saarthi"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.text, { fontSize: size }, light && styles.textLight]}>
        Road<Text style={styles.accent}>Rider</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
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

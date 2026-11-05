import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  StatusBar,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "../../components/Icon";
import Logo from "../../components/Logo";
import Button from "../../components/Button";
import { PHOTOS } from "../../data/demo";
import { useNav } from "../../navigation/Navigation";
import { colors } from "../../theme/tokens";
import { useReducedMotion } from "../../hooks/useReducedMotion";

export default function Splash() {
  const { push } = useNav();
  const isReducedMotion = useReducedMotion();

  // Entrance animations
  const headerOpacity = useRef(new Animated.Value(isReducedMotion ? 1 : 0)).current;
  const headerScale = useRef(new Animated.Value(isReducedMotion ? 1 : 0.92)).current;
  const heroOpacity = useRef(new Animated.Value(isReducedMotion ? 1 : 0)).current;
  const heroTranslateY = useRef(new Animated.Value(isReducedMotion ? 0 : 16)).current;
  const chipScale = useRef(new Animated.Value(isReducedMotion ? 1 : 0.8)).current;
  const chipOpacity = useRef(new Animated.Value(isReducedMotion ? 1 : 0)).current;
  const footerOpacity = useRef(new Animated.Value(isReducedMotion ? 1 : 0)).current;

  useEffect(() => {
    if (isReducedMotion) return;

    Animated.stagger(140, [
      // 1. Header (Logo + Tagline)
      Animated.parallel([
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(headerScale, {
          toValue: 1,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      // 2. Hero copy
      Animated.parallel([
        Animated.timing(heroOpacity, {
          toValue: 1,
          duration: 650,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(heroTranslateY, {
          toValue: 0,
          duration: 650,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      // 3. Service chips
      Animated.parallel([
        Animated.spring(chipScale, {
          toValue: 1,
          friction: 6,
          tension: 45,
          useNativeDriver: true,
        }),
        Animated.timing(chipOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      // 4. Footer CTA button
      Animated.timing(footerOpacity, {
        toValue: 1,
        duration: 550,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isReducedMotion, headerOpacity, headerScale, heroOpacity, heroTranslateY, chipScale, chipOpacity, footerOpacity]);

  const services = [
    { icon: "food", label: "Food" },
    { icon: "car", label: "Rides" },
    { icon: "bag", label: "Grocery" },
    { icon: "box", label: "Courier" },
  ];

  return (
    <ImageBackground
      source={{ uri: PHOTOS.rider }}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.shade} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Header */}
          <Animated.View
            style={[
              styles.header,
              {
                opacity: headerOpacity,
                transform: [{ scale: headerScale }],
              },
            ]}
          >
            <Logo light size={26} />
            <Text style={styles.tagline}>MOVE · EAT · SHOP · DELIVER</Text>
          </Animated.View>

          {/* Main Hero Copy (Figma .splash-main) */}
          <Animated.View
            style={[
              styles.splashMain,
              {
                opacity: heroOpacity,
                transform: [{ translateY: heroTranslateY }],
              },
            ]}
          >
            <Text style={styles.eyebrow}>ONE APP. EVERYDAY POSSIBILITIES.</Text>
            <Text style={styles.title}>
              Everything <Text style={styles.titleHighlight}>you need</Text>
              {"\n"}in one app.
            </Text>
            <Text style={styles.description}>
              From your morning commute to dinner at your door, RoadRider keeps life moving.
            </Text>

            {/* Service Chips Row (Figma .service-row) */}
            <Animated.View
              style={[
                styles.serviceRow,
                {
                  opacity: chipOpacity,
                  transform: [{ scale: chipScale }],
                },
              ]}
            >
              {services.map(({ icon, label }) => (
                <View key={label} style={styles.serviceItem}>
                  <View style={styles.serviceCircle}>
                    <Icon name={icon} size={20} color="#ffffff" />
                  </View>
                  <Text style={styles.serviceLabel}>{label}</Text>
                </View>
              ))}
            </Animated.View>
          </Animated.View>

          {/* Footer CTA */}
          <Animated.View
            style={[
              styles.footer,
              {
                opacity: footerOpacity,
              },
            ]}
          >
            <Button
              onPress={() => push({ name: "phone" })}
              accentColor={colors.accent}
            >
              <Text style={styles.btnText}>Get started</Text>
              <Icon name="arrow" size={20} color="#ffffff" />
            </Button>
            <Text style={styles.photoCredit}>RoadRider SuperApp</Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  shade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(16, 10, 8, 0.72)",
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "flex-start",
  },
  tagline: {
    fontSize: 8,
    fontWeight: "600",
    letterSpacing: 2.1,
    color: "rgba(255, 255, 255, 0.72)",
    marginTop: 8,
  },
  splashMain: {
    marginTop: "auto",
    marginBottom: 20,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.8,
    color: colors.accent,
    marginBottom: 12,
  },
  title: {
    fontSize: 38,
    fontWeight: "800",
    lineHeight: 42,
    letterSpacing: -1.7,
    color: "#ffffff",
    marginBottom: 14,
  },
  titleHighlight: {
    color: "#f27955",
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: "rgba(255, 255, 255, 0.72)",
    width: "92%",
  },
  serviceRow: {
    flexDirection: "row",
    gap: 25,
    marginVertical: 24,
  },
  serviceItem: {
    alignItems: "center",
    gap: 6,
  },
  serviceCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  serviceLabel: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.65)",
  },
  footer: {
    width: "100%",
  },
  btnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    marginRight: 8,
  },
  photoCredit: {
    textAlign: "center",
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 8,
    marginTop: 10,
  },
});

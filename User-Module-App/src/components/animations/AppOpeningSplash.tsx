import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Logo from "../Logo";
import { useReducedMotion } from "../../hooks/useReducedMotion";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface AppOpeningSplashProps {
  isReady: boolean;
  onFinished: () => void;
}

export default function AppOpeningSplash({
  isReady,
  onFinished,
}: AppOpeningSplashProps) {
  const isReducedMotion = useReducedMotion();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  // Animated values
  const logoOpacity = useRef(new Animated.Value(isReducedMotion ? 1 : 0)).current;
  const logoScale = useRef(new Animated.Value(isReducedMotion ? 1 : 0.86)).current;
  const taglineOpacity = useRef(new Animated.Value(isReducedMotion ? 1 : 0)).current;
  const taglineTranslateY = useRef(new Animated.Value(isReducedMotion ? 0 : 12)).current;
  const auraScale = useRef(new Animated.Value(1)).current;
  const auraOpacity = useRef(new Animated.Value(0.2)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const containerScale = useRef(new Animated.Value(1)).current;

  // 1. Entrance animation on mount
  useEffect(() => {
    if (isReducedMotion) {
      setMinTimeElapsed(true);
      return;
    }

    // Minimum display timer to ensure smooth 60fps opening sequence
    const minTimer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 1100);

    // Staggered logo and tagline entrance
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 750,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 650,
        delay: 380,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(taglineTranslateY, {
        toValue: 0,
        duration: 650,
        delay: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle breathing aura behind logo
    const auraLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(auraScale, {
            toValue: 1.25,
            duration: 1200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(auraOpacity, {
            toValue: 0.45,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(auraScale, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(auraOpacity, {
            toValue: 0.2,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    auraLoop.start();

    return () => {
      clearTimeout(minTimer);
      auraLoop.stop();
    };
  }, [isReducedMotion, logoOpacity, logoScale, taglineOpacity, taglineTranslateY, auraScale, auraOpacity]);

  // 2. Smooth exit transition to Home Screen once isReady AND minTimeElapsed
  useEffect(() => {
    if (!isReady || !minTimeElapsed) return;

    if (isReducedMotion) {
      onFinished();
      return;
    }

    Animated.parallel([
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 420,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(containerScale, {
        toValue: 1.05,
        duration: 420,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinished();
    });
  }, [isReady, minTimeElapsed, isReducedMotion, onFinished, containerOpacity, containerScale]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: containerOpacity,
          transform: [{ scale: containerScale }],
        },
      ]}
      pointerEvents={isReady && minTimeElapsed ? "none" : "auto"}
    >
      <StatusBar barStyle="light-content" />

      {/* Ambient warm aura pulse */}
      <Animated.View
        style={[
          styles.ambientAura,
          {
            opacity: auraOpacity,
            transform: [{ scale: auraScale }],
          },
        ]}
      />

      <View style={styles.centerBox}>
        {/* Animated RoadRider Logo */}
        <Animated.View
          style={{
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          }}
        >
          <Logo light size={42} />
        </Animated.View>

        {/* Animated Tagline */}
        <Animated.View
          style={{
            marginTop: 14,
            opacity: taglineOpacity,
            transform: [{ translateY: taglineTranslateY }],
          }}
        >
          <Text style={styles.tagline}>MOVE · EAT · SHOP · DELIVER</Text>
        </Animated.View>

        {/* Subtle decorative accent pill */}
        <Animated.View
          style={[
            styles.accentLine,
            {
              opacity: taglineOpacity,
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#100a08",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  ambientAura: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(200, 75, 49, 0.25)",
  },
  centerBox: {
    alignItems: "center",
    justifyContent: "center",
  },
  tagline: {
    color: "rgba(255, 255, 255, 0.72)",
    fontSize: 11,
    letterSpacing: 2.8,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  accentLine: {
    marginTop: 16,
    width: 32,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#c84b31",
  },
});

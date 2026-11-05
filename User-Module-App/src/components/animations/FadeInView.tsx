import React, { useEffect, useRef } from "react";
import {
  Animated,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useReducedMotion } from "../../hooks/useReducedMotion";

interface FadeInViewProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  translateYOffset?: number;
  scaleFrom?: number;
  style?: StyleProp<ViewStyle>;
  triggerKey?: any;
}

export default function FadeInView({
  children,
  duration = 320,
  delay = 0,
  translateYOffset = 6,
  scaleFrom = 1,
  style,
  triggerKey,
}: FadeInViewProps) {
  const isReducedMotion = useReducedMotion();
  const opacityAnim = useRef(new Animated.Value(isReducedMotion ? 1 : 0)).current;
  const translateYAnim = useRef(new Animated.Value(isReducedMotion ? 0 : translateYOffset)).current;
  const scaleAnim = useRef(new Animated.Value(isReducedMotion ? 1 : scaleFrom)).current;

  useEffect(() => {
    if (isReducedMotion) {
      opacityAnim.setValue(1);
      translateYAnim.setValue(0);
      scaleAnim.setValue(1);
      return;
    }

    opacityAnim.setValue(0);
    translateYAnim.setValue(translateYOffset);
    scaleAnim.setValue(scaleFrom);

    const animation = Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
    ]);

    animation.start();

    return () => {
      animation.stop();
    };
  }, [triggerKey, isReducedMotion, delay, duration, translateYOffset, scaleFrom]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: opacityAnim,
          transform: [
            { translateY: translateYAnim },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

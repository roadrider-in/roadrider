import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Hook to detect if the user has enabled "Reduce Motion" in their device accessibility settings.
 * Respecting this setting ensures accessible, comfortable animations for all users.
 */
export function useReducedMotion(): boolean {
  const [isReduceMotion, setIsReduceMotion] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Check initial state
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (isMounted) setIsReduceMotion(Boolean(enabled));
      })
      .catch(() => {
        // Fallback to false if not supported
        if (isMounted) setIsReduceMotion(false);
      });

    // Listen for real-time accessibility changes
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        if (isMounted) setIsReduceMotion(Boolean(enabled));
      }
    );

    return () => {
      isMounted = false;
      subscription?.remove();
    };
  }, []);

  return isReduceMotion;
}

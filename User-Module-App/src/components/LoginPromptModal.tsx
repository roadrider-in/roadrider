import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  Animated,
  Easing,
} from "react-native";
import Icon from "./Icon";
import Button from "./Button";
import { colors, radii } from "../theme/tokens";
import { useI18n } from "../lib/i18n";

export interface LoginPromptModalProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  onLogin: () => void;
}

export default function LoginPromptModal({
  visible,
  title,
  subtitle,
  onClose,
  onLogin,
}: LoginPromptModalProps) {
  const { t } = useI18n();
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(50);
      fadeAnim.setValue(0);
    }
  }, [visible, fadeAnim, slideAnim]);

  if (!visible) return null;

  const displayTitle = title || t("login_required_title", "Login to continue");
  const displaySubtitle =
    subtitle ||
    t(
      "login_required_sub",
      "Create an account or log in to enjoy the complete RoadRider experience."
    );

  const perks = [
    {
      icon: "bag",
      text: t("perk_checkout", "Place food, grocery & courier delivery orders"),
    },
    {
      icon: "pin",
      text: t("perk_addresses", "Save home, work and frequent delivery addresses"),
    },
    {
      icon: "shield",
      text: t("perk_tracking", "Real-time order tracking & 24/7 dedicated support"),
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissOverlay} onPress={onClose} />

        <Animated.View
          style={[
            styles.sheet,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Sheet Handle */}
          <View style={styles.handle} />

          {/* Icon Badge */}
          <View style={styles.iconCircle}>
            <Icon name="user" size={28} color={colors.accent} />
          </View>

          {/* Copy */}
          <Text style={styles.title}>{displayTitle}</Text>
          <Text style={styles.subtitle}>{displaySubtitle}</Text>

          {/* Perks list */}
          <View style={styles.perksContainer}>
            {perks.map((p, i) => (
              <View key={i} style={styles.perkRow}>
                <View style={styles.perkIconBox}>
                  <Icon name={p.icon} size={15} color={colors.accent} />
                </View>
                <Text style={styles.perkText}>{p.text}</Text>
              </View>
            ))}
          </View>

          {/* Actions */}
          <View style={styles.actionsGroup}>
            <Button onPress={onLogin} accentColor={colors.accent}>
              <View style={styles.btnRow}>
                <Text style={styles.btnText}>
                  {t("login_signup", "Login / Sign Up")}
                </Text>
                <Icon name="arrow" size={17} color="#ffffff" />
              </View>
            </Button>

            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.cancelBtn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.cancelBtnText}>
                {t("continue_guest", "Continue Browsing as Guest")}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "flex-end",
  },
  dismissOverlay: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 34,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e2e8f0",
    marginBottom: 18,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.ink,
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  perksContainer: {
    width: "100%",
    backgroundColor: "#fafaf9",
    borderRadius: radii.lg,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#f0eeeb",
    gap: 12,
  },
  perkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  perkIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e8e5e0",
  },
  perkText: {
    flex: 1,
    fontSize: 12,
    color: colors.ink,
    fontWeight: "600",
    lineHeight: 16,
  },
  actionsGroup: {
    width: "100%",
    gap: 8,
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
  },
  pressed: {
    opacity: 0.7,
  },
});

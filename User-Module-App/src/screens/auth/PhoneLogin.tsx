import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "../../components/Icon";
import Logo from "../../components/Logo";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { isValidIndianMobile, normalisePhone, prettyPhone } from "../../lib/format";
import { colors, radii } from "../../theme/tokens";
import { sendOtp } from "../../lib/authService";

export default function PhoneLogin() {
  const { push, back, reset } = useNav();
  const { showToast, continueAsGuest } = useApp();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSkip = () => {
    continueAsGuest();
    reset([{ name: "mainTabs" }]);
  };

  const handlePhoneChange = (val: string) => {
    const raw = normalisePhone(val);
    setPhone(prettyPhone(raw));
    if (error) setError("");
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 120, animated: true });
    }, 150);
  };

  const handleSendOtp = async () => {
    const raw = normalisePhone(phone);
    if (!raw) {
      setError("Please enter your mobile number.");
      return;
    }
    if (!isValidIndianMobile(raw)) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await sendOtp(raw);
      if (!res.success) {
        setError(res.error || "Failed to send OTP.");
        showToast(res.error || "Failed to send OTP.");
        return;
      }
      showToast(res.message || "OTP sent via SMS!");
      push({ name: "otp", phone: raw });
    } catch (err: any) {
      setError(err?.message || "Failed to dispatch verification code.");
      showToast("Error sending verification code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.brand.creamBg} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        style={styles.keyboardContainer}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.scrollContent,
            keyboardVisible && styles.scrollContentWithKeyboard,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Top Navigation Row */}
          <View style={styles.navBar}>
            <Pressable
              onPress={back}
              style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={8}
            >
              <Icon name="back" size={18} color={colors.brand.charcoal} />
            </Pressable>

            <Pressable
              onPress={() => push({ name: "help" })}
              style={({ pressed }) => [styles.helpBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Help and support"
              hitSlop={8}
            >
              <Icon name="info" size={15} color={colors.brand.lightGreyText} />
              <Text style={styles.helpBtnText}>Help</Text>
            </Pressable>
          </View>

          {/* Official RoadRider Brand Logo */}
          <View style={styles.logoSection}>
            <Logo image width={keyboardVisible ? 140 : 188} />
          </View>

          {/* Lightweight Hero Illustration Card */}
          <View
            style={[
              styles.heroCard,
              keyboardVisible && styles.heroCardCompact,
            ]}
          >
            <View style={styles.hillLeft} />
            <View style={styles.hillRight} />
            <View style={styles.roadStrip} />

            {/* Stylized Mobile Device Graphic */}
            <View
              style={[
                styles.phoneGraphic,
                keyboardVisible && styles.phoneGraphicCompact,
              ]}
            >
              <View style={styles.phoneNotch} />
              <View style={styles.phoneMapLine1} />
              <View style={styles.phoneMapLine2} />
              <View style={styles.pinCircle}>
                <Icon name="pin" size={keyboardVisible ? 14 : 18} color={colors.brand.terracotta} />
              </View>
            </View>

            {/* Floating Courier / Delivery Badge */}
            <View
              style={[
                styles.courierBadge,
                keyboardVisible && styles.courierBadgeCompact,
              ]}
            >
              <Icon name="box" size={keyboardVisible ? 13 : 17} color="#ffffff" />
            </View>
          </View>

          {/* Main Login Form Section */}
          <View style={styles.formSection}>
            {/* Header Copy */}
            <View style={styles.copyBlock}>
              <Text style={styles.eyebrow}>WELCOME TO ROADRIDER</Text>
              <Text style={styles.title}>Let's get started</Text>
              <Text style={styles.subtitle}>
                Enter your mobile number to receive a verification code
              </Text>
            </View>

            {/* Phone Input Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>MOBILE NUMBER</Text>
              <View
                style={[
                  styles.phoneInputRow,
                  isFocused && styles.phoneInputFocused,
                  Boolean(error) && styles.phoneInputError,
                ]}
              >
                {/* Country Code with Indian Flag */}
                <View style={styles.countryCodeContainer}>
                  <Text style={styles.flagEmoji}>🇮🇳</Text>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>

                {/* Vertical Divider */}
                <View style={styles.inputDivider} />

                {/* Mobile Number TextInput */}
                <TextInput
                  style={styles.inputField}
                  value={phone}
                  onChangeText={handlePhoneChange}
                  onFocus={handleInputFocus}
                  onBlur={() => setIsFocused(false)}
                  keyboardType="phone-pad"
                  placeholder="98765 43210"
                  placeholderTextColor={colors.brand.captionGrey}
                  maxLength={15}
                  accessibilityLabel="10-digit mobile number"
                  selectionColor={colors.brand.terracotta}
                />
              </View>

              {/* Inline Validation Feedback */}
              {Boolean(error) && (
                <View style={styles.errorRow}>
                  <Icon name="info" size={13} color={colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
            </View>

            {/* Primary Action Button */}
            <Pressable
              onPress={handleSendOtp}
              disabled={loading}
              style={({ pressed }) => [
                styles.primaryBtn,
                loading && styles.btnLoading,
                pressed && !loading && styles.btnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={loading ? "Sending verification code" : "Send OTP"}
            >
              <Text style={styles.primaryBtnText}>
                {loading ? "Sending OTP..." : "Send OTP"}
              </Text>
              <Icon name="arrow" size={18} color="#ffffff" />
            </Pressable>

            {/* Legal Disclaimer & Policy Links */}
            <Text style={styles.legalText}>
              By continuing, you agree to our{" "}
              <Text
                style={styles.legalLink}
                onPress={() => push({ name: "help" })}
              >
                Terms of Service
              </Text>{" "}
              and{" "}
              <Text
                style={styles.legalLink}
                onPress={() => push({ name: "help" })}
              >
                Privacy Policy
              </Text>
              .
            </Text>
          </View>

          {/* Bottom Navigation / Skip For Now */}
          <View style={styles.bottomBar}>
            <Pressable
              onPress={handleSkip}
              style={({ pressed }) => [styles.skipBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Skip for now and continue as guest"
              hitSlop={12}
            >
              <Text style={styles.skipText}>Skip for now</Text>
              <Icon name="arrow" size={13} color={colors.brand.lightGreyText} />
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.brand.creamBg,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: Platform.OS === "android" ? 10 : 6,
    paddingBottom: 36,
  },
  scrollContentWithKeyboard: {
    paddingBottom: Platform.OS === "android" ? 140 : 80,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand.backBtnBg,
    alignItems: "center",
    justifyContent: "center",
  },
  helpBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.brand.backBtnBg,
  },
  helpBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.brand.lightGreyText,
  },
  logoSection: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  heroCard: {
    backgroundColor: colors.brand.peachBg,
    height: 136,
    borderRadius: radii.xl,
    marginVertical: 12,
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(239, 215, 195, 0.7)",
  },
  heroCardCompact: {
    height: 70,
    marginVertical: 4,
  },
  hillLeft: {
    position: "absolute",
    bottom: 0,
    left: -24,
    width: 140,
    height: 68,
    backgroundColor: colors.brand.sageGreen,
    borderTopLeftRadius: 70,
    borderTopRightRadius: 70,
  },
  hillRight: {
    position: "absolute",
    bottom: 0,
    right: -28,
    width: 148,
    height: 72,
    backgroundColor: colors.brand.beigeMuted,
    borderTopLeftRadius: 74,
    borderTopRightRadius: 74,
  },
  roadStrip: {
    position: "absolute",
    bottom: -4,
    left: "50%",
    transform: [{ translateX: -70 }],
    width: 140,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.brand.roadGrey,
    zIndex: 1,
  },
  phoneGraphic: {
    position: "absolute",
    top: 10,
    left: "50%",
    transform: [{ translateX: -40 }],
    width: 80,
    height: 114,
    backgroundColor: "#f6efe7",
    borderWidth: 4.5,
    borderColor: colors.brand.charcoalBorder,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    shadowColor: "#492d1d",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  phoneGraphicCompact: {
    top: 6,
    height: 56,
    width: 50,
    borderWidth: 3,
    borderRadius: 12,
    transform: [{ translateX: -25 }],
  },
  phoneNotch: {
    position: "absolute",
    top: 4,
    width: 24,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: colors.brand.charcoalBorder,
  },
  phoneMapLine1: {
    position: "absolute",
    width: 44,
    height: 1.5,
    backgroundColor: "#ddcbbb",
    transform: [{ rotate: "-22deg" }],
  },
  phoneMapLine2: {
    position: "absolute",
    width: 52,
    height: 1.5,
    backgroundColor: "#ddcbbb",
    transform: [{ rotate: "28deg" }],
  },
  pinCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  courierBadge: {
    position: "absolute",
    bottom: 12,
    right: 36,
    width: 38,
    height: 38,
    backgroundColor: colors.brand.terracottaRider,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-6deg" }],
    zIndex: 3,
    shadowColor: "#c84b31",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  courierBadgeCompact: {
    bottom: 4,
    right: 44,
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  formSection: {
    width: "100%",
  },
  copyBlock: {
    marginBottom: 10,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.6,
    color: colors.brand.terracotta,
    marginBottom: 4,
  },
  title: {
    fontSize: 27,
    fontWeight: "800",
    color: colors.brand.charcoal,
    letterSpacing: -0.6,
    lineHeight: 33,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.brand.lightGreyText,
    lineHeight: 19,
    fontWeight: "400",
  },
  inputGroup: {
    marginTop: 8,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: colors.brand.captionGrey,
    marginBottom: 6,
    marginLeft: 2,
  },
  phoneInputRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.brand.inputBorder,
    borderRadius: radii.md,
    backgroundColor: colors.brand.inputBg,
    paddingHorizontal: 12,
  },
  phoneInputFocused: {
    borderColor: colors.brand.inputBorderActive,
    borderWidth: 2,
  },
  phoneInputError: {
    borderColor: colors.error,
  },
  countryCodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingRight: 10,
  },
  flagEmoji: {
    fontSize: 16,
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.brand.charcoal,
    letterSpacing: -0.2,
  },
  inputDivider: {
    width: 1,
    height: 22,
    backgroundColor: colors.brand.inputBorder,
  },
  inputField: {
    flex: 1,
    height: 52,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: "600",
    color: colors.brand.charcoal,
    letterSpacing: 0.4,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
    marginLeft: 2,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: "600",
  },
  primaryBtn: {
    width: "100%",
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.brand.terracotta,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: colors.brand.terracotta,
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  primaryBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  btnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  btnLoading: {
    opacity: 0.7,
  },
  legalText: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    color: colors.brand.legalGrey,
    marginTop: 14,
    paddingHorizontal: 8,
  },
  legalLink: {
    fontWeight: "700",
    color: colors.brand.legalBold,
    textDecorationLine: "underline",
  },
  bottomBar: {
    marginTop: 18,
    marginBottom: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  skipBtn: {
    minHeight: 46,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 23,
    backgroundColor: colors.brand.backBtnBg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  skipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.brand.lightGreyText,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
});
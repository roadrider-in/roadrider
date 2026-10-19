import React, { useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "../../components/Icon";
import Logo from "../../components/Logo";
import Button from "../../components/Button";
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

  const handleSkip = () => {
    continueAsGuest();
    reset([{ name: "mainTabs" }]);
  };

  const handlePhoneChange = (val: string) => {
    const raw = normalisePhone(val);
    setPhone(prettyPhone(raw));
    if (error) setError("");
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top back button */}
          <Pressable
            onPress={back}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Icon name="back" size={18} color={colors.ink} />
          </Pressable>

          {/* Logo & Tagline */}
          <View style={styles.headerArea}>
            <Logo size={22} />
            <Text style={styles.authTag}>MOVE · EAT · SHOP · DELIVER</Text>
          </View>

          {/* Illustrated Banner matching Figma */}
          <View style={styles.authIllustration}>
            <View style={styles.hillLeft} />
            <View style={styles.hillRight} />
            <View style={styles.illustrationRoad} />
            <View style={styles.illustrationPhone}>
              <View style={styles.phoneNotch} />
              <View style={styles.phoneLine1} />
              <View style={styles.phoneLine2} />
              <Icon name="pin" size={30} color="#cf4f33" />
            </View>
            <View style={styles.illustrationRider}>
              <Icon name="box" size={24} color="#ffffff" />
            </View>
          </View>

          {/* Copy */}
          <View style={styles.authCopy}>
            <Text style={styles.eyebrow}>WELCOME TO ROADRIDER</Text>
            <Text style={styles.title}>Let's get started</Text>
            <Text style={styles.subtitle}>Enter your mobile number to continue</Text>
          </View>

          {/* Phone Input */}
          <View style={[styles.phoneInput, Boolean(error) && styles.phoneInputError]}>
            <View style={styles.prefixSpan}>
              <Text style={styles.prefixText}>+91</Text>
            </View>
            <TextInput
              style={styles.inputField}
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              placeholder="98765 43210"
              placeholderTextColor="#9a928c"
              maxLength={15}
              accessibilityLabel="Mobile number"
            />
          </View>
          {Boolean(error) && <Text style={styles.errorText}>{error}</Text>}

          {/* Primary CTA */}
          <Button
            onPress={handleSendOtp}
            disabled={loading}
            style={[{ marginTop: 6 }, loading && { opacity: 0.7 }]}
          >
            <Text style={styles.btnText}>
              {loading ? "Sending OTP..." : "Send OTP"}
            </Text>
            <Icon name="arrow" size={18} color="#ffffff" />
          </Button>



          {/* Legal Disclaimer */}
          <Text style={styles.legal}>
            By continuing, you agree to our{" "}
            <Text style={styles.legalBold}>Terms of Service</Text>
            {"\n"}and <Text style={styles.legalBold}>Privacy Policy</Text>.
          </Text>

          {/* Skip for now option */}
          <Pressable
            onPress={handleSkip}
            style={({ pressed }) => [styles.skipRow, pressed && styles.pressed]}
          >
            <Text style={styles.skipText}>Skip for now</Text>
            <Icon name="arrow" size={13} color="#9a938e" />
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fffdfa",
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#f4efeb",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  headerArea: {
    alignItems: "flex-start",
  },
  authTag: {
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 1.8,
    color: "#9a928c",
    marginTop: 7,
    marginBottom: 4,
  },
  authIllustration: {
    backgroundColor: "#faeadd",
    height: 220,
    marginHorizontal: -24,
    marginVertical: 18,
    position: "relative",
    overflow: "hidden",
  },
  hillLeft: {
    position: "absolute",
    bottom: 0,
    left: -55,
    width: 170,
    height: 95,
    backgroundColor: "#dce7d5",
    borderTopLeftRadius: 85,
    borderTopRightRadius: 85,
  },
  hillRight: {
    position: "absolute",
    bottom: 0,
    right: -70,
    width: 170,
    height: 95,
    backgroundColor: "#efd7c3",
    borderTopLeftRadius: 85,
    borderTopRightRadius: 85,
  },
  illustrationRoad: {
    position: "absolute",
    bottom: -6,
    left: "50%",
    transform: [{ translateX: -95 }],
    width: 190,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#c7bcb3",
    zIndex: 1,
  },
  illustrationPhone: {
    position: "absolute",
    top: 18,
    left: "50%",
    transform: [{ translateX: -56 }],
    width: 112,
    height: 174,
    backgroundColor: "#f6efe7",
    borderWidth: 7,
    borderColor: "#25201d",
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    shadowColor: "#492d1d",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
  },
  phoneNotch: {
    position: "absolute",
    top: 5,
    width: 34,
    height: 5,
    borderRadius: 5,
    backgroundColor: "#25201d",
  },
  phoneLine1: {
    position: "absolute",
    width: 58,
    height: 2,
    backgroundColor: "#ddcbbb",
    transform: [{ rotate: "-25deg" }],
  },
  phoneLine2: {
    position: "absolute",
    width: 70,
    height: 2,
    backgroundColor: "#ddcbbb",
    transform: [{ rotate: "30deg" }],
  },
  illustrationRider: {
    position: "absolute",
    bottom: 18,
    right: 58,
    width: 49,
    height: 49,
    backgroundColor: "#d45b37",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-8deg" }],
    zIndex: 3,
  },
  authCopy: {
    marginBottom: 6,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.8,
    color: "#c84b31",
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#171514",
    letterSpacing: -1,
    lineHeight: 34,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: "#77716e",
    lineHeight: 18,
  },
  phoneInput: {
    flexDirection: "row",
    alignItems: "center",
    height: 54,
    borderWidth: 1,
    borderColor: "#ddd6d0",
    borderRadius: 14,
    backgroundColor: "#ffffff",
    marginTop: 18,
    marginBottom: 10,
  },
  phoneInputError: {
    borderColor: "#c84b31",
  },
  prefixSpan: {
    height: 24,
    paddingHorizontal: 14,
    borderRightWidth: 1,
    borderRightColor: "#ddd6d0",
    justifyContent: "center",
  },
  prefixText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#171514",
  },
  inputField: {
    flex: 1,
    height: 54,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: "600",
    color: "#171514",
  },
  errorText: {
    color: "#c84b31",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4,
  },
  btnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    marginRight: 6,
  },
  legal: {
    fontSize: 8,
    lineHeight: 13,
    textAlign: "center",
    color: "#9a938e",
    marginTop: 20,
    marginBottom: 10,
  },
  legalBold: {
    fontWeight: "700",
    color: "#5d5651",
  },
  skipRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9a938e",
  },
  pressed: {
    opacity: 0.6,
  },
});

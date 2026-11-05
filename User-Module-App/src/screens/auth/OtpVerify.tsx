import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "../../components/Icon";
import Logo from "../../components/Logo";
import Button from "../../components/Button";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { prettyPhone } from "../../lib/format";
import { colors, radii } from "../../theme/tokens";
import { verifyOtp, sendOtp } from "../../lib/authService";

export interface OtpVerifyProps {
  phone: string;
}

export default function OtpVerify({ phone }: OtpVerifyProps) {
  const { reset, pop, canGoBack, back } = useNav();
  const { signIn, showToast } = useApp();
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(30);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<TextInput>(null);

  // Auto-focus native input on screen mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleOtpChange = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 6);
    setOtp(clean);
    if (error) setError(null);
    if (clean.length === 6) {
      handleVerify(clean);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      const res = await sendOtp(phone);
      if (res.success) {
        setCooldown(30);
        setOtp("");
        showToast(res.message || "A fresh 6-digit verification code has been dispatched.");
        inputRef.current?.focus();
      } else {
        setError(res.error || "Failed to resend code. Please try again.");
        showToast(res.error || "Failed to resend code.");
      }
    } catch (err: any) {
      setError("Error requesting a new code.");
      showToast("Error requesting new code.");
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async (codeToVerify?: string) => {
    const targetOtp = codeToVerify || otp;
    if (targetOtp.length < 6) {
      setError("Please enter all 6 digits of the verification code.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await verifyOtp(phone, targetOtp);
      if (!res.success) {
        setError(res.error || "Incorrect or expired code. Please try again.");
        showToast(res.error || "Verification failed. Check the code.");
        return;
      }

      const customer = res.customer;
      const hasCompleteProfile = Boolean(
        customer?.full_name &&
        customer.full_name.trim().length > 0 &&
        customer.full_name !== "RoadRider Customer"
      );

      signIn(phone, {
        id: customer?.id,
        name: customer?.full_name || "",
        walletBalance: 0,
        profileCompleted: hasCompleteProfile,
      });

      showToast("Signed in successfully!");

      if (hasCompleteProfile) {
        if (canGoBack()) {
          pop(2);
        } else {
          reset([{ name: "mainTabs" }]);
        }
      } else {
        reset([{ name: "profile", mode: "completion" }]);
      }
    } catch (err: any) {
      setError(err?.message || "Verification failed. Please check the code.");
      showToast(err?.message || "Verification error.");
    } finally {
      setLoading(false);
    }
  };

  const formattedPhone = phone
    ? `+91 ${prettyPhone(phone)}`
    : "+91";

  const cooldownString = `00:${String(cooldown).padStart(2, "0")}`;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fffdfa" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Top Nav Row with Back Button */}
          <View style={styles.topNavRow}>
            <Pressable
              onPress={back}
              style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={10}
            >
              <Icon name="back" size={18} color="#171514" />
            </Pressable>
          </View>

          {/* Centered Brand */}
          <View style={styles.brandRow}>
            <Logo size={24} />
            <Text style={styles.authTag}>MOVE · EAT · SHOP · DELIVER</Text>
          </View>

          {/* Copy */}
          <View style={styles.authCopy}>
            <Text style={styles.eyebrow}>ONE LAST STEP</Text>
            <Text style={styles.title}>Verify your number</Text>
            <Text style={styles.subtitle}>
              We've sent a 6-digit code to{" "}
              <Text style={styles.boldPhone}>{formattedPhone}</Text>
            </Text>
          </View>

          {/* 6 OTP boxes with native hidden input overlaid */}
          <View style={styles.otpInputContainer}>
            <Pressable
              onPress={() => inputRef.current?.focus()}
              style={styles.otpBoxesRow}
              accessibilityRole="button"
              accessibilityLabel="Enter 6-digit OTP"
            >
              {Array.from({ length: 6 }, (_, index) => {
                const isFilled = index < otp.length;
                const isFocused = index === otp.length;
                return (
                  <View
                    key={index}
                    style={[
                      styles.otpBox,
                      isFilled && styles.otpBoxFilled,
                      isFocused && styles.otpBoxFocused,
                      Boolean(error) && styles.otpBoxError,
                    ]}
                  >
                    <Text style={styles.otpDigit}>{otp[index] || ""}</Text>
                    {isFocused && <View style={styles.cursorIndicator} />}
                  </View>
                );
              })}
            </Pressable>

            {/* Hidden native input capturing native keyboard / paste / autofill */}
            <TextInput
              ref={inputRef}
              value={otp}
              onChangeText={handleOtpChange}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              maxLength={6}
              caretHidden={true}
              style={styles.hiddenInput}
              accessibilityLabel="One Time Password input"
            />
          </View>

          {/* Error Feedback */}
          {Boolean(error) && (
            <View style={styles.errorBox}>
              <Icon name="info" size={15} color="#dc2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Resend Code Row */}
          <View style={styles.resendRow}>
            {cooldown > 0 ? (
              <Text style={styles.resendText}>
                Resend code in{" "}
                <Text style={styles.resendTimer}>{cooldownString}</Text>
              </Text>
            ) : (
              <Pressable
                onPress={handleResend}
                disabled={resending}
                hitSlop={8}
                style={({ pressed }) => [styles.resendBtn, pressed && styles.pressed]}
              >
                <Text style={styles.resendActive}>
                  {resending ? "Dispatching code..." : "Resend code via SMS"}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Primary CTA */}
          <Button
            onPress={() => handleVerify()}
            disabled={loading || otp.length < 6}
            style={[
              styles.verifyBtn,
              (loading || otp.length < 6) && styles.verifyBtnDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
            ) : null}
            <Text style={styles.btnText}>
              {loading ? "Verifying..." : "Verify & continue"}
            </Text>
            {!loading && <Icon name="arrow" size={18} color="#ffffff" />}
          </Button>
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
    paddingBottom: 40,
    flexGrow: 1,
  },
  topNavRow: {
    marginBottom: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#f5eee7",
    alignItems: "center",
    justifyContent: "center",
  },
  brandRow: {
    alignItems: "center",
    marginVertical: 12,
  },
  authTag: {
    fontSize: 8.5,
    fontWeight: "700",
    color: "#8c7e74",
    letterSpacing: 2,
    marginTop: 6,
  },
  authCopy: {
    alignItems: "center",
    marginBottom: 24,
    marginTop: 8,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: "#c84b31",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#171514",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: "#6e6762",
    textAlign: "center",
    lineHeight: 18,
  },
  boldPhone: {
    fontWeight: "700",
    color: "#171514",
  },
  otpInputContainer: {
    position: "relative",
    marginVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  otpBoxesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 340,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e5ded6",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: "#000000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  otpBoxFilled: {
    borderColor: "#292524",
    backgroundColor: "#fdfbf9",
  },
  otpBoxFocused: {
    borderColor: "#c84b31",
    borderWidth: 2,
    backgroundColor: "#fdf6f2",
    shadowColor: "#c84b31",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  otpBoxError: {
    borderColor: "#dc2626",
    backgroundColor: "#fef2f2",
  },
  otpDigit: {
    fontSize: 22,
    fontWeight: "800",
    color: "#171514",
  },
  cursorIndicator: {
    position: "absolute",
    bottom: 10,
    width: 14,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: "#c84b31",
  },
  hiddenInput: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.01,
    color: "transparent",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: {
    fontSize: 12.5,
    color: "#dc2626",
    fontWeight: "600",
  },
  resendRow: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    marginBottom: 24,
  },
  resendText: {
    fontSize: 13,
    color: "#78716c",
  },
  resendTimer: {
    fontWeight: "700",
    color: "#c84b31",
  },
  resendBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  resendActive: {
    fontSize: 13,
    fontWeight: "700",
    color: "#c84b31",
    textDecorationLine: "underline",
  },
  verifyBtn: {
    marginTop: 8,
    marginBottom: 20,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#c84b31",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#c84b31",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  verifyBtnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#ffffff",
    marginRight: 6,
  },
  pressed: {
    opacity: 0.8,
  },
});

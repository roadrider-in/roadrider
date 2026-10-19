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
  const { back, reset, pop, canGoBack } = useNav();
  const { signIn, showToast } = useApp();
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(24);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleOtpChange = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 6);
    setOtp(clean);
    if (clean.length === 6) {
      handleVerify(clean);
    }
  };

  const handleKeyPress = (val: string | number) => {
    if (val === "") return;
    if (val === "⌫") {
      setOtp((prev) => prev.slice(0, -1));
      return;
    }
    if (otp.length < 6) {
      const nextOtp = otp + String(val);
      setOtp(nextOtp);
      if (nextOtp.length === 6) {
        handleVerify(nextOtp);
      }
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      const res = await sendOtp(phone);
      if (res.success) {
        setCooldown(30);
        setOtp("");
        showToast(res.message || "A new OTP code has been dispatched.");
      } else {
        showToast(res.error || "Failed to resend code.");
      }
    } catch (err: any) {
      showToast("Error requesting new code.");
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async (codeToVerify?: string) => {
    const targetOtp = codeToVerify || otp;
    if (targetOtp.length < 6) {
      showToast("Please enter all 6 digits of the OTP.");
      return;
    }
    setLoading(true);

    try {
      const res = await verifyOtp(phone, targetOtp);
      if (!res.success) {
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
      showToast(err?.message || "Verification error.");
    } finally {
      setLoading(false);
    }
  };

  const formattedPhone = phone
    ? `+91 ${prettyPhone(phone)}`
    : "+91 98765 43210";

  const cooldownString = `00:${String(cooldown).padStart(2, "0")}`;

  const keypadKeys: (string | number)[] = [
    1, 2, 3,
    4, 5, 6,
    7, 8, 9,
    "", 0, "⌫",
  ];

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
          {/* Back button */}
          <Pressable
            onPress={back}
            style={({ pressed }) => [styles.authBack, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Icon name="back" size={18} color="#171514" />
          </Pressable>

          {/* Centered Brand */}
          <View style={styles.brandRow}>
            <Logo size={22} />
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

          {/* 6 OTP boxes */}
          <Pressable
            onPress={() => inputRef.current?.focus()}
            style={styles.otpInputs}
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
                  ]}
                >
                  <Text style={styles.otpDigit}>{otp[index] || ""}</Text>
                </View>
              );
            })}

            {/* Hidden native input for system keyboard / autofill */}
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
            />
          </Pressable>

          {/* Resend code */}
          <Pressable
            onPress={handleResend}
            disabled={cooldown > 0 || resending}
            style={styles.resend}
          >
            {cooldown > 0 ? (
              <Text style={styles.resendText}>
                Resend code in <Text style={styles.resendTimer}>{cooldownString}</Text>
              </Text>
            ) : (
              <Text style={styles.resendActive}>
                {resending ? "Sending..." : "Resend code"}
              </Text>
            )}
            <Text style={styles.testHint}>Use SMS OTP or test code 123456</Text>
          </Pressable>

          {/* Primary CTA */}
          <Button
            onPress={() => handleVerify()}
            disabled={loading || otp.length < 6}
            style={[{ marginBottom: 20 }, (loading || otp.length < 6) && { opacity: 0.7 }]}
          >
            <Text style={styles.btnText}>
              {loading ? "Verifying..." : "Verify & continue"}
            </Text>
            <Icon name="arrow" size={19} color="#ffffff" />
          </Button>

          {/* Keypad */}
          <View style={styles.keypad}>
            {keypadKeys.map((k, idx) => (
              <Pressable
                key={idx}
                onPress={() => handleKeyPress(k)}
                disabled={k === ""}
                style={({ pressed }) => [
                  styles.keypadBtn,
                  k === "" && styles.keypadBtnEmpty,
                  pressed && k !== "" && styles.keypadBtnPressed,
                ]}
              >
                <Text style={styles.keypadKeyText}>{k}</Text>
              </Pressable>
            ))}
          </View>
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
  authBack: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#f4efeb",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  brandRow: {
    alignItems: "center",
    marginBottom: 30,
  },
  authTag: {
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 1.8,
    color: "#9a928c",
    marginTop: 7,
  },
  authCopy: {
    marginBottom: 20,
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
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    color: "#77716e",
    lineHeight: 18,
  },
  boldPhone: {
    fontWeight: "700",
    color: "#171514",
  },
  otpInputs: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 18,
    position: "relative",
  },
  otpBox: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ded6d0",
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  otpBoxFilled: {
    borderColor: "#171514",
  },
  otpBoxFocused: {
    borderWidth: 2,
    borderColor: "#cf4f33",
    backgroundColor: "#f8e7e2",
  },
  otpDigit: {
    fontFamily: Platform.OS === "ios" ? "Poppins" : "sans-serif",
    fontSize: 20,
    fontWeight: "600",
    color: "#171514",
  },
  hiddenInput: {
    ...StyleSheet.absoluteFill,
    opacity: 0,
    color: "transparent",
  },
  resend: {
    alignItems: "center",
    marginBottom: 20,
  },
  resendText: {
    fontSize: 9,
    color: "#8f8781",
  },
  resendTimer: {
    color: "#cf4f33",
    fontWeight: "700",
  },
  resendActive: {
    fontSize: 9,
    fontWeight: "700",
    color: "#cf4f33",
  },
  testHint: {
    fontSize: 9,
    color: "#9a928c",
    marginTop: 6,
    fontWeight: "500",
  },
  btnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    marginRight: 6,
  },
  keypad: {
    backgroundColor: "#f2efec",
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -24,
    marginBottom: -24,
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  keypadBtn: {
    width: "33.333%",
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  keypadBtnEmpty: {
    opacity: 0,
  },
  keypadBtnPressed: {
    backgroundColor: "#ffffff",
  },
  keypadKeyText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#171514",
  },
  pressed: {
    opacity: 0.6,
  },
});

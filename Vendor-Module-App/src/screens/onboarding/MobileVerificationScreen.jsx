import React, { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  ActivityIndicator,
} from "react-native"
import { colors } from "../../theme/colors"
import { radius } from "../../theme/radius"
import { typography } from "../../theme/typography"
import { AppHeader } from "../../components/common/AppHeader"
import { AppLogo } from "../../components/common/AppLogo"
import { AppInput } from "../../components/common/AppInput"
import { AppButton } from "../../components/common/AppButton"
import { AppIcon } from "../../components/common/AppIcon"
import { useResponsive } from "../../theme/useResponsive"
import { useAppNavigation } from "../../navigation/NavigationContext"
import { useOnboarding } from "../../context/OnboardingContext"
import { useVendor } from "../../context/VendorContext"
import { supabase, isSupabaseConfigured } from "../../lib/supabase.js"
import { authApi } from "../../services/api/authApi.js"

export const MobileVerificationScreen = () => {
  const { navigate, goBack } = useAppNavigation()
  const {
    phone,
    setPhone,
    setOtp,
    otpSent,
    setOtpSent,
    isPhoneVerified,
    setIsPhoneVerified,
    isSessionOtpVerified,
    setIsSessionOtpVerified,
    loadSavedOnboarding,
    resetOnboarding,
    vendorRole,
    setVendorRole,
    setBusinessDetails,
  } = useOnboarding()
  const { refreshVendorStores } = useVendor()
  const { isMobile } = useResponsive()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [seconds, setSeconds] = useState(30)
  const [phoneError, setPhoneError] = useState("")
  const [otpError, setOtpError] = useState("")
  const [activeBoxIndex, setActiveBoxIndex] = useState(-1)
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""])

  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [isResendingOtp, setIsResendingOtp] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)

  const inputRefs = useRef([])

  // 30-second countdown timer for OTP resend inside modal
  useEffect(() => {
    if (!isModalOpen || seconds <= 0) return
    const timer = setInterval(() => {
      setSeconds((s) => s - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [isModalOpen, seconds])

  // Auto-focus the first OTP box when modal opens
  useEffect(() => {
    if (isModalOpen) {
      const timer = setTimeout(() => {
        inputRefs.current[0]?.focus()
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [isModalOpen])

  // Clean numbers only
  const cleanPhone = phone.replace(/\D/g, "")
  const isValidPhone = cleanPhone.length === 10 && /^[6-9]/.test(cleanPhone)
  const last4 = cleanPhone.length >= 4 ? cleanPhone.slice(-4) : cleanPhone
  const maskedPhone =
    cleanPhone.length >= 4 ? `+91 ••••••${last4}` : `+91 ${cleanPhone}`

  const isAllDigitsFilled =
    otpDigits.length === 6 &&
    otpDigits.every((d) => d.length === 1 && /^\d$/.test(d))

  const handleSendOtp = async () => {
    if (!cleanPhone) {
      setPhoneError("Please enter your 10-digit mobile number.")
      return
    }
    if (!isValidPhone) {
      setPhoneError(
        "Please enter a valid 10-digit Indian mobile number (starting with 6-9).",
      )
      return
    }

    setPhoneError("")
    setOtpError("")
    setIsSendingOtp(true)

    try {
      // Supabase-native Phone Auth via Send SMS Hook with MSG91
      await authApi.sendOtp(cleanPhone)
      setOtpSent(true)
      setIsModalOpen(true)
      setSeconds(30)
      setOtpDigits(["", "", "", "", "", ""])
    } catch (err) {
      console.error("[Send OTP Error]", err)
      setPhoneError(
        err.message ||
          "Failed to dispatch verification code via SMS. Please try again.",
      )
    } finally {
      setIsSendingOtp(false)
    }
  }

  const handleResendOtp = async () => {
    if (seconds > 0 || isResendingOtp) return
    setOtpError("")
    setIsResendingOtp(true)

    try {
      await authApi.resendOtp(cleanPhone)
      setSeconds(30)
      setOtpDigits(["", "", "", "", "", ""])
    } catch (e) {
      console.warn("[Resend OTP Error]", e.message)
      setOtpError(e.message || "Failed to resend OTP. Please try again.")
    } finally {
      setIsResendingOtp(false)
      setTimeout(() => {
        inputRefs.current[0]?.focus()
      }, 100)
    }
  }

  const handleOtpChange = (text, index) => {
    const digitsOnly = text.replace(/\D/g, "")

    if (!digitsOnly) {
      const newDigits = [...otpDigits]
      newDigits[index] = ""
      setOtpDigits(newDigits)
      if (otpError) setOtpError("")
      return
    }

    if (otpError) setOtpError("")

    // If pasted or multiple digits entered
    if (digitsOnly.length > 1) {
      if (digitsOnly.length >= 6) {
        // Full 6-digit paste
        const chars = digitsOnly.slice(0, 6).split("")
        const newDigits = ["", "", "", "", "", ""]
        chars.forEach((c, idx) => {
          newDigits[idx] = c
        })
        setOtpDigits(newDigits)
        inputRefs.current[5]?.focus()
      } else {
        // User typed while box was already filled; take the latest character
        const lastChar = digitsOnly.slice(-1)
        const newDigits = [...otpDigits]
        newDigits[index] = lastChar
        setOtpDigits(newDigits)
        if (index < 5) {
          inputRefs.current[index + 1]?.focus()
        }
      }
      return
    }

    // Single digit typed
    const newDigits = [...otpDigits]
    newDigits[index] = digitsOnly
    setOtpDigits(newDigits)

    // Auto-focus next box
    if (index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace") {
      if (!otpDigits[index] && index > 0) {
        const newDigits = [...otpDigits]
        newDigits[index - 1] = ""
        setOtpDigits(newDigits)
        inputRefs.current[index - 1]?.focus()
      }
    }
  }

  const handlePaste = (e) => {
    if (Platform.OS === "web") {
      const nativeEvent = e.nativeEvent || e
      const clipboardData = nativeEvent.clipboardData || window?.clipboardData
      if (clipboardData) {
        const text = clipboardData.getData("Text") || ""
        const digitsOnly = text.replace(/\D/g, "").slice(0, 6)
        if (digitsOnly.length > 0) {
          if (e.preventDefault) e.preventDefault()
          const newDigits = ["", "", "", "", "", ""]
          digitsOnly.split("").forEach((d, idx) => {
            newDigits[idx] = d
          })
          setOtpDigits(newDigits)
          const focusIndex = Math.min(digitsOnly.length, 5)
          inputRefs.current[focusIndex]?.focus()
        }
      }
    }
  }

  const handleVerifyOtp = async () => {
    if (!isAllDigitsFilled || isVerifyingOtp) return

    const fullOtp = otpDigits.join("")
    setOtp(fullOtp)
    setOtpError("")
    setIsVerifyingOtp(true)

    try {
      const res = await authApi.verifyOtp(cleanPhone, fullOtp)

      if (res && res.success && res.user) {
        // Authoritatively mark session as OTP verified
        if (setIsPhoneVerified) {
          setIsPhoneVerified(true)
        }
        if (setIsSessionOtpVerified) {
          setIsSessionOtpVerified(true)
        }
        setIsModalOpen(false)
        setPhoneError("")
        setOtpError("")

        // Store selected role in case this is a new onboarding
        const selectedRole = vendorRole

        // Reset stale user-scoped in-memory state before loading new user data
        if (resetOnboarding) {
          resetOnboarding()
        }

        // Restore verified identity flags
        if (setPhone) setPhone(cleanPhone)
        if (setIsPhoneVerified) setIsPhoneVerified(true)
        if (setIsSessionOtpVerified) setIsSessionOtpVerified(true)
        if (selectedRole && setVendorRole) setVendorRole(selectedRole)

        // Check if returning vendor with previously saved onboarding progress
        let savedState = null
        if (loadSavedOnboarding && res.user.id) {
          try {
            savedState = await loadSavedOnboarding(res.user.id)
          } catch (loadErr) {
            console.warn(
              "[MobileVerification] Could not load saved onboarding state:",
              loadErr,
            )
          }
        }

        if (savedState && savedState.exists && savedState.vendor) {
          // Returning vendor: resume at legitimate step or dashboard
          if (refreshVendorStores) {
            refreshVendorStores()
          }

          const existingVendor = savedState.vendor
          const role =
            existingVendor.vendor_type === "grocery" ? "grocery" : "restaurant"
          if (setVendorRole) setVendorRole(role)

          if (
            existingVendor.onboarding_status === "submitted" ||
            existingVendor.onboarding_status === "under_review" ||
            existingVendor.onboarding_status === "rejected"
          ) {
            navigate("pending")
            return
          }

          if (
            existingVendor.onboarding_status === "approved" ||
            existingVendor.onboarding_status === "live"
          ) {
            navigate(
              existingVendor.vendor_type === "grocery"
                ? "grocery-home"
                : "restaurant-home",
            )
            return
          }

          // Incomplete draft onboarding: resume at the exact saved step
          const step = Number(existingVendor.onboarding_step) || 3
          switch (step) {
            case 1:
              navigate("role")
              break
            case 2:
            case 3:
              navigate("business")
              break
            case 4:
              navigate("tax")
              break
            case 5:
              navigate("address")
              break
            case 6:
              navigate("kyc")
              break
            case 7:
              navigate("photos")
              break
            case 8:
            case 9:
            case 10:
              navigate("terms")
              break
            default:
              if (step >= 11) {
                navigate("pending")
              } else {
                navigate("business")
              }
              break
          }
        } else {
          // New vendor: start clean with chosen role or prompt for role
          if (!selectedRole) {
            navigate("role")
          } else {
            navigate("business")
          }
        }
      }
    } catch (serverErr) {
      console.error("[Verify OTP Error]", serverErr)
      // Security Enforcement: Do NOT mark phone as verified when verification fails
      if (setIsPhoneVerified) {
        setIsPhoneVerified(false)
      }
      if (setIsSessionOtpVerified) {
        setIsSessionOtpVerified(false)
      }
      setPhoneError(
        serverErr.message || "Server verification failed. Please try again.",
      )
      setOtpError(
        serverErr.message ||
          "Verification failed. Please check OTP and try again.",
      )
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  const handleRegisterAndContinue = async () => {
    if (isRegistering) return

    if (!isPhoneVerified || !isSessionOtpVerified) {
      setPhoneError("Please verify your mobile number first.")
      return
    }

    setIsRegistering(true)
    setPhoneError("")

    try {
      // Security Gate: Check if user has an active Supabase session
      if (isSupabaseConfigured) {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          setPhoneError(
            "Verification session expired or unauthenticated. Please verify your phone number again.",
          )
          if (setIsPhoneVerified) setIsPhoneVerified(false)
          if (setIsSessionOtpVerified) setIsSessionOtpVerified(false)
          return
        }
      }

      navigate("business")
    } catch (err) {
      console.error("[Register & Continue Error]", err)
      setPhoneError(err.message || "Failed to proceed to registration.")
    } finally {
      setIsRegistering(false)
    }
  }

  return (
    <View style={styles.container}>
      {isMobile && <AppHeader title="Mobile Verification" onBack={goBack} />}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          !isMobile && styles.scrollContentDesktop,
        ]}
      >
        <View style={styles.formCard}>
          {isMobile && (
            <View style={styles.brandRow}>
              <AppLogo compact />
            </View>
          )}
          <Text style={styles.eyebrow}>SET UP YOUR STORE</Text>
          <Text style={styles.title}>Verify your mobile number</Text>
          <Text style={styles.subtitle}>
            Enter your primary merchant phone number. We will send an instant
            SMS code via MSG91 to authenticate your business account.
          </Text>

          {/* Mobile Number Input + Action */}
          <View style={styles.phoneSection}>
            <View style={styles.phoneInputCol}>
              <AppInput
                label="Merchant Mobile Number"
                value={phone}
                onChangeText={(txt) => {
                  setPhone(txt)
                  if (phoneError) setPhoneError("")
                }}
                placeholder="e.g. 98765 43210"
                keyboardType="phone-pad"
                maxLength={14}
                error={phoneError}
                editable={!isPhoneVerified && !isSendingOtp}
              />
            </View>

            {isPhoneVerified ? (
              <View style={styles.verifiedStatusBox}>
                <View style={styles.verifiedBadgeLeft}>
                  <View style={styles.verifiedBadgeIcon}>
                    <AppIcon
                      name="check"
                      size={12}
                      color={colors.white}
                      strokeWidth={2.5}
                    />
                  </View>
                  <Text style={styles.verifiedStatusText}>
                    Mobile number verified
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    if (setIsPhoneVerified) setIsPhoneVerified(false)
                    setOtpSent(false)
                    setOtpDigits(["", "", "", "", "", ""])
                  }}
                  style={styles.changePhoneAnchor}
                >
                  <Text style={styles.changePhoneText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={!isValidPhone || isSendingOtp || isVerifyingOtp}
                onPress={handleSendOtp}
                style={[
                  styles.sendOtpBtn,
                  (!isValidPhone || isSendingOtp || isVerifyingOtp) &&
                    styles.sendOtpBtnDisabled,
                ]}
              >
                {isVerifyingOtp ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={colors.white} />
                    <Text style={styles.sendOtpText}>Verifying OTP...</Text>
                  </View>
                ) : isSendingOtp ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={colors.white} />
                    <Text style={styles.sendOtpText}>
                      Sending OTP via SMS...
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.sendOtpText,
                      !isValidPhone && styles.sendOtpTextDisabled,
                    ]}
                  >
                    Send OTP
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Main Action: Register & Continue (disabled until verified) */}
          <AppButton
            disabled={!isPhoneVerified || isRegistering}
            loading={isRegistering}
            onPress={handleRegisterAndContinue}
            style={[
              styles.ctaBtn,
              (!isPhoneVerified || isRegistering) && styles.ctaBtnDisabled,
            ]}
          >
            Register & Continue
          </AppButton>
        </View>
      </ScrollView>

      {/* Verification Modal / Dialog */}
      <Modal
        transparent
        visible={isModalOpen}
        animationType="fade"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalBackdrop}
            onPress={() => setIsModalOpen(false)}
          />
          <View style={styles.modalCard}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.modalCloseBtn}
              onPress={() => setIsModalOpen(false)}
              accessibilityLabel="Close verification modal"
            >
              <AppIcon
                name="close"
                size={18}
                color={colors.charcoal}
                strokeWidth={2}
              />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Verify your mobile number</Text>
            <Text style={styles.modalSubtitle}>OTP sent to {maskedPhone}</Text>

            {/* 6 OTP Boxes */}
            <View style={styles.otpRow}>
              {otpDigits.map((digit, index) => {
                const isFocused = activeBoxIndex === index
                const isFilled = digit.length > 0
                return (
                  <TextInput
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el
                    }}
                    value={digit}
                    onChangeText={(txt) => handleOtpChange(txt, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    onFocus={() => setActiveBoxIndex(index)}
                    onBlur={() => setActiveBoxIndex(-1)}
                    keyboardType="number-pad"
                    maxLength={6}
                    selectTextOnFocus
                    editable={!isVerifyingOtp}
                    style={[
                      styles.otpBox,
                      isFocused && styles.otpBoxFocused,
                      isFilled && styles.otpBoxFilled,
                      Platform.OS === "web" && {
                        outlineStyle: "none",
                        outlineWidth: 0,
                      },
                    ]}
                    {...(Platform.OS === "web" ? { onPaste: handlePaste } : {})}
                  />
                )
              })}
            </View>

            {otpError ? (
              <Text style={styles.otpErrorText}>{otpError}</Text>
            ) : null}

            {/* Verify OTP Button inside Modal */}
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={!isAllDigitsFilled || isVerifyingOtp}
              onPress={handleVerifyOtp}
              style={[
                styles.modalVerifyBtn,
                (!isAllDigitsFilled || isVerifyingOtp) &&
                  styles.modalVerifyBtnDisabled,
              ]}
            >
              {isVerifyingOtp ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={colors.white} />
                  <Text style={styles.modalVerifyBtnText}>
                    Verifying OTP...
                  </Text>
                </View>
              ) : (
                <Text
                  style={[
                    styles.modalVerifyBtnText,
                    !isAllDigitsFilled && styles.modalVerifyBtnTextDisabled,
                  ]}
                >
                  Verify OTP
                </Text>
              )}
            </TouchableOpacity>

            {/* Resend OTP text anchor action */}
            <View style={styles.modalResendRow}>
              <Text style={styles.modalResendText}>
                Didn’t receive OTP?{" "}
                {seconds > 0 ? (
                  <Text style={styles.modalResendCountdown}>
                    Resend OTP in {seconds}s
                  </Text>
                ) : isResendingOtp ? (
                  <Text style={styles.modalResendCountdown}>
                    Resending OTP...
                  </Text>
                ) : (
                  <Text
                    onPress={handleResendOtp}
                    style={styles.modalResendAnchor}
                  >
                    Resend OTP
                  </Text>
                )}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
  },
  scrollContentDesktop: {
    padding: 36,
  },
  formCard: {
    width: "100%",
  },
  brandRow: {
    alignItems: "center",
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: typography.fonts.headingBold,
    letterSpacing: 1.4,
    color: colors.terracotta,
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: typography.fonts.headingBold,
    color: colors.black,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
    lineHeight: 18,
    marginBottom: 20,
  },
  phoneSection: {
    marginBottom: 16,
  },
  phoneInputCol: {
    width: "100%",
  },
  sendOtpBtn: {
    backgroundColor: colors.terracotta,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.button,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -4,
    marginBottom: 8,
    minHeight: 44,
  },
  sendOtpBtnDisabled: {
    backgroundColor: colors.surfaceSubtle,
  },
  sendOtpText: {
    color: colors.white,
    fontFamily: typography.fonts.heading,
    fontWeight: "600",
    fontSize: 13,
  },
  sendOtpTextDisabled: {
    color: colors.warmGrey,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  verifiedStatusBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.25)",
    borderRadius: radius.input,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginTop: -4,
    marginBottom: 10,
  },
  verifiedBadgeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  verifiedBadgeIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedStatusText: {
    fontSize: 12.5,
    fontFamily: typography.fonts.heading,
    fontWeight: "600",
    color: "#065F46",
  },
  changePhoneAnchor: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  changePhoneText: {
    fontSize: 11.5,
    fontFamily: typography.fonts.bodyMedium,
    color: colors.charcoal,
    textDecorationLine: "underline",
  },
  ctaBtn: {
    marginTop: 8,
    minHeight: 48,
  },
  ctaBtnDisabled: {
    opacity: 0.5,
  },

  // Modal Dialog Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
    ...(Platform.OS === "web"
      ? {
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
        }
      : {}),
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 24,
    paddingHorizontal: 16,
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    position: "relative",
    ...(Platform.OS === "web"
      ? {
          boxShadow: "0 20px 35px -5px rgba(0, 0, 0, 0.25)",
        }
      : {}),
  },
  modalCloseBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: typography.fonts.headingBold,
    color: colors.black,
    marginBottom: 6,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
    marginBottom: 8,
    textAlign: "center",
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginVertical: 16,
    width: "100%",
  },
  otpBox: {
    flex: 1,
    maxWidth: 46,
    minWidth: 28,
    height: 48,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "rgba(156, 154, 154, 0.35)",
    backgroundColor: colors.white,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    fontFamily: typography.fonts.headingBold,
    color: colors.black,
    paddingHorizontal: 0,
  },
  otpBoxFocused: {
    borderColor: colors.terracotta,
    borderWidth: 2,
    backgroundColor: colors.white,
  },
  otpBoxFilled: {
    borderColor: colors.terracotta,
  },
  otpErrorText: {
    fontSize: 11.5,
    color: colors.danger,
    fontFamily: typography.fonts.bodyMedium,
    marginBottom: 10,
    textAlign: "center",
  },
  modalVerifyBtn: {
    backgroundColor: colors.terracotta,
    height: 48,
    width: "100%",
    borderRadius: radius.button,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  modalVerifyBtnDisabled: {
    backgroundColor: colors.surfaceSubtle,
    opacity: 0.6,
  },
  modalVerifyBtnText: {
    color: colors.white,
    fontFamily: typography.fonts.heading,
    fontWeight: "600",
    fontSize: 14,
  },
  modalVerifyBtnTextDisabled: {
    color: colors.warmGrey,
  },
  modalResendRow: {
    alignItems: "center",
    justifyContent: "center",
  },
  modalResendText: {
    fontSize: 12.5,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
    textAlign: "center",
  },
  modalResendCountdown: {
    color: colors.warmGrey,
    fontFamily: typography.fonts.bodyMedium,
  },
  modalResendAnchor: {
    color: colors.terracotta,
    fontFamily: typography.fonts.heading,
    fontWeight: "600",
    textDecorationLine: "underline",
    ...(Platform.OS === "web" ? { cursor: "pointer" } : {}),
  },
})

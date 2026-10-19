import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { typography } from '../../theme/typography';
import { AppHeader } from '../../components/common/AppHeader';
import { AppLogo } from '../../components/common/AppLogo';
import { AppInput } from '../../components/common/AppInput';
import { AppButton } from '../../components/common/AppButton';
import { AppIcon } from '../../components/common/AppIcon';
import { useResponsive } from '../../theme/useResponsive';
import { useAppNavigation } from '../../navigation/NavigationContext';
import { useVendor } from '../../context/VendorContext';
import { useOnboarding } from '../../context/OnboardingContext';
import { authApi } from '../../services/api/authApi';
import { supabase } from '../../lib/supabase.js';

export const SignInScreen = () => {
  const { navigate, goBack } = useAppNavigation();
  const { isMobile } = useResponsive();
  const { activeStore, switchStore, refreshVendorStores } = useVendor();
  const {
    setBusinessDetails,
    loadSavedOnboarding,
    setVendorRole,
    setPhone,
    setIsSessionOtpVerified,
    setIsPhoneVerified,
    resetOnboarding,
  } = useOnboarding();

  const [mobileNumber, setMobileNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [seconds, setSeconds] = useState(30);
  const [otpError, setOtpError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeBoxIndex, setActiveBoxIndex] = useState(-1);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);

  const inputRefs = useRef([]);

  // 30-second countdown timer for OTP resend
  useEffect(() => {
    if (!isModalOpen || seconds <= 0) return;
    const timer = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [isModalOpen, seconds]);

  // Auto-focus the first OTP box when modal opens
  useEffect(() => {
    if (isModalOpen) {
      const timer = setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isModalOpen]);

  const cleanPhone = mobileNumber.replace(/\D/g, '');
  const isValidPhone = cleanPhone.length === 10 && /^[6-9]/.test(cleanPhone);
  const last4 = cleanPhone.length >= 4 ? cleanPhone.slice(-4) : '3210';
  const maskedPhone = `+91 ••••••${last4}`;

  const isAllDigitsFilled =
    otpDigits.length === 6 && otpDigits.every((d) => d.length === 1 && /^\d$/.test(d));

  const handleSendOtp = async () => {
    if (!cleanPhone) {
      setPhoneError('Please enter your 10-digit mobile number.');
      return;
    }
    if (!isValidPhone) {
      setPhoneError('Please enter a valid 10-digit Indian mobile number (starting with 6-9).');
      return;
    }

    setPhoneError('');
    setOtpError('');
    setIsSending(true);

    try {
      // Supabase-native Phone Auth via Send SMS Hook with MSG91
      await authApi.sendOtp(cleanPhone);
      setIsModalOpen(true);
      setSeconds(30);
      setOtpDigits(['', '', '', '', '', '']);
    } catch (err) {
      console.error('[Send OTP Error]', err);
      setPhoneError(err.message || 'Failed to dispatch verification code via SMS. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleResendOtp = async () => {
    if (seconds > 0 || isSending) return;
    setOtpError('');
    setIsSending(true);

    try {
      await authApi.resendOtp(cleanPhone);
      setSeconds(30);
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    } catch (err) {
      setOtpError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleOtpChange = (text, index) => {
    const digitsOnly = text.replace(/\D/g, '');

    if (!digitsOnly) {
      const newDigits = [...otpDigits];
      newDigits[index] = '';
      setOtpDigits(newDigits);
      if (otpError) setOtpError('');
      return;
    }

    if (otpError) setOtpError('');

    // If pasted or multiple digits entered
    if (digitsOnly.length > 1) {
      if (digitsOnly.length >= 6) {
        // Full 6-digit paste
        const chars = digitsOnly.slice(0, 6).split('');
        const newDigits = ['', '', '', '', '', ''];
        chars.forEach((c, idx) => {
          newDigits[idx] = c;
        });
        setOtpDigits(newDigits);
        inputRefs.current[5]?.focus();
      } else {
        // Character replaced
        const lastChar = digitsOnly.slice(-1);
        const newDigits = [...otpDigits];
        newDigits[index] = lastChar;
        setOtpDigits(newDigits);
        if (index < 5) {
          inputRefs.current[index + 1]?.focus();
        }
      }
      return;
    }

    // Single digit entered
    const newDigits = [...otpDigits];
    newDigits[index] = digitsOnly;
    setOtpDigits(newDigits);

    // Auto-focus next box
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e) => {
    if (Platform.OS === 'web') {
      const nativeEvent = e.nativeEvent || e;
      const clipboardData = nativeEvent.clipboardData || window?.clipboardData;
      if (clipboardData) {
        const text = clipboardData.getData('Text') || '';
        const digitsOnly = text.replace(/\D/g, '').slice(0, 6);
        if (digitsOnly.length > 0) {
          if (e.preventDefault) e.preventDefault();
          const newDigits = ['', '', '', '', '', ''];
          digitsOnly.split('').forEach((d, idx) => {
            newDigits[idx] = d;
          });
          setOtpDigits(newDigits);
          const focusIndex = Math.min(digitsOnly.length, 5);
          inputRefs.current[focusIndex]?.focus();
        }
      }
    }
  };

  const handleVerifyOtp = async () => {
    if (!isAllDigitsFilled || isVerifying) return;

    const fullOtp = otpDigits.join('');
    setOtpError('');
    setIsVerifying(true);

    try {
      const res = await authApi.verifyOtp(cleanPhone, fullOtp);
      if (res && res.success) {
        setIsModalOpen(false);

        // Mark in-memory OTP verification in context
        if (setIsPhoneVerified) setIsPhoneVerified(true);
        if (setIsSessionOtpVerified) setIsSessionOtpVerified(true);

        // Reset stale in-memory state before loading new user data
        if (resetOnboarding) {
          resetOnboarding();
        }

        if (setIsPhoneVerified) setIsPhoneVerified(true);
        if (setIsSessionOtpVerified) setIsSessionOtpVerified(true);
        if (setPhone) setPhone(cleanPhone);

        // Query vendor profile to route based on role and status
        let existingVendor = null;
        if (res.user?.id) {
          try {
            const { data: vData } = await supabase
              .from('vendors')
              .select('*')
              .eq('user_id', res.user.id)
              .maybeSingle();
            existingVendor = vData;
          } catch (vErr) {
            console.warn('[SignIn Vendor Lookup notice]', vErr);
          }
        }

        if (existingVendor) {
          if (refreshVendorStores) {
            refreshVendorStores();
          }

          if (loadSavedOnboarding && res.user?.id) {
            try {
              await loadSavedOnboarding(res.user.id);
            } catch (loadErr) {
              console.warn('[SignIn] Could not load saved onboarding state:', loadErr);
            }
          }

          const role = existingVendor.vendor_type === 'grocery' ? 'grocery' : 'restaurant';
          if (setVendorRole) setVendorRole(role);
          if (setPhone) setPhone(cleanPhone);

          // Set business details in context
          setBusinessDetails((prev) => ({
            ...prev,
            businessName: existingVendor.business_name || 'My Business Outlet',
            businessType: existingVendor.vendor_type === 'grocery' ? 'Grocery' : 'Restaurant',
          }));

          // If onboarding submitted, under review, or rejected: route to pending screen
          if (
            existingVendor.onboarding_status === 'submitted' ||
            existingVendor.onboarding_status === 'under_review' ||
            existingVendor.onboarding_status === 'rejected'
          ) {
            navigate('pending');
            return;
          }

          // If approved / live, route to role-specific dashboard
          if (existingVendor.onboarding_status === 'approved' || existingVendor.onboarding_status === 'live') {
            if (existingVendor.vendor_type === 'grocery') {
              navigate('grocery-home');
            } else {
              navigate('restaurant-home');
            }
            return;
          }

          // Returning vendor with incomplete/draft onboarding: resume at the exact incomplete step
          const step = Number(existingVendor.onboarding_step) || 3;
          switch (step) {
            case 1:
              navigate('role');
              break;
            case 2:
            case 3:
              navigate('business');
              break;
            case 4:
              navigate('tax');
              break;
            case 5:
              navigate('address');
              break;
            case 6:
              navigate('kyc');
              break;
            case 7:
              navigate('photos');
              break;
            case 8:
            case 9:
            case 10:
              navigate('terms');
              break;
            default:
              if (step >= 11) {
                navigate('pending');
              } else {
                navigate('business');
              }
              break;
          }
        } else {
          // New authenticated user without existing vendor record:
          // Proceed to choose business type to start onboarding (never create duplicate vendor)
          if (setPhone) setPhone(cleanPhone);
          navigate('role');
        }
      }
    } catch (err) {
      setOtpError(err.message || 'Verification failed. Please check the code.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Partner Sign In" onBack={goBack} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          !isMobile && styles.scrollContentDesktop,
        ]}
      >
        <View style={styles.formCard}>
          <View style={styles.logoRow}>
            <AppLogo />
          </View>
          <Text style={styles.eyebrow}>EXISTING PARTNER ACCESS</Text>
          <Text style={styles.title}>Sign in to your store</Text>
          <Text style={styles.subtitle}>
            Enter your registered mobile number. We will send an SMS verification code via MSG91 to sign you in.
          </Text>

          {phoneError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{phoneError}</Text>
            </View>
          ) : null}

          <View style={styles.inputWrapper}>
            <AppInput
              label="Registered Mobile Number"
              value={mobileNumber}
              onChangeText={(val) => {
                setMobileNumber(val);
                if (phoneError) setPhoneError('');
              }}
              placeholder="9876543210"
              keyboardType="phone-pad"
              maxLength={10}
              editable={!isSending}
            />
          </View>

          <AppButton
            onPress={handleSendOtp}
            disabled={isSending || isVerifying || !isValidPhone}
            style={styles.submitBtn}
          >
            {isVerifying ? 'Verifying Code...' : isSending ? 'Sending Code via SMS...' : 'Send Verification Code'}
          </AppButton>

          <View style={styles.switchFlowRow}>
            <Text style={styles.switchFlowText}>New to RoadRider? </Text>
            <TouchableOpacity onPress={() => navigate('role')}>
              <Text style={styles.switchFlowLink}>Create Partner Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* OTP Verification Modal / Dialog */}
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
              <AppIcon name="close" size={18} color={colors.charcoal} strokeWidth={2} />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Verify your mobile number</Text>
            <Text style={styles.modalSubtitle}>
              OTP sent to {maskedPhone}
            </Text>

            {/* 6 OTP Boxes */}
            <View style={styles.otpRow}>
              {otpDigits.map((digit, index) => {
                const isFocused = activeBoxIndex === index;
                const isFilled = digit.length > 0;
                return (
                  <TextInput
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    value={digit}
                    onChangeText={(txt) => handleOtpChange(txt, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    onFocus={() => setActiveBoxIndex(index)}
                    onBlur={() => setActiveBoxIndex(-1)}
                    keyboardType="number-pad"
                    maxLength={6}
                    selectTextOnFocus
                    editable={!isVerifying}
                    style={[
                      styles.otpBox,
                      isFocused && styles.otpBoxFocused,
                      isFilled && styles.otpBoxFilled,
                      Platform.OS === 'web' && {
                        outlineStyle: 'none',
                        outlineWidth: 0,
                      },
                    ]}
                    {...(Platform.OS === 'web' ? { onPaste: handlePaste } : {})}
                  />
                );
              })}
            </View>

            {otpError ? <Text style={styles.otpErrorText}>{otpError}</Text> : null}

            {/* Verify & Sign In Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={!isAllDigitsFilled || isVerifying}
              onPress={handleVerifyOtp}
              style={[
                styles.modalVerifyBtn,
                (!isAllDigitsFilled || isVerifying) && styles.modalVerifyBtnDisabled,
              ]}
            >
              {isVerifying ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={colors.white} />
                  <Text style={styles.modalVerifyBtnText}>Verifying Code...</Text>
                </View>
              ) : (
                <Text
                  style={[
                    styles.modalVerifyBtnText,
                    !isAllDigitsFilled && styles.modalVerifyBtnTextDisabled,
                  ]}
                >
                  Verify & Sign In
                </Text>
              )}
            </TouchableOpacity>

            {/* Resend OTP text anchor action */}
            <View style={styles.modalResendRow}>
              <Text style={styles.modalResendText}>
                Didn’t receive the code?{' '}
                {seconds > 0 ? (
                  <Text style={styles.modalResendCountdown}>
                    Resend code in {seconds}s
                  </Text>
                ) : isSending ? (
                  <Text style={styles.modalResendCountdown}>
                    Resending code...
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7F6',
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
    alignItems: 'center',
  },
  scrollContentDesktop: {
    paddingVertical: 48,
  },
  formCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: 24,
    borderWidth: 1,
    borderColor: '#EFECE9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
  },
  logoRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 10.5,
    fontFamily: typography.fonts.headingBold,
    color: colors.terracotta,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
    fontFamily: typography.fonts.headingBold,
    fontWeight: '700',
    color: colors.black,
    marginBottom: 6,
    lineHeight: 26,
  },
  subtitle: {
    fontSize: 12.5,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
    lineHeight: 18,
    marginBottom: 20,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  submitBtn: {
    marginTop: 8,
  },
  switchFlowRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0ECE8',
  },
  switchFlowText: {
    fontSize: 12,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
  },
  switchFlowLink: {
    fontSize: 12,
    fontFamily: typography.fonts.headingBold,
    fontWeight: '600',
    color: colors.terracotta,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 12,
    color: '#991B1B',
    fontFamily: typography.fonts.body,
  },

  // Modal Dialog Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    ...(Platform.OS === 'web'
      ? {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
        }
      : {}),
  },
  modalBackdrop: {
    position: 'absolute',
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
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    position: 'relative',
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 20px 35px -5px rgba(0, 0, 0, 0.25)',
        }
      : {}),
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: typography.fonts.headingBold,
    color: colors.black,
    marginBottom: 6,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
    marginBottom: 8,
    textAlign: 'center',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginVertical: 16,
    width: '100%',
  },
  otpBox: {
    flex: 1,
    maxWidth: 46,
    minWidth: 28,
    height: 48,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(156, 154, 154, 0.35)',
    backgroundColor: colors.white,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
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
    textAlign: 'center',
  },
  modalVerifyBtn: {
    backgroundColor: colors.terracotta,
    height: 48,
    width: '100%',
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: '600',
    fontSize: 14,
  },
  modalVerifyBtnTextDisabled: {
    color: colors.warmGrey,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalResendRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalResendText: {
    fontSize: 12.5,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
    textAlign: 'center',
  },
  modalResendCountdown: {
    color: colors.warmGrey,
    fontFamily: typography.fonts.bodyMedium,
  },
  modalResendAnchor: {
    color: colors.terracotta,
    fontFamily: typography.fonts.heading,
    fontWeight: '600',
    textDecorationLine: 'underline',
    fontSize: 12,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
});

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors } from '../../theme/colors';
import { AppLogo } from '../../components/common/AppLogo';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppIcon } from '../../components/common/AppIcon';
import { useAppNavigation } from '../../navigation/NavigationContext';
import { useOnboarding } from '../../context/OnboardingContext';
import { vendorOnboardingService } from '../../services/vendorOnboardingService';
import { isSupabaseConfigured } from '../../lib/supabase.js';

export const VerificationPendingScreen = () => {
  const { navigate } = useAppNavigation();
  const {
    verificationStatus,
    setVerificationStatus,
    vendorRole,
    setVendorRole,
    rejectionReason,
    setRejectionReason,
  } = useOnboarding();
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [syncError, setSyncError] = useState(null);

  const checkLiveStatus = async () => {
    if (!isSupabaseConfigured) return;
    try {
      const statusRes = await vendorOnboardingService.getOnboardingStatus();
      if (statusRes && statusRes.isError) {
        console.warn('[VerificationPendingScreen] Live status check notice:', statusRes.error);
        setSyncError(statusRes.error || 'Failed to sync verification status from database.');
        return;
      }

      setSyncError(null);

      if (statusRes && statusRes.exists) {
        if (statusRes.vendorType && setVendorRole && (!vendorRole || vendorRole !== statusRes.vendorType)) {
          setVendorRole(statusRes.vendorType);
        }
        if (statusRes.onboardingStatus === 'approved' || statusRes.onboardingStatus === 'live') {
          setVerificationStatus('verified');
        } else if (statusRes.onboardingStatus === 'rejected') {
          setVerificationStatus('rejected');
          if (statusRes.rejectionReason && setRejectionReason) {
            setRejectionReason(statusRes.rejectionReason);
          }
        } else if (statusRes.onboardingStatus === 'submitted' || statusRes.onboardingStatus === 'under_review') {
          setVerificationStatus('in_review');
        } else {
          setVerificationStatus('waiting');
        }
      }
    } catch (e) {
      console.warn('[VerificationPendingScreen] Live status check notice:', e.message);
      setSyncError(e.message || 'Verification service unreachable.');
    }
  };

  useEffect(() => {
    checkLiveStatus();
    const timer = setInterval(checkLiveStatus, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleManualCheck = async () => {
    setIsCheckingStatus(true);
    await checkLiveStatus();
    setIsCheckingStatus(false);
  };

  const isVerified = verificationStatus === 'verified';
  const isRejected = verificationStatus === 'rejected';
  const isWaiting = verificationStatus === 'waiting';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppLogo compact />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Animated illustration circle / status indicator */}
        <View style={styles.illustrationWrapper}>
          {isVerified ? (
            <View style={styles.verifiedCircleBg}>
              <View style={styles.innerBadgeVerified}>
                <AppIcon name="check" size={40} color={colors.white} strokeWidth={2.8} />
              </View>
            </View>
          ) : isRejected ? (
            <View style={styles.rejectedCircleBg}>
              <View style={styles.innerBadgeRejected}>
                <AppIcon name="close" size={36} color={colors.white} strokeWidth={2.8} />
              </View>
            </View>
          ) : (
            <div className="roadrider-radar-container" style={{ position: 'relative', width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div
                className="roadrider-radar-wave"
                style={{
                  position: 'absolute',
                  width: 140,
                  height: 140,
                  borderRadius: '50%',
                  border: `2px solid ${colors.terracotta}`,
                  boxSizing: 'border-box',
                }}
              />
              <div
                className="roadrider-spin-indicator"
                style={{
                  position: 'absolute',
                  width: 110,
                  height: 110,
                  borderRadius: '50%',
                  border: '3px dashed rgba(163, 94, 71, 0.45)',
                  boxSizing: 'border-box',
                }}
              />
              <div
                className="roadrider-pulsing-badge"
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  backgroundColor: colors.black,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                }}
              >
                <AppIcon name="clock" size={34} color={colors.white} strokeWidth={2} />
              </div>
            </div>
          )}
        </View>

        <Text
          style={[
            styles.eyebrow,
            isVerified && styles.eyebrowVerified,
            isRejected && styles.eyebrowRejected,
          ]}
        >
          {isVerified
            ? 'PARTNER STATUS: ACTIVE'
            : isRejected
            ? 'APPLICATION REJECTED'
            : isWaiting
            ? 'DOCUMENT UPDATE SUBMITTED'
            : 'APPLICATION SUBMITTED'}
        </Text>
        <Text style={styles.title}>
          {isVerified
            ? 'Verified & Active'
            : isRejected
            ? 'Action Required on Application'
            : 'Verification in progress'}
        </Text>
        <Text style={styles.subtitle}>
          {isVerified
            ? 'Your store documents and bank details are fully verified. Your store is live on the RoadRider network.'
            : isRejected
            ? 'Your application was reviewed by our compliance team and could not be approved with the current documents.'
            : isWaiting
            ? 'You recently updated your business or KYC details. Our compliance team is verifying the changes (usually within 2–4 hours).'
            : 'Our compliance team is verifying your submitted documents. This usually takes 1–2 business days.'}
        </Text>

        {syncError && (
          <View style={styles.syncErrorBanner}>
            <AppIcon name="alert-circle" size={16} color={colors.danger} />
            <Text style={styles.syncErrorText}>{syncError}</Text>
          </View>
        )}

        {isRejected ? (
          <AppCard style={styles.rejectionCard}>
            <View style={styles.rejectionHeader}>
              <AppIcon name="close" size={16} color={colors.danger} />
              <Text style={styles.rejectionHeaderTitle}>Rejection Reason</Text>
            </View>
            <Text style={styles.rejectionReasonText}>
              {rejectionReason || 'Uploaded documentation or bank details did not meet regulatory compliance requirements. Please update and resubmit your documents for review.'}
            </Text>
          </AppCard>
        ) : (
          <AppCard style={styles.progressCard}>
            <View style={styles.stepRow}>
              <View style={[styles.stepBadge, styles.stepDone]}>
                <AppIcon name="check" size={12} color={colors.white} strokeWidth={2.8} />
              </View>
              <View style={styles.stepInfo}>
                <Text style={styles.stepTitle}>Application submitted</Text>
                <Text style={styles.stepSubtitle}>Completed</Text>
              </View>
              <Text style={styles.stepTimestamp}>Done</Text>
            </View>

            <View style={styles.stepDivider} />

            <View style={styles.stepRow}>
              <View style={[styles.stepBadge, isVerified ? styles.stepDone : styles.stepActive]}>
                {isVerified ? (
                  <AppIcon name="check" size={12} color={colors.white} strokeWidth={2.8} />
                ) : (
                  <div
                    className="roadrider-spin-indicator"
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      border: `2px solid ${colors.terracotta}`,
                      borderTopColor: 'transparent',
                    }}
                  />
                )}
              </View>
              <View style={styles.stepInfo}>
                <Text style={styles.stepTitle}>Document & bank verification</Text>
                <Text style={styles.stepSubtitle}>
                  {isVerified ? 'All documents approved' : 'In review by RoadRider team'}
                </Text>
              </View>
              <View
                style={[
                  styles.badgePill,
                  isVerified ? styles.badgePillSuccess : styles.badgePillWarning,
                ]}
              >
                <Text
                  style={[
                    styles.badgePillText,
                    isVerified ? styles.badgePillTextSuccess : styles.badgePillTextWarning,
                  ]}
                >
                  {isVerified ? 'Verified' : 'In Progress'}
                </Text>
              </View>
            </View>

            <View style={styles.stepDivider} />

            <View style={styles.stepRow}>
              <View style={[styles.stepBadge, isVerified ? styles.stepDone : null]}>
                {isVerified ? (
                  <AppIcon name="check" size={12} color={colors.white} strokeWidth={2.8} />
                ) : (
                  <Text style={styles.stepNumber}>3</Text>
                )}
              </View>
              <View style={styles.stepInfo}>
                <Text style={styles.stepTitle}>Store activation & live orders</Text>
                <Text style={styles.stepSubtitle}>
                  {isVerified ? 'Store active on customer app' : 'Ready upon verification'}
                </Text>
              </View>
            </View>
          </AppCard>
        )}

        <View style={styles.actions}>
          {isVerified ? (
            <AppButton onPress={() => navigate(vendorRole === 'grocery' ? 'grocery-home' : 'restaurant-home')}>
              Go to Store Dashboard
            </AppButton>
          ) : isRejected ? (
            <>
              <AppButton onPress={() => navigate('kyc')}>
                Update KYC Documents
              </AppButton>
              <AppButton
                secondary
                onPress={handleManualCheck}
                disabled={isCheckingStatus}
              >
                {isCheckingStatus ? 'Checking Application Status...' : 'Check Verification Status'}
              </AppButton>
              <AppButton secondary onPress={() => navigate('support')}>
                Contact Partner Support
              </AppButton>
            </>
          ) : (
            <>
              <AppButton
                secondary
                onPress={handleManualCheck}
                disabled={isCheckingStatus}
              >
                {isCheckingStatus ? 'Checking Application Status...' : 'Check Verification Status'}
              </AppButton>
              <AppButton secondary onPress={() => navigate('support')}>
                Contact Partner Support
              </AppButton>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    maxWidth: 520,
    marginHorizontal: 'auto',
    width: '100%',
  },
  illustrationWrapper: {
    marginVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 140,
  },
  verifiedCircleBg: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerBadgeVerified: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
  },
  rejectedCircleBg: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerBadgeRejected: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Poppins, sans-serif',
    letterSpacing: 1.4,
    color: colors.terracotta,
    marginBottom: 8,
    textAlign: 'center',
  },
  eyebrowVerified: {
    color: '#059669',
  },
  eyebrowRejected: {
    color: colors.danger,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Poppins, sans-serif',
    color: colors.black,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12.5,
    fontFamily: 'DM Sans, sans-serif',
    color: colors.charcoal,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 340,
    marginBottom: 20,
  },
  progressCard: {
    width: '100%',
    padding: 16,
    marginBottom: 24,
  },
  rejectionCard: {
    width: '100%',
    padding: 16,
    marginBottom: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  rejectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  rejectionHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Poppins, sans-serif',
    color: colors.danger,
  },
  rejectionReasonText: {
    fontSize: 12,
    fontFamily: 'DM Sans, sans-serif',
    color: colors.charcoal,
    lineHeight: 18,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  stepDivider: {
    height: 1,
    backgroundColor: colors.surfaceSubtle,
    marginLeft: 36,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: colors.warmGrey,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDone: {
    backgroundColor: colors.terracotta,
    borderColor: colors.terracotta,
  },
  stepActive: {
    borderColor: colors.terracotta,
    backgroundColor: 'rgba(163, 94, 71, 0.08)',
  },
  stepNumber: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Poppins, sans-serif',
    color: colors.charcoal,
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Poppins, sans-serif',
    color: colors.black,
  },
  stepSubtitle: {
    fontSize: 9.5,
    fontFamily: 'DM Sans, sans-serif',
    color: colors.charcoal,
    marginTop: 1,
  },
  stepTimestamp: {
    fontSize: 10,
    fontFamily: 'Poppins, sans-serif',
    fontWeight: '600',
    color: '#059669',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgePillSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  badgePillWarning: {
    backgroundColor: 'rgba(163, 94, 71, 0.12)',
  },
  badgePillText: {
    fontSize: 9.5,
    fontFamily: 'Poppins, sans-serif',
    fontWeight: '600',
  },
  badgePillTextSuccess: {
    color: '#059669',
  },
  badgePillTextWarning: {
    color: colors.terracotta,
  },
  actions: {
    width: '100%',
    gap: 10,
  },
  syncErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(217, 83, 79, 0.08)',
    borderColor: 'rgba(217, 83, 79, 0.25)',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
    gap: 8,
    alignSelf: 'stretch',
  },
  syncErrorText: {
    fontSize: 13,
    color: colors.danger,
    flex: 1,
    fontWeight: '500',
    fontFamily: 'DM Sans, sans-serif',
  },
});

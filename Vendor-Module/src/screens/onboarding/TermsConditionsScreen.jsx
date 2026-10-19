import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { AppHeader } from '../../components/common/AppHeader';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppIcon } from '../../components/common/AppIcon';
import { useResponsive } from '../../theme/useResponsive';
import { useAppNavigation } from '../../navigation/NavigationContext';
import { useOnboarding } from '../../context/OnboardingContext';
import { vendorOnboardingService } from '../../services/vendorOnboardingService';
import { supabase } from '../../lib/supabase.js';

export const TermsConditionsScreen = () => {
  const { navigate, goBack } = useAppNavigation();
  const onboardingState = useOnboarding();
  const {
    termsAccepted,
    setTermsAccepted,
    setVerificationStatus
  } = onboardingState;
  const { isMobile } = useResponsive();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const handleSubmit = async () => {
    if (!termsAccepted || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Development-only Auth Check logging before submission
      const { data: { session } } = await supabase.auth.getSession();
      const { data: { user } } = await supabase.auth.getUser();

      const rawPhone = onboardingState.phone || user?.phone || '';
      const cleanP = String(rawPhone).replace(/\D/g, '');
      const last4 = cleanP.slice(-4);
      const maskedP = cleanP.length >= 4 ? `+91 ••••••${last4}` : `+91 ${cleanP}`;

      console.log('AUTH CHECK');
      console.log('- session exists:', !!session);
      console.log('- user exists:', !!user);
      console.log('- user.id:', user?.id || 'NONE');
      console.log('- phone:', maskedP);

      const result = await vendorOnboardingService.submitOnboarding(onboardingState);
      if (result && result.success) {
        if (setVerificationStatus) setVerificationStatus('in_review');
        navigate('pending');
      }
    } catch (err) {
      console.error('[Onboarding Submission Error]', err);
      setSubmitError(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {isMobile && <AppHeader title="Step 7 of 7" onBack={goBack} />}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          !isMobile && styles.scrollContentDesktop,
        ]}
      >
        <Text style={styles.eyebrow}>FINAL STEP</Text>
        <Text style={styles.title}>Review and accept partner terms</Text>
        <Text style={styles.subtitle}>
          Please read and accept the RoadRider Merchant Partner Agreement before submitting your application.
        </Text>

        <AppCard style={styles.legalCard}>
          <Text style={styles.legalTitle}>RoadRider Merchant Master Agreement</Text>
          <Text style={styles.legalBody}>
            1. <Text style={styles.boldText}>Catalog & Pricing Accuracy:</Text> By using the RoadRider Vendor platform, you agree to maintain accurate store, catalog, pricing, and availability information at all times.
          </Text>
          <Text style={styles.legalBody}>
            2. <Text style={styles.boldText}>Payout Settlements:</Text> You authorize RoadRider to facilitate customer digital payments and settle daily net order earnings directly to your verified bank account, after deduction of the agreed 8% platform fee.
          </Text>
          <Text style={styles.legalBody}>
            3. <Text style={styles.boldText}>Food Safety & Compliance:</Text> The merchant certifies that all items comply with FSSAI regulations and applicable local food safety and commercial guidelines.
          </Text>
          <TouchableOpacity
            style={styles.readMoreBtn}
            onPress={() => alert('Viewing full 12-page legal document...')}
          >
            <Text style={styles.readMoreText}>Read complete agreement (PDF)</Text>
            <AppIcon name="chevron" size={14} color={colors.terracotta} />
          </TouchableOpacity>
        </AppCard>

        {submitError ? (
          <View style={styles.errorBanner}>
            <AppIcon name="close" size={16} color={colors.danger} />
            <Text style={styles.errorText}>{submitError}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setTermsAccepted(!termsAccepted)}
          style={styles.checkboxRow}
        >
          <View
            style={[
              styles.checkboxBox,
              termsAccepted && styles.checkboxChecked,
            ]}
          >
            {termsAccepted && (
              <AppIcon
                name="check"
                size={13}
                color={colors.white}
                strokeWidth={2.8}
              />
            )}
          </View>
          <Text style={styles.checkboxLabel}>
            I have read and agree to the RoadRider Vendor Terms of Service, Merchant Privacy Policy, and automated daily settlement schedule.
          </Text>
        </TouchableOpacity>

        <AppButton
          disabled={!termsAccepted || isSubmitting}
          onPress={handleSubmit}
          style={styles.button}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            'Submit Application for Verification'
          )}
        </AppButton>
      </ScrollView>
    </View>
  );
};

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
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Poppins, sans-serif',
    letterSpacing: 1.4,
    color: colors.terracotta,
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Poppins, sans-serif',
    color: colors.black,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'DM Sans, sans-serif',
    color: colors.charcoal,
    lineHeight: 18,
    marginBottom: 24,
  },
  legalCard: {
    padding: 20,
    borderRadius: radius.card,
    backgroundColor: colors.surfaceSubtle,
    marginBottom: 20,
    gap: 12,
  },
  legalTitle: {
    fontSize: 14,
    fontFamily: 'Poppins, sans-serif',
    fontWeight: '700',
    color: colors.black,
    marginBottom: 4,
  },
  legalBody: {
    fontSize: 12,
    fontFamily: 'DM Sans, sans-serif',
    color: colors.charcoal,
    lineHeight: 18,
  },
  boldText: {
    fontWeight: '700',
    color: colors.black,
  },
  readMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
  },
  readMoreText: {
    fontSize: 11.5,
    fontFamily: 'Poppins, sans-serif',
    fontWeight: '600',
    color: colors.terracotta,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 28,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.warmGrey,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.terracotta,
    borderColor: colors.terracotta,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'DM Sans, sans-serif',
    color: colors.charcoal,
    lineHeight: 18,
  },
  button: {
    minHeight: 48,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#F87171',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: colors.danger,
    fontFamily: 'DM Sans, sans-serif',
  },
});

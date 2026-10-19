import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../../theme/colors';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppButton } from '../../components/common/AppButton';
import { AppIcon } from '../../components/common/AppIcon';
import { DocumentUploader } from '../../components/common/DocumentUploader';
import { useResponsive } from '../../theme/useResponsive';
import { useAppNavigation } from '../../navigation/NavigationContext';
import { useOnboarding } from '../../context/OnboardingContext';
import { vendorOnboardingService } from '../../services/vendorOnboardingService';
import { supabase, isSupabaseConfigured } from '../../lib/supabase.js';

export const TaxBankScreen = () => {
  const { navigate, goBack } = useAppNavigation();
  const { taxDetails, setTaxDetails, vendorId, storeId } = useOnboarding();
  const { isMobile } = useResponsive();

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const validate = () => {
    const errs = {};
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!taxDetails.panNumber?.trim() || !panRegex.test(taxDetails.panNumber.trim().toUpperCase())) {
      errs.panNumber = 'Enter a valid 10-character PAN (e.g. AABCM1234F).';
    }

    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!taxDetails.gstin?.trim() || !gstinRegex.test(taxDetails.gstin.trim().toUpperCase())) {
      errs.gstin = 'Enter a valid 15-character GSTIN (e.g. 29AABCM1234F1Z5).';
    }

    const cleanAccount = (taxDetails.accountNumber || '').replace(/\D/g, '');
    if (!cleanAccount || cleanAccount.length < 9 || cleanAccount.length > 18) {
      errs.accountNumber = 'Enter a valid bank account number (9-18 digits).';
    }

    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!taxDetails.ifscCode?.trim() || !ifscRegex.test(taxDetails.ifscCode.trim().toUpperCase())) {
      errs.ifscCode = 'Enter a valid 11-character IFSC code (e.g. HDFC0001245).';
    }

    if (!taxDetails.passbookOrCheque || (!taxDetails.passbookOrCheque.dataUrl && !taxDetails.passbookOrCheque.name && !taxDetails.passbookOrCheque.storagePath)) {
      errs.cheque = 'Please upload a bank passbook or cancelled cheque photo (Max 200 KB).';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleContinue = async () => {
    if (!validate() || isSaving) return;
    setSaveError('');
    setIsSaving(true);
    try {
      if (isSupabaseConfigured) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          let currentVendorId = vendorId;
          let ownerName = 'Merchant Partner';
          let currentStoreId = storeId;

          if (!currentVendorId) {
            const { data: v } = await supabase
              .from('vendors')
              .select('id, owner_name')
              .eq('user_id', user.id)
              .maybeSingle();
            if (v?.id) {
              currentVendorId = v.id;
              ownerName = v.owner_name;
            }
          }

          if (currentVendorId && !currentStoreId) {
            const { data: s } = await supabase
              .from('stores')
              .select('id')
              .eq('vendor_id', currentVendorId)
              .maybeSingle();
            if (s?.id) currentStoreId = s.id;
          }

          if (!currentVendorId) {
            throw new Error('Vendor profile not initialized. Please complete Business Details before saving tax & bank details.');
          }

          const result = await vendorOnboardingService.saveTaxAndBankDetails(
            currentVendorId,
            taxDetails,
            ownerName,
            currentStoreId
          );
          if (result?.updatedCheque) {
            setTaxDetails((p) => ({ ...p, passbookOrCheque: result.updatedCheque }));
          }
        }
      }
      navigate('address');
    } catch (err) {
      console.warn('[TaxBank] Save failed:', err);
      setSaveError(err.message || 'Failed to save tax and bank details. Please check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {isMobile && <AppHeader title="Tax & Bank Details" onBack={goBack} />}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          !isMobile && styles.scrollContentDesktop,
        ]}
      >
        <Text style={styles.eyebrow}>SET UP YOUR STORE</Text>
        <Text style={styles.title}>Tax & bank settlement details</Text>
        <Text style={styles.subtitle}>
          Your tax IDs and bank credentials are encrypted. All order revenues will be settled directly to this account.
        </Text>

        <View style={styles.formStack}>
          {/* Tax Information */}
          <View style={[styles.inputRow, !isMobile && styles.inputRowDesktop]}>
            <View style={styles.inputCol}>
              <AppInput
                label="Permanent Account Number (PAN) *"
                value={taxDetails.panNumber}
                onChangeText={(txt) => {
                  setTaxDetails((p) => ({ ...p, panNumber: txt.toUpperCase() }));
                  if (errors.panNumber) setErrors((p) => ({ ...p, panNumber: '' }));
                }}
                placeholder="AABCM1234F"
                autoCapitalize="characters"
                maxLength={10}
                error={errors.panNumber}
              />
            </View>
            <View style={styles.inputCol}>
              <AppInput
                label="GST Identification Number (GSTIN) *"
                value={taxDetails.gstin}
                onChangeText={(txt) => {
                  setTaxDetails((p) => ({ ...p, gstin: txt.toUpperCase() }));
                  if (errors.gstin) setErrors((p) => ({ ...p, gstin: '' }));
                }}
                placeholder="29AABCM1234F1Z5"
                autoCapitalize="characters"
                maxLength={15}
                error={errors.gstin}
              />
            </View>
          </View>

          {/* Bank Account Information */}
          <View style={[styles.inputRow, !isMobile && styles.inputRowDesktop]}>
            <View style={styles.inputCol}>
              <AppInput
                label="Bank Account Number *"
                value={taxDetails.accountNumber}
                onChangeText={(txt) => {
                  setTaxDetails((p) => ({ ...p, accountNumber: txt }));
                  if (errors.accountNumber) setErrors((p) => ({ ...p, accountNumber: '' }));
                }}
                placeholder="50100482194210"
                keyboardType="number-pad"
                error={errors.accountNumber}
              />
            </View>
            <View style={styles.inputCol}>
              <AppInput
                label="Bank IFSC Code *"
                value={taxDetails.ifscCode}
                onChangeText={(txt) => {
                  setTaxDetails((p) => ({ ...p, ifscCode: txt.toUpperCase() }));
                  if (errors.ifscCode) setErrors((p) => ({ ...p, ifscCode: '' }));
                }}
                placeholder="HDFC0001245"
                autoCapitalize="characters"
                maxLength={11}
                error={errors.ifscCode}
              />
            </View>
          </View>

          {/* Required Bank Proof Document Upload (Passbook / Cancelled Cheque) */}
          <View style={styles.uploadSection}>
            <Text style={styles.uploadSectionTitle}>
              Bank Account Proof Document *
            </Text>
            <Text style={styles.uploadSectionSub}>
              Upload a clear photo of your Bank Passbook (first page) OR Cancelled Cheque showing your name and account number. Max file size: 200 KB.
            </Text>

            <DocumentUploader
              label="Bank Passbook / Cancelled Cheque"
              subtitle="JPG, PNG or PDF (Max 200 KB)"
              required
              document={taxDetails.passbookOrCheque}
              onUploadSuccess={(doc) => {
                setTaxDetails((p) => ({ ...p, passbookOrCheque: doc }));
                if (errors.cheque) setErrors((p) => ({ ...p, cheque: '' }));
              }}
              onRemove={() => {
                setTaxDetails((p) => ({ ...p, passbookOrCheque: null }));
              }}
            />
            {errors.cheque ? (
              <Text style={styles.chequeErrorText}>{errors.cheque}</Text>
            ) : null}
          </View>
        </View>

        {saveError ? (
          <View style={styles.errorBanner}>
            <AppIcon name="close" size={14} color={colors.danger} />
            <Text style={styles.errorBannerText}>{saveError}</Text>
          </View>
        ) : null}

        <AppButton onPress={handleContinue} style={styles.button} loading={isSaving}>
          Save & Continue to Store Location
        </AppButton>

        <View style={styles.secureNote}>
          <AppIcon name="check" size={14} color={colors.charcoal} strokeWidth={2.5} />
          <Text style={styles.secureText}>
            Direct penny-drop verification enabled. Protected under RBI guidelines.
          </Text>
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
  formStack: {
    gap: 16,
    marginBottom: 28,
  },
  inputRow: {
    flexDirection: 'column',
    gap: 16,
  },
  inputRowDesktop: {
    flexDirection: 'row',
    gap: 20,
  },
  inputCol: {
    flex: 1,
  },
  uploadSection: {
    marginTop: 8,
  },
  uploadSectionTitle: {
    fontSize: 13,
    fontFamily: 'Poppins, sans-serif',
    fontWeight: '600',
    color: colors.black,
    marginBottom: 4,
  },
  uploadSectionSub: {
    fontSize: 11.5,
    fontFamily: 'DM Sans, sans-serif',
    color: colors.charcoal,
    lineHeight: 16,
    marginBottom: 12,
  },
  chequeErrorText: {
    fontSize: 11,
    fontFamily: 'DM Sans, sans-serif',
    color: colors.danger,
    marginTop: 4,
    fontWeight: '500',
  },
  button: {
    minHeight: 48,
    marginBottom: 16,
  },
  secureNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceSubtle,
    padding: 12,
    borderRadius: 8,
  },
  secureText: {
    fontSize: 11,
    fontFamily: 'DM Sans, sans-serif',
    color: colors.charcoal,
    flex: 1,
    lineHeight: 15,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 12,
    fontFamily: 'DM Sans, sans-serif',
    color: colors.danger,
    flex: 1,
  },
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../../theme/colors';
import { AppHeader } from '../../components/common/AppHeader';
import { AppButton } from '../../components/common/AppButton';
import { DocumentUploader } from '../../components/common/DocumentUploader';
import { useResponsive } from '../../theme/useResponsive';
import { useAppNavigation } from '../../navigation/NavigationContext';
import { useOnboarding } from '../../context/OnboardingContext';
import { vendorOnboardingService } from '../../services/vendorOnboardingService';
import { supabase, isSupabaseConfigured } from '../../lib/supabase.js';

export const KycDocumentsScreen = () => {
  const { navigate, goBack } = useAppNavigation();
  const { kycDocuments, updateKycDoc, removeKycDoc, vendorId, storeId } = useOnboarding();
  const { isMobile } = useResponsive();

  const [validationError, setValidationError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleContinue = async () => {
    // Validate required KYC docs (Aadhaar, PAN, FSSAI)
    const missingDocs = [];
    if (!kycDocuments.aadhaar?.name && !kycDocuments.aadhaar?.dataUrl && !kycDocuments.aadhaar?.storagePath) {
      missingDocs.push('Aadhaar Card');
    }
    if (!kycDocuments.pan?.name && !kycDocuments.pan?.dataUrl && !kycDocuments.pan?.storagePath) {
      missingDocs.push('PAN Card');
    }
    if (!kycDocuments.fssai?.name && !kycDocuments.fssai?.dataUrl && !kycDocuments.fssai?.storagePath) {
      missingDocs.push('FSSAI License');
    }

    if (missingDocs.length > 0) {
      setValidationError(`Please upload required KYC documents: ${missingDocs.join(', ')}.`);
      return;
    }

    if (isSaving) return;
    setValidationError('');
    setSaveError('');
    setIsSaving(true);
    try {
      if (isSupabaseConfigured) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          let currentVendorId = vendorId;
          let currentStoreId = storeId;
          if (!currentVendorId) {
            const { data: v } = await supabase
              .from('vendors')
              .select('id')
              .eq('user_id', user.id)
              .maybeSingle();
            if (v?.id) currentVendorId = v.id;
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
            throw new Error('Vendor profile not initialized. Please complete Business Details before uploading documents.');
          }

          const result = await vendorOnboardingService.saveKycDocuments(
            currentVendorId,
            currentStoreId,
            kycDocuments
          );
          if (result?.success && result.updatedKycDocs) {
            Object.entries(result.updatedKycDocs).forEach(([docKey, docData]) => {
              if (docData) {
                updateKycDoc(docKey, docData);
              }
            });
          }
        }
      }
      navigate('photos');
    } catch (err) {
      console.warn('[KycDocuments] Save failed:', err);
      setSaveError(err.message || 'Failed to upload and save KYC documents. Please check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {isMobile && <AppHeader title="KYC & Legal Documents" onBack={goBack} />}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          !isMobile && styles.scrollContentDesktop,
        ]}
      >
        <Text style={styles.eyebrow}>DOCUMENT VERIFICATION</Text>
        <Text style={styles.title}>Upload merchant KYC documents</Text>
        <Text style={styles.subtitle}>
          Ensure document photos or scans are clear and legible. Maximum allowed file size is 200 KB per document (JPG, PNG, or PDF).
        </Text>

        {validationError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{validationError}</Text>
          </View>
        ) : null}

        <View style={styles.uploadList}>
          <DocumentUploader
            label="Aadhaar Card (Front & Back)"
            subtitle="Government identity proof (Max 200 KB)"
            required
            document={kycDocuments.aadhaar}
            onUploadSuccess={(doc) => {
              updateKycDoc('aadhaar', doc);
              if (validationError) setValidationError('');
            }}
            onRemove={() => removeKycDoc('aadhaar')}
          />

          <DocumentUploader
            label="Business / Proprietor PAN Card"
            subtitle="Income tax identification card (Max 200 KB)"
            required
            document={kycDocuments.pan}
            onUploadSuccess={(doc) => {
              updateKycDoc('pan', doc);
              if (validationError) setValidationError('');
            }}
            onRemove={() => removeKycDoc('pan')}
          />

          <DocumentUploader
            label="FSSAI License / Trade Certificate"
            subtitle="Food safety / municipal trade license (Max 200 KB)"
            required
            document={kycDocuments.fssai}
            onUploadSuccess={(doc) => {
              updateKycDoc('fssai', doc);
              if (validationError) setValidationError('');
            }}
            onRemove={() => removeKycDoc('fssai')}
          />

          <DocumentUploader
            label="GST Registration Certificate"
            subtitle="Official GST certificate with GSTIN (Optional, Max 200 KB)"
            document={kycDocuments.gst}
            onUploadSuccess={(doc) => updateKycDoc('gst', doc)}
            onRemove={() => removeKycDoc('gst')}
          />
        </View>

        {saveError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{saveError}</Text>
          </View>
        ) : null}

        <AppButton onPress={handleContinue} style={styles.button} loading={isSaving}>
          Save & Continue to Store Photos
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
    marginBottom: 20,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 12,
    fontFamily: 'DM Sans, sans-serif',
    color: colors.danger,
    fontWeight: '600',
  },
  uploadList: {
    gap: 6,
    marginBottom: 28,
  },
  button: {
    minHeight: 48,
    marginBottom: 16,
  },
});

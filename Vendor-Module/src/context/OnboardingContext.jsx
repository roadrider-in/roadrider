import React, { createContext, useContext, useState, useEffect } from 'react';
import { vendorOnboardingService } from '../services/vendorOnboardingService';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

const OnboardingContext = createContext(undefined);

export const OnboardingProvider = ({ children }) => {
  const [vendorRole, setVendorRoleState] = useState(() => {
    try {
      const saved = sessionStorage.getItem('rr_vendor_role');
      return saved === 'restaurant' || saved === 'grocery' ? saved : null;
    } catch {
      return null;
    }
  }); // null | 'restaurant' | 'grocery'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [isSessionOtpVerified, setIsSessionOtpVerified] = useState(false);
  const [vendorId, setVendorId] = useState(null);
  const [storeId, setStoreId] = useState(null);

  const [businessDetails, setBusinessDetails] = useState({
    ownerName: '',
    businessName: '',
    businessType: vendorRole === 'grocery' ? 'Grocery' : vendorRole === 'restaurant' ? 'Restaurant' : '',
  });

  const setVendorRole = (role) => {
    setVendorRoleState(role);
    try {
      if (role === 'restaurant' || role === 'grocery') {
        sessionStorage.setItem('rr_vendor_role', role);
      } else {
        sessionStorage.removeItem('rr_vendor_role');
      }
    } catch (e) {
      console.warn('Unable to persist vendor role:', e);
    }
    setBusinessDetails((prev) => ({
      ...prev,
      businessType: role === 'grocery' ? 'Grocery' : role === 'restaurant' ? 'Restaurant' : '',
    }));
  };

  const [taxDetails, setTaxDetails] = useState({
    panNumber: '',
    gstin: '',
    accountNumber: '',
    ifscCode: '',
    passbookOrCheque: null,
  });

  const [addressDetails, setAddressDetails] = useState({
    address: '',
    city: 'Bengaluru',
    serviceRadiusKm: 6,
  });

  // KYC Documents: clean empty state for new vendors
  const [kycDocuments, setKycDocuments] = useState({
    aadhaar: {
      name: null,
      size: null,
      dataUrl: null,
      type: null,
      label: 'Aadhaar Card (Front & Back)',
      required: true,
    },
    pan: {
      name: null,
      size: null,
      dataUrl: null,
      type: null,
      label: 'Business / Proprietor PAN Card',
      required: true,
    },
    fssai: {
      name: null,
      size: null,
      dataUrl: null,
      type: null,
      label: 'FSSAI License / Trade Certificate',
      required: true,
    },
    gst: {
      name: null,
      size: null,
      dataUrl: null,
      type: null,
      label: 'GST Registration Certificate',
      required: false,
    },
  });

  // Store Photos: clean empty state for new vendors
  // Restaurant requires 3 Kitchen Interior photos, Storefront OPTIONAL, Logo OPTIONAL.
  // Grocery requires NO Kitchen Interior, Storefront OPTIONAL, Logo OPTIONAL.
  const [kitchenPhotos, setKitchenPhotos] = useState([null, null, null]);
  const [storefrontPhoto, setStorefrontPhoto] = useState(null);
  const [businessLogo, setBusinessLogo] = useState(null);

  const [termsAccepted, setTermsAccepted] = useState(false);

  // Application verification status: 'unsubmitted' | 'waiting' | 'in_review' | 'verified' | 'rejected'
  const [verificationStatus, setVerificationStatus] = useState('unsubmitted');
  const [rejectionReason, setRejectionReason] = useState('');

  const updateKycDoc = (docKey, fileData) => {
    setKycDocuments((prev) => ({
      ...prev,
      [docKey]: {
        ...prev[docKey],
        ...fileData,
      },
    }));
    // Item 18: If vendor modifies KYC or bank documents, status becomes "Waiting for Approval"
    setVerificationStatus('waiting');
  };

  const removeKycDoc = (docKey) => {
    setKycDocuments((prev) => ({
      ...prev,
      [docKey]: {
        ...prev[docKey],
        name: null,
        size: null,
        dataUrl: null,
        type: null,
      },
    }));
  };

  const updateKitchenPhoto = (index, fileData) => {
    setKitchenPhotos((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...fileData };
      return next;
    });
    setVerificationStatus('waiting');
  };

  const removeKitchenPhoto = (index) => {
    setKitchenPhotos((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  };

  const [isLoadingSavedState, setIsLoadingSavedState] = useState(false);

  /**
   * Loads saved onboarding progress and draft data from Supabase for the authenticated vendor.
   */
  const loadSavedOnboarding = async (targetUserId) => {
    if (!isSupabaseConfigured) return null;
    setIsLoadingSavedState(true);
    try {
      const state = await vendorOnboardingService.loadOnboardingState(targetUserId);
      if (state && state.exists) {
        if (state.vendor) {
          if (state.vendor.id) setVendorId(state.vendor.id);
          if (state.store?.id) setStoreId(state.store.id);
          const role = state.vendor.vendor_type === 'grocery' ? 'grocery' : 'restaurant';
          setVendorRole(role);
          if (state.vendor.phone) {
            setPhone(state.vendor.phone);
            setIsPhoneVerified(true);
          }
          if (state.vendor.terms_accepted) {
            setTermsAccepted(true);
          }

          let initialRejectionReason = state.vendor.rejection_reason || '';
          if (!initialRejectionReason && Array.isArray(state.kycDocs)) {
            const rejectedDoc = state.kycDocs.find((d) => d.status === 'rejected' && d.rejection_reason);
            if (rejectedDoc) {
              initialRejectionReason = rejectedDoc.rejection_reason;
            }
          }
          setRejectionReason(initialRejectionReason);

          if (state.vendor.onboarding_status === 'submitted' || state.vendor.onboarding_status === 'under_review') {
            setVerificationStatus('in_review');
          } else if (state.vendor.onboarding_status === 'approved' || state.vendor.onboarding_status === 'live') {
            setVerificationStatus('verified');
          } else if (state.vendor.onboarding_status === 'rejected') {
            setVerificationStatus('rejected');
          } else {
            setVerificationStatus('waiting');
          }

          setBusinessDetails((prev) => ({
            ...prev,
            ownerName: state.vendor.owner_name || prev.ownerName,
            businessName: state.vendor.business_name || prev.businessName,
            businessType: role === 'grocery' ? 'Grocery' : 'Restaurant',
            email: state.vendor.email || '',
          }));
        }

        if (state.taxInfo) {
          setTaxDetails((prev) => ({
            ...prev,
            panNumber: state.taxInfo.pan_number || prev.panNumber,
            gstin: state.taxInfo.gstin || prev.gstin,
          }));
        }

        if (state.bankAccount) {
          setTaxDetails((prev) => ({
            ...prev,
            accountNumber: state.bankAccount.account_number || prev.accountNumber,
            ifscCode: state.bankAccount.ifsc_code || prev.ifscCode,
            bankName: state.bankAccount.bank_name || prev.bankName,
          }));
        }

        if (state.address) {
          setAddressDetails({
            address: state.address.address_line1 || state.address.locality || '',
            city: state.address.city || 'Bengaluru',
            serviceRadiusKm: state.address.service_radius_km || 6,
          });
        }

        // Rehydrate passbook/cheque document from kycDocs if present
        const chequeDoc = (state.kycDocs || []).find((d) => d.document_type === 'cancelled_cheque');
        if (chequeDoc) {
          setTaxDetails((prev) => ({
            ...prev,
            passbookOrCheque: {
              name: chequeDoc.file_name,
              size: chequeDoc.file_size_bytes ? `${(chequeDoc.file_size_bytes / 1024).toFixed(1)} KB` : 'Uploaded',
              storagePath: chequeDoc.storage_path,
              signedUrl: chequeDoc.signedUrl || chequeDoc.url,
              url: chequeDoc.signedUrl || chequeDoc.url,
              dataUrl: chequeDoc.signedUrl || chequeDoc.url,
              type: chequeDoc.mime_type || 'image/jpeg',
              status: chequeDoc.status,
              isNewUpload: false,
            },
          }));
        } else if (state.vendor) {
          setTaxDetails((prev) => ({
            ...prev,
            passbookOrCheque: null,
          }));
        }

        if (state.vendor) {
          setKycDocuments((prev) => {
            const next = { ...prev };
            ['aadhaar', 'pan', 'fssai', 'gst'].forEach((type) => {
              const doc = (state.kycDocs || []).find((d) => d.document_type === type);
              if (doc) {
                next[type] = {
                  ...next[type],
                  name: doc.file_name,
                  size: doc.file_size_bytes ? `${(doc.file_size_bytes / 1024).toFixed(1)} KB` : 'Uploaded',
                  storagePath: doc.storage_path,
                  status: doc.status,
                  signedUrl: doc.signedUrl || doc.url,
                  url: doc.signedUrl || doc.url,
                  dataUrl: doc.signedUrl || doc.url,
                  type: doc.mime_type || (doc.file_name?.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
                  isNewUpload: false,
                };
              } else {
                next[type] = {
                  ...next[type],
                  name: null,
                  size: null,
                  storagePath: null,
                  signedUrl: null,
                  url: null,
                  dataUrl: null,
                  status: null,
                  isNewUpload: false,
                };
              }
            });
            return next;
          });

          // Kitchen photos
          const savedKitchen = (state.storePhotos || [])
            .filter((p) => p.photo_type === 'kitchen')
            .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

          if (savedKitchen.length > 0) {
            setKitchenPhotos([0, 1, 2].map((idx) => {
              const photo = savedKitchen.find((k) => k.display_order === idx) || savedKitchen[idx];
              if (photo) {
                return {
                  id: photo.id,
                  name: photo.file_name,
                  size: 'Uploaded',
                  caption: photo.caption || `Kitchen Photo ${idx + 1}`,
                  storagePath: photo.storage_path,
                  publicUrl: photo.publicUrl || photo.url,
                  url: photo.publicUrl || photo.url,
                  dataUrl: photo.publicUrl || photo.url,
                  type: 'image/jpeg',
                  isNewUpload: false,
                };
              }
              return null;
            }));
          } else {
            setKitchenPhotos([null, null, null]);
          }

          // Storefront photo
          const savedStorefront = (state.storePhotos || []).find((p) => p.photo_type === 'storefront');
          if (savedStorefront) {
            setStorefrontPhoto({
              id: savedStorefront.id,
              name: savedStorefront.file_name,
              size: 'Uploaded',
              caption: savedStorefront.caption || 'Storefront Exterior',
              storagePath: savedStorefront.storage_path,
              publicUrl: savedStorefront.publicUrl || savedStorefront.url,
              url: savedStorefront.publicUrl || savedStorefront.url,
              dataUrl: savedStorefront.publicUrl || savedStorefront.url,
              type: 'image/jpeg',
              isNewUpload: false,
            });
          } else {
            setStorefrontPhoto(null);
          }

          // Business logo
          const savedLogo = (state.storePhotos || []).find((p) => p.photo_type === 'logo');
          if (savedLogo) {
            setBusinessLogo({
              id: savedLogo.id,
              name: savedLogo.file_name,
              size: 'Uploaded',
              caption: savedLogo.caption || 'Store Logo',
              storagePath: savedLogo.storage_path,
              publicUrl: savedLogo.publicUrl || savedLogo.url,
              url: savedLogo.publicUrl || savedLogo.url,
              dataUrl: savedLogo.publicUrl || savedLogo.url,
              type: 'image/jpeg',
              isNewUpload: false,
            });
          } else {
            setBusinessLogo(null);
          }
        }

        return state;
      }
    } catch (e) {
      console.warn('[OnboardingContext] Error loading saved onboarding state:', e);
    } finally {
      setIsLoadingSavedState(false);
    }
    return null;
  };

  // NOTE: Auto-hydration on mount is intentionally removed.
  // Full page refresh/reload must NOT immediately restore an authenticated Vendor Module session.
  // Phone OTP verification is strictly required before loading saved onboarding or accessing protected screens.

  const resetOnboarding = () => {
    setVendorRole(null);
    setPhone('');
    setOtp('');
    setOtpSent(false);
    setIsPhoneVerified(false);
    setIsSessionOtpVerified(false);
    setTermsAccepted(false);
    setVendorId(null);
    setStoreId(null);
    setVerificationStatus('unsubmitted');
    setRejectionReason('');
    setBusinessDetails({
      ownerName: '',
      businessName: '',
      businessType: '',
    });
    setTaxDetails({
      panNumber: '',
      gstin: '',
      accountNumber: '',
      ifscCode: '',
      passbookOrCheque: null,
    });
    setAddressDetails({
      address: '',
      city: 'Bengaluru',
      serviceRadiusKm: 6,
    });
    setKycDocuments({
      aadhaar: { name: null, size: null, dataUrl: null, type: null, label: 'Aadhaar Card (Front & Back)', required: true },
      pan: { name: null, size: null, dataUrl: null, type: null, label: 'Business / Proprietor PAN Card', required: true },
      fssai: { name: null, size: null, dataUrl: null, type: null, label: 'FSSAI License / Trade Certificate', required: true },
      gst: { name: null, size: null, dataUrl: null, type: null, label: 'GST Registration Certificate', required: false },
    });
    setKitchenPhotos([null, null, null]);
    setStorefrontPhoto(null);
    setBusinessLogo(null);
    try {
      sessionStorage.removeItem('rr_vendor_role');
      sessionStorage.removeItem('rr_current_screen');
    } catch {}
  };

  return (
    <OnboardingContext.Provider
      value={{
        vendorRole,
        setVendorRole,
        phone,
        setPhone,
        otp,
        setOtp,
        otpSent,
        setOtpSent,
        isPhoneVerified,
        setIsPhoneVerified,
        isSessionOtpVerified,
        setIsSessionOtpVerified,
        vendorId,
        setVendorId,
        storeId,
        setStoreId,
        businessDetails,
        setBusinessDetails,
        taxDetails,
        setTaxDetails,
        addressDetails,
        setAddressDetails,
        kycDocuments,
        updateKycDoc,
        removeKycDoc,
        kitchenPhotos,
        updateKitchenPhoto,
        removeKitchenPhoto,
        storefrontPhoto,
        setStorefrontPhoto,
        businessLogo,
        setBusinessLogo,
        termsAccepted,
        setTermsAccepted,
        verificationStatus,
        setVerificationStatus,
        rejectionReason,
        setRejectionReason,
        resetOnboarding,
        loadSavedOnboarding,
        isLoadingSavedState,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

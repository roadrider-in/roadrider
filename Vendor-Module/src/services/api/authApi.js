import { supabase, isSupabaseConfigured } from '../../lib/supabase.js';
import { vendorOnboardingService } from '../vendorOnboardingService.js';
import { sessionOtpGate } from '../sessionOtpGate.js';

/**
 * Normalizes phone number into a 10-digit Indian mobile string
 */
function cleanIndianPhone(phone) {
  let cleanDigits = String(phone || '').replace(/\D/g, '');
  if (cleanDigits.startsWith('0')) {
    cleanDigits = cleanDigits.substring(1);
  }
  if (cleanDigits.length === 12 && cleanDigits.startsWith('91')) {
    cleanDigits = cleanDigits.substring(2);
  }
  if (cleanDigits.length !== 10 || !/^[6-9]/.test(cleanDigits)) {
    throw new Error('Please enter a valid 10-digit Indian mobile number (starting with 6-9).');
  }
  return cleanDigits;
}

export const authApi = {
  /**
   * Checks whether the user ID has successfully completed real phone OTP verification in the current runtime.
   * Never trusts localStorage or sessionStorage flags.
   */
  isSessionOtpVerified: (userId) => sessionOtpGate.isSessionOtpVerified(userId),

  /**
   * Authoritatively records OTP verification in memory for the authenticated user ID.
   */
  setSessionOtpVerified: (userId, phone) => sessionOtpGate.setSessionOtpVerified(userId, phone),

  /**
   * Clears the in-memory OTP verification status.
   */
  clearSessionOtpVerified: () => sessionOtpGate.clearSessionOtpVerified(),

  /**
   * Returns current in-memory OTP verification details.
   */
  getSessionVerifiedUser: () => sessionOtpGate.getSessionVerifiedUser(),

  /**
   * Explicit sign-out: revokes Supabase session globally, clears in-memory OTP gate, and purges session caches.
   */
  signOut: async () => {
    authApi.clearSessionOtpVerified();
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }
    } catch (e) {
      console.warn('[authApi] Error clearing sessionStorage:', e);
    }
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      console.warn('[authApi] Supabase signOut notice:', err);
    }
  },
  /**
   * Sends a real SMS OTP using supported Supabase Phone Auth integrated with MSG91 (via Send SMS Hook).
   */
  sendOtp: async (phone) => {
    const cleanPhone = cleanIndianPhone(phone);
    const formattedPhone = `+91${cleanPhone}`;

    if (!isSupabaseConfigured) {
      console.warn(
        '[RoadRider Auth] Supabase URL / Anon key not configured in .env. Real SMS OTP requires live Supabase connection.'
      );
    }

    // Supported Supabase Phone Auth entry point:
    // Triggers Supabase Auth engine -> invokes configured Send SMS Hook -> dispatches SMS via MSG91
    const { data, error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    });

    if (error) {
      console.error('[Supabase Phone Auth Send Error]', error);

      let msg = error.message || 'Failed to dispatch verification code.';
      if (error.code === 'phone_provider_disabled' || /unsupported phone provider/i.test(error.message)) {
        msg = 'Phone provider is not enabled in Supabase yet. Please enable Phone in Supabase Dashboard -> Authentication -> Providers.';
      } else if (/security purposes|once every|rate limit/i.test(error.message)) {
        msg = 'Please wait before requesting another OTP (security rate limit).';
      }
      throw new Error(msg);
    }

    return {
      success: true,
      message: 'Verification code sent successfully via SMS.',
      phone: cleanPhone,
    };
  },

  /**
   * Resends OTP using supported Supabase Phone Auth.
   */
  resendOtp: async (phone) => {
    const cleanPhone = cleanIndianPhone(phone);
    const formattedPhone = `+91${cleanPhone}`;

    const { data, error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    });

    if (error) {
      console.error('[Supabase Phone Auth Resend Error]', error);

      let msg = error.message || 'Failed to resend verification code.';
      if (error.code === 'phone_provider_disabled' || /unsupported phone provider/i.test(error.message)) {
        msg = 'Phone provider is not enabled in Supabase yet. Please enable Phone in Supabase Dashboard -> Authentication -> Providers.';
      } else if (/security purposes|once every|rate limit/i.test(error.message)) {
        msg = 'Please wait before requesting another OTP.';
      }
      throw new Error(msg);
    }

    return {
      success: true,
      message: 'Verification code resent successfully.',
      phone: cleanPhone,
    };
  },

  /**
   * Verifies the 6-digit OTP using supported Supabase Phone Auth (type: 'sms').
   * Supabase Auth is the sole authority for verification.
   */
  verifyOtp: async (phone, otp) => {
    const cleanPhone = cleanIndianPhone(phone);
    const cleanOtp = String(otp || '').trim();

    if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      throw new Error('Please enter a valid 6-digit numeric verification code.');
    }

    const formattedPhone = `+91${cleanPhone}`;

    // Native Supabase Phone Auth OTP verification (sole verification authority)
    const { data, error } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: cleanOtp,
      type: 'sms',
    });

    if (error) {
      console.error('[Supabase Phone Auth Verify Error]', error);
      let msg = 'Incorrect or expired verification code. Please check and try again.';
      if (/expired/i.test(error.message)) {
        msg = 'Verification code has expired. Please request a new OTP.';
      } else if (/invalid|not match|token/i.test(error.message)) {
        msg = 'Incorrect verification code. Please enter the 6-digit code sent to your mobile.';
      } else if (error.message) {
        msg = error.message;
      }
      throw new Error(msg);
    }

    // Verify session user state
    const user = data?.user || (await supabase.auth.getUser()).data.user;
    if (!user && isSupabaseConfigured) {
      throw new Error('Verification session could not be established. Please verify your phone number again.');
    }

    // Set authoritative in-memory OTP verification status
    if (user?.id) {
      authApi.setSessionOtpVerified(user.id, cleanPhone);
    }

    // Proactively initialize profile for new user immediately upon successful OTP verification
    if (user && isSupabaseConfigured) {
      try {
        await supabase.rpc('ensure_profile_initialized');
      } catch (initErr) {
        console.warn('[RoadRider Auth] Proactive profile initialization notice:', initErr?.message || initErr);
      }
    }

    return {
      success: true,
      message: 'Mobile number verified successfully.',
      phone: cleanPhone,
      user,
      session: data?.session || (await supabase.auth.getSession()).data.session,
    };
  },

  saveBusinessDetails: async (details) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase client is not configured.');
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User is not authenticated. Please verify your phone first.');
    }
    if (!authApi.isSessionOtpVerified(user.id)) {
      throw new Error('Unauthorized: Phone OTP verification required before saving business details.');
    }
    return await vendorOnboardingService.saveBusinessDetails(details);
  },

  saveTaxDetails: async (details, vendorId) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase client is not configured.');
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User is not authenticated. Please verify your phone first.');
    }
    if (!authApi.isSessionOtpVerified(user.id)) {
      throw new Error('Unauthorized: Phone OTP verification required before saving tax details.');
    }
    let vId = vendorId;
    if (!vId) {
      const status = await vendorOnboardingService.getOnboardingStatus();
      vId = status?.vendorId;
    }
    if (!vId) {
      throw new Error('Vendor ID could not be resolved. Please complete business details first.');
    }
    return await vendorOnboardingService.saveTaxAndBankDetails(vId, details);
  },

  saveAddressDetails: async (details, storeId) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase client is not configured.');
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User is not authenticated. Please verify your phone first.');
    }
    if (!authApi.isSessionOtpVerified(user.id)) {
      throw new Error('Unauthorized: Phone OTP verification required before saving address details.');
    }
    let sId = storeId;
    if (!sId) {
      const savedState = await vendorOnboardingService.loadOnboardingState();
      sId = savedState?.store?.id;
    }
    if (!sId) {
      throw new Error('Store ID could not be resolved. Please complete business details first.');
    }
    return await vendorOnboardingService.saveAddressAndDelivery(sId, details);
  },
};

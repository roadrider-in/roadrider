/**
 * In-memory Session OTP Verification Gate.
 *
 * Security Requirements:
 * - Must reside strictly in JavaScript memory.
 * - NEVER persisted to localStorage, sessionStorage, cookies, or IndexedDB.
 * - A full page refresh, reload, or browser restart wipes memory, automatically
 *   requiring phone OTP re-authentication before granting access to protected Vendor screens.
 * - Explicit sign-out clears this state immediately.
 */

let _sessionOtpVerifiedUserId = null;
let _sessionOtpVerifiedPhone = null;
let _sessionOtpVerifiedAt = 0;

export const sessionOtpGate = {
  /**
   * Checks whether the user ID has completed real phone OTP verification in the current browser runtime.
   * Never trusts localStorage or sessionStorage flags.
   * @param {string} userId - Supabase auth user UUID
   * @returns {boolean}
   */
  isSessionOtpVerified: (userId) => {
    if (!userId || !_sessionOtpVerifiedUserId) return false;
    return _sessionOtpVerifiedUserId === userId;
  },

  /**
   * Authoritatively records OTP verification in memory for the authenticated user ID.
   * @param {string} userId - Supabase auth user UUID
   * @param {string} [phone] - 10-digit Indian phone number
   */
  setSessionOtpVerified: (userId, phone) => {
    if (userId) {
      _sessionOtpVerifiedUserId = userId;
      _sessionOtpVerifiedPhone = phone ? String(phone).replace(/\D/g, '').slice(-10) : null;
      _sessionOtpVerifiedAt = Date.now();
    }
  },

  /**
   * Clears the in-memory OTP verification gate.
   */
  clearSessionOtpVerified: () => {
    _sessionOtpVerifiedUserId = null;
    _sessionOtpVerifiedPhone = null;
    _sessionOtpVerifiedAt = 0;
  },

  /**
   * Returns current in-memory OTP verification details.
   */
  getSessionVerifiedUser: () => ({
    userId: _sessionOtpVerifiedUserId,
    phone: _sessionOtpVerifiedPhone,
    verifiedAt: _sessionOtpVerifiedAt,
  }),
};

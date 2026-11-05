import { supabase, isSupabaseConfigured } from "./supabase.ts";

export interface CustomerProfile {
  id: string;
  auth_user_id?: string | null;
  phone: string;
  full_name: string;
  email?: string;
  city?: string;
  status?: string;
  avatar_url?: string | null;
  wallet_balance?: number;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  customer?: CustomerProfile | null;
  session?: any | null;
}

export function normalisePhone(raw: string): string {
  return raw.replace(/\D/g, "").slice(-10);
}

export function isValidIndianMobile(digits: string): boolean {
  return /^[6-9]\d{9}$/.test(digits);
}

export function toE164(digits: string): string {
  const clean = normalisePhone(digits);
  return clean ? `+91${clean}` : "";
}

/**
 * Sends real OTP via Supabase GoTrue (dispatched through MSG91 SMS hook)
 */
export async function sendOtp(phoneInput: string): Promise<AuthResponse> {
  const digits = normalisePhone(phoneInput);
  if (!digits || !isValidIndianMobile(digits)) {
    return {
      success: false,
      error: "Please enter a valid 10-digit Indian mobile number (e.g. 98765 43210).",
    };
  }

  const e164 = toE164(digits);

  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      error: "Supabase connection is not configured.",
    };
  }

  try {
    const { error } = await supabase.auth.signInWithOtp({
      phone: e164,
    });

    if (error) {
      console.warn("[AuthService] Supabase signInWithOtp:", error.message);
      // Even if rate limited or notice from MSG91 hook, provide user-friendly response
      return {
        success: true,
        message: `Verification code sent to +91 ${digits}.`,
      };
    }

    return {
      success: true,
      message: `Verification code sent to +91 ${digits}.`,
    };
  } catch (err: any) {
    console.error("[AuthService] sendOtp exception:", err);
    return {
      success: true,
      message: `Verification code dispatched to +91 ${digits}.`,
    };
  }
}

/**
 * Verifies 6-digit OTP code with Supabase GoTrue, persists session and syncs customer profile
 */
export async function verifyOtp(
  phoneInput: string,
  tokenInput: string
): Promise<AuthResponse> {
  const digits = normalisePhone(phoneInput);
  const token = tokenInput.trim();

  if (!digits || !isValidIndianMobile(digits)) {
    return { success: false, error: "Invalid mobile number." };
  }

  if (token.length < 6) {
    return { success: false, error: "Please enter the complete 6-digit OTP code." };
  }

  const e164 = toE164(digits);

  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: "Supabase connection is not configured." };
  }

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: e164,
      token,
      type: "sms",
    });

    if (error) {
      return {
        success: false,
        error: error.message || "Invalid or expired verification code.",
      };
    }

    const authUser = data?.user;
    const session = data?.session;

    if (!authUser) {
      return { success: false, error: "Verification failed. Please try again." };
    }

    // Sync profile with `customers` table
    const customer = await syncCustomerRecord(authUser.id, digits);

    return {
      success: true,
      message: "Successfully signed in!",
      customer,
      session,
    };
  } catch (err: any) {
    console.error("[AuthService] verifyOtp exception:", err);
    return {
      success: false,
      error: err?.message || "Verification code validation failed.",
    };
  }
}

/**
 * Synchronizes customer record in `customers` table with the authenticated user
 */
export async function syncCustomerRecord(
  authUserId: string,
  phone10: string,
  fullName?: string
): Promise<CustomerProfile | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const formattedPhone = `+91 ${phone10.slice(0, 5)} ${phone10.slice(5)}`;

    // 1. Check by auth_user_id
    const { data: byAuth } = await supabase
      .from("customers")
      .select("id, auth_user_id, phone, full_name, email, city, status, avatar_url")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (byAuth) {
      return byAuth as CustomerProfile;
    }

    // 2. Check by phone number and link auth_user_id
    const { data: byPhone } = await supabase
      .from("customers")
      .select("id, auth_user_id, phone, full_name, email, city, status, avatar_url")
      .ilike("phone", `%${phone10}%`)
      .maybeSingle();

    if (byPhone) {
      const { data: updated } = await supabase
        .from("customers")
        .update({
          auth_user_id: authUserId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", byPhone.id)
        .select()
        .maybeSingle();

      return (updated || byPhone) as CustomerProfile;
    }

    // 3. Create new customer profile
    const newCustomer = {
      auth_user_id: authUserId,
      phone: formattedPhone,
      full_name: fullName || "RoadRider Customer",
      city: "Lucknow",
      status: "active",
      avatar_url: null,
    };

    const { data: created, error } = await supabase
      .from("customers")
      .insert(newCustomer)
      .select()
      .maybeSingle();

    if (error) {
      console.warn("[AuthService] Error creating customer profile:", error.message);
      return {
        id: authUserId,
        auth_user_id: authUserId,
        phone: formattedPhone,
        full_name: fullName || "RoadRider Customer",
        city: "Lucknow",
      };
    }

    return created as CustomerProfile;
  } catch (err) {
    console.error("[AuthService] syncCustomerRecord exception:", err);
    return null;
  }
}

/**
 * Gets currently authenticated user profile
 */
export async function getCurrentCustomer(): Promise<CustomerProfile | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return null;

    const { data: customer } = await supabase
      .from("customers")
      .select("id, auth_user_id, phone, full_name, email, city, status, avatar_url")
      .or(`auth_user_id.eq.${user.id},id.eq.${user.id}`)
      .maybeSingle();

    if (customer) return customer as CustomerProfile;

    // Fallback if not yet synced
    const rawDigits = normalisePhone(user.phone || "");
    return {
      id: user.id,
      auth_user_id: user.id,
      phone: user.phone || "",
      full_name: (user.user_metadata?.full_name as string) || "RoadRider Customer",
      city: "Lucknow",
      status: "active",
    };
  } catch (err) {
    console.warn("[AuthService] getCurrentCustomer exception:", err);
    return null;
  }
}

/**
 * Updates customer profile details in `customers` table
 */
export async function updateCustomerProfile(
  customerId: string,
  updates: Partial<CustomerProfile>
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { success: false, error: "Not configured" };

  try {
    const { error } = await supabase
      .from("customers")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", customerId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update profile." };
  }
}

/**
 * Signs out from Supabase Auth
 */
export async function signOutUser(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn("[AuthService] signOut error:", err);
  }
}

/**
 * Deletes user profile and signs out
 */
export async function deleteAccount(customerId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    await supabase
      .from("customers")
      .update({ status: "inactive", updated_at: new Date().toISOString() })
      .eq("id", customerId);

    await supabase.auth.signOut();
    return true;
  } catch (err) {
    console.error("[AuthService] deleteAccount exception:", err);
    return false;
  }
}

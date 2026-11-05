import { supabase, isSupabaseConfigured } from "./supabase";

export interface SavedAddress {
  id: string;
  customer_id: string;
  label: string; // e.g. "Home", "Work", "Other"
  full_address: string;
  city?: string;
  latitude?: number | null;
  longitude?: number | null;
  is_default: boolean;
  created_at?: string;
}

export interface AddressInput {
  label: string;
  full_address: string;
  city?: string;
  latitude?: number | null;
  longitude?: number | null;
  is_default?: boolean;
}

/**
 * Fetches saved addresses for a customer from `customer_addresses` table
 */
export async function fetchCustomerAddresses(
  customerId: string
): Promise<SavedAddress[]> {
  if (!isSupabaseConfigured || !supabase || !customerId) return [];

  try {
    const { data, error } = await supabase
      .from("customer_addresses")
      .select("id, customer_id, label, full_address, city, latitude, longitude, is_default, created_at")
      .eq("customer_id", customerId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[AddressService] Error loading addresses:", error.message);
      return [];
    }

    return (data || []) as SavedAddress[];
  } catch (err) {
    console.error("[AddressService] fetchCustomerAddresses exception:", err);
    return [];
  }
}

/**
 * Adds a new address to `customer_addresses` table
 */
export async function addCustomerAddress(
  customerId: string,
  input: AddressInput
): Promise<{ success: boolean; data?: SavedAddress; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: "Database unconfigured" };
  }

  try {
    if (input.is_default) {
      // Unset previous defaults
      await supabase
        .from("customer_addresses")
        .update({ is_default: false })
        .eq("customer_id", customerId);
    }

    const { data, error } = await supabase
      .from("customer_addresses")
      .insert({
        customer_id: customerId,
        label: input.label || "Home",
        full_address: input.full_address,
        city: input.city || "Lucknow",
        latitude: input.latitude || 26.8467,
        longitude: input.longitude || 80.9462,
        is_default: input.is_default ?? false,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as SavedAddress };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to save address." };
  }
}

/**
 * Updates an existing address
 */
export async function updateCustomerAddress(
  addressId: string,
  customerId: string,
  input: Partial<AddressInput>
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { success: false, error: "Database unconfigured" };

  try {
    if (input.is_default) {
      await supabase
        .from("customer_addresses")
        .update({ is_default: false })
        .eq("customer_id", customerId);
    }

    const { error } = await supabase
      .from("customer_addresses")
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq("id", addressId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update address." };
  }
}

/**
 * Deletes an address from `customer_addresses`
 */
export async function deleteCustomerAddress(
  addressId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { success: false, error: "Database unconfigured" };

  try {
    const { error } = await supabase
      .from("customer_addresses")
      .delete()
      .eq("id", addressId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to delete address." };
  }
}

/**
 * Sets an address as the default address
 */
export async function setDefaultAddress(
  customerId: string,
  addressId: string
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;

  try {
    await supabase
      .from("customer_addresses")
      .update({ is_default: false })
      .eq("customer_id", customerId);

    const { error } = await supabase
      .from("customer_addresses")
      .update({ is_default: true, updated_at: new Date().toISOString() })
      .eq("id", addressId);

    return !error;
  } catch (err) {
    console.error("[AddressService] setDefaultAddress exception:", err);
    return false;
  }
}

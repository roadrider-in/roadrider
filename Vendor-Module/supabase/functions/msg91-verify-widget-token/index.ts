import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Resolves an existing GoTrue user by matching the normalized 10-digit Indian phone number.
 * Paginates through users to handle databases with more than 50 users.
 */
async function findUserByPhone(supabaseAdmin: any, raw10: string): Promise<any | null> {
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error || !data?.users?.length) break;
    const found = data.users.find((u: any) => {
      const uPhone = String(u.phone || "").replace(/\D/g, "");
      return uPhone.endsWith(raw10) || uPhone === raw10;
    });
    if (found) return found;
    if (data.users.length < perPage) break;
    page++;
  }
  return null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    let payload: any = {};
    try {
      const bodyText = await req.text();
      if (bodyText) payload = JSON.parse(bodyText);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON request payload." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract access-token returned by the MSG91 Web SDK widget
    const rawToken =
      payload?.["access-token"] ||
      payload?.accessToken ||
      payload?.token ||
      (typeof payload === "string" ? payload : null);

    if (!rawToken || typeof rawToken !== "string" || rawToken.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid MSG91 widget access token." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const msg91AuthKey = Deno.env.get("MSG91_AUTH_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    const missingSecrets: string[] = [];
    if (!msg91AuthKey) missingSecrets.push("MSG91_AUTH_KEY");
    if (!supabaseUrl) missingSecrets.push("SUPABASE_URL");
    if (!supabaseServiceRoleKey) missingSecrets.push("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseAnonKey) missingSecrets.push("SUPABASE_ANON_KEY");

    if (missingSecrets.length > 0) {
      console.error(`[MSG91 Widget Verify Error] Missing required secrets: ${missingSecrets.join(", ")}.`);
      return new Response(
        JSON.stringify({
          error: "SMS Service configuration error: Missing required secrets.",
          details: `Please configure the following secrets in Supabase Edge Functions: ${missingSecrets.join(", ")}.`,
          missing: missingSecrets,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Official MSG91 OTP Widget Access-Token Verification API:
    // POST https://control.msg91.com/api/v5/widget/verifyAccessToken
    const verifyUrl = "https://control.msg91.com/api/v5/widget/verifyAccessToken";

    console.log("[MSG91 Widget Verify] Calling server-side verifyAccessToken API...");

    const msg91Response = await fetch(verifyUrl, {
      method: "POST",
      headers: {
        authkey: msg91AuthKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        "access-token": rawToken.trim(),
      }),
    });

    const responseData = await msg91Response.json().catch(() => ({}));

    // MSG91 returns { type: "success", message: "91XXXXXXXXXX" }
    const isSuccess =
      msg91Response.ok &&
      (responseData.type === "success" ||
        responseData.message === "success" ||
        responseData.message === "Already verified" ||
        /^\+?\d{10,13}$/.test(String(responseData.message || "").trim()));

    if (!isSuccess || responseData.type === "error") {
      console.warn(
        `[MSG91 Widget Verify Failed] Response:`,
        responseData.message || JSON.stringify(responseData)
      );

      return new Response(
        JSON.stringify({
          success: false,
          error: responseData.message || "Invalid or expired MSG91 widget verification token.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Security Rule: Extract verified mobile number ONLY from trusted MSG91 response
    // Never fall back to client-supplied mobile numbers
    const verifiedIdentifier = String(responseData.message || "").trim();
    const cleanDigits = verifiedIdentifier.replace(/\D/g, "");

    if (!cleanDigits || cleanDigits.length < 10) {
      console.error("[MSG91 Security Rejection] MSG91 response did not contain a valid verified phone number.");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Verification failed: Provider response did not contain a verified phone number.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const raw10 = cleanDigits.slice(-10);
    const e164Phone = `+91${raw10}`;

    console.log(`[MSG91 Widget Verify Success] Verified phone: 91••••••${raw10.slice(-4)}`);

    // Synchronize genuine phone-only user in Supabase Auth & establish session
    let user: any = null;
    let session: any = null;

    if (supabaseUrl && supabaseServiceRoleKey && raw10.length === 10) {
      try {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });

        // 1. Look up existing user by verified phone number
        user = await findUserByPhone(supabaseAdmin, raw10);

        if (!user) {
          // 2. Create user with pure phone identity (NO synthetic email)
          const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            phone: e164Phone,
            phone_confirm: true,
            user_metadata: {
              phone: raw10,
              full_name: "Merchant Partner",
            },
          });

          if (createError) {
            // Inspect HTTP 422: "phone_exists" or "Phone number already registered by another user"
            if (
              createError.status === 422 &&
              (createError.code === "phone_exists" || /already registered|exists/i.test(createError.message))
            ) {
              console.log(`[MSG91 User Sync] User with phone ${raw10} exists (HTTP 422 phone_exists). Fetching record...`);
              user = await findUserByPhone(supabaseAdmin, raw10);
            } else {
              console.error("[MSG91 User Sync] User creation error:", createError.message);
              throw new Error(`Failed to create mobile user account: ${createError.message}`);
            }
          } else if (createData?.user) {
            user = createData.user;
          }
        }

        if (user && !user.phone_confirmed_at) {
          // 3. Mark phone as confirmed
          const { data: updateData } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
            phone_confirm: true,
          });
          if (updateData?.user) {
            user = updateData.user;
          }
        }

        // 4. Secure GoTrue Session Bridge:
        // Establish genuine Supabase Auth session via single-use ephemeral password exchange
        if (user && supabaseAnonKey) {
          const exchangeSecret = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
          try {
            await supabaseAdmin.auth.admin.updateUserById(user.id, {
              password: exchangeSecret,
            });

            const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
              auth: { persistSession: false },
            });

            // Try phone sign-in with E.164 (+91...) format first
            let phoneRes = await supabaseAnon.auth.signInWithPassword({
              phone: e164Phone,
              password: exchangeSecret,
            });

            // Fallback to 91XXXXXXXXXX without plus if needed
            if (!phoneRes.data?.session) {
              phoneRes = await supabaseAnon.auth.signInWithPassword({
                phone: `91${raw10}`,
                password: exchangeSecret,
              });
            }

            if (phoneRes.data?.session) {
              session = phoneRes.data.session;
            } else if (phoneRes.error) {
              console.warn("[MSG91 Session Notice] Phone sign-in response:", phoneRes.error);
              if (
                phoneRes.error.code === "phone_provider_disabled" ||
                /phone.*disabled|unsupported phone provider/i.test(phoneRes.error.message)
              ) {
                return new Response(
                  JSON.stringify({
                    success: false,
                    error:
                      "Phone logins are disabled in Supabase. Please enable the Phone provider in Supabase Dashboard (Authentication -> Providers -> Phone).",
                    code: "phone_provider_disabled",
                    phone: raw10,
                    user: { id: user.id, phone: user.phone || e164Phone },
                  }),
                  { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
              } else {
                throw new Error(phoneRes.error.message || "Failed to establish native GoTrue phone session.");
              }
            }
          } finally {
            // Immediately scramble/rotate exchange password so no password login can ever occur
            try {
              await supabaseAdmin.auth.admin.updateUserById(user.id, {
                password: crypto.randomUUID() + crypto.randomUUID() + crypto.randomUUID(),
              });
            } catch {}
          }
        }
      } catch (adminErr: any) {
        console.warn("[MSG91 User Sync] Supabase Admin sync notice:", adminErr.message);
        if (!session && adminErr.message) {
          return new Response(
            JSON.stringify({
              success: false,
              error: adminErr.message,
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Mobile number verified successfully via MSG91 Secure OTP Widget.",
        phone: raw10,
        e164Phone,
        user: user
          ? {
              id: user.id,
              phone: user.phone || e164Phone,
            }
          : null,
        session: session || null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[MSG91 Widget Verify Exception]", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error occurred while verifying token." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

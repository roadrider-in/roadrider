import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
}

/**
 * Format Indian mobile number to MSG91 required format:
 * Country code + 10 digits without leading '+' or '0' (e.g. "919876543210")
 */
function formatPhoneForMSG91(
  phone: string,
): { msg91Phone: string e164Phone: string raw10: string } {
  let cleanDigits = String(phone || "").replace(/\D/g, "")
  if (cleanDigits.startsWith("0")) {
    cleanDigits = cleanDigits.substring(1)
  }
  let raw10 = cleanDigits
  if (cleanDigits.length === 12 && cleanDigits.startsWith("91")) {
    raw10 = cleanDigits.substring(2)
  }
  if (raw10.length !== 10 || !/^[6-9]/.test(raw10)) {
    throw new Error(
      "Invalid Indian mobile number. Please enter a valid 10-digit number starting with 6-9.",
    )
  }
  return {
    msg91Phone: `91${raw10}`,
    e164Phone: `+91${raw10}`,
    raw10,
  }
}

/**
 * Resolves an existing GoTrue user by matching the normalized 10-digit Indian phone number.
 * Paginates through users to handle databases with more than 50 users.
 */
async function findUserByPhone(
  supabaseAdmin: any,
  raw10: string,
): Promise<any | null> {
  let page = 1
  const perPage = 1000
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    })
    if (error || !data?.users?.length) break
    const found = data.users.find((u: any) => {
      const uPhone = String(u.phone || "").replace(/\D/g, "")
      return uPhone.endsWith(raw10) || uPhone === raw10
    })
    if (found) return found
    if (data.users.length < perPage) break
    page++
  }
  return null
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  }

  try {
    let payload: any = {}
    try {
      const bodyText = await req.text()
      if (bodyText) payload = JSON.parse(bodyText)
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON request payload." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    const rawPhone = payload?.phone || payload?.mobile
    const rawOtp = String(payload?.otp || "").trim()
    const rawAccessToken =
      payload?.["access-token"] ||
      payload?.accessToken ||
      (!rawOtp && typeof payload?.token === "string" ? payload.token : null)

    if (!rawAccessToken && (!rawPhone || !rawOtp)) {
      return new Response(
        JSON.stringify({
          error: "Mobile number and OTP (or widget access-token) are required.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    const msg91AuthKey = Deno.env.get("MSG91_AUTH_KEY")
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")

    const missingSecrets: string[] = []
    if (!msg91AuthKey) missingSecrets.push("MSG91_AUTH_KEY")
    if (!supabaseUrl) missingSecrets.push("SUPABASE_URL")
    if (!supabaseServiceRoleKey)
      missingSecrets.push("SUPABASE_SERVICE_ROLE_KEY")
    if (!supabaseAnonKey) missingSecrets.push("SUPABASE_ANON_KEY")

    if (missingSecrets.length > 0) {
      console.error(
        `[MSG91 Verify OTP Error] Missing required secrets: ${missingSecrets.join(", ")}.`,
      )
      return new Response(
        JSON.stringify({
          error: "SMS Service configuration error: Missing required secrets.",
          details: `Please configure the following secrets in Supabase Edge Functions: ${missingSecrets.join(", ")}.`,
          missing: missingSecrets,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    let isSuccess = false
    let responseData: any = {}
    let resolvedPhone10 = ""

    // 1. If MSG91 OTP Widget access-token is provided, verify via official widget verifyAccessToken API:
    if (rawAccessToken) {
      console.log(
        "[MSG91 Verify] Verifying via MSG91 Widget verifyAccessToken API...",
      )
      const widgetVerifyUrl =
        "https://control.msg91.com/api/v5/widget/verifyAccessToken"

      const msg91WidgetResponse = await fetch(widgetVerifyUrl, {
        method: "POST",
        headers: {
          authkey: msg91AuthKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          "access-token": String(rawAccessToken).trim(),
        }),
      })

      responseData = await msg91WidgetResponse.json().catch(() => ({}))
      isSuccess =
        msg91WidgetResponse.ok &&
        (responseData.type === "success" ||
          responseData.message === "success" ||
          responseData.message === "Already verified" ||
          /^\+?\d{10,13}$/.test(String(responseData.message || "").trim()))

      if (isSuccess) {
        const idStr = String(responseData.message || "").replace(/\D/g, "")
        resolvedPhone10 = idStr.length >= 10 ? idStr.slice(-10) : ""
      }
    } else {
      // 2. Otherwise verify via MSG91 OTP verification GET endpoint
      if (!rawPhone) {
        return new Response(
          JSON.stringify({ error: "Mobile number is required." }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        )
      }

      if (!rawOtp || rawOtp.length !== 6 || !/^\d{6}$/.test(rawOtp)) {
        return new Response(
          JSON.stringify({
            error: "Please enter a valid 6-digit numeric verification code.",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        )
      }

      const { msg91Phone, raw10 } = formatPhoneForMSG91(rawPhone)
      resolvedPhone10 = raw10

      const verifyUrl = `https://control.msg91.com/api/v5/otp/verify?otp=${encodeURIComponent(
        rawOtp,
      )}&mobile=${encodeURIComponent(msg91Phone)}`

      console.log(
        `[MSG91 Verify OTP] Calling MSG91 verify API for: 91••••••${raw10.slice(-4)}`,
      )

      const msg91Response = await fetch(verifyUrl, {
        method: "GET",
        headers: {
          authkey: msg91AuthKey,
        },
      })

      responseData = await msg91Response.json().catch(() => ({}))

      isSuccess =
        msg91Response.ok &&
        (responseData.type === "success" ||
          responseData.message === "OTP verified success" ||
          responseData.message === "Already verified")
    }

    if (!isSuccess || responseData.type === "error") {
      console.warn(
        `[MSG91 Verify Failed] MSG91 returned error:`,
        responseData.message || JSON.stringify(responseData),
      )

      let errorMessage = "Invalid verification code or token. Please try again."
      if (responseData.message) {
        if (/expired/i.test(responseData.message)) {
          errorMessage =
            "Verification code/token has expired. Please request a new OTP."
        } else if (
          /not match/i.test(responseData.message) ||
          /invalid/i.test(responseData.message)
        ) {
          errorMessage =
            "Incorrect verification code. Please check and try again."
        } else {
          errorMessage = responseData.message
        }
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          details: responseData,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    // Determine final phone digits
    if (rawAccessToken) {
      if (!resolvedPhone10 || resolvedPhone10.length < 10) {
        return new Response(
          JSON.stringify({
            success: false,
            error:
              "Verification failed: Provider response did not return a verified phone number.",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        )
      }
    } else if (!resolvedPhone10 && rawPhone) {
      try {
        const { raw10 } = formatPhoneForMSG91(rawPhone)
        resolvedPhone10 = raw10
      } catch {}
    }
    const raw10 = resolvedPhone10
    const e164Phone = `+91${raw10}`

    console.log(
      `[MSG91 Verify Success] Verified for: 91••••••${raw10.slice(-4)}`,
    )

    // Pure phone-only user identity (no synthetic email, no custom JWT)
    let user: any = null
    let session: any = null

    if (supabaseUrl && supabaseServiceRoleKey && raw10.length === 10) {
      try {
        const supabaseAdmin = createClient(
          supabaseUrl,
          supabaseServiceRoleKey,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          },
        )

        // 1. Look up existing user by verified phone number
        user = await findUserByPhone(supabaseAdmin, raw10)

        if (!user) {
          // 2. Create user with pure phone identity (NO synthetic email)
          const { data: createData, error: createError } =
            await supabaseAdmin.auth.admin.createUser({
              phone: e164Phone,
              phone_confirm: true,
              user_metadata: {
                phone: raw10,
                full_name: "Merchant Partner",
              },
            })

          if (createError) {
            // Inspect HTTP 422: "phone_exists" or "Phone number already registered by another user"
            if (
              createError.status === 422 &&
              (createError.code === "phone_exists" ||
                /already registered|exists/i.test(createError.message))
            ) {
              console.log(
                `[MSG91 User Sync] User with phone ${raw10} exists (HTTP 422 phone_exists). Fetching record...`,
              )
              user = await findUserByPhone(supabaseAdmin, raw10)
            } else {
              console.error(
                "[MSG91 User Sync] User creation error:",
                createError.message,
              )
              throw new Error(
                `Failed to create mobile user account: ${createError.message}`,
              )
            }
          } else if (createData?.user) {
            user = createData.user
          }
        }

        if (user && !user.phone_confirmed_at) {
          // 3. Mark phone as confirmed
          const { data: updateData } =
            await supabaseAdmin.auth.admin.updateUserById(user.id, {
              phone_confirm: true,
            })
          if (updateData?.user) {
            user = updateData.user
          }
        }

        // 4. Secure GoTrue Session Bridge:
        // Establish genuine Supabase Auth session via single-use ephemeral password exchange
        if (user && supabaseAnonKey) {
          const exchangeSecret = `${crypto.randomUUID()}-${crypto.randomUUID()}`
          try {
            await supabaseAdmin.auth.admin.updateUserById(user.id, {
              password: exchangeSecret,
            })

            const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
              auth: { persistSession: false },
            })

            // Try phone sign-in with E.164 (+91...) format first
            let phoneRes = await supabaseAnon.auth.signInWithPassword({
              phone: e164Phone,
              password: exchangeSecret,
            })

            // Fallback to 91XXXXXXXXXX without plus if needed
            if (!phoneRes.data?.session) {
              phoneRes = await supabaseAnon.auth.signInWithPassword({
                phone: `91${raw10}`,
                password: exchangeSecret,
              })
            }

            if (phoneRes.data?.session) {
              session = phoneRes.data.session
            } else if (phoneRes.error) {
              console.warn(
                "[MSG91 Session Notice] Phone sign-in response:",
                phoneRes.error,
              )
              if (
                phoneRes.error.code === "phone_provider_disabled" ||
                /phone.*disabled|unsupported phone provider/i.test(
                  phoneRes.error.message,
                )
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
                  {
                    status: 500,
                    headers: {
                      ...corsHeaders,
                      "Content-Type": "application/json",
                    },
                  },
                )
              } else {
                throw new Error(
                  phoneRes.error.message ||
                    "Failed to establish native GoTrue phone session.",
                )
              }
            }
          } finally {
            try {
              await supabaseAdmin.auth.admin.updateUserById(user.id, {
                password:
                  crypto.randomUUID() +
                  crypto.randomUUID() +
                  crypto.randomUUID(),
              })
            } catch {}
          }
        }
      } catch (adminErr: any) {
        console.warn(
          "[MSG91 Verify OTP] Supabase Admin phone user sync notice:",
          adminErr.message,
        )
        if (!session && adminErr.message) {
          return new Response(
            JSON.stringify({
              success: false,
              error: adminErr.message,
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          )
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Mobile number verified successfully via MSG91.",
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
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  } catch (err: any) {
    console.error("[MSG91 Verify OTP Exception]", err)
    return new Response(
      JSON.stringify({
        error:
          err?.message || "Internal server error occurred while verifying OTP.",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  }
})

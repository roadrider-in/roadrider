import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

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
): { msg91Phone: string raw10: string } {
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
    raw10,
  }
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
    if (!rawPhone) {
      return new Response(
        JSON.stringify({ error: "Mobile number is required." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    const msg91AuthKey = Deno.env.get("MSG91_AUTH_KEY")
    const msg91TemplateId = Deno.env.get("MSG91_TEMPLATE_ID")
    const msg91SenderId = Deno.env.get("MSG91_SENDER_ID")
    const otpExpiryMinutes = parseInt(
      Deno.env.get("MSG91_OTP_EXPIRY") || "10",
      10,
    )

    const missingSecrets: string[] = []
    if (!msg91AuthKey) missingSecrets.push("MSG91_AUTH_KEY")

    if (missingSecrets.length > 0) {
      console.error(
        `[MSG91 Resend OTP Error] Missing required secrets: ${missingSecrets.join(", ")}.`,
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

    const { msg91Phone, raw10 } = formatPhoneForMSG91(rawPhone)
    const retryType = payload?.retryType === "voice" ? "voice" : "text"

    // Official MSG91 Retry OTP v5 API:
    // GET https://control.msg91.com/api/v5/otp/retry?mobile=91...&retrytype=text
    const retryUrl = `https://control.msg91.com/api/v5/otp/retry?mobile=${encodeURIComponent(
      msg91Phone,
    )}&retrytype=${encodeURIComponent(retryType)}`

    console.log(
      `[MSG91 Resend OTP] Retrying OTP for destination: 91••••••${raw10.slice(-4)}`,
    )

    const msg91Response = await fetch(retryUrl, {
      method: "GET",
      headers: {
        authkey: msg91AuthKey,
      },
    })

    const responseData = await msg91Response.json().catch(() => ({}))

    // If retry is blocked (e.g. "Retry limit exceeded" or "No OTP request found"),
    // fallback to dispatching a new OTP request so user isn't permanently locked out
    if (
      !msg91Response.ok ||
      (responseData.type && responseData.type === "error")
    ) {
      console.warn(
        `[MSG91 Retry Notice] Retry API returned error (${responseData.message || "error"}). Attempting fallback new send...`,
      )

      if (msg91TemplateId) {
        const fallbackUrl = "https://control.msg91.com/api/v5/otp"
        const fallbackBody: Record<string, any> = {
          template_id: msg91TemplateId,
          mobile: msg91Phone,
          otp_length: 6,
          otp_expiry: otpExpiryMinutes,
        }
        if (msg91SenderId) fallbackBody.sender = msg91SenderId

        const fallbackRes = await fetch(fallbackUrl, {
          method: "POST",
          headers: {
            authkey: msg91AuthKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(fallbackBody),
        })

        const fallbackData = await fallbackRes.json().catch(() => ({}))
        if (fallbackRes.ok && fallbackData.type !== "error") {
          return new Response(
            JSON.stringify({
              success: true,
              message: "Verification code resent successfully.",
              phone: raw10,
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          )
        }
      }

      return new Response(
        JSON.stringify({
          error: responseData.message || "Unable to resend OTP at this time.",
          details: responseData,
        }),
        {
          status: msg91Response.status >= 400 ? msg91Response.status : 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message:
          responseData.message || "Verification code resent successfully.",
        phone: raw10,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  } catch (err: any) {
    console.error("[MSG91 Resend OTP Exception]", err)
    return new Response(
      JSON.stringify({
        error:
          err?.message || "Internal server error occurred while resending OTP.",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  }
})

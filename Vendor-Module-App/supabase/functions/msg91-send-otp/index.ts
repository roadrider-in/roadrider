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
    if (!msg91TemplateId) missingSecrets.push("MSG91_TEMPLATE_ID")

    if (missingSecrets.length > 0) {
      console.error(
        `[MSG91 Send OTP Error] Missing required secrets: ${missingSecrets.join(", ")}.`,
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

    // Official MSG91 Send OTP v5 API:
    // POST https://control.msg91.com/api/v5/otp
    const msg91Url = "https://control.msg91.com/api/v5/otp"
    const msg91Body: Record<string, any> = {
      template_id: msg91TemplateId,
      mobile: msg91Phone,
      otp_length: 6,
      otp_expiry: otpExpiryMinutes,
    }

    if (msg91SenderId) {
      msg91Body.sender = msg91SenderId
    }

    console.log(
      `[MSG91 Send OTP] Dispatching OTP for destination: 91••••••${raw10.slice(-4)}`,
    )

    const msg91Response = await fetch(msg91Url, {
      method: "POST",
      headers: {
        authkey: msg91AuthKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(msg91Body),
    })

    const responseData = await msg91Response.json().catch(() => ({}))

    if (
      !msg91Response.ok ||
      (responseData.type && responseData.type === "error")
    ) {
      console.error(
        `[MSG91 Send OTP Failure] Status: ${msg91Response.status}, Response:`,
        JSON.stringify(responseData),
      )
      return new Response(
        JSON.stringify({
          error: responseData.message || "Failed to send OTP via SMS gateway.",
          details: responseData,
        }),
        {
          status: msg91Response.status >= 400 ? msg91Response.status : 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: responseData.message || "OTP sent successfully via MSG91 SMS.",
        phone: raw10,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  } catch (err: any) {
    console.error("[MSG91 Send OTP Exception]", err)
    return new Response(
      JSON.stringify({
        error:
          err?.message || "Internal server error occurred while sending OTP.",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  }
})

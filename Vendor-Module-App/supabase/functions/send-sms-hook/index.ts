import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature, x-supabase-signature, x-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

/**
 * Format Indian mobile number to MSG91 required format:
 * Country code (91) + 10 digits without leading '+' or '0' (e.g., "+919876543210" -> "919876543210")
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
      "Invalid Indian mobile number. Please provide a valid 10-digit number starting with 6-9.",
    )
  }
  return {
    msg91Phone: `91${raw10}`,
    raw10,
  }
}

/**
 * Decodes a webhook secret into raw bytes for HMAC-SHA256 verification.
 * Standard Webhook (Svix) secrets are prefixed with 'whsec_' and base64-encoded.
 * Also handles 'v1,whsec_' or 'v1,' prefixes if configured with the version tag.
 */
function decodeSecret(
  secret: string,
): { base64Key?: Uint8Array rawKey: Uint8Array } {
  let clean = secret.trim()
  if (clean.startsWith("v1,")) {
    clean = clean.slice(3).trim()
  }
  if (clean.startsWith("whsec_")) {
    clean = clean.slice(6).trim()
  }

  const rawKey = new TextEncoder().encode(clean)
  let base64Key: Uint8Array | undefined = undefined

  try {
    const binary = atob(clean)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    base64Key = bytes
  } catch {
    // If not valid base64, base64Key remains undefined
  }

  return { base64Key, rawKey }
}

/**
 * Constant-time byte array comparison to prevent timing attacks.
 */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let c = 0
  for (let i = 0; i < a.length; i++) {
    c |= a[i] ^ b[i]
  }
  return c === 0
}

async function checkSignatureWithKey(
  keyBytes: Uint8Array,
  toSign: string,
  passedSignatures: string[],
): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    )
    const encoder = new TextEncoder()
    const calculatedSigBytes = new Uint8Array(
      await crypto.subtle.sign("HMAC", key, encoder.encode(toSign)),
    )
    const calculatedSigBase64 = btoa(String.fromCharCode(...calculatedSigBytes))

    for (const item of passedSignatures) {
      const sigValue = item.startsWith("v1,") ? item.slice(3) : item
      try {
        const decodedExpected = new Uint8Array(
          Array.from(atob(sigValue), (c) => c.charCodeAt(0)),
        )
        if (timingSafeEqual(calculatedSigBytes, decodedExpected)) {
          return true
        }
      } catch {
        if (sigValue === calculatedSigBase64) {
          return true
        }
      }
    }
  } catch {
    return false
  }
  return false
}

/**
 * Verifies standard webhook signature (Svix specification) sent by Supabase Auth Hooks.
 */
async function verifyWebhookSignature(
  req: Request,
  rawBody: string,
  secret: string,
): Promise<{ valid: boolean reason?: string }> {
  const webhookId = req.headers.get("webhook-id")
  const webhookTimestamp = req.headers.get("webhook-timestamp")
  const webhookSignature = req.headers.get("webhook-signature")

  const { base64Key, rawKey } = decodeSecret(secret)

  // Check if standard webhook headers are present
  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    // Check fallback legacy signature headers
    const legacySig =
      req.headers.get("x-supabase-signature") || req.headers.get("x-signature")
    if (!legacySig) {
      return {
        valid: false,
        reason:
          "Missing webhook signature headers (webhook-id, webhook-timestamp, webhook-signature).",
      }
    }

    try {
      const keysToCheck = [base64Key, rawKey].filter(
        (k): k is Uint8Array => !!k,
      )
      const encoder = new TextEncoder()
      const cleanLegacy = legacySig.replace(/^sha256=/, "").trim()

      for (const k of keysToCheck) {
        const key = await crypto.subtle.importKey(
          "raw",
          k,
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"],
        )
        const calculatedSig = new Uint8Array(
          await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody)),
        )
        const hexSig = Array.from(calculatedSig)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
        if (hexSig === cleanLegacy) return { valid: true }
      }
      return { valid: false, reason: "Legacy signature did not match." }
    } catch (e: any) {
      return {
        valid: false,
        reason: e?.message || "Legacy signature verification error.",
      }
    }
  }

  // Validate timestamp tolerance (5 minutes / 300 seconds)
  const now = Math.floor(Date.now() / 1000)
  const ts = parseInt(webhookTimestamp, 10)
  if (isNaN(ts) || Math.abs(now - ts) > 300) {
    return {
      valid: false,
      reason:
        "Webhook timestamp expired or out of tolerance (max 300s difference).",
    }
  }

  try {
    const toSign = `${webhookId}.${webhookTimestamp}.${rawBody}`
    const passedSignatures = webhookSignature
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)

    if (base64Key) {
      const validBase64 = await checkSignatureWithKey(
        base64Key,
        toSign,
        passedSignatures,
      )
      if (validBase64) return { valid: true }
    }

    const validRaw = await checkSignatureWithKey(
      rawKey,
      toSign,
      passedSignatures,
    )
    if (validRaw) return { valid: true }

    return {
      valid: false,
      reason:
        "Computed signature did not match any signature in webhook-signature.",
    }
  } catch (err: any) {
    return {
      valid: false,
      reason: err?.message || "Signature verification exception.",
    }
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  // Only accept POST requests from Supabase Auth Send SMS Hook
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: { message: "Method not allowed. Use POST." } }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  }

  try {
    const msg91AuthKey = Deno.env.get("MSG91_AUTH_KEY")
    const msg91TemplateId = Deno.env.get("MSG91_TEMPLATE_ID")
    const msg91SenderId = Deno.env.get("MSG91_SENDER_ID")
    const hookSecret =
      Deno.env.get("SEND_SMS_HOOK_SECRET") || Deno.env.get("HOOK_SECRET")

    const missingSecrets: string[] = []
    if (!msg91AuthKey) missingSecrets.push("MSG91_AUTH_KEY")
    if (!msg91TemplateId) missingSecrets.push("MSG91_TEMPLATE_ID")

    if (missingSecrets.length > 0) {
      console.error(
        `[Send SMS Hook Error] Missing required MSG91 credentials: ${missingSecrets.join(", ")}`,
      )
      return new Response(
        JSON.stringify({
          error: {
            message:
              "SMS gateway configuration error: Missing required server credentials.",
          },
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    const rawBody = await req.text()

    // Webhook Signature Verification if secret is configured in environment
    if (hookSecret) {
      const verification = await verifyWebhookSignature(
        req,
        rawBody,
        hookSecret,
      )
      if (!verification.valid) {
        console.error(
          "[Send SMS Hook Error] Webhook signature verification failed:",
          verification.reason,
        )
        return new Response(
          JSON.stringify({
            error: {
              message: "Invalid or unauthorized webhook signature.",
            },
          }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        )
      }
    } else {
      console.warn(
        "[Send SMS Hook Notice] SEND_SMS_HOOK_SECRET not set in environment. Skipping signature verification during setup phase.",
      )
    }

    let payload: any = {}
    try {
      if (rawBody) payload = JSON.parse(rawBody)
    } catch {
      return new Response(
        JSON.stringify({
          error: { message: "Invalid JSON payload received." },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    // Supabase Send SMS Auth Hook payload format:
    // { "user": { "id": "...", "phone": "+919876543210" }, "sms": { "otp": "123456" } }
    const phone = payload?.user?.phone || payload?.phone
    const otp = payload?.sms?.otp || payload?.otp

    if (!phone || !otp) {
      console.error("[Send SMS Hook Error] Missing phone or OTP in payload.")
      return new Response(
        JSON.stringify({
          error: {
            message:
              "Invalid hook payload. Both user.phone and sms.otp are required.",
          },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    let msg91Phone: string
    let raw10: string
    try {
      const formatted = formatPhoneForMSG91(phone)
      msg91Phone = formatted.msg91Phone
      raw10 = formatted.raw10
    } catch (fmtErr: any) {
      return new Response(
        JSON.stringify({
          error: {
            message: fmtErr.message || "Invalid mobile number format.",
          },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    // Prepare MSG91 POST /api/v5/otp request following official SendOTP v5 contract:
    // 1. Mandatory query parameters on URL: template_id and mobile (and sender if configured)
    // 2. Mandatory headers: authkey and Content-Type: application/json
    // 3. Request body: OTP template variables only (no duplicate template_id or mobile)
    const msg91Url = new URL("https://control.msg91.com/api/v5/otp")
    msg91Url.searchParams.set("template_id", msg91TemplateId)
    msg91Url.searchParams.set("mobile", msg91Phone)

    if (msg91SenderId) {
      msg91Url.searchParams.set("sender", msg91SenderId)
    }

    const msg91Body: Record<string, any> = {
      OTP: String(otp),
    }

    console.log(
      `[Send SMS Hook] Dispatching Supabase OTP via MSG91 for destination: 91••••••${raw10.slice(-4)}`,
    )

    const msg91Response = await fetch(msg91Url.toString(), {
      method: "POST",
      headers: {
        authkey: msg91AuthKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(msg91Body),
    })

    const responseData = await msg91Response.json().catch(() => ({}))

    // Extract diagnostic identifiers safely without exposing secrets
    const apiType =
      typeof responseData?.type === "string" ? responseData.type.trim() : ""
    const apiStatus =
      typeof responseData?.status === "string"
        ? responseData.status.trim().toLowerCase()
        : ""
    const rawMessage =
      typeof responseData?.message === "string"
        ? responseData.message.trim()
        : ""
    // In MSG91 SendOTP v5, the alphanumeric request ID is typically returned in responseData.message on success
    const requestId =
      typeof responseData?.request_id === "string"
        ? responseData.request_id.trim()
        : typeof responseData?.requestId === "string"
          ? responseData.requestId.trim()
          : typeof responseData?.message_id === "string"
            ? responseData.message_id.trim()
            : apiType.toLowerCase() === "success" &&
                /^[a-zA-Z0-9_-]{10,64}$/.test(rawMessage)
              ? rawMessage
              : ""

    // Sanitize response message (limit length, remove newlines)
    const sanitizedMsg = rawMessage.replace(/[\r\n\t]/g, " ").slice(0, 200)

    // Determine if MSG91 reported an explicit API error or non-2xx status
    const isError =
      !msg91Response.ok ||
      apiType.toLowerCase() === "error" ||
      apiType.toLowerCase() === "failed" ||
      apiStatus === "error" ||
      apiStatus === "failed"

    if (isError) {
      console.error(
        `[Send SMS Hook Error] MSG91 gateway returned HTTP ${msg91Response.status} [type: ${apiType || "none"}]: ${sanitizedMsg || "SMS gateway failed to deliver OTP message."}`,
      )
      const errorStatus =
        msg91Response.status >= 400 && msg91Response.status < 600
          ? msg91Response.status
          : 502
      return new Response(
        JSON.stringify({
          error: {
            message:
              sanitizedMsg || "SMS gateway failed to deliver OTP message.",
          },
        }),
        {
          status: errorStatus,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    // Safely log diagnostic details without logging OTPs, API keys, signatures, or full mobile numbers
    const logDetails = [
      `HTTP ${msg91Response.status}`,
      `indicator: ${apiType || "success"}`,
      sanitizedMsg ? `message: "${sanitizedMsg}"` : "",
      requestId ? `request_id: ${requestId}` : "",
    ]
      .filter(Boolean)
      .join(", ")

    console.log(
      `[Send SMS Hook] MSG91 API accepted OTP dispatch for destination: 91••••••${raw10.slice(-4)} (${logDetails})`,
    )

    // Supabase Auth Hook contract expects empty JSON object {} with HTTP 200 on success
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err: any) {
    console.error("[Send SMS Hook Exception]", err)
    return new Response(
      JSON.stringify({
        error: {
          message:
            err?.message || "Internal server error occurred in Send SMS Hook.",
        },
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  }
})

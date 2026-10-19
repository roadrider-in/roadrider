/// <reference path="../deno.d.ts" />
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

/**
 * Format Indian mobile number to MSG91 required format (e.g., "+919876543210" -> "919876543210")
 */
function formatPhoneForMSG91(phone: string): string {
  const cleanDigits = phone.replace(/\D/g, "");
  if (cleanDigits.length === 10) {
    return `91${cleanDigits}`;
  }
  if (cleanDigits.length === 12 && cleanDigits.startsWith("91")) {
    return cleanDigits;
  }
  return cleanDigits;
}

serve(async (req: Request) => {
  // Only accept POST requests from Supabase Auth Hook
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const msg91AuthKey = Deno.env.get("MSG91_AUTH_KEY");
    const msg91TemplateId = Deno.env.get("MSG91_TEMPLATE_ID");
    const msg91SenderId = Deno.env.get("MSG91_SENDER_ID");
    const hookSecret = Deno.env.get("SEND_SMS_HOOK_SECRET") || Deno.env.get("HOOK_SECRET");

    if (!msg91AuthKey || !msg91TemplateId) {
      console.error("[Send SMS Hook Error] Missing MSG91_AUTH_KEY or MSG91_TEMPLATE_ID secret.");
      return new Response(
        JSON.stringify({ error: "Server configuration error: MSG91 credentials missing." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const bodyText = await req.text();

    // Optional Webhook Signature Verification if secret is configured
    if (hookSecret) {
      const signatureHeader = req.headers.get("x-supabase-signature") || req.headers.get("x-signature");
      if (signatureHeader) {
        try {
          const encoder = new TextEncoder();
          const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(hookSecret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["verify"]
          );
          const sigBytes = new Uint8Array(
            signatureHeader.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
          );
          const isValid = await crypto.subtle.verify(
            "HMAC",
            key,
            sigBytes,
            encoder.encode(bodyText)
          );
          if (!isValid) {
            console.error("[Send SMS Hook Error] Invalid webhook signature");
            return new Response(
              JSON.stringify({ error: "Invalid webhook signature" }),
              { status: 401, headers: { "Content-Type": "application/json" } }
            );
          }
        } catch (sigErr) {
          console.warn("[Send SMS Hook Warning] Webhook signature verification check error:", sigErr);
        }
      }
    }

    let payload: any;
    try {
      payload = JSON.parse(bodyText);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON payload" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Supabase Send SMS Auth Hook payload format:
    // { "user": { "phone": "+91..." }, "sms": { "otp": "123456" } }
    const phone = payload?.user?.phone || payload?.phone;
    const otp = payload?.sms?.otp || payload?.otp;

    if (!phone || !otp) {
      console.error("[Send SMS Hook Error] Missing phone or OTP in payload");
      return new Response(
        JSON.stringify({ error: "Payload must contain user.phone and sms.otp" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const formattedMobile = formatPhoneForMSG91(phone);

    // MSG91 Send OTP v5 API
    // Official Endpoint: https://control.msg91.com/api/v5/otp
    const msg91Url = `https://control.msg91.com/api/v5/otp`;
    const msg91Body: Record<string, any> = {
      template_id: msg91TemplateId,
      mobile: formattedMobile,
      otp: String(otp),
    };

    if (msg91SenderId) {
      msg91Body.sender = msg91SenderId;
    }

    const msg91Response = await fetch(msg91Url, {
      method: "POST",
      headers: {
        "authkey": msg91AuthKey as string,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(msg91Body),
    });

    const responseData = await msg91Response.json().catch(() => ({}));

    if (!msg91Response.ok || (responseData.type && responseData.type === "error")) {
      console.error(
        `[Send SMS Hook Error] MSG91 returned status ${msg91Response.status}:`,
        responseData.message || JSON.stringify(responseData)
      );
      return new Response(
        JSON.stringify({
          error: "SMS provider failed to deliver OTP",
          details: responseData.message || "MSG91 dispatch failure",
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    // HTTP 200 OK returned to Supabase Auth Hook
    return new Response(
      JSON.stringify({ success: true, message: "SMS dispatched successfully via MSG91" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[Send SMS Hook Exception]", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

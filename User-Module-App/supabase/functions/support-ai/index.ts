/// <reference path="../deno.d.ts" />
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ChatRequestBody {
  message: string;
  conversation_id?: string;
  history?: Array<{ sender: "user" | "ai" | "admin"; text: string }>;
  order_context?: {
    orderId?: string;
    orderNumber?: string;
    storeName?: string;
    total?: number;
    status?: string;
  };
  customer_profile?: {
    name?: string;
    phone?: string;
    customerId?: string;
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    let body: ChatRequestBody;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON request body." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userMessage = (body.message || "").trim();
    if (!userMessage) {
      return new Response(
        JSON.stringify({ error: "Message cannot be empty." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Inspect server-side secrets for real AI providers
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");
    const openAiApiKey = Deno.env.get("OPENAI_API_KEY");

    // If no real AI provider secret is configured on the backend, explicitly report the missing dependency.
    // NEVER fake or simulate AI responses.
    if (!geminiApiKey && !openAiApiKey) {
      console.warn(
        "[support-ai] No AI provider key found (checked GEMINI_API_KEY, GOOGLE_API_KEY, OPENAI_API_KEY)."
      );
      return new Response(
        JSON.stringify({
          configured: false,
          error: "AI_PROVIDER_NOT_CONFIGURED",
          message:
            "RoadRider AI Chat Support requires an AI provider API key (GEMINI_API_KEY or OPENAI_API_KEY) in Supabase secrets. Please configure it in your Supabase project or create a Support Ticket for immediate human assistance.",
          can_escalate_to_ticket: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const conversationId = body.conversation_id || crypto.randomUUID();

    // Construct grounded system context
    let contextPrompt = `You are RoadRider Customer Support AI Assistant.
RoadRider is an on-demand food, grocery, parcel delivery, and ride booking platform.
Your goals:
- Be helpful, polite, concise, and accurate.
- Answer user queries about their orders, deliveries, cancellations, and app features.
- Never invent order details, payment refunds, or driver locations.
- If the user is facing an issue with missing items, damaged food, delayed delivery, or payment errors, provide relevant advice and invite them to 'Report an Order Issue' or escalate to a human support ticket.
`;

    if (body.customer_profile) {
      contextPrompt += `\nCustomer Profile: Name: ${body.customer_profile.name || "Customer"}, Phone: ${body.customer_profile.phone || "N/A"}`;
    }

    if (body.order_context) {
      contextPrompt += `\nReferenced Order Information:
- Order ID: ${body.order_context.orderId || "N/A"}
- Order Number: ${body.order_context.orderNumber || "N/A"}
- Store/Merchant: ${body.order_context.storeName || "N/A"}
- Total Amount: ₹${body.order_context.total ?? "N/A"}
- Current Status: ${body.order_context.status || "N/A"}`;
    }

    let replyText = "";
    let providerName = "";

    // 1. Try Gemini if configured
    if (geminiApiKey) {
      providerName = "gemini";
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

        // Build conversation turns
        const contents: any[] = [];
        contents.push({
          role: "user",
          parts: [{ text: `[System Instructions]\n${contextPrompt}` }],
        });
        contents.push({
          role: "model",
          parts: [{ text: "Understood. I am ready to assist the RoadRider customer accurately." }],
        });

        if (Array.isArray(body.history)) {
          for (const h of body.history.slice(-8)) {
            contents.push({
              role: h.sender === "user" ? "user" : "model",
              parts: [{ text: h.text }],
            });
          }
        }

        contents.push({
          role: "user",
          parts: [{ text: userMessage }],
        });

        const geminiRes = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents }),
        });

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const candidateText =
            geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) {
            replyText = candidateText.trim();
          }
        } else {
          const errText = await geminiRes.text();
          console.error("[support-ai] Gemini API error:", geminiRes.status, errText);
        }
      } catch (geminiErr: any) {
        console.error("[support-ai] Exception calling Gemini:", geminiErr);
      }
    }

    // 2. Fall back to OpenAI if Gemini was not configured or failed
    if (!replyText && openAiApiKey) {
      providerName = "openai";
      try {
        const messages: any[] = [{ role: "system", content: contextPrompt }];
        if (Array.isArray(body.history)) {
          for (const h of body.history.slice(-8)) {
            messages.push({
              role: h.sender === "user" ? "user" : "assistant",
              content: h.text,
            });
          }
        }
        messages.push({ role: "user", content: userMessage });

        const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openAiApiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages,
            temperature: 0.3,
            max_tokens: 400,
          }),
        });

        if (openAiRes.ok) {
          const openAiData = await openAiRes.json();
          replyText =
            openAiData?.choices?.[0]?.message?.content?.trim() || "";
        } else {
          const errText = await openAiRes.text();
          console.error("[support-ai] OpenAI API error:", openAiRes.status, errText);
        }
      } catch (openAiErr: any) {
        console.error("[support-ai] Exception calling OpenAI:", openAiErr);
      }
    }

    if (!replyText) {
      return new Response(
        JSON.stringify({
          configured: true,
          success: false,
          error: "Failed to generate AI response from upstream provider. Please try again or create a support ticket.",
          conversation_id: conversationId,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Optional Supabase DB persistence for chat sessions if credentials are in env
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (supabaseUrl && supabaseServiceKey && body.customer_profile?.customerId) {
      try {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        // We can optionally keep record in support_tickets table if desired
      } catch {}
    }

    return new Response(
      JSON.stringify({
        configured: true,
        success: true,
        reply: replyText,
        provider: providerName,
        conversation_id: conversationId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("[support-ai] Unexpected exception:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

import { supabase, isSupabaseConfigured } from "./supabase";

export type TicketCategory =
  | "missing_items"
  | "damaged_items"
  | "delivery_issue"
  | "wrong_order"
  | "payment_issue"
  | "chat_support"
  | "other";

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";

export interface SupportMessage {
  id: string;
  sender: "user" | "admin" | "ai" | "agent";
  senderName: string;
  text: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  customerId?: string | null;
  customerPhone?: string | null;
  customerName?: string | null;
  orderId?: string | null;
  orderNumber?: string | null;
  category: TicketCategory;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  requesterType: "customer" | "vendor" | "partner";
  assignedTo?: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  messages: SupportMessage[];
}

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  missing_items: "Missing Items",
  damaged_items: "Damaged / Poor Quality",
  delivery_issue: "Delivery Delay / Problem",
  wrong_order: "Incorrect Order Received",
  payment_issue: "Payment / Billing Issue",
  chat_support: "Support Conversation",
  other: "General Order Issue",
};

/**
 * Parses description field which may be either a plain string or a JSON-encoded thread.
 */
export function parseTicketDescription(rawDescription: string | null): {
  summary: string;
  customerPhone?: string;
  customerName?: string;
  orderNumber?: string;
  messages: SupportMessage[];
} {
  if (!rawDescription) {
    return { summary: "No description provided", messages: [] };
  }

  try {
    const parsed = JSON.parse(rawDescription);
    if (parsed && typeof parsed === "object") {
      return {
        summary: parsed.summary || parsed.initial_message || rawDescription,
        customerPhone: parsed.customer_phone,
        customerName: parsed.customer_name,
        orderNumber: parsed.order_number,
        messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      };
    }
  } catch {
    // Plain string description
  }

  return {
    summary: rawDescription,
    messages: [
      {
        id: "msg-initial",
        sender: "user",
        senderName: "Customer",
        text: rawDescription,
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Encodes summary and message thread back into the description column.
 */
export function encodeTicketDescription(
  summary: string,
  messages: SupportMessage[],
  metadata?: {
    customerPhone?: string;
    customerName?: string;
    orderNumber?: string;
  }
): string {
  return JSON.stringify({
    summary: summary.trim(),
    customer_phone: metadata?.customerPhone,
    customer_name: metadata?.customerName,
    order_number: metadata?.orderNumber,
    messages,
  });
}

function generateTicketNumber(): string {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TKT-${dateStr}-${rand}`;
}

/**
 * Creates a real support ticket in Supabase `support_tickets` table.
 */
export async function createSupportTicket(params: {
  customerId?: string | null;
  customerPhone?: string | null;
  customerName?: string | null;
  orderId?: string | null;
  orderNumber?: string | null;
  category: TicketCategory;
  subject: string;
  description: string;
  priority?: TicketPriority;
}): Promise<{ ok: boolean; ticket?: SupportTicket; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: "Supabase backend is not configured." };
  }

  const cleanSubject = params.subject.trim();
  const cleanDescription = params.description.trim();

  if (!cleanSubject) {
    return { ok: false, error: "Ticket subject is required." };
  }
  if (!cleanDescription) {
    return { ok: false, error: "Please provide a description of the issue." };
  }

  const ticketNumber = generateTicketNumber();
  const now = new Date().toISOString();

  // Initial message in conversation thread
  const initialMessage: SupportMessage = {
    id: `msg-${Date.now()}`,
    sender: "user",
    senderName: params.customerName || "Customer",
    text: cleanDescription,
    createdAt: now,
  };

  const isUuid = (val: any): boolean =>
    typeof val === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());

  const orderNum =
    params.orderNumber ||
    (params.orderId ? String(params.orderId) : undefined);

  const encodedDescription = encodeTicketDescription(
    cleanDescription,
    [initialMessage],
    {
      customerPhone: params.customerPhone || undefined,
      customerName: params.customerName || undefined,
      orderNumber: orderNum,
    }
  );

  try {
    const payload: any = {
      ticket_number: ticketNumber,
      category: params.category,
      subject: cleanSubject,
      description: encodedDescription,
      status: "open",
      priority: params.priority || "medium",
      requester_type: "customer",
      created_at: now,
      updated_at: now,
    };

    if (isUuid(params.customerId)) {
      payload.customer_id = params.customerId;
    }
    let resolvedOrderUuid: string | null = null;
    if (params.orderId) {
      if (isUuid(params.orderId)) {
        resolvedOrderUuid = params.orderId;
      } else {
        const hexOnly = params.orderId.replace(/[^0-9a-f]/gi, "").toLowerCase();
        if (hexOnly.length >= 6) {
          try {
            const { data: matchedOrders } = await supabase
              .from("orders")
              .select("id")
              .limit(50);
            if (matchedOrders) {
              const found = matchedOrders.find((o: any) =>
                o.id?.toLowerCase().replace(/-/g, "").startsWith(hexOnly) ||
                o.id?.toLowerCase().startsWith(hexOnly)
              );
              if (found && isUuid(found.id)) {
                resolvedOrderUuid = found.id;
              }
            }
          } catch {}
        }
      }
    }

    if (resolvedOrderUuid && isUuid(resolvedOrderUuid)) {
      payload.order_id = resolvedOrderUuid;
    }

    const { data, error } = await supabase
      .from("support_tickets")
      .insert(payload)
      .select()
      .single();

    if (error || !data) {
      console.error("[SupportService] Error inserting ticket:", error);
      return { ok: false, error: error?.message || "Failed to create support ticket." };
    }

    const parsed = parseTicketDescription(data.description);
    const createdTicket: SupportTicket = {
      id: data.id,
      ticketNumber: data.ticket_number || ticketNumber,
      customerId: data.customer_id,
      customerPhone: params.customerPhone,
      customerName: params.customerName,
      orderId: data.order_id || parsed.orderNumber || params.orderId,
      orderNumber: parsed.orderNumber || (data.order_id ? `RR-${data.order_id.slice(0, 8).toUpperCase()}` : params.orderNumber || params.orderId),
      category: (data.category as TicketCategory) || params.category,
      subject: data.subject,
      description: parsed.summary,
      status: (data.status as TicketStatus) || "open",
      priority: (data.priority as TicketPriority) || "medium",
      requesterType: "customer",
      assignedTo: data.assigned_to,
      createdAt: data.created_at || now,
      updatedAt: data.updated_at || now,
      resolvedAt: data.resolved_at,
      messages: parsed.messages,
    };

    return { ok: true, ticket: createdTicket };
  } catch (err: any) {
    console.error("[SupportService] Exception creating ticket:", err);
    return { ok: false, error: err?.message || "Network error while submitting ticket." };
  }
}

/**
 * Fetches all tickets belonging to an authenticated user from Supabase.
 */
export async function fetchUserTickets(
  customerIdOrPhone: string
): Promise<SupportTicket[]> {
  if (!isSupabaseConfigured || !supabase || !customerIdOrPhone) {
    return [];
  }

  try {
    const cleanPhone = customerIdOrPhone.replace(/\D/g, "").slice(-10);
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        customerIdOrPhone
      );

    let query = supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (isUuid) {
      query = query.or(
        `customer_id.eq.${customerIdOrPhone},description.ilike.%${cleanPhone}%`
      );
    } else if (cleanPhone) {
      query = query.ilike("description", `%${cleanPhone}%`);
    }

    const { data, error } = await query;
    if (error || !data) {
      console.warn("[SupportService] Error fetching tickets:", error?.message);
      return [];
    }

    return data.map((d: any) => {
      const parsed = parseTicketDescription(d.description);
      return {
        id: d.id,
        ticketNumber: d.ticket_number || `TKT-${d.id.slice(0, 8).toUpperCase()}`,
        customerId: d.customer_id,
        customerPhone: parsed.customerPhone,
        customerName: parsed.customerName,
        orderId: d.order_id,
        orderNumber: parsed.orderNumber,
        category: (d.category as TicketCategory) || "other",
        subject: d.subject || "Support Ticket",
        description: parsed.summary,
        status: (d.status as TicketStatus) || "open",
        priority: (d.priority as TicketPriority) || "medium",
        requesterType: "customer",
        assignedTo: d.assigned_to,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
        resolvedAt: d.resolved_at,
        messages: parsed.messages,
      };
    });
  } catch (err) {
    console.warn("[SupportService] Exception fetching user tickets:", err);
    return [];
  }
}

/**
 * Fetches a single ticket with full message history by ID.
 */
export async function fetchTicketById(
  ticketId: string
): Promise<SupportTicket | null> {
  if (!isSupabaseConfigured || !supabase || !ticketId) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("id", ticketId)
      .single();

    if (error || !data) {
      return null;
    }

    const parsed = parseTicketDescription(data.description);
    return {
      id: data.id,
      ticketNumber: data.ticket_number || `TKT-${data.id.slice(0, 8).toUpperCase()}`,
      customerId: data.customer_id,
      customerPhone: parsed.customerPhone,
      customerName: parsed.customerName,
      orderId: data.order_id,
      orderNumber: parsed.orderNumber,
      category: (data.category as TicketCategory) || "other",
      subject: data.subject || "Support Ticket",
      description: parsed.summary,
      status: (data.status as TicketStatus) || "open",
      priority: (data.priority as TicketPriority) || "medium",
      requesterType: "customer",
      assignedTo: data.assigned_to,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      resolvedAt: data.resolved_at,
      messages: parsed.messages,
    };
  } catch {
    return null;
  }
}

/**
 * Adds a new reply message to an existing ticket.
 */
export async function addMessageToTicket(
  ticketId: string,
  message: {
    text: string;
    sender: "user" | "admin" | "ai" | "agent";
    senderName: string;
  }
): Promise<{ ok: boolean; ticket?: SupportTicket; error?: string }> {
  if (!isSupabaseConfigured || !supabase || !ticketId) {
    return { ok: false, error: "Supabase is not configured." };
  }

  try {
    const existing = await fetchTicketById(ticketId);
    if (!existing) {
      return { ok: false, error: "Support ticket not found." };
    }

    const newMessage: SupportMessage = {
      id: `msg-${Date.now()}`,
      sender: message.sender,
      senderName: message.senderName,
      text: message.text.trim(),
      createdAt: new Date().toISOString(),
    };

    const updatedMessages = [...existing.messages, newMessage];
    const encodedDescription = encodeTicketDescription(
      existing.description,
      updatedMessages,
      {
        customerPhone: existing.customerPhone || undefined,
        customerName: existing.customerName || undefined,
        orderNumber: existing.orderNumber || undefined,
      }
    );

    const now = new Date().toISOString();
    const updatePayload: any = {
      description: encodedDescription,
      updated_at: now,
    };

    // If customer replies to a resolved ticket, reopen ticket
    if (existing.status === "resolved" && message.sender === "user") {
      updatePayload.status = "open";
    }

    const { data, error } = await supabase
      .from("support_tickets")
      .update(updatePayload)
      .eq("id", ticketId)
      .select()
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message || "Failed to update ticket." };
    }

    const parsed = parseTicketDescription(data.description);
    return {
      ok: true,
      ticket: {
        ...existing,
        status: (data.status as TicketStatus) || existing.status,
        updatedAt: now,
        messages: parsed.messages,
      },
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Error adding message to ticket." };
  }
}

/**
 * Subscribes to Realtime updates for a specific support ticket.
 */
export function subscribeToTicket(
  ticketId: string,
  onUpdate: (ticket: SupportTicket) => void
): () => void {
  if (!isSupabaseConfigured || !supabase || !ticketId) {
    return () => {};
  }

  const channel = supabase
    .channel(`ticket-live-${ticketId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "support_tickets",
        filter: `id=eq.${ticketId}`,
      },
      (payload) => {
        const raw = payload.new as any;
        if (!raw) return;
        const parsed = parseTicketDescription(raw.description);
        onUpdate({
          id: raw.id,
          ticketNumber: raw.ticket_number || `TKT-${raw.id.slice(0, 8).toUpperCase()}`,
          customerId: raw.customer_id,
          customerPhone: parsed.customerPhone,
          customerName: parsed.customerName,
          orderId: raw.order_id,
          orderNumber: parsed.orderNumber,
          category: (raw.category as TicketCategory) || "other",
          subject: raw.subject || "Support Ticket",
          description: parsed.summary,
          status: (raw.status as TicketStatus) || "open",
          priority: (raw.priority as TicketPriority) || "medium",
          requesterType: "customer",
          assignedTo: raw.assigned_to,
          createdAt: raw.created_at,
          updatedAt: raw.updated_at,
          resolvedAt: raw.resolved_at,
          messages: parsed.messages,
        });
      }
    )
    .subscribe();

  return () => {
    if (supabase) {
      supabase.removeChannel(channel);
    }
  };
}

/**
 * Invokes the server-side AI Support Edge Function (`support-ai`).
 * If no AI provider is configured on the backend, reports the exact dependency status.
 */
export async function sendAiChatMessage(params: {
  message: string;
  conversationId?: string;
  orderContext?: {
    orderId?: string;
    orderNumber?: string;
    storeName?: string;
    total?: number;
    status?: string;
  };
  customerProfile?: {
    name?: string;
    phone?: string;
  };
}): Promise<{
  success: boolean;
  aiConfigured: boolean;
  reply?: string;
  error?: string;
  conversationId?: string;
}> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      aiConfigured: false,
      error: "Supabase client is not configured.",
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke("support-ai", {
      body: {
        message: params.message.trim(),
        conversation_id: params.conversationId,
        order_context: params.orderContext,
        customer_profile: params.customerProfile,
      },
    });

    if (error) {
      // Edge Function error or 404 / 503
      return {
        success: false,
        aiConfigured: false,
        error: error.message || "AI service returned an error.",
      };
    }

    if (data && data.configured === false) {
      return {
        success: false,
        aiConfigured: false,
        error: data.message || "AI provider key is not configured on the backend.",
      };
    }

    if (data?.reply) {
      return {
        success: true,
        aiConfigured: true,
        reply: data.reply,
        conversationId: data.conversation_id,
      };
    }

    return {
      success: false,
      aiConfigured: false,
      error: "No response received from AI service.",
    };
  } catch (err: any) {
    return {
      success: false,
      aiConfigured: false,
      error: err?.message || "Failed to reach AI support endpoint.",
    };
  }
}

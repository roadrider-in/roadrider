import { useEffect, useState, useRef } from "react";
import { Button, FlowHeader, Icon } from "../ui";
import { useStore } from "../store";
import {
  UserSupportTicket,
  SupportMessage,
  fetchCustomerTickets,
  createSupportTicket,
  fetchTicketMessages,
  sendTicketMessage,
  subscribeToTicket,
} from "../services/support.service";
import { useI18n } from "../i18n";

const TICKET_CATEGORIES = [
  "Order & Kitchen Issues",
  "Payout & Settlement",
  "Menu & Catalog Updates",
  "Delivery Rider Delay",
  "Account & KYC Compliance",
  "App / Technical Support",
];

export function SupportChat({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  const { profile } = useStore();

  const [tickets, setTickets] = useState<UserSupportTicket[]>([]);
  const [activeTicket, setActiveTicket] = useState<UserSupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  // New ticket modal
  const [isCreating, setIsCreating] = useState(false);
  const [category, setCategory] = useState(TICKET_CATEGORIES[0]);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    fetchCustomerTickets(profile.id).then((res) => {
      if (mounted) {
        setTickets(res);
        if (res.length > 0) {
          setActiveTicket(res[0]);
        }
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [profile.id]);

  useEffect(() => {
    if (!activeTicket) {
      setMessages([]);
      return;
    }

    fetchTicketMessages(activeTicket.id).then((msgs) => {
      setMessages(msgs);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });

    const unsub = subscribeToTicket(activeTicket.id, (updated) => {
      setActiveTicket((prev) => (prev ? { ...prev, ...updated } : prev));
    });

    return () => {
      unsub();
    };
  }, [activeTicket?.id]);

  const handleSendMessage = async () => {
    if (!text.trim() || !activeTicket) return;
    const msgText = text.trim();
    setText("");

    const res = await sendTicketMessage({
      ticketId: activeTicket.id,
      senderId: profile.id,
      senderName: profile.name || "Customer",
      senderRole: "user",
      message: msgText,
    });

    if (res.message) {
      setMessages((prev) => [...prev, res.message!]);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  const handleCreateTicket = async () => {
    if (!subject.trim() || !description.trim()) return;
    setSubmitting(true);

    try {
      const res = await createSupportTicket({
        customerId: profile.id,
        customerName: profile.name || "RoadRider Customer",
        customerPhone: profile.phone || "+91 98765 43210",
        category,
        subject,
        description,
      });

      if (res.ticket) {
        setTickets((prev) => [res.ticket!, ...prev]);
        setActiveTicket(res.ticket!);
        setIsCreating(false);
        setSubject("");
        setDescription("");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flow-page themed" style={{ display: "flex", flexDirection: "column", height: "100%", maxHeight: "100%", position: "relative" }}>
      <FlowHeader
        title={activeTicket ? activeTicket.ticketNumber : t("support_title")}
        onBack={onBack}
        noHelp
      />

      {/* Subheader with Ticket Selector & Status */}
      <div
        style={{
          padding: "0.6rem 1rem",
          backgroundColor: "#F9FAFB",
          borderBottom: "1px solid #E5E7EB",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {activeTicket ? (
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                padding: "0.2rem 0.6rem",
                borderRadius: "999px",
                backgroundColor:
                  activeTicket.status === "resolved"
                    ? "#DCFCE7"
                    : activeTicket.status === "in_progress"
                    ? "#DBEAFE"
                    : "#FEF3C7",
                color:
                  activeTicket.status === "resolved"
                    ? "#166534"
                    : activeTicket.status === "in_progress"
                    ? "#1E40AF"
                    : "#92400E",
              }}
            >
              {activeTicket.status.toUpperCase()}
            </span>
          ) : (
            <small style={{ color: "#6B7280" }}>Direct Support Channel</small>
          )}
        </div>

        <button
          onClick={() => setIsCreating(true)}
          style={{
            backgroundColor: "#EA580C",
            color: "#FFF",
            border: "none",
            borderRadius: "8px",
            padding: "0.35rem 0.75rem",
            fontSize: "0.8rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + {t("support_new_ticket")}
        </button>
      </div>

      {/* Messages Thread Container */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        {loading ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#6B7280" }}>
            <p>{t("loading")}</p>
          </div>
        ) : !activeTicket ? (
          <div style={{ textAlign: "center", padding: "3rem 1.5rem", color: "#6B7280" }}>
            <Icon name="shield" size={40} />
            <h3 style={{ margin: "1rem 0 0.5rem", color: "#111827" }}>Need help with an order?</h3>
            <p style={{ margin: 0, fontSize: "0.88rem" }}>
              Our support team is here 24/7. Raise a ticket to chat directly with our team.
            </p>
            <button
              onClick={() => setIsCreating(true)}
              style={{
                marginTop: "1.25rem",
                backgroundColor: "#EA580C",
                color: "#FFF",
                border: "none",
                borderRadius: "10px",
                padding: "0.6rem 1.25rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t("support_new_ticket")}
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "#6B7280" }}>
            <Icon name="list" size={32} />
            <p style={{ margin: "0.75rem 0 0", fontSize: "0.85rem" }}>
              {t("support_empty_chat")}
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isUser = m.senderRole === "user";
            return (
              <div
                key={m.id}
                style={{
                  alignSelf: isUser ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isUser ? "flex-end" : "flex-start",
                }}
              >
                <small style={{ color: "#9CA3AF", fontSize: "0.7rem", marginBottom: "0.2rem" }}>
                  {isUser ? t("support_you") : t("support_admin")}
                </small>
                <div
                  style={{
                    backgroundColor: isUser ? "#EA580C" : "#F3F4F6",
                    color: isUser ? "#FFFFFF" : "#111827",
                    borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    padding: "0.65rem 0.95rem",
                    fontSize: "0.88rem",
                    lineHeight: 1.35,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  }}
                >
                  {m.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Message Input Field */}
      {activeTicket && (
        <div
          style={{
            padding: "0.75rem 1rem calc(0.75rem + var(--safe-bottom, 0px))",
            backgroundColor: "#FFFFFF",
            borderTop: "1px solid #E5E7EB",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder={t("support_chat_placeholder")}
            style={{
              flex: 1,
              padding: "0.65rem 0.9rem",
              borderRadius: "12px",
              border: "1.5px solid #D1D5DB",
              outline: "none",
              fontSize: "0.88rem",
              fontFamily: "inherit",
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!text.trim()}
            style={{
              backgroundColor: text.trim() ? "#EA580C" : "#E5E7EB",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "12px",
              padding: "0.65rem 1.1rem",
              fontSize: "0.88rem",
              fontWeight: 600,
              cursor: text.trim() ? "pointer" : "default",
            }}
          >
            {t("support_send")}
          </button>
        </div>
      )}

      {/* New Ticket Modal */}
      {isCreating && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10001,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            style={{
              backgroundColor: "#FFF",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "440px",
              overflow: "hidden",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                padding: "1rem 1.25rem",
                borderBottom: "1px solid #F3F4F6",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
                {t("support_new_ticket")}
              </h3>
              <button
                onClick={() => setIsCreating(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.9rem" }}>
              {/* Authenticated User Details Pill */}
              <div
                style={{
                  padding: "0.6rem 0.8rem",
                  backgroundColor: "#F9FAFB",
                  borderRadius: "10px",
                  fontSize: "0.78rem",
                  color: "#4B5563",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span><strong>User:</strong> {profile.name || "Customer"}</span>
                <span><strong>Phone:</strong> {profile.phone || "+91 98765 43210"}</span>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem" }}>
                  {t("support_category")}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.6rem",
                    borderRadius: "10px",
                    border: "1px solid #D1D5DB",
                    fontSize: "0.88rem",
                    outline: "none",
                  }}
                >
                  {TICKET_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem" }}>
                  {t("support_subject")}
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Order delivered wrong items"
                  style={{
                    width: "100%",
                    padding: "0.6rem",
                    borderRadius: "10px",
                    border: "1px solid #D1D5DB",
                    fontSize: "0.88rem",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem" }}>
                  {t("support_description")}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain what happened in detail..."
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "0.6rem",
                    borderRadius: "10px",
                    border: "1px solid #D1D5DB",
                    fontSize: "0.88rem",
                    outline: "none",
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                padding: "0.75rem 1.25rem 1.25rem",
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.75rem",
                borderTop: "1px solid #F3F4F6",
              }}
            >
              <button
                onClick={() => setIsCreating(false)}
                style={{
                  padding: "0.6rem 1rem",
                  backgroundColor: "#F3F4F6",
                  color: "#374151",
                  border: "none",
                  borderRadius: "10px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {t("cancel")}
              </button>
              <Button
                onClick={handleCreateTicket}
                loading={submitting}
                disabled={!subject.trim() || !description.trim() || submitting}
              >
                {t("support_create_btn")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { Button, Icon } from "../ui";
import { useNav } from "../nav";
import { cancelCustomerOrder } from "../services/orders.service";
import { useI18n, type TranslationKey } from "../i18n";

interface CancelOrderDialogProps {
  orderId: string;
  orderNumber: string;
  onClose: () => void;
  onCancelled: (reason: string) => void;
}

interface ReasonOption {
  id: string;
  key: TranslationKey;
  defaultText: string;
}

const CANCELLATION_REASONS: ReasonOption[] = [
  { id: "mistake", key: "reason_mistake", defaultText: "Ordered by mistake" },
  { id: "wrong_address", key: "reason_wrong_address", defaultText: "Wrong delivery address selected" },
  { id: "taking_long", key: "reason_taking_long", defaultText: "Restaurant taking too long to confirm" },
  { id: "item_issue", key: "reason_item_issue", defaultText: "Restaurant issue or item unavailable" },
  { id: "payment", key: "reason_payment", defaultText: "Payment issue / Duplicate charge" },
  { id: "other", key: "reason_other", defaultText: "Other reason" },
];

export function CancelOrderDialog({
  orderId,
  orderNumber,
  onClose,
  onCancelled,
}: CancelOrderDialogProps) {
  const { t } = useI18n();
  const nav = useNav();

  const [selectedReason, setSelectedReason] = useState<string>("mistake");
  const [otherText, setOtherText] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleConfirm = async () => {
    if (selectedReason === "other" && !otherText.trim()) {
      setErrorMsg("Please provide an explanation for other reason.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    const reasonObj = CANCELLATION_REASONS.find((r) => r.id === selectedReason);
    const reasonText = reasonObj ? t(reasonObj.key, reasonObj.defaultText) : "Cancelled by user";

    try {
      const res = await cancelCustomerOrder(orderId, reasonText, otherText);
      if (!res.success) {
        setLoading(false);
        setErrorMsg(res.error || t("cannot_cancel"));
        return;
      }

      nav.toast(t("cancel_success"), "info");
      onCancelled(otherText ? `${reasonText}: ${otherText}` : reasonText);
      onClose();
    } catch {
      setLoading(false);
      setErrorMsg("Failed to cancel order. Please try again or contact support.");
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 10000,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        animation: "fadeIn 0.2s ease-out",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-dialog-title"
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          maxHeight: "calc(90dvh - var(--safe-top, 0px) - var(--safe-bottom, 0px))",
          backgroundColor: "#FFFFFF",
          borderRadius: "20px",
          overflowY: "auto",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.25rem 0.75rem",
            borderBottom: "1px solid #F3F4F6",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                backgroundColor: "#FEE2E2",
                color: "#DC2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="alert" size={18} />
            </span>
            <div>
              <h3
                id="cancel-dialog-title"
                style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#111827" }}
              >
                {t("cancel_dialog_title")}
              </h3>
              <small style={{ color: "#6B7280" }}>{orderNumber}</small>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: "#9CA3AF",
              cursor: "pointer",
              padding: "0.25rem",
            }}
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <p style={{ margin: 0, fontSize: "0.88rem", color: "#4B5563", lineHeight: 1.4 }}>
            {t("cancel_dialog_sub")}
          </p>

          {/* Radio Reasons List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {CANCELLATION_REASONS.map((r) => {
              const isSelected = selectedReason === r.id;
              return (
                <label
                  key={r.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.65rem 0.85rem",
                    borderRadius: "12px",
                    border: isSelected ? "1.5px solid #DC2626" : "1px solid #E5E7EB",
                    backgroundColor: isSelected ? "#FEF2F2" : "#FFFFFF",
                    cursor: "pointer",
                    fontSize: "0.88rem",
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? "#991B1B" : "#1F2937",
                    transition: "all 0.15s ease",
                  }}
                >
                  <input
                    type="radio"
                    name="cancellation_reason"
                    value={r.id}
                    checked={isSelected}
                    onChange={() => setSelectedReason(r.id)}
                    style={{ accentColor: "#DC2626" }}
                  />
                  <span>{t(r.key, r.defaultText)}</span>
                </label>
              );
            })}
          </div>

          {/* Explanation if Other */}
          {selectedReason === "other" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              <textarea
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                placeholder={t("explain_placeholder")}
                rows={3}
                style={{
                  width: "100%",
                  padding: "0.6rem 0.75rem",
                  border: "1px solid #D1D5DB",
                  borderRadius: "10px",
                  fontSize: "0.85rem",
                  fontFamily: "inherit",
                  outline: "none",
                  resize: "vertical",
                }}
              />
            </div>
          )}

          {/* Refund Notice */}
          <div
            style={{
              padding: "0.6rem 0.8rem",
              backgroundColor: "#F9FAFB",
              border: "1px solid #F3F4F6",
              borderRadius: "10px",
              fontSize: "0.78rem",
              color: "#6B7280",
              lineHeight: 1.35,
            }}
          >
            {t("cancel_refund_note")}
          </div>

          {errorMsg && (
            <div
              style={{
                color: "#DC2626",
                fontSize: "0.82rem",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <Icon name="alert" size={14} />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "0.75rem 1.25rem 1.25rem",
            display: "flex",
            gap: "0.75rem",
            justifyContent: "flex-end",
            borderTop: "1px solid #F3F4F6",
          }}
        >
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: "0.65rem 1.1rem",
              backgroundColor: "#F3F4F6",
              color: "#374151",
              border: "none",
              borderRadius: "10px",
              fontWeight: 600,
              fontSize: "0.88rem",
              cursor: "pointer",
            }}
          >
            {t("keep_order")}
          </button>

          <Button
            tone="danger"
            onClick={handleConfirm}
            loading={loading}
            disabled={loading}
          >
            {loading ? t("cancelling") : t("confirm_cancel")}
          </Button>
        </div>
      </div>
    </div>
  );
}

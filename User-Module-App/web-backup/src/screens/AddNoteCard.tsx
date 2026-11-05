import { useState } from "react";
import { Icon } from "../ui";
import { useStore } from "../store";
import { useI18n } from "../i18n";

export function AddNoteCard() {
  const { t } = useI18n();
  const { customerNote, setCustomerNote } = useStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(customerNote);

  const quickPills = [
    { label: t("note_less_spicy", "Less spicy") },
    { label: t("note_no_onion", "No onion / garlic") },
    { label: t("note_call_before", "Call before delivery") },
    { label: t("note_leave_door", "Leave at door") },
  ];

  const handleSave = () => {
    setCustomerNote(draft.trim());
    setEditing(false);
  };

  const handleAppendPill = (pillText: string) => {
    const current = draft.trim();
    if (current.includes(pillText)) return;
    const updated = current ? `${current}, ${pillText}` : pillText;
    setDraft(updated);
    setCustomerNote(updated);
  };

  const handleRemove = () => {
    setDraft("");
    setCustomerNote("");
    setEditing(false);
  };

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E7EB",
        borderRadius: "16px",
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ color: "#EA580C" }}>
            <Icon name="list" size={18} />
          </span>
          <strong style={{ fontSize: "0.92rem", color: "#111827" }}>
            {t("add_note_label")}
          </strong>
        </div>

        {customerNote && !editing && (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => {
                setDraft(customerNote);
                setEditing(true);
              }}
              style={{
                background: "none",
                border: "none",
                color: "#EA580C",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t("edit")}
            </button>
            <button
              onClick={handleRemove}
              style={{
                background: "none",
                border: "none",
                color: "#9CA3AF",
                fontSize: "0.82rem",
                cursor: "pointer",
              }}
            >
              {t("delete")}
            </button>
          </div>
        )}
      </div>

      {/* Saved Note View */}
      {customerNote && !editing ? (
        <div
          style={{
            backgroundColor: "#FFF7ED",
            border: "1px solid #FED7AA",
            borderRadius: "10px",
            padding: "0.6rem 0.8rem",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.5rem",
          }}
        >
          <span style={{ color: "#EA580C", marginTop: "0.1rem" }}>
            <Icon name="check" size={15} />
          </span>
          <p
            style={{
              margin: 0,
              fontSize: "0.85rem",
              color: "#9A3412",
              lineHeight: 1.35,
              fontWeight: 500,
            }}
          >
            "{customerNote}"
          </p>
        </div>
      ) : (
        /* Edit or Input Mode */
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("add_note_placeholder")}
            rows={2}
            style={{
              width: "100%",
              padding: "0.6rem 0.75rem",
              border: "1.5px solid #D1D5DB",
              borderRadius: "10px",
              fontSize: "0.85rem",
              fontFamily: "inherit",
              outline: "none",
              resize: "none",
            }}
          />

          {/* Quick Suggestion Pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {quickPills.map((p) => {
              const active = draft.includes(p.label);
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleAppendPill(p.label)}
                  style={{
                    backgroundColor: active ? "#FFEDD5" : "#F3F4F6",
                    color: active ? "#9A3412" : "#4B5563",
                    border: active ? "1px solid #FDBA74" : "1px solid transparent",
                    borderRadius: "999px",
                    padding: "0.25rem 0.65rem",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  + {p.label}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            {editing && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                style={{
                  padding: "0.35rem 0.75rem",
                  backgroundColor: "#F3F4F6",
                  color: "#4B5563",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                {t("cancel")}
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={!draft.trim()}
              style={{
                padding: "0.35rem 0.85rem",
                backgroundColor: draft.trim() ? "#EA580C" : "#D1D5DB",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "8px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: draft.trim() ? "pointer" : "default",
              }}
            >
              {t("save")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

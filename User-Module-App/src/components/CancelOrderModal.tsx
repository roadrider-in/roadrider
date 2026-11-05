import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Icon from "./Icon";
import { colors, radii } from "../theme/tokens";
import { useI18n } from "../lib/i18n";
import { supabase } from "../lib/supabase";
import { useApp } from "../state/AppState";

interface CancelOrderModalProps {
  visible: boolean;
  orderId: string;
  dbId?: string;
  onClose: () => void;
  onCancelled: (reason: string) => void;
}

export default function CancelOrderModal({
  visible,
  orderId,
  dbId,
  onClose,
  onCancelled,
}: CancelOrderModalProps) {
  const { t } = useI18n();
  const { cancelOrder } = useApp();

  const reasons = [
    { id: "mistake", label: t("reason_mistake", "Ordered by mistake") },
    { id: "wrong_address", label: t("reason_wrong_address", "Wrong delivery address selected") },
    { id: "taking_long", label: t("reason_taking_long", "Restaurant taking too long to confirm") },
    { id: "item_issue", label: t("reason_item_issue", "Restaurant issue or item unavailable") },
    { id: "payment", label: t("reason_payment", "Payment issue / Duplicate charge") },
    { id: "other", label: t("reason_other", "Other reason") },
  ];

  const [selectedReason, setSelectedReason] = useState(reasons[0].label);
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setLoading(true);
    setError("");

    const fullReason = details.trim()
      ? `${selectedReason}: ${details.trim()}`
      : selectedReason;

    try {
      await cancelOrder(dbId || orderId, fullReason);
      onCancelled(fullReason);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to cancel order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={styles.container}
            >
              <View style={styles.card}>
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.iconCircle}>
                    <Icon name="close" size={20} color="#dc2626" />
                  </View>
                  <View style={styles.headerTexts}>
                    <Text style={styles.title}>
                      {t("cancel_dialog_title", "Cancel this order?")}
                    </Text>
                    <Text style={styles.subtitle}>
                      {t(
                        "cancel_dialog_sub",
                        "Please tell us why you would like to cancel your order."
                      )}
                    </Text>
                  </View>
                </View>

                {/* Reason Selection */}
                <View style={styles.reasonsList}>
                  {reasons.map((r) => {
                    const isSelected = selectedReason === r.label;
                    return (
                      <TouchableOpacity
                        key={r.id}
                        style={[
                          styles.reasonItem,
                          isSelected && styles.reasonItemSelected,
                        ]}
                        activeOpacity={0.7}
                        onPress={() => setSelectedReason(r.label)}
                      >
                        <View
                          style={[
                            styles.radioCircle,
                            isSelected && styles.radioCircleSelected,
                          ]}
                        >
                          {isSelected && <View style={styles.radioInner} />}
                        </View>
                        <Text
                          style={[
                            styles.reasonText,
                            isSelected && styles.reasonTextSelected,
                          ]}
                        >
                          {r.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Optional description input */}
                <TextInput
                  style={styles.input}
                  placeholder={t(
                    "explain_placeholder",
                    "Please explain your reason in detail..."
                  )}
                  placeholderTextColor={colors.muted}
                  value={details}
                  onChangeText={setDetails}
                  multiline
                  numberOfLines={2}
                />

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                {/* Notice */}
                <Text style={styles.noticeText}>
                  {t(
                    "cancel_refund_note",
                    "Any online payment will be refunded within 5–7 working days."
                  )}
                </Text>

                {/* Action Buttons */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.keepBtn}
                    onPress={onClose}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.keepBtnText}>
                      {t("keep_order", "Keep Order")}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.confirmBtn, loading && styles.btnDisabled]}
                    onPress={handleConfirm}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.confirmBtnText}>
                        {t("confirm_cancel", "Confirm Cancellation")}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    maxWidth: 420,
  },
  card: {
    backgroundColor: colors.brand.creamBg,
    borderRadius: radii.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTexts: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.brand.charcoal,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
    lineHeight: 16,
  },
  reasonsList: {
    gap: 8,
    marginBottom: 14,
  },
  reasonItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  reasonItemSelected: {
    borderColor: colors.accent,
    backgroundColor: "#fff7ed",
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.muted,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  radioCircleSelected: {
    borderColor: colors.accent,
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.accent,
  },
  reasonText: {
    fontSize: 13,
    color: colors.brand.charcoal,
    fontWeight: "500",
    flex: 1,
  },
  reasonTextSelected: {
    color: colors.accent,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 10,
    fontSize: 13,
    color: colors.brand.charcoal,
    textAlignVertical: "top",
    minHeight: 56,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 12,
    color: "#dc2626",
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 11,
    color: colors.muted,
    fontStyle: "italic",
    marginBottom: 16,
    textAlign: "center",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  keepBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  keepBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.brand.charcoal,
  },
  confirmBtn: {
    flex: 1.3,
    paddingVertical: 12,
    borderRadius: radii.lg,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

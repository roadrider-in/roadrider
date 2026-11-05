import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "./Icon";

interface CourierCancelModalProps {
  visible: boolean;
  orderId: string;
  onClose: () => void;
  onConfirmCancel: (reason: string) => Promise<void>;
}

const CANCEL_REASONS = [
  "Driver asked me to cancel",
  "Incorrect pickup or drop address entered",
  "Delivery taking longer than expected",
  "Found an alternative / sent by myself",
  "Price is higher than expected",
  "Changed my mind",
];

export default function CourierCancelModal({
  visible,
  orderId,
  onClose,
  onConfirmCancel,
}: CourierCancelModalProps) {
  const insets = useSafeAreaInsets();
  const [selectedReason, setSelectedReason] = useState(CANCEL_REASONS[0]);
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    try {
      setLoading(true);
      await onConfirmCancel(selectedReason);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Drag handle */}
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Cancel Parcel Booking?</Text>
            <Text style={styles.subtitle}>
              Please select a reason for cancelling this parcel order
            </Text>
          </View>

          {/* Reasons List */}
          <View style={styles.reasonsList}>
            {CANCEL_REASONS.map((reason, idx) => {
              const isSelected = selectedReason === reason;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.reasonRow,
                    isSelected && styles.reasonRowSelected,
                  ]}
                  onPress={() => setSelectedReason(reason)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.radioCircle,
                      isSelected && styles.radioCircleSelected,
                    ]}
                  >
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                  <Text
                    style={[
                      styles.reasonText,
                      isSelected && styles.reasonTextSelected,
                    ]}
                  >
                    {reason}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Action buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.keepBtn}
              onPress={onClose}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.keepBtnText}>Keep Parcel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleCancel}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.cancelBtnText}>Cancel Parcel</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handleWrap: {
    alignItems: "center",
    paddingVertical: 8,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
  },
  header: {
    marginTop: 4,
    marginBottom: 16,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: "#151B2B",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    color: "#68758A",
    marginTop: 3,
  },
  reasonsList: {
    gap: 10,
    marginBottom: 20,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  reasonRowSelected: {
    backgroundColor: "#FFF5EB",
    borderColor: "#E87518",
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#94A3B8",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    borderColor: "#E87518",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E87518",
  },
  reasonText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#334155",
    flex: 1,
  },
  reasonTextSelected: {
    color: "#151B2B",
    fontWeight: "700",
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
  },
  keepBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  keepBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#EF4444",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});

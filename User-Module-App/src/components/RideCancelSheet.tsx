import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  Alert,
} from "react-native";
import Icon from "./Icon";
import { supabase } from "../lib/supabase";
import { useApp } from "../state/AppState";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface RideCancelSheetProps {
  visible: boolean;
  onClose: () => void;
  orderId: string;
  captainName?: string;
  captainRating?: number;
  onCancelled: (reason: string) => void;
}

const CANCELLATION_REASONS = [
  "Taking longer than expected",
  "Found a better price elsewhere",
  "Change of plans",
  "Captain not moving towards pickup",
  "Others",
];

export default function RideCancelSheet({
  visible,
  onClose,
  orderId,
  captainName,
  captainRating = 4.9,
  onCancelled,
}: RideCancelSheetProps) {
  const { cancelOrder } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  const handleSelectReason = async (reason: string) => {
    setSelectedReason(reason);
    setIsSubmitting(true);

    try {
      if (orderId) {
        await cancelOrder(orderId, reason);
      }
    } catch (e) {
      console.warn("[RideCancelSheet] Notice submitting cancellation:", e);
    } finally {
      setIsSubmitting(false);
      onCancelled(reason);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.backdropPressable}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheetContainer}>
          {/* Top Header Row with Back Button */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={onClose}
              hitSlop={8}
              accessibilityLabel="Back"
            >
              <Icon name="back" size={20} color="#172033" />
            </TouchableOpacity>
          </View>

          {/* Captain Reassurance Card (matching Reference Screenshot 2) */}
          <View style={styles.captainCard}>
            <View style={styles.captainAvatarWrap}>
              <Icon name="user" size={20} color="#1769E8" />
              <View style={styles.avatarStarBadge}>
                <Icon name="star" size={9} color="#FFFFFF" filled />
              </View>
            </View>
            <View style={styles.captainTextCol}>
              <Text style={styles.captainNoticeText}>
                <Text style={styles.captainNameBold}>
                  {captainName || "Your Captain"}
                </Text>{" "}
                is a high rated captain ({captainRating}★). He has completed 90% rides on time.
              </Text>
              <Text style={styles.captainSubNotice}>
                Let's not cancel if its not urgent
              </Text>
            </View>
          </View>

          {/* Heading */}
          <Text style={styles.headingTitle}>Why do you want to cancel?</Text>
          <Text style={styles.headingSubtitle}>
            Please provide the reason for cancellation
          </Text>

          <View style={styles.dottedDivider} />

          {/* Reasons List */}
          <View style={styles.reasonsList}>
            {CANCELLATION_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={styles.reasonRow}
                activeOpacity={0.7}
                disabled={isSubmitting}
                onPress={() => handleSelectReason(reason)}
              >
                <Text style={styles.reasonText}>{reason}</Text>
                {isSubmitting && selectedReason === reason ? (
                  <ActivityIndicator size="small" color="#1769E8" />
                ) : (
                  <Icon name="chevron-right" size={16} color="#68758A" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  backdropPressable: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 40 : 28,
    paddingHorizontal: 22,
    maxHeight: SCREEN_HEIGHT * 0.85,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 12,
    elevation: 8,
  },
  headerRow: {
    marginBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  captainCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 20,
    gap: 12,
  },
  captainAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EAF3FF",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderWidth: 1,
    borderColor: "#DCE8F8",
  },
  avatarStarBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  captainTextCol: {
    flex: 1,
  },
  captainNoticeText: {
    fontSize: 13,
    color: "#172033",
    lineHeight: 18,
  },
  captainNameBold: {
    fontWeight: "700",
  },
  captainSubNotice: {
    fontSize: 11.5,
    color: "#6D28D9",
    fontWeight: "600",
    marginTop: 4,
  },
  headingTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#172033",
    letterSpacing: -0.3,
  },
  headingSubtitle: {
    fontSize: 13,
    color: "#68758A",
    marginTop: 4,
    marginBottom: 14,
  },
  dottedDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginBottom: 8,
  },
  reasonsList: {
    gap: 4,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F1F5F9",
  },
  reasonText: {
    fontSize: 14,
    color: "#172033",
    fontWeight: "500",
  },
});

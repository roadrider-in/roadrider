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
  ScrollView,
} from "react-native";
import Icon from "./Icon";
import { colors, radii } from "../theme/tokens";
import { useI18n } from "../lib/i18n";
import { supabase } from "../lib/supabase";

interface ReviewModalProps {
  visible: boolean;
  orderId: string;
  dbId?: string;
  partnerId?: string;
  storeName?: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

const REVIEW_TAGS = [
  "Food quality",
  "Great packaging",
  "Super fast delivery",
  "Polite rider",
  "Fresh & hot",
  "Accurate order",
];

export default function ReviewModal({
  visible,
  orderId,
  dbId,
  partnerId,
  storeName = "Restaurant",
  onClose,
  onSubmitted,
}: ReviewModalProps) {
  const { t } = useI18n();

  const [storeRating, setStoreRating] = useState(5);
  const [riderRating, setRiderRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    const targetId = dbId || (orderId.startsWith("RR-") ? null : orderId);

    try {
      if (supabase && targetId) {
        // Attempt to insert into reviews or order_reviews
        const { error } = await supabase.from("order_reviews").insert({
          order_id: targetId,
          store_rating: storeRating,
          rider_rating: riderRating,
          tags: selectedTags,
          comment: comment.trim(),
          partner_id: partnerId || null,
          created_at: new Date().toISOString(),
        });
        if (error) {
          console.warn("[ReviewModal] Insert error:", error.message);
        }
      }

      setSubmitted(true);
      onSubmitted?.();
      setTimeout(() => {
        onClose();
        setSubmitted(false);
      }, 1500);
    } catch (e) {
      console.warn("[ReviewModal] Error submitting review:", e);
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setSubmitted(false);
      }, 1500);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (current: number, onSelect: (r: number) => void) => (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => onSelect(star)}
          activeOpacity={0.7}
          style={styles.starTouch}
        >
          <Text style={[styles.starChar, star <= current ? styles.starFilled : styles.starEmpty]}>
            ★
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
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
                <ScrollView
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                >
                  {/* Close button */}
                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={onClose}
                    hitSlop={10}
                  >
                    <Icon name="close" size={18} color={colors.brand.charcoal} />
                  </TouchableOpacity>

                  {submitted ? (
                    <View style={styles.successBox}>
                      <View style={styles.successIcon}>
                        <Icon name="check" size={28} color="#ffffff" />
                      </View>
                      <Text style={styles.successTitle}>
                        {t("review_submitted_msg", "Thank you! Your feedback helps us improve.")}
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.mainTitle}>
                        {t("rate_experience", "How was your experience?")}
                      </Text>
                      <Text style={styles.orderLabel}>Order #{orderId.slice(-6).toUpperCase()}</Text>

                      {/* Restaurant Rating */}
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                          {t("rate_restaurant", "Rate the Food & Restaurant")} ({storeName})
                        </Text>
                        {renderStars(storeRating, setStoreRating)}
                      </View>

                      {/* Delivery Partner Rating */}
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                          {t("rate_rider", "Rate the Delivery Partner")}
                        </Text>
                        {renderStars(riderRating, setRiderRating)}
                      </View>

                      {/* Feedback Tag Chips */}
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                          {t("review_tags_title", "What went well?")}
                        </Text>
                        <View style={styles.tagsContainer}>
                          {REVIEW_TAGS.map((tag) => {
                            const isSelected = selectedTags.includes(tag);
                            return (
                              <TouchableOpacity
                                key={tag}
                                style={[
                                  styles.tagChip,
                                  isSelected && styles.tagChipSelected,
                                ]}
                                onPress={() => toggleTag(tag)}
                                activeOpacity={0.7}
                              >
                                <Text
                                  style={[
                                    styles.tagText,
                                    isSelected && styles.tagTextSelected,
                                  ]}
                                >
                                  {tag}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>

                      {/* Comment Input */}
                      <TextInput
                        style={styles.commentInput}
                        placeholder={t(
                          "review_comment_placeholder",
                          "Write your honest feedback here..."
                        )}
                        placeholderTextColor={colors.muted}
                        value={comment}
                        onChangeText={setComment}
                        multiline
                        numberOfLines={3}
                      />

                      {/* Submit Button */}
                      <TouchableOpacity
                        style={[styles.submitBtn, loading && styles.btnDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                        activeOpacity={0.7}
                      >
                        {loading ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Text style={styles.submitBtnText}>
                            {t("submit_review", "Submit Review")}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </>
                  )}
                </ScrollView>
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
    justifyContent: "flex-end",
  },
  container: {
    width: "100%",
  },
  card: {
    backgroundColor: colors.brand.creamBg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    maxHeight: "85%",
  },
  scrollContent: {
    paddingBottom: 10,
  },
  closeBtn: {
    alignSelf: "flex-end",
    padding: 6,
    backgroundColor: "#ffffff",
    borderRadius: 16,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.brand.charcoal,
    textAlign: "center",
    marginTop: 4,
  },
  orderLabel: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
    marginTop: 2,
    marginBottom: 16,
    fontWeight: "600",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.brand.charcoal,
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: "row",
    gap: 8,
  },
  starTouch: {
    padding: 4,
  },
  starChar: {
    fontSize: 30,
    lineHeight: 32,
  },
  starFilled: {
    color: "#f59e0b",
  },
  starEmpty: {
    color: "#d1d5db",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagChip: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  tagChipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  tagText: {
    fontSize: 12,
    color: colors.brand.charcoal,
    fontWeight: "500",
  },
  tagTextSelected: {
    color: "#ffffff",
    fontWeight: "700",
  },
  commentInput: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 12,
    fontSize: 13,
    color: colors.brand.charcoal,
    textAlignVertical: "top",
    minHeight: 70,
    marginBottom: 16,
  },
  submitBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  successBox: {
    alignItems: "center",
    paddingVertical: 30,
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#16a34a",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.brand.charcoal,
    textAlign: "center",
    paddingHorizontal: 20,
  },
});

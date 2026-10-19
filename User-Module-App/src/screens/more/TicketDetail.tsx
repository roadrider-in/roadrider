import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FlowHeader from "../../components/FlowHeader";
import Icon from "../../components/Icon";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { colors, radii } from "../../theme/tokens";
import {
  fetchTicketById,
  addMessageToTicket,
  subscribeToTicket,
  SupportTicket,
  SupportMessage,
  CATEGORY_LABELS,
  TicketStatus,
} from "../../lib/supportService";

interface TicketDetailProps {
  ticketId: string;
}

export default function TicketDetail({ ticketId }: TicketDetailProps) {
  const { back, push } = useNav();
  const { state, showToast } = useApp();

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const loadTicket = useCallback(async () => {
    if (!ticketId) return;
    try {
      const data = await fetchTicketById(ticketId);
      if (data) {
        setTicket(data);
      }
    } catch (err) {
      console.warn("[TicketDetail] Error loading ticket:", err);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadTicket();

    // Subscribe to Realtime postgres_changes on this ticket
    const unsubscribe = subscribeToTicket(ticketId, (updated) => {
      setTicket((prev) => {
        if (!prev) return updated;
        return {
          ...updated,
          // Preserve messages if updated has latest
          messages:
            updated.messages.length >= prev.messages.length
              ? updated.messages
              : prev.messages,
        };
      });
      // Scroll to bottom when new message arrives
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 150);
    });

    return () => {
      unsubscribe();
    };
  }, [ticketId, loadTicket]);

  useEffect(() => {
    if (ticket?.messages?.length) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: false });
      }, 200);
    }
  }, [ticket?.id]);

  const handleSendReply = async () => {
    const text = replyText.trim();
    if (!text || !ticket || isSending) return;

    setIsSending(true);

    try {
      const senderName = state.profile.name || "Customer";
      const res = await addMessageToTicket(ticket.id, {
        text,
        sender: "user",
        senderName,
      });

      if (!res.ok || !res.ticket) {
        Alert.alert(
          "Message Not Sent",
          res.error || "Failed to deliver your reply. Please check your network."
        );
        setIsSending(false);
        // Notice: typed replyText is preserved on failure per Safety Rule #7
        return;
      }

      // Optimistically update local view
      setTicket(res.ticket);
      setReplyText("");
      setIsSending(false);

      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err: any) {
      Alert.alert(
        "Network Error",
        err?.message || "Failed to deliver message. Please retry."
      );
      setIsSending(false);
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case "open":
        return { bg: "#fff3e0", text: "#e65100", label: "Open" };
      case "in_progress":
        return { bg: "#e3f2fd", text: "#1565c0", label: "In Progress" };
      case "resolved":
        return { bg: "#e8f5e9", text: "#2e7d32", label: "Resolved" };
      case "closed":
        return { bg: "#f5f5f5", text: "#616161", label: "Closed" };
      default:
        return { bg: colors.line, text: colors.muted, label: status };
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar barStyle="dark-content" />
        <FlowHeader title="Support Ticket" onBack={back} showHelp={false} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Fetching ticket details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!ticket) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar barStyle="dark-content" />
        <FlowHeader title="Support Ticket" onBack={back} showHelp={false} />
        <View style={styles.centerContainer}>
          <Text style={styles.notFoundTitle}>Ticket Not Found</Text>
          <Text style={styles.notFoundSub}>
            The requested support ticket could not be loaded or was removed.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => back()}
          >
            <Text style={styles.backButtonText}>Return to Support</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const badge = getStatusBadge(ticket.status);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />
      <FlowHeader
        title={ticket.ticketNumber}
        onBack={back}
        showHelp={false}
      />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Ticket Metadata Bar */}
        <View style={styles.metaBanner}>
          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaCategory}>
                {CATEGORY_LABELS[ticket.category] || ticket.category}
              </Text>
              <Text style={styles.metaSubject} numberOfLines={1}>
                {ticket.subject}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                {badge.label}
              </Text>
            </View>
          </View>

          <View style={styles.metaDetailsRow}>
            {ticket.orderId && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() =>
                  push({ name: "orderDetail", orderId: ticket.orderId! })
                }
                style={styles.orderLinkBadge}
              >
                <Icon name="box" size={12} color={colors.accent} />
                <Text style={styles.orderLinkText}>
                  Order #{ticket.orderId.slice(0, 8).toUpperCase()}
                </Text>
              </TouchableOpacity>
            )}

            <Text style={styles.metaDate}>
              Created {new Date(ticket.createdAt).toLocaleDateString()}
            </Text>

            {ticket.assignedTo && (
              <Text style={styles.assignedText}>Assigned to Admin</Text>
            )}
          </View>
        </View>

        {/* Resolved Alert Banner */}
        {ticket.status === "resolved" && (
          <View style={styles.resolvedBanner}>
            <Icon name="check" size={16} color="#2e7d32" />
            <Text style={styles.resolvedBannerText}>
              This ticket has been marked resolved. Send a reply below if you
              need further assistance.
            </Text>
          </View>
        )}

        {/* Message Thread */}
        <ScrollView
          ref={scrollRef}
          style={styles.messagesScroll}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {ticket.messages.length === 0 ? (
            <View style={styles.emptyMessages}>
              <Text style={styles.emptyMessagesText}>
                No messages recorded in this conversation yet.
              </Text>
            </View>
          ) : (
            ticket.messages.map((m: SupportMessage, idx: number) => {
              const isUser = m.sender === "user";
              const timeFormatted = new Date(m.createdAt).toLocaleTimeString(
                [],
                { hour: "2-digit", minute: "2-digit" }
              );

              return (
                <View
                  key={m.id || `msg-${idx}`}
                  style={[
                    styles.messageRow,
                    isUser ? styles.userRow : styles.adminRow,
                  ]}
                >
                  {!isUser && (
                    <View style={styles.agentAvatar}>
                      <Text style={styles.agentAvatarText}>RR</Text>
                    </View>
                  )}

                  <View
                    style={[
                      styles.messageBubble,
                      isUser ? styles.userBubble : styles.adminBubble,
                    ]}
                  >
                    <Text
                      style={[
                        styles.senderName,
                        isUser ? styles.userSender : styles.adminSender,
                      ]}
                    >
                      {isUser ? "You" : m.senderName || "RoadRider Support"}
                    </Text>
                    <Text
                      style={[
                        styles.messageText,
                        isUser ? styles.userText : styles.adminText,
                      ]}
                    >
                      {m.text}
                    </Text>
                    <Text
                      style={[
                        styles.messageTime,
                        isUser ? styles.userTime : styles.adminTime,
                      ]}
                    >
                      {timeFormatted}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Reply Composer */}
        <View style={styles.composerBar}>
          <TextInput
            placeholder="Type your message to support..."
            placeholderTextColor={colors.muted}
            value={replyText}
            onChangeText={setReplyText}
            multiline
            style={styles.composerInput}
            editable={!isSending}
          />
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSendReply}
            disabled={!replyText.trim() || isSending}
            style={[
              styles.sendButton,
              (!replyText.trim() || isSending) && { opacity: 0.5 },
            ]}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Icon name="arrow" size={18} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  keyboardContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: colors.muted,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 8,
  },
  notFoundSub: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
  metaBanner: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  metaCol: {
    flex: 1,
    marginRight: 12,
  },
  metaCategory: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.accent,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  metaSubject: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  metaDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  orderLinkBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  orderLinkText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent,
  },
  metaDate: {
    fontSize: 11,
    color: colors.muted,
  },
  assignedText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2e7d32",
  },
  resolvedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#c8e6c9",
  },
  resolvedBannerText: {
    fontSize: 11,
    color: "#1b5e20",
    flex: 1,
    lineHeight: 16,
  },
  messagesScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingVertical: 16,
    gap: 12,
  },
  emptyMessages: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyMessagesText: {
    fontSize: 13,
    color: colors.muted,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  userRow: {
    justifyContent: "flex-end",
  },
  adminRow: {
    justifyContent: "flex-start",
  },
  agentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  agentAvatarText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.accent,
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  userBubble: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: 4,
  },
  adminBubble: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.line,
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 4,
  },
  userSender: {
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "right",
  },
  adminSender: {
    color: colors.muted,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  userText: {
    color: "#ffffff",
  },
  adminText: {
    color: colors.ink,
  },
  messageTime: {
    fontSize: 9,
    marginTop: 4,
  },
  userTime: {
    color: "rgba(255, 255, 255, 0.65)",
    textAlign: "right",
  },
  adminTime: {
    color: colors.muted,
    textAlign: "left",
  },
  composerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: 10,
  },
  composerInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.ink,
    backgroundColor: colors.canvas,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
});

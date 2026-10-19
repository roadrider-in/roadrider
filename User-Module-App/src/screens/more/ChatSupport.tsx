import React, { useState, useRef, useEffect } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FlowHeader from "../../components/FlowHeader";
import Icon from "../../components/Icon";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { colors, radii } from "../../theme/tokens";
import {
  sendAiChatMessage,
  createSupportTicket,
} from "../../lib/supportService";

interface ChatSupportProps {
  orderId?: string;
}

interface ChatMessage {
  id: string;
  sender: "agent" | "user";
  text: string;
  time: string;
  isError?: boolean;
}

export default function ChatSupport({ orderId }: ChatSupportProps) {
  const { back, push } = useNav();
  const { state, showToast } = useApp();

  const relatedOrder = orderId
    ? state.orders.find((o) => String(o.id) === String(orderId))
    : state.orders[0];

  const [conversationId, setConversationId] = useState<string>(() =>
    `conv-${Date.now()}`
  );
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m1",
      sender: "agent",
      text: `Hello ${
        state.profile.name || "there"
      }! I am RoadRider's automated support assistant. How can I help you today?`,
      time: "Just now",
    },
    ...(relatedOrder
      ? [
          {
            id: "m2",
            sender: "agent" as const,
            text: `I see your order #${String(relatedOrder.id).slice(
              0,
              8
            ).toUpperCase()} (${relatedOrder.title || "RoadRider Delivery"}). What would you like assistance with?`,
            time: "Just now",
          },
        ]
      : []),
  ]);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [aiUnavailableReason, setAiUnavailableReason] = useState<string | null>(
    null
  );
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, isTyping]);

  const quickPrompts = [
    "Where is my driver right now?",
    "I received incorrect items",
    "How do refunds work?",
    "I want to speak with a human agent",
  ];

  const handleEscalateToTicket = (customText?: string) => {
    const prefill =
      customText ||
      input ||
      messages
        .filter((m) => m.sender === "user")
        .map((m) => m.text)
        .join("\n") ||
      "Support request escalated from live chat.";

    push({
      name: "reportIssue",
      orderId: relatedOrder?.id ? String(relatedOrder.id) : undefined,
      prefillMessage: prefill,
    });
  };

  const sendMessage = async (text: string) => {
    const cleanText = text.trim();
    if (!cleanText || isTyping) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: cleanText,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const orderContext = relatedOrder
        ? {
            orderId: String(relatedOrder.id),
            orderNumber: String(relatedOrder.id).slice(0, 8),
            storeName: relatedOrder.title,
            total: relatedOrder.bill?.toPay ?? (relatedOrder as any).total ?? 0,
            status: String(relatedOrder.status),
          }
        : undefined;

      const customerProfile = {
        name: state.profile.name,
        phone: state.profile.phone,
        customerId: state.profile.id,
      };

      const result = await sendAiChatMessage({
        message: cleanText,
        conversationId,
        orderContext,
        customerProfile,
      });

      if (result.success && result.reply) {
        if (result.conversationId) {
          setConversationId(result.conversationId);
        }
        setAiUnavailableReason(null);
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            sender: "agent",
            text: result.reply!,
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
      } else {
        // AI Provider is not configured or returned error
        // As mandated by rule #1 & #3: Never fake an AI reply!
        const reason =
          result.error ||
          "AI Support is waiting for backend AI provider setup (GEMINI_API_KEY).";
        setAiUnavailableReason(reason);

        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: "agent",
            text: `Support Notification: ${reason}\n\nPlease tap 'Escalate to Ticket' below to create a direct support ticket for human resolution.`,
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            isError: true,
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "agent",
          text: "Unable to reach the support service at this time. Please check your connection or create a support ticket directly.",
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          isError: true,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />
      <FlowHeader title="Chat Support" onBack={back} showHelp={false} />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Support Header Banner */}
        <View style={styles.agentBanner}>
          <View style={styles.agentAvatar}>
            <Text style={styles.agentAvatarText}>RR</Text>
          </View>
          <View style={styles.agentInfo}>
            <Text style={styles.agentName}>RoadRider Assistant</Text>
            <Text style={styles.agentStatus}>● Server-backed Support</Text>
          </View>
          {relatedOrder && (
            <View style={styles.orderBadge}>
              <Text style={styles.orderBadgeText}>
                #{String(relatedOrder.id).slice(0, 8).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Escalation Bar if AI key is missing or user wants human ticket */}
        <View style={styles.escalationBar}>
          <Text style={styles.escalationBarText}>Need human assistance?</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleEscalateToTicket()}
            style={styles.escalateBtn}
          >
            <Text style={styles.escalateBtnText}>+ File Support Ticket</Text>
          </TouchableOpacity>
        </View>

        {/* Message Thread */}
        <ScrollView
          ref={scrollRef}
          style={styles.messagesScroll}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((m) => {
            const isUser = m.sender === "user";
            return (
              <View
                key={m.id}
                style={[
                  styles.messageBubble,
                  isUser
                    ? styles.userBubble
                    : m.isError
                    ? styles.errorBubble
                    : styles.agentBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    isUser
                      ? styles.userText
                      : m.isError
                      ? styles.errorText
                      : styles.agentText,
                  ]}
                >
                  {m.text}
                </Text>
                <Text
                  style={[
                    styles.messageTime,
                    isUser ? styles.userTime : styles.agentTime,
                  ]}
                >
                  {m.time}
                </Text>

                {m.isError && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleEscalateToTicket()}
                    style={styles.errorActionBtn}
                  >
                    <Text style={styles.errorActionText}>
                      Create Support Ticket Now →
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          {isTyping && (
            <View style={styles.typingIndicator}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.typingText}>
                Connecting to RoadRider support backend...
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Quick Prompts */}
        <View style={styles.promptsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.promptsContent}
          >
            {quickPrompts.map((prompt) => (
              <TouchableOpacity
                key={prompt}
                activeOpacity={0.8}
                onPress={() => sendMessage(prompt)}
                style={styles.promptBtn}
                disabled={isTyping}
              >
                <Text style={styles.promptBtnText}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            placeholder="Type your message..."
            placeholderTextColor={colors.muted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => sendMessage(input)}
            style={styles.textInput}
            editable={!isTyping}
          />
          <TouchableOpacity
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || isTyping}
            style={[
              styles.sendBtn,
              (!input.trim() || isTyping) && { opacity: 0.5 },
            ]}
          >
            <Icon name="arrow" size={18} color="#ffffff" />
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
  agentBanner: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  agentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  agentAvatarText: {
    color: colors.accent,
    fontWeight: "800",
    fontSize: 13,
  },
  agentInfo: {
    flex: 1,
  },
  agentName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  agentStatus: {
    fontSize: 10,
    color: "#288153",
    fontWeight: "600",
    marginTop: 2,
  },
  orderBadge: {
    backgroundColor: colors.canvas,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.line,
  },
  orderBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.muted,
  },
  escalationBar: {
    backgroundColor: "#fff8f6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#ffe5e0",
  },
  escalationBarText: {
    fontSize: 12,
    color: "#6e4b44",
    fontWeight: "500",
  },
  escalateBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  escalateBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  messagesScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingVertical: 14,
    gap: 10,
  },
  messageBubble: {
    maxWidth: "85%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  agentBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.line,
    borderBottomLeftRadius: 4,
  },
  errorBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#fffdf9",
    borderWidth: 1,
    borderColor: "#ffcc80",
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: colors.accent,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  agentText: {
    color: colors.ink,
  },
  errorText: {
    color: "#b76e00",
  },
  userText: {
    color: "#ffffff",
  },
  messageTime: {
    fontSize: 9,
    marginTop: 4,
    textAlign: "right",
  },
  agentTime: {
    color: colors.muted,
  },
  userTime: {
    color: "rgba(255, 255, 255, 0.75)",
  },
  errorActionBtn: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: "#ffe0b2",
  },
  errorActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.accent,
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  typingText: {
    fontSize: 11,
    color: colors.muted,
    fontStyle: "italic",
  },
  promptsContainer: {
    paddingVertical: 6,
    backgroundColor: colors.canvas,
  },
  promptsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  promptBtn: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  promptBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.ink,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: 8,
  },
  textInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 13,
    color: colors.ink,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
});

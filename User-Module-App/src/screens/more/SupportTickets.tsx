import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FlowHeader from "../../components/FlowHeader";
import Icon from "../../components/Icon";
import Button from "../../components/Button";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { colors, radii } from "../../theme/tokens";
import {
  fetchUserTickets,
  SupportTicket,
  CATEGORY_LABELS,
  TicketStatus,
} from "../../lib/supportService";

export default function SupportTickets() {
  const { back, push } = useNav();
  const { state } = useApp();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTickets = useCallback(async () => {
    const userPhone = state.profile.phone;
    const userId = state.profile.id;
    if (!userPhone && !userId) {
      setLoading(false);
      return;
    }

    try {
      const data = await fetchUserTickets(userId || userPhone);
      setTickets(data);
    } catch (err) {
      console.warn("[SupportTickets] Error fetching tickets:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [state.profile.phone, state.profile.id]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTickets();
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case "open":
        return {
          bg: "#fff3e0",
          text: "#e65100",
          label: "Open",
        };
      case "in_progress":
        return {
          bg: "#e3f2fd",
          text: "#1565c0",
          label: "In Progress",
        };
      case "resolved":
        return {
          bg: "#e8f5e9",
          text: "#2e7d32",
          label: "Resolved",
        };
      case "closed":
        return {
          bg: "#f5f5f5",
          text: "#616161",
          label: "Closed",
        };
      default:
        return {
          bg: colors.line,
          text: colors.muted,
          label: status,
        };
    }
  };

  const renderTicketItem = ({ item }: { item: SupportTicket }) => {
    const badge = getStatusBadge(item.status);
    const dateFormatted = new Date(item.createdAt).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const lastMessage =
      item.messages.length > 0
        ? item.messages[item.messages.length - 1]
        : null;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => push({ name: "ticketDetail", ticketId: item.id })}
        style={styles.ticketCard}
      >
        <View style={styles.cardHeader}>
          <View style={styles.ticketMetaLeft}>
            <Text style={styles.ticketNumber}>{item.ticketNumber}</Text>
            <Text style={styles.categoryBadge}>
              {CATEGORY_LABELS[item.category] || item.category}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusBadgeText, { color: badge.text }]}>
              {badge.label}
            </Text>
          </View>
        </View>

        <Text style={styles.ticketSubject} numberOfLines={1}>
          {item.subject}
        </Text>

        {lastMessage && (
          <Text style={styles.lastMessagePreview} numberOfLines={2}>
            <Text style={styles.lastSender}>
              {lastMessage.sender === "admin"
                ? "Support Agent: "
                : "You: "}
            </Text>
            {lastMessage.text}
          </Text>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.timestamp}>{dateFormatted}</Text>
          <View style={styles.replyCount}>
            <Icon name="chat" size={14} color={colors.muted} />
            <Text style={styles.replyCountText}>
              {item.messages.length} {item.messages.length === 1 ? "message" : "messages"}
            </Text>
            <Icon name="arrow" size={14} color={colors.muted} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />
      <FlowHeader title="My Support Tickets" onBack={back} showHelp={false} />

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading support tickets...</Text>
        </View>
      ) : tickets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBox}>
            <Icon name="list" size={32} color={colors.accent} />
          </View>
          <Text style={styles.emptyTitle}>No Support Tickets</Text>
          <Text style={styles.emptySub}>
            You haven't reported any order issues or inquiries yet. All your
            past and active support requests will appear here.
          </Text>
          <View style={styles.emptyAction}>
            <Button onPress={() => push({ name: "reportIssue" })}>
              Report an Order Issue
            </Button>
          </View>
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id}
          renderItem={renderTicketItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.accent]}
            />
          }
        />
      )}

      {tickets.length > 0 && (
        <View style={styles.bottomBar}>
          <Button onPress={() => push({ name: "reportIssue" })}>
            + Report New Issue
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 12,
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
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.ink,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 24,
  },
  emptyAction: {
    width: "100%",
    maxWidth: 240,
  },
  ticketCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  ticketMetaLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ticketNumber: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.muted,
    letterSpacing: 0.5,
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.accent,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
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
  ticketSubject: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 6,
  },
  lastMessagePreview: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 17,
    marginBottom: 10,
  },
  lastSender: {
    fontWeight: "600",
    color: colors.ink,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: colors.line,
    paddingTop: 10,
  },
  timestamp: {
    fontSize: 11,
    color: colors.muted,
  },
  replyCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  replyCountText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FlowHeader from "../../components/FlowHeader";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import { useNav } from "../../navigation/Navigation";
import { colors } from "../../theme/tokens";

interface HelpProps {
  orderId?: string;
}

export default function Help({ orderId }: HelpProps) {
  const { back, push } = useNav();

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />
      <FlowHeader title="" onBack={back} showHelp={false} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <View style={styles.heroIconBox}>
            <Icon name="shield" size={28} color={colors.accent} />
          </View>
          <Text style={styles.heroEyebrow}>24/7 SUPPORT</Text>
          <Text style={styles.heroTitle}>How can we help?</Text>
          <Text style={styles.heroSub}>
            {orderId
              ? `Get assistance for your order (#${orderId.slice(0, 8)}).`
              : "Get quick assistance with your orders, deliveries, payments, or account."}
          </Text>
        </View>

        <View style={styles.optionsList}>
          {/* Option 1: Chat with support */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => push({ name: "chatSupport", orderId })}
            style={styles.optionRow}
          >
            <View style={styles.optionIconBox}>
              <Icon name="user" size={16} color={colors.accent} />
            </View>
            <View style={styles.optionDetails}>
              <Text style={styles.optionTitle}>Chat with support</Text>
              <Text style={styles.optionSub}>
                Instant AI assistant and real-time customer care
              </Text>
            </View>
            <Icon name="arrow" size={16} color={colors.muted} />
          </TouchableOpacity>

          {/* Option 2: Report an order issue */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => push({ name: "reportIssue", orderId })}
            style={styles.optionRow}
          >
            <View style={styles.optionIconBox}>
              <Icon name="list" size={16} color={colors.accent} />
            </View>
            <View style={styles.optionDetails}>
              <Text style={styles.optionTitle}>Report an order issue</Text>
              <Text style={styles.optionSub}>
                Missing items, damaged food, delayed delivery, or billing
              </Text>
            </View>
            <Icon name="arrow" size={16} color={colors.muted} />
          </TouchableOpacity>

          {/* Option 3: My Support Tickets */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => push({ name: "supportTickets" })}
            style={[styles.optionRow, styles.lastOptionRow]}
          >
            <View style={styles.optionIconBox}>
              <Icon name="box" size={16} color={colors.accent} />
            </View>
            <View style={styles.optionDetails}>
              <Text style={styles.optionTitle}>My support tickets</Text>
              <Text style={styles.optionSub}>
                Track active complaints, status changes, and admin replies
              </Text>
            </View>
            <Icon name="arrow" size={16} color={colors.muted} />
          </TouchableOpacity>
        </View>

        <View style={styles.actionPad}>
          <Button onPress={back}>Done</Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  heroIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.accent,
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.ink,
    marginTop: 4,
  },
  heroSub: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
    marginTop: 4,
    maxWidth: 280,
  },
  optionsList: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  lastOptionRow: {
    borderBottomWidth: 0,
  },
  optionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  optionDetails: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  optionSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  actionPad: {
    marginTop: 28,
  },
});

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
import { formatWhen } from "../../lib/format";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { colors, radii } from "../../theme/tokens";

export default function Notifications() {
  const { back } = useNav();
  const { state, markAllRead, showToast } = useApp();

  const handleMarkAll = () => {
    markAllRead();
    showToast("All notifications marked as read");
  };

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
            <Icon name="bell" size={28} color={colors.accent} />
          </View>
          <Text style={styles.heroEyebrow}>YOU'RE ALL CAUGHT UP</Text>
          <Text style={styles.heroTitle}>Notifications</Text>
          <Text style={styles.heroSub}>
            Updates from every RoadRider service appear together here.
          </Text>
        </View>

        <View style={styles.listContainer}>
          {state.notifications.map((n) => (
            <TouchableOpacity
              key={n.id}
              activeOpacity={0.8}
              onPress={() => showToast(n.text)}
              style={[styles.notifRow, !n.read && styles.notifRowUnread]}
            >
              <View style={styles.iconBox}>
                <Icon name="check" size={15} color={colors.accent} />
              </View>
              <View style={styles.notifInfo}>
                <Text style={styles.notifText}>{n.text}</Text>
                <Text style={styles.notifDate}>{formatWhen(n.when)}</Text>
              </View>
              {!n.read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.markAllRow}>
          <TouchableOpacity onPress={handleMarkAll}>
            <Text style={styles.markAllText}>Mark all as read</Text>
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
  listContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
  },
  notifRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  notifRowUnread: {
    backgroundColor: colors.accentSoft,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  notifInfo: {
    flex: 1,
  },
  notifText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
  },
  notifDate: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginLeft: 8,
  },
  markAllRow: {
    marginTop: 14,
    alignItems: "flex-end",
  },
  markAllText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent,
  },
  actionPad: {
    marginTop: 24,
  },
});

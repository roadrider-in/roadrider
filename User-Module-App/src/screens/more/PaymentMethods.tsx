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
import { rupees } from "../../lib/pricing";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { colors, radii } from "../../theme/tokens";

export default function PaymentMethods() {
  const { back, push } = useNav();
  const { state, showToast } = useApp();

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
            <Icon name="card" size={28} color={colors.accent} />
          </View>
          <Text style={styles.heroEyebrow}>SAFE & SECURE</Text>
          <Text style={styles.heroTitle}>Payment methods</Text>
          <Text style={styles.heroSub}>
            Manage the ways you pay across RoadRider.
          </Text>
        </View>

        <View style={styles.methodsList}>
          {/* Linked Visa Card */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              showToast("Visa ending in 4821 is linked as default card.")
            }
            style={styles.methodRow}
          >
            <View style={styles.iconBox}>
              <Icon name="card" size={16} color={colors.accent} />
            </View>
            <View style={styles.methodDetails}>
              <Text style={styles.methodTitle}>Visa ending in 4821</Text>
              <Text style={styles.methodSub}>
                Primary payment card · Exp 08/29
              </Text>
            </View>
            <Icon name="check" size={16} color="#22c55e" />
          </TouchableOpacity>

          {/* Add UPI or Card */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => push({ name: "addPaymentMethod" })}
            style={[styles.methodRow, { backgroundColor: "#fbf9f6" }]}
          >
            <View style={styles.iconBox}>
              <Icon name="plus" size={16} color={colors.ink} />
            </View>
            <View style={styles.methodDetails}>
              <Text style={styles.methodTitle}>Add UPI or a new card</Text>
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
  methodsList: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
  },
  methodRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  methodDetails: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  methodSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  actionPad: {
    marginTop: 28,
  },
});

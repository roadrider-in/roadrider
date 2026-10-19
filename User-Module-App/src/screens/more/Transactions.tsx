import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FlowHeader from "../../components/FlowHeader";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import { formatWhen } from "../../lib/format";
import { rupees } from "../../lib/pricing";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { colors, radii } from "../../theme/tokens";

export default function Transactions() {
  const { back } = useNav();
  const { state } = useApp();

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
            <Icon name="list" size={28} color={colors.accent} />
          </View>
          <Text style={styles.heroEyebrow}>WALLET STATEMENTS</Text>
          <Text style={styles.heroTitle}>All transactions</Text>
          <Text style={styles.heroSub}>
            Complete record of charges, refunds, and wallet top-ups.
          </Text>
        </View>

        <View style={styles.txnList}>
          {state.wallet.txns.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No transactions found.</Text>
            </View>
          ) : (
            state.wallet.txns.map((txn) => {
              const isCredit = txn.amount > 0;
              return (
                <View key={txn.id} style={styles.txnRow}>
                  <View
                    style={[
                      styles.txnIconBox,
                      isCredit && styles.txnIconBoxCredit,
                    ]}
                  >
                    <Icon
                      name={txn.icon}
                      size={18}
                      color={isCredit ? "#22c55e" : colors.accent}
                    />
                  </View>
                  <View style={styles.txnDetails}>
                    <Text style={styles.txnLabel}>{txn.label}</Text>
                    <Text style={styles.txnDate}>{formatWhen(txn.when)}</Text>
                  </View>
                  <Text
                    style={[
                      styles.txnAmount,
                      isCredit && styles.txnAmountCredit,
                    ]}
                  >
                    {isCredit
                      ? `+ ${rupees(txn.amount)}`
                      : `− ${rupees(Math.abs(txn.amount))}`}
                  </Text>
                </View>
              );
            })
          )}
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
    marginBottom: 20,
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
    textAlign: "center",
  },
  heroSub: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
    marginTop: 4,
    maxWidth: 280,
  },
  txnList: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
  },
  emptyCard: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 12,
    color: colors.muted,
  },
  txnRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  txnIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  txnIconBoxCredit: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
  },
  txnDetails: {
    flex: 1,
  },
  txnLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  txnDate: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 2,
  },
  txnAmount: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  txnAmountCredit: {
    color: "#22c55e",
  },
  actionPad: {
    marginTop: 24,
  },
});

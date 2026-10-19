import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
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

export default function AddMoney() {
  const { back } = useNav();
  const { state, addMoney, showToast } = useApp();
  const [amount, setAmount] = useState<number>(500);
  const [customInput, setCustomInput] = useState<string>("500");

  const quickAmounts = [200, 500, 1000];

  const handleSelectQuick = (val: number) => {
    setAmount(val);
    setCustomInput(val.toString());
  };

  const handleCustomChange = (val: string) => {
    const num = parseInt(val.replace(/\D/g, ""), 10);
    setCustomInput(val);
    setAmount(isNaN(num) ? 0 : num);
  };

  const handleAdd = () => {
    if (amount < 10) {
      showToast("Minimum top-up amount is ₹10");
      return;
    }
    if (amount > 10000) {
      showToast("Maximum top-up amount is ₹10,000 in demo mode");
      return;
    }
    addMoney(amount);
    showToast(`Added ${rupees(amount)} demo funds to your RoadRider Wallet!`);
    back();
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
            <Icon name="wallet" size={28} color={colors.accent} />
          </View>
          <Text style={styles.heroEyebrow}>ROADRIDER WALLET</Text>
          <Text style={styles.heroTitle}>Add money</Text>
          <Text style={styles.heroSub}>
            Top up once and pay instantly across every service. Current balance:{" "}
            <Text style={{ fontWeight: "700", color: colors.ink }}>
              {rupees(state.wallet.balance)}
            </Text>
          </Text>
        </View>

        <View style={styles.cardPad}>
          <Text style={styles.fieldLabel}>SELECT TOP-UP AMOUNT</Text>
          <View style={styles.quickGrid}>
            {quickAmounts.map((q) => {
              const isSelected = amount === q;
              return (
                <TouchableOpacity
                  key={q}
                  onPress={() => handleSelectQuick(q)}
                  style={[
                    styles.quickBtn,
                    isSelected && styles.quickBtnSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.quickBtnText,
                      isSelected && styles.quickBtnTextSelected,
                    ]}
                  >
                    {rupees(q)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
            OR ENTER CUSTOM AMOUNT (₹)
          </Text>
          <TextInput
            value={customInput}
            onChangeText={handleCustomChange}
            keyboardType="numeric"
            placeholder="e.g. 750"
            placeholderTextColor={colors.muted}
            style={styles.amountInput}
          />

          <Text style={styles.disclaimerText}>
            Demo mode: Funds are credited directly to your local wallet without
            charging your card.
          </Text>
        </View>

        <View style={styles.actionPad}>
          <Button onPress={handleAdd}>Add {rupees(amount || 0)}</Button>
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
  cardPad: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.muted,
    marginBottom: 10,
    letterSpacing: 0.8,
  },
  quickGrid: {
    flexDirection: "row",
    gap: 8,
  },
  quickBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#ffffff",
    alignItems: "center",
  },
  quickBtnSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    borderWidth: 2,
  },
  quickBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  quickBtnTextSelected: {
    color: colors.accent,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
  },
  disclaimerText: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 12,
    lineHeight: 14,
  },
  actionPad: {
    marginTop: 24,
  },
});

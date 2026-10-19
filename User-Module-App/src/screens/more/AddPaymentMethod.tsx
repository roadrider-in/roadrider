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
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { colors, radii } from "../../theme/tokens";

export default function AddPaymentMethod() {
  const { back } = useNav();
  const { showToast } = useApp();

  const [methodType, setMethodType] = useState<"upi" | "card">("upi");

  // UPI fields
  const [upiId, setUpiId] = useState("");
  const [upiError, setUpiError] = useState("");

  // Card fields
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("Arjun Khanna");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardError, setCardError] = useState("");

  const handleCardNumberChange = (val: string) => {
    const raw = val.replace(/\D/g, "").slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
    setCardNumber(formatted);
    if (cardError) setCardError("");
  };

  const handleExpiryChange = (val: string) => {
    const raw = val.replace(/\D/g, "").slice(0, 4);
    if (raw.length >= 3) {
      setExpiry(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setExpiry(raw);
    }
    if (cardError) setCardError("");
  };

  const handleSaveUpi = () => {
    if (!upiId.trim() || !upiId.includes("@")) {
      setUpiError(
        "Please enter a valid UPI ID (e.g. mobile@upi or username@okhdfcbank)"
      );
      return;
    }
    showToast(`UPI ID ${upiId.trim()} added successfully!`);
    back();
  };

  const handleSaveCard = () => {
    const rawCard = cardNumber.replace(/\s/g, "");
    if (rawCard.length < 15) {
      setCardError("Please enter a valid 16-digit card number.");
      return;
    }
    if (!expiry || expiry.length < 5) {
      setCardError("Please enter valid card expiry (MM/YY).");
      return;
    }
    if (!cvv || cvv.length < 3) {
      setCardError("Please enter a valid 3-digit CVV.");
      return;
    }
    const last4 = rawCard.slice(-4);
    showToast(`Card ending in ${last4} added successfully!`);
    back();
  };

  const popularUpiHandles = ["@okhdfcbank", "@okaxis", "@paytm", "@ybl"];

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
          <Text style={styles.heroEyebrow}>SECURE PAYMENTS</Text>
          <Text style={styles.heroTitle}>Add payment method</Text>
          <Text style={styles.heroSub}>
            Save UPI ID or debit/credit card for instant 1-tap checkout across
            RoadRider.
          </Text>
        </View>

        {/* Method Toggle Segment */}
        <View style={styles.segment}>
          <TouchableOpacity
            onPress={() => setMethodType("upi")}
            style={[
              styles.segmentBtn,
              methodType === "upi" && styles.segmentBtnActive,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                methodType === "upi" && styles.segmentTextActive,
              ]}
            >
              UPI ID
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMethodType("card")}
            style={[
              styles.segmentBtn,
              methodType === "card" && styles.segmentBtnActive,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                methodType === "card" && styles.segmentTextActive,
              ]}
            >
              Credit / Debit Card
            </Text>
          </TouchableOpacity>
        </View>

        {methodType === "upi" ? (
          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>
              VIRTUAL PAYMENT ADDRESS (UPI ID)
            </Text>
            <TextInput
              placeholder="e.g. 9876543210@paytm"
              placeholderTextColor={colors.muted}
              value={upiId}
              onChangeText={(t) => {
                setUpiId(t);
                if (upiError) setUpiError("");
              }}
              style={styles.input}
              autoCapitalize="none"
            />
            {!!upiError && <Text style={styles.errorText}>{upiError}</Text>}

            <Text style={[styles.inputLabel, { marginTop: 14 }]}>
              QUICK HANDLES:
            </Text>
            <View style={styles.handlesRow}>
              {popularUpiHandles.map((handle) => (
                <TouchableOpacity
                  key={handle}
                  onPress={() => {
                    const prefix = upiId.split("@")[0] || "9876543210";
                    setUpiId(`${prefix}${handle}`);
                  }}
                  style={styles.handleChip}
                >
                  <Text style={styles.handleChipText}>{handle}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.securityRow}>
              <Icon name="shield" size={16} color={colors.muted} />
              <Text style={styles.securityText}>
                Secured via NPCI UPI autopay standards
              </Text>
            </View>

            <View style={{ marginTop: 22 }}>
              <Button onPress={handleSaveUpi}>Save & Link UPI</Button>
            </View>
          </View>
        ) : (
          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>CARD NUMBER</Text>
            <TextInput
              placeholder="4532 8921 7712 3456"
              placeholderTextColor={colors.muted}
              value={cardNumber}
              onChangeText={handleCardNumberChange}
              keyboardType="numeric"
              style={[styles.input, { fontFamily: "monospace" }]}
            />

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>
              NAME ON CARD
            </Text>
            <TextInput
              placeholder="Arjun Khanna"
              placeholderTextColor={colors.muted}
              value={cardHolder}
              onChangeText={setCardHolder}
              style={styles.input}
            />

            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>EXPIRY (MM/YY)</Text>
                <TextInput
                  placeholder="08/29"
                  placeholderTextColor={colors.muted}
                  value={expiry}
                  onChangeText={handleExpiryChange}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>CVV</Text>
                <TextInput
                  placeholder="•••"
                  placeholderTextColor={colors.muted}
                  value={cvv}
                  onChangeText={(t) => {
                    setCvv(t.replace(/\D/g, ""));
                    if (cardError) setCardError("");
                  }}
                  secureTextEntry
                  maxLength={4}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>
            </View>

            {!!cardError && <Text style={styles.errorText}>{cardError}</Text>}

            <View style={styles.securityRow}>
              <Icon name="shield" size={16} color={colors.muted} />
              <Text style={styles.securityText}>
                Card information is tokenised per RBI guidelines
              </Text>
            </View>

            <View style={{ marginTop: 20 }}>
              <Button onPress={handleSaveCard}>Save & Add Card</Button>
            </View>
          </View>
        )}
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
  },
  heroSub: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
    marginTop: 4,
    maxWidth: 280,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: colors.accent,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
  },
  segmentTextActive: {
    color: "#ffffff",
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.muted,
    marginBottom: 6,
    letterSpacing: 0.8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    color: colors.ink,
  },
  rowInputs: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  errorText: {
    color: "#c84b31",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 6,
  },
  handlesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  handleChip: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  handleChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.accent,
  },
  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },
  securityText: {
    fontSize: 10,
    color: colors.muted,
  },
});

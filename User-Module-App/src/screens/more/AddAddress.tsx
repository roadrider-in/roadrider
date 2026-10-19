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
import type { PlacesMode } from "../../navigation/types";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { colors, radii } from "../../theme/tokens";

interface AddAddressProps {
  mode: PlacesMode;
}

export default function AddAddress({ mode }: AddAddressProps) {
  const { back } = useNav();
  const { addPlace, setDefaultPlace, setRide, setCourier, showToast } =
    useApp();

  const [label, setLabel] = useState<"Home" | "Work" | "Other">("Home");
  const [line, setLine] = useState("");
  const [area, setArea] = useState("Lucknow, Uttar Pradesh");
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!line.trim()) {
      setError("Please enter house number and street name.");
      return;
    }
    const icon = label === "Home" ? ("home" as const) : ("pin" as const);
    const created = addPlace({
      label,
      line: line.trim(),
      area: area.trim(),
      icon,
    });

    if (mode === "delivery" || mode === "manage") setDefaultPlace(created.id);
    else if (mode === "ridePickup") setRide({ pickupId: created.id });
    else if (mode === "rideDrop") setRide({ dropId: created.id });
    else if (mode === "courierPickup") setCourier({ pickupId: created.id });
    else if (mode === "courierDrop") setCourier({ dropId: created.id });

    showToast(`Added "${label}" to saved addresses!`);
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
            <Icon name="pin" size={28} color={colors.accent} />
          </View>
          <Text style={styles.heroEyebrow}>NEW LOCATION</Text>
          <Text style={styles.heroTitle}>Add new address</Text>
          <Text style={styles.heroSub}>
            Enter your complete address details for accurate deliveries.
          </Text>
        </View>

        <View style={styles.cardPad}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>ADDRESS LABEL</Text>
            <View style={styles.labelTabsRow}>
              {(["Home", "Work", "Other"] as const).map((tag) => {
                const isSelected = label === tag;
                return (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => setLabel(tag)}
                    style={[
                      styles.labelTabBtn,
                      isSelected && styles.labelTabBtnSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.labelTabText,
                        isSelected && styles.labelTabTextSelected,
                      ]}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              HOUSE / FLAT / BUILDING & STREET
            </Text>
            <TextInput
              placeholder="e.g. 24B, Naval Kishore Road, Hazratganj"
              placeholderTextColor={colors.muted}
              value={line}
              onChangeText={(t) => {
                setLine(t);
                if (error) setError("");
              }}
              style={[styles.textInput, error ? styles.textInputError : null]}
            />
            {!!error && <Text style={styles.errorText}>{error}</Text>}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>AREA / CITY / PINCODE</Text>
            <TextInput
              placeholder="e.g. Hazratganj, Lucknow · 226001"
              placeholderTextColor={colors.muted}
              value={area}
              onChangeText={setArea}
              style={styles.textInput}
            />
          </View>
        </View>

        <View style={styles.actionPad}>
          <Button onPress={handleSave}>Save address</Button>
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
    gap: 16,
  },
  fieldGroup: {},
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.muted,
    marginBottom: 8,
    letterSpacing: 0.8,
  },
  labelTabsRow: {
    flexDirection: "row",
    gap: 8,
  },
  labelTabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#ffffff",
    alignItems: "center",
  },
  labelTabBtnSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  labelTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
  },
  labelTabTextSelected: {
    color: colors.accent,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    color: colors.ink,
  },
  textInputError: {
    borderColor: "#c84b31",
  },
  errorText: {
    color: "#c84b31",
    fontSize: 11,
    marginTop: 4,
  },
  actionPad: {
    marginTop: 24,
  },
});

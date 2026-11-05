import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import FlowHeader from "../../components/FlowHeader";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import { prettyPhone } from "../../lib/format";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { colors, radii } from "../../theme/tokens";
import {
  updateCustomerProfile,
  fetchCustomerProfile,
  getActiveSession,
} from "../../lib/authService";
import type { LatLng } from "../../lib/googleMaps";
import { useI18n, SUPPORTED_LANGUAGES } from "../../lib/i18n";

interface ProfileProps {
  mode?: "completion";
}

export default function Profile({ mode }: ProfileProps) {
  const isCompletionMode = mode === "completion";
  const { back, reset } = useNav();
  const { state, updateProfile, addPlace, setDefaultPlace, signOut, showToast } =
    useApp();
  const { language, setLanguage, t } = useI18n();

  const [name, setName] = useState(state.profile.name || "");
  const [addressLabel, setAddressLabel] = useState<"Home" | "Work" | "Other">("Home");
  const [addressLine, setAddressLine] = useState(state.places[0]?.line || "");
  const [addressArea, setAddressArea] = useState(
    state.places[0]?.area || "Lucknow, Uttar Pradesh"
  );
  const [addressCoords, setAddressCoords] = useState<LatLng | undefined>(
    state.places[0]?.coords
  );
  const [detectingGps, setDetectingGps] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleDetectGps = async () => {
    if (detectingGps) return;
    setDetectingGps(true);
    setError("");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showToast("Location permission was denied. You can enter your address manually.");
        setDetectingGps(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = loc.coords;
      setAddressCoords({ lat: latitude, lng: longitude });

      try {
        const rev = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (rev && rev.length > 0) {
          const r = rev[0];
          const detectedLine = [r.name || r.street, r.district]
            .filter(Boolean)
            .join(", ");
          const detectedArea = [r.city || "Lucknow", r.postalCode]
            .filter(Boolean)
            .join(" · ");
          if (detectedLine) setAddressLine(detectedLine);
          if (detectedArea) setAddressArea(detectedArea);
          showToast("📍 Location detected successfully!");
        }
      } catch {
        setAddressLine(`GPS Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
      }
    } catch {
      showToast("Unable to fetch GPS. Please enter your address manually.");
    } finally {
      setDetectingGps(false);
    }
  };

  const handleSave = async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      setError("Please enter your full name.");
      showToast("Please enter your full name.");
      return;
    }

    if (isCompletionMode && !addressLine.trim()) {
      setError("Please provide a delivery address.");
      showToast("Please enter your delivery address.");
      return;
    }

    setError("");
    setSaving(true);

    try {
      // 1. Save or update address
      if (addressLine.trim()) {
        const icon = addressLabel === "Home" ? ("home" as const) : ("pin" as const);
        const existingPlace = state.places.find(
          (p) => p.line.toLowerCase() === addressLine.trim().toLowerCase()
        );
        if (existingPlace) {
          setDefaultPlace(existingPlace.id);
        } else {
          const newPlace = addPlace({
            label: addressLabel,
            line: addressLine.trim(),
            area: addressArea.trim() || "Lucknow, Uttar Pradesh",
            icon,
            coords: addressCoords,
          });
          setDefaultPlace(newPlace.id);
        }
      }

      // 2. Update local state
      updateProfile({
        name: cleanName,
        language,
        profileCompleted: true,
      });

      // 3. Sync to Supabase backend customers table
      let phoneOrAuthId = state.profile.phone;
      if (!phoneOrAuthId) {
        try {
          const session = await getActiveSession();
          phoneOrAuthId = session?.user?.phone || session?.user?.id || "";
        } catch {}
      }

      if (phoneOrAuthId) {
        await updateCustomerProfile(
          phoneOrAuthId,
          cleanName,
          addressArea.trim() || "Lucknow"
        );
        const refreshedCust = await fetchCustomerProfile(phoneOrAuthId);
        if (refreshedCust?.id) {
          updateProfile({ id: refreshedCust.id });
        }
      }

      showToast(
        isCompletionMode
          ? "Profile completed! Welcome to RoadRider."
          : "Profile updated successfully!"
      );

      if (isCompletionMode) {
        reset([{ name: "mainTabs" }]);
      } else {
        back();
      }
    } catch {
      setError("Failed to save profile. Please try again.");
      showToast("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    signOut();
    showToast("Signed out of RoadRider");
    reset([{ name: "phone" }]);
  };

  const displayPhone = state.profile.phone
    ? `+91 ${prettyPhone(state.profile.phone)}`
    : state.authenticated
    ? "Verified account"
    : "Not signed in";

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />
      <FlowHeader
        title=""
        onBack={isCompletionMode ? undefined : back}
        showHelp={false}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroSection}>
          <View style={styles.heroIconBox}>
            <Icon name="user" size={28} color={colors.accent} />
          </View>
          <Text style={styles.heroEyebrow}>
            {isCompletionMode ? "STEP 2 OF 2" : "PERSONAL DETAILS"}
          </Text>
          <Text style={styles.heroTitle}>
            {isCompletionMode ? "Complete your profile" : "Profile & settings"}
          </Text>
          <Text style={styles.heroSub}>
            {isCompletionMode
              ? "Please enter your name and address to get started with RoadRider."
              : "Keep your RoadRider account details and preferences up to date."}
          </Text>
        </View>

        <View style={styles.cardPad}>
          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>FULL NAME *</Text>
            <TextInput
              value={name}
              onChangeText={(t) => {
                setName(t);
                if (error) setError("");
              }}
              placeholder="Enter your full name"
              placeholderTextColor={colors.muted}
              style={[styles.input, Boolean(error && !name.trim()) && styles.inputError]}
            />
          </View>

          {/* Verified Phone */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>VERIFIED MOBILE NUMBER</Text>
            <TextInput
              value={displayPhone}
              editable={false}
              style={[styles.input, styles.inputDisabled]}
            />
          </View>

          {/* Address Section */}
          <View style={styles.fieldGroup}>
            <View style={styles.addressSectionHeader}>
              <Text style={styles.fieldLabel}>
                DELIVERY ADDRESS {isCompletionMode ? "*" : ""}
              </Text>
              <TouchableOpacity
                onPress={handleDetectGps}
                disabled={detectingGps}
                style={styles.gpsDetectBtn}
              >
                {detectingGps ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <>
                    <Icon name="pin" size={14} color={colors.accent} />
                    <Text style={styles.gpsDetectText}>Use GPS</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Address Tag Selector */}
            <View style={styles.labelTabsRow}>
              {(["Home", "Work", "Other"] as const).map((tag) => {
                const isSelected = addressLabel === tag;
                return (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => setAddressLabel(tag)}
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

            {/* House / Street */}
            <TextInput
              value={addressLine}
              onChangeText={setAddressLine}
              placeholder="Flat / House no. / Street name"
              placeholderTextColor={colors.muted}
              style={[styles.input, { marginTop: 8 }]}
            />

            {/* Area / City */}
            <TextInput
              value={addressArea}
              onChangeText={setAddressArea}
              placeholder="Area / City / Landmark"
              placeholderTextColor={colors.muted}
              style={[styles.input, { marginTop: 8 }]}
            />
          </View>

          {/* Language Selector */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t("lang_settings", "APP LANGUAGE / भाषा")}</Text>
            <View style={styles.langButtonsRow}>
              {SUPPORTED_LANGUAGES.map((l) => {
                const isSelected = language === l.name;
                return (
                  <TouchableOpacity
                    key={l.code}
                    onPress={() => setLanguage(l.name)}
                    style={[
                      styles.langBtn,
                      isSelected && styles.langBtnSelected,
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.langBtnText,
                        isSelected && styles.langBtnTextSelected,
                      ]}
                    >
                      {l.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {Boolean(error) && <Text style={styles.errorText}>{error}</Text>}
        </View>

        {/* Sign Out Button (Only in edit mode) */}
        {!isCompletionMode && state.authenticated && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSignOut}
            style={styles.signOutBtn}
          >
            <Icon name="logout" size={16} color="#c84b31" />
            <Text style={styles.signOutBtnText}>Sign out</Text>
          </TouchableOpacity>
        )}

        <View style={styles.actionPad}>
          <Button onPress={handleSave} disabled={saving}>
            {saving
              ? "Saving..."
              : isCompletionMode
              ? "Save & continue to Home"
              : "Save changes"}
          </Button>
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
  },
  heroSub: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
    marginTop: 4,
    maxWidth: 290,
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
  inputError: {
    borderColor: colors.accent,
  },
  inputDisabled: {
    backgroundColor: "#fbf9f6",
    color: colors.muted,
  },
  addressSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  gpsDetectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  gpsDetectText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent,
  },
  labelTabsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  labelTabBtn: {
    flex: 1,
    paddingVertical: 8,
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
    fontSize: 11,
    fontWeight: "700",
    color: colors.ink,
  },
  labelTabTextSelected: {
    color: colors.accent,
  },
  langButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  langBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#ffffff",
    alignItems: "center",
  },
  langBtnSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  langBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
  },
  langBtnTextSelected: {
    color: colors.accent,
  },
  errorText: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: "600",
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#ffd0c7",
    marginTop: 16,
  },
  signOutBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#c84b31",
  },
  actionPad: {
    marginTop: 20,
  },
});

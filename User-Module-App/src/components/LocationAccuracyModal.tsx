import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import * as Location from "expo-location";
import Icon from "./Icon";
import { useI18n } from "../lib/i18n";
import { colors, radii } from "../theme/tokens";

interface LocationAccuracyModalProps {
  visible: boolean;
  onGranted: (coords: { lat: number; lng: number }) => void;
  onDeclined: () => void;
}

export default function LocationAccuracyModal({
  visible,
  onGranted,
  onDeclined,
}: LocationAccuracyModalProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  const handleTurnOn = async () => {
    setLoading(true);
    try {
      // 1. Request foreground permissions
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }

      if (status !== "granted") {
        setLoading(false);
        onDeclined();
        return;
      }

      // 2. On Android, enable high-accuracy network provider if disabled
      if (Platform.OS === "android") {
        try {
          const hasService = await Location.hasServicesEnabledAsync();
          if (!hasService) {
            await Location.enableNetworkProviderAsync();
          }
        } catch (provErr) {
          console.log("[LocationAccuracyModal] enableNetworkProvider notice:", provErr);
        }
      }

      // 3. Obtain high accuracy location
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLoading(false);
      onGranted({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
    } catch (err) {
      console.warn("[LocationAccuracyModal] Location fetch failed:", err);
      setLoading(false);
      onDeclined();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDeclined}
    >
      <View style={styles.overlay}>
        <View style={styles.dialogCard}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Title */}
            <Text style={styles.title}>
              {t(
                "rides_location_accuracy_title",
                "To continue, your device will need to use Location Accuracy"
              )}
            </Text>

            <Text style={styles.subtitle}>
              {t("rides_location_accuracy_desc", "The following settings should be on:")}
            </Text>

            {/* Item 1: Device location */}
            <View style={styles.row}>
              <View style={styles.iconCircle}>
                <Icon name="pin" size={20} color="#1a73e8" />
              </View>
              <Text style={styles.rowTitle}>
                {t("rides_device_location", "Device location")}
              </Text>
            </View>

            {/* Item 2: Location Accuracy */}
            <View style={styles.row}>
              <View style={styles.iconCircle}>
                <Icon name="target" size={20} color="#1a73e8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.descText}>
                  {t(
                    "rides_location_accuracy_info",
                    "Location Accuracy, which provides a more accurate location for apps and services. To do this, Google periodically processes information about device sensors and wireless signals from your device to crowdsource wireless signal locations. These are used without identifying you to improve location accuracy and location-based services and to improve, provide and maintain Google's services based on Google's and third parties' legitimate interests to serve users' needs. This may use mobile data when you are not connected to Wi-Fi."
                  )}
                </Text>
              </View>
            </View>

            <Text style={styles.footerNote}>
              {t(
                "rides_location_accuracy_sub",
                "You can change this at any time in location settings."
              )}
            </Text>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.btnSecondary}
              activeOpacity={0.7}
              onPress={onDeclined}
              disabled={loading}
            >
              <Text style={styles.btnSecondaryText}>
                {t("rides_no_thanks", "No, thanks")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnPrimary}
              activeOpacity={0.8}
              onPress={handleTurnOn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.btnPrimaryText}>
                  {t("rides_turn_on", "Turn on")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10, 8, 7, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  dialogCard: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "82%",
    backgroundColor: "#f5f7fb",
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 12,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e1e24",
    lineHeight: 24,
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#3c4043",
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 14,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#202124",
    marginTop: 4,
  },
  descText: {
    fontSize: 12.5,
    lineHeight: 18,
    color: "#4a4e54",
  },
  footerNote: {
    fontSize: 12,
    color: "#5f6368",
    marginTop: 6,
    marginBottom: 8,
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0, 0, 0, 0.08)",
  },
  btnSecondary: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a73e8",
  },
  btnPrimary: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#1a73e8",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 90,
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
});

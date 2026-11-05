import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Logo from "../../components/Logo";
import Icon from "../../components/Icon";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { colors, radii } from "../../theme/tokens";

interface NoInternetProps {
  onReconnect?: () => void;
}

export async function testConnection(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch("https://clients3.google.com/generate_204", {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);
    return res.status === 204 || res.status === 200;
  } catch {
    return false;
  }
}

export default function NoInternet({ onReconnect }: NoInternetProps) {
  const { pop } = useNav();
  const { showToast } = useApp();
  const [isChecking, setIsChecking] = useState(false);

  // Periodic background check every 6 seconds to automatically recover
  useEffect(() => {
    let isMounted = true;
    const interval = setInterval(async () => {
      const isOnline = await testConnection();
      if (isOnline && isMounted) {
        showToast("Internet connection restored!");
        if (onReconnect) {
          onReconnect();
        } else {
          pop();
        }
      }
    }, 6000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [onReconnect, pop, showToast]);

  const handleManualRetry = async () => {
    if (isChecking) return;
    setIsChecking(true);
    const isOnline = await testConnection();
    setIsChecking(false);

    if (isOnline) {
      showToast("Connected to Internet!");
      if (onReconnect) {
        onReconnect();
      } else {
        pop();
      }
    } else {
      showToast("Still offline. Please check your Wi-Fi or cellular data.");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Logo light size={24} />
      </View>

      {/* Main Illustration & Error Content */}
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Icon name="alert-circle" size={48} color="#ef4444" />
        </View>

        <Text style={styles.title}>No Internet Connection</Text>
        <Text style={styles.description}>
          Your device appears to be offline. RoadRider needs an active internet
          connection to look up restaurants, track rides, and confirm bookings.
        </Text>

        <View style={styles.tipCard}>
          <Text style={styles.tipHeader}>QUICK TROUBLESHOOTING</Text>
          <Text style={styles.tipText}>• Turn Airplane Mode on for 5s, then off</Text>
          <Text style={styles.tipText}>• Check your Wi-Fi connection or Mobile Data</Text>
          <Text style={styles.tipText}>• We've preserved your active cart and progress</Text>
        </View>
      </View>

      {/* Action Button */}
      <View style={styles.bottomArea}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleManualRetry}
          disabled={isChecking}
          style={styles.retryBtn}
        >
          {isChecking ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <View style={styles.btnRow}>
              <Icon name="clock" size={16} color="#ffffff" />
              <Text style={styles.retryBtnText}>Retry Connection</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d1b2c",
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    paddingTop: 16,
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 28,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 10,
  },
  description: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  tipCard: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  tipHeader: {
    fontSize: 10,
    fontWeight: "800",
    color: "#3983f7",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.65)",
    marginVertical: 2,
  },
  bottomArea: {
    paddingHorizontal: 22,
    paddingBottom: 20,
  },
  retryBtn: {
    backgroundColor: "#3983f7",
    paddingVertical: 15,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3983f7",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  retryBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});

import React, { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native"
import { colors } from "../../theme/colors"
import { radius } from "../../theme/radius"
import { AppHeader } from "../../components/common/AppHeader"
import { AppCard } from "../../components/common/AppCard"
import { AppButton } from "../../components/common/AppButton"
import { AppIcon } from "../../components/common/AppIcon"
import { ToggleSwitch } from "../../components/common/ToggleSwitch"
import { useAppNavigation } from "../../navigation/NavigationContext"

export const NotificationsScreen = () => {
  const { goBack } = useAppNavigation()
  const [notifications, setNotifications] = useState([])

  // Section 19: Notifications and Sound State
  const [isPaused, setIsPaused] = useState(false)
  const [volume, setVolume] = useState(80)
  const [isMuted, setIsMuted] = useState(false)
  const [testChimeActive, setTestChimeActive] = useState(false)

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })))
  }

  const handleTogglePause = () => {
    setIsPaused((prev) => !prev)
  }

  const handleVolumeDown = () => {
    setVolume((prev) => Math.max(0, prev - 10))
    if (isMuted) setIsMuted(false)
  }

  const handleVolumeUp = () => {
    setVolume((prev) => Math.min(100, prev + 10))
    if (isMuted) setIsMuted(false)
  }

  const handleToggleMute = () => {
    setIsMuted((prev) => !prev)
  }

  const handlePlayTestChime = () => {
    setTestChimeActive(true)
    // Simple Web Audio API synth chime if available
    try {
      if (typeof window !== "undefined" && window.AudioContext) {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = "sine"
        osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1) // A5
        gain.gain.setValueAtTime(
          ((isMuted ? 0 : volume) / 100) * 0.3,
          ctx.currentTime,
        )
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.45)
      }
    } catch (e) {
      // Audio fallback
    }
    setTimeout(() => setTestChimeActive(false), 800)
  }

  const getIconForType = (type) => {
    switch (type) {
      case "order":
        return "orders"
      case "payout":
        return "wallet"
      case "stock":
        return "catalog"
      case "review":
        return "user"
      default:
        return "bell"
    }
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="Notifications & Sound"
        onBack={goBack}
        action={
          <TouchableOpacity onPress={markAllRead} style={styles.markReadBtn}>
            <Text style={styles.markReadText}>Mark all read</Text>
          </TouchableOpacity>
        }
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 19: Notifications & Sound Settings Card */}
        <View style={styles.controlsSection}>
          <Text style={styles.eyebrow}>ALERTS & SOUND SETTINGS</Text>
          <AppCard style={styles.settingsCard}>
            {/* Notification Pause / Resume Control */}
            <View style={styles.controlRow}>
              <View style={styles.controlInfo}>
                <Text style={styles.controlTitle}>
                  Order & App Notifications
                </Text>
                <Text style={styles.controlSub}>
                  {isPaused
                    ? "Notifications are currently PAUSED. You will miss live order alerts."
                    : "Active — Receiving real-time sound and push alerts"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleTogglePause}
                style={[
                  styles.pauseResumeBtn,
                  isPaused ? styles.resumeBtn : styles.pauseBtn,
                ]}
                activeOpacity={0.8}
              >
                <AppIcon
                  name={isPaused ? "clock" : "close"}
                  size={14}
                  color={isPaused ? colors.white : colors.terracotta}
                />
                <Text
                  style={[
                    styles.pauseResumeText,
                    isPaused ? styles.resumeText : styles.pauseText,
                  ]}
                >
                  {isPaused ? "Resume Alerts" : "Pause Alerts"}
                </Text>
              </TouchableOpacity>
            </View>

            {isPaused && (
              <View style={styles.pausedAlertBanner}>
                <AppIcon name="clock" size={14} color="#D97706" />
                <Text style={styles.pausedAlertText}>
                  Incoming orders will not ring while notifications are paused.
                </Text>
              </View>
            )}

            <View style={styles.controlDivider} />

            {/* Sound & Volume Control */}
            <View style={styles.soundControlBlock}>
              <View style={styles.soundHeaderRow}>
                <View style={styles.controlInfo}>
                  <Text style={styles.controlTitle}>
                    Incoming Order Ring Volume
                  </Text>
                  <Text style={styles.controlSub}>
                    {isMuted
                      ? "Muted — No sound chime on new orders"
                      : `Current volume: ${volume}%`}
                  </Text>
                </View>

                {/* Mute / Unmute Button */}
                <TouchableOpacity
                  onPress={handleToggleMute}
                  style={[styles.muteBtn, isMuted && styles.muteBtnActive]}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.muteBtnText,
                      isMuted && styles.muteBtnTextActive,
                    ]}
                  >
                    {isMuted ? "Unmute" : "Mute"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Volume Slider and Buttons */}
              <View style={styles.volumeAdjustRow}>
                <TouchableOpacity
                  onPress={handleVolumeDown}
                  style={styles.volumeStepBtn}
                  disabled={volume <= 0}
                >
                  <Text style={styles.volumeStepText}>−</Text>
                </TouchableOpacity>

                <View style={styles.sliderWrapper}>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      setVolume(Number(e.target.value))
                      if (isMuted) setIsMuted(false)
                    }}
                    style={{
                      width: "100%",
                      accentColor: colors.terracotta,
                      cursor: "pointer",
                    }}
                  />
                  <View style={styles.volPctRow}>
                    <Text style={styles.volPctText}>0%</Text>
                    <Text style={styles.volCurrentPctText}>
                      {isMuted ? "Muted" : `${volume}%`}
                    </Text>
                    <Text style={styles.volPctText}>100%</Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleVolumeUp}
                  style={styles.volumeStepBtn}
                  disabled={volume >= 100}
                >
                  <Text style={styles.volumeStepText}>+</Text>
                </TouchableOpacity>
              </View>

              {/* Test Chime Button */}
              <TouchableOpacity
                onPress={handlePlayTestChime}
                style={[
                  styles.testChimeBtn,
                  testChimeActive && styles.testChimeBtnActive,
                ]}
                activeOpacity={0.8}
              >
                <AppIcon
                  name="bell"
                  size={14}
                  color={testChimeActive ? colors.white : colors.terracotta}
                />
                <Text
                  style={[
                    styles.testChimeText,
                    testChimeActive && styles.testChimeTextActive,
                  ]}
                >
                  {testChimeActive
                    ? "♪ Playing Ring Chime..."
                    : "Test Order Alert Chime"}
                </Text>
              </TouchableOpacity>
            </View>
          </AppCard>
        </View>

        {/* Notifications Feed */}
        <Text style={[styles.eyebrow, { marginTop: 24 }]}>
          NOTIFICATION FEED
        </Text>

        <AppCard style={styles.listCard}>
          {notifications.length === 0 ? (
            <View style={styles.emptyNotifBox}>
              <View style={styles.emptyIconCircle}>
                <AppIcon name="bell" size={28} color={colors.terracotta} />
              </View>
              <Text style={styles.emptyNotifTitle}>No notifications</Text>
              <Text style={styles.emptyNotifSub}>
                You are all caught up! Order updates and store announcements
                will appear here.
              </Text>
            </View>
          ) : (
            notifications.map((notif, idx) => {
              const isUnread = notif.isUnread
              return (
                <View
                  key={notif.id}
                  style={[
                    styles.notifRow,
                    idx === notifications.length - 1 && styles.lastNotifRow,
                  ]}
                >
                  <View
                    style={[
                      styles.notifIconBox,
                      isUnread && styles.notifIconBoxUnread,
                    ]}
                  >
                    <AppIcon
                      name={getIconForType(notif.type)}
                      size={18}
                      color={isUnread ? colors.terracotta : colors.charcoal}
                    />
                  </View>

                  <View style={styles.notifInfo}>
                    <Text style={styles.notifTitle}>{notif.title}</Text>
                    <Text style={styles.notifSub}>{notif.subtitle}</Text>
                    <Text style={styles.notifTime}>{notif.time}</Text>
                  </View>

                  {isUnread && <View style={styles.unreadDot} />}
                </View>
              )
            })
          )}
        </AppCard>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F7F6",
  },
  markReadBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  markReadText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "DM Sans, sans-serif",
    color: colors.terracotta,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
    maxWidth: 720,
    width: "100%",
    marginHorizontal: "auto",
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    letterSpacing: 1.4,
    color: colors.terracotta,
    marginBottom: 8,
  },
  controlsSection: {
    marginBottom: 8,
  },
  settingsCard: {
    padding: 18,
    borderRadius: radius.card,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E6E3E0",
    gap: 14,
  },
  controlRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  controlInfo: {
    flex: 1,
  },
  controlTitle: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
  },
  controlSub: {
    fontSize: 11,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
    marginTop: 2,
    lineHeight: 15,
  },
  pauseResumeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pauseBtn: {
    backgroundColor: "rgba(163, 94, 71, 0.1)",
  },
  resumeBtn: {
    backgroundColor: colors.terracotta,
  },
  pauseResumeText: {
    fontSize: 11.5,
    fontFamily: "Poppins, sans-serif",
    fontWeight: "600",
  },
  pauseText: {
    color: colors.terracotta,
  },
  resumeText: {
    color: colors.white,
  },
  pausedAlertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(217, 119, 6, 0.1)",
    borderRadius: 8,
    padding: 10,
  },
  pausedAlertText: {
    fontSize: 11,
    fontFamily: "DM Sans, sans-serif",
    color: "#B45309",
    fontWeight: "500",
  },
  controlDivider: {
    height: 1,
    backgroundColor: "#F0ECE8",
  },
  soundControlBlock: {
    gap: 12,
  },
  soundHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  muteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F0ECE8",
  },
  muteBtnActive: {
    backgroundColor: "#DC2626",
  },
  muteBtnText: {
    fontSize: 11.5,
    fontFamily: "Poppins, sans-serif",
    fontWeight: "600",
    color: colors.charcoal,
  },
  muteBtnTextActive: {
    color: colors.white,
  },
  volumeAdjustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  volumeStepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F0ECE8",
    justifyContent: "center",
    alignItems: "center",
  },
  volumeStepText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.black,
    lineHeight: 18,
  },
  sliderWrapper: {
    flex: 1,
    gap: 2,
  },
  volPctRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  volPctText: {
    fontSize: 9.5,
    fontFamily: "DM Sans, sans-serif",
    color: colors.warmGrey,
  },
  volCurrentPctText: {
    fontSize: 10,
    fontFamily: "Poppins, sans-serif",
    fontWeight: "600",
    color: colors.terracotta,
  },
  testChimeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(163, 94, 71, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(163, 94, 71, 0.2)",
  },
  testChimeBtnActive: {
    backgroundColor: colors.terracotta,
  },
  testChimeText: {
    fontSize: 11.5,
    fontFamily: "Poppins, sans-serif",
    fontWeight: "600",
    color: colors.terracotta,
  },
  testChimeTextActive: {
    color: colors.white,
  },
  listCard: {
    padding: 2,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "#E6E3E0",
  },
  notifRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0ECE8",
    position: "relative",
    gap: 12,
  },
  lastNotifRow: {
    borderBottomWidth: 0,
  },
  notifIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(156, 154, 154, 0.14)",
    justifyContent: "center",
    alignItems: "center",
  },
  notifIconBoxUnread: {
    backgroundColor: "rgba(163, 94, 71, 0.10)",
  },
  notifInfo: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
  },
  notifSub: {
    fontSize: 10,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
    marginTop: 2,
  },
  notifTime: {
    fontSize: 8.5,
    fontFamily: "DM Sans, sans-serif",
    color: colors.warmGrey,
    marginTop: 4,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.terracotta,
    marginTop: 4,
  },
  emptyNotifBox: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(163, 94, 71, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyNotifTitle: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
    marginBottom: 4,
    textAlign: "center",
  },
  emptyNotifSub: {
    fontSize: 12,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 300,
  },
})

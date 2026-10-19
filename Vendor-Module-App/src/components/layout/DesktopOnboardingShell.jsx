import React, { useState } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Platform,
  Linking,
} from "react-native"
import { colors } from "../../theme/colors"
import { typography } from "../../theme/typography"
import { radius } from "../../theme/radius"
import { AppLogo } from "../common/AppLogo"
import { AppIcon } from "../common/AppIcon"
import { useAppNavigation } from "../../navigation/NavigationContext"
import { useOnboarding } from "../../context/OnboardingContext"
import { useResponsive } from "../../theme/useResponsive"

const ONBOARDING_STEPS = [
  { id: "role", label: "Business Type", num: 1 },
  { id: "phone", label: "Verification", num: 2 },
  { id: "business", label: "Store Info", num: 3 },
  { id: "tax", label: "Tax & Bank", num: 4 },
  { id: "address", label: "Location", num: 5 },
  { id: "kyc", label: "KYC Docs", num: 6 },
  { id: "photos", label: "Store Photos", num: 7 },
  { id: "terms", label: "Agreement", num: 8 },
  { id: "pending", label: "Verification", num: 9 },
  { id: "approved", label: "Live Store", num: 10 },
]

export const DesktopOnboardingShell = ({ children }) => {
  const { currentScreen, navigate } = useAppNavigation()
  const { vendorRole, verificationStatus } = useOnboarding()
  const { isTablet } = useResponsive()
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false)

  const currentStepIndex = ONBOARDING_STEPS.findIndex(
    (s) => s.id === currentScreen,
  )

  const handleStepPress = (stepId) => {
    if (stepId !== 'role' && !vendorRole) {
      navigate('role');
      return;
    }
    navigate(stepId);
  };

  const handlePortalPress = () => {
    if (!vendorRole) {
      navigate('role');
      return;
    }
    navigate(vendorRole === "grocery" ? "grocery-home" : "restaurant-home");
  };

  const handleCallCare = () => {
    const tel = "tel:+918047192800"
    if (
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      Boolean(window.location)
    ) {
      window.location.href = tel
    } else {
      Linking.openURL(tel).catch((err) =>
        console.warn("[Care] Call error:", err),
      )
    }
  }

  const handleEmailSupport = () => {
    const mailto =
      "mailto:partner-support@roadrider.in?subject=RoadRider%20Vendor%20Onboarding%20Help"
    if (
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      Boolean(window.location)
    ) {
      window.location.href = mailto
    } else {
      Linking.openURL(mailto).catch((err) =>
        console.warn("[Support] Email error:", err),
      )
    }
  }

  return (
    <View style={styles.shell}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigate("splash")}
          style={styles.headerLeft}
        >
          <AppLogo />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>PARTNER ONBOARDING</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerRight}>
          {verificationStatus === "verified" && (
            <TouchableOpacity
              style={styles.skipToPortalBtn}
              onPress={handlePortalPress}
            >
              <Text style={styles.skipToPortalText}>Enter Vendor Portal →</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.supportBtn}
            onPress={() => setIsSupportModalOpen(true)}
          >
            <AppIcon name="help" size={16} color={colors.terracotta} />
            <Text style={styles.supportBtnText}>Partner Support</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stepper Progress Bar */}
      {currentStepIndex >= 0 && (
        <View style={styles.stepperContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stepperScroll}
          >
            {ONBOARDING_STEPS.map((step, idx) => {
              const isPast = idx < currentStepIndex
              const isCurrent = idx === currentStepIndex
              const isLocked = idx > 0 && !vendorRole

              return (
                <View
                  key={step.id}
                  style={[styles.stepItem, isLocked && { opacity: 0.55 }]}
                >
                  <TouchableOpacity
                    style={[
                      styles.stepCircle,
                      isCurrent && styles.stepCircleActive,
                      isPast && styles.stepCirclePast,
                    ]}
                    onPress={() => handleStepPress(step.id)}
                    disabled={isLocked}
                  >
                    {isPast ? (
                      <AppIcon
                        name="check"
                        size={13}
                        color={colors.white}
                        strokeWidth={2.5}
                      />
                    ) : (
                      <Text
                        style={[
                          styles.stepNum,
                          isCurrent && styles.stepNumActive,
                          isPast && styles.stepNumPast,
                        ]}
                      >
                        {step.num}
                      </Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleStepPress(step.id)}
                    disabled={isLocked}
                  >
                    <Text
                      style={[
                        styles.stepLabel,
                        isCurrent && styles.stepLabelActive,
                        isPast && styles.stepLabelPast,
                      ]}
                    >
                      {step.label}
                    </Text>
                  </TouchableOpacity>
                  {idx < ONBOARDING_STEPS.length - 1 && (
                    <View
                      style={[
                        styles.stepConnector,
                        isPast && styles.stepConnectorPast,
                      ]}
                    />
                  )}
                </View>
              )
            })}
          </ScrollView>
        </View>
      )}

      {/* Main Split Layout */}
      <View style={[styles.mainContent, isTablet && styles.mainContentTablet]}>
        {/* Left Hero Perks Panel (Desktop >= 1024px) */}
        {!isTablet && (
          <View style={styles.leftPerks}>
            <View style={styles.perkCard}>
              <Text style={styles.perkEyebrow}>ROADRIDER ADVANTAGE</Text>
              <Text style={styles.perkTitle}>
                Grow your {vendorRole === "grocery" ? "grocery" : "restaurant"}{" "}
                business
              </Text>
              <Text style={styles.perkSub}>
                Join over 12,000 verified merchant partners serving high-intent
                local customers daily.
              </Text>

              <View style={styles.perksList}>
                <View style={styles.perkRow}>
                  <View style={styles.checkCircle}>
                    <AppIcon
                      name="check"
                      size={12}
                      color={colors.white}
                      strokeWidth={2.5}
                    />
                  </View>
                  <View style={styles.perkTextGroup}>
                    <Text style={styles.perkHighlight}>
                      Lowest 8% Platform Fee
                    </Text>
                    <Text style={styles.perkDesc}>
                      Keep up to 92% of your sales revenue.
                    </Text>
                  </View>
                </View>

                <View style={styles.perkRow}>
                  <View style={styles.checkCircle}>
                    <AppIcon
                      name="check"
                      size={12}
                      color={colors.white}
                      strokeWidth={2.5}
                    />
                  </View>
                  <View style={styles.perkTextGroup}>
                    <Text style={styles.perkHighlight}>
                      Daily & Monday Settlements
                    </Text>
                    <Text style={styles.perkDesc}>
                      Direct automated bank transfers without delay.
                    </Text>
                  </View>
                </View>

                <View style={styles.perkRow}>
                  <View style={styles.checkCircle}>
                    <AppIcon
                      name="check"
                      size={12}
                      color={colors.white}
                      strokeWidth={2.5}
                    />
                  </View>
                  <View style={styles.perkTextGroup}>
                    <Text style={styles.perkHighlight}>
                      Smart Kitchen & Rider Dispatch
                    </Text>
                    <Text style={styles.perkDesc}>
                      Live order timer, auto-assigned delivery fleet.
                    </Text>
                  </View>
                </View>

                <View style={styles.perkRow}>
                  <View style={styles.checkCircle}>
                    <AppIcon
                      name="check"
                      size={12}
                      color={colors.white}
                      strokeWidth={2.5}
                    />
                  </View>
                  <View style={styles.perkTextGroup}>
                    <Text style={styles.perkHighlight}>
                      1-on-1 Account Manager
                    </Text>
                    <Text style={styles.perkDesc}>
                      Dedicated partner support 7 days a week.
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.securityNote}>
                <AppIcon name="store" size={16} color={colors.charcoal} />
                <Text style={styles.securityText}>
                  Encrypted 256-bit bank verification. RBI compliant.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Right Form Card Panel */}
        <View
          style={[styles.rightFormArea, isTablet && styles.rightFormAreaTablet]}
        >
          <View style={[styles.formCard, isTablet && styles.formCardTablet]}>
            {children}
          </View>
        </View>
      </View>

      {/* Partner Support Modal */}
      <Modal
        visible={isSupportModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSupportModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.supportModalCard}>
            <View style={styles.supportModalHeader}>
              <View style={styles.supportModalHeaderLeft}>
                <View style={styles.supportIconCircle}>
                  <AppIcon name="help" size={20} color={colors.terracotta} />
                </View>
                <View>
                  <Text style={styles.supportModalTitle}>Partner Support</Text>
                  <Text style={styles.supportModalSubtitle}>
                    RoadRider Merchant Help & Escalations
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setIsSupportModalOpen(false)}
                style={styles.modalCloseBtn}
                accessibilityLabel="Close support modal"
              >
                <AppIcon name="close" size={18} color={colors.charcoal} />
              </TouchableOpacity>
            </View>

            <View style={styles.supportModalBody}>
              <Text style={styles.supportIntroText}>
                Need help with your business documents, bank verification, or
                onboarding steps? Our dedicated merchant support desk is
                available to assist you.
              </Text>

              {/* Call Support Option */}
              <View style={styles.supportChannelCard}>
                <View style={styles.supportChannelIconBox}>
                  <AppIcon name="phone" size={18} color={colors.terracotta} />
                </View>
                <View style={styles.supportChannelInfo}>
                  <Text style={styles.supportChannelTitle}>
                    Priority Merchant Helpline
                  </Text>
                  <Text style={styles.supportChannelValue}>
                    +91 80 4719 2800
                  </Text>
                  <Text style={styles.supportChannelNote}>
                    Toll-free • Available 24×7 for partners
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.supportCallBtn}
                  onPress={handleCallCare}
                  activeOpacity={0.8}
                >
                  <Text style={styles.supportCallBtnText}>Call Now</Text>
                </TouchableOpacity>
              </View>

              {/* Email Support Option */}
              <View style={styles.supportChannelCard}>
                <View style={styles.supportChannelIconBox}>
                  <AppIcon name="mail" size={18} color={colors.terracotta} />
                </View>
                <View style={styles.supportChannelInfo}>
                  <Text style={styles.supportChannelTitle}>
                    Merchant Support Email
                  </Text>
                  <Text style={styles.supportChannelValue}>
                    partner-support@roadrider.in
                  </Text>
                  <Text style={styles.supportChannelNote}>
                    Typical response within 2 business hours
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.supportEmailBtn}
                  onPress={handleEmailSupport}
                  activeOpacity={0.8}
                >
                  <Text style={styles.supportEmailBtnText}>Email</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.supportModalFooter}>
              <TouchableOpacity
                style={styles.fullCenterLink}
                onPress={() => {
                  setIsSupportModalOpen(false)
                  navigate("support")
                }}
              >
                <Text style={styles.fullCenterLinkText}>
                  Open Full Support Center & Raise Issue Ticket →
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.background,
    minHeight: "100%",
  },
  topHeader: {
    height: 70,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  badge: {
    backgroundColor: "rgba(163, 94, 71, 0.12)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9.5,
    fontFamily: typography.fonts.headingBold,
    fontWeight: "700",
    color: colors.terracotta,
    letterSpacing: 1.1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  skipToPortalBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  skipToPortalText: {
    fontSize: 12,
    fontFamily: typography.fonts.heading,
    fontWeight: "600",
    color: colors.terracotta,
  },
  supportBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(163, 94, 71, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.button,
    gap: 6,
  },
  supportBtnText: {
    fontSize: 11.5,
    fontFamily: typography.fonts.heading,
    fontWeight: "600",
    color: colors.terracotta,
  },
  stepperContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  stepperScroll: {
    alignItems: "center",
    flexDirection: "row",
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  stepCircleActive: {
    backgroundColor: colors.terracotta,
  },
  stepCirclePast: {
    backgroundColor: "#10B981",
  },
  stepNum: {
    fontSize: 11,
    fontFamily: typography.fonts.headingBold,
    color: colors.charcoal,
    fontWeight: "700",
  },
  stepNumActive: {
    color: colors.white,
  },
  stepNumPast: {
    color: colors.white,
  },
  stepLabel: {
    fontSize: 12,
    fontFamily: typography.fonts.bodyMedium,
    color: colors.warmGrey,
  },
  stepLabelActive: {
    color: colors.black,
    fontFamily: typography.fonts.heading,
    fontWeight: "600",
  },
  stepLabelPast: {
    color: colors.charcoal,
  },
  stepConnector: {
    width: 24,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 10,
  },
  stepConnectorPast: {
    backgroundColor: "#10B981",
  },
  mainContent: {
    flex: 1,
    flexDirection: "row",
    maxWidth: 1280,
    width: "100%",
    alignSelf: "center",
    padding: 32,
    gap: 32,
  },
  mainContentTablet: {
    padding: 20,
    gap: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  rightFormAreaTablet: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  formCardTablet: {
    minHeight: "auto",
  },
  leftPerks: {
    width: 360,
  },
  perkCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: 28,
    borderWidth: 1,
    borderColor: colors.border,
  },
  perkEyebrow: {
    fontSize: 9.5,
    fontFamily: typography.fonts.headingBold,
    fontWeight: "700",
    color: colors.terracotta,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  perkTitle: {
    fontSize: 20,
    fontFamily: typography.fonts.headingBold,
    color: colors.black,
    lineHeight: 26,
    marginBottom: 8,
  },
  perkSub: {
    fontSize: 12.5,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
    lineHeight: 18,
    marginBottom: 24,
  },
  perksList: {
    gap: 16,
    marginBottom: 24,
  },
  perkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.terracotta,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  perkTextGroup: {
    flex: 1,
  },
  perkHighlight: {
    fontSize: 12.5,
    fontFamily: typography.fonts.heading,
    fontWeight: "600",
    color: colors.black,
  },
  perkDesc: {
    fontSize: 11,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
    marginTop: 2,
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    padding: 12,
    borderRadius: radius.button,
    gap: 10,
  },
  securityText: {
    fontSize: 10.5,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
    flex: 1,
    lineHeight: 14,
  },
  rightFormArea: {
    flex: 1,
    justifyContent: "flex-start",
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 620,
    overflow: "hidden",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  supportModalCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    width: "100%",
    maxWidth: 520,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  supportModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: "#FAFAF9",
  },
  supportModalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  supportIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.terracottaLight,
    justifyContent: "center",
    alignItems: "center",
  },
  supportModalTitle: {
    fontSize: 16,
    fontFamily: typography.fonts.heading,
    fontWeight: "700",
    color: colors.black,
  },
  supportModalSubtitle: {
    fontSize: 12,
    fontFamily: typography.fonts.body,
    color: colors.charcoalLight,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: "center",
    alignItems: "center",
  },
  supportModalBody: {
    padding: 22,
    gap: 16,
  },
  supportIntroText: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
  },
  supportChannelCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 14,
    gap: 12,
  },
  supportChannelIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  supportChannelInfo: {
    flex: 1,
  },
  supportChannelTitle: {
    fontSize: 12,
    fontFamily: typography.fonts.heading,
    fontWeight: "600",
    color: colors.charcoalLight,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  supportChannelValue: {
    fontSize: 14,
    fontFamily: typography.fonts.heading,
    fontWeight: "700",
    color: colors.black,
    marginTop: 2,
  },
  supportChannelNote: {
    fontSize: 11,
    fontFamily: typography.fonts.body,
    color: colors.warmGrey,
    marginTop: 2,
  },
  supportCallBtn: {
    backgroundColor: colors.terracotta,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.button,
  },
  supportCallBtnText: {
    color: colors.white,
    fontSize: 12,
    fontFamily: typography.fonts.heading,
    fontWeight: "700",
  },
  supportEmailBtn: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.terracotta,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.button,
  },
  supportEmailBtnText: {
    color: colors.terracotta,
    fontSize: 12,
    fontFamily: typography.fonts.heading,
    fontWeight: "700",
  },
  supportModalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: "#FAFAF9",
    alignItems: "center",
  },
  fullCenterLink: {
    paddingVertical: 4,
  },
  fullCenterLinkText: {
    fontSize: 13,
    fontFamily: typography.fonts.heading,
    fontWeight: "600",
    color: colors.terracotta,
  },
})

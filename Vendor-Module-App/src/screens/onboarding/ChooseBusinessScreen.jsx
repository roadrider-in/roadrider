import React, { useState } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native"
import { colors } from "../../theme/colors"
import { radius } from "../../theme/radius"
import { AppHeader } from "../../components/common/AppHeader"
import { AppLogo } from "../../components/common/AppLogo"
import { AppIcon } from "../../components/common/AppIcon"
import { AppCard } from "../../components/common/AppCard"
import { AppButton } from "../../components/common/AppButton"
import { useResponsive } from "../../theme/useResponsive"
import { useAppNavigation } from "../../navigation/NavigationContext"
import { useOnboarding } from "../../context/OnboardingContext"
import { useVendor } from "../../context/VendorContext"

export const ChooseBusinessScreen = () => {
  const { navigate, goBack } = useAppNavigation()
  const { vendorRole, setVendorRole } = useOnboarding()
  const { setVendorType } = useVendor()
  const { isMobile } = useResponsive()

  // Neither option selected by default if vendorRole is null
  const [selectedRole, setSelectedRole] = useState(
    vendorRole === "restaurant" || vendorRole === "grocery" ? vendorRole : null,
  )

  const handleSelectRole = (role) => {
    setSelectedRole(role)
  }

  const handleContinue = () => {
    if (
      !selectedRole ||
      (selectedRole !== "restaurant" && selectedRole !== "grocery")
    ) {
      return
    }
    setVendorRole(selectedRole)
    setVendorType(selectedRole)
    navigate('phone')
  }

  const isSelected = (role) => selectedRole === role

  return (
    <View style={styles.container}>
      {isMobile && (
        <AppHeader onBack={goBack} action={<View style={{ width: 40 }} />} />
      )}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          !isMobile && styles.scrollContentDesktop,
        ]}
      >
        <View style={styles.topSection}>
          {isMobile && (
            <View style={styles.brandRow}>
              <AppLogo />
            </View>
          )}

          <View style={styles.headingSection}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>
                STEP 1 OF 10 • BUSINESS TYPE
              </Text>
            </View>
            <Text style={styles.title}>What kind of business do you run?</Text>
            <Text style={styles.subtitle}>
              Choose your merchant profile. Select one option below to activate
              your tailored portal workflows.
            </Text>
          </View>

          <View style={styles.cardsContainer}>
            {/* Restaurant Vendor Option */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleSelectRole("restaurant")}
              style={styles.cardTouchWrapper}
            >
              <AppCard
                style={[
                  styles.roleCard,
                  isSelected("restaurant") && styles.roleCardSelected,
                ]}
              >
                <View
                  style={[
                    styles.roleIconBox,
                    isSelected("restaurant") && styles.roleIconBoxSelected,
                  ]}
                >
                  <AppIcon
                    name="orders"
                    size={26}
                    color={
                      isSelected("restaurant") ? "#059669" : colors.charcoal
                    }
                  />
                </View>
                <View style={styles.roleInfo}>
                  <View style={styles.titleRow}>
                    <Text style={styles.roleTitle}>Restaurant Vendor</Text>
                    {isSelected("restaurant") && (
                      <View style={styles.selectedPill}>
                        <Text style={styles.selectedPillText}>SELECTED</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.roleDesc}>
                    Manage dine-in/takeaway orders, live kitchen menus, prep
                    times & rider dispatch
                  </Text>
                </View>

                {/* Radio selection indicator */}
                <View
                  style={[
                    styles.radioIndicator,
                    isSelected("restaurant") && styles.radioIndicatorSelected,
                  ]}
                >
                  {isSelected("restaurant") && (
                    <AppIcon
                      name="check"
                      size={12}
                      color="#FFFFFF"
                      strokeWidth={3}
                    />
                  )}
                </View>
              </AppCard>
            </TouchableOpacity>

            {/* Grocery Vendor Option */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleSelectRole("grocery")}
              style={styles.cardTouchWrapper}
            >
              <AppCard
                style={[
                  styles.roleCard,
                  isSelected("grocery") && styles.roleCardSelected,
                ]}
              >
                <View
                  style={[
                    styles.roleIconBox,
                    isSelected("grocery") && styles.roleIconBoxSelected,
                  ]}
                >
                  <AppIcon
                    name="catalog"
                    size={26}
                    color={isSelected("grocery") ? "#059669" : colors.charcoal}
                  />
                </View>
                <View style={styles.roleInfo}>
                  <View style={styles.titleRow}>
                    <Text style={styles.roleTitle}>Grocery Vendor</Text>
                    {isSelected("grocery") && (
                      <View style={styles.selectedPill}>
                        <Text style={styles.selectedPillText}>SELECTED</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.roleDesc}>
                    Manage packaged goods catalog, inventory tracking, picking
                    lists & bulk imports
                  </Text>
                </View>

                {/* Radio selection indicator */}
                <View
                  style={[
                    styles.radioIndicator,
                    isSelected("grocery") && styles.radioIndicatorSelected,
                  ]}
                >
                  {isSelected("grocery") && (
                    <AppIcon
                      name="check"
                      size={12}
                      color="#FFFFFF"
                      strokeWidth={3}
                    />
                  )}
                </View>
              </AppCard>
            </TouchableOpacity>
          </View>
        </View>

        {/* Action & Footer Section */}
        <View style={styles.bottomSection}>
          {/* Explicit Continue Action */}
          <View style={styles.continueSection}>
            <AppButton
              onPress={handleContinue}
              disabled={!selectedRole}
              style={[
                styles.continueBtn,
                !selectedRole
                  ? styles.continueBtnDisabled
                  : styles.continueBtnActive,
              ]}
            >
              {selectedRole
                ? `Continue as ${
                    selectedRole === "restaurant" ? "Restaurant" : "Grocery"
                  } Vendor →`
                : "Select an Option to Continue"}
            </AppButton>

            {/* Validation helper notice */}
            {!selectedRole ? (
              <View style={styles.noticeBox}>
                <View style={styles.noticeDot} />
                <Text style={styles.noticeText}>
                  Please choose either Restaurant Vendor or Grocery Vendor to
                  proceed.
                </Text>
              </View>
            ) : (
              <View style={styles.noticeBoxSuccess}>
                <AppIcon
                  name="check"
                  size={13}
                  color="#059669"
                  strokeWidth={2.5}
                />
                <Text style={styles.noticeTextSuccess}>
                  Profile selected. Click continue to verify your phone number.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Already registered?{" "}
              <Text
                style={styles.signInLink}
                onPress={() => navigate("signin")}
              >
                Sign in to Vendor Portal
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    padding: 24,
    flexGrow: 1,
    justifyContent: "space-between",
  },
  scrollContentDesktop: {
    padding: 40,
    maxWidth: 720,
    alignSelf: "center",
    width: "100%",
  },
  topSection: {
    width: "100%",
  },
  brandRow: {
    marginBottom: 20,
  },
  headingSection: {
    marginBottom: 28,
  },
  stepBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(5, 150, 105, 0.2)",
    marginBottom: 12,
  },
  stepBadgeText: {
    fontSize: 9.5,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    letterSpacing: 1.2,
    color: "#065F46",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: "#111827",
    lineHeight: 30,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13.5,
    fontFamily: "DM Sans, sans-serif",
    color: "#4B5563",
    lineHeight: 20,
  },
  cardsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  cardTouchWrapper: {
    width: "100%",
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    minHeight: 96,
    borderWidth: 1.5,
    borderColor: "rgba(156, 154, 154, 0.22)",
    backgroundColor: colors.white,
    borderRadius: 14,
    transition: "all 0.15s ease-in-out",
  },
  roleCardSelected: {
    borderColor: "#059669",
    backgroundColor: "#F0FDF4",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  roleIconBox: {
    width: 52,
    height: 52,
    borderRadius: radius.card,
    backgroundColor: "rgba(156, 154, 154, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  roleIconBoxSelected: {
    backgroundColor: "#DCFCE7",
  },
  roleInfo: {
    flex: 1,
    marginRight: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: "#111827",
  },
  selectedPill: {
    backgroundColor: "#059669",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  selectedPillText: {
    fontSize: 8,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.white,
    letterSpacing: 0.8,
  },
  roleDesc: {
    fontSize: 12,
    fontFamily: "DM Sans, sans-serif",
    color: "#4B5563",
    lineHeight: 17,
  },
  radioIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    backgroundColor: colors.white,
    justifyContent: "center",
    alignItems: "center",
  },
  radioIndicatorSelected: {
    borderColor: "#059669",
    backgroundColor: "#059669",
  },

  // Bottom & Continue Section
  bottomSection: {
    marginTop: 20,
    width: "100%",
  },
  continueSection: {
    width: "100%",
    gap: 12,
    marginBottom: 16,
  },
  continueBtn: {
    minHeight: 50,
    width: "100%",
    borderRadius: 10,
  },
  continueBtnActive: {
    backgroundColor: "#059669",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  continueBtnDisabled: {
    backgroundColor: "#E5E7EB",
    opacity: 0.65,
  },
  noticeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 4,
  },
  noticeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#9CA3AF",
  },
  noticeText: {
    fontSize: 12,
    fontFamily: "DM Sans, sans-serif",
    color: "#6B7280",
    textAlign: "center",
  },
  noticeBoxSuccess: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 4,
  },
  noticeTextSuccess: {
    fontSize: 12,
    fontFamily: "DM Sans, sans-serif",
    color: "#065F46",
    fontWeight: "500",
    textAlign: "center",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  footerText: {
    fontSize: 12.5,
    fontFamily: "DM Sans, sans-serif",
    color: "#4B5563",
  },
  signInLink: {
    color: "#059669",
    fontWeight: "700",
  },
})

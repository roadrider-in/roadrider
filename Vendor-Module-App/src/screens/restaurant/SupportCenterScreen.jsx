import React, { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
} from "react-native"
import { colors } from "../../theme/colors"
import { radius } from "../../theme/radius"
import { AppHeader } from "../../components/common/AppHeader"
import { AppCard } from "../../components/common/AppCard"
import { AppButton } from "../../components/common/AppButton"
import { AppInput } from "../../components/common/AppInput"
import { AppIcon } from "../../components/common/AppIcon"
import { useAppNavigation } from "../../navigation/NavigationContext"

export const SupportCenterScreen = () => {
  const { goBack } = useAppNavigation()

  // Raise Issue Form State
  const [issueCategory, setIssueCategory] = useState("Order & Kitchen Issues")
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [errors, setErrors] = useState({})
  const [successTicket, setSuccessTicket] = useState(null)

  // Tickets List State (real vendors start with empty tickets list)
  const [tickets, setTickets] = useState([])

  const categories = [
    "Order & Kitchen Issues",
    "Payout & Settlement",
    "Menu & Catalog Updates",
    "Delivery Rider Delay",
    "Account & KYC Compliance",
    "App / Technical Support",
  ]

  const handleCallCare = () => {
    Linking.openURL("tel:+918047192800").catch((err) => {
      console.warn("Cannot open phone dialer:", err)
    })
  }

  const handleEmailSupport = () => {
    Linking.openURL(
      "mailto:partner-support@roadrider.in?subject=RoadRider%20Vendor%20Partner%20Query",
    ).catch((err) => {
      console.warn("Cannot open email app:", err)
    })
  }

  const handleSubmitIssue = () => {
    const errs = {}
    if (!subject.trim()) {
      errs.subject = "Please enter an issue subject"
    }
    if (!description.trim()) {
      errs.description = "Please provide details of your issue"
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    const ticketId = `TK-${Math.floor(1000 + Math.random() * 9000)}`
    const newTicket = {
      id: ticketId,
      category: issueCategory,
      subject: subject.trim(),
      createdAt: "Just now",
      status: "Under Review",
    }

    setTickets([newTicket, ...tickets])
    setSuccessTicket(ticketId)
    setSubject("")
    setDescription("")
    setErrors({})
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Help & Partner Support" onBack={goBack} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Customer Care Hotline & Email Cards */}
        <View style={styles.sectionHeader}>
          <Text style={styles.eyebrow}>CUSTOMER CARE & HOTLINE</Text>
          <Text style={styles.sectionSubtitle}>
            Direct escalation channels for priority merchant support and
            emergency delivery issues.
          </Text>
        </View>

        <View style={styles.contactCardsRow}>
          {/* Phone Card */}
          <AppCard style={styles.contactCard}>
            <View style={styles.contactIconCircle}>
              <AppIcon name="phone" size={20} color={colors.terracotta} />
            </View>
            <View style={styles.contactCardBody}>
              <Text style={styles.contactTitle}>Priority Partner Helpline</Text>
              <Text style={styles.contactValue}>+91 80 4719 2800</Text>
              <Text style={styles.contactNote}>
                Available 24×7 for active live orders
              </Text>
            </View>
            <AppButton onPress={handleCallCare} style={styles.contactActionBtn}>
              Call Support Now
            </AppButton>
          </AppCard>

          {/* Email Card */}
          <AppCard style={styles.contactCard}>
            <View style={styles.contactIconCircle}>
              <AppIcon name="mail" size={20} color={colors.terracotta} />
            </View>
            <View style={styles.contactCardBody}>
              <Text style={styles.contactTitle}>Merchant Support Email</Text>
              <Text style={styles.contactValue}>
                partner-support@roadrider.in
              </Text>
              <Text style={styles.contactNote}>
                Typical response within 2 business hours
              </Text>
            </View>
            <AppButton
              secondary
              onPress={handleEmailSupport}
              style={styles.contactActionBtn}
            >
              Draft Email
            </AppButton>
          </AppCard>
        </View>

        {/* Section: Register Complaint / Raise Issue Form */}
        <View style={[styles.sectionHeader, { marginTop: 28 }]}>
          <Text style={styles.eyebrow}>REGISTER COMPLAINT / RAISE ISSUE</Text>
          <Text style={styles.sectionSubtitle}>
            Submit an operational, billing or catalog issue. A support ticket
            will be created immediately.
          </Text>
        </View>

        <AppCard style={styles.issueFormCard}>
          {successTicket && (
            <View style={styles.successBanner}>
              <AppIcon
                name="check"
                size={16}
                color="#059669"
                strokeWidth={2.8}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.successTitle}>
                  Ticket #{successTicket} Registered!
                </Text>
                <Text style={styles.successSub}>
                  Our vendor support lead has been notified. You can track
                  status below.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSuccessTicket(null)}>
                <AppIcon name="close" size={14} color="#059669" />
              </TouchableOpacity>
            </View>
          )}

          {/* Issue Category Chips */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Issue Category *</Text>
            <View style={styles.categoryPills}>
              {categories.map((cat) => {
                const isSelected = issueCategory === cat
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setIssueCategory(cat)}
                    style={[
                      styles.categoryPill,
                      isSelected && styles.categoryPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        isSelected && styles.categoryPillTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* Subject Field */}
          <AppInput
            label="Subject / Summary *"
            value={subject}
            onChangeText={(text) => {
              setSubject(text)
              if (errors.subject)
                setErrors((prev) => ({ ...prev, subject: undefined }))
            }}
            placeholder="e.g. Order payout deduction discrepancy for June 15"
            error={errors.subject}
          />

          {/* Description Field */}
          <AppInput
            label="Detailed Description *"
            value={description}
            onChangeText={(text) => {
              setDescription(text)
              if (errors.description)
                setErrors((prev) => ({ ...prev, description: undefined }))
            }}
            placeholder="Describe what occurred, affected order number(s), or required changes..."
            multiline
            numberOfLines={4}
            error={errors.description}
          />

          <AppButton onPress={handleSubmitIssue} style={styles.submitTicketBtn}>
            Submit Issue Ticket
          </AppButton>
        </AppCard>

        {/* Section: My Support Tickets */}
        <View style={[styles.sectionHeader, { marginTop: 28 }]}>
          <Text style={styles.eyebrow}>MY SUPPORT TICKETS</Text>
          <Text style={styles.sectionSubtitle}>
            Recent complaints and queries submitted by your store outlet.
          </Text>
        </View>

        <AppCard style={styles.ticketsCard}>
          {tickets.length === 0 ? (
            <View style={styles.emptyTicketsBox}>
              <View style={styles.emptyIconCircle}>
                <AppIcon name="chat" size={30} color={colors.terracotta} />
              </View>
              <Text style={styles.emptyTicketsTitle}>
                No support tickets raised yet
              </Text>
              <Text style={styles.emptyTicketsSub}>
                Have a question or operational concern? Submit an issue using
                the form above or reach our helpline directly.
              </Text>
            </View>
          ) : (
            tickets.map((t, idx) => (
              <View
                key={t.id}
                style={[
                  styles.ticketRow,
                  idx === tickets.length - 1 && styles.lastTicketRow,
                ]}
              >
                <View style={styles.ticketLeft}>
                  <View style={styles.ticketTopRow}>
                    <Text style={styles.ticketId}>#{t.id}</Text>
                    <View style={styles.ticketCategoryPill}>
                      <Text style={styles.ticketCategoryText}>
                        {t.category}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.ticketSubject}>{t.subject}</Text>
                  <Text style={styles.ticketDate}>Opened: {t.createdAt}</Text>
                </View>

                <View
                  style={[
                    styles.ticketStatusBadge,
                    t.status === "Resolved"
                      ? styles.statusResolved
                      : styles.statusInReview,
                  ]}
                >
                  <Text
                    style={[
                      styles.ticketStatusText,
                      t.status === "Resolved"
                        ? styles.statusTextResolved
                        : styles.statusTextInReview,
                    ]}
                  >
                    {t.status}
                  </Text>
                </View>
              </View>
            ))
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
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
    maxWidth: 760,
    width: "100%",
    marginHorizontal: "auto",
  },
  sectionHeader: {
    marginBottom: 10,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    letterSpacing: 1.4,
    color: colors.terracotta,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
    lineHeight: 16,
  },
  contactCardsRow: {
    gap: 12,
  },
  contactCard: {
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E6E3E0",
    gap: 10,
  },
  contactIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(163, 94, 71, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  contactCardBody: {
    gap: 2,
  },
  contactTitle: {
    fontSize: 11,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
    fontWeight: "500",
  },
  contactValue: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
  },
  contactNote: {
    fontSize: 10,
    fontFamily: "DM Sans, sans-serif",
    color: colors.warmGrey,
  },
  contactActionBtn: {
    minHeight: 40,
    marginTop: 4,
  },
  issueFormCard: {
    padding: 20,
    borderRadius: radius.card,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E6E3E0",
    gap: 16,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "#10B981",
    borderRadius: radius.card,
    padding: 12,
  },
  successTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: "#059669",
  },
  successSub: {
    fontSize: 11,
    fontFamily: "DM Sans, sans-serif",
    color: "#065F46",
    marginTop: 1,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
  },
  categoryPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "#F3F0EC",
    borderWidth: 1,
    borderColor: "#E2DED9",
  },
  categoryPillActive: {
    backgroundColor: colors.terracotta,
    borderColor: colors.terracotta,
  },
  categoryPillText: {
    fontSize: 11,
    fontFamily: "Poppins, sans-serif",
    fontWeight: "600",
    color: colors.charcoal,
  },
  categoryPillTextActive: {
    color: colors.white,
  },
  submitTicketBtn: {
    minHeight: 46,
  },
  ticketsCard: {
    padding: 0,
    borderRadius: radius.card,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E6E3E0",
    overflow: "hidden",
  },
  ticketRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0ECE8",
    gap: 12,
  },
  lastTicketRow: {
    borderBottomWidth: 0,
  },
  ticketLeft: {
    flex: 1,
    gap: 3,
  },
  ticketTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ticketId: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
  },
  ticketCategoryPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "#F0ECE8",
  },
  ticketCategoryText: {
    fontSize: 9.5,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
  },
  ticketSubject: {
    fontSize: 12.5,
    fontWeight: "600",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
    marginTop: 2,
  },
  ticketDate: {
    fontSize: 10,
    fontFamily: "DM Sans, sans-serif",
    color: colors.warmGrey,
  },
  ticketStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusInReview: {
    backgroundColor: "rgba(163, 94, 71, 0.12)",
  },
  statusResolved: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  ticketStatusText: {
    fontSize: 10,
    fontFamily: "Poppins, sans-serif",
    fontWeight: "700",
  },
  statusTextInReview: {
    color: colors.terracotta,
  },
  statusTextResolved: {
    color: "#059669",
  },
  emptyTicketsBox: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  emptyTicketsTitle: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
    marginTop: 10,
    marginBottom: 6,
    textAlign: "center",
  },
  emptyTicketsSub: {
    fontSize: 12,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 340,
  },
})

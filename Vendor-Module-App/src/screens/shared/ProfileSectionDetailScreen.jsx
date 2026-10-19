import React, { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native"
import { colors } from "../../theme/colors"
import { radius } from "../../theme/radius"
import { AppHeader } from "../../components/common/AppHeader"
import { AppButton } from "../../components/common/AppButton"
import { AppInput } from "../../components/common/AppInput"
import { AppCard } from "../../components/common/AppCard"
import { AppIcon } from "../../components/common/AppIcon"
import { DocumentUploader } from "../../components/common/DocumentUploader"
import { useAppNavigation } from "../../navigation/NavigationContext"
import { useOnboarding } from "../../context/OnboardingContext"

export const ProfileSectionDetailScreen = ({ section = "business" }) => {
  const { goBack, navigate } = useAppNavigation()
  const {
    vendorRole,
    businessDetails,
    setBusinessDetails,
    kycDocuments,
    updateKycDoc,
    removeKycDoc,
    kitchenPhotos,
    updateKitchenPhoto,
    removeKitchenPhoto,
    storefrontPhoto,
    setStorefrontPhoto,
    businessLogo,
    setBusinessLogo,
    addressDetails,
    setAddressDetails,
    setVerificationStatus,
  } = useOnboarding()

  const [isEditing, setIsEditing] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Business Form State
  const [ownerName, setOwnerName] = useState(businessDetails?.ownerName || "")
  const [businessName, setBusinessName] = useState(
    businessDetails?.businessName || "",
  )
  const [businessType, setBusinessType] = useState(
    businessDetails?.businessType || "Restaurant",
  )
  const [email, setEmail] = useState(businessDetails?.email || "")

  // Address Form State
  const [address, setAddress] = useState(addressDetails?.address || "")
  const [city, setCity] = useState(addressDetails?.city || "Bengaluru")
  const [radiusKm, setRadiusKm] = useState(addressDetails?.serviceRadiusKm || 6)

  const handleSaveBusiness = () => {
    setBusinessDetails({
      ownerName,
      businessName,
      businessType,
      email,
    })
    setIsEditing(false)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  const handleSaveLocation = () => {
    setAddressDetails({
      address,
      city,
      serviceRadiusKm: radiusKm,
    })
    setIsEditing(false)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  const handleSaveKyc = () => {
    // When KYC changes, status changes to Waiting for Approval (Item 18)
    setVerificationStatus("waiting")
    setIsEditing(false)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  const handleSavePhotos = () => {
    setVerificationStatus("waiting")
    setIsEditing(false)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  // Section titles
  const sectionMeta = {
    business: {
      title: "Business Details",
      subtitle: "Official ownership, merchant registration and contact details",
    },
    kyc: {
      title: "KYC & Regulatory Documents",
      subtitle: "Verified government identity, FSSAI and tax credentials",
    },
    photos: {
      title: "Store Photos & Branding",
      subtitle:
        vendorRole === "grocery"
          ? "Storefront exterior and merchant brand logo"
          : "Kitchen interior, storefront exterior and brand logo",
    },
    location: {
      title: "Location & Service Radius",
      subtitle: "Outlet physical address and customer delivery radius",
    },
  }

  const currentMeta = sectionMeta[section] || sectionMeta.business

  return (
    <View style={styles.container}>
      <AppHeader
        title={currentMeta.title}
        onBack={goBack}
        action={
          !isEditing ? (
            <TouchableOpacity
              style={styles.editHeaderBtn}
              onPress={() => setIsEditing(true)}
            >
              <AppIcon name="edit" size={16} color={colors.terracotta} />
              <Text style={styles.editHeaderText}>Edit</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Alert */}
        {saveSuccess && (
          <View style={styles.successBanner}>
            <AppIcon name="check" size={16} color="#059669" strokeWidth={2.8} />
            <Text style={styles.successText}>Changes saved successfully!</Text>
          </View>
        )}

        {/* Section Intro */}
        <View style={styles.introHeader}>
          <Text style={styles.eyebrow}>STORE SETTINGS</Text>
          <Text style={styles.pageTitle}>{currentMeta.title}</Text>
          <Text style={styles.pageSub}>{currentMeta.subtitle}</Text>
        </View>

        {/* ================= SECTION 1: BUSINESS DETAILS ================= */}
        {section === "business" && (
          <AppCard style={styles.card}>
            {isEditing ? (
              <View style={styles.formStack}>
                <AppInput
                  label="Owner / Proprietor Name *"
                  value={ownerName}
                  onChangeText={setOwnerName}
                />
                <AppInput
                  label="Registered Business Name *"
                  value={businessName}
                  onChangeText={setBusinessName}
                />
                <AppInput
                  label="Business Category *"
                  value={businessType}
                  onChangeText={setBusinessType}
                />
                <AppInput
                  label="Official Email Address *"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                />

                <View style={styles.editActionRow}>
                  <AppButton
                    secondary
                    onPress={() => setIsEditing(false)}
                    style={styles.halfBtn}
                  >
                    Cancel
                  </AppButton>
                  <AppButton
                    onPress={handleSaveBusiness}
                    style={styles.halfBtn}
                  >
                    Save Changes
                  </AppButton>
                </View>
              </View>
            ) : (
              <View style={styles.viewStack}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Owner Name</Text>
                  <Text style={styles.infoValue}>
                    {businessDetails?.ownerName || "—"}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Business Name</Text>
                  <Text style={styles.infoValue}>
                    {businessDetails?.businessName || "—"}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Business Type</Text>
                  <Text style={styles.infoValue}>
                    {businessDetails?.businessType || "—"}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email Address</Text>
                  <Text style={styles.infoValue}>
                    {businessDetails?.email || "—"}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Account Status</Text>
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>Verified Active</Text>
                  </View>
                </View>

                <AppButton
                  secondary
                  onPress={() => setIsEditing(true)}
                  style={{ marginTop: 18 }}
                  icon={
                    <AppIcon name="edit" size={16} color={colors.charcoal} />
                  }
                >
                  Edit Business Details
                </AppButton>
              </View>
            )}
          </AppCard>
        )}

        {/* ================= SECTION 2: KYC DOCUMENTS ================= */}
        {section === "kyc" && (
          <AppCard style={styles.card}>
            <View style={styles.docNotice}>
              <AppIcon name="shield" size={16} color={colors.terracotta} />
              <Text style={styles.docNoticeText}>
                Modifying verified documents will place your profile into
                "Waiting for Approval" until verified by compliance.
              </Text>
            </View>

            <View style={styles.docList}>
              {Object.entries(kycDocuments).map(([key, doc]) => (
                <View key={key} style={styles.docItem}>
                  <Text style={styles.docItemLabel}>{doc.label}</Text>
                  {isEditing ? (
                    <DocumentUploader
                      label={doc.label}
                      document={doc.name ? doc : null}
                      onUploadSuccess={(fileData) =>
                        updateKycDoc(key, fileData)
                      }
                      onRemove={() => removeKycDoc(key)}
                    />
                  ) : (
                    <View style={styles.readOnlyDocRow}>
                      <View style={styles.docBadge}>
                        <AppIcon
                          name="file"
                          size={16}
                          color={colors.charcoal}
                        />
                        <Text style={styles.docFileName} numberOfLines={1}>
                          {doc.name || "Not uploaded"}
                        </Text>
                      </View>
                      <View style={styles.statusVerifiedBadge}>
                        <Text style={styles.statusVerifiedText}>
                          {doc.name ? "Verified" : "Pending"}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>

            {isEditing ? (
              <View
                style={[
                  styles.editActionRow,
                  isMobile && styles.editActionRowMobile,
                ]}
              >
                <AppButton
                  secondary
                  onPress={() => setIsEditing(false)}
                  style={isMobile ? styles.fullBtn : styles.halfBtn}
                >
                  Cancel
                </AppButton>
                <AppButton
                  onPress={handleSaveKyc}
                  style={isMobile ? styles.fullBtn : styles.halfBtn}
                >
                  Save & Submit Documents
                </AppButton>
              </View>
            ) : (
              <AppButton
                secondary
                onPress={() => setIsEditing(true)}
                style={{ marginTop: 20 }}
                icon={<AppIcon name="edit" size={16} color={colors.charcoal} />}
              >
                Update KYC Documents
              </AppButton>
            )}
          </AppCard>
        )}

        {/* ================= SECTION 3: STORE PHOTOS ================= */}
        {section === "photos" && (
          <AppCard style={styles.card}>
            {/* Restaurant Kitchen Photos (Strictly 3 photos, NOT shown for Grocery) */}
            {vendorRole === "restaurant" && (
              <View style={styles.photoBlock}>
                <Text style={styles.blockTitle}>Upload 3 Kitchen Photos</Text>
                <Text style={styles.blockSub}>
                  Upload 3 clear photos of your kitchen interior.
                </Text>

                <View style={styles.kitchenPhotosGrid}>
                  {[0, 1, 2].map((idx) => {
                    const photo = kitchenPhotos[idx]
                    return (
                      <View key={idx} style={styles.kitchenSlot}>
                        <Text style={styles.slotLabel}>
                          Kitchen Photo #{idx + 1} *
                        </Text>
                        {isEditing ? (
                          <DocumentUploader
                            label={`Kitchen Photo ${idx + 1}`}
                            fileData={photo}
                            onUploadSuccess={(data) =>
                              updateKitchenPhoto(idx, data)
                            }
                            onRemove={() => removeKitchenPhoto(idx)}
                          />
                        ) : (
                          <View style={styles.photoPreviewCard}>
                            <AppIcon
                              name="camera"
                              size={20}
                              color={colors.terracotta}
                            />
                            <Text style={styles.previewName}>
                              {photo?.name || "Photo uploaded"}
                            </Text>
                          </View>
                        )}
                      </View>
                    )
                  })}
                </View>
              </View>
            )}

            {/* Storefront Photo (Optional for both) */}
            <View style={styles.photoBlock}>
              <Text style={styles.blockTitle}>Storefront Photo (Optional)</Text>
              {isEditing ? (
                <DocumentUploader
                  label="Storefront Exterior Photo"
                  fileData={storefrontPhoto}
                  onUploadSuccess={(data) => setStorefrontPhoto(data)}
                  onRemove={() => setStorefrontPhoto(null)}
                />
              ) : (
                <View style={styles.photoPreviewCard}>
                  <AppIcon name="store" size={20} color={colors.terracotta} />
                  <Text style={styles.previewName}>
                    {storefrontPhoto?.name || "Storefront exterior uploaded"}
                  </Text>
                </View>
              )}
            </View>

            {/* Business Logo (Optional for both) */}
            <View style={styles.photoBlock}>
              <Text style={styles.blockTitle}>Business Logo (Optional)</Text>
              {isEditing ? (
                <DocumentUploader
                  label="Store Logo"
                  fileData={businessLogo}
                  onUploadSuccess={(data) => setBusinessLogo(data)}
                  onRemove={() => setBusinessLogo(null)}
                />
              ) : (
                <View style={styles.photoPreviewCard}>
                  <AppIcon name="camera" size={20} color={colors.charcoal} />
                  <Text style={styles.previewName}>
                    {businessLogo?.name || "No custom logo uploaded"}
                  </Text>
                </View>
              )}
            </View>

            {isEditing ? (
              <View style={styles.editActionRow}>
                <AppButton
                  secondary
                  onPress={() => setIsEditing(false)}
                  style={styles.halfBtn}
                >
                  Cancel
                </AppButton>
                <AppButton onPress={handleSavePhotos} style={styles.halfBtn}>
                  Save Photos
                </AppButton>
              </View>
            ) : (
              <AppButton
                secondary
                onPress={() => setIsEditing(true)}
                style={{ marginTop: 20 }}
                icon={<AppIcon name="edit" size={16} color={colors.charcoal} />}
              >
                Edit Store Photos
              </AppButton>
            )}
          </AppCard>
        )}

        {/* ================= SECTION 4: LOCATION & RADIUS ================= */}
        {section === "location" && (
          <AppCard style={styles.card}>
            {isEditing ? (
              <View style={styles.formStack}>
                <AppInput
                  label="Store Address *"
                  value={address}
                  onChangeText={setAddress}
                  multiline
                  numberOfLines={2}
                />
                <AppInput label="City *" value={city} onChangeText={setCity} />

                {/* Interactive Slider & +/- for Radius */}
                <View style={styles.radiusControlBox}>
                  <Text style={styles.radiusControlLabel}>Service Radius</Text>
                  <View style={styles.radiusDisplayRow}>
                    <TouchableOpacity
                      onPress={() => setRadiusKm(Math.max(1, radiusKm - 1))}
                      style={styles.radiusStepBtn}
                    >
                      <Text style={styles.stepBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.radiusValText}>{radiusKm} km</Text>
                    <TouchableOpacity
                      onPress={() => setRadiusKm(Math.min(20, radiusKm + 1))}
                      style={styles.radiusStepBtn}
                    >
                      <Text style={styles.stepBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>

                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value))}
                    style={{
                      width: "100%",
                      maxWidth: "100%",
                      boxSizing: "border-box",
                      marginTop: 14,
                      accentColor: colors.terracotta,
                      cursor: "pointer",
                    }}
                  />
                  <View style={styles.sliderMinMax}>
                    <Text style={styles.minMaxText}>1 km</Text>
                    <Text style={styles.minMaxText}>20 km</Text>
                  </View>
                </View>

                <View style={styles.editActionRow}>
                  <AppButton
                    secondary
                    onPress={() => setIsEditing(false)}
                    style={styles.halfBtn}
                  >
                    Cancel
                  </AppButton>
                  <AppButton
                    onPress={handleSaveLocation}
                    style={styles.halfBtn}
                  >
                    Save Location
                  </AppButton>
                </View>
              </View>
            ) : (
              <View style={styles.viewStack}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Address</Text>
                  <Text style={styles.infoValue}>
                    {addressDetails?.address || "—"}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>City</Text>
                  <Text style={styles.infoValue}>
                    {addressDetails?.city || "—"}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Delivery Radius</Text>
                  <Text style={styles.infoValue}>
                    {addressDetails?.serviceRadiusKm
                      ? `${addressDetails.serviceRadiusKm} km coverage`
                      : "—"}
                  </Text>
                </View>

                <AppButton
                  secondary
                  onPress={() => setIsEditing(true)}
                  style={{ marginTop: 20 }}
                  icon={
                    <AppIcon name="edit" size={16} color={colors.charcoal} />
                  }
                >
                  Edit Location & Service Radius
                </AppButton>
              </View>
            )}
          </AppCard>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F7F6",
  },
  editHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editHeaderText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Poppins, sans-serif",
    color: colors.terracotta,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    maxWidth: 720,
    width: "100%",
    marginHorizontal: "auto",
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "#10B981",
    borderRadius: radius.card,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Poppins, sans-serif",
    color: "#059669",
  },
  introHeader: {
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    letterSpacing: 1.4,
    color: colors.terracotta,
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
    marginBottom: 4,
  },
  pageSub: {
    fontSize: 12.5,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
  },
  card: {
    padding: 20,
    borderRadius: radius.card,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E8E5E2",
  },
  viewStack: {
    gap: 12,
  },
  formStack: {
    gap: 14,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
  },
  infoValue: {
    fontSize: 12.5,
    fontFamily: "DM Sans, sans-serif",
    fontWeight: "600",
    color: colors.black,
    flexShrink: 1,
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: "#F0ECE8",
  },
  activePill: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  activePillText: {
    fontSize: 10,
    fontFamily: "Poppins, sans-serif",
    fontWeight: "600",
    color: "#059669",
  },
  editActionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  editActionRowMobile: {
    flexDirection: "column",
    gap: 8,
  },
  halfBtn: {
    flex: 1,
  },
  fullBtn: {
    width: "100%",
  },
  docNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(163, 94, 71, 0.08)",
    borderRadius: radius.card,
    padding: 12,
    marginBottom: 16,
  },
  docNoticeText: {
    flex: 1,
    fontSize: 11,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
    lineHeight: 15,
  },
  docList: {
    gap: 16,
  },
  docItem: {
    gap: 6,
  },
  docItemLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
  },
  readOnlyDocRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: radius.card,
    backgroundColor: "#F9F8F7",
    borderWidth: 1,
    borderColor: "#E6E3E0",
    gap: 10,
    flexWrap: "wrap",
  },
  docBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    flexShrink: 1,
    minWidth: 150,
  },
  docFileName: {
    fontSize: 12,
    fontFamily: "DM Sans, sans-serif",
    fontWeight: "500",
    color: colors.black,
    flex: 1,
    flexShrink: 1,
  },
  statusVerifiedBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusVerifiedText: {
    fontSize: 10,
    fontFamily: "Poppins, sans-serif",
    fontWeight: "600",
    color: "#059669",
  },
  photoBlock: {
    marginBottom: 20,
    gap: 6,
  },
  blockTitle: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
  },
  blockSub: {
    fontSize: 10.5,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
    marginBottom: 6,
  },
  kitchenPhotosGrid: {
    gap: 10,
  },
  kitchenSlot: {
    gap: 4,
  },
  slotLabel: {
    fontSize: 11,
    fontFamily: "Poppins, sans-serif",
    fontWeight: "600",
    color: colors.charcoal,
  },
  photoPreviewCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: radius.card,
    backgroundColor: "#FAF9F8",
    borderWidth: 1,
    borderColor: "#E6E3E0",
  },
  previewName: {
    fontSize: 12,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
  },
  radiusControlBox: {
    padding: 14,
    borderRadius: radius.card,
    backgroundColor: colors.surfaceSubtle,
    marginTop: 4,
  },
  radiusControlLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
    marginBottom: 8,
  },
  radiusDisplayRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  radiusStepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E0DDD9",
    justifyContent: "center",
    alignItems: "center",
  },
  stepBtnText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.black,
    lineHeight: 20,
  },
  radiusValText: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.terracotta,
    minWidth: 70,
    textAlign: "center",
  },
  sliderMinMax: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  minMaxText: {
    fontSize: 9.5,
    fontFamily: "DM Sans, sans-serif",
    color: colors.warmGrey,
  },
})

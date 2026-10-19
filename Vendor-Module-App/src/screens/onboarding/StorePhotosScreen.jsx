import React, { useState } from "react"
import { View, Text, StyleSheet, ScrollView } from "react-native"
import { colors } from "../../theme/colors"
import { AppHeader } from "../../components/common/AppHeader"
import { AppButton } from "../../components/common/AppButton"
import { DocumentUploader } from "../../components/common/DocumentUploader"
import { useResponsive } from "../../theme/useResponsive"
import { useAppNavigation } from "../../navigation/NavigationContext"
import { useOnboarding } from "../../context/OnboardingContext"
import { vendorOnboardingService } from "../../services/vendorOnboardingService"
import { supabase, isSupabaseConfigured } from "../../lib/supabase.js"

export const StorePhotosScreen = () => {
  const { navigate, goBack } = useAppNavigation()
  const {
    vendorRole,
    kitchenPhotos,
    updateKitchenPhoto,
    removeKitchenPhoto,
    storefrontPhoto,
    setStorefrontPhoto,
    businessLogo,
    setBusinessLogo,
    vendorId,
    storeId,
  } = useOnboarding()

  const { isMobile } = useResponsive()
  const isRestaurant = vendorRole === "restaurant"
  const [validationError, setValidationError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState("")

  const handleContinue = async () => {
    // Restaurant vendor requires 3 kitchen interior photos
    if (isRestaurant) {
      const validKitchenCount = kitchenPhotos.filter(
        (p) => p && (p.dataUrl || p.name || p.storagePath),
      ).length

      if (validKitchenCount < 3) {
        setValidationError(
          `Restaurant vendors must upload all 3 Kitchen Interior photos (${validKitchenCount}/3 uploaded). Max 200 KB per photo.`,
        )
        return
      }
    }

    if (isSaving) return
    setValidationError("")
    setSaveError("")
    setIsSaving(true)
    try {
      if (isSupabaseConfigured) {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          let currentStoreId = storeId
          if (!currentStoreId) {
            let currentVendorId = vendorId
            if (!currentVendorId) {
              const { data: v } = await supabase
                .from("vendors")
                .select("id")
                .eq("user_id", user.id)
                .maybeSingle()
              if (v?.id) currentVendorId = v.id
            }
            if (currentVendorId) {
              const { data: s } = await supabase
                .from("stores")
                .select("id")
                .eq("vendor_id", currentVendorId)
                .maybeSingle()
              if (s?.id) currentStoreId = s.id
            }
          }

          if (currentStoreId) {
            const result = await vendorOnboardingService.saveStorePhotos(
              currentStoreId,
              {
                kitchenPhotos,
                storefrontPhoto,
                businessLogo,
              },
            )
            if (result?.success && result.updatedPhotos) {
              if (result.updatedPhotos.kitchenPhotos) {
                result.updatedPhotos.kitchenPhotos.forEach((photo, idx) => {
                  if (photo) updateKitchenPhoto(idx, photo)
                })
              }
              if (result.updatedPhotos.storefrontPhoto) {
                setStorefrontPhoto(result.updatedPhotos.storefrontPhoto)
              }
              if (result.updatedPhotos.businessLogo) {
                setBusinessLogo(result.updatedPhotos.businessLogo)
              }
            }
          }
        }
      }
      navigate("terms")
    } catch (err) {
      console.warn("[StorePhotos] Save failed:", err)
      setSaveError(
        err.message ||
          "Failed to upload and save store photos. Please check your connection and try again.",
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <View style={styles.container}>
      {isMobile && (
        <AppHeader title="Store Photos & Identity" onBack={goBack} />
      )}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          !isMobile && styles.scrollContentDesktop,
        ]}
      >
        <Text style={styles.eyebrow}>STORE IDENTITY</Text>
        <Text style={styles.title}>
          {isRestaurant
            ? "Kitchen & store authorization photos"
            : "Grocery store photos & identity"}
        </Text>
        <Text style={styles.subtitle}>
          {isRestaurant
            ? "Clear kitchen hygiene photos ensure quick partner verification and food safety approval. Max 200 KB per photo."
            : "Showcase your grocery storefront and business logo to local customers. Max 200 KB per file."}
        </Text>

        {validationError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{validationError}</Text>
          </View>
        ) : null}

        <View style={styles.sectionsStack}>
          {/* RESTAURANT ONLY: 3 Kitchen Interior Photos */}
          {isRestaurant && (
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Upload 3 Kitchen Photos</Text>
              </View>
              <Text style={styles.sectionDesc}>
                Upload 3 clear photos of your kitchen interior.
              </Text>

              <View style={styles.uploadCardsStack}>
                <DocumentUploader
                  label="Kitchen Photo 1"
                  subtitle="Upload kitchen interior photo (Max 200 KB)"
                  required
                  document={kitchenPhotos[0]}
                  onUploadSuccess={(doc) => {
                    updateKitchenPhoto(0, doc)
                    if (validationError) setValidationError("")
                  }}
                  onRemove={() => removeKitchenPhoto(0)}
                />

                <DocumentUploader
                  label="Kitchen Photo 2"
                  subtitle="Upload kitchen interior photo (Max 200 KB)"
                  required
                  document={kitchenPhotos[1]}
                  onUploadSuccess={(doc) => {
                    updateKitchenPhoto(1, doc)
                    if (validationError) setValidationError("")
                  }}
                  onRemove={() => removeKitchenPhoto(1)}
                />

                <DocumentUploader
                  label="Kitchen Photo 3"
                  subtitle="Upload kitchen interior photo (Max 200 KB)"
                  required
                  document={kitchenPhotos[2]}
                  onUploadSuccess={(doc) => {
                    updateKitchenPhoto(2, doc)
                    if (validationError) setValidationError("")
                  }}
                  onRemove={() => removeKitchenPhoto(2)}
                />
              </View>
            </View>
          )}

          {/* BOTH RESTAURANT & GROCERY: Storefront Photo (OPTIONAL) */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Storefront Photo</Text>
              <Text style={styles.optionalTag}>Optional</Text>
            </View>
            <Text style={styles.sectionDesc}>
              A clear photo of your store entrance with visible name board helps
              delivery riders locate you easily.
            </Text>

            <DocumentUploader
              label="Storefront Entrance Photo"
              subtitle="Exterior storefront with signage (Max 200 KB)"
              document={storefrontPhoto}
              onUploadSuccess={(doc) => setStorefrontPhoto(doc)}
              onRemove={() => setStorefrontPhoto(null)}
            />
          </View>

          {/* BOTH RESTAURANT & GROCERY: Business Logo (OPTIONAL) */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Business Logo</Text>
              <Text style={styles.optionalTag}>Optional</Text>
            </View>
            <Text style={styles.sectionDesc}>
              Square brand logo displayed on customer app receipts and merchant
              listings.
            </Text>

            <DocumentUploader
              label="Brand / Store Logo"
              subtitle="Square 1:1 format (Max 200 KB)"
              document={businessLogo}
              onUploadSuccess={(doc) => setBusinessLogo(doc)}
              onRemove={() => setBusinessLogo(null)}
            />
          </View>
        </View>

        {saveError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{saveError}</Text>
          </View>
        ) : null}

        <AppButton
          onPress={handleContinue}
          style={styles.continueBtn}
          loading={isSaving}
        >
          Save & Continue to Agreement
        </AppButton>
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
    padding: 20,
    flexGrow: 1,
  },
  scrollContentDesktop: {
    padding: 36,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    letterSpacing: 1.4,
    color: colors.terracotta,
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
    lineHeight: 18,
    marginBottom: 20,
  },
  errorBanner: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorBannerText: {
    fontSize: 12,
    fontFamily: "DM Sans, sans-serif",
    color: colors.danger,
    fontWeight: "600",
  },
  sectionsStack: {
    gap: 22,
    marginBottom: 28,
  },
  sectionBlock: {
    paddingTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Poppins, sans-serif",
    fontWeight: "700",
    color: colors.black,
  },
  requiredTag: {
    fontSize: 9.5,
    fontFamily: "Poppins, sans-serif",
    fontWeight: "700",
    color: colors.terracotta,
    backgroundColor: "rgba(163, 94, 71, 0.1)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: "uppercase",
  },
  optionalTag: {
    fontSize: 9.5,
    fontFamily: "Poppins, sans-serif",
    fontWeight: "600",
    color: colors.warmGrey,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sectionDesc: {
    fontSize: 11.5,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
    lineHeight: 16,
    marginBottom: 12,
  },
  uploadCardsStack: {
    gap: 4,
  },
  continueBtn: {
    minHeight: 48,
    marginBottom: 16,
  },
})

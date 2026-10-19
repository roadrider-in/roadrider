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
import { AppButton } from "../../components/common/AppButton"
import { AppCard } from "../../components/common/AppCard"
import { AppIcon } from "../../components/common/AppIcon"
import { useAppNavigation } from "../../navigation/NavigationContext"
export const BulkImportScreen = () => {
  const { navigate, goBack } = useAppNavigation()
  const [selectedFile, setSelectedFile] = useState(null)
  const [progress, setProgress] = useState(0)

  const handleFileSelect = (e) => {
    const file = e?.target?.files?.[0]
    if (file) {
      setSelectedFile(file)
      setProgress(100)
    }
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Bulk import" onBack={goBack} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.eyebrow}>CATALOG TOOLS</Text>
        <Text style={styles.title}>Import your inventory</Text>
        <Text style={styles.subtitle}>
          Upload a CSV or Excel file using our standard template.
        </Text>

        {/* Download Template Card */}
        <TouchableOpacity activeOpacity={0.8}>
          <AppCard style={styles.downloadCard}>
            <View style={styles.downloadIconBox}>
              <AppIcon name="upload" size={18} color={colors.terracotta} />
            </View>
            <View style={styles.downloadInfo}>
              <Text style={styles.downloadTitle}>Download template</Text>
              <Text style={styles.downloadSub}>
                roadrider_catalog_template.xlsx
              </Text>
            </View>
            <AppIcon name="chevron" size={18} color={colors.charcoal} />
          </AppCard>
        </TouchableOpacity>

        {/* Drop Zone */}
        <View style={styles.dropZone}>
          <AppIcon name="upload" size={32} color={colors.charcoal} />
          <Text style={styles.dropTitle}>
            {selectedFile ? selectedFile.name : "Drop your file here"}
          </Text>
          <Text style={styles.dropSub}>
            {selectedFile
              ? `${(selectedFile.size / 1024).toFixed(1)} KB · Ready to import`
              : "or choose from device · XLSX, CSV"}
          </Text>
          <label style={{ cursor: "pointer" }}>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
            <View pointerEvents="none">
              <AppButton secondary style={styles.chooseBtn}>
                {selectedFile ? "Change file" : "Choose file"}
              </AppButton>
            </View>
          </label>
        </View>

        {/* Import Progress Card (only shown when file selected) */}
        {selectedFile && (
          <AppCard style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.fileName}>{selectedFile.name}</Text>
              <Text style={styles.progressPercent}>{progress}%</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View
                style={[styles.progressBarFill, { width: `${progress}%` }]}
              />
            </View>
            <Text style={styles.validationText}>
              Ready for catalog ingestion
            </Text>
          </AppCard>
        )}

        <AppButton
          onPress={() => navigate("inventory")}
          style={styles.continueBtn}
          disabled={!selectedFile}
        >
          Continue import
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
    paddingBottom: 32,
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    letterSpacing: 1.4,
    color: colors.terracotta,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
    lineHeight: 28,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
    lineHeight: 18,
    marginBottom: 20,
  },
  downloadCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  downloadIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(163, 94, 71, 0.10)",
    justifyContent: "center",
    alignItems: "center",
  },
  downloadInfo: {
    flex: 1,
  },
  downloadTitle: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
  },
  downloadSub: {
    fontSize: 9.5,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
    marginTop: 2,
  },
  dropZone: {
    minHeight: 170,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.warmGrey,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    marginBottom: 18,
  },
  dropTitle: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
    marginTop: 10,
  },
  dropSub: {
    fontSize: 9.5,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
    marginTop: 4,
    marginBottom: 14,
  },
  chooseBtn: {
    width: 140,
    minHeight: 38,
  },
  progressCard: {
    padding: 14,
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  fileName: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Poppins, sans-serif",
    color: colors.black,
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    color: colors.terracotta,
  },
  progressBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(156, 154, 154, 0.25)",
    marginBottom: 8,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.terracotta,
    borderRadius: 2,
  },
  validationText: {
    fontSize: 9.5,
    fontFamily: "DM Sans, sans-serif",
    color: colors.charcoal,
  },
  continueBtn: {
    marginTop: 4,
  },
})

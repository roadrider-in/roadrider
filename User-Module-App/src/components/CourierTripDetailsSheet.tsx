import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "./Icon";
import type { Order } from "../state/AppState";
import { rupees } from "../lib/pricing";

interface CourierTripDetailsSheetProps {
  visible: boolean;
  order?: Order | null;
  pickupOtp?: string;
  dropOtp?: string;
  onClose: () => void;
  onRequestCancel?: () => void;
  onRequestChangeCaptain?: () => void;
}

export default function CourierTripDetailsSheet({
  visible,
  order,
  pickupOtp = "3178",
  dropOtp = "8421",
  onClose,
  onRequestCancel,
  onRequestChangeCaptain,
}: CourierTripDetailsSheetProps) {
  const insets = useSafeAreaInsets();

  const pickupAddress =
    order?.destination?.split("→")[0]?.trim() ||
    "104, Golf City, Lucknow, Muzaffar Nagar Ghusval, Uttar Pradesh 226002";
  const dropAddress =
    order?.destination?.split("→")[1]?.trim() ||
    order?.destination ||
    "Park view apartment, Sector 1, Gomti Nagar, Lucknow";

  const senderName = "Omm lenka";
  const senderPhone = "7897069137";
  const receiverName = "Omm Prakash";
  const receiverPhone = "9876543210";

  const totalFare = order?.bill?.toPay || 86;
  const baseFare = 50;
  const distanceFare = Math.max(0, totalFare - baseFare + (order?.bill?.discount || 0));
  const discount = order?.bill?.discount || 0;
  const paymentMethod = order?.payment || "Cash";

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {});
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Handle */}
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Parcel Trip Details</Text>
              <Text style={styles.orderIdText}>Order {order?.id || "RR-COUR104"}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Route & Contacts Section */}
            <View style={styles.sectionCard}>
              {/* Pickup row */}
              <View style={styles.routeRow}>
                <View style={styles.pinCol}>
                  <View style={styles.dotGreen} />
                  <View style={styles.lineDotted} />
                </View>
                <View style={styles.routeDetails}>
                  <View style={styles.routeHeaderRow}>
                    <Text style={styles.routeLabel}>PICKUP FROM</Text>
                    <View style={styles.pinBadge}>
                      <Text style={styles.pinBadgeLabel}>PIN: </Text>
                      <Text style={styles.pinBadgeCode}>{pickupOtp}</Text>
                    </View>
                  </View>
                  <Text style={styles.personName}>{senderName}</Text>
                  <Text style={styles.addressText} numberOfLines={2}>
                    {pickupAddress}
                  </Text>
                  <TouchableOpacity
                    style={styles.callRow}
                    onPress={() => handleCall(senderPhone)}
                  >
                    <Icon name="phone" size={13} color="#E87518" />
                    <Text style={styles.callText}>{senderPhone}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Drop row */}
              <View style={styles.routeRow}>
                <View style={styles.pinCol}>
                  <View style={styles.dotRed} />
                </View>
                <View style={styles.routeDetails}>
                  <View style={styles.routeHeaderRow}>
                    <Text style={styles.routeLabel}>DROP TO</Text>
                    <View style={[styles.pinBadge, styles.dropPinBadge]}>
                      <Text style={styles.pinBadgeLabel}>DROP OTP: </Text>
                      <Text style={[styles.pinBadgeCode, styles.dropPinCode]}>
                        {dropOtp}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.personName}>{receiverName}</Text>
                  <Text style={styles.addressText} numberOfLines={2}>
                    {dropAddress}
                  </Text>
                  <TouchableOpacity
                    style={styles.callRow}
                    onPress={() => handleCall(receiverPhone)}
                  >
                    <Icon name="phone" size={13} color="#E87518" />
                    <Text style={styles.callText}>{receiverPhone}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Parcel Information Section */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Parcel Information</Text>

              <View style={styles.specGrid}>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Vehicle</Text>
                  <Text style={styles.specValue}>Parcel on Bike</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Weight Capacity</Text>
                  <Text style={styles.specValue}>Upto 20 kgs</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Category</Text>
                  <Text style={styles.specValue}>Documents / Package</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Payment Timing</Text>
                  <Text style={styles.specValue}>Pay at Pickup</Text>
                </View>
              </View>
            </View>

            {/* Fare Breakdown Section */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Fare Summary</Text>

              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Base Fare</Text>
                <Text style={styles.billValue}>₹{baseFare}</Text>
              </View>

              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Distance & Travel Fee</Text>
                <Text style={styles.billValue}>₹{distanceFare}</Text>
              </View>

              {discount > 0 && (
                <View style={styles.billRow}>
                  <Text style={[styles.billLabel, { color: "#16A34A" }]}>
                    Promotional Discount (DIWALI100)
                  </Text>
                  <Text style={[styles.billValue, { color: "#16A34A" }]}>
                    -₹{discount}
                  </Text>
                </View>
              )}

              <View style={styles.divider} />

              <View style={styles.totalRow}>
                <View>
                  <Text style={styles.totalLabel}>Total Fare</Text>
                  <Text style={styles.paymentSubtext}>
                    Payment mode: {paymentMethod}
                  </Text>
                </View>
                <Text style={styles.totalValue}>₹{totalFare}</Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footerBtns}>
            {onRequestChangeCaptain && (
              <TouchableOpacity
                style={styles.changeBtn}
                onPress={() => {
                  onClose();
                  onRequestChangeCaptain();
                }}
                activeOpacity={0.8}
              >
                <Icon name="refresh" size={15} color="#151B2B" />
                <Text style={styles.changeBtnText}>Change Captain</Text>
              </TouchableOpacity>
            )}

            {onRequestCancel && (
              <TouchableOpacity
                style={styles.cancelTripBtn}
                onPress={() => {
                  onClose();
                  onRequestCancel();
                }}
                activeOpacity={0.8}
              >
                <Icon name="close" size={15} color="#EF4444" />
                <Text style={styles.cancelTripText}>Cancel Parcel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: "88%",
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  handleWrap: {
    alignItems: "center",
    paddingVertical: 8,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#151B2B",
  },
  orderIdText: {
    fontSize: 12,
    color: "#68758A",
    fontWeight: "600",
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: {
    fontSize: 14,
    color: "#68758A",
    fontWeight: "800",
  },
  scroll: {
    maxHeight: 460,
  },
  scrollContent: {
    paddingVertical: 14,
    gap: 14,
  },
  sectionCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#151B2B",
    marginBottom: 12,
  },
  routeRow: {
    flexDirection: "row",
    gap: 12,
  },
  pinCol: {
    alignItems: "center",
    width: 16,
    paddingTop: 3,
  },
  dotGreen: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#16A34A",
  },
  lineDotted: {
    width: 2,
    height: 54,
    backgroundColor: "#CBD5E1",
    marginVertical: 4,
  },
  dotRed: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#EF4444",
  },
  routeDetails: {
    flex: 1,
    paddingBottom: 10,
  },
  routeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  routeLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#68758A",
    letterSpacing: 0.6,
  },
  pinBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF4EB",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  pinBadgeLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#C25D0E",
  },
  pinBadgeCode: {
    fontSize: 11,
    fontWeight: "800",
    color: "#E87518",
  },
  dropPinBadge: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  dropPinCode: {
    color: "#1D4ED8",
  },
  personName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#151B2B",
  },
  addressText: {
    fontSize: 11.5,
    color: "#475569",
    marginTop: 2,
    lineHeight: 16,
  },
  callRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 5,
  },
  callText: {
    fontSize: 11.5,
    color: "#E87518",
    fontWeight: "700",
  },
  specGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 10,
  },
  specItem: {
    width: "50%",
  },
  specLabel: {
    fontSize: 10.5,
    color: "#68758A",
    fontWeight: "600",
  },
  specValue: {
    fontSize: 12.5,
    color: "#151B2B",
    fontWeight: "700",
    marginTop: 2,
  },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  billLabel: {
    fontSize: 12.5,
    color: "#475569",
  },
  billValue: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#151B2B",
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#151B2B",
  },
  paymentSubtext: {
    fontSize: 11,
    color: "#68758A",
    marginTop: 1,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#151B2B",
  },
  footerBtns: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  changeBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  changeBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#151B2B",
  },
  cancelTripBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  cancelTripText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#EF4444",
  },
});

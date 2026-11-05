import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
} from "react-native";
import Icon from "./Icon";
import { rupees } from "../lib/pricing";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface RideTripDetailsSheetProps {
  visible: boolean;
  onClose: () => void;
  vehicleName: string;
  vehicleIcon: string;
  pickupName: string;
  pickupAddress: string;
  dropName: string;
  dropAddress: string;
  totalFare: number;
  baseFare?: number;
  distanceFare?: number;
  timeFare?: number;
  taxesFare?: number;
  paymentMethod?: string;
  onEditPickup?: () => void;
  onEditDrop?: () => void;
  onChangePayment?: () => void;
  onCancelRide?: () => void;
}

export default function RideTripDetailsSheet({
  visible,
  onClose,
  vehicleName,
  vehicleIcon,
  pickupName,
  pickupAddress,
  dropName,
  dropAddress,
  totalFare,
  baseFare = 40,
  distanceFare = 50,
  timeFare = 10,
  taxesFare = 4,
  paymentMethod = "Paying via cash",
  onEditPickup,
  onEditDrop,
  onChangePayment,
  onCancelRide,
}: RideTripDetailsSheetProps) {
  const [showFareBreakdown, setShowFareBreakdown] = useState(false);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.backdropPressable}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheetContainer}>
          {/* Top Drag Indicator */}
          <View style={styles.dragHandle} />

          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={8}
            accessibilityLabel="Close trip details"
          >
            <Icon name="x" size={18} color="#172033" />
          </TouchableOpacity>

          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Vehicle Header */}
            <View style={styles.vehicleHeaderRow}>
              <View style={styles.vehicleIconWrap}>
                <Icon
                  name={vehicleIcon as any}
                  size={36}
                  color="#1769E8"
                />
              </View>
              <Text style={styles.vehicleTitle}>{vehicleName}</Text>
            </View>

            {/* LOCATION DETAILS SECTION */}
            <View style={styles.sectionDivider} />
            <Text style={styles.sectionHeading}>Location Details</Text>

            <View style={styles.locationsContainer}>
              {/* Pickup Row */}
              <View style={styles.locationRow}>
                <View style={styles.dotColumn}>
                  <View style={styles.greenPickupDot} />
                  <View style={styles.dashedConnector} />
                </View>
                <View style={styles.locationTextCol}>
                  <Text style={styles.locationTitle} numberOfLines={1}>
                    {pickupName || "Pickup Location"}
                  </Text>
                  <Text style={styles.locationSub} numberOfLines={2}>
                    {pickupAddress || "Pickup Point, Lucknow"}
                  </Text>
                </View>
                <View style={styles.locationActions}>
                  {onEditPickup && (
                    <TouchableOpacity
                      onPress={onEditPickup}
                      style={styles.actionIconBtn}
                      hitSlop={6}
                    >
                      <Icon name="edit" size={17} color="#68758A" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Destination Row */}
              <View style={styles.locationRow}>
                <View style={styles.dotColumn}>
                  <View style={styles.redDropDot} />
                </View>
                <View style={styles.locationTextCol}>
                  <Text style={styles.locationTitle} numberOfLines={1}>
                    {dropName || "Destination"}
                  </Text>
                  <Text style={styles.locationSub} numberOfLines={2}>
                    {dropAddress || "Drop-off Location, Lucknow"}
                  </Text>
                </View>
                <View style={styles.locationActions}>
                  {onEditDrop && (
                    <TouchableOpacity
                      onPress={onEditDrop}
                      style={styles.actionIconBtn}
                      hitSlop={6}
                    >
                      <Icon name="edit" size={17} color="#68758A" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {/* FARE DETAILS SECTION */}
            <View style={styles.sectionDivider} />
            <TouchableOpacity
              style={styles.fareRow}
              activeOpacity={0.7}
              onPress={() => setShowFareBreakdown((v) => !v)}
            >
              <Text style={styles.fareLabel}>Total Fare</Text>
              <View style={styles.fareValueRow}>
                <Text style={styles.fareAmount}>{rupees(totalFare)}</Text>
                <Icon
                  name={showFareBreakdown ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="#172033"
                />
              </View>
            </TouchableOpacity>

            {/* Expandable Fare Breakdown */}
            {showFareBreakdown && (
              <View style={styles.fareBreakdownBox}>
                <View style={styles.fareBreakdownRow}>
                  <Text style={styles.fareBreakdownLabel}>Base Fare</Text>
                  <Text style={styles.fareBreakdownValue}>{rupees(baseFare)}</Text>
                </View>
                <View style={styles.fareBreakdownRow}>
                  <Text style={styles.fareBreakdownLabel}>Distance Charge</Text>
                  <Text style={styles.fareBreakdownValue}>{rupees(distanceFare)}</Text>
                </View>
                <View style={styles.fareBreakdownRow}>
                  <Text style={styles.fareBreakdownLabel}>Time & Traffic</Text>
                  <Text style={styles.fareBreakdownValue}>{rupees(timeFare)}</Text>
                </View>
                <View style={styles.fareBreakdownRow}>
                  <Text style={styles.fareBreakdownLabel}>Taxes & Platform Fees</Text>
                  <Text style={styles.fareBreakdownValue}>{rupees(taxesFare)}</Text>
                </View>
              </View>
            )}

            {/* PAYMENT SECTION */}
            <View style={styles.sectionDivider} />
            <View style={styles.paymentRow}>
              <View style={styles.paymentLeft}>
                <Icon name="wallet" size={18} color="#1769E8" />
                <Text style={styles.paymentText}>{paymentMethod}</Text>
              </View>
              {onChangePayment && (
                <TouchableOpacity onPress={onChangePayment} hitSlop={6}>
                  <Text style={styles.changePaymentText}>Change</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* CANCEL RIDE BUTTON */}
            {onCancelRide && (
              <TouchableOpacity
                style={styles.cancelRideBtn}
                activeOpacity={0.8}
                onPress={() => {
                  onClose();
                  onCancelRide();
                }}
              >
                <Text style={styles.cancelRideBtnText}>Cancel Ride</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  backdropPressable: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    maxHeight: SCREEN_HEIGHT * 0.85,
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 12,
    elevation: 8,
  },
  dragHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 8,
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 18,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  sheetScroll: {
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  vehicleHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 14,
    gap: 14,
  },
  vehicleIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#EAF3FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DCE8F8",
  },
  vehicleTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#172033",
    letterSpacing: -0.3,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 14,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "700",
    color: "#172033",
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  locationsContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  dotColumn: {
    width: 20,
    alignItems: "center",
    marginRight: 12,
    paddingTop: 3,
  },
  greenPickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#16A34A",
    borderWidth: 2,
    borderColor: "#DCFCE7",
  },
  dashedConnector: {
    width: 1.5,
    height: 38,
    backgroundColor: "#CBD5E1",
    marginVertical: 4,
  },
  redDropDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#DC2626",
    borderWidth: 2,
    borderColor: "#FEE2E2",
  },
  locationTextCol: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#172033",
  },
  locationSub: {
    fontSize: 12,
    color: "#68758A",
    marginTop: 2,
    lineHeight: 16,
  },
  locationActions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
    gap: 8,
  },
  actionIconBtn: {
    padding: 4,
  },
  fareRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  fareLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#172033",
  },
  fareValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fareAmount: {
    fontSize: 18,
    fontWeight: "800",
    color: "#172033",
  },
  fareBreakdownBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  fareBreakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fareBreakdownLabel: {
    fontSize: 12.5,
    color: "#68758A",
  },
  fareBreakdownValue: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#172033",
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  paymentLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  paymentText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#172033",
  },
  changePaymentText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1769E8",
  },
  cancelRideBtn: {
    marginTop: 24,
    borderWidth: 1.5,
    borderColor: "#DC2626",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF5F5",
  },
  cancelRideBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626",
  },
});

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Service } from "../data/demo";
import { computeBill, rupees, type Bill } from "../lib/pricing";
import { useApp } from "../state/AppState";
import { colors } from "../theme/tokens";

export interface BillSummaryProps {
  service: Service;
  billOverride?: Bill;
}

export default function BillSummary({ service, billOverride }: BillSummaryProps) {
  const { itemTotal, state } = useApp();
  const bill =
    billOverride ??
    computeBill(service, itemTotal(service), state.promos[service] ?? null);

  return (
    <View style={styles.bill}>
      <Text style={styles.heading}>Bill details</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Item total</Text>
        <Text style={styles.value}>{rupees(bill.itemTotal)}</Text>
      </View>

      {bill.discount > 0 && (
        <View style={styles.row}>
          <Text style={styles.label}>Discount ({bill.promo})</Text>
          <Text style={[styles.value, styles.discountText]}>
            − {rupees(bill.discount)}
          </Text>
        </View>
      )}

      {bill.deliveryFee !== undefined &&
        service !== "rides" &&
        service !== "courier" && (
          <View style={styles.row}>
            <Text style={styles.label}>Delivery fee</Text>
            <Text style={[styles.value, styles.freeText]}>FREE</Text>
          </View>
        )}

      {bill.taxes !== null && (
        <View style={styles.row}>
          <Text style={styles.label}>Taxes & fees</Text>
          <Text style={styles.value}>{rupees(bill.taxes)}</Text>
        </View>
      )}

      <View style={[styles.row, styles.billTotal]}>
        <Text style={styles.totalLabel}>To pay</Text>
        <Text style={styles.totalValue}>{rupees(bill.toPay)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bill: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ebe7e2",
    borderRadius: 16,
    marginTop: 16,
    padding: 16,
  },
  heading: {
    fontSize: 13,
    fontWeight: "700",
    color: "#171514",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  label: {
    fontSize: 10,
    color: "#77716e",
  },
  value: {
    fontSize: 10,
    fontWeight: "600",
    color: "#171514",
  },
  discountText: {
    color: "#2d8855",
  },
  freeText: {
    color: "#2d8855",
    fontWeight: "700",
  },
  billTotal: {
    borderTopWidth: 1,
    borderTopColor: "#ebe7e2",
    marginTop: 7,
    paddingTop: 11,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#171514",
  },
  totalValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#171514",
  },
});

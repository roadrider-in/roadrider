import React from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "./Icon";
import { COURIER_THEME } from "../theme/themes";

interface CourierProhibitedModalProps {
  visible: boolean;
  onClose: () => void;
}

const PROHIBITED_ITEMS = [
  {
    icon: "warning",
    title: "Currency & Valuables",
    desc: "Cash, gold/silver bullion, jewelry, coins, and high-value bearer bonds.",
  },
  {
    icon: "shield",
    title: "Weapons & Explosives",
    desc: "Firearms, ammunition, firecrackers, gunpowder, and hazardous fireworks.",
  },
  {
    icon: "alert",
    title: "Flammable & Toxic Substances",
    desc: "Gas cylinders, kerosene, petrol, paints, radioactive or toxic chemicals.",
  },
  {
    icon: "close",
    title: "Illegal & Controlled Substances",
    desc: "Narcotics, psychotropic drugs, unregistered contraband, and illicit items.",
  },
  {
    icon: "heart",
    title: "Living Animals & Organisms",
    desc: "Pets, livestock, birds, wild animals, or animal remains of any kind.",
  },
  {
    icon: "info",
    title: "Perishables Without Packaging",
    desc: "Raw unpackaged seafood, unprotected liquids, or leaking materials.",
  },
];

export default function CourierProhibitedModal({
  visible,
  onClose,
}: CourierProhibitedModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.dragHandle} />
            <View style={styles.headerRow}>
              <View style={styles.titleWrap}>
                <Text style={styles.title}>Prohibited Items</Text>
                <Text style={styles.subtitle}>
                  RoadRider cannot transport the following goods
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close prohibited items modal"
              >
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Items List */}
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {PROHIBITED_ITEMS.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <View style={styles.itemIconWrap}>
                  <Icon name={item.icon} size={18} color="#E87518" />
                </View>
                <View style={styles.itemTextWrap}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}

            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>
                ⚠️ Booking transport for prohibited or illegal articles is a violation
                of local laws and will result in booking cancellation, reporting to authorities,
                and account suspension.
              </Text>
            </View>
          </ScrollView>

          {/* Action Button */}
          <TouchableOpacity
            style={styles.btn}
            onPress={onClose}
            activeOpacity={0.88}
          >
            <Text style={styles.btnText}>Understood & I Agree</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: "85%",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  header: {
    alignItems: "center",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E4EAF1",
  },
  dragHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    marginBottom: 14,
  },
  headerRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#151B2B",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: "#68758A",
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
    fontSize: 13,
    color: "#68758A",
    fontWeight: "800",
  },
  list: {
    maxHeight: 400,
    marginTop: 14,
  },
  listContent: {
    paddingBottom: 16,
    gap: 14,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  itemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF4EB",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  itemTextWrap: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#151B2B",
  },
  itemDesc: {
    fontSize: 12,
    color: "#68758A",
    marginTop: 2,
    lineHeight: 16,
  },
  noticeBox: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFEDD5",
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  noticeText: {
    fontSize: 11,
    color: "#9A3412",
    lineHeight: 16,
    fontWeight: "500",
  },
  btn: {
    height: 50,
    backgroundColor: "#E87518",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    shadowColor: "#E87518",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  btnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});

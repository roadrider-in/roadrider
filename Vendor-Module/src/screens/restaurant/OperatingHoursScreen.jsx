import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { AppHeader } from '../../components/common/AppHeader';
import { AppCard } from '../../components/common/AppCard';
import { AppButton } from '../../components/common/AppButton';
import { AppIcon } from '../../components/common/AppIcon';
import { ToggleSwitch } from '../../components/common/ToggleSwitch';
import { useAppNavigation } from '../../navigation/NavigationContext';
import { useVendor } from '../../context/VendorContext';

export const OperatingHoursScreen = () => {
  const { goBack } = useAppNavigation();
  const {
    operatingSchedule,
    setOperatingSchedule,
    holidaySchedule,
    setHolidaySchedule,
  } = useVendor();

  // Local draft state for editing times
  const [editingDays, setEditingDays] = useState({});

  const [holidayDate, setHolidayDate] = useState('');
  const [holidayReason, setHolidayReason] = useState('');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

  const toggleDay = (id) => {
    setOperatingSchedule((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isOpen: !item.isOpen } : item))
    );
  };

  const toggleEditSchedule = (id, currentOpen, currentClose) => {
    setEditingDays((prev) => ({
      ...prev,
      [id]: prev[id]
        ? null
        : { openTime: currentOpen, closeTime: currentClose },
    }));
  };

  const updateEditTime = (id, field, value) => {
    setEditingDays((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value,
      },
    }));
  };

  const handleSaveHours = (id) => {
    const editData = editingDays[id];
    if (editData) {
      setOperatingSchedule((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                openTime: editData.openTime.trim() || item.openTime,
                closeTime: editData.closeTime.trim() || item.closeTime,
              }
            : item
        )
      );
    }
    setEditingDays((prev) => ({ ...prev, [id]: null }));
    showNotice('Operating hours updated and saved successfully!');
  };

  const handleAddHoliday = () => {
    if (!holidayDate) return;

    const parsed = new Date(holidayDate);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = parsed.toLocaleDateString('en-US', options);

    const newHoliday = {
      id: `hol-${Date.now()}`,
      date: holidayDate,
      displayDate: formattedDate,
      occasion: holidayReason.trim() || 'Store Holiday / Planned Closure',
      isClosed: true,
    };

    setHolidaySchedule((prev) => [newHoliday, ...prev]);
    setHolidayDate('');
    setHolidayReason('');
    showNotice(`Added holiday closure for ${formattedDate}`);
  };

  const handleRemoveHoliday = (id) => {
    setHolidaySchedule((prev) => prev.filter((h) => h.id !== id));
    showNotice('Holiday closure removed');
  };

  const showNotice = (msg) => {
    setSaveSuccessMessage(msg);
    setTimeout(() => setSaveSuccessMessage(''), 3000);
  };

  const standardTimes = [
    '07:00 AM', '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM',
    '10:30 AM', '11:00 AM', '09:00 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM', '12:00 AM'
  ];

  return (
    <View style={styles.container}>
      <AppHeader title="Operating Hours & Holidays" onBack={goBack} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Success Toast */}
        {saveSuccessMessage ? (
          <View style={styles.toastNotice}>
            <AppIcon name="check" size={15} color="#059669" strokeWidth={2.8} />
            <Text style={styles.toastText}>{saveSuccessMessage}</Text>
          </View>
        ) : null}

        {/* Operating Hours Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.eyebrow}>WEEKLY STORE TIMINGS</Text>
          <Text style={styles.sectionSubtitle}>
            Customers can only place orders when your outlet is marked open during scheduled hours.
          </Text>
        </View>

        <AppCard style={styles.listCard}>
          {operatingSchedule.map((item, idx) => {
            const isEditing = Boolean(editingDays[item.id]);
            const currentEdit = editingDays[item.id] || { openTime: item.openTime, closeTime: item.closeTime };

            return (
              <View
                key={item.id}
                style={[styles.row, idx === operatingSchedule.length - 1 && styles.lastRow]}
              >
                <View style={styles.rowMain}>
                  <View style={styles.rowHeader}>
                    <Text style={styles.dayText}>{item.day}</Text>
                    <View style={styles.headerRight}>
                      <Text
                        style={[
                          styles.statusPillText,
                          item.isOpen ? styles.statusOpen : styles.statusClosed,
                        ]}
                      >
                        {item.isOpen ? 'Open for Orders' : 'Closed'}
                      </Text>
                      <ToggleSwitch on={item.isOpen} setOn={() => toggleDay(item.id)} />
                    </View>
                  </View>

                  {item.isOpen && (
                    <>
                      {!isEditing ? (
                        <View style={styles.hoursDisplayRow}>
                          <View style={styles.timeTag}>
                            <AppIcon name="clock" size={13} color={colors.terracotta} />
                            <Text style={styles.hoursText}>
                              {item.openTime} – {item.closeTime}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.editTimingBtn}
                            onPress={() => toggleEditSchedule(item.id, item.openTime, item.closeTime)}
                            accessibilityLabel={`Change timings for ${item.day}`}
                          >
                            <AppIcon name="edit" size={13} color={colors.terracotta} />
                            <Text style={styles.editTimingText}>Change Timings</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={styles.timeEditBox}>
                          <Text style={styles.editBoxTitle}>Set {item.day} Timings</Text>
                          <Text style={styles.customTimeNotice}>Enter custom hours or select from presets:</Text>
                          <View style={styles.pickersRow}>
                            <View style={styles.pickerCol}>
                              <Text style={styles.pickerLabel}>Opening Time</Text>
                              <TextInput
                                style={styles.timeCustomInput}
                                value={currentEdit.openTime}
                                onChangeText={(val) => updateEditTime(item.id, 'openTime', val)}
                                placeholder="10:00 AM"
                              />
                              <select
                                value={currentEdit.openTime}
                                onChange={(e) => updateEditTime(item.id, 'openTime', e.target.value)}
                                style={styles.htmlSelect}
                              >
                                <option value="">Quick select...</option>
                                {standardTimes.map((t) => (
                                  <option key={`open-${t}`} value={t}>
                                    {t}
                                  </option>
                                ))}
                              </select>
                            </View>

                            <View style={styles.pickerCol}>
                              <Text style={styles.pickerLabel}>Closing Time</Text>
                              <TextInput
                                style={styles.timeCustomInput}
                                value={currentEdit.closeTime}
                                onChangeText={(val) => updateEditTime(item.id, 'closeTime', val)}
                                placeholder="10:00 PM"
                              />
                              <select
                                value={currentEdit.closeTime}
                                onChange={(e) => updateEditTime(item.id, 'closeTime', e.target.value)}
                                style={styles.htmlSelect}
                              >
                                <option value="">Quick select...</option>
                                {standardTimes.map((t) => (
                                  <option key={`close-${t}`} value={t}>
                                    {t}
                                  </option>
                                ))}
                              </select>
                            </View>
                          </View>

                          <View style={styles.editActions}>
                            <TouchableOpacity
                              style={styles.cancelEditBtn}
                              onPress={() => toggleEditSchedule(item.id, item.openTime, item.closeTime)}
                            >
                              <Text style={styles.cancelEditText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.saveEditBtn}
                              onPress={() => handleSaveHours(item.id)}
                            >
                              <Text style={styles.saveEditText}>Save Timings</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </AppCard>

        {/* Section 21: Holiday Schedule */}
        <View style={[styles.sectionHeaderRow, { marginTop: 28 }]}>
          <Text style={styles.eyebrow}>HOLIDAY & SPECIAL CLOSURE SCHEDULE</Text>
          <Text style={styles.sectionSubtitle}>
            Plan upcoming festival closures or maintenance days. The store will automatically turn offline.
          </Text>
        </View>

        {/* Add Holiday Form Card */}
        <AppCard style={styles.addHolidayCard}>
          <Text style={styles.cardHeaderTitle}>Schedule a Planned Holiday Closure</Text>
          <View style={styles.holidayFormRow}>
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Select Date *</Text>
              <input
                type="date"
                value={holidayDate}
                onChange={(e) => setHolidayDate(e.target.value)}
                style={styles.htmlDateInput}
              />
            </View>
            <View style={styles.formFieldWide}>
              <Text style={styles.fieldLabel}>Occasion / Reason (Optional)</Text>
              <TextInput
                placeholder="e.g. October 2 — Gandhi Jayanti, Diwali"
                placeholderTextColor={colors.warmGrey}
                value={holidayReason}
                onChangeText={setHolidayReason}
                style={styles.reasonInput}
              />
            </View>
          </View>
          <AppButton
            disabled={!holidayDate}
            onPress={handleAddHoliday}
            style={styles.addHolidayBtn}
            icon={<AppIcon name="plus" size={15} color={colors.white} />}
          >
            Add Scheduled Holiday Closure
          </AppButton>
        </AppCard>

        {/* Scheduled Holidays List */}
        <View style={styles.holidayListSection}>
          <Text style={styles.holidayListTitle}>Active Scheduled Holidays ({holidaySchedule.length})</Text>
          {holidaySchedule.length === 0 ? (
            <AppCard style={styles.emptyHolidayCard}>
              <Text style={styles.emptyHolidayText}>No upcoming holidays scheduled.</Text>
            </AppCard>
          ) : (
            <AppCard style={styles.holidayCardList}>
              {holidaySchedule.map((h, idx) => (
                <View
                  key={h.id}
                  style={[
                    styles.holidayRow,
                    idx === holidaySchedule.length - 1 && styles.lastRow,
                  ]}
                >
                  <View style={styles.holidayLeft}>
                    <View style={styles.holidayDatePill}>
                      <AppIcon name="clock" size={13} color={colors.terracotta} />
                      <Text style={styles.holidayDateText}>{h.displayDate}</Text>
                    </View>
                    <Text style={styles.holidayOccasion}>{h.occasion}</Text>
                    <View style={styles.closedTag}>
                      <Text style={styles.closedTagText}>STORE CLOSED ALL DAY</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleRemoveHoliday(h.id)}
                    style={styles.removeHolidayBtn}
                    accessibilityLabel="Remove holiday"
                  >
                    <Text style={styles.removeHolidayText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </AppCard>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7F6',
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
    maxWidth: 720,
    width: '100%',
    marginHorizontal: 'auto',
  },
  toastNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: radius.card,
    padding: 12,
    marginBottom: 16,
  },
  toastText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Poppins, sans-serif',
    color: '#059669',
  },
  sectionHeaderRow: {
    marginBottom: 10,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Poppins, sans-serif',
    letterSpacing: 1.4,
    color: colors.terracotta,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: 'DM Sans, sans-serif',
    color: colors.charcoal,
    lineHeight: 16,
  },
  listCard: {
    padding: 4,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#E6E3E0',
  },
  row: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECE8',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  rowMain: {
    gap: 8,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dayText: {
    fontSize: 13.5,
    fontWeight: '700',
    fontFamily: 'Poppins, sans-serif',
    color: colors.black,
  },
  statusPillText: {
    fontSize: 10,
    fontFamily: 'Poppins, sans-serif',
    fontWeight: '600',
  },
  statusOpen: {
    color: '#059669',
  },
  statusClosed: {
    color: colors.warmGrey,
  },
  hoursDisplayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8F6F4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  hoursText: {
    fontSize: 11.5,
    fontFamily: 'DM Sans, sans-serif',
    fontWeight: '600',
    color: colors.charcoal,
  },
  editTimingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  editTimingText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Poppins, sans-serif',
    color: colors.terracotta,
  },
  timeEditBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.card,
    padding: 14,
    marginTop: 6,
    gap: 10,
  },
  editBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Poppins, sans-serif',
    color: colors.black,
  },
  customTimeNotice: {
    fontSize: 10.5,
    fontFamily: 'DM Sans, sans-serif',
    color: colors.charcoal,
    marginTop: -4,
    marginBottom: 4,
  },
  pickersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  pickerCol: {
    flex: 1,
    minWidth: 120,
    gap: 4,
  },
  pickerLabel: {
    fontSize: 10.5,
    fontFamily: 'DM Sans, sans-serif',
    color: colors.charcoal,
    fontWeight: '600',
  },
  timeCustomInput: {
    height: 38,
    borderWidth: 1,
    borderColor: '#DEDBD7',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12.5,
    fontFamily: 'DM Sans, sans-serif',
    fontWeight: '600',
    color: colors.black,
    backgroundColor: colors.white,
    outlineStyle: 'none',
  },
  htmlSelect: {
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DEDBD7',
    backgroundColor: colors.white,
    fontSize: 12,
    fontFamily: 'DM Sans, sans-serif',
    color: colors.black,
    outlineStyle: 'none',
    outlineWidth: 0,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  cancelEditBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  cancelEditText: {
    fontSize: 11.5,
    fontFamily: 'Poppins, sans-serif',
    color: colors.charcoal,
  },
  saveEditBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: colors.black,
  },
  saveEditText: {
    fontSize: 11.5,
    fontFamily: 'Poppins, sans-serif',
    fontWeight: '600',
    color: colors.white,
  },
  addHolidayCard: {
    padding: 18,
    borderRadius: radius.card,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E6E3E0',
    gap: 12,
  },
  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Poppins, sans-serif',
    color: colors.black,
  },
  holidayFormRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  formField: {
    flex: 1,
    minWidth: 130,
    gap: 4,
  },
  formFieldWide: {
    flex: 2,
    minWidth: 140,
    gap: 4,
  },
  fieldLabel: {
    fontSize: 10.5,
    fontFamily: 'DM Sans, sans-serif',
    fontWeight: '600',
    color: colors.charcoal,
  },
  htmlDateInput: {
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DEDBD7',
    fontSize: 12,
    fontFamily: 'DM Sans, sans-serif',
    backgroundColor: colors.white,
    color: colors.black,
    outlineStyle: 'none',
    outlineWidth: 0,
  },
  reasonInput: {
    height: 38,
    borderWidth: 1,
    borderColor: '#DEDBD7',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    fontFamily: 'DM Sans, sans-serif',
    color: colors.black,
    backgroundColor: colors.white,
    outlineStyle: 'none',
    outlineWidth: 0,
  },
  addHolidayBtn: {
    minHeight: 40,
    marginTop: 4,
  },
  holidayListSection: {
    marginTop: 20,
    gap: 10,
  },
  holidayListTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Poppins, sans-serif',
    color: colors.black,
  },
  emptyHolidayCard: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  emptyHolidayText: {
    fontSize: 12,
    fontFamily: 'DM Sans, sans-serif',
    color: colors.warmGrey,
  },
  holidayCardList: {
    padding: 0,
    borderRadius: radius.card,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E6E3E0',
    overflow: 'hidden',
  },
  holidayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECE8',
  },
  holidayLeft: {
    gap: 4,
  },
  holidayDatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  holidayDateText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Poppins, sans-serif',
    color: colors.black,
  },
  holidayOccasion: {
    fontSize: 11,
    fontFamily: 'DM Sans, sans-serif',
    color: colors.charcoal,
  },
  closedTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  closedTagText: {
    fontSize: 9,
    fontFamily: 'Poppins, sans-serif',
    fontWeight: '700',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  removeHolidayBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F3F0EC',
  },
  removeHolidayText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Poppins, sans-serif',
    color: colors.charcoal,
  },
});


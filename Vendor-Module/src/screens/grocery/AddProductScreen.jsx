import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { AppHeader } from '../../components/common/AppHeader';
import { AppButton } from '../../components/common/AppButton';
import { AppInput } from '../../components/common/AppInput';
import { AppCard } from '../../components/common/AppCard';
import { AppIcon } from '../../components/common/AppIcon';
import { ToggleSwitch } from '../../components/common/ToggleSwitch';
import { useAppNavigation } from '../../navigation/NavigationContext';
export const AddProductScreen = () => {
    const { navigate, goBack } = useAppNavigation();
    const [name, setName] = useState('');
    const [sku, setSku] = useState('');
    const [brand, setBrand] = useState('');
    const [mrp, setMrp] = useState('');
    const [price, setPrice] = useState('');
    const [unit, setUnit] = useState('250 g');
    const [category, setCategory] = useState('Fresh produce');
    const [isAvailable, setIsAvailable] = useState(true);
    return (<View style={styles.container}>
      <AppHeader title="Add product" onBack={goBack}/>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Photo Drop Area */}
        <TouchableOpacity style={styles.photoDrop} activeOpacity={0.8}>
          <AppIcon name="camera" size={28} color={colors.charcoal}/>
          <Text style={styles.photoDropTitle}>Add product photo</Text>
          <Text style={styles.photoDropSub}>Square image, at least 600 × 600 px</Text>
        </TouchableOpacity>

        {/* Form Stack */}
        <View style={styles.formStack}>
          <AppInput label="Product name" value={name} onChangeText={setName} placeholder="e.g. Organic Avocado"/>

          <AppInput label="SKU / Barcode" value={sku} onChangeText={setSku} placeholder="Scan or enter code" suffix="Scan"/>

          <AppInput label="Brand" value={brand} onChangeText={setBrand} placeholder="Brand name"/>

          <View style={styles.twoFieldsRow}>
            <View style={styles.halfField}>
              <AppInput label="MRP" value={mrp} onChangeText={setMrp} placeholder="₹ 0.00" keyboardType="numeric"/>
            </View>
            <View style={styles.halfField}>
              <AppInput label="Selling price" value={price} onChangeText={setPrice} placeholder="₹ 0.00" keyboardType="numeric"/>
            </View>
          </View>

          <View style={styles.twoFieldsRow}>
            <View style={styles.halfField}>
              <AppInput label="Unit" value={unit} onChangeText={setUnit} placeholder="250 g"/>
            </View>
            <View style={styles.halfField}>
              <AppInput label="Category" value={category} onChangeText={setCategory} placeholder="Fresh produce"/>
            </View>
          </View>
        </View>

        {/* Availability Setting Card */}
        <AppCard style={styles.settingCard}>
          <View>
            <Text style={styles.settingTitle}>Available for sale</Text>
            <Text style={styles.settingSub}>Visible to customers</Text>
          </View>
          <ToggleSwitch on={isAvailable} setOn={setIsAvailable}/>
        </AppCard>

        <AppButton onPress={() => navigate('catalog')} style={styles.saveBtn}>
          Save product
        </AppButton>
      </ScrollView>
    </View>);
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 32,
    },
    photoDrop: {
        minHeight: 135,
        borderRadius: radius.card,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: colors.warmGrey,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        padding: 16,
    },
    photoDropTitle: {
        fontSize: 12,
        fontWeight: '700',
        fontFamily: 'Poppins, sans-serif',
        color: colors.black,
        marginTop: 8,
    },
    photoDropSub: {
        fontSize: 9,
        fontFamily: 'DM Sans, sans-serif',
        color: colors.charcoal,
        marginTop: 3,
    },
    formStack: {
        marginBottom: 10,
    },
    twoFieldsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    halfField: {
        flex: 1,
    },
    settingCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 14,
        marginBottom: 20,
    },
    settingTitle: {
        fontSize: 11.5,
        fontWeight: '700',
        fontFamily: 'Poppins, sans-serif',
        color: colors.black,
    },
    settingSub: {
        fontSize: 9,
        fontFamily: 'DM Sans, sans-serif',
        color: colors.charcoal,
        marginTop: 2,
    },
    saveBtn: {
        marginTop: 4,
    },
});

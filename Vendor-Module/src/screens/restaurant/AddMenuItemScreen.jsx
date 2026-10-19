import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { AppHeader } from '../../components/common/AppHeader';
import { AppButton } from '../../components/common/AppButton';
import { AppInput } from '../../components/common/AppInput';
import { AppCard } from '../../components/common/AppCard';
import { AppIcon } from '../../components/common/AppIcon';
import { ToggleSwitch } from '../../components/common/ToggleSwitch';
import { DocumentUploader } from '../../components/common/DocumentUploader';
import { useAppNavigation } from '../../navigation/NavigationContext';
import { useMenu } from '../../context/MenuContext';

export const AddMenuItemScreen = () => {
  const { navigate, goBack } = useAppNavigation();
  const { editingItem, addItem, updateItem, categories } = useMenu();

  const isEditing = Boolean(editingItem);

  const [itemName, setItemName] = useState(editingItem?.name || '');
  const [price, setPrice] = useState(editingItem?.price ? String(editingItem.price) : '');
  const [category, setCategory] = useState(editingItem?.category || 'Small plates');
  const [description, setDescription] = useState(editingItem?.description || '');
  const [isAvailable, setIsAvailable] = useState(
    editingItem?.isAvailable !== undefined ? editingItem.isAvailable : true
  );
  const [isVeg, setIsVeg] = useState(
    editingItem?.isVeg !== undefined ? editingItem.isVeg : true
  );

  // Variants list and input
  const [variantsList, setVariantsList] = useState(
    editingItem?.variants ? [...editingItem.variants] : []
  );
  const [variantInput, setVariantInput] = useState('');

  // Add-ons list and input
  const [addOnsList, setAddOnsList] = useState(
    editingItem?.addOns ? [...editingItem.addOns] : []
  );
  const [addOnInput, setAddOnInput] = useState('');

  // Photo state (<= 200 KB)
  const [dishPhoto, setDishPhoto] = useState(null);

  // Errors state
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editingItem) {
      setItemName(editingItem.name || '');
      setPrice(editingItem.price ? String(editingItem.price) : '');
      setCategory(editingItem.category || 'Small plates');
      setDescription(editingItem.description || '');
      setIsAvailable(editingItem.isAvailable !== undefined ? editingItem.isAvailable : true);
      setIsVeg(editingItem.isVeg !== undefined ? editingItem.isVeg : true);
      setVariantsList(editingItem.variants ? [...editingItem.variants] : []);
      setAddOnsList(editingItem.addOns ? [...editingItem.addOns] : []);
    }
  }, [editingItem]);

  const handleAddVariant = () => {
    const trimmed = variantInput.trim();
    if (trimmed && !variantsList.includes(trimmed)) {
      setVariantsList([...variantsList, trimmed]);
      setVariantInput('');
    }
  };

  const handleRemoveVariant = (indexToRemove) => {
    setVariantsList(variantsList.filter((_, idx) => idx !== indexToRemove));
  };

  const handleAddAddOn = () => {
    const trimmed = addOnInput.trim();
    if (trimmed && !addOnsList.includes(trimmed)) {
      setAddOnsList([...addOnsList, trimmed]);
      setAddOnInput('');
    }
  };

  const handleRemoveAddOn = (indexToRemove) => {
    setAddOnsList(addOnsList.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSave = () => {
    const errs = {};
    if (!itemName.trim()) {
      errs.itemName = 'Dish name is required';
    }
    if (!price.trim()) {
      errs.price = 'Price is required';
    } else if (isNaN(Number(price)) || Number(price) <= 0) {
      errs.price = 'Enter a valid numeric price';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const dishData = {
      name: itemName.trim(),
      price: price.trim(),
      category: category,
      description: description.trim(),
      isVeg: isVeg,
      isAvailable: isAvailable,
      variants: variantsList,
      addOns: addOnsList,
      photo: dishPhoto?.dataUrl || null,
    };

    if (isEditing) {
      updateItem(editingItem.id, dishData);
    } else {
      addItem(dishData);
    }

    navigate('menu');
  };

  const availableCategories = categories
    .filter((c) => c.name !== 'All')
    .map((c) => c.name);

  return (
    <View style={styles.container}>
      <AppHeader
        title={isEditing ? 'Edit Menu Item' : 'Add Menu Item'}
        onBack={goBack}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Photo Upload with <= 200 KB file limit */}
        <View style={styles.uploadSection}>
          <Text style={styles.sectionLabel}>Dish Photo (Max 200 KB)</Text>
          <DocumentUploader
            label="Dish Image (Square JPG/PNG)"
            fileData={dishPhoto}
            onUploadSuccess={(fileData) => setDishPhoto(fileData)}
            onRemove={() => setDishPhoto(null)}
          />
        </View>

        {/* Form Stack */}
        <View style={styles.formStack}>
          <AppInput
            label="Dish Name *"
            value={itemName}
            onChangeText={(text) => {
              setItemName(text);
              if (errors.itemName) setErrors((prev) => ({ ...prev, itemName: undefined }));
            }}
            placeholder="e.g. Steamed Veg Momos, Half Plate Chowmein"
            error={errors.itemName}
          />

          <View style={styles.twoFieldsRow}>
            <View style={styles.halfField}>
              <AppInput
                label="Price (₹) *"
                value={price}
                onChangeText={(text) => {
                  setPrice(text);
                  if (errors.price) setErrors((prev) => ({ ...prev, price: undefined }));
                }}
                placeholder="₹ 140"
                keyboardType="numeric"
                error={errors.price}
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.inputLabel}>Category *</Text>
              <View style={styles.categorySelectBox}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
                  {availableCategories.map((catName) => {
                    const isSelected = category === catName;
                    return (
                      <TouchableOpacity
                        key={catName}
                        onPress={() => setCategory(catName)}
                        style={[
                          styles.catChoicePill,
                          isSelected && styles.catChoicePillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.catChoiceText,
                            isSelected && styles.catChoiceTextActive,
                          ]}
                        >
                          {catName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </View>

          <AppInput
            label="Description (Optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Freshly steamed dumplings served with fiery garlic chutney"
            multiline
            numberOfLines={2}
          />

          {/* Food Type Selector (Veg / Non-Veg with clear symbols) */}
          <Text style={styles.inputLabel}>Food Preference *</Text>
          <View style={styles.foodTypeRow}>
            {/* Veg Button */}
            <TouchableOpacity
              style={[styles.foodTypeBtn, isVeg && styles.foodTypeBtnActiveVeg]}
              onPress={() => setIsVeg(true)}
              activeOpacity={0.8}
            >
              <View style={styles.vegSquare}>
                <View style={styles.vegDot} />
              </View>
              <Text style={[styles.foodTypeText, isVeg && styles.vegTextActive]}>
                Vegetarian
              </Text>
            </TouchableOpacity>

            {/* Non-Veg Button */}
            <TouchableOpacity
              style={[styles.foodTypeBtn, !isVeg && styles.foodTypeBtnActiveNonVeg]}
              onPress={() => setIsVeg(false)}
              activeOpacity={0.8}
            >
              <View style={styles.nonVegSquare}>
                <View style={styles.nonVegDot} />
              </View>
              <Text style={[styles.foodTypeText, !isVeg && styles.nonVegTextActive]}>
                Non-Vegetarian
              </Text>
            </TouchableOpacity>
          </View>

          {/* Variants Section with working + button */}
          <View style={styles.tagSection}>
            <Text style={styles.inputLabel}>Portion Variants (e.g. Half Plate, Full Plate)</Text>
            <View style={styles.addInputRow}>
              <TextInput
                style={styles.tagTextInput}
                placeholder="Type variant name..."
                placeholderTextColor={colors.warmGrey}
                value={variantInput}
                onChangeText={setVariantInput}
                onSubmitEditing={handleAddVariant}
              />
              <TouchableOpacity
                style={styles.addTagBtn}
                onPress={handleAddVariant}
                activeOpacity={0.8}
              >
                <AppIcon name="plus" size={16} color={colors.white} />
                <Text style={styles.addTagBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tagsDisplayRow}>
              {variantsList.map((variant, idx) => (
                <View key={`v-${idx}`} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{variant}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveVariant(idx)}
                    style={styles.tagRemoveBtn}
                  >
                    <Text style={styles.tagRemoveText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          {/* Add-ons Section with working + button */}
          <View style={styles.tagSection}>
            <Text style={styles.inputLabel}>Customization Add-ons</Text>
            <View style={styles.addInputRow}>
              <TextInput
                style={styles.tagTextInput}
                placeholder="Type add-on (e.g. Extra Chutney, Cheese Dip)..."
                placeholderTextColor={colors.warmGrey}
                value={addOnInput}
                onChangeText={setAddOnInput}
                onSubmitEditing={handleAddAddOn}
              />
              <TouchableOpacity
                style={styles.addTagBtn}
                onPress={handleAddAddOn}
                activeOpacity={0.8}
              >
                <AppIcon name="plus" size={16} color={colors.white} />
                <Text style={styles.addTagBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tagsDisplayRow}>
              {addOnsList.map((addOn, idx) => (
                <View key={`a-${idx}`} style={[styles.tagChip, styles.addonTagChip]}>
                  <Text style={[styles.tagChipText, styles.addonTagText]}>+{addOn}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveAddOn(idx)}
                    style={styles.tagRemoveBtn}
                  >
                    <Text style={[styles.tagRemoveText, styles.addonTagText]}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Availability Setting Row */}
        <AppCard style={styles.settingCard}>
          <View>
            <Text style={styles.settingTitle}>Available for Sale</Text>
            <Text style={styles.settingSub}>
              {isAvailable ? 'Customers can order this dish' : 'Currently hidden from online ordering'}
            </Text>
          </View>
          <ToggleSwitch on={isAvailable} setOn={setIsAvailable} />
        </AppCard>

        {/* Save Button */}
        <AppButton onPress={handleSave} style={styles.saveBtn}>
          {isEditing ? 'Save Changes' : 'Save Item to Menu'}
        </AppButton>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    maxWidth: 640,
    width: '100%',
    marginHorizontal: 'auto',
  },
  uploadSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Poppins, sans-serif',
    color: colors.black,
    marginBottom: 8,
  },
  formStack: {
    marginBottom: 16,
    gap: 14,
  },
  twoFieldsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    fontFamily: 'Poppins, sans-serif',
    color: colors.black,
    marginBottom: 6,
  },
  categorySelectBox: {
    height: 44,
    justifyContent: 'center',
  },
  catScroll: {
    gap: 6,
    alignItems: 'center',
  },
  catChoicePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#F3F0EC',
    borderWidth: 1,
    borderColor: '#E2DED9',
  },
  catChoicePillActive: {
    backgroundColor: colors.terracotta,
    borderColor: colors.terracotta,
  },
  catChoiceText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Poppins, sans-serif',
    color: colors.charcoal,
  },
  catChoiceTextActive: {
    color: colors.white,
  },
  foodTypeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6,
  },
  foodTypeBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E0DDD9',
    backgroundColor: '#FAF9F8',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  foodTypeBtnActiveVeg: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  foodTypeBtnActiveNonVeg: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  vegSquare: {
    width: 16,
    height: 16,
    borderWidth: 2,
    borderColor: '#10B981',
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vegDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  nonVegSquare: {
    width: 16,
    height: 16,
    borderWidth: 2,
    borderColor: '#EF4444',
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nonVegDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
  },
  foodTypeText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Poppins, sans-serif',
    color: colors.charcoal,
  },
  vegTextActive: {
    color: '#059669',
  },
  nonVegTextActive: {
    color: '#DC2626',
  },
  tagSection: {
    gap: 6,
  },
  addInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  tagTextInput: {
    flex: 1,
    height: 42,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#DEDBD7',
    paddingHorizontal: 12,
    fontSize: 12.5,
    fontFamily: 'DM Sans, sans-serif',
    color: colors.black,
    backgroundColor: colors.white,
    outlineStyle: 'none',
    outlineWidth: 0,
  },
  addTagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 42,
    paddingHorizontal: 14,
    borderRadius: radius.card,
    backgroundColor: colors.black,
    justifyContent: 'center',
  },
  addTagBtnText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Poppins, sans-serif',
    color: colors.white,
  },
  tagsDisplayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F0ECE8',
  },
  addonTagChip: {
    backgroundColor: 'rgba(163, 94, 71, 0.1)',
  },
  tagChipText: {
    fontSize: 11,
    fontFamily: 'DM Sans, sans-serif',
    fontWeight: '600',
    color: colors.charcoal,
  },
  addonTagText: {
    color: colors.terracotta,
  },
  tagRemoveBtn: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagRemoveText: {
    fontSize: 11,
    lineHeight: 12,
    fontWeight: '700',
    color: colors.charcoal,
  },
  settingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 20,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.card,
  },
  settingTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    fontFamily: 'Poppins, sans-serif',
    color: colors.black,
  },
  settingSub: {
    fontSize: 10,
    fontFamily: 'DM Sans, sans-serif',
    color: colors.charcoal,
    marginTop: 2,
  },
  saveBtn: {
    minHeight: 48,
  },
});


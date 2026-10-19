import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppIcon } from '../../components/common/AppIcon';
import { useResponsive } from '../../theme/useResponsive';
import { useAppNavigation } from '../../navigation/NavigationContext';
import { useOnboarding } from '../../context/OnboardingContext';
import { vendorOnboardingService } from '../../services/vendorOnboardingService';
import { supabase, isSupabaseConfigured } from '../../lib/supabase.js';

export const AddressRadiusScreen = () => {
  const { navigate, goBack } = useAppNavigation();
  const { addressDetails, setAddressDetails, vendorId, storeId } = useOnboarding();
  const { isMobile } = useResponsive();

  const [addressError, setAddressError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleAdjustRadius = (delta) => {
    setAddressDetails((prev) => ({
      ...prev,
      serviceRadiusKm: Math.max(1, Math.min(20, (prev.serviceRadiusKm || 6) + delta)),
    }));
  };

  const handleSliderChange = (newVal) => {
    const km = Math.max(1, Math.min(20, parseInt(newVal, 10) || 1));
    setAddressDetails((prev) => ({
      ...prev,
      serviceRadiusKm: km,
    }));
  };

  const handleConfirmLocation = async () => {
    if (!addressDetails.address?.trim() || addressDetails.address.trim().length < 5) {
      setAddressError('Please enter a valid, complete business address (min 5 characters).');
      return;
    }
    if (isSaving) return;
    setAddressError('');
    setSaveError('');
    setIsSaving(true);
    try {
      if (isSupabaseConfigured) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          let currentStoreId = storeId;
          if (!currentStoreId) {
            let currentVendorId = vendorId;
            if (!currentVendorId) {
              const { data: v } = await supabase
                .from('vendors')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();
              if (v?.id) currentVendorId = v.id;
            }
            if (currentVendorId) {
              const { data: s } = await supabase
                .from('stores')
                .select('id')
                .eq('vendor_id', currentVendorId)
                .maybeSingle();
              if (s?.id) currentStoreId = s.id;
            }
          }

          if (currentStoreId) {
            await vendorOnboardingService.saveAddressAndDelivery(currentStoreId, addressDetails);
          }
        }
      }
      navigate('kyc');
    } catch (err) {
      console.warn('[AddressRadius] Save failed:', err);
      setSaveError(err.message || 'Failed to save address and delivery settings. Please check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const currentKm = addressDetails.serviceRadiusKm || 6;
  const progressPercent = Math.min(100, Math.max(0, ((currentKm - 1) / 19) * 100));

  return (
    <View style={styles.container}>
      {isMobile && <AppHeader title="Store Location & Radius" onBack={goBack} />}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          !isMobile && styles.scrollContentDesktop,
        ]}
      >
        <Text style={styles.eyebrow}>STORE LOCATION</Text>
        <Text style={styles.title}>Where can customers find you?</Text>
        <Text style={styles.subtitle}>
          Pin your entrance accurately for smooth customer deliveries and rider pickups.
        </Text>

        {/* Map Simulation Container */}
        <View style={styles.mapContainer}>
          <View style={[styles.street, styles.street1]} />
          <View style={[styles.street, styles.street2]} />
          <View style={[styles.street, styles.street3]} />

          <View style={styles.mapPinContainer}>
            <View style={styles.mapPin}>
              <View style={styles.pinIconWrapper}>
                <AppIcon name="store" size={18} color={colors.white} />
              </View>
            </View>
          </View>

          <View style={styles.streetBadge}>
            <Text style={styles.streetBadgeText}>100 Feet Road, Indiranagar</Text>
          </View>
        </View>

        <AppInput
          label="Registered Business Address *"
          value={addressDetails.address}
          onChangeText={(txt) => {
            setAddressDetails((p) => ({ ...p, address: txt }));
            if (addressError) setAddressError('');
          }}
          placeholder="e.g. 12, HAL 2nd Stage, 100 Feet Road, Indiranagar"
          error={addressError}
        />

        {/* Interactive Service Radius Slider */}
        <AppCard style={styles.radiusCard}>
          <View style={[styles.radiusHeader, isMobile && styles.radiusHeaderMobile]}>
            <View style={styles.radiusTitleBlock}>
              <Text style={styles.radiusLabel}>Delivery & Service Radius</Text>
              <Text style={styles.radiusSub}>
                Orders accepted within this range (1 to 20 km)
              </Text>
            </View>
            <View style={styles.radiusControls}>
              <TouchableOpacity
                onPress={() => handleAdjustRadius(-1)}
                style={styles.radiusBtn}
                accessibilityLabel="Decrease radius"
              >
                <AppIcon name="minus" size={14} color={colors.terracotta} />
              </TouchableOpacity>
              <Text style={styles.radiusValue}>{currentKm} km</Text>
              <TouchableOpacity
                onPress={() => handleAdjustRadius(1)}
                style={styles.radiusBtn}
                accessibilityLabel="Increase radius"
              >
                <AppIcon name="plus" size={14} color={colors.terracotta} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Interactive Range Track */}
          <View style={styles.sliderContainer}>
            <View style={styles.rangeTrack}>
              <View
                style={[
                  styles.rangeFill,
                  { width: `${progressPercent}%` },
                ]}
              >
                <View style={styles.rangeThumb} />
              </View>
            </View>

            {/* Native HTML Slider overlay for drag/click interaction */}
            {Platform.OS === 'web' && (
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                value={currentKm}
                onChange={(e) => handleSliderChange(e.target.value)}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer',
                  margin: 0,
                }}
              />
            )}
          </View>

          <View style={styles.sliderLabels}>
            <Text style={styles.limitLabel}>1 km</Text>
            <Text style={styles.limitLabel}>5 km</Text>
            <Text style={styles.limitLabel}>10 km</Text>
            <Text style={styles.limitLabel}>15 km</Text>
            <Text style={styles.limitLabel}>20 km</Text>
          </View>
        </AppCard>

        {saveError ? (
          <View style={styles.errorBanner}>
            <AppIcon name="close" size={14} color={colors.danger} />
            <Text style={styles.errorBannerText}>{saveError}</Text>
          </View>
        ) : null}

        <AppButton onPress={handleConfirmLocation} style={styles.confirmBtn} loading={isSaving}>
          Confirm Location & Continue
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
    flexGrow: 1,
  },
  scrollContentDesktop: {
    padding: 36,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Poppins, sans-serif',
    letterSpacing: 1.4,
    color: colors.terracotta,
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Poppins, sans-serif',
    color: colors.black,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'DM Sans, sans-serif',
    color: colors.charcoal,
    lineHeight: 18,
    marginBottom: 20,
  },
  mapContainer: {
    height: 180,
    backgroundColor: '#EAE6E1',
    borderRadius: radius.card,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 20,
  },
  street: {
    position: 'absolute',
    backgroundColor: '#DCD6CE',
  },
  street1: {
    width: '100%',
    height: 18,
    top: 50,
  },
  street2: {
    width: 22,
    height: '100%',
    left: '42%',
  },
  street3: {
    width: '100%',
    height: 16,
    bottom: 35,
  },
  mapPinContainer: {
    position: 'absolute',
    top: '35%',
    left: '42%',
    transform: [{ translateX: -16 }, { translateY: -16 }],
  },
  mapPin: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.terracotta,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  pinIconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  streetBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  streetBadgeText: {
    fontSize: 11,
    fontFamily: 'DM Sans, sans-serif',
    fontWeight: '600',
    color: colors.black,
  },
  radiusCard: {
    padding: 16,
    marginBottom: 24,
  },
  radiusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  radiusHeaderMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 10,
  },
  radiusTitleBlock: {
    flex: 1,
    flexShrink: 1,
  },
  radiusLabel: {
    fontSize: 13,
    fontFamily: 'Poppins, sans-serif',
    fontWeight: '600',
    color: colors.black,
  },
  radiusSub: {
    fontSize: 11,
    fontFamily: 'DM Sans, sans-serif',
    color: colors.charcoal,
    marginTop: 2,
  },
  radiusControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.button,
    alignSelf: 'flex-start',
  },
  radiusBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radiusValue: {
    fontSize: 13,
    fontFamily: 'Poppins, sans-serif',
    fontWeight: '700',
    color: colors.black,
    minWidth: 46,
    textAlign: 'center',
  },
  sliderContainer: {
    position: 'relative',
    height: 24,
    justifyContent: 'center',
  },
  rangeTrack: {
    width: '100%',
    height: 6,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 3,
  },
  rangeFill: {
    height: '100%',
    backgroundColor: colors.terracotta,
    borderRadius: 3,
    position: 'relative',
  },
  rangeThumb: {
    position: 'absolute',
    right: -9,
    top: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.terracotta,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  limitLabel: {
    fontSize: 10,
    fontFamily: 'DM Sans, sans-serif',
    color: colors.warmGrey,
  },
  confirmBtn: {
    minHeight: 48,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 12,
    fontFamily: 'DM Sans, sans-serif',
    color: colors.danger,
    flex: 1,
  },
});

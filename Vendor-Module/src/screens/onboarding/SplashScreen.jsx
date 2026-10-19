import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { AppLogo } from '../../components/common/AppLogo';
import { AppButton } from '../../components/common/AppButton';
import { AppIcon } from '../../components/common/AppIcon';
import { useResponsive } from '../../theme/useResponsive';
import { useAppNavigation } from '../../navigation/NavigationContext';
import welcomeHeroImg from '../../assets/images/welcome-hero.jpg';

export const SplashScreen = () => {
  const { navigate } = useAppNavigation();
  const { isMobile, isTablet } = useResponsive();

  return (
    <View style={styles.container}>
      {isMobile ? (
        // Mobile Layout: Vertical Flow with Hero Banner & Bottom Action Card
        <ScrollView
          style={styles.mobileScroll}
          contentContainerStyle={styles.mobileScrollContent}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {/* Mobile Top Hero Image with Restrained Green Treatment */}
          <View style={styles.mobileHeroContainer}>
            <Image
              source={{ uri: welcomeHeroImg }}
              style={styles.mobileHeroImage}
              resizeMode="cover"
            />
            <View style={styles.heroOverlayGradient} />
            <View style={styles.mobileHeroBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.mobileHeroBadgeText}>
                VERIFIED MERCHANT NETWORK
              </Text>
            </View>
          </View>

          {/* Mobile Card Content */}
          <View style={styles.mobileBody}>
            {/* Real RoadRider Logo */}
            <View style={styles.mobileLogoContainer}>
              <AppLogo scale={1.2} />
            </View>

            {/* Existing Tagline */}
            <Text style={styles.tagline}>
              Run your business.{'\n'}We’ll move the rest.
            </Text>

            <Text style={styles.subheadline}>
              Power your restaurant or grocery outlet with high-velocity orders,
              instant dispatch, and automated settlements.
            </Text>

            {/* Restrained Green Accent Highlights */}
            <View style={styles.highlightsContainer}>
              <View style={styles.highlightPill}>
                <AppIcon name="check" size={13} color="#059669" strokeWidth={2.5} />
                <Text style={styles.highlightText}>Lowest 8% Platform Fee</Text>
              </View>
              <View style={styles.highlightPill}>
                <AppIcon name="clock" size={13} color="#059669" strokeWidth={2} />
                <Text style={styles.highlightText}>Daily Direct Settlements</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.bottomSection}>
              <AppButton
                onPress={() => navigate('role')}
                style={styles.getStartedBtn}
              >
                Get Started as New Partner
              </AppButton>

              <TouchableOpacity
                style={styles.signInBtn}
                onPress={() => navigate('signin')}
                activeOpacity={0.7}
              >
                <Text style={styles.signInText}>
                  Already a partner?{' '}
                  <Text style={styles.signInLink}>Sign In with OTP</Text>
                </Text>
              </TouchableOpacity>

              <Text style={styles.caption}>MERCHANT OPERATIONS</Text>
            </View>
          </View>
        </ScrollView>
      ) : (
        // Desktop & Tablet Layout: Elegant Split-Card with Culinary Photo & Subtle Green Ambient
        <View style={[styles.desktopCard, isTablet && styles.tabletCard]}>
          {/* Left Column: Premium Photography with Subtle Green Treatment */}
          <View style={styles.desktopHeroCol}>
            <Image
              source={{ uri: welcomeHeroImg }}
              style={styles.desktopHeroImage}
              resizeMode="cover"
            />
            {/* Subtle green visual treatment overlay */}
            <View style={styles.heroOverlayGradient} />
            <View style={styles.heroOverlayContent}>
              <View style={styles.desktopPillBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.desktopPillBadgeText}>
                  ROADRIDER PARTNER NETWORK
                </Text>
              </View>

              <View style={styles.heroQuoteBox}>
                <Text style={styles.heroQuoteTitle}>
                  Crafted for Restaurants & Grocers
                </Text>
                <Text style={styles.heroQuoteDesc}>
                  Join thousands of local kitchens and merchant partners delivering
                  fresh culinary experiences across town.
                </Text>
              </View>
            </View>
          </View>

          {/* Right Column: Clean White Onboarding Panel */}
          <View style={styles.desktopContentCol}>
            <View style={styles.desktopContentHeader}>
              <AppLogo scale={1.25} />
              <View style={styles.roleTag}>
                <Text style={styles.roleTagText}>PARTNER ONBOARDING</Text>
              </View>
            </View>

            <View style={styles.desktopMiddle}>
              <Text style={styles.desktopTagline}>
                Run your business.{'\n'}We’ll move the rest.
              </Text>
              <Text style={styles.desktopSubheadline}>
                Empower your storefront with integrated kitchen display, instant rider
                dispatch, and automated next-day bank transfers.
              </Text>

              {/* Value Highlights */}
              <View style={styles.desktopHighlights}>
                <View style={styles.desktopHighlightItem}>
                  <View style={styles.desktopHighlightIconBox}>
                    <AppIcon name="check" size={13} color="#059669" strokeWidth={2.5} />
                  </View>
                  <View>
                    <Text style={styles.desktopHighlightTitle}>
                      Simple 10-step digital onboarding
                    </Text>
                    <Text style={styles.desktopHighlightDesc}>
                      Fast document verification and rapid outlet launch
                    </Text>
                  </View>
                </View>

                <View style={styles.desktopHighlightItem}>
                  <View style={styles.desktopHighlightIconBox}>
                    <AppIcon name="orders" size={13} color="#059669" strokeWidth={2} />
                  </View>
                  <View>
                    <Text style={styles.desktopHighlightTitle}>
                      Dedicated restaurant & grocery portals
                    </Text>
                    <Text style={styles.desktopHighlightDesc}>
                      Tailored workflows for live menus or bulk retail inventory
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Bottom Actions */}
            <View style={styles.desktopBottomSection}>
              <AppButton
                onPress={() => navigate('role')}
                style={styles.getStartedBtn}
              >
                Get Started as New Partner
              </AppButton>

              <TouchableOpacity
                style={styles.signInBtn}
                onPress={() => navigate('signin')}
                activeOpacity={0.7}
              >
                <Text style={styles.signInText}>
                  Already a partner?{' '}
                  <Text style={styles.signInLink}>Sign In with OTP</Text>
                </Text>
              </TouchableOpacity>

              <Text style={styles.caption}>
                MERCHANT OPERATIONS • ROADRIDER VENDOR PLATFORM
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },

  // Desktop & Tablet Card
  desktopCard: {
    flexDirection: 'row',
    width: '92%',
    maxWidth: 960,
    minHeight: 570,
    maxHeight: 680,
    backgroundColor: colors.white,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 36,
    elevation: 8,
  },
  tabletCard: {
    maxWidth: 780,
    minHeight: 530,
  },

  // Left Hero Column (Photo + Subtle Green Treatment)
  desktopHeroCol: {
    width: '46%',
    position: 'relative',
    backgroundColor: '#064E3B',
    overflow: 'hidden',
  },
  desktopHeroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  // Subtle green visual treatment overlay (restrained emerald tint with deep vignette)
  heroOverlayGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 78, 59, 0.42)',
    backdropFilter: 'blur(0.5px)',
  },
  heroOverlayContent: {
    flex: 1,
    padding: 36,
    justifyContent: 'space-between',
    zIndex: 2,
  },
  desktopPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#059669',
  },
  desktopPillBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins, sans-serif',
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#064E3B',
  },
  heroQuoteBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  heroQuoteTitle: {
    fontFamily: 'Poppins, sans-serif',
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 6,
    lineHeight: 22,
  },
  heroQuoteDesc: {
    fontFamily: 'DM Sans, sans-serif',
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.82)',
    lineHeight: 18,
  },

  // Right Content Column
  desktopContentCol: {
    width: '54%',
    paddingHorizontal: 44,
    paddingVertical: 40,
    justifyContent: 'space-between',
    backgroundColor: colors.white,
  },
  desktopContentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  roleTag: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.2)',
  },
  roleTagText: {
    fontSize: 9.5,
    fontFamily: 'Poppins, sans-serif',
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 1,
  },
  desktopMiddle: {
    marginVertical: 18,
  },
  desktopTagline: {
    fontFamily: 'Poppins, sans-serif',
    fontSize: 25,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 34,
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  desktopSubheadline: {
    fontFamily: 'DM Sans, sans-serif',
    fontSize: 13.5,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 20,
  },
  desktopHighlights: {
    gap: 12,
  },
  desktopHighlightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  desktopHighlightIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  desktopHighlightTitle: {
    fontFamily: 'Poppins, sans-serif',
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1F2937',
  },
  desktopHighlightDesc: {
    fontFamily: 'DM Sans, sans-serif',
    fontSize: 11.5,
    color: '#6B7280',
    lineHeight: 16,
  },

  // Desktop Bottom Actions
  desktopBottomSection: {
    width: '100%',
    alignItems: 'center',
    gap: 14,
    paddingTop: 10,
  },

  // Mobile Styles
  mobileScroll: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.white,
  },
  mobileScrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingBottom: 28,
  },
  mobileHeroContainer: {
    width: '100%',
    height: 210,
    position: 'relative',
    backgroundColor: '#064E3B',
  },
  mobileHeroImage: {
    width: '100%',
    height: '100%',
  },
  mobileHeroBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  mobileHeroBadgeText: {
    fontSize: 9,
    fontFamily: 'Poppins, sans-serif',
    fontWeight: '700',
    letterSpacing: 1,
    color: '#064E3B',
  },
  mobileBody: {
    paddingHorizontal: 24,
    paddingTop: 24,
    flex: 1,
    justifyContent: 'space-between',
  },
  mobileLogoContainer: {
    marginBottom: 16,
  },
  tagline: {
    fontFamily: 'Poppins, sans-serif',
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 30,
    marginBottom: 10,
  },
  subheadline: {
    fontFamily: 'DM Sans, sans-serif',
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 19,
    marginBottom: 18,
  },
  highlightsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 26,
  },
  highlightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.15)',
  },
  highlightText: {
    fontSize: 11.5,
    fontFamily: 'DM Sans, sans-serif',
    fontWeight: '500',
    color: '#065F46',
  },

  // Common Action Styles
  bottomSection: {
    width: '100%',
    alignItems: 'center',
    gap: 14,
    marginTop: 'auto',
  },
  getStartedBtn: {
    minHeight: 50,
    width: '100%',
    borderRadius: 10,
    backgroundColor: '#059669', // Restrained emerald green primary
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  signInBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  signInText: {
    fontSize: 13,
    fontFamily: 'DM Sans, sans-serif',
    color: '#4B5563',
  },
  signInLink: {
    color: '#059669',
    fontWeight: '700',
  },
  caption: {
    fontSize: 9,
    fontFamily: 'Poppins, sans-serif',
    letterSpacing: 2,
    color: colors.warmGrey,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
});

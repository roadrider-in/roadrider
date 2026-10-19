import React, { useEffect, useState } from 'react';
import { useAppNavigation } from './NavigationContext';
import { AppShell } from '../components/layout/AppShell';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Onboarding Screens (01 - 11)
import { SplashScreen } from '../screens/onboarding/SplashScreen';
import { SignInScreen } from '../screens/auth/SignInScreen';
import { ChooseBusinessScreen } from '../screens/onboarding/ChooseBusinessScreen';
import { MobileVerificationScreen } from '../screens/onboarding/MobileVerificationScreen';
import { BusinessDetailsScreen } from '../screens/onboarding/BusinessDetailsScreen';
import { TaxBankScreen } from '../screens/onboarding/TaxBankScreen';
import { AddressRadiusScreen } from '../screens/onboarding/AddressRadiusScreen';
import { KycDocumentsScreen } from '../screens/onboarding/KycDocumentsScreen';
import { StorePhotosScreen } from '../screens/onboarding/StorePhotosScreen';
import { TermsConditionsScreen } from '../screens/onboarding/TermsConditionsScreen';
import { VerificationPendingScreen } from '../screens/onboarding/VerificationPendingScreen';
import { ApprovalSuccessScreen } from '../screens/onboarding/ApprovalSuccessScreen';

// Restaurant Screens (12 - 23)
import { RestaurantHomeScreen } from '../screens/restaurant/RestaurantHomeScreen';
import { IncomingOrdersScreen } from '../screens/restaurant/IncomingOrdersScreen';
import { ActiveOrdersScreen } from '../screens/restaurant/ActiveOrdersScreen';
import { OrderDetailScreen } from '../screens/restaurant/OrderDetailScreen';
import { MenuManagementScreen } from '../screens/restaurant/MenuManagementScreen';
import { AddMenuItemScreen } from '../screens/restaurant/AddMenuItemScreen';
import { OffersScreen } from '../screens/restaurant/OffersScreen';
import { OperatingHoursScreen } from '../screens/restaurant/OperatingHoursScreen';
import { DeliverySettingsScreen } from '../screens/restaurant/DeliverySettingsScreen';
import { ReviewsRatingsScreen } from '../screens/restaurant/ReviewsRatingsScreen';
import { PayoutReconciliationScreen } from '../screens/restaurant/PayoutReconciliationScreen';
import { SupportCenterScreen } from '../screens/restaurant/SupportCenterScreen';

// Grocery Screens (24 - 31)
import { GroceryHomeScreen } from '../screens/grocery/GroceryHomeScreen';
import { ProductCatalogScreen } from '../screens/grocery/ProductCatalogScreen';
import { AddProductScreen } from '../screens/grocery/AddProductScreen';
import { BulkImportScreen } from '../screens/grocery/BulkImportScreen';
import { InventoryScreen } from '../screens/grocery/InventoryScreen';
import { LowStockAlertsScreen } from '../screens/grocery/LowStockAlertsScreen';
import { OrderPickingScreen } from '../screens/grocery/OrderPickingScreen';
import { SalesAnalyticsScreen } from '../screens/grocery/SalesAnalyticsScreen';

// Shared Screens (32 - 36)
import { NotificationsScreen } from '../screens/shared/NotificationsScreen';
import { ProfileSettingsScreen } from '../screens/shared/ProfileSettingsScreen';
import { BankAccountScreen } from '../screens/shared/BankAccountScreen';
import { StoreSwitcherScreen } from '../screens/shared/StoreSwitcherScreen';
import { EmptyErrorStatesScreen } from '../screens/shared/EmptyErrorStatesScreen';
import { ProfileSectionDetailScreen } from '../screens/shared/ProfileSectionDetailScreen';
import { useOnboarding } from '../context/OnboardingContext';
import { useVendor } from '../context/VendorContext';
import { sessionOtpGate } from '../services/sessionOtpGate';

// Strictly public screens accessible without prior OTP verification
const PUBLIC_UNAUTHENTICATED_SCREENS = [
  'splash',
  'signin',
  'role',
  'phone',
  'support',
];

// Subsequent onboarding steps that strictly require prior business type selection
const SUBSEQUENT_ONBOARDING_STEPS = [
  'phone',
  'business',
  'tax',
  'address',
  'kyc',
  'photos',
  'terms',
];

// Restaurant vendor portal screens
const RESTAURANT_PORTAL_SCREENS = [
  'restaurant-home',
  'incoming',
  'active',
  'order-detail',
  'menu',
  'menu-item',
  'offers',
  'hours',
  'delivery',
  'reviews',
  'restaurant-payout',
];

// Grocery vendor portal screens
const GROCERY_PORTAL_SCREENS = [
  'grocery-home',
  'catalog',
  'product',
  'import',
  'inventory',
  'low-stock',
  'picking',
  'analytics',
];

export const RootNavigator = () => {
  const { currentScreen, navigate } = useAppNavigation();
  const { vendorRole, verificationStatus, isLoadingSavedState, isSessionOtpVerified } = useOnboarding();
  const { vendorType } = useVendor();
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    let mounted = true;
    if (!isSupabaseConfigured) {
      setSession(null);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data?.session || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!mounted) return;
      setSession(currentSession || null);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const isProtected = !PUBLIC_UNAUTHENTICATED_SCREENS.includes(currentScreen);
  const isOtpGatePassed = Boolean(
    isSessionOtpVerified &&
    session?.user?.id &&
    sessionOtpGate.isSessionOtpVerified(session.user.id)
  );

  // Auth & OTP Guard: unauthenticated or unverified users accessing protected screens are routed to phone verification
  useEffect(() => {
    if (isProtected && !isOtpGatePassed) {
      console.warn(`[OTP GUARD] Access to protected screen "${currentScreen}" blocked: Phone OTP verification required.`);
      navigate(currentScreen === 'signin' ? 'signin' : 'phone');
    }
  }, [currentScreen, isProtected, isOtpGatePassed]);

  // Navigation Guard 1: Enforce Business Type selection before accessing subsequent onboarding steps
  useEffect(() => {
    if (SUBSEQUENT_ONBOARDING_STEPS.includes(currentScreen) && !vendorRole) {
      console.warn(
        `[GUARD] Access to onboarding step "${currentScreen}" blocked: business type not selected. Redirecting to role selection.`
      );
      navigate('role');
    }
  }, [currentScreen, vendorRole]);

  // Navigation Guard 2: Enforce portal isolation between Restaurant and Grocery vendors
  useEffect(() => {
    const activeRole = vendorType || vendorRole;
    if (activeRole === 'restaurant' && GROCERY_PORTAL_SCREENS.includes(currentScreen)) {
      console.warn(
        `[PORTAL GUARD] Restaurant vendor cannot access grocery screen "${currentScreen}". Redirecting to restaurant dashboard.`
      );
      navigate('restaurant-home');
    } else if (activeRole === 'grocery' && RESTAURANT_PORTAL_SCREENS.includes(currentScreen)) {
      console.warn(
        `[PORTAL GUARD] Grocery vendor cannot access restaurant screen "${currentScreen}". Redirecting to grocery dashboard.`
      );
      navigate('grocery-home');
    }
  }, [currentScreen, vendorType, vendorRole]);

  // Navigation Guard 3: Enforce real Master Admin approval before accessing live-store or order functionality
  useEffect(() => {
    const isLivePortalScreen =
      currentScreen === 'approved' ||
      RESTAURANT_PORTAL_SCREENS.includes(currentScreen) ||
      GROCERY_PORTAL_SCREENS.includes(currentScreen);

    if (isLivePortalScreen && !isLoadingSavedState && session && verificationStatus !== 'verified') {
      console.warn(
        `[VERIFICATION GUARD] Access to live store functionality blocked: vendor is not verified (status: ${verificationStatus}). Redirecting to verification status screen.`
      );
      navigate('pending');
    }
  }, [currentScreen, verificationStatus, isLoadingSavedState, session]);

  const renderScreen = () => {
    // Immediate render guard: Block any protected screen if phone OTP verification hasn't passed in current session
    if (isProtected && !isOtpGatePassed) {
      return currentScreen === 'signin' ? <SignInScreen /> : <MobileVerificationScreen />;
    }

    // Immediate render guard: Block subsequent onboarding steps if business type not selected
    if (SUBSEQUENT_ONBOARDING_STEPS.includes(currentScreen) && !vendorRole) {
      return <ChooseBusinessScreen />;
    }

    // Immediate render guard: Portal isolation
    const activeRole = vendorType || vendorRole;
    if (activeRole === 'restaurant' && GROCERY_PORTAL_SCREENS.includes(currentScreen)) {
      return <RestaurantHomeScreen />;
    }
    if (activeRole === 'grocery' && RESTAURANT_PORTAL_SCREENS.includes(currentScreen)) {
      return <GroceryHomeScreen />;
    }

    // Immediate render guard: Block live store and orders until Master Admin approves
    const isLivePortalScreen =
      currentScreen === 'approved' ||
      RESTAURANT_PORTAL_SCREENS.includes(currentScreen) ||
      GROCERY_PORTAL_SCREENS.includes(currentScreen);

    if (isLivePortalScreen && !isLoadingSavedState && session && verificationStatus !== 'verified') {
      return <VerificationPendingScreen />;
    }

    switch (currentScreen) {
      // Onboarding
      case 'splash':
        return <SplashScreen />;
      case 'signin':
        return <SignInScreen />;
      case 'role':
        return <ChooseBusinessScreen />;
      case 'phone':
        return <MobileVerificationScreen />;
      case 'business':
        return <BusinessDetailsScreen />;
      case 'tax':
        return <TaxBankScreen />;
      case 'address':
        return <AddressRadiusScreen />;
      case 'kyc':
        return <KycDocumentsScreen />;
      case 'photos':
        return <StorePhotosScreen />;
      case 'terms':
        return <TermsConditionsScreen />;
      case 'pending':
        return <VerificationPendingScreen />;
      case 'approved':
        return <ApprovalSuccessScreen />;

      // Restaurant
      case 'restaurant-home':
        return <RestaurantHomeScreen />;
      case 'incoming':
        return <IncomingOrdersScreen />;
      case 'active':
        return <ActiveOrdersScreen />;
      case 'order-detail':
        return <OrderDetailScreen />;
      case 'menu':
        return <MenuManagementScreen />;
      case 'menu-item':
        return <AddMenuItemScreen />;
      case 'offers':
        return <OffersScreen />;
      case 'hours':
        return <OperatingHoursScreen />;
      case 'delivery':
        return <DeliverySettingsScreen />;
      case 'reviews':
        return <ReviewsRatingsScreen />;
      case 'restaurant-payout':
        return <PayoutReconciliationScreen />;
      case 'support':
        return <SupportCenterScreen />;

      // Grocery
      case 'grocery-home':
        return <GroceryHomeScreen />;
      case 'catalog':
        return <ProductCatalogScreen />;
      case 'product':
        return <AddProductScreen />;
      case 'import':
        return <BulkImportScreen />;
      case 'inventory':
        return <InventoryScreen />;
      case 'low-stock':
        return <LowStockAlertsScreen />;
      case 'picking':
        return <OrderPickingScreen />;
      case 'analytics':
        return <SalesAnalyticsScreen />;

      // Shared
      case 'notifications':
        return <NotificationsScreen />;
      case 'account':
        return <ProfileSettingsScreen />;
      case 'bank':
        return <BankAccountScreen />;
      case 'stores':
        return <StoreSwitcherScreen />;
      case 'profile-business':
        return <ProfileSectionDetailScreen section="business" />;
      case 'profile-kyc':
        return <ProfileSectionDetailScreen section="kyc" />;
      case 'profile-photos':
        return <ProfileSectionDetailScreen section="photos" />;
      case 'profile-location':
        return <ProfileSectionDetailScreen section="location" />;
      case 'onboard-outlet':
        return <ChooseBusinessScreen />;
      case 'states':
        return <EmptyErrorStatesScreen />;

      default:
        return <RestaurantHomeScreen />;
    }
  };

  return <AppShell>{renderScreen()}</AppShell>;
};

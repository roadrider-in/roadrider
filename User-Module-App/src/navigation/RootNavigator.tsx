import React, { useMemo, useState } from "react";
import { View, StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type {
  RootStackParamList,
  BottomTabParamList,
  TabName,
} from "./types";
import { useApp } from "../state/AppState";
import { isOrderActive } from "../lib/orderService";
import Logo from "../components/Logo";
import AppOpeningSplash from "../components/animations/AppOpeningSplash";

// Auth Screens
import Splash from "../screens/auth/Splash";
import PhoneLogin from "../screens/auth/PhoneLogin";
import OtpVerify from "../screens/auth/OtpVerify";

// Home Screens
import FoodHome from "../screens/home/FoodHome";
import RidesHome from "../screens/home/RidesHome";
import GroceryHome from "../screens/home/GroceryHome";
import CourierHome from "../screens/home/CourierHome";

// Flow Screens
import StoreDetail from "../screens/flow/StoreDetail";
import RideConfirm from "../screens/flow/RideConfirm";
import RidePickupDrop from "../screens/flow/RidePickupDrop";
import RidePickupPoint from "../screens/flow/RidePickupPoint";
import CourierDropSearch from "../screens/flow/CourierDropSearch";
import CourierRouteSelect from "../screens/flow/CourierRouteSelect";
import CourierSearching from "../screens/flow/CourierSearching";
import CourierTracking from "../screens/flow/CourierTracking";
import Cart from "../screens/flow/Cart";
import DeliveryDetails from "../screens/flow/DeliveryDetails";
import Payment from "../screens/flow/Payment";
import OrderStatus from "../screens/flow/OrderStatus";
import OrderComplete from "../screens/flow/OrderComplete";
import WaitingForRider from "../screens/flow/WaitingForRider";
import RideTracking from "../screens/flow/RideTracking";

// Tab Screens
import NavCart from "../screens/tabs/NavCart";
import Orders from "../screens/tabs/Orders";
import Account from "../screens/tabs/Account";

// Auxiliary & More Screens
import AddAddress from "../screens/more/AddAddress";
import Help from "../screens/more/Help";
import PaymentMethods from "../screens/more/PaymentMethods";
import AddMoney from "../screens/more/AddMoney";
import Places from "../screens/more/Places";
import NoInternet from "../screens/more/NoInternet";
import Notifications from "../screens/more/Notifications";
import AddPaymentMethod from "../screens/more/AddPaymentMethod";
import ChatSupport from "../screens/more/ChatSupport";
import RestaurantsList from "../screens/more/RestaurantsList";
import OrderDetail from "../screens/more/OrderDetail";
import Profile from "../screens/more/Profile";
import Transactions from "../screens/more/Transactions";
import Favorites from "../screens/more/Favorites";
import ReportIssue from "../screens/more/ReportIssue";
import SupportTickets from "../screens/more/SupportTickets";
import TicketDetail from "../screens/more/TicketDetail";

// Shared Components
import BottomNav from "../components/BottomNav";
import LocationSelectionBottomSheet from "../components/LocationSelectionBottomSheet";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<BottomTabParamList>();

/**
 * Stable Screen Wrappers to prevent component remounts on parent state changes
 */
function OtpVerifyScreen({ route }: any) {
  return <OtpVerify phone={route.params?.phone || ""} />;
}

function StoreDetailScreen({ route }: any) {
  return (
    <StoreDetail
      service={route.params?.service || "food"}
      storeId={route.params?.storeId}
      highlightItemId={route.params?.highlightItemId}
    />
  );
}

function CartScreen({ route }: any) {
  return <Cart service={route.params?.service || "food"} />;
}

function DeliveryDetailsScreen({ route }: any) {
  return <DeliveryDetails service={route.params?.service || "food"} />;
}

function PaymentScreen({ route }: any) {
  return <Payment service={route.params?.service || "food"} />;
}

function OrderStatusScreen({ route }: any) {
  const { state } = useApp();
  const orderId = route.params?.orderId;
  const order = state.orders.find((o) => o.id === orderId || o.dbId === orderId);
  if (order?.service === "courier") {
    if (order.status <= 0 && !order.partnerId) {
      return <CourierSearching orderId={orderId} />;
    }
    return <CourierTracking orderId={orderId} />;
  }
  return (
    <OrderStatus
      orderId={route.params?.orderId || ""}
      initialView={route.params?.view}
    />
  );
}

function CourierSearchingScreen({ route }: any) {
  return <CourierSearching orderId={route.params?.orderId || ""} />;
}

function CourierTrackingScreen({ route }: any) {
  return <CourierTracking orderId={route.params?.orderId || ""} />;
}

function WaitingForRiderScreen({ route }: any) {
  return <WaitingForRider orderId={route.params?.orderId || ""} />;
}

function RideTrackingScreen({ route }: any) {
  return <RideTracking orderId={route.params?.orderId || ""} />;
}

function OrderCompleteScreen({ route }: any) {
  return <OrderComplete orderId={route.params?.orderId || ""} />;
}

function AddAddressScreen({ route }: any) {
  return <AddAddress mode={route.params?.mode || "delivery"} />;
}

function HelpScreen({ route }: any) {
  return <Help orderId={route.params?.orderId} />;
}

function PlacesScreen({ route }: any) {
  return <Places mode={route.params?.mode || "manage"} />;
}

function ChatSupportScreen({ route }: any) {
  return <ChatSupport orderId={route.params?.orderId} />;
}

function ReportIssueScreen({ route }: any) {
  return (
    <ReportIssue
      orderId={route.params?.orderId}
      prefillMessage={route.params?.prefillMessage}
    />
  );
}

function TicketDetailScreen({ route }: any) {
  return <TicketDetail ticketId={route.params?.ticketId || ""} />;
}

function RestaurantsListScreen({ route }: any) {
  return <RestaurantsList cuisine={route.params?.cuisine} />;
}

function OrderDetailScreen({ route }: any) {
  return <OrderDetail orderId={route.params?.orderId || ""} />;
}

function ProfileScreen({ route }: any) {
  return <Profile mode={route.params?.mode} />;
}

function FavoritesScreen({ route }: any) {
  return <Favorites service={route.params?.service} />;
}

/**
 * Service vertical dispatcher for the Home tab, matching original App.tsx behavior.
 */
function HomeServiceDispatcher() {
  const { state } = useApp();

  switch (state.service) {
    case "food":
      return <FoodHome />;
    case "rides":
      return <RidesHome />;
    case "grocery":
      return <GroceryHome />;
    case "courier":
      return <CourierHome />;
    default:
      return <FoodHome />;
  }
}

/**
 * Main Tabs Navigator wrapping the 5 tabs with custom BottomNav
 */
function MainTabsNavigator() {
  const { state, setService } = useApp();
  const cartCount =
    state.carts.food.lines.reduce((sum, l) => sum + l.qty, 0) +
    state.carts.grocery.lines.reduce((sum, l) => sum + l.qty, 0);

  return (
    <Tab.Navigator
      tabBar={(props) => {
        const activeRoute = props.state.routes[props.state.index].name as TabName;
        return (
          <BottomNav
            active={activeRoute}
            count={cartCount}
            onSelect={(tab) => {
              if (tab === "rides") {
                setService("rides");
                props.navigation.navigate("rides");
              } else if (tab === "home") {
                if (state.service === "rides") {
                  setService("food");
                }
                props.navigation.navigate("home");
              } else {
                props.navigation.navigate(tab);
              }
            }}
          />
        );
      }}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="home" component={HomeServiceDispatcher} />
      <Tab.Screen name="rides" component={RidesHome} />
      <Tab.Screen name="navcart" component={NavCart} />
      <Tab.Screen name="orders" component={Orders} />
      <Tab.Screen name="account" component={Account} />
    </Tab.Navigator>
  );
}

/**
 * Root Native Stack Navigator
 */
export default function RootNavigator() {
  const { state, isReady } = useApp();
  const [splashFinished, setSplashFinished] = useState(false);

  // Restore active ride on launch only if one is genuinely in progress
  const activeRide = useMemo(() => {
    return state.orders.find(
      (o) => o.service === "rides" && isOrderActive(o)
    );
  }, [state.orders]);

  // Determine initial route according to active ride, authentication & profile state:
  const isProfileComplete = state.isGuest
    ? true
    : Boolean(
        state.profile.profileCompleted !== false &&
        state.profile.name &&
        state.profile.name.trim().length > 0
      );

  const initialRoute: keyof RootStackParamList = (state.authenticated || state.isGuest)
    ? activeRide
      ? activeRide.status === 0
        ? "waitingForRider"
        : "rideTracking"
      : isProfileComplete
      ? "mainTabs"
      : "profile"
    : "phone";

  return (
    <View style={{ flex: 1, backgroundColor: "#100a08" }}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{
            headerShown: false,
            animation: "slide_from_right",
          }}
        >
          {/* Authentication Flow */}
          <Stack.Screen name="splash" component={Splash} />
          <Stack.Screen name="phone" component={PhoneLogin} />
          <Stack.Screen name="otp" component={OtpVerifyScreen} />

          {/* Core Main Tab Navigation */}
          <Stack.Screen name="mainTabs" component={MainTabsNavigator} />

          {/* Flow Routes */}
          <Stack.Screen name="detail" component={StoreDetailScreen} />
          <Stack.Screen name="ridePickupDrop" component={RidePickupDrop} />
          <Stack.Screen name="ridePickupPoint" component={RidePickupPoint} />
          <Stack.Screen name="rideConfirm" component={RideConfirm} />
          <Stack.Screen name="courierDropSearch" component={CourierDropSearch} />
          <Stack.Screen name="courierRouteSelect" component={CourierRouteSelect} />
          <Stack.Screen name="courierSearching" component={CourierSearchingScreen} />
          <Stack.Screen name="courierTracking" component={CourierTrackingScreen} />
          <Stack.Screen name="cart" component={CartScreen} />
          <Stack.Screen name="address" component={DeliveryDetailsScreen} />
          <Stack.Screen name="payment" component={PaymentScreen} />
          <Stack.Screen name="status" component={OrderStatusScreen} />
          <Stack.Screen name="waitingForRider" component={WaitingForRiderScreen} />
          <Stack.Screen name="rideTracking" component={RideTrackingScreen} />
          <Stack.Screen name="noInternet" component={NoInternet} />
          <Stack.Screen name="complete" component={OrderCompleteScreen} />

          {/* Interconnected Flow & Auxiliary Routes */}
          <Stack.Screen name="addAddress" component={AddAddressScreen} />
          <Stack.Screen name="paymentMethods" component={PaymentMethods} />
          <Stack.Screen name="addMoney" component={AddMoney} />
          <Stack.Screen name="help" component={HelpScreen} />

          {/* Secondary Remaining Routes */}
          <Stack.Screen name="notifications" component={Notifications} />
          <Stack.Screen name="places" component={PlacesScreen} />
          <Stack.Screen
            name="addPaymentMethod"
            component={AddPaymentMethod}
          />
          <Stack.Screen name="chatSupport" component={ChatSupportScreen} />
          <Stack.Screen name="reportIssue" component={ReportIssueScreen} />
          <Stack.Screen name="supportTickets" component={SupportTickets} />
          <Stack.Screen name="ticketDetail" component={TicketDetailScreen} />
          <Stack.Screen name="restaurantsList" component={RestaurantsListScreen} />
          <Stack.Screen name="orderDetail" component={OrderDetailScreen} />
          <Stack.Screen name="profile" component={ProfileScreen} />
          <Stack.Screen name="favorites" component={FavoritesScreen} />
          <Stack.Screen name="transactions" component={Transactions} />
        </Stack.Navigator>
        <LocationSelectionBottomSheet />
      </NavigationContainer>

      {/* Premium App Opening Splash Animation */}
      {!splashFinished && (
        <AppOpeningSplash
          isReady={isReady}
          onFinished={() => setSplashFinished(true)}
        />
      )}
    </View>
  );
}

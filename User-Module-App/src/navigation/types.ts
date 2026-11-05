import type { Service } from "../data/demo";

export type TabName = "home" | "rides" | "navcart" | "orders" | "account";
export type PlacesMode =
  | "delivery"
  | "ridePickup"
  | "rideDrop"
  | "courierPickup"
  | "courierDrop"
  | "manage";

export type RouteSpec =
  | { name: "splash" }
  | { name: "phone" }
  | { name: "otp"; phone: string }
  | { name: TabName }
  | { name: "mainTabs"; screen?: TabName }
  | { name: "detail"; service: "food" | "grocery" | "courier"; storeId?: string; highlightItemId?: string }
  | { name: "ridePickupDrop" }
  | { name: "ridePickupPoint" }
  | { name: "rideConfirm" }
  | { name: "courierDropSearch" }
  | { name: "courierRouteSelect" }
  | { name: "courierSearching"; orderId: string }
  | { name: "courierTracking"; orderId: string }
  | { name: "cart"; service: Service }
  | { name: "address"; service: Service }
  | { name: "payment"; service: Service }
  | { name: "status"; orderId: string; view?: "confirmed" | "tracking" }
  | { name: "waitingForRider"; orderId: string }
  | { name: "rideTracking"; orderId: string }
  | { name: "noInternet" }
  | { name: "complete"; orderId: string }
  | { name: "notifications" }
  | { name: "places"; mode: PlacesMode }
  | { name: "addAddress"; mode: PlacesMode }
  | { name: "paymentMethods" }
  | { name: "addPaymentMethod" }
  | { name: "chatSupport"; orderId?: string }
  | { name: "reportIssue"; orderId?: string; prefillMessage?: string }
  | { name: "supportTickets" }
  | { name: "ticketDetail"; ticketId: string }
  | { name: "restaurantsList"; cuisine?: string }
  | { name: "help"; orderId?: string }
  | { name: "orderDetail"; orderId: string }
  | { name: "profile"; mode?: "completion" }
  | { name: "addMoney" }
  | { name: "favorites"; service?: Service }
  | { name: "transactions" };

export type RootStackParamList = {
  splash: undefined;
  phone: undefined;
  otp: { phone: string };
  mainTabs: { screen?: TabName } | undefined;
  detail: { service: "food" | "grocery" | "courier"; storeId?: string; highlightItemId?: string };
  ridePickupDrop: undefined;
  ridePickupPoint: undefined;
  rideConfirm: undefined;
  courierDropSearch: undefined;
  courierRouteSelect: undefined;
  courierSearching: { orderId: string };
  courierTracking: { orderId: string };
  cart: { service: Service };
  address: { service: Service };
  payment: { service: Service };
  status: { orderId: string; view?: "confirmed" | "tracking" };
  waitingForRider: { orderId: string };
  rideTracking: { orderId: string };
  noInternet: undefined;
  complete: { orderId: string };
  notifications: undefined;
  places: { mode: PlacesMode };
  addAddress: { mode: PlacesMode };
  paymentMethods: undefined;
  addPaymentMethod: undefined;
  chatSupport: { orderId?: string };
  reportIssue: { orderId?: string; prefillMessage?: string } | undefined;
  supportTickets: undefined;
  ticketDetail: { ticketId: string };
  restaurantsList: { cuisine?: string };
  help: { orderId?: string };
  orderDetail: { orderId: string };
  profile: { mode?: "completion" } | undefined;
  addMoney: undefined;
  favorites: { service?: Service } | undefined;
  transactions: undefined;
};

export type BottomTabParamList = {
  home: undefined;
  rides: undefined;
  navcart: undefined;
  orders: undefined;
  account: undefined;
};

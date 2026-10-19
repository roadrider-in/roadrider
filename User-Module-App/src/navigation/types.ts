import type { Service } from "../data/demo";

export type TabName = "home" | "navcart" | "wallet" | "orders" | "account";
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
  | { name: "detail"; service: "food" | "grocery" | "courier"; storeId?: string }
  | { name: "rideConfirm" }
  | { name: "cart"; service: Service }
  | { name: "address"; service: Service }
  | { name: "payment"; service: Service }
  | { name: "status"; orderId: string; view?: "confirmed" | "tracking" }
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
  detail: { service: "food" | "grocery" | "courier"; storeId?: string };
  rideConfirm: undefined;
  cart: { service: Service };
  address: { service: Service };
  payment: { service: Service };
  status: { orderId: string; view?: "confirmed" | "tracking" };
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
  navcart: undefined;
  wallet: undefined;
  orders: undefined;
  account: undefined;
};

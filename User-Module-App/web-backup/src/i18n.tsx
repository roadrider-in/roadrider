import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type LanguageCode = "en" | "hi";
export type LanguageName = "English" | "हिन्दी";

export const SUPPORTED_LANGUAGES: { code: LanguageCode; name: LanguageName; englishName: string }[] = [
  { code: "en", name: "English", englishName: "English" },
  { code: "hi", name: "हिन्दी", englishName: "Hindi" },
];

export const translations = {
  en: {
    // Navigation & Headers
    nav_home: "Home",
    nav_cart: "Cart",
    nav_orders: "Orders",
    nav_account: "Account",
    service_food: "Food",
    service_rides: "Rides",
    service_grocery: "Grocery",
    service_courier: "Courier",
    delivering_to: "Delivering to",
    change: "Change",
    search_food_placeholder: "Search dishes or restaurants",
    search_grocery_placeholder: "Search daily groceries & essentials",
    search_rides_placeholder: "Where to?",
    notifications: "Notifications",
    help_support: "Help & Support",

    // Location Selection Bottom Sheet
    loc_sheet_title: "Select delivery location",
    loc_permission_card_title: "Device location permission",
    loc_permission_card_sub: "Get faster, accurate delivery at your exact doorstep",
    loc_enable_btn: "Use current location",
    loc_detecting: "Detecting your location…",
    loc_saved_addresses: "Saved Addresses",
    loc_see_all: "See All",
    loc_add_new: "+ Add new address",
    loc_search_placeholder: "Search location, area or landmark manually",
    loc_home: "Home",
    loc_work: "Work",
    loc_other: "Other",
    loc_no_saved: "No saved addresses found. Add an address or detect current location.",
    loc_available: "Available",
    loc_coming_soon: "Coming Soon",
    loc_permission_denied: "Location access was turned off",
    loc_permission_denied_sub: "Please enable location in device settings or enter an address manually.",

    // Categories
    cat_craving: "What are you craving?",
    cat_pizza: "Pizza",
    cat_burgers: "Burgers",
    cat_biryani: "Biryani",
    cat_chinese: "Chinese",
    cat_north_indian: "North Indian",
    cat_fast_food: "Fast Food",
    cat_desserts: "Desserts",
    cat_more: "More",
    popular_near_you: "Popular restaurants near you",
    no_restaurants_found: "No restaurants currently available in this category.",
    no_restaurants_in_area: "No active restaurants found in your selected delivery location.",

    // Restaurant & Menu Details
    view_menu: "View Menu",
    menu_recommended: "Recommended for you",
    rating: "Rating",
    veg: "Pure Veg",
    non_veg: "Non-Veg",
    add_plus: "Add +",
    added: "Added",
    opens_soon: "Opens soon",
    closed: "Closed",
    mins: "mins",

    // Cart & Checkout
    your_cart: "Your Cart",
    empty_cart_title: "Your cart is empty",
    empty_cart_sub: "Add something delicious and it will show up here.",
    browse_food: "Browse restaurants",
    add_note_label: "Add cooking or delivery note",
    add_note_placeholder: "e.g., Less spicy, no onions, call before delivery...",
    note_less_spicy: "Less spicy",
    note_no_onion: "No onion / garlic",
    note_call_before: "Call before delivery",
    note_leave_door: "Leave at door / reception",
    note_saved: "Note saved",
    bill_details: "Bill Details",
    item_total: "Item Total",
    delivery_fee: "Delivery Fee",
    taxes_fees: "Taxes & Platform Fees",
    to_pay: "To Pay",
    free: "FREE",
    apply_coupon: "Apply coupon",
    proceed_to_pay: "Proceed to pay",
    choose_address: "Choose delivery address",
    payment_method: "Payment Method",

    // Order Pending & Lifecycle (Real-time)
    order_pending_title: "Waiting for Restaurant Confirmation",
    order_pending_subtitle: "The restaurant is reviewing your order. We'll update you as soon as they accept.",
    order_id: "Order ID",
    status_placed: "Order placed successfully!",
    status_accepted: "Restaurant accepted your order!",
    status_preparing: "Your food is being prepared!",
    status_ready: "Food packed and ready for pickup",
    status_rider_assigned: "Delivery partner assigned",
    status_picked_up: "Order picked up from store",
    status_on_the_way: "On the way to your address",
    status_delivered: "Delivered with care",
    status_cancelled: "Order cancelled",
    delivery_pin: "Delivery verification PIN",
    share_pin_msg: "Share this 4-digit code with your rider upon arrival",
    rider_partner: "Delivery Partner",
    call_rider: "Call Rider",
    track_live: "Track Live Delivery",
    back_to_home: "Back to Home",

    // Cancellation
    cancel_order_btn: "Cancel Order",
    cancel_dialog_title: "Cancel this order?",
    cancel_dialog_sub: "Please tell us why you would like to cancel your order.",
    reason_mistake: "Ordered by mistake",
    reason_wrong_address: "Wrong delivery address selected",
    reason_taking_long: "Restaurant taking too long to confirm",
    reason_item_issue: "Restaurant issue or item unavailable",
    reason_payment: "Payment issue / Duplicate charge",
    reason_other: "Other reason",
    explain_placeholder: "Please explain your reason in detail...",
    keep_order: "Keep Order",
    confirm_cancel: "Confirm Cancellation",
    cancelling: "Cancelling…",
    cancel_success: "Order has been successfully cancelled.",
    cancel_refund_note: "Any online payment will be refunded within 5–7 working days.",
    cannot_cancel: "This order cannot be cancelled as it is already being prepared or out for delivery.",

    // Support Ticket System
    support_title: "Support Tickets",
    support_new_ticket: "Raise a Support Ticket",
    support_category: "Category",
    support_subject: "Subject",
    support_description: "Description",
    support_cat_order: "Order & Food Quality",
    support_cat_payment: "Payment & Refund",
    support_cat_delivery: "Delivery Partner Delay",
    support_cat_account: "Account & App Issue",
    support_cat_other: "General Inquiry",
    support_create_btn: "Submit Ticket",
    support_chat_placeholder: "Type your reply to RoadRider support...",
    support_send: "Send",
    support_empty_chat: "No messages yet. Send a message to start conversation with our support team.",
    support_admin: "Support Agent",
    support_you: "You",
    ticket_status_open: "Open",
    ticket_status_in_progress: "In Progress",
    ticket_status_resolved: "Resolved",
    ticket_status_closed: "Closed",

    // Ratings & Reviews
    rate_experience: "How was your experience?",
    rate_restaurant: "Rate the Food & Restaurant",
    rate_rider: "Rate the Delivery Partner",
    review_tags_title: "What went well?",
    review_comment_placeholder: "Write your honest feedback here...",
    submit_review: "Submit Review",
    review_submitted_msg: "Thank you! Your feedback helps us improve.",

    // General & Settings
    lang_settings: "Language / भाषा",
    apply: "Apply",
    cancel: "Cancel",
    confirm: "Confirm",
    save: "Save",
    edit: "Edit",
    delete: "Delete",
    loading: "Loading…",
    retry: "Retry",
    success: "Success",
    error: "Error",
  },
  hi: {
    // Navigation & Headers
    nav_home: "होम",
    nav_cart: "कार्ट",
    nav_orders: "ऑर्डर",
    nav_account: "अकाउंट",
    service_food: "खाना (Food)",
    service_rides: "राइड्स (Rides)",
    service_grocery: "किराना (Grocery)",
    service_courier: "कूरियर (Courier)",
    delivering_to: "डिलीवरी का पता",
    change: "बदलें",
    search_food_placeholder: "व्यंजन या रेस्टोरेंट खोजें",
    search_grocery_placeholder: "दैनिक किराना और सामान खोजें",
    search_rides_placeholder: "कहाँ जाना है?",
    notifications: "सूचनाएं",
    help_support: "सहायता और सपोर्ट",

    // Location Selection Bottom Sheet
    loc_sheet_title: "डिलीवरी लोकेशन चुनें",
    loc_permission_card_title: "डिवाइस लोकेशन अनुमति",
    loc_permission_card_sub: "अपने सटीक पते पर सबसे तेज़ डिलीवरी पाएं",
    loc_enable_btn: "वर्तमान लोकेशन का उपयोग करें",
    loc_detecting: "आपकी लोकेशन खोजी जा रही है…",
    loc_saved_addresses: "सहेजे गए पते (Saved Addresses)",
    loc_see_all: "सभी देखें",
    loc_add_new: "+ नया पता जोड़ें",
    loc_search_placeholder: "स्थान, क्षेत्र या लैंडमार्क खोजें",
    loc_home: "घर (Home)",
    loc_work: "ऑफिस (Work)",
    loc_other: "अन्य (Other)",
    loc_no_saved: "कोई सहेजा गया पता नहीं मिला। कृपया वर्तमान लोकेशन या नया पता चुनें।",
    loc_available: "उपलब्ध (Available)",
    loc_coming_soon: "जल्द आ रहा है (Coming Soon)",
    loc_permission_denied: "लोकेशन अनुमति बंद है",
    loc_permission_denied_sub: "कृपया सेटिंग्स में लोकेशन चालू करें या मैन्युअल रूप से पता दर्ज करें।",

    // Categories
    cat_craving: "आज आपका क्या खाने का मन है?",
    cat_pizza: "पिज़्ज़ा",
    cat_burgers: "बर्गर",
    cat_biryani: "बिरयानी",
    cat_chinese: "चाइनीज़",
    cat_north_indian: "नॉर्थ इंडियन",
    cat_fast_food: "फास्ट फूड",
    cat_desserts: "मिठाई",
    cat_more: "और भी",
    popular_near_you: "आपके नज़दीक लोकप्रिय रेस्टोरेंट",
    no_restaurants_found: "इस श्रेणी में फिलहाल कोई रेस्टोरेंट उपलब्ध नहीं है।",
    no_restaurants_in_area: "आपकी चुनी गई लोकेशन पर कोई सक्रिय रेस्टोरेंट नहीं मिला।",

    // Restaurant & Menu Details
    view_menu: "मेनू देखें",
    menu_recommended: "आपके लिए खास",
    rating: "रेटिंग",
    veg: "शुद्ध शाकाहारी",
    non_veg: "मांसाहारी",
    add_plus: "जोड़ें +",
    added: "जोड़ा गया",
    opens_soon: "जल्द खुलेगा",
    closed: "बंद है",
    mins: "मिनट",

    // Cart & Checkout
    your_cart: "आपकी कार्ट",
    empty_cart_title: "आपकी कार्ट खाली है",
    empty_cart_sub: "कुछ स्वादिष्ट खाना जोड़ें, वह यहाँ दिखाई देगा।",
    browse_food: "रेस्टोरेंट देखें",
    add_note_label: "कुकिंग या डिलीवरी निर्देश (Add Note)",
    add_note_placeholder: "उदा. कम तीखा, बिना प्याज़, डिलीवरी से पहले कॉल करें...",
    note_less_spicy: "कम तीखा (Less spicy)",
    note_no_onion: "बिना प्याज़ / लहसुन",
    note_call_before: "पहुंचने से पहले कॉल करें",
    note_leave_door: "दरवाजे पर छोड़ दें",
    note_saved: "निर्देश सहेजा गया",
    bill_details: "बिल विवरण",
    item_total: "आइटम कुल",
    delivery_fee: "डिलीवरी शुल्क",
    taxes_fees: "टैक्स और प्लेटफॉर्म शुल्क",
    to_pay: "कुल भुगतान राशि",
    free: "मुफ़्त",
    apply_coupon: "कूपन लागू करें",
    proceed_to_pay: "भुगतान के लिए आगे बढ़ें",
    choose_address: "डिलीवरी का पता चुनें",
    payment_method: "भुगतान का तरीका",

    // Order Pending & Lifecycle (Real-time)
    order_pending_title: "रेस्टोरेंट की पुष्टि की प्रतीक्षा है",
    order_pending_subtitle: "रेस्टोरेंट आपके ऑर्डर की समीक्षा कर रहा है। स्वीकार होते ही आपको सूचित किया जाएगा।",
    order_id: "ऑर्डर संख्या",
    status_placed: "ऑर्डर सफलतापूर्वक दर्ज हुआ!",
    status_accepted: "रेस्टोरेंट ने आपका ऑर्डर स्वीकार कर लिया!",
    status_preparing: "आपका भोजन तैयार किया जा रहा है!",
    status_ready: "खाना पैक होकर तैयार है",
    status_rider_assigned: "डिलीवरी पार्टनर असाइन हो गया",
    status_picked_up: "डिलीवरी पार्टनर ने ऑर्डर उठा लिया है",
    status_on_the_way: "आपके पते की ओर निकल चुका है",
    status_delivered: "सफलतापूर्वक डिलीवर हुआ",
    status_cancelled: "ऑर्डर रद्द कर दिया गया",
    delivery_pin: "डिलीवरी सत्यापन पिन",
    share_pin_msg: "डिलीवरी पार्टनर को आगमन पर यह 4 अंकों का कोड बताएं",
    rider_partner: "डिलीवरी पार्टनर",
    call_rider: "कॉल करें",
    track_live: "लाइव डिलीवरी ट्रैक करें",
    back_to_home: "होमपेज पर जाएं",

    // Cancellation
    cancel_order_btn: "ऑर्डर रद्द करें",
    cancel_dialog_title: "क्या आप यह ऑर्डर रद्द करना चाहते हैं?",
    cancel_dialog_sub: "कृपया ऑर्डर रद्द करने का कारण बताएं।",
    reason_mistake: "गलती से ऑर्डर हो गया",
    reason_wrong_address: "गलत डिलीवरी पता चुना गया",
    reason_taking_long: "रेस्टोरेंट पुष्टि करने में बहुत समय ले रहा है",
    reason_item_issue: "रेस्टोरेंट या आइटम की समस्या",
    reason_payment: "भुगतान संबंधी समस्या",
    reason_other: "अन्य कारण",
    explain_placeholder: "कृपया अपना कारण विस्तार से लिखें...",
    keep_order: "ऑर्डर जारी रखें",
    confirm_cancel: "रद्दीकरण की पुष्टि करें",
    cancelling: "रद्द किया जा रहा है…",
    cancel_success: "आपका ऑर्डर सफलतापूर्वक रद्द कर दिया गया है।",
    cancel_refund_note: "यदि कोई ऑनलाइन भुगतान हुआ है, तो 5–7 कार्य दिवसों में वापस कर दिया जाएगा।",
    cannot_cancel: "यह ऑर्डर अब रद्द नहीं किया जा सकता क्योंकि यह तैयार हो चुका है या रास्ते में है।",

    // Support Ticket System
    support_title: "सपोर्ट टिकट्स",
    support_new_ticket: "नई सपोर्ट टिकट दर्ज करें",
    support_category: "श्रेणी",
    support_subject: "विषय",
    support_description: "विवरण",
    support_cat_order: "ऑर्डर और भोजन की गुणवत्ता",
    support_cat_payment: "भुगतान और रिफंड",
    support_cat_delivery: "डिलीवरी पार्टनर देरी",
    support_cat_account: "अकाउंट और ऐप संबंधी समस्या",
    support_cat_other: "सामान्य पूछताछ",
    support_create_btn: "टिकट जमा करें",
    support_chat_placeholder: "रोडरैनर सपोर्ट को अपना उत्तर लिखें...",
    support_send: "भेजें",
    support_empty_chat: "अभी तक कोई संदेश नहीं है। हमारी सहायता टीम से बात शुरू करने के लिए संदेश भेजें।",
    support_admin: "सपोर्ट एजेंट",
    support_you: "आप",
    ticket_status_open: "ओपन (Open)",
    ticket_status_in_progress: "प्रगति पर (In Progress)",
    ticket_status_resolved: "हल हो गया (Resolved)",
    ticket_status_closed: "बंद (Closed)",

    // Ratings & Reviews
    rate_experience: "आपका अनुभव कैसा रहा?",
    rate_restaurant: "रेस्टोरेंट और भोजन की रेटिंग करें",
    rate_rider: "डिलीवरी पार्टनर की रेटिंग करें",
    review_tags_title: "आपको क्या पसंद आया?",
    review_comment_placeholder: "यहाँ अपनी प्रतिक्रिया लिखें...",
    submit_review: "रिव्यू सबमिट करें",
    review_submitted_msg: "धन्यवाद! आपकी प्रतिक्रिया हमें सेवा बेहतर बनाने में मदद करती है।",

    // General & Settings
    lang_settings: "भाषा / Language",
    apply: "लागू करें",
    cancel: "रद्द करें",
    confirm: "पुष्टि करें",
    save: "सहेजें",
    edit: "संपादित करें",
    delete: "हटाएं",
    loading: "लोड हो रहा है…",
    retry: "पुनः प्रयास करें",
    success: "सफल",
    error: "त्रुटि",
  },
};

export type TranslationKey = keyof typeof translations.en;

interface I18nContextType {
  language: LanguageName;
  langCode: LanguageCode;
  setLanguage: (lang: LanguageName) => void;
  t: (key: TranslationKey, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_KEY = "roadrider_lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLangState] = useState<LanguageName>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "हिन्दी" || stored === "Hindi" || stored === "hi") return "हिन्दी";
      return "English";
    } catch {
      return "English";
    }
  });

  const langCode: LanguageCode = language === "हिन्दी" ? "hi" : "en";

  const setLanguage = (newLang: LanguageName) => {
    setLangState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch (e) {
      console.warn("Could not save language to localStorage:", e);
    }
  };

  const t = (key: TranslationKey, fallback?: string): string => {
    const dict = translations[langCode];
    if (dict && key in dict) {
      return dict[key];
    }
    const enDict = translations.en;
    if (enDict && key in enDict) {
      return enDict[key];
    }
    return fallback || key;
  };

  return (
    <I18nContext.Provider value={{ language, langCode, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Graceful fallback if rendered outside provider
    return {
      language: "English" as LanguageName,
      langCode: "en" as LanguageCode,
      setLanguage: () => {},
      t: (key: TranslationKey, fallback?: string) => translations.en[key] || fallback || key,
    };
  }
  return ctx;
}

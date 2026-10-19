/**
 * DEMO DATA — RoadRider has no backend integration in this project.
 * Everything in this file is demonstration content taken from the approved Figma reference
 * (names, prices, photos, copy). Replace with API calls when a backend becomes available.
 */

export type Service = "food" | "rides" | "grocery" | "courier";

export const PHOTOS = {
  rider: "https://images.unsplash.com/photo-1768423083233-b3f696c9b703?auto=format&fit=crop&w=1080&q=85",
  food: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1080&q=85",
  food2: "https://images.unsplash.com/photo-1705174299330-939dd03cc864?auto=format&fit=crop&w=800&q=80",
  grocery: "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?auto=format&fit=crop&w=1080&q=85",
  produce: "https://images.unsplash.com/photo-1590779033100-9f60a05a013d?auto=format&fit=crop&w=800&q=80",
  ride: "https://images.unsplash.com/photo-1541702467897-41915a07d3a7?auto=format&fit=crop&w=1080&q=80",
};

export const SERVICES: Service[] = ["food", "rides", "grocery", "courier"];

export const serviceMeta: Record<Service, { label: string; kicker: string; photo: string; icon: string }> = {
  food: { label: "Food", kicker: "GOOD FOOD · BRIGHTER DAYS", photo: PHOTOS.food, icon: "food" },
  rides: { label: "Rides", kicker: "YOUR CITY, YOUR WAY", photo: PHOTOS.ride, icon: "car" },
  grocery: { label: "Grocery", kicker: "FARM FRESH · EVERYDAY", photo: PHOTOS.grocery, icon: "bag" },
  courier: { label: "Courier", kicker: "FAST · SAFE · RELIABLE", photo: PHOTOS.rider, icon: "box" },
};

/* ---------- Food ---------- */
export type PortionOption = { id: string; name: string; price: number };
export type AddonOption = { id: string; name: string; price: number };

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  portions?: PortionOption[];
  addons?: AddonOption[];
};

export type Restaurant = {
  id: string;
  name: string;
  cuisines: string[];
  eta: string;
  etaShort: string;
  rating: number;
  detailRating: number;
  discount: string;
  photo: string;
  address: string;
  coords: { lat: number; lng: number };
  menu: MenuItem[];
};

export const RESTAURANTS: Restaurant[] = [
  {
    id: "royal-biryani-house",
    name: "Royal Biryani House",
    cuisines: ["Biryani", "Mughlai", "North Indian"],
    eta: "30–35 min",
    etaShort: "30 min",
    rating: 4.7,
    detailRating: 4.8,
    discount: "20% OFF",
    photo: PHOTOS.food2,
    address: "Mayfair Building, Hazratganj, Lucknow",
    coords: { lat: 26.8512, lng: 80.949 },
    menu: [
      {
        id: "rbh-lucknowi-biryani",
        name: "Lucknowi Chicken Biryani",
        description: "Fragrant basmati rice, tender chicken & house spices",
        price: 289,
        portions: [
          { id: "half", name: "Half Plate (1-2 pcs)", price: 179 },
          { id: "full", name: "Full Plate (3-4 pcs)", price: 289 },
        ],
        addons: [
          { id: "raita", name: "Extra Spiced Boondi Raita", price: 25 },
          { id: "salan", name: "Extra Mirchi Ka Salan Bowl", price: 29 },
          { id: "egg", name: "Boiled Spiced Egg", price: 20 },
        ],
      },
      {
        id: "rbh-veg-dum-biryani",
        name: "Veg Dum Biryani",
        description: "Slow-cooked basmati rice with seasonal vegetables",
        price: 229,
        portions: [
          { id: "half", name: "Half Plate", price: 149 },
          { id: "full", name: "Full Plate", price: 229 },
        ],
        addons: [
          { id: "raita", name: "Extra Veg Raita", price: 25 },
          { id: "salan", name: "Extra Mirchi Ka Salan Bowl", price: 29 },
          { id: "paneer", name: "Extra Paneer Chunks", price: 35 },
        ],
      },
      {
        id: "rbh-galouti-kebab",
        name: "Galouti Kebab",
        description: "Melt-in-the-mouth minced kebabs with sheermal",
        price: 249,
        portions: [
          { id: "half", name: "Half Plate (2 pcs + 1 Sheermal)", price: 149 },
          { id: "full", name: "Full Plate (4 pcs + 2 Sheermal)", price: 249 },
        ],
        addons: [
          { id: "sheermal", name: "Extra Saffron Sheermal", price: 35 },
          { id: "green-chutney", name: "Extra Mint Coriander Chutney", price: 15 },
        ],
      },
    ],
  },
  {
    id: "pizza-roma",
    name: "Pizza Roma & Trattoria",
    cuisines: ["Pizza", "Italian", "Fast Food"],
    eta: "20–25 min",
    etaShort: "25 min",
    rating: 4.8,
    detailRating: 4.9,
    discount: "30% OFF",
    photo: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80",
    address: "Vibhuti Khand, Gomti Nagar, Lucknow",
    coords: { lat: 26.8625, lng: 81.0028 },
    menu: [
      {
        id: "pr-margherita",
        name: "Classic Margherita Pizza",
        description: "San Marzano tomatoes, fresh mozzarella & basil leaves",
        price: 349,
        portions: [
          { id: "regular", name: "Regular (7 inch)", price: 239 },
          { id: "medium", name: "Medium (10 inch)", price: 349 },
          { id: "large", name: "Large (12 inch)", price: 449 },
        ],
        addons: [
          { id: "cheese", name: "Extra Mozzarella Cheese", price: 45 },
          { id: "dip", name: "Cheesy Herb Garlic Dip", price: 29 },
          { id: "jalapeno", name: "Spicy Pickled Jalapeños", price: 25 },
        ],
      },
      {
        id: "pr-pepperoni",
        name: "Smoky Pepperoni Pizza",
        description: "Zesty pepperoni, mozzarella & rich garlic crust",
        price: 429,
        portions: [
          { id: "medium", name: "Medium (10 inch)", price: 429 },
          { id: "large", name: "Large (12 inch)", price: 549 },
        ],
        addons: [
          { id: "cheese", name: "Extra Mozzarella Cheese", price: 45 },
          { id: "dip", name: "Cheesy Herb Garlic Dip", price: 29 },
        ],
      },
      {
        id: "pr-garlic-bread",
        name: "Cheesy Garlic Herb Bread",
        description: "Artisan baguette toasted with garlic butter & melted cheese",
        price: 149,
        portions: [
          { id: "half", name: "Half Plate (3 pcs)", price: 89 },
          { id: "full", name: "Full Plate (6 pcs)", price: 149 },
        ],
        addons: [
          { id: "cheese", name: "Extra Melted Cheese Layer", price: 35 },
          { id: "dip", name: "Cheesy Herb Dip", price: 25 },
        ],
      },
    ],
  },
  {
    id: "burger-craft",
    name: "Burger Craft & Grill",
    cuisines: ["Burgers", "Fast Food", "American"],
    eta: "15–20 min",
    etaShort: "20 min",
    rating: 4.6,
    detailRating: 4.7,
    discount: "₹100 OFF",
    photo: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
    address: "Kapoorthala Complex, Aliganj, Lucknow",
    coords: { lat: 26.8835, lng: 80.9412 },
    menu: [
      {
        id: "bc-chicken-crispy",
        name: "Crispy Peri Peri Chicken Burger",
        description: "Golden fried chicken breast, chipotle mayo & crisp lettuce",
        price: 199,
        addons: [
          { id: "cheese", name: "Extra Cheddar Cheese Slice", price: 30 },
          { id: "mayo", name: "Chipotle Mayo Dip", price: 20 },
          { id: "fries", name: "Add Small Seasoned Fries", price: 49 },
        ],
      },
      {
        id: "bc-double-cheese",
        name: "Double Smash Cheeseburger",
        description: "Dual smashed patties, cheddar cheese & caramelised onions",
        price: 249,
        addons: [
          { id: "cheese", name: "Extra Cheddar Cheese Slice", price: 30 },
          { id: "mayo", name: "Truffle Mayo Dip", price: 25 },
          { id: "bacon", name: "Crispy Smoked Bacon Strips", price: 45 },
        ],
      },
      {
        id: "bc-truffle-fries",
        name: "Seasoned Truffle Crinkle Fries",
        description: "Crisp potato fries dusted with rosemary sea salt",
        price: 119,
        portions: [
          { id: "half", name: "Half Plate (Regular)", price: 79 },
          { id: "full", name: "Full Plate (Large Box)", price: 119 },
        ],
        addons: [
          { id: "cheese-sauce", name: "Extra Warm Liquid Cheddar", price: 35 },
          { id: "peri-peri", name: "Extra Peri Peri Shaker", price: 15 },
        ],
      },
    ],
  },
  {
    id: "golden-dragon",
    name: "Golden Dragon Wok",
    cuisines: ["Chinese", "Asian", "Dim Sum"],
    eta: "25–30 min",
    etaShort: "28 min",
    rating: 4.7,
    detailRating: 4.8,
    discount: "15% OFF",
    photo: "https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=800&q=80",
    address: "Bhootnath Market, Indira Nagar, Lucknow",
    coords: { lat: 26.8724, lng: 80.9856 },
    menu: [
      {
        id: "gd-schezwan-rice",
        name: "Schezwan Wok Rice",
        description: "Wok-tossed basmati with fiery red peppers & spring greens",
        price: 219,
        portions: [
          { id: "half", name: "Half Plate", price: 139 },
          { id: "full", name: "Full Plate", price: 219 },
        ],
        addons: [
          { id: "schezwan", name: "Extra Fiery Schezwan Sauce", price: 15 },
          { id: "gravy", name: "Manchurian Gravy Bowl", price: 39 },
        ],
      },
      {
        id: "gd-chilli-noodles",
        name: "Hakka Chilli Garlic Noodles",
        description: "Silky noodles stir-fried with crunch bell peppers & soy",
        price: 189,
        portions: [
          { id: "half", name: "Half Plate", price: 119 },
          { id: "full", name: "Full Plate", price: 189 },
        ],
        addons: [
          { id: "schezwan", name: "Extra Fiery Schezwan Sauce", price: 15 },
          { id: "crispy-garlic", name: "Crispy Fried Garlic Sprinkle", price: 20 },
        ],
      },
      {
        id: "gd-spring-rolls",
        name: "Crispy Veg Spring Rolls",
        description: "Handmade rolls filled with cabbage & carrots, sweet chilli dip",
        price: 159,
        portions: [
          { id: "half", name: "Half Plate (2 pcs)", price: 95 },
          { id: "full", name: "Full Plate (4 pcs)", price: 159 },
        ],
        addons: [
          { id: "dip", name: "Extra Sweet Chilli Dip", price: 15 },
          { id: "schezwan", name: "Extra Fiery Schezwan Sauce", price: 15 },
        ],
      },
    ],
  },
  {
    id: "dakshin-delights",
    name: "Dakshin Delights",
    cuisines: ["South Indian", "Mughlai", "North Indian"],
    eta: "20–25 min",
    etaShort: "22 min",
    rating: 4.9,
    detailRating: 4.9,
    discount: "25% OFF",
    photo: "https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?auto=format&fit=crop&w=800&q=80",
    address: "Nazirabad Road, Aminabad, Lucknow",
    coords: { lat: 26.8437, lng: 80.9262 },
    menu: [
      {
        id: "dd-masala-dosa",
        name: "Ghee Roast Masala Dosa",
        description: "Crispy fermented crepe with spiced potato mash & sambar",
        price: 139,
        portions: [
          { id: "half", name: "Half Plate (Mini Dosa)", price: 89 },
          { id: "full", name: "Full Plate (Crispy Ghee Roast)", price: 139 },
        ],
        addons: [
          { id: "cheese", name: "Extra Grated Amul Cheese", price: 35 },
          { id: "coconut-chutney", name: "Extra Fresh Coconut Chutney", price: 15 },
          { id: "tomato-chutney", name: "Extra Spicy Tomato Chutney", price: 15 },
          { id: "sambar", name: "Extra Hot Sambar Bowl", price: 20 },
        ],
      },
      {
        id: "dd-idli-vada",
        name: "Steamed Idli & Crispy Medu Vada",
        description: "Twin fluffy idlis and crunchy vada served with 3 chutneys",
        price: 119,
        portions: [
          { id: "half", name: "Half Plate (1 Idli + 1 Medu Vada)", price: 75 },
          { id: "full", name: "Full Plate (2 Idlis + 2 Medu Vadas)", price: 119 },
        ],
        addons: [
          { id: "coconut-chutney", name: "Extra Coconut Chutney", price: 15 },
          { id: "tomato-chutney", name: "Extra Spicy Tomato Chutney", price: 15 },
          { id: "ghee-podi", name: "Gunpowder Ghee Podi", price: 25 },
          { id: "sambar", name: "Extra Piping Hot Sambar", price: 20 },
        ],
      },
      {
        id: "dd-filter-coffee",
        name: "Authentic Degree Filter Coffee",
        description: "Frothy traditional South Indian brew in brass tumbler",
        price: 49,
      },
    ],
  },
];

export const FOOD_CATEGORIES: { icon: string; label: string }[] = [
  { icon: "🍕", label: "Pizza" },
  { icon: "🍔", label: "Burgers" },
  { icon: "🍲", label: "Biryani" },
  { icon: "🥡", label: "Chinese" },
];
export const MORE_CUISINES = ["Mughlai", "North Indian", "South Indian", "Desserts", "Italian", "Fast Food"];

/* ---------- Grocery ---------- */
export type Product = {
  id: string;
  name: string;
  unit: string;
  price: number;
  mrp: number;
  category: string;
  photo: string;
};

export const PRODUCTS: Product[] = [
  { id: "gr-tomatoes", name: "Farm fresh tomatoes", unit: "500 g", price: 32, mrp: 45, category: "Veggies", photo: PHOTOS.grocery },
  { id: "gr-broccoli", name: "Organic broccoli", unit: "1 piece", price: 69, mrp: 89, category: "Veggies", photo: PHOTOS.produce },
  { id: "gr-apples", name: "Shimla Royal Apples", unit: "1 kg (4 pcs)", price: 140, mrp: 180, category: "Fruits", photo: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=800&q=80" },
  { id: "gr-bananas", name: "Robusta Ripe Bananas", unit: "1 dozen", price: 55, mrp: 70, category: "Fruits", photo: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=800&q=80" },
  { id: "gr-milk", name: "Amul Taaza Homogenised Milk", unit: "1 L Pack", price: 72, mrp: 76, category: "Dairy", photo: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80" },
  { id: "gr-paneer", name: "Farm Fresh Malai Paneer", unit: "200 g", price: 85, mrp: 95, category: "Dairy", photo: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80" },
  { id: "gr-almonds", name: "California Roasted Almonds", unit: "250 g", price: 235, mrp: 299, category: "Snacks", photo: "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?auto=format&fit=crop&w=800&q=80" },
  { id: "gr-cookies", name: "Choco Chunk Butter Cookies", unit: "150 g", price: 65, mrp: 80, category: "Snacks", photo: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=800&q=80" },
];

export const GROCERY_CATEGORIES: { abbr: string; label: string }[] = [
  { abbr: "FR", label: "Fruits" },
  { abbr: "VG", label: "Veggies" },
  { abbr: "ML", label: "Dairy" },
  { abbr: "SN", label: "Snacks" },
];

/* ---------- Rides ---------- */
export type RideOption = { id: string; abbr: string; name: string; range: string; eta: string; fare: number; tagline: string };
/** `fare` is a demonstration estimate inside the designed range. */
export const RIDE_OPTIONS: RideOption[] = [
  { id: "bike", abbr: "BIKE", name: "Bike", range: "₹48–62", eta: "3 min", fare: 55, tagline: "Quick solo rides" },
  { id: "auto", abbr: "AUTO", name: "Auto", range: "₹86–102", eta: "5 min", fare: 96, tagline: "Comfortable everyday rides" },
  { id: "cab", abbr: "CAB", name: "Cab", range: "₹148–176", eta: "7 min", fare: 162, tagline: "AC hatchbacks & sedans" },
  { id: "xl", abbr: "XL", name: "Cab XL", range: "₹218–245", eta: "9 min", fare: 232, tagline: "Room for 6 riders" },
];

export type RentalPackage = { id: string; hours: number; km: number; fare: number; name: string };
export const RENTAL_PACKAGES: RentalPackage[] = [
  { id: "pkg-2h", hours: 2, km: 20, fare: 349, name: "2 Hours · 20 km" },
  { id: "pkg-4h", hours: 4, km: 40, fare: 649, name: "4 Hours · 40 km" },
  { id: "pkg-8h", hours: 8, km: 80, fare: 1199, name: "8 Hours · 80 km" },
];

/* ---------- Courier ---------- */
export type PackageType = { id: string; abbr: string; name: string; weight: string; range: string; time: string; price: number };
export const PACKAGE_TYPES: PackageType[] = [
  { id: "doc", abbr: "DOC", name: "Document", weight: "Up to 500 g", range: "₹79 – ₹99", time: "30–40 min", price: 89 },
  { id: "small", abbr: "S", name: "Small box", weight: "Up to 2 kg", range: "₹129 – ₹149", time: "35–45 min", price: 139 },
  { id: "medium", abbr: "M", name: "Medium box", weight: "Up to 5 kg", range: "₹179 – ₹209", time: "40–50 min", price: 194 },
  { id: "large", abbr: "L", name: "Large box", weight: "Up to 10 kg", range: "₹249 – ₹289", time: "45–60 min", price: 269 },
];

/* ---------- Grocery Hub ---------- */
export const GROCERY_HUB = {
  id: "roadrider-fresh",
  name: "RoadRider Fresh Express Hub",
  address: "Vikas Nagar, Lucknow",
  coords: { lat: 26.879, lng: 80.957 },
};

/* ---------- Places ---------- */
export type Place = {
  id: string;
  label: string;
  line: string;
  area: string;
  icon: "home" | "pin";
  coords?: { lat: number; lng: number };
};
export const SEED_PLACES: Place[] = [
  {
    id: "home",
    label: "Home",
    line: "15, Shahnajaf Road, Hazratganj",
    area: "Hazratganj, Lucknow",
    icon: "home",
    coords: { lat: 26.8467, lng: 80.9462 },
  },
  {
    id: "work",
    label: "Work",
    line: "Vibhuti Khand, Gomti Nagar",
    area: "Gomti Nagar, Lucknow",
    icon: "pin",
    coords: { lat: 26.8665, lng: 81.0063 },
  },
];

export const PARTNER = { name: "Arjun Singh", initials: "AS", rating: 4.9, trips: 820 };

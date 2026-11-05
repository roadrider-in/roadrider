import { useState } from "react";
import { Button, Icon, LocationRows, MapArt, PHOTOS, serviceMeta, type Service } from "./ui";
import { useNav } from "./nav";
import { AvatarFace } from "./kit";
import { PKG_FARE, PKG_NAMES, RIDE_FARE, RIDE_NAMES, inr, useStore } from "./store";
import { trackPackage } from "./services/courier.service";
import { useI18n } from "./i18n";

export function Header({ dark = false }: { dark?: boolean }) {
  const nav = useNav();
  const { place } = useStore();
  const { t } = useI18n();
  return <header className={`app-header ${dark ? "dark" : ""}`}>
    <button data-interactive="true" className="location" onClick={() => nav.open("LOCATION_SHEET")} aria-label="Change delivery location">
      <span className="location-icon"><Icon name="pin" size={16}/></span>
      <div><small>{t("delivering_to")}</small><strong>{place}</strong></div>
      <span className="chevron">⌄</span>
    </button>
    <button data-interactive="true" className="icon-button" aria-label="Notifications" onClick={() => nav.open("C12")}><Icon name="bell" size={20}/><i/></button>
    <button data-interactive="true" className="avatar" aria-label="Account" onClick={() => nav.go("account")}><AvatarFace/></button>
  </header>;
}

export function ServiceTabs({ service, onSelect }: { service: Service; onSelect: (value: Service) => void }) {
  const { t } = useI18n();
  const items: [Service, string, string][] = [
    ["food", "food", t("service_food")],
    ["rides", "car", t("service_rides")],
    ["grocery", "bag", t("service_grocery")],
    ["courier", "box", t("service_courier")],
  ];
  return <nav className="service-tabs">
    {items.map(([id, icon, label]) => <button data-interactive="true" key={id} className={id === service ? "active" : ""} onClick={() => onSelect(id)}>
      <Icon name={icon} size={16}/><span>{label}</span>
    </button>)}
  </nav>;
}

export type TabId = "home" | "navcart" | "orders" | "account";
export function BottomNav({ active, count, onSelect }: { active: TabId; count: number; onSelect: (value: TabId) => void }) {
  const { t } = useI18n();
  const TABS: [TabId, string, string][] = [
    ["home", "home", t("nav_home")],
    ["navcart", "bag", t("nav_cart")],
    ["orders", "receipt", t("nav_orders")],
    ["account", "user", t("nav_account")],
  ];
  return <nav className="bottom-nav" aria-label="Main navigation">
    {TABS.map(([id, icon, label]) => <button data-interactive="true" key={id} className={id === active ? "active" : ""} aria-current={id === active ? "page" : undefined} aria-label={id === "navcart" && count > 0 ? `${t("nav_cart")}, ${count} item${count > 1 ? "s" : ""}` : label} onClick={() => onSelect(id)}>
      <span><Icon name={icon} size={22}/>{id === "navcart" && count > 0 && <i aria-hidden="true">{count}</i>}</span><small>{label}</small>
    </button>)}
  </nav>;
}

function SearchBar({ placeholder, service }: { placeholder: string; service: Service }) {
  const nav = useNav();
  const [q, setQ] = useState("");
  const search = () => nav.open("C9", { service, query: q });
  return <div className="search-bar"><button data-interactive="true" aria-label="Search" onClick={search}><Icon name="search" size={20}/></button><input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} aria-label={placeholder} placeholder={placeholder}/><button data-interactive="true" aria-label="Search filters" onClick={() => nav.open("MORE", { label: "Filter & sort" })}><Icon name="filter" size={18}/></button></div>;
}

export function FoodHome({ onOpen, onService }: { onOpen: () => void; onService: (s: Service) => void }) {
  const nav = useNav();
  const { favorites, toggleFavorite, restaurants, setSelectedStoreId } = useStore();
  const { t } = useI18n();
  const [selectedCat, setSelectedCat] = useState<string>("All");

  const categories: [string, string][] = [
    ["✨", "All"],
    ["🍲", "Biryani"],
    ["🥘", "North Indian"],
    ["🍔", "Fast Food"],
    ["🍕", "Pizza"],
    ["🥡", "Chinese"],
    ["🍰", "Desserts"],
  ];
  const fav = (name: string) => favorites.includes(name);

  // Live restaurants from Supabase filtered dynamically by selected category
  const filteredStores = restaurants.filter((store) => {
    if (selectedCat === "All") return true;
    const catLower = selectedCat.toLowerCase();
    const matchesCuisine = store.cuisines?.some((c) => c.toLowerCase().includes(catLower));
    const matchesName = store.name.toLowerCase().includes(catLower);
    const matchesDesc = store.description?.toLowerCase().includes(catLower);
    const matchesMenu = store.menu?.some(
      (m) => m.name.toLowerCase().includes(catLower) || (m.category && m.category.toLowerCase().includes(catLower))
    );
    return matchesCuisine || matchesName || matchesDesc || matchesMenu;
  });

  return <>
    <section className="hero food-hero" style={{ backgroundImage: `url(${PHOTOS.food})` }}>
      <Header dark/>
      <ServiceTabs service="food" onSelect={onService}/>
      <div className="hero-copy">
        <p>{serviceMeta.food.kicker}</p>
        <h1>Delicious food,<br/>delivered fast.</h1>
      </div>
    </section>
    <div className="home-body food-body">
      <SearchBar placeholder={t("search_food_placeholder")} service="food"/>
      <div className="section-heading"><h2>{t("cat_craving")}</h2></div>
      <div className="categories">
        {categories.map(([icon, label]) => (
          <button
            data-interactive="true"
            key={label}
            className={selectedCat === label ? "active" : ""}
            style={selectedCat === label ? { borderColor: "#16a34a", background: "#f0fdf4" } : undefined}
            onClick={() => setSelectedCat(label)}
          >
            <span>{icon}</span>
            <small>{label}</small>
          </button>
        ))}
      </div>
      <div className="section-heading">
        <h2>{selectedCat === "All" ? t("popular_near_you") : `${selectedCat} Near You`}</h2>
        {selectedCat !== "All" && (
          <button data-interactive="true" onClick={() => setSelectedCat("All")}>
            View all
          </button>
        )}
      </div>

      {restaurants.length === 0 ? (
        <div style={{ padding: "40px 20px", textAlign: "center", background: "#f8fafc", borderRadius: 16, margin: "16px 0", border: "1px dashed #cbd5e1" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏪</div>
          <p style={{ fontWeight: 600, color: "#1e293b", margin: 0 }}>{t("no_restaurants_in_area")}</p>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Connecting to live restaurant partners...</p>
        </div>
      ) : filteredStores.length === 0 ? (
        <div style={{ padding: "36px 20px", textAlign: "center", background: "#f8fafc", borderRadius: 16, margin: "16px 0", border: "1px dashed #cbd5e1" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
          <p style={{ fontWeight: 600, color: "#1e293b", margin: 0 }}>{t("no_restaurants_found")}</p>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
            No restaurants currently match "{selectedCat}".
          </p>
          <button
            data-interactive="true"
            style={{
              marginTop: 12,
              padding: "8px 16px",
              background: "#16a34a",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
            }}
            onClick={() => setSelectedCat("All")}
          >
            View all ({restaurants.length})
          </button>
        </div>
      ) : (
        filteredStores.map((store) => (
          <div
            key={store.id}
            className={`restaurant-card ${store.isOnline ? "" : "closed"}`}
            role="button"
            tabIndex={0}
            data-interactive="true"
            onClick={() => {
              if (!store.isOnline) {
                nav.open("D13", { name: store.name });
              } else {
                setSelectedStoreId(store.id);
                onOpen();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (!store.isOnline) nav.open("D13", { name: store.name });
                else {
                  setSelectedStoreId(store.id);
                  onOpen();
                }
              }
            }}
          >
            <div className="restaurant-photo" style={{ backgroundImage: `url(${store.photo || PHOTOS.food2})` }}>
              <span className={`discount ${store.isOnline ? "" : "muted"}`}>
                {store.isOnline ? store.discount || "20% OFF" : t("closed").toUpperCase()}
              </span>
              <button
                data-interactive="true"
                className={`heart ${fav(store.name) ? "on" : ""}`}
                aria-label={`Favorite ${store.name}`}
                aria-pressed={fav(store.name)}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(store.name);
                }}
              >
                <Icon name="heart" size={17}/>
              </button>
              <p>{store.eta}</p>
            </div>
            <div className="restaurant-info">
              <div>
                <h3>{store.name}</h3>
                <p>{store.description}</p>
              </div>
              <span className="rating"><Icon name="star" size={11}/> {store.rating}</span>
            </div>
          </div>
        ))
      )}
      <div className="section-heading"><h2>Offers for you</h2></div>
      <div className="offers"><article><span>FIRST ORDER</span><strong>Flat 50% off</strong><small>Use WELCOME50</small></article><article><span>FREE DELIVERY</span><strong>Weekend treat</strong><small>On orders over ₹299</small></article></div>
    </div>
  </>;
}

const RENTALS = [["1 hr", "10 km"], ["2 hr", "20 km"], ["4 hr", "40 km"], ["8 hr", "80 km"]];
export function RidesHome({ onOpen, onService }: { onOpen: () => void; onService: (s: Service) => void }) {
  const nav = useNav();
  const { rideType, setRideType, pickup, drop } = useStore();
  const [tab, setTab] = useState<"ride" | "rental">("ride");
  const rental = rideType >= 4;
  const pickTab = (t: "ride" | "rental") => { setTab(t); setRideType(t === "ride" ? 1 : 5); };
  const book = () => { if (!drop && tab === "ride") { nav.open("C5", { target: "drop" }); return; } onOpen(); };
  const bands = [["BIKE", "₹48–62", "3 min"], ["AUTO", "₹86–102", "5 min"], ["CAB", "₹148–176", "7 min"], ["XL", "₹218–245", "9 min"]];
  return <div className="rides-page"><Header dark/><ServiceTabs service="rides" onSelect={onService}/>
    <div className="segment"><button data-interactive="true" className={tab === "ride" ? "selected" : ""} onClick={() => pickTab("ride")}>Book a ride</button><button data-interactive="true" className={tab === "rental" ? "selected" : ""} onClick={() => pickTab("rental")}>Hourly rental</button></div>
    <MapArt/><LocationRows pickup={pickup} drop={drop} onPickup={() => nav.open("C5", { target: "pickup" })} onDrop={() => nav.open("C5", { target: "drop" })}/>
    {tab === "ride" ? <>
      <div className="section-heading"><h2>Choose a ride</h2><span>Fare estimate</span></div>
      <div className="ride-options">
        {bands.map(([abbr, price, time], i) =>
          <button data-interactive="true" key={abbr} className={rideType === i ? "selected" : ""} aria-pressed={rideType === i} onClick={() => setRideType(i)}><span className="vehicle">{abbr}</span><strong>{RIDE_NAMES[i]}</strong><b>{price}</b><small>{time}</small></button>)}
      </div>
      <Button onClick={book}>Book {RIDE_NAMES[rideType]} · {bands[rideType][1]} <Icon name="arrow" size={19}/></Button>
    </> : <>
      <div className="section-heading"><h2>Choose a package</h2><span>Includes fuel</span></div>
      <div className="ride-options">
        {RENTALS.map(([hrs, km], i) => <button data-interactive="true" key={hrs} className={rideType === 4 + i ? "selected" : ""} aria-pressed={rideType === 4 + i} onClick={() => setRideType(4 + i)}><span className="vehicle">{hrs.toUpperCase()}</span><strong>{km}</strong><b>{inr(RIDE_FARE[4 + i])}</b><small>Cab</small></button>)}
      </div>
      <Button onClick={onOpen} disabled={!rental}>Book {RIDE_NAMES[rideType]} · {inr(RIDE_FARE[rideType])} <Icon name="arrow" size={19}/></Button>
    </>}
  </div>;
}

export function GroceryHome({ onOpen, onService }: { onOpen: () => void; onService: (s: Service) => void }) {
  const nav = useNav();
  const { favorites, toggleFavorite, groceryProducts } = useStore();
  const categories = [["FR", "Fruits"], ["VG", "Veggies"], ["ML", "Dairy"], ["SN", "Snacks"], ["＋", "More"]];

  const displayProducts = groceryProducts.length > 0
    ? groceryProducts.slice(0, 8).map((p) => [p.name, p.unit, inr(p.price), inr(p.mrp), p.photo])
    : [
        ["Farm fresh tomatoes", "500 g", "₹32", "₹45", PHOTOS.produce],
        ["Organic broccoli", "1 piece", "₹69", "₹89", PHOTOS.grocery],
      ];

  return <div className="grocery-page"><Header/><ServiceTabs service="grocery" onSelect={onService}/><section className="grocery-hero" style={{ backgroundImage: `url(${PHOTOS.grocery})` }}><div><p>FARM FRESH · EVERYDAY</p><h1>Fresh groceries<br/>at your doorstep.</h1><span>Delivery in 15 minutes</span></div></section>
    <SearchBar placeholder="Search 10,000+ products" service="grocery"/>
    <div className="section-heading"><h2>Shop by category</h2><button>See all</button></div>
    <div className="categories grocery-categories">{categories.map(([icon, label]) => <button data-interactive="true" key={label} onClick={() => nav.open("C9", { service: "grocery", query: label === "More" ? "" : label === "Fruits" ? "Banana" : label === "Veggies" ? "tomato" : label === "Dairy" ? "milk" : "bread" })}><span>{icon}</span><small>{label}</small></button>)}</div>
    <article className="green-banner"><div><small>FRESH & HEALTHY</small><strong>Up to 30% off</strong><button data-interactive="true" onClick={onOpen}>Shop now <Icon name="arrow" size={14}/></button></div><img src={PHOTOS.produce} alt="Fresh vegetables"/></article>
    <div className="section-heading"><h2>Daily essentials</h2><button>See all</button></div>
    <div className="product-grid">{displayProducts.map(([name, unit, price, old, photo], i) => <article key={name}>
      <div className="product-photo" style={{ backgroundImage: `url(${photo || (i ? PHOTOS.produce : PHOTOS.grocery)})` }}><span>{i ? "22%" : "28%"} OFF</span><button data-interactive="true" className={favorites.includes(name) ? "on" : ""} aria-label={`Favorite ${name}`} aria-pressed={favorites.includes(name)} onClick={() => toggleFavorite(name)}><Icon name="heart" size={16}/></button></div>
      <h3>{name}</h3><small>{unit}</small><div><b>{price}</b><del>{old}</del><button data-interactive="true" aria-label={`Add ${name}`} onClick={onOpen}><Icon name="plus" size={18}/></button></div>
    </article>)}</div>
  </div>;
}

export function CourierHome({ onOpen, onService }: { onOpen: () => void; onService: (s: Service) => void }) {
  const nav = useNav();
  const { pkg, setPkg, pickup, drop } = useStore();
  const [tab, setTab] = useState<"send" | "track">("send");
  const [id, setId] = useState("");
  const [tracked, setTracked] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const abbrs = ["DOC", "S", "M", "L"], weights = ["Up to 500 g", "Up to 2 kg", "Up to 5 kg", "Up to 10 kg"];
  const quote = () => { if (!drop) { nav.open("C5", { target: "drop" }); return; } onOpen(); };

  const track = async () => {
    const v = id.trim().toUpperCase();
    if (!v) {
      setError("Please enter a tracking ID.");
      setTracked(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await trackPackage(v);
      if (res) {
        setTracked(res.trackingNumber || (v.includes("-") ? v : `RR-${v.slice(2)}`));
      } else {
        setError("We couldn't find that ID. Try RR-48213.");
        setTracked(null);
      }
    } catch {
      setError("Tracking lookup failed.");
    } finally {
      setLoading(false);
    }
  };

  const steps = ["Booked", "Picked up", "In transit", "Delivered"];
  return <div className="courier-page">
    <section className="courier-hero" style={{ backgroundImage: `url(${PHOTOS.rider})` }}><Header dark/><ServiceTabs service="courier" onSelect={onService}/><div><p>FAST · SAFE · RELIABLE</p><h1>Send anything,<br/>anywhere.</h1><span>Doorstep pickup in minutes</span></div></section>
    <div className="courier-sheet"><div className="segment"><button data-interactive="true" className={tab === "send" ? "selected" : ""} onClick={() => setTab("send")}>Send package</button><button data-interactive="true" className={tab === "track" ? "selected" : ""} onClick={() => setTab("track")}>Track package</button></div>
      {tab === "send" ? <>
        <LocationRows courier pickup={pickup} drop={drop} onPickup={() => nav.open("C5", { target: "pickup" })} onDrop={() => nav.open("C5", { target: "drop" })}/>
        <div className="section-heading"><h2>Package type</h2></div>
        <div className="package-grid">{PKG_NAMES.map((name, i) => <button data-interactive="true" key={name} className={i === pkg ? "selected" : ""} aria-pressed={i === pkg} onClick={() => setPkg(i)}><span>{abbrs[i]}</span><strong>{name}</strong><small>{weights[i]}</small></button>)}</div>
        <div className="estimate"><div><small>ESTIMATED PRICE</small><strong>{inr(PKG_FARE[pkg])} – {inr(PKG_FARE[pkg] + 20)}</strong></div><div><small>DELIVERY</small><b>35–45 min</b></div></div>
        <Button onClick={quote}>Get quote <Icon name="arrow" size={19}/></Button>
        <div className="trust-row">{[["clock", "Live tracking"], ["shield", "Secure"], ["home", "Doorstep pickup"]].map(([icon, label]) => <div key={label}><span><Icon name={icon} size={18}/></span><small>{label}</small></div>)}</div>
      </> : <div className="track-panel">
        <div className="section-heading"><h2>Track a package</h2></div>
        <label className={`phone-input track-input ${error ? "invalid" : ""}`}><span><Icon name="box" size={16}/></span><input value={id} onChange={(e) => { setId(e.target.value); setError(""); }} onKeyDown={(e) => e.key === "Enter" && track()} placeholder="Enter tracking ID" aria-label="Tracking ID"/></label>
        {error && <p className="field-error"><Icon name="alert" size={13}/>{error}</p>}
        <div className="chip-row"><button data-interactive="true" onClick={() => { setId("RR-48213"); setError(""); }}>Try RR-48213</button></div>
        <Button onClick={track} loading={loading}>Track package</Button>
        {tracked && <div className="timeline" aria-live="polite"><h3>{tracked} · Small box</h3>{steps.map((s, i) => <div key={s} className={i < 2 ? "done" : i === 2 ? "now" : ""}><i>{i < 2 && <Icon name="check" size={11}/>}</i><div><strong>{s}</strong><small>{i === 0 ? "Today, 11:05 AM" : i === 1 ? "Today, 11:32 AM" : i === 2 ? "Arriving in about 18 min" : "Estimated 1:10 PM"}</small></div></div>)}</div>}
      </div>}
    </div>
  </div>;
}

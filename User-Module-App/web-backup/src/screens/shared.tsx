import { useEffect, useState } from "react";
import { Button, FlowHeader, Icon, MapArt, type Service } from "../ui";
import { EmptyState, GhostButton, StatePage } from "../states";
import { SPOTS, spotLabel, getLiveServiceSpots, type Spot } from "../places";
import { useStore } from "../store";
import { detectCurrentLocation } from "../services/location.service";

export type LocTarget = "deliver" | "pickup" | "drop";

/** C5: location picker & search. Also drives I5 (no saved addresses) and C10-style empty search. */
export function C5_LocationPicker({ target, courier, onClose, onUnavailable, onLocationOff, onAddAddress }: { target: LocTarget; courier: boolean; onClose: () => void; onUnavailable: (place: string) => void; onLocationOff: () => void; onAddAddress: () => void }) {
  const { places, setPlaces, setPlace, setPickup, setDrop, setGps } = useStore();
  const [query, setQuery] = useState("");
  const [spots, setSpots] = useState<Spot[]>(SPOTS);
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState("");

  useEffect(() => {
    let active = true;
    getLiveServiceSpots().then((liveSpots) => {
      if (active && liveSpots.length > 0) {
        setSpots(liveSpots);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const title = target === "deliver" ? "Delivery location" : target === "pickup" ? (courier ? "Pickup location" : "Pickup") : courier ? "Delivery address" : "Destination";
  const apply = (label: string) => { (target === "deliver" ? setPlace : target === "pickup" ? setPickup : setDrop)(label); if (target === "deliver") setPickup(label); onClose(); };
  const q = query.trim().toLowerCase();
  const filteredSpots = spots.filter((s) => `${s.name} ${s.area}`.toLowerCase().includes(q));
  const saved = places.filter((p) => `${p.label} ${p.address}`.toLowerCase().includes(q));

  const useGps = async () => {
    setLocating(true);
    setGpsError("");
    try {
      const res = await detectCurrentLocation();
      if (!res.success) {
        setLocating(false);
        if (res.statusCode === "permission_denied") {
          onLocationOff();
        } else {
          setGpsError(res.error || "Unable to retrieve location.");
        }
        return;
      }

      setGps(true);
      const addr = res.address!;
      if (!addr.isServiceable) {
        setLocating(false);
        onUnavailable(`${addr.locality}, ${addr.city}`);
        return;
      }

      const displayAddress = `${addr.locality}, ${addr.city}`;
      apply(displayAddress);
    } catch {
      setGpsError("Failed to detect location. Please select an area below.");
    } finally {
      setLocating(false);
    }
  };

  return <div className="picker-page" data-screen="C5_LocationPicker">
    <FlowHeader title={title} onBack={onClose} noHelp/>
    <div className="picker-body">
      <label className="loc-search"><Icon name="search" size={18}/><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search area, street or landmark" aria-label="Search location"/>{query && <button data-interactive="true" aria-label="Clear search" onClick={() => setQuery("")}><Icon name="x" size={15}/></button>}</label>
      <button data-interactive="true" className="gps-row" onClick={useGps} disabled={locating}>
        <span><Icon name="pin" size={18}/></span>
        <div>
          <strong>{locating ? "Detecting GPS location…" : "Use current location"}</strong>
          <small>{locating ? "Fetching device coordinates and address…" : "Using GPS for accuracy"}</small>
        </div>
        <Icon name="arrow" size={16}/>
      </button>
      {gpsError && <p className="field-error" style={{ margin: "0.5rem 1rem" }} role="alert"><Icon name="alert" size={13}/>{gpsError}</p>}
      <div className="picker-map"><MapArt/></div>
      {!q && <>
        <div className="section-heading"><h2>Saved places</h2><button data-interactive="true" onClick={onAddAddress}>+ Add new</button></div>
        {places.length === 0 ? <EmptyState id="I5_NoSavedAddresses" icon="pin" title="No saved addresses" text="Save Home and Work for one-tap checkout." cta="Add an address" onCta={onAddAddress}/>
          : <div className="spot-list light">{places.map((p) => <div key={p.id} className="spot-row"><button data-interactive="true" onClick={() => apply(p.address)}><span><Icon name={p.icon} size={17}/></span><div><strong>{p.label}</strong><small>{p.address}</small></div></button><button data-interactive="true" className="row-delete" aria-label={`Remove ${p.label}`} onClick={() => setPlaces((list) => list.filter((x) => x.id !== p.id))}><Icon name="trash" size={16}/></button></div>)}</div>}
      </>}
      {q && saved.length > 0 && <div className="spot-list light">{saved.map((p) => <div key={p.id} className="spot-row"><button data-interactive="true" onClick={() => apply(p.address)}><span><Icon name={p.icon} size={17}/></span><div><strong>{p.label}</strong><small>{p.address}</small></div></button></div>)}</div>}
      <div className="section-heading"><h2>{q ? "Results" : "Popular service areas"}</h2></div>
      {filteredSpots.length > 0 ? <div className="spot-list light">{filteredSpots.map((s) => <div key={s.name} className="spot-row"><button data-interactive="true" onClick={() => (s.served ? apply(spotLabel(s)) : onUnavailable(spotLabel(s)))}><span><Icon name="pin" size={17}/></span><div><strong>{s.name}</strong><small>{s.area} · <span style={{ color: s.served ? "#15803D" : "#991B1B", fontWeight: 600 }}>{s.served ? "Available" : "Coming soon"}</span></small></div></button></div>)}</div>
        : saved.length === 0 && <C10_NoSearchResults inline query={query} onClear={() => setQuery("")} suggestions={["Hazratganj", "Gomti Nagar", "Aminabad"]} onSearch={setQuery}/>}
    </div>
  </div>;
}

type Hit = { name: string; sub: string; open: boolean; icon: string };
const CATALOG: Partial<Record<Service, Hit[]>> = {
  food: [
    { name: "Royal Biryani House", sub: "Restaurant · Mughlai · 30 min", open: true, icon: "food" },
    { name: "Spice Garden", sub: "Restaurant · North Indian · Closed", open: false, icon: "food" },
    { name: "Lucknowi Chicken Biryani", sub: "Dish · Royal Biryani House · ₹289", open: true, icon: "food" },
    { name: "Galouti Kebab", sub: "Dish · Royal Biryani House · ₹219", open: true, icon: "food" },
    { name: "Paneer Tikka Platter", sub: "Dish · Spice Garden · Closed", open: false, icon: "food" },
  ],
  grocery: [
    { name: "Farm fresh tomatoes", sub: "500 g · ₹32", open: true, icon: "bag" },
    { name: "Organic broccoli", sub: "1 piece · ₹69", open: true, icon: "bag" },
    { name: "Fresh toned milk", sub: "1 L · ₹58", open: true, icon: "bag" },
    { name: "Brown bread", sub: "400 g · ₹45", open: true, icon: "bag" },
    { name: "Bananas", sub: "6 pieces · ₹49", open: true, icon: "bag" },
  ],
};
/** C9: search results. Empty results render C10. */
export function C9_SearchResults({ service, initial, onBack, onPick }: { service: Service; initial: string; onBack: () => void; onPick: (name: string, open: boolean) => void }) {
  const { restaurants, groceryProducts } = useStore();
  const [query, setQuery] = useState(initial);

  const liveHits: Hit[] = service === "food" && restaurants.length > 0
    ? restaurants.map((r) => ({ name: r.name, sub: `${r.cuisines?.join(" · ") || "Restaurant"} · ${r.eta || "30 min"}`, open: r.isOnline, icon: "food" }))
    : service === "grocery" && groceryProducts.length > 0
    ? groceryProducts.map((p) => ({ name: p.name, sub: `${p.unit || "item"} · ₹${p.price}`, open: p.isAvailable, icon: "bag" }))
    : CATALOG[service] ?? [];

  const items = liveHits.filter((h) => `${h.name} ${h.sub}`.toLowerCase().includes(query.trim().toLowerCase()));
  const hints = service === "food" ? ["Biryani", "Kebab", "Paneer"] : ["Tomatoes", "Milk", "Bread"];
  return <div className="picker-page" data-screen="C9_SearchResults">
    <FlowHeader title="Search" onBack={onBack} noHelp/>
    <div className="picker-body">
      <label className="loc-search"><Icon name="search" size={18}/><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={service === "food" ? "Search dishes or restaurants" : "Search products"} aria-label="Search"/>{query && <button data-interactive="true" aria-label="Clear search" onClick={() => setQuery("")}><Icon name="x" size={15}/></button>}</label>
      {items.length > 0 ? <><p className="result-count">{items.length} {items.length === 1 ? "result" : "results"} for “{query || "everything"}”</p>
        <div className="spot-list light">{items.map((h) => <div key={h.name} className="spot-row"><button data-interactive="true" onClick={() => onPick(h.name, h.open)}><span><Icon name={h.icon} size={17}/></span><div><strong>{h.name}</strong><small>{h.sub}</small></div><Icon name="arrow" size={16}/></button></div>)}</div></>
        : <C10_NoSearchResults query={query} onClear={() => setQuery("")} suggestions={hints} onSearch={setQuery}/>}
    </div>
  </div>;
}

/** C10: no search results. */
export function C10_NoSearchResults({ query, onClear, suggestions, onSearch, inline = false }: { query: string; onClear: () => void; suggestions: string[]; onSearch: (q: string) => void; inline?: boolean }) {
  return <div className={inline ? "" : "no-results"} data-screen="C10_NoSearchResults">
    <EmptyState icon="search" title={`No results for “${query}”`} text="Check the spelling or try a more general word." cta="Clear search" onCta={onClear}/>
    <div className="chip-row">{suggestions.map((s) => <button data-interactive="true" key={s} onClick={() => onSearch(s)}>{s}</button>)}</div>
  </div>;
}

/** C12 + I6: notifications list with clear-all leading to the empty state. */
export function C12_Notifications({ onBack, onBrowse }: { onBack: () => void; onBrowse: () => void }) {
  const { notices, setNotices, dismissNotice } = useStore();
  return <div className="picker-page" data-screen="C12_Notifications">
    <FlowHeader title="Notifications" onBack={onBack} noHelp/>
    <div className="picker-body">
      {notices.length === 0 ? <I6_NoNotifications onBrowse={onBrowse}/> : <>
        <div className="section-heading"><h2>Latest</h2><button data-interactive="true" onClick={() => setNotices([])}>Clear all</button></div>
        <div className="notice-list">{notices.map((n) => <article key={n.id}><span><Icon name={n.icon} size={18}/></span><div><strong>{n.title}</strong><p>{n.body}</p><small>{n.time}</small></div><button data-interactive="true" aria-label="Dismiss" onClick={() => dismissNotice(n.id)}><Icon name="x" size={15}/></button></article>)}</div></>}
    </div>
  </div>;
}

const browseLabel: Record<Service, string> = { food: "Browse restaurants", rides: "Book a ride", grocery: "Start shopping", courier: "Send a package" };
export function I1_EmptyCart({ service, onBrowse }: { service: Service; onBrowse: () => void }) {
  return <EmptyState id="I1_EmptyCart" service={service} icon="cart" title="Your cart is empty" text={service === "grocery" ? "Add fresh groceries and they will show up here." : "Add something delicious and it will show up here."} cta={browseLabel[service]} onCta={onBrowse}/>;
}
export function I2_NothingInProgress({ service, onStart }: { service: Service; onStart: () => void }) {
  return <EmptyState id="I2_NothingInProgress" service={service} icon={service === "rides" ? "car" : "box"} title={service === "rides" ? "No ride in progress" : "No package in progress"} text={service === "rides" ? "Book a ride and its summary will appear here." : "Get a quote and your delivery will appear here."} cta={browseLabel[service]} onCta={onStart}/>;
}
export function I3_NoOrders({ onBrowse }: { onBrowse: () => void }) {
  return <EmptyState id="I3_NoOrders" icon="list" title="No orders yet" text="Orders from every RoadRider service will show up here." cta="Browse restaurants" onCta={onBrowse}/>;
}
export function I6_NoNotifications({ onBrowse }: { onBrowse: () => void }) {
  return <EmptyState id="I6_NoNotifications" icon="bell" title="You're all caught up" text="Order, ride, and refund updates will appear here." cta="Browse restaurants" onCta={onBrowse}/>;
}
export function I7_NoFavorites({ onBrowse }: { onBrowse: () => void }) {
  return <EmptyState id="I7_NoFavorites" icon="heart" title="No favorites yet" text="Tap the heart on a restaurant or product to save it here." cta="Browse restaurants" onCta={onBrowse}/>;
}
export function I8_NoOffers({ onBrowse }: { onBrowse: () => void }) {
  return <EmptyState id="I8_NoOffers" icon="gift" title="No offers right now" text="New offers land every week. Check back soon." cta="Explore services" onCta={onBrowse}/>;
}

/** D13: restaurant closed / unavailable. */
export function D13_RestaurantClosed({ name, onBrowse, onBack }: { name: string; onBrowse: () => void; onBack: () => void }) {
  const [notify, setNotify] = useState(false);
  return <StatePage id="D13_RestaurantClosed" tone="warning" icon="clock" tag="Closed now" title={`${name} is closed`} text="They reopen today at 6:00 PM. You can browse other restaurants that are open right now.">
    <Button onClick={onBrowse}>Browse open restaurants</Button>
    <GhostButton onClick={() => setNotify((v) => !v)}>{notify ? "We'll remind you at 6 PM" : "Remind me when it opens"}</GhostButton>
    <GhostButton onClick={onBack}>Go back</GhostButton>
  </StatePage>;
}

/** D14: item out of stock / cart conflict. */
export function D14_CartConflict({ item, available, onKeep, onRemove, onBack }: { item: string; available: number; onKeep: () => void; onRemove: () => void; onBack: () => void }) {
  return <StatePage id="D14_CartConflict" tone="warning" icon="alert" tag="Limited stock" title={available > 0 ? `Only ${available} left` : "Item sold out"} text={available > 0 ? `${item} is almost gone. We can keep ${available} in your cart.` : `${item} just sold out. Remove it to continue checkout.`}>
    {available > 0 && <Button onClick={onKeep}>Keep {available} in cart</Button>}
    <GhostButton onClick={onRemove}>Remove from cart</GhostButton>
    <GhostButton onClick={onBack}>Go back</GhostButton>
  </StatePage>;
}

/** E9: no drivers available (themed to Rides). */
export function E9_NoDrivers({ rideName, onRetry, onChange, onBack }: { rideName: string; onRetry: () => void; onChange: () => void; onBack: () => void }) {
  const [busy, setBusy] = useState(false);
  return <StatePage id="E9_NoDrivers" dark tone="warning" icon="car" tag="No drivers nearby" title={`No ${rideName} drivers available`} text="All nearby drivers are busy. Try again in a minute or choose a different ride type.">
    <Button disabled={busy} onClick={() => { setBusy(true); setTimeout(onRetry, 900); }}><Icon name="refresh" size={18}/>{busy ? "Searching…" : "Try again"}</Button>
    <GhostButton onClick={onChange}>Choose another ride</GhostButton>
    <GhostButton onClick={onBack}>Go back</GhostButton>
  </StatePage>;
}

/** F13: minimum order / out of stock warning for Grocery. */
export function F13_GroceryWarning({ kind, needed, available, onFix, onBack }: { kind: "minimum" | "stock"; needed: string; available: number; onFix: () => void; onBack: () => void }) {
  return <StatePage id="F13_GroceryWarning" tone="warning" icon="bag" tag={kind === "minimum" ? "Minimum order" : "Out of stock"} title={kind === "minimum" ? `Add ${needed} more to checkout` : `Only ${available} in stock`} text={kind === "minimum" ? "Grocery orders need a minimum basket of ₹250. Add a few more items to continue." : "We don't have more of this item right now. We'll keep the maximum available in your basket."}>
    <Button onClick={onFix}>{kind === "minimum" ? "Add more items" : `Keep ${available} in basket`}</Button>
    <GhostButton onClick={onBack}>Back to basket</GhostButton>
  </StatePage>;
}

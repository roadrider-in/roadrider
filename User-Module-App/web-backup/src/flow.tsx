import { useEffect, useState } from "react";
import { Button, FlowHeader, Icon, LocationRows, MapArt, Logo, serviceMeta, type Service, UtilityHeader } from "./ui";
import { useNav, type Screen } from "./nav";
import { FEES, PAY_METHODS, RIDE_NAMES, couponInfo, inr, methodsFor, orderTotal, useStore } from "./store";
import { EmptyState } from "./states";
import { AvatarFace } from "./kit";
import { K9_LogoutConfirm } from "./screens/account";
import { I1_EmptyCart, I2_NothingInProgress, I3_NoOrders } from "./screens/shared";
import { OrderJourney } from "./screens/OrderJourney";
import { AddNoteCard } from "./screens/AddNoteCard";

const flowCopy: Record<Service, { detail: string; subtitle: string; item: string }> = {
  food: { detail: "Royal Biryani House", subtitle: "Mughlai · North Indian · 30–35 min", item: "Lucknowi Chicken Biryani" },
  rides: { detail: "Confirm your ride", subtitle: "Hazratganj to Gomti Nagar", item: "Auto · 5 min away" },
  grocery: { detail: "Your basket", subtitle: "Fresh picks delivered in 15 minutes", item: "Fresh produce basket" },
  courier: { detail: "Your delivery quote", subtitle: "Hazratganj to Gomti Nagar · 6.2 km", item: "Small box · up to 2 kg" },
};
const iconFor = (s: Service) => (s === "food" ? "food" : s === "grocery" ? "bag" : s === "courier" ? "box" : "car");

function useCopy(service: Service) {
  const { pickup, drop, rideType, pkg } = useStore();
  const base = flowCopy[service];
  const route = `${pickup.split(",")[0]} to ${(drop || "Gomti Nagar").split(",")[0]}`;
  const item = service === "rides" ? `${RIDE_NAMES[rideType]} · 5 min away` : service === "courier" ? ["Document · up to 500 g", "Small box · up to 2 kg", "Medium box · up to 5 kg", "Large box · up to 10 kg"][pkg] : base.item;
  const subtitle = service === "rides" ? route : service === "courier" ? `${route} · 6.2 km` : base.subtitle;
  return { ...base, item, subtitle };
}
export function useAmounts(service: Service) {
  const { qty, rideType, pkg, coupon, referrals } = useStore();
  const q = Math.max(qty[service], 1);
  const o = orderTotal(service, q, rideType, pkg, coupon, referrals);
  return { q, items: o.items, fees: FEES[service], discount: o.discount, coupon: o.discount > 0 ? coupon : null, total: o.total };
}

export function ServiceDetail({ service, onBack, onNext }: { service: Service; onBack: () => void; onNext: () => void }) {
  const copy = useCopy(service);
  const { rideType, pickup, drop, payMethod, restaurants, selectedStoreId, qty, setQtyFor } = useStore();
  const nav = useNav();
  const a = useAmounts(service);
  const unit = a.items / a.q;

  if (service === "rides") return <div className="flow-page themed"><FlowHeader title="Confirm booking" onBack={onBack}/><MapArt/><div className="driver-preview"><span className="vehicle-icon"><Icon name="car"/></span><div><small>YOUR RIDE</small><h2>{RIDE_NAMES[rideType]}</h2><p>Comfortable everyday rides</p></div><strong>{inr(unit)}</strong></div><LocationRows pickup={pickup} drop={drop || "Gomti Nagar"} onPickup={() => nav.open("C5", { target: "pickup" })} onDrop={() => nav.open("C5", { target: "drop" })}/><div className="info-strip"><Icon name="clock"/><span>Driver arrives in <strong>5 minutes</strong></span></div><div className="bottom-action"><div className="pay-row"><Icon name="card"/><span>Pay with {PAY_METHODS[payMethod]}</span><button data-interactive="true" className="link-button inline" onClick={() => nav.open("H4")}>Change</button></div><Button onClick={onNext}>Confirm {RIDE_NAMES[rideType]} · {inr(unit)}</Button></div></div>;

  const currentStore = service === "food"
    ? restaurants.find((r) => r.id === selectedStoreId) || restaurants[0]
    : null;

  const storeName = currentStore?.name || copy.detail;
  const storeSub = currentStore ? `${currentStore.cuisines?.join(" · ")} · ${currentStore.address}` : copy.subtitle;
  const storePhoto = currentStore?.photo || serviceMeta[service].photo;
  const storeRating = currentStore ? currentStore.rating : 4.8;
  const menuItems = currentStore?.menu || [];

  return <div className="flow-page">
    <div className="detail-cover" style={{ backgroundImage: `url(${storePhoto})` }}>
      <FlowHeader title="" onBack={onBack}/>
      <span className="detail-badge">{currentStore?.isOnline ? "Open Now" : serviceMeta[service].label}</span>
    </div>
    <section className="detail-content">
      <p className="eyebrow">{currentStore ? "RESTAURANT" : serviceMeta[service].kicker}</p>
      <h1>{storeName}</h1>
      <p>{storeSub}</p>
      <div className="stat-row">
        <span><Icon name="star" size={14}/> {storeRating} rating</span>
        <span><Icon name="clock" size={14}/> {currentStore?.eta || "Fast delivery"}</span>
      </div>

      <div className="section-heading">
        <h2>{service === "food" ? "Menu Items" : service === "courier" ? "Quote breakdown" : "In your basket"}</h2>
      </div>

      {service === "food" && menuItems.length > 0 ? (
        menuItems.map((item) => (
          <article key={item.id} className="line-item" style={{ marginBottom: "0.75rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: item.isVeg ? "#16A34A" : "#DC2626" }} />
                <h3>{item.name}</h3>
              </div>
              <p>{item.description || (item.isVeg ? "Delicious vegetarian dish prepared fresh" : "Special chef recipe prepared fresh")}</p>
              <strong>{inr(item.price)}</strong>
            </div>
            <button data-interactive="true" onClick={() => { setQtyFor("food", Math.max(1, qty.food)); onNext(); }}>
              Add +
            </button>
          </article>
        ))
      ) : (
        <article className="line-item">
          <div>
            <h3>{copy.item}</h3>
            <p>{service === "food" ? "Fragrant basmati rice, tender chicken & house spices" : "Carefully handled and protected throughout the journey."}</p>
            <strong>{inr(unit)}</strong>
          </div>
          <button data-interactive="true" onClick={onNext}>{service === "courier" ? "Select" : "Add +"}</button>
        </article>
      )}
    </section>
    <div className="bottom-action">
      <Button onClick={onNext}>
        {service === "food" ? `Add to cart · ${inr(a.items)}` : service === "grocery" ? `View basket · ${inr(a.items)}` : "Continue to payment"}
      </Button>
    </div>
  </div>;
}

export function BillSummary({ service }: { service: Service }) {
  const a = useAmounts(service);
  return <div className="bill"><h3>Bill details</h3><div><span>Item total</span><b>{inr(a.items)}</b></div><div><span>Delivery fee</span><b className="success">FREE</b></div>{a.discount > 0 && <div><span>Coupon {a.coupon}</span><b className="success">−{inr(a.discount)}</b></div>}{a.fees > 0 && <div><span>Taxes & fees</span><b>{inr(a.fees)}</b></div>}<div className="bill-total"><span>To pay</span><strong>{inr(a.total)}</strong></div></div>;
}

/** Coupon entry point for cart and checkout; opens C15. */
export function CouponRow({ service }: { service: Service }) {
  const nav = useNav();
  const { coupon, referrals } = useStore();
  const a = useAmounts(service);
  const valid = !!coupon && couponInfo(coupon, service, a.items, referrals).ok;
  return <button data-interactive="true" className={`promo-row ${valid ? "applied" : ""}`} onClick={() => nav.open("C15", { service })}><span>%</span><div><strong>{valid ? `${coupon} applied` : "Apply coupon"}</strong><small>{valid ? (a.discount > 0 ? `You save ${inr(a.discount)}` : "Tap to change or remove") : "Save more on this order"}</small></div><Icon name="arrow" size={18}/></button>;
}

export function Stepper({ value, onChange }: { value: number; onChange: (delta: number) => void }) {
  return <div className="stepper"><button data-interactive="true" aria-label="Decrease quantity" onClick={() => onChange(-1)}>−</button><b aria-live="polite">{value}</b><button data-interactive="true" aria-label="Increase quantity" onClick={() => onChange(1)}>+</button></div>;
}

export function CheckoutScreen({ service, screen, onBack, onNext, onPay, onQty }: { service: Service; screen: Screen; onBack: () => void; onNext: () => void; onPay: () => void; onQty: (delta: number) => void }) {
  const copy = useCopy(service);
  const nav = useNav();
  const { places, payMethod, setPayMethod, setPlace, qty, activeOrderDbId, completeOrder } = useStore();
  const [addr, setAddr] = useState(0);
  const a = useAmounts(service);
  const allowed = methodsFor(service);
  useEffect(() => { if (!allowed.includes(payMethod)) setPayMethod(0); }, [allowed, payMethod, setPayMethod]);
  if (screen === "confirmed" || screen === "tracking" || screen === "complete") {
    return <OrderJourney orderId={activeOrderDbId} onBack={() => { completeOrder(service); onNext(); }} onHome={() => onNext()} />;
  }
  const title = screen === "cart" ? (service === "rides" ? "Finding your driver" : "Your cart") : screen === "address" ? "Delivery details" : "Payment";
  const methodSub = ["Google Pay, PhonePe and more", "Visa, Mastercard, RuPay", "All major banks", service === "rides" ? "Pay your driver in cash" : "Pay in cash when it arrives"];
  const noAddress = screen === "address" && places.length === 0;
  return <div className="flow-page checkout"><FlowHeader title={title} onBack={onBack}/>
    {screen === "cart" && <><article className="cart-item"><div className="item-thumb"><Icon name={iconFor(service)}/></div><div><h3>{copy.item}</h3><p>{copy.subtitle}</p><strong>{inr(a.items)}</strong></div>{(service === "food" || service === "grocery") && <Stepper value={qty[service]} onChange={onQty}/>}</article>{(service === "food" || service === "grocery") && <AddNoteCard />}<CouponRow service={service}/><BillSummary service={service}/></>}
    {screen === "address" && <><div className="map-mini"><MapArt/></div><div className="section-heading"><h2>Choose an address</h2><button data-interactive="true" onClick={() => nav.open("C7")}>+ Add new</button></div>
      {noAddress ? <EmptyState id="I5_NoSavedAddresses" icon="pin" title="No saved addresses" text="Add an address so we know where to deliver." cta="Add an address" onCta={() => nav.open("C7")}/>
        : places.map((p, i) => <button data-interactive="true" onClick={() => setAddr(i)} className={`address-card ${i === addr ? "selected" : ""}`} key={p.id}><span><Icon name={p.icon}/></span><div><strong>{p.label}</strong><p>{p.address}</p></div><i/></button>)}</>}
    {screen === "payment" && <><div className="total-card"><small>TOTAL TO PAY</small><strong>{inr(a.total)}</strong><span>Secure checkout</span></div><div className="section-heading"><h2>Payment method</h2></div>{allowed.map((i) => <button data-interactive="true" onClick={() => setPayMethod(i)} className={`payment-card ${i === payMethod ? "selected" : ""}`} key={i}><span><Icon name={i === 3 ? "receipt" : i === 2 ? "bank" : "card"}/></span><div><strong>{PAY_METHODS[i]}</strong><small>{methodSub[i]}</small></div><i/></button>)}<button data-interactive="true" className="link-button center" onClick={() => nav.open("H4")}>Change payment method</button><CouponRow service={service}/></>}
    <div className="bottom-action"><Button disabled={noAddress} onClick={() => { if (screen === "address" && places[addr]) setPlace(places[addr].address); if (screen === "payment") onPay(); else onNext(); }}>{screen === "cart" ? "Continue" : screen === "address" ? "Deliver here" : `Pay ${inr(a.total)}`}</Button></div>
  </div>;
}

const ratingLabel = ["", "Poor", "Could be better", "Good", "Great", "Excellent"];
function CallSheet({ name, onEnd }: { name: string; onEnd: () => void }) {
  const [sec, setSec] = useState(-3);
  const [mute, setMute] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  useEffect(() => { const t = setInterval(() => setSec((s) => s + 1), 1000); return () => clearInterval(t); }, []);
  const label = sec < 0 ? "Calling…" : `Connected · 00:${String(sec).padStart(2, "0")}`;
  return <div className="call-sheet" role="dialog" aria-label={`Call ${name}`}>
    <div className="call-card"><div className="partner-avatar big">AS</div><h3>{name}</h3><p aria-live="polite">{label}</p>
      <div className="call-actions">
        <button data-interactive="true" className={mute ? "on" : ""} aria-pressed={mute} onClick={() => setMute((v) => !v)}><Icon name="mic" size={20}/><small>{mute ? "Muted" : "Mute"}</small></button>
        <button data-interactive="true" className="end" aria-label="End call" onClick={onEnd}><Icon name="phone" size={22}/></button>
        <button data-interactive="true" className={speaker ? "on" : ""} aria-pressed={speaker} onClick={() => setSpeaker((v) => !v)}><Icon name="speaker" size={20}/><small>Speaker</small></button>
      </div></div>
  </div>;
}

export function StatusScreen({ service, stage, onNext }: { service: Service; stage: "confirmed" | "tracking" | "complete"; onNext: () => void }) {
  const isRide = service === "rides";
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [calling, setCalling] = useState(false);
  const a = useAmounts(service);
  const { payMethod, lastPaid } = useStore();
  if (stage === "complete") return <div className="status-page complete-page"><div className="success-mark"><Icon name="check" size={42}/></div><p className="eyebrow">ALL DONE</p><h1>{isRide ? "Hope you enjoyed\nthe ride!" : "Delivered with care."}</h1><p>{isRide ? "You arrived at your destination safely." : "Thanks for choosing RoadRider. Your order has been completed."}</p><div className="receipt"><div><span>Total paid</span><strong>{inr(lastPaid || a.total)}</strong></div><div><span>Payment</span><b>{PAY_METHODS[payMethod]}</b></div></div><h3>How was your experience?</h3><div className="stars" role="radiogroup" aria-label="Rating">{[1, 2, 3, 4, 5].map((i) => <button data-interactive="true" key={i} role="radio" aria-checked={rating === i} aria-label={`${i} star${i > 1 ? "s" : ""}`} className={i <= (hover || rating) ? "on" : ""} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)} onClick={() => setRating(i)}><Icon name="star" size={28}/></button>)}</div><p className="rating-label" aria-live="polite">{rating ? `${ratingLabel[rating]} · thanks for rating` : "Tap a star to rate"}</p><Button onClick={onNext}>Back to home</Button></div>;
  return <div className="status-page"><div className="status-map"><MapArt/><div className="status-top"><Logo/><button>Help</button></div></div><section className="tracking-sheet"><div className="drag"/><p className="eyebrow">{stage === "confirmed" ? "BOOKING CONFIRMED" : "LIVE UPDATE"}</p><h1>{stage === "confirmed" ? (isRide ? "Meet Arjun, your driver" : "We're on it!") : (isRide ? "You're on your way" : "Arriving in 18 minutes")}</h1><p>{stage === "confirmed" ? "Everything is set. We'll keep you updated." : "Your RoadRider partner is moving smoothly toward the destination."}</p>
    <div className="partner"><div className="partner-avatar">AS</div><div><strong>Arjun Singh</strong><span><Icon name="star" size={12}/> 4.9 · 820 deliveries</span></div><button data-interactive="true" aria-label="Call Arjun Singh" onClick={() => setCalling(true)}><Icon name="phone" size={18}/></button></div>
    <div className="status-steps">{["Confirmed", "Picked up", "On the way", "Delivered"].map((label, i) => <div key={label} className={i < (stage === "tracking" ? 3 : 1) ? "done" : ""}><i>{i < (stage === "tracking" ? 3 : 1) && <Icon name="check" size={11}/>}</i><span>{label}</span></div>)}</div>
    <Button onClick={onNext}>{stage === "confirmed" ? "View live tracking" : isRide ? "Complete trip" : "Mark as delivered"}</Button>
  </section>{calling && <CallSheet name="Arjun Singh" onEnd={() => setCalling(false)}/>}</div>;
}

const cartIcon: Record<Service, string> = { food: "food", rides: "car", grocery: "bag", courier: "box" };
export function NavCart({ service, onBrowse, onCheckout, onQty }: { service: Service; onBrowse: () => void; onCheckout: () => void; onQty: (delta: number) => void }) {
  const nav = useNav();
  const copy = useCopy(service);
  const { qty, pickup, drop } = useStore();
  const a = useAmounts(service);
  const titles: Record<Service, [string, string, string]> = { food: ["Your food cart", "Royal Biryani House", "Delivery in 30–35 min"], rides: ["Current ride", "Booking summary", `Pickup: ${pickup.split(",")[0]} · 5 min away`], grocery: ["Your grocery cart", `${qty.grocery} daily essentials`, "Delivery in 15 min"], courier: ["Package in progress", "Your delivery quote", copy.subtitle] };
  const [title, sub, detail] = titles[service];
  const empty = qty[service] === 0;
  return <div className="utility-page cart-destination">
    <UtilityHeader title={empty ? "Your cart" : title} subtitle={serviceMeta[service].label} onBell={() => nav.open("C12")}/>
    {empty ? (service === "food" || service === "grocery" ? <I1_EmptyCart service={service} onBrowse={onBrowse}/> : <I2_NothingInProgress service={service} onStart={onBrowse}/>) : <>
      <div className="context-chip"><span><Icon name={cartIcon[service]} size={15}/></span>{serviceMeta[service].label}</div>
      <article className="nav-cart-card"><span className="nav-cart-icon"><Icon name={cartIcon[service]} size={25}/></span><div><p>{sub}</p><h2>{service === "grocery" ? "Fresh produce basket" : copy.item}</h2><small>{detail}</small><strong>{inr(a.items)}</strong></div></article>
      {service === "food" || service === "grocery" ? <><div className="quantity-row"><span>Quantity</span><Stepper value={qty[service]} onChange={onQty}/></div><AddNoteCard/></> : <div className="route-summary"><LocationRows courier={service === "courier"} pickup={pickup} drop={drop || "Gomti Nagar"} onPickup={() => nav.open("C5", { target: "pickup" })} onDrop={() => nav.open("C5", { target: "drop" })}/></div>}
      <CouponRow service={service}/>
      <BillSummary service={service}/>
      <button data-interactive="true" className="browse-link" onClick={onBrowse}>Continue browsing {serviceMeta[service].label}</button>
      <div className="utility-action"><Button onClick={onCheckout}>{service === "rides" ? "Continue booking" : service === "courier" ? "Review quote" : "Proceed to checkout"}</Button></div>
    </>}
  </div>;
}

export function OrdersScreen({ onBrowse }: { onBrowse: () => void }) {
  const nav = useNav();
  const { orders } = useStore();
  const [tab, setTab] = useState<"active" | "past">("active");
  const list = orders.filter((o) => o.state === tab);
  const activeCount = orders.filter((o) => o.state === "active").length;
  return <div className="utility-page">
    <UtilityHeader title="Your orders" subtitle="ALL ROADRIDER SERVICES" onBell={() => nav.open("C12")}/>
    <div className="utility-tabs" role="tablist"><button data-interactive="true" role="tab" aria-selected={tab === "active"} className={tab === "active" ? "active" : ""} onClick={() => setTab("active")}>Active {activeCount > 0 && <i>{activeCount}</i>}</button><button data-interactive="true" role="tab" aria-selected={tab === "past"} className={tab === "past" ? "active" : ""} onClick={() => setTab("past")}>Past</button></div>
    {list.length === 0 ? (tab === "active" ? <I3_NoOrders onBrowse={onBrowse}/> : <EmptyState icon="list" title="No past orders" text="Completed orders will be listed here." cta="Browse restaurants" onCta={onBrowse}/>) :
      <div className="cross-order-list">{list.map((o) => <button data-interactive="true" onClick={() => nav.open("ORDER_JOURNEY", { id: o.dbId || o.orderNumber || o.id })} key={o.id} className={`order-${o.service}`}>
        <span className="service-order-icon"><Icon name={iconFor(o.service)}/></span>
        <div><p>{serviceMeta[o.service].label} · {tab === "active" ? "ACTIVE" : "PAST"}</p><h3>{o.title}</h3><small>{o.status}</small></div><div className="order-price"><strong>{inr(o.price)}</strong><Icon name="arrow" size={16}/></div>
      </button>)}</div>}
  </div>;
}

/** K1: account home with grouped rows. Every row opens a real screen. */
export function K1_AccountHome({ onLogout }: { onLogout: () => void }) {
  const nav = useNav();
  const { profile } = useStore();
  const [logout, setLogout] = useState(false);
  const groups: [string, [string, string, string][]][] = [
    ["My account", [["user", "Edit profile", "K2"], ["pin", "Saved addresses", "K3"], ["card", "Payment methods", "H4"], ["heart", "Favorites", "D12"]]],
    ["Rewards", [["gift", "Refer & earn", "K4"], ["star", "Offers", "C13"]]],
    ["Preferences", [["bell", "Notifications", "K5"], ["list", "Language", "K6"], ["lock", "Privacy & permissions", "K7"]]],
    ["Support", [["shield", "Help & Support", "L1"], ["info", "About RoadRider", "K10"], ["star", "Rate the app", "K11"]]],
  ];
  return <div className="account-page" data-screen="K1_AccountHome"><UtilityHeader title="Account" subtitle="PROFILE & SETTINGS" onBell={() => nav.open("C12")}/>
    <section className="profile-card"><div className="avatar large"><AvatarFace/></div><div><h1>{profile.name}</h1><p>+91 {profile.phone}</p></div><button data-interactive="true" className="edit-btn" onClick={() => nav.open("K2")}>Edit</button></section>
    {groups.map(([title, rows]) => <section key={title}><h3 className="k-h">{title}</h3><div className="menu-list tight">{rows.map(([icon, label, id]) => <button data-interactive="true" key={label} onClick={() => nav.open(id)}><span><Icon name={icon}/></span><strong>{label}</strong><Icon name="arrow" size={18}/></button>)}</div></section>)}
    <div className="account-footer"><button data-interactive="true" className="logout-btn" onClick={() => setLogout(true)}><Icon name="back" size={18}/>Log out</button><button data-interactive="true" className="delete-link" onClick={() => nav.open("K8")}>Delete account</button></div>
    {logout && <K9_LogoutConfirm onCancel={() => setLogout(false)} onConfirm={onLogout}/>}
  </div>;
}

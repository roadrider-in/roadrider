import { useState } from "react";
import { Button, Icon } from "../ui";
import { useLeaveGuard, useNav } from "../nav";
import { OFFERS, couponInfo, inr, rewardOffers, unitFor, useStore, type Offer } from "../store";
import type { Service } from "../ui";
import { EmptyState, GhostButton } from "../states";
import { Chip, Dialog, Field, KPage, Row, Sheet, StatusChip } from "../kit";
import { I7_NoFavorites, I8_NoOffers } from "./shared";

/** H4: saved payment methods. */
export function H4_PaymentMethods() {
  const nav = useNav();
  const { methods, removeMethod, setDefaultMethod } = useStore();
  const [del, setDel] = useState<number | null>(null);
  const target = methods.find((m) => m.id === del);
  return <KPage title="Payment methods" onBack={nav.close}>
    <h3 className="k-h first">Cards & UPI</h3>
    {methods.length === 0 ? <EmptyState icon="card" title="No saved methods" text="Save a card or UPI ID for faster checkout." cta="Add card or UPI" onCta={() => nav.open("H3")}/> :
      <div className="k-card flush">{methods.map((m) => <div key={m.id} className="k-row static"><span className="row-icon"><Icon name={m.type === "card" ? "card" : "bank"} size={18}/></span><div><strong>{m.title}</strong><small>{m.sub}</small>{!m.isDefault && <button data-interactive="true" className="link-button inline left" onClick={() => { setDefaultMethod(m.id); nav.toast(`${m.title} is now your default`, "success"); }}>Set as default</button>}</div>{m.isDefault && <StatusChip tone="success">Default</StatusChip>}<button data-interactive="true" className="icon-plain" aria-label={`Remove ${m.title}`} onClick={() => setDel(m.id)}><Icon name="trash" size={17}/></button></div>)}</div>}
    <Button onClick={() => nav.open("H3")}><Icon name="plus" size={18}/>Add card or UPI</Button>
    {target && <Dialog title="Remove payment method?" text={`${target.title} will be removed from your account.`} confirm="Remove" tone="danger" onCancel={() => setDel(null)} onConfirm={() => { removeMethod(target.id); setDel(null); nav.toast("Payment method removed", "success"); }}/>}
  </KPage>;
}

const luhnLen = (v: string) => v.replace(/\D/g, "").length;
/** H3: add card or UPI. */
export function H3_AddCardUpi() {
  const nav = useNav();
  const { addMethod, profile } = useStore();
  const [tab, setTab] = useState<"card" | "upi">("card");
  const [num, setNum] = useState(""); const [holder, setHolder] = useState(profile.name); const [exp, setExp] = useState(""); const [cvv, setCvv] = useState(""); const [upi, setUpi] = useState("");
  const [t, setT] = useState<Record<string, boolean>>({}); const [busy, setBusy] = useState(false);
  useLeaveGuard(!busy && (!!num || !!exp || !!cvv || !!upi));
  const blur = (k: string) => setT((x) => ({ ...x, [k]: true }));
  const [mm, yy] = exp.split("/").map((v) => Number(v));
  const now = new Date();
  const e = {
    num: luhnLen(num) !== 16 ? "Enter the 16-digit card number." : "",
    holder: holder.trim().length < 2 ? "Enter the name on the card." : "",
    exp: !/^\d{2}\/\d{2}$/.test(exp) || mm < 1 || mm > 12 ? "Use MM/YY." : (2000 + yy) * 12 + mm < now.getFullYear() * 12 + now.getMonth() + 1 ? "This card has expired." : "",
    cvv: !/^\d{3}$/.test(cvv) ? "Enter the 3-digit CVV." : "",
    upi: !/^[\w.-]{2,}@[a-zA-Z]{2,}$/.test(upi) ? "Enter a valid UPI ID, like name@bank." : "",
  };
  const fmtNum = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const fmtExp = (v: string) => { const d = v.replace(/\D/g, "").slice(0, 4); return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; };
  const save = () => {
    setT({ num: true, holder: true, exp: true, cvv: true, upi: true });
    if (tab === "card" ? e.num || e.holder || e.exp || e.cvv : e.upi) { nav.toast("Fix the highlighted fields", "error"); return; }
    setBusy(true);
    setTimeout(() => { addMethod(tab === "card" ? { type: "card", title: `${num.startsWith("4") ? "Visa" : num.startsWith("5") ? "Mastercard" : "Card"} ending in ${num.replace(/\D/g, "").slice(-4)}`, sub: `Card · Expires ${exp}` } : { type: "upi", title: upi, sub: "UPI" }); setBusy(false); nav.toast("Payment method added", "success"); nav.close(); }, 900);
  };
  return <KPage title="Add card or UPI" onBack={nav.close}>
    <div className="segment light"><button data-interactive="true" className={tab === "card" ? "selected" : ""} onClick={() => setTab("card")}>Card</button><button data-interactive="true" className={tab === "upi" ? "selected" : ""} onClick={() => setTab("upi")}>UPI</button></div>
    <div className="k-card form">{tab === "card" ? <>
      <Field label="Card number" inputMode="numeric" value={num} onChange={(v) => setNum(fmtNum(v))} onBlur={() => blur("num")} error={t.num ? e.num : ""} placeholder="1234 5678 9012 3456"/>
      <Field label="Name on card" value={holder} onChange={setHolder} onBlur={() => blur("holder")} error={t.holder ? e.holder : ""}/>
      <div className="two"><Field label="Expiry" inputMode="numeric" value={exp} onChange={(v) => setExp(fmtExp(v))} onBlur={() => blur("exp")} error={t.exp ? e.exp : ""} placeholder="MM/YY"/><Field label="CVV" type="password" inputMode="numeric" maxLength={3} value={cvv} onChange={(v) => setCvv(v.replace(/\D/g, ""))} onBlur={() => blur("cvv")} error={t.cvv ? e.cvv : ""} placeholder="•••"/></div></> :
      <Field label="UPI ID" value={upi} onChange={setUpi} onBlur={() => blur("upi")} error={t.upi ? e.upi : ""} placeholder="name@bank"/>}</div>
    <p className="note"><Icon name="lock" size={13}/>Your details are encrypted and stored securely.</p>
    <Button onClick={save} loading={busy}>{tab === "card" ? "Save card" : "Save UPI ID"}</Button>
  </KPage>;
}

const RESTAURANTS = [{ name: "Royal Biryani House", sub: "Mughlai · North Indian · 30 min", open: true }, { name: "Spice Garden", sub: "North Indian · Opens 6 PM", open: false }];
const STORES = [{ name: "Farm fresh tomatoes", sub: "500 g · ₹32" }, { name: "Organic broccoli", sub: "1 piece · ₹69" }];
/** D12: favorites with Restaurants / Stores / Places tabs. */
export function D12_Favorites() {
  const nav = useNav();
  const { favorites, toggleFavorite, places, restaurants, groceryProducts } = useStore();
  const [tab, setTab] = useState<"Restaurants" | "Stores" | "Places">("Restaurants");
  const restaurantList = restaurants.length > 0
    ? restaurants.map((r) => ({ name: r.name, sub: `${r.cuisines?.join(" · ") || "Restaurant"} · ${r.eta}`, open: r.isOnline }))
    : RESTAURANTS;
  const storeList = groceryProducts.length > 0
    ? groceryProducts.map((p) => ({ name: p.name, sub: `${p.unit} · ₹${p.price}` }))
    : STORES;
  const favR = restaurantList.filter((r) => favorites.includes(r.name));
  const favS = storeList.filter((s) => favorites.includes(s.name));
  const favP = places.filter((p) => favorites.includes(`place:${p.label}`));
  const unfav = (key: string) => { toggleFavorite(key); nav.toast("Removed from favorites", "info"); };
  const card = (key: string, icon: string, name: string, sub: string, onOpen: () => void) => <div key={key} className="fav-card"><button data-interactive="true" className="fav-main" onClick={onOpen}><span className="row-icon"><Icon name={icon} size={18}/></span><div><strong>{name}</strong><small>{sub}</small></div></button><button data-interactive="true" className="heart-on" aria-label={`Remove ${name} from favorites`} onClick={() => unfav(key)}><Icon name="heart" size={18}/></button></div>;
  const total = favR.length + favS.length + favP.length;
  return <KPage title="Favorites" onBack={nav.close}>
    <div className="chip-row tight">{(["Restaurants", "Stores", "Places"] as const).map((t) => <Chip key={t} on={tab === t} onClick={() => setTab(t)}>{t} {t === "Restaurants" ? favR.length : t === "Stores" ? favS.length : favP.length}</Chip>)}</div>
    {tab === "Restaurants" && (favR.length ? <div className="fav-list">{favR.map((r) => card(r.name, "food", r.name, r.sub, () => (r.open ? nav.startFlow("food") : nav.open("D13", { name: r.name }))))}</div> : total === 0 ? <I7_NoFavorites onBrowse={() => nav.browse("food")}/> : <EmptyState icon="food" title="No favorite restaurants" text="Tap the heart on a restaurant to save it." cta="Browse restaurants" onCta={() => nav.browse("food")}/>)}
    {tab === "Stores" && (favS.length ? <div className="fav-list">{favS.map((s) => card(s.name, "bag", s.name, s.sub, () => nav.startFlow("grocery")))}</div> : <EmptyState service="grocery" icon="bag" title="No favorite products" text="Tap the heart on a product to save it." cta="Start shopping" onCta={() => nav.browse("grocery")}/>)}
    {tab === "Places" && (favP.length ? <div className="fav-list">{favP.map((p) => card(`place:${p.label}`, p.icon, p.label, p.address, () => { nav.toast(`${p.label} selected as delivery location`, "success"); }))}</div> : <EmptyState icon="pin" title="No favorite places" text="Add an address to favorites from Saved addresses." cta="Open saved addresses" onCta={() => nav.open("K3")}/>)}
  </KPage>;
}

/** C13: offers list with filter chips and copy/apply actions. */
export function C13_Offers() {
  const nav = useNav();
  const { coupon, setCoupon, referrals, activeOffers } = useStore();
  const [f, setF] = useState("All");
  const liveOffers: Offer[] = activeOffers.length > 0
    ? activeOffers.map((o) => ({ code: o.code, title: o.title, sub: o.sub, service: o.service }))
    : OFFERS;
  const all: Offer[] = [...rewardOffers(referrals), ...liveOffers];
  const list = f === "Expiring" ? [] : all.filter((o) => f === "All" || o.service === f);
  const copy = (c: string) => { navigator.clipboard?.writeText(c).catch(() => undefined); nav.toast(`${c} copied`, "success"); };
  return <KPage title="Offers" onBack={nav.close}>
    <div className="chip-row tight scroll">{["All", "Rewards", "Food", "Rides", "Grocery", "Courier", "Expiring"].map((c) => <Chip key={c} on={f === c} onClick={() => setF(c)}>{c}</Chip>)}</div>
    {list.length === 0 ? <I8_NoOffers onBrowse={() => setF("All")}/> : <div className="offer-list">{list.map((o) => <article key={o.code} className="offer-card"><div><StatusChip tone="info">{o.service}</StatusChip><h3>{o.title}</h3><p>{o.sub}</p><button data-interactive="true" className="code-tag" onClick={() => copy(o.code)}>{o.code} · Copy</button></div>
      <button data-interactive="true" className={`apply ${coupon === o.code ? "on" : ""}`} onClick={() => { setCoupon(coupon === o.code ? null : o.code); nav.toast(coupon === o.code ? "Coupon removed" : `${o.code} applied`, "success"); }}>{coupon === o.code ? "Applied" : "Apply"}</button></article>)}</div>}
  </KPage>;
}

const FAQ: Record<string, [string, string][]> = {
  Orders: [["Where is my order?", "Open Orders and tap your active order to see live tracking and your partner's details."], ["Can I cancel an order?", "You can cancel before the restaurant or store accepts it. After that, a fee may apply."]],
  Rides: [["My driver is late", "Check the live map for your driver's position. If they are over 10 minutes late, cancel for free."], ["I left something in a cab", "Contact support and we will connect you with the driver."]],
  Payments: [["My payment failed", "No money is deducted for a failed payment. Any held amount returns within 3 to 5 working days."], ["When will I get my refund?", "Refunds go back to your original payment method in 5 to 7 working days. Track it under Orders."]],
  Account: [["How do I change my number?", "Go to Account > Edit profile > Change next to your phone number."], ["How do I delete my account?", "Go to Account and tap Delete account at the bottom."]],
};
/** L1: help & support home. Search, categories, FAQs, order shortcuts, always-visible contact support. */
export function L1_HelpHome() {
  const nav = useNav();
  const { orders, profile } = useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [open, setOpen] = useState<string | null>(null);
  const [contact, setContact] = useState(false);
  const all = Object.entries(FAQ).flatMap(([c, items]) => items.map(([a, b]) => ({ c, q: a, a: b })));
  const list = all.filter((x) => (cat === "All" || x.c === cat) && `${x.q} ${x.a}`.toLowerCase().includes(q.trim().toLowerCase()));
  const active = orders.filter((o) => o.state === "active");
  return <KPage title="Help & Support" onBack={nav.close}>
    <label className="loc-search"><Icon name="search" size={18}/><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for help" aria-label="Search help"/></label>
    <div className="chip-row tight scroll">{["All", ...Object.keys(FAQ)].map((c) => <Chip key={c} on={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}</div>
    {active.length > 0 && !q && <><h3 className="k-h first">Help with an order</h3><div className="k-card flush">{active.slice(0, 2).map((o) => <Row key={o.id} icon="list" title={o.title} sub={o.status} onClick={() => { setCat("Orders"); setOpen("Where is my order?"); nav.toast(`Showing help for ${o.title}`, "info"); }}/>)}</div></>}
    <h3 className="k-h">{q ? "Results" : "Frequently asked"}</h3>
    {list.length === 0 ? <EmptyState icon="search" title="No answers found" text="Try different words or contact our team." cta="Contact support" onCta={() => setContact(true)}/> : <div className="k-card flush">{list.map((x) => <div key={x.q} className="faq"><button data-interactive="true" aria-expanded={open === x.q} onClick={() => setOpen(open === x.q ? null : x.q)}><strong>{x.q}</strong><span className={open === x.q ? "rot" : ""}><Icon name="arrow" size={16}/></span></button>{open === x.q && <p>{x.a}</p>}</div>)}</div>}
    <GhostButton onClick={() => setContact(true)}>Contact support</GhostButton>
    {contact && <Sheet title="Contact support" onClose={() => setContact(false)}>
      <Row icon="list" title="Chat with us" sub="Replies in about 2 minutes" onClick={() => { setContact(false); nav.open("SUPPORT_CHAT"); }}/>
      <Row icon="phone" title="Call us" sub="1800 123 4567 · 24/7" onClick={() => { setContact(false); nav.toast("Calling RoadRider support…", "info"); }}/>
      <Row icon="mail" title="Email us" sub={`Reply to ${profile.email}`} onClick={() => { setContact(false); nav.toast("Email draft opened", "info"); }}/>
    </Sheet>}
  </KPage>;
}

/** C15: apply a coupon code or pick one of the available offers for the current order. */
export function C15_ApplyCoupon({ service }: { service: Service }) {
  const nav = useNav();
  const { coupon, setCoupon, referrals, qty, rideType, pkg, activeOffers } = useStore();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const items = unitFor(service, rideType, pkg) * Math.max(qty[service], 1);
  const apply = (raw: string, delay = 600) => {
    const r = couponInfo(raw, service, items, referrals);
    if (!r.ok) { setError(r.error); return; }
    setError(""); setBusy(true);
    setTimeout(() => { setBusy(false); setCoupon(r.code); nav.toast(`${r.code} applied. ${r.note}`, "success"); nav.close(); }, delay);
  };
  const liveOffers: Offer[] = activeOffers.length > 0
    ? activeOffers.map((o) => ({ code: o.code, title: o.title, sub: o.sub, service: o.service }))
    : OFFERS;
  const usable = [...rewardOffers(referrals), ...liveOffers].filter((o) => couponInfo(o.code, service, items, referrals).ok);
  return <KPage title="Apply coupon" onBack={nav.close}>
    <Field label="Coupon code" value={code} onChange={(v) => { setCode(v.toUpperCase()); setError(""); }} error={error} placeholder="Enter code"/>
    <Button loading={busy} disabled={!code.trim()} onClick={() => apply(code)}>Apply</Button>
    {coupon && <GhostButton onClick={() => { setCoupon(null); nav.toast("Coupon removed", "info"); nav.close(); }}>Remove {coupon}</GhostButton>}
    <h3 className="k-h">Available for this order</h3>
    {usable.length === 0 ? <p className="k-note">No coupons are available for this order yet.</p> : <div className="offer-list">{usable.map((o) => <article key={o.code} className="offer-card"><div><StatusChip tone="info">{o.service}</StatusChip><h3>{o.title}</h3><p>{o.sub}</p><span className="code-tag static">{o.code}</span></div>
      <button data-interactive="true" className={`apply ${coupon === o.code ? "on" : ""}`} onClick={() => apply(o.code, 0)}>{coupon === o.code ? "Applied" : "Apply"}</button></article>)}</div>}
  </KPage>;
}

import { useRef, useState } from "react";
import { Button, Icon } from "../ui";
import { useLeaveGuard, useNav } from "../nav";
import { LANGUAGES, REFERRAL_CODE, useStore, type NotifKey } from "../store";
import { EmptyState } from "../states";
import { AvatarFace, Chip, Dialog, Field, KPage, Row, Sheet, StatusChip, Toggle } from "../kit";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];

/** K2: edit profile. Save stays disabled until something changes. */
export function K2_EditProfile() {
  const nav = useNav();
  const { profile, updateProfile, perms } = useStore();
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [dob, setDob] = useState(profile.dob);
  const [gender, setGender] = useState(profile.gender);
  const [avatar, setAvatar] = useState<string | null>(profile.avatar);
  const [touched, setTouched] = useState<{ name?: boolean; email?: boolean }>({});
  const [sheet, setSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const errors = { name: name.trim().length < 2 ? "Enter your full name." : "", email: email && !EMAIL.test(email) ? "Enter a valid email address." : "" };
  const dirty = name !== profile.name || email !== profile.email || dob !== profile.dob || gender !== profile.gender || avatar !== profile.avatar;
  useLeaveGuard(dirty && !saving);
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) { setAvatar(URL.createObjectURL(f)); setSheet(false); nav.toast("Photo selected. Save to apply.", "info"); } e.target.value = ""; };
  const save = async () => {
    setTouched({ name: true, email: true });
    if (errors.name || errors.email) { nav.toast("Fix the highlighted fields", "error"); return; }
    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), email, dob, gender, avatar });
      nav.toast("Profile updated", "success");
      nav.close();
    } catch {
      nav.toast("Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  };
  return <KPage title="Edit profile" onBack={nav.close}>
    <div className="k-avatar"><div className="avatar large xl">{avatar ? <img className="avatar-photo" src={avatar} alt=""/> : <AvatarPreview name={name}/>}</div><button data-interactive="true" className="link-button" onClick={() => setSheet(true)}>Change photo</button></div>
    <div className="k-card form">
      <Field label="Full name" value={name} onChange={setName} onBlur={() => setTouched((t) => ({ ...t, name: true }))} error={touched.name ? errors.name : ""} placeholder="Your name"/>
      <Field label="Email" type="email" inputMode="email" value={email} onChange={setEmail} onBlur={() => setTouched((t) => ({ ...t, email: true }))} error={touched.email ? errors.email : ""} placeholder="you@example.com"/>
      <Field label="Phone number" value={`+91 ${profile.phone}`} readOnly right={<button data-interactive="true" type="button" className="link-button inline" onClick={(e) => { e.preventDefault(); nav.open("K12"); }}>Change</button>}/>
      <Field label="Date of birth" type="date" value={dob} onChange={setDob} optional/>
      <div className="field"><span className="field-label">Gender<em>Optional</em></span><div className="chip-row tight">{GENDERS.map((g) => <Chip key={g} on={gender === g} onClick={() => setGender(gender === g ? "" : g)}>{g}</Chip>)}</div></div>
    </div>
    <Button onClick={save} disabled={!dirty} loading={saving}>Save changes</Button>
    {sheet && <Sheet title="Change photo" onClose={() => setSheet(false)}>
      <input ref={camera} hidden type="file" accept="image/*" capture="user" onChange={pick}/>
      <input ref={gallery} hidden type="file" accept="image/*" onChange={pick}/>
      <Row icon="user" title="Take photo" sub={perms.camera ? "Use your camera" : "Camera access is off"} onClick={() => { if (!perms.camera) { setSheet(false); nav.toast("Camera access is off. Turn it on in Privacy & permissions.", "error"); return; } camera.current?.click(); }}/>
      <Row icon="download" title="Choose from gallery" onClick={() => gallery.current?.click()}/>
      <Row icon="trash" title="Remove photo" tone="danger" onClick={() => { setAvatar(null); setSheet(false); nav.toast("Photo removed. Save to apply.", "info"); }}/>
    </Sheet>}
  </KPage>;
}
function AvatarPreview({ name }: { name: string }) {
  const t = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  return <>{t || "RR"}</>;
}

/** K3: saved addresses. */
export function K3_SavedAddresses() {
  const nav = useNav();
  const { places, removePlace, setDefaultPlace, favorites, toggleFavorite } = useStore();
  const [menu, setMenu] = useState<number | null>(null);
  const [del, setDel] = useState<number | null>(null);
  const target = places.find((p) => p.id === del);
  return <KPage title="Saved addresses" onBack={nav.close}>
    {places.length === 0 ? <EmptyState id="I5_NoSavedAddresses" icon="pin" title="No saved addresses yet" text="Save Home and Work for one-tap checkout." cta="Add address" onCta={() => nav.open("C7")}/> : <>
      <div className="addr-list">{places.map((p) => <article key={p.id} className="addr-card">
        <span className="row-icon"><Icon name={p.icon} size={18}/></span>
        <div><div className="addr-head"><span className="label-chip">{p.label}</span>{p.isDefault && <StatusChip tone="success">Default</StatusChip>}</div><p>{[p.house, p.street].filter(Boolean).join(", ")}</p>{p.landmark && <small>Landmark: {p.landmark}</small>}</div>
        <button data-interactive="true" className="menu-btn" aria-label={`Options for ${p.label}`} aria-expanded={menu === p.id} onClick={() => setMenu(menu === p.id ? null : p.id)}><span>⋮</span></button>
        {menu === p.id && <><div className="menu-scrim" onClick={() => setMenu(null)}/><div className="pop-menu" role="menu">
          <button data-interactive="true" role="menuitem" onClick={() => { setMenu(null); nav.open("C7", { id: p.id }); }}>Edit</button>
          {!p.isDefault && <button data-interactive="true" role="menuitem" onClick={() => { setMenu(null); setDefaultPlace(p.id); nav.toast(`${p.label} is now your default`, "success"); }}>Set as default</button>}
          <button data-interactive="true" role="menuitem" onClick={() => { setMenu(null); toggleFavorite(`place:${p.label}`); nav.toast(favorites.includes(`place:${p.label}`) ? "Removed from favorites" : "Added to favorites", "success"); }}>{favorites.includes(`place:${p.label}`) ? "Remove from favorites" : "Add to favorites"}</button>
          <button data-interactive="true" role="menuitem" className="danger" onClick={() => { setMenu(null); setDel(p.id); }}>Delete</button>
        </div></>}
      </article>)}</div>
      <Button onClick={() => nav.open("C7")}><Icon name="plus" size={18}/>Add new address</Button>
    </>}
    {target && <Dialog title="Delete address?" text={`${target.label} (${target.street}) will be removed from your saved addresses.`} confirm="Delete" tone="danger" onCancel={() => setDel(null)} onConfirm={() => { removePlace(target.id); setDel(null); nav.toast("Address deleted", "success"); }}/>}
  </KPage>;
}

const STEPS = [["share", "Share your code"], ["user", "Friend signs up"], ["gift", "You both get a ₹100 coupon"]];
/** K4: refer & earn. */
export function K4_ReferAndEarn() {
  const nav = useNav();
  const { referrals } = useStore();
  const [share, setShare] = useState(false);
  const joined = referrals.filter((r) => r.status !== "Pending").length;
  const earned = referrals.filter((r) => r.status === "Coupon earned").length;
  const copy = (text: string, msg = "Copied") => { navigator.clipboard?.writeText(text).catch(() => undefined); nav.toast(msg, "success"); };
  const link = `https://roadrider.app/invite/${REFERRAL_CODE}`;
  const tone = { "Coupon earned": "success", Joined: "info", Pending: "warning" } as const;
  return <KPage title="Refer & earn" onBack={nav.close}>
    <section className="refer-hero"><span className="eyebrow-light">INVITE FRIENDS</span><h1>Give a ₹100 coupon,<br/>get a ₹100 coupon</h1><p>Your friend gets a ₹100 coupon for their first order. You get one when it is delivered.</p>
      <button data-interactive="true" className="code-pill" aria-label={`Copy referral code ${REFERRAL_CODE}`} onClick={() => copy(REFERRAL_CODE)}><span>{REFERRAL_CODE}</span><Icon name="receipt" size={16}/>Copy</button></section>
    <Button onClick={() => setShare(true)}><Icon name="share" size={18}/>Share invite</Button>
    <h3 className="k-h">How it works</h3>
    <div className="steps3">{STEPS.map(([icon, label], i) => <div key={label}><span><Icon name={icon} size={18}/></span><b>{i + 1}</b><small>{label}</small></div>)}</div>
    <div className="stats-card"><div><small>FRIENDS JOINED</small><strong>{joined}</strong></div><div><small>COUPONS EARNED</small><strong>{earned}</strong></div></div>
    <h3 className="k-h">Referral history</h3>
    <div className="k-card flush">{referrals.map((r) => <div key={r.id} className="k-row static"><span className="row-icon"><Icon name="user" size={18}/></span><div><strong>{r.name}</strong><small>{r.date}{r.status === "Coupon earned" ? " · ₹100 coupon" : ""}</small></div><StatusChip tone={tone[r.status]}>{r.status}</StatusChip></div>)}</div>
    <button data-interactive="true" className="link-button center" onClick={() => nav.open("B10", { doc: "referral" })}>Terms apply</button>
    {share && <Sheet title="Share invite" onClose={() => setShare(false)}>
      <Row icon="phone" title="WhatsApp" sub="Send to your contacts" onClick={() => { setShare(false); nav.toast("Opening WhatsApp with your invite…", "info"); }}/>
      <Row icon="mail" title="Messages" sub="Send as SMS" onClick={() => { setShare(false); nav.toast("Opening Messages with your invite…", "info"); }}/>
      <Row icon="receipt" title="Copy link" sub={link} onClick={() => { setShare(false); copy(link, "Link copied"); }}/>
    </Sheet>}
  </KPage>;
}

const GROUPS: [NotifKey, string, string, boolean][] = [
  ["order", "Order updates", "Status, delivery and refund alerts", true], ["ride", "Ride updates", "Driver arrival and trip alerts", false],
  ["offers", "Offers & promotions", "Deals picked for you", false], ["payments", "Payments & refunds", "Payment receipts and refund updates", false],
  ["account", "Account & security", "Logins and profile changes", true],
];
/** K5: notification settings with master and per-channel toggles. */
export function K5_NotificationSettings() {
  const nav = useNav();
  const { notif, setNotif } = useStore();
  return <KPage title="Notifications" onBack={nav.close}>
    {GROUPS.map(([key, title, sub, required]) => {
      const g = notif[key]; const any = g.push || g.sms || g.email;
      return <section key={key} className="k-card notif-group">
        <div className="notif-head"><div><strong>{title}</strong><small>{sub}</small></div><Toggle label={`${title} master`} on={any} disabled={required} onChange={(v) => setNotif(key, { push: v, sms: v, email: v })}/></div>
        {required && <p className="note"><Icon name="info" size={13}/>Required for your orders and account. Push stays on.</p>}
        {(["push", "sms", "email"] as const).map((c) => <div key={c} className="notif-sub"><span>{c === "push" ? "Push" : c === "sms" ? "SMS" : "Email"}</span><Toggle label={`${title} ${c}`} on={g[c]} disabled={required && c === "push"} onChange={(v) => { setNotif(key, { [c]: v }); }}/></div>)}
      </section>;
    })}
  </KPage>;
}

/** K6: language picker. */
export function K6_Language() {
  const nav = useNav();
  const { language, setLanguage } = useStore();
  const [sel, setSel] = useState(language);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const list = LANGUAGES.filter(([n, e]) => `${n} ${e}`.toLowerCase().includes(q.trim().toLowerCase()));
  const apply = () => { setBusy(true); setTimeout(() => { setLanguage(sel); setBusy(false); nav.toast("Language updated", "success"); nav.close(); }, 600); };
  return <KPage title="Language" onBack={nav.close}>
    <label className="loc-search"><Icon name="search" size={18}/><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search language" aria-label="Search language"/></label>
    <div className="k-card flush" role="radiogroup" aria-label="Language">{list.map(([native, english]) => <button data-interactive="true" key={native} role="radio" aria-checked={sel === native} className={`k-row lang ${sel === native ? "sel" : ""}`} onClick={() => setSel(native)}>
      <div><strong className="native">{native}</strong><small>{english}</small></div>{sel === native ? <span className="tick"><Icon name="check" size={16}/></span> : <i className="radio"/>}</button>)}
      {list.length === 0 && <p className="mini-empty">No language matches “{q}”.</p>}</div>
    <Button onClick={apply} loading={busy} disabled={sel === language}>Apply</Button>
  </KPage>;
}

/** K9: logout confirmation sheet. */
export function K9_LogoutConfirm({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const [busy, setBusy] = useState(false);
  return <Sheet title="Log out of RoadRider?" onClose={onCancel}>
    <p className="sheet-text">You'll need to sign in again with your phone number to place orders or book rides.</p>
    <div className="dialog-actions"><button data-interactive="true" className="ghost-button" onClick={onCancel}>Cancel</button><Button tone="danger" loading={busy} onClick={() => { setBusy(true); setTimeout(onConfirm, 600); }}>Log out</Button></div>
  </Sheet>;
}

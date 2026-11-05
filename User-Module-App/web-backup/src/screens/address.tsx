import { useRef, useState } from "react";
import { Button, Icon, MapArt } from "../ui";
import { useLeaveGuard, useNav } from "../nav";
import { SPOTS, spotLabel } from "../places";
import { useStore, type PlaceKind } from "../store";
import { Chip, Field, Toggle } from "../kit";

const SERVED = SPOTS.filter((s) => s.served);
const areaAt = (x: number) => SERVED[Math.min(SERVED.length - 1, Math.max(0, Math.floor(x * SERVED.length)))];
const PHONE_OK = (v: string) => v.replace(/\D/g, "").length === 10 && /^[6-9]/.test(v.replace(/\D/g, ""));

/** C6 + C7: map pin picker with draggable pin, search, and the address form sheet. */
export function C7_AddressForm({ id, onSaved }: { id?: number; onSaved?: () => void }) {
  const nav = useNav();
  const { places, savePlace, gps, setPerm, profile } = useStore();
  const existing = places.find((p) => p.id === id);
  const [pin, setPin] = useState({ x: 0.5, y: 0.5 });
  const [area, setArea] = useState(areaAt(0.5));
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<PlaceKind>(existing?.kind ?? "Home");
  const [custom, setCustom] = useState(existing && existing.kind === "Other" ? existing.label : "");
  const [house, setHouse] = useState(existing?.house ?? "");
  const [street, setStreet] = useState(existing?.street ?? `${areaAt(0.5).name}, ${areaAt(0.5).area}`);
  const [streetEdited, setStreetEdited] = useState(!!existing);
  const [landmark, setLandmark] = useState(existing?.landmark ?? "");
  const [receiver, setReceiver] = useState(existing?.receiver ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [makeDefault, setMakeDefault] = useState(existing?.isDefault ?? false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  useLeaveGuard(!saving && (!!house || !!custom || !!landmark || streetEdited && !existing || !!receiver || !!phone));
  const mapRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const move = (e: React.PointerEvent) => {
    if (!dragging.current || !mapRef.current) return;
    const r = mapRef.current.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y = Math.min(1, Math.max(0.18, (e.clientY - r.top) / r.height));
    setPin({ x, y }); const a = areaAt(x); setArea(a); setStreet((s) => (streetEdited ? s : `${a.name}, ${a.area}`));
  };
  const matches = query.trim() ? SPOTS.filter((s) => spotLabel(s).toLowerCase().includes(query.trim().toLowerCase())) : [];
  const pickSpot = (s: (typeof SPOTS)[number]) => {
    setQuery("");
    if (!s.served) { nav.toast(`We don't deliver to ${s.name} yet`, "error"); return; }
    const i = SERVED.findIndex((x) => x.name === s.name); setArea(s); setPin({ x: (i + 0.5) / SERVED.length, y: 0.5 }); if (!streetEdited) setStreet(`${s.name}, ${s.area}`);
  };
  const locate = () => {
    if (gps === false) setPerm("location", true);
    setLocating(true);
    setTimeout(() => { setLocating(false); setPin({ x: 0.1, y: 0.55 }); const a = areaAt(0.1); setArea(a); if (!streetEdited) setStreet(`${a.name}, ${a.area}`); nav.toast("Using your current location", "success"); }, 800);
  };
  const label = kind === "Other" ? custom.trim() : kind;
  const err = {
    house: house.trim() ? "" : "Enter your house or flat number.",
    street: street.trim() ? "" : "Enter a building or street name.",
    custom: kind === "Other" && custom.trim().length < 2 ? "Give this address a name." : "",
    phone: phone && !PHONE_OK(phone) ? "Enter a valid 10-digit number." : "",
  };
  const blur = (k: string) => setTouched((t) => ({ ...t, [k]: true }));
  const save = async () => {
    setTouched({ house: true, street: true, custom: true, phone: true });
    if (err.house || err.street || err.custom || err.phone) { nav.toast("Fix the highlighted fields", "error"); return; }
    setSaving(true);
    try {
      await savePlace({ id, label, kind, address: `${house.trim()}, ${street.trim()}`, house: house.trim(), street: street.trim(), landmark: landmark.trim(), receiver: receiver.trim() || profile.name, phone: phone || profile.phone, isDefault: makeDefault });
      nav.toast(id ? "Address updated" : "Address saved", "success");
      nav.close();
      onSaved?.();
    } catch {
      nav.toast("Failed to save address", "error");
    } finally {
      setSaving(false);
    }
  };
  return <div className="addr-page" data-screen="C7_AddressForm">
    <div className="pin-map" ref={mapRef} onPointerMove={move} onPointerUp={() => (dragging.current = false)} onPointerLeave={() => (dragging.current = false)}>
      <MapArt plain/>
      <button data-interactive="true" className="map-back" aria-label="Go back" onClick={nav.close}><Icon name="back"/></button>
      <div className="map-search"><label className="loc-search"><Icon name="search" size={18}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search area or landmark" aria-label="Search location on map"/></label>
        {matches.length > 0 && <div className="map-results">{matches.map((s) => <button data-interactive="true" key={s.name} onClick={() => pickSpot(s)}><Icon name="pin" size={16}/><span>{spotLabel(s)}{s.served ? "" : " · Not available"}</span></button>)}</div>}</div>
      <button data-interactive="true" className="draggable-pin" aria-label="Drag to set location" style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }} onPointerDown={(e) => { dragging.current = true; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); }}><Icon name="pin" size={34}/></button>
      <button data-interactive="true" className="locate-btn" onClick={locate} disabled={locating}><Icon name="pin" size={15}/>{locating ? "Locating…" : "Use current location"}</button>
    </div>
    <section className="addr-sheet">
      <div className="drag"/><p className="eyebrow">{id ? "EDIT ADDRESS" : "NEW ADDRESS"}</p>
      <div className="pin-label"><Icon name="pin" size={16}/><strong>{area.name}, {area.area}</strong><small>Drag the pin to adjust</small></div>
      <Field label="House / flat no." value={house} onChange={setHouse} onBlur={() => blur("house")} error={touched.house ? err.house : ""} placeholder="e.g. 15, Flat 3B"/>
      <Field label="Building / street" value={street} onChange={(v) => { setStreet(v); setStreetEdited(true); }} onBlur={() => blur("street")} error={touched.street ? err.street : ""} placeholder="Building or street name"/>
      <Field label="Landmark" value={landmark} onChange={setLandmark} optional placeholder="Near…"/>
      <div className="field"><span className="field-label">Save as</span><div className="chip-row tight">{(["Home", "Work", "Other"] as PlaceKind[]).map((k) => <Chip key={k} on={kind === k} onClick={() => setKind(k)}>{k}</Chip>)}</div></div>
      {kind === "Other" && <Field label="Address name" value={custom} onChange={setCustom} onBlur={() => blur("custom")} error={touched.custom ? err.custom : ""} placeholder="e.g. Parents' house"/>}
      <Field label="Receiver name" value={receiver} onChange={setReceiver} optional placeholder={profile.name}/>
      <Field label="Receiver phone" prefix="+91" inputMode="tel" maxLength={11} value={phone} onChange={setPhone} onBlur={() => blur("phone")} error={touched.phone ? err.phone : ""} optional placeholder={profile.phone}/>
      <div className="k-row static pad0"><div><strong>Make this my default address</strong></div><Toggle label="Default address" on={makeDefault} onChange={setMakeDefault}/></div>
      <Button onClick={save} loading={saving}>Save address</Button>
    </section>
  </div>;
}

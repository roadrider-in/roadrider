import type { ReactNode } from "react";

export type Service = "food" | "rides" | "grocery" | "courier";

export const PHOTOS = {
  rider: "https://images.unsplash.com/photo-1768423083233-b3f696c9b703?auto=format&fit=crop&w=1080&q=85",
  food: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1080&q=85",
  food2: "https://images.unsplash.com/photo-1705174299330-939dd03cc864?auto=format&fit=crop&w=800&q=80",
  grocery: "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?auto=format&fit=crop&w=1080&q=85",
  produce: "https://images.unsplash.com/photo-1590779033100-9f60a05a013d?auto=format&fit=crop&w=800&q=80",
  ride: "https://images.unsplash.com/photo-1541702467897-41915a07d3a7?auto=format&fit=crop&w=1080&q=80",
};

export const serviceMeta = {
  food: { label: "Food", kicker: "GOOD FOOD · BRIGHTER DAYS", title: "Delicious food,\ndelivered fast.", photo: PHOTOS.food },
  rides: { label: "Rides", kicker: "YOUR CITY, YOUR WAY", title: "Where are you\ngoing today?", photo: PHOTOS.ride },
  grocery: { label: "Grocery", kicker: "FARM FRESH · EVERYDAY", title: "Fresh groceries\nat your doorstep.", photo: PHOTOS.grocery },
  courier: { label: "Courier", kicker: "FAST · SAFE · RELIABLE", title: "Send anything,\nanywhere.", photo: PHOTOS.rider },
};

export function Icon({ name, size = 22 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    filter: <><path d="M4 6h16M7 12h10M10 18h4"/></>,
    food: <><path d="M6 3v8M10 3v8M6 7h4M8 11v10M16 3v18M16 3c4 3 4 7 0 9"/></>,
    car: <><path d="m5 17-1-1v-5l2-5h12l2 5v5l-1 1"/><path d="M5 12h14M7 17v2M17 17v2"/><circle cx="7" cy="14" r="1"/><circle cx="17" cy="14" r="1"/></>,
    bag: <><path d="M5 8h14l-1 13H6L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></>,
    box: <><path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7M12 11v10"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    arrow: <path d="m9 18 6-6-6-6"/>,
    back: <><path d="m15 18-6-6 6-6"/></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.7-7.5a5.5 5.5 0 0 0 1.1-8.9Z"/>,
    star: <path d="m12 2 3 6 7 .9-5 4.8 1.3 6.8L12 17.3l-6.3 3.2L7 13.7 2 9l7-.9 3-6Z"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    phone: <><path d="M22 16.9v3a2 2 0 0 1-2.2 2 20 20 0 0 1-8.7-3.1 19.5 19.5 0 0 1-6-6A20 20 0 0 1 2 4.1 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.4 1.8.6 2.8.7a2 2 0 0 1 1.9 2.1Z"/></>,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>,
    home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10M9 21v-6h6v6"/></>,
    card: <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></>,
    list: <><path d="M9 6h12M9 12h12M9 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></>,
    cart: <><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M2 3h3l2.6 11.3a2 2 0 0 0 2 1.7h7.8a2 2 0 0 0 2-1.6L21 7H6"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    wifioff: <><path d="M2 8.8a15 15 0 0 1 4-2.6M22 8.8a15 15 0 0 0-9-3.7"/><path d="M5 12.9a10 10 0 0 1 5-2.7M19 12.9a10 10 0 0 0-2.1-1.6"/><path d="M8.5 16.4a5 5 0 0 1 7 0"/><path d="M12 20h.01M2 2l20 20"/></>,
    alert: <><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></>,
    refresh: <><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 12A9 9 0 0 1 18.5 5.8L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/></>,
    lock: <><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>,
    gift: <><rect x="3" y="8" width="18" height="4"/><path d="M12 8v13M19 12v9H5v-9M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/></>,
    trash: <path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 11v6M14 11v6"/>,
    download: <path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>,
    x: <path d="M18 6 6 18M6 6l12 12"/>,
    tool: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.1L3 17.7 6.3 21l6.3-6.3a4 4 0 0 0 5.1-5.4l-2.5 2.5-2.3-.6-.6-2.3 2.4-2.6Z"/>,
    mapoff: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 0 1 13.7-5.6"/><circle cx="12" cy="10" r="2.5"/><path d="M2 2l20 20"/></>,
    receipt: <><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3Z"/><path d="M9 8h6M9 12h6"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
    mic: <><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></>,
    speaker: <><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></>,
    bank: <path d="M3 10 12 4l9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18"/>,
    minus: <path d="M5 12h14"/>,
    share: <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></>,
    swap: <path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>,
  };
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function Logo({ light = false }: { light?: boolean }) {
  return <div className={`logo ${light ? "logo-light" : ""}`}><span>Road</span><b>Rider</b></div>;
}

export function Button({ children, onClick, secondary = false, disabled = false, tone, loading = false }: { children: ReactNode; onClick?: () => void; secondary?: boolean; disabled?: boolean; tone?: "danger"; loading?: boolean }) {
  return <button data-interactive="true" disabled={disabled || loading} aria-busy={loading || undefined} className={`primary-button ${secondary ? "secondary-button" : ""} ${tone === "danger" ? "danger-button" : ""}`} onClick={onClick}>{loading && <span className="btn-spinner" aria-hidden="true"/>}{children}</button>;
}

export function FlowHeader({ title, onBack, onHelp, noHelp = false }: { title: string; onBack: () => void; onHelp?: () => void; noHelp?: boolean }) {
  return <header className="flow-header"><button data-interactive="true" onClick={onBack} aria-label="Go back"><Icon name="back"/></button><h2>{title}</h2>{noHelp ? <span/> : <button data-interactive={onHelp ? "true" : undefined} onClick={onHelp} aria-label="Help">?</button>}</header>;
}

export function MapArt({ plain = false }: { plain?: boolean }) {
  return <div className="map-art">
    <svg viewBox="0 0 340 220" preserveAspectRatio="none">
      <path className="road" d="M-10 45C55 25 80 96 142 70S240 18 355 48M-5 170c70-40 97-6 151-30s90-77 205-55M75-5c5 50-27 102 5 230M255-5c-30 70 20 135-10 230"/>
      <path className="minor" d="M25-5v230M130-5c-10 80 15 135-5 230M310-5v230M-5 110h350M-5 200h350"/>
      {!plain && <path className="route" d="M65 175c30-30 48-18 70-52 20-31 37-16 62-38 25-21 42-13 73-44"/>}
    </svg>
    {!plain && <><span className="map-pin start"><i/></span><span className="map-pin end"><Icon name="pin" size={16}/></span>
    <div className="eta-bubble"><b>5 min</b><small>away</small></div></>}
  </div>;
}

export function LocationRows({ courier = false, pickup, drop, onPickup, onDrop }: { courier?: boolean; pickup: string; drop: string; onPickup: () => void; onDrop: () => void }) {
  return <div className="location-rows">
    <button data-interactive="true" onClick={onPickup}><span className="loc-dot green"/><div><small>{courier ? "PICKUP LOCATION" : "PICKUP"}</small><strong>{pickup}</strong></div><Icon name="arrow" size={17}/></button>
    <button data-interactive="true" onClick={onDrop}><span className="loc-dot orange"/><div><small>{courier ? "DELIVERY LOCATION" : "DESTINATION"}</small><strong>{drop || (courier ? "Add delivery address" : "Where to?")}</strong></div><Icon name="arrow" size={17}/></button>
  </div>;
}

export function UtilityHeader({ title, subtitle, onBell }: { title: string; subtitle: string; onBell?: () => void }) {
  return <header className="utility-header"><div><p>{subtitle}</p><h1>{title}</h1></div><button data-interactive="true" className="icon-button" aria-label="Notifications" onClick={onBell}><Icon name="bell" size={20}/><i/></button></header>;
}

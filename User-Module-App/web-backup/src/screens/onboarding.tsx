import { useEffect, useRef, useState } from "react";
import { Button, Icon, Logo, MapArt, PHOTOS } from "../ui";
import { SPOTS, spotLabel, getLiveServiceSpots, type Spot } from "../places";
import { useStore } from "../store";
import { sendOtp, verifyOtp } from "../services/auth.service";

const RESEND_AFTER = 30;
const EXPIRES_AFTER = 120;

/** B1 + A1: welcome screen with a real loading state before "Get started" unlocks. */
export function B1_Welcome({ onStart, onComplete }: { onStart: () => void; onComplete?: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (progress >= 100) {
      if (onComplete) {
        const timer = setTimeout(onComplete, 250);
        return () => clearTimeout(timer);
      }
      return;
    }
    const t = setTimeout(() => setProgress((p) => Math.min(100, p + 10)), 100);
    return () => clearTimeout(t);
  }, [progress, onComplete]);

  const ready = progress >= 100;
  return <main className="splash" style={{ backgroundImage: `url(${PHOTOS.rider})` }} data-screen="B1_Welcome">
    <div className="splash-shade"/>
    <section className="splash-content">
      <div><Logo light/><p className="tagline">MOVE · EAT · SHOP · DELIVER</p></div>
      <div className="splash-main">
        <p className="eyebrow">ONE APP. EVERYDAY POSSIBILITIES.</p>
        <h1>Everything <em>you need</em><br/>in one app.</h1>
        <p>From your morning commute to dinner at your door, RoadRider keeps life moving.</p>
        <div className="service-row">
          {[["food","Food"],["car","Rides"],["bag","Grocery"],["box","Courier"]].map(([icon,label]) =>
            <div key={label}><span><Icon name={icon}/></span><small>{label}</small></div>)}
        </div>
      </div>
      {ready ? <Button onClick={onStart || onComplete}>Get started <Icon name="arrow" size={20}/></Button>
        : <div className="splash-loader" role="progressbar" aria-valuenow={progress} data-screen="A1_SplashLoading"><i style={{ width: `${progress}%` }}/><small>Getting things ready…</small></div>}
      <p className="photo-credit">Photo by Cemrecan Yurtman on Unsplash</p>
    </section>
  </main>;
}

type Provider = "google" | "apple" | "email";

/** B3: mobile number entry with real SMS OTP dispatch. */
export function B3_PhoneEntry({ phone, setPhone, onBack, onNext, onSocial }: { phone: string; setPhone: (v: string) => void; onBack: () => void; onNext: () => void; onSocial: (p: Provider) => void }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const digits = phone.replace(/\D/g, "");

  const submit = async () => {
    if (digits.length !== 10 || !/^[6-9]/.test(digits)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await sendOtp(digits);
      if (res.success) {
        onNext();
      } else {
        setError(res.error || "Failed to send verification code. Please try again.");
      }
    } catch (err: any) {
      setError(err?.message || "Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return <main className="auth-page" data-screen="B3_PhoneEntry">
    <button className="auth-back" onClick={onBack} aria-label="Go back"><Icon name="back"/></button>
    <Logo/><p className="auth-tag">MOVE · EAT · SHOP · DELIVER</p>
    <div className="auth-illustration">
      <div className="illustration-phone"><Icon name="pin" size={30}/><i/><i/></div>
      <span className="illustration-road"/><span className="illustration-rider"><Icon name="box" size={24}/></span>
    </div>
    <section className="auth-copy"><p className="eyebrow">WELCOME TO ROADRIDER</p><h1>Let's get started</h1><p>Enter your mobile number to continue</p></section>
    <label className={`phone-input ${error ? "invalid" : ""}`}><span>+91</span><input value={phone} onChange={(e) => { setPhone(e.target.value); setError(""); }} onKeyDown={(e) => e.key === "Enter" && submit()} inputMode="tel" maxLength={11} aria-label="Mobile number" aria-invalid={!!error}/></label>
    {error && <p className="field-error" role="alert"><Icon name="alert" size={13}/>{error}</p>}
    <Button onClick={submit} loading={loading}>Send OTP <Icon name="arrow" size={19}/></Button>
    <div className="auth-divider"><span/>or continue with<span/></div>
    <div className="social-row">
      <button onClick={() => onSocial("google")}>G</button>
      <button onClick={() => onSocial("apple")}>Apple</button>
      <button onClick={() => onSocial("email")}><span>@</span> Email</button>
    </div>
    <p className="legal">By continuing, you agree to our <b>Terms of Service</b><br/>and <b>Privacy Policy</b>.</p>
  </main>;
}

/** B4 + B5: Real OTP verification with Supabase GoTrue & session establishment. */
export function B4_OtpVerify({ phone, onBack, onVerified }: { phone: string; onBack: () => void; onVerified: () => void }) {
  const [otp, setOtp] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState<"idle" | "wrong" | "short">("idle");
  const [attempts, setAttempts] = useState(3);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customError, setCustomError] = useState("");

  useEffect(() => { const t = setInterval(() => setElapsed((e) => e + 1), 1000); return () => clearInterval(t); }, []);
  const expired = elapsed >= EXPIRES_AFTER;
  const locked = attempts <= 0;
  const left = Math.max(0, RESEND_AFTER - elapsed);

  const press = (key: string) => {
    if (expired || locked || loading) return;
    setStatus("idle");
    setCustomError("");
    setOtp((v) => (key === "⌫" ? v.slice(0, -1) : /\d/.test(key) && v.length < 6 ? v + key : v));
  };
  const pressRef = useRef(press); pressRef.current = press;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Backspace") pressRef.current("⌫"); else if (/^\d$/.test(e.key)) pressRef.current(e.key); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);

  const verify = async () => {
    if (expired || locked || loading) return;
    if (otp.length < 6) { setStatus("short"); return; }

    setLoading(true);
    setCustomError("");
    try {
      const res = await verifyOtp(phone, otp);
      if (res.success) {
        onVerified();
      } else {
        setStatus("wrong");
        setAttempts((a) => a - 1);
        setCustomError(res.error || "Incorrect verification code.");
        setOtp("");
      }
    } catch (err: any) {
      setCustomError(err?.message || "Verification failed. Please check the code and try again.");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setElapsed(0);
    setOtp("");
    setStatus("idle");
    setCustomError("");
    setAttempts(3);
    setSent(true);
    await sendOtp(phone);
    setTimeout(() => setSent(false), 2500);
  };

  const message = customError
    ? customError
    : expired
    ? "This code has expired. Request a new one."
    : locked
    ? "Too many wrong attempts. Request a new code."
    : status === "wrong"
    ? `Incorrect code. ${attempts} ${attempts === 1 ? "attempt" : "attempts"} left.`
    : status === "short"
    ? "Enter all 6 digits."
    : "";

  return <main className="auth-page otp-page" data-screen="B4_OtpVerify">
    <button className="auth-back" onClick={onBack} aria-label="Go back"><Icon name="back"/></button>
    <Logo/><p className="auth-tag">MOVE · EAT · SHOP · DELIVER</p>
    <section className="auth-copy"><p className="eyebrow">ONE LAST STEP</p><h1>Verify your number</h1><p>We've sent a 6-digit code to <strong>+91 {phone}</strong></p></section>
    <div className={`otp-inputs ${message && !sent ? "invalid" : ""}`}>{Array.from({ length: 6 }, (_, i) => <span className={i === otp.length && !expired && !locked ? "focused" : ""} key={i}>{otp[i] || ""}</span>)}</div>
    {message && <p className="field-error center" role="alert"><Icon name="alert" size={13}/>{message}</p>}
    {sent && <p className="field-ok center"><Icon name="check" size={13}/>New code sent to +91 {phone}</p>}
    {left > 0 && !expired && !locked ? <p className="resend">Resend code in <strong>00:{String(left).padStart(2, "0")}</strong></p> : <button className="resend link" onClick={resend}>Resend code</button>}
    <Button onClick={verify} disabled={expired || locked} loading={loading}>Verify & continue <Icon name="arrow" size={19}/></Button>
    <div className="keypad">{["1","2","3","4","5","6","7","8","9","","0","⌫"].map((key, i) => <button disabled={key === ""} onClick={() => press(key)} key={i} aria-label={key === "⌫" ? "Delete" : key || undefined}>{key}</button>)}</div>
  </main>;
}

/** B7: location permission pre-prompt. */
export function B7_LocationPrompt({ onAllow, onManual }: { onAllow: () => void; onManual: () => void }) {
  return <main className="auth-page prompt-page" data-screen="B7_LocationPrompt">
    <Logo/>
    <div className="prompt-art"><span className="pulse a"/><span className="pulse b"/><div><Icon name="pin" size={44}/></div></div>
    <section className="auth-copy centered"><p className="eyebrow">NEARBY, ALWAYS</p><h1>Allow location access</h1><p>We use your location to show restaurants, stores, drivers, and couriers close to you. You can change this any time.</p></section>
    <Button onClick={onAllow}><Icon name="pin" size={18}/>Allow while using the app</Button>
    <button className="empty-link" onClick={onManual}>Enter location manually</button>
  </main>;
}

/** B8: set delivery location on first run. */
export function B8_SetLocation({ onConfirm, onUnavailable }: { onConfirm: () => void; onUnavailable: (place: string) => void }) {
  const { place, setPlace, setPickup, gps } = useStore();
  const [query, setQuery] = useState("");
  const [spots, setSpots] = useState<Spot[]>(SPOTS);
  const [chosen, setChosen] = useState<Spot>(SPOTS[0]);

  useEffect(() => {
    let active = true;
    getLiveServiceSpots().then((live) => {
      if (active && live.length > 0) {
        setSpots(live);
        setChosen(live[0]);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const list = spots.filter((s) => `${s.name} ${s.area}`.toLowerCase().includes(query.trim().toLowerCase()));
  const confirm = () => {
    if (!chosen.served) { onUnavailable(spotLabel(chosen)); return; }
    setPlace(spotLabel(chosen)); setPickup(spotLabel(chosen)); onConfirm();
  };
  return <main className="auth-page location-page" data-screen="B8_SetLocation">
    <div className="loc-map"><MapArt/></div>
    <section className="loc-sheet">
      <p className="eyebrow">DELIVERY LOCATION</p><h1>Where should we deliver?</h1>
      <label className="loc-search"><Icon name="search" size={18}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search area or street" aria-label="Search location"/></label>
      {gps && <p className="field-ok"><Icon name="check" size={13}/>Using your current location · {place}</p>}
      <div className="spot-list">
        {list.map((s) => <button key={s.name} className={chosen.name === s.name ? "selected" : ""} onClick={() => setChosen(s)}>
          <span><Icon name="pin" size={17}/></span><div><strong>{s.name}</strong><small>{s.area} · <span style={{ color: s.served ? "#15803D" : "#991B1B", fontWeight: 600 }}>{s.served ? "Available" : "Coming soon"}</span></small></div><i/>
        </button>)}
        {list.length === 0 && <p className="mini-empty">No areas match “{query}”. Try a nearby landmark.</p>}
      </div>
      <Button onClick={confirm} disabled={list.length === 0}>Confirm location</Button>
    </section>
  </main>;
}

const providerName: Record<Provider, string> = { google: "Google", apple: "Apple", email: "email" };
/** B9: social login handoff (Google / Apple / Email). */
export function B9_SocialHandoff({ provider, onDone, onCancel }: { provider: Provider; onDone: () => void; onCancel: () => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState<"form" | "connecting" | "done">(provider === "email" ? "form" : "connecting");
  const done = useRef(onDone); done.current = onDone;
  useEffect(() => {
    if (step === "connecting") { const t = setTimeout(() => setStep("done"), 1500); return () => clearTimeout(t); }
    if (step === "done") { const t = setTimeout(() => done.current(), 1400); return () => clearTimeout(t); }
  }, [step]);
  const account = provider === "email" ? email : provider === "google" ? "arjun.khanna@gmail.com" : "arjun.k@privaterelay.appleid.com";
  const submit = () => { if (!/^\S+@\S+\.\S+$/.test(email)) { setError("Enter a valid email address."); return; } setStep("connecting"); };
  return <main className="auth-page handoff-page" data-screen="B9_SocialHandoff">
    <button className="auth-back" onClick={onCancel} aria-label="Cancel"><Icon name="back"/></button>
    <Logo/>
    {step === "form" ? <>
      <section className="auth-copy"><p className="eyebrow">CONTINUE WITH EMAIL</p><h1>What's your email?</h1><p>We'll sign you in or create your RoadRider account.</p></section>
      <label className={`phone-input ${error ? "invalid" : ""}`}><span><Icon name="mail" size={16}/></span><input value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} onKeyDown={(e) => e.key === "Enter" && submit()} type="email" placeholder="you@example.com" aria-label="Email address"/></label>
      {error && <p className="field-error" role="alert"><Icon name="alert" size={13}/>{error}</p>}
      <Button onClick={submit}>Continue <Icon name="arrow" size={19}/></Button>
    </> : <div className="handoff-body">
      <div className={`handoff-orb ${step}`}>{step === "done" ? <Icon name="check" size={38}/> : <span>{provider === "google" ? "G" : provider === "apple" ? "" : "@"}</span>}</div>
      <h1>{step === "done" ? "You're signed in" : `Connecting to ${providerName[provider]}…`}</h1>
      <p>{step === "done" ? account : "You'll return to RoadRider in a moment."}</p>
      {step === "connecting" ? <button className="empty-link" onClick={onCancel}>Cancel</button> : <Button onClick={onDone}>Continue</Button>}
    </div>}
  </main>;
}

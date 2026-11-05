import { useEffect, useRef, useState } from "react";
import { Button, Icon } from "../ui";
import { GhostButton, StatePage } from "../states";

/** A8: full-screen processing loader for short waits. Calls onDone after `ms`. */
export function A8_ProcessingLoader({ message, sub, ms = 1600, onDone }: { message: string; sub?: string; ms?: number; onDone: () => void }) {
  const done = useRef(onDone); done.current = onDone;
  useEffect(() => { const t = setTimeout(() => done.current(), ms); return () => clearTimeout(t); }, [ms]);
  return <main className="state-page" data-screen="A8_ProcessingLoader">
    <div className="spinner-ring" role="status" aria-label="Processing"><Icon name="check" size={26}/></div>
    <h1>{message}</h1><p>{sub ?? "This only takes a moment."}</p>
  </main>;
}

/** A9: No internet. Retry genuinely re-checks connectivity. */
export function A9_NoInternet({ onRetry, onBack }: { onRetry: () => void; onBack: () => void }) {
  const [checking, setChecking] = useState(false);
  const [failed, setFailed] = useState(false);
  const retry = () => {
    setChecking(true); setFailed(false);
    setTimeout(() => { setChecking(false); if (navigator.onLine) onRetry(); else setFailed(true); }, 900);
  };
  return <StatePage id="A9_NoInternet" tone="warning" icon="wifioff" tag="Offline" title="No internet connection" text={failed ? "Still offline. Check your Wi-Fi or mobile data and try again." : "Check your Wi-Fi or mobile data. We'll reconnect as soon as you're back online."}>
    <Button onClick={retry} disabled={checking}><Icon name="refresh" size={18}/>{checking ? "Checking connection…" : "Try again"}</Button>
    <GhostButton onClick={onBack}>Go back</GhostButton>
  </StatePage>;
}

/** A10: Server error. */
export function A10_ServerError({ onRetry, onSupport, onBack }: { onRetry: () => void; onSupport: () => void; onBack: () => void }) {
  const [busy, setBusy] = useState(false);
  return <StatePage id="A10_ServerError" tone="error" icon="alert" title="Something went wrong" text="We couldn't complete that request. It's on our side, and your data is safe.">
    <Button disabled={busy} onClick={() => { setBusy(true); setTimeout(onRetry, 800); }}><Icon name="refresh" size={18}/>{busy ? "Retrying…" : "Try again"}</Button>
    <GhostButton onClick={onSupport}>Contact support</GhostButton>
    <GhostButton onClick={onBack}>Go back</GhostButton>
  </StatePage>;
}

/** A11: Maintenance mode. */
export function A11_Maintenance({ onSupport, onBack }: { onSupport: () => void; onBack: () => void }) {
  const [state, setState] = useState<"idle" | "checking" | "down">("idle");
  const check = () => { setState("checking"); setTimeout(() => setState("down"), 1000); };
  return <StatePage id="A11_Maintenance" tone="warning" icon="tool" tag="Scheduled maintenance" title="We'll be right back" text={state === "down" ? "Still working on it. Expected back by 6:30 PM today." : "RoadRider is getting an upgrade. Expected back by 6:30 PM today."}>
    <Button onClick={check} disabled={state === "checking"}><Icon name="refresh" size={18}/>{state === "checking" ? "Checking status…" : "Check status"}</Button>
    <GhostButton onClick={onSupport}>Contact support</GhostButton>
    <GhostButton onClick={onBack}>Dismiss preview</GhostButton>
  </StatePage>;
}

/** A12: Force update. Update now simulates an install, then continues. */
export function A12_ForceUpdate({ onUpdate }: { onUpdate: () => void }) {
  const [progress, setProgress] = useState<number | null>(null);
  const done = useRef(onUpdate); done.current = onUpdate;
  useEffect(() => {
    if (progress === null) return;
    if (progress >= 100) { const t = setTimeout(() => done.current(), 500); return () => clearTimeout(t); }
    const t = setTimeout(() => setProgress((p) => Math.min(100, (p ?? 0) + 20)), 300);
    return () => clearTimeout(t);
  }, [progress]);
  return <StatePage id="A12_ForceUpdate" tone="info" icon="download" tag="Update required" title="Update RoadRider" text="A new version with faster checkout and safer payments is required to keep using the app.">
    <ul className="state-list"><li><Icon name="check" size={14}/>Faster ride booking</li><li><Icon name="check" size={14}/>Safer payments</li><li><Icon name="check" size={14}/>Live tracking fixes</li></ul>
    {progress !== null && <div className="progress-bar" role="progressbar" aria-valuenow={progress}><i style={{ width: `${progress}%` }}/></div>}
    <Button onClick={() => setProgress(0)} disabled={progress !== null}>{progress === null ? "Update now" : progress >= 100 ? "Updated" : `Updating ${progress}%`}</Button>
  </StatePage>;
}

/** A13: Location permission denied / GPS off. */
export function A13_LocationDenied({ onEnable, onManual }: { onEnable: () => void; onManual: () => void }) {
  return <StatePage id="A13_LocationDenied" tone="warning" icon="mapoff" tag="Location off" title="Turn on location" text="RoadRider needs your location to find nearby restaurants, drivers, and delivery partners.">
    <Button onClick={onEnable}><Icon name="pin" size={18}/>Turn on location</Button>
    <GhostButton onClick={onManual}>Enter location manually</GhostButton>
  </StatePage>;
}

/** A14: Notification permission prompt (onboarding). */
export function A14_NotificationPrompt({ onAllow, onLater }: { onAllow: () => void; onLater: () => void }) {
  return <StatePage id="A14_NotificationPrompt" tone="info" icon="bell" tag="Stay updated" title="Never miss an update" text="Get live order tracking, driver arrival alerts, and offers you will actually use.">
    <ul className="state-list"><li><Icon name="clock" size={14}/>Live delivery and ride updates</li><li><Icon name="receipt" size={14}/>Payment and refund alerts</li><li><Icon name="gift" size={14}/>Offers on your favourites</li></ul>
    <Button onClick={onAllow}>Allow notifications</Button>
    <GhostButton onClick={onLater}>Maybe later</GhostButton>
  </StatePage>;
}

/** A15: Session expired. */
export function A15_SessionExpired({ onLogin, onSupport }: { onLogin: () => void; onSupport: () => void }) {
  return <StatePage id="A15_SessionExpired" tone="warning" icon="lock" tag="Signed out" title="Your session expired" text="For your security, please log in again. Your cart and orders are saved.">
    <Button onClick={onLogin}>Log in again</Button>
    <GhostButton onClick={onSupport}>Contact support</GhostButton>
  </StatePage>;
}

/** A16: Service not available in your area. */
export function A16_ServiceUnavailable({ place, onChange, onBack }: { place: string; onChange: () => void; onBack: () => void }) {
  const [notify, setNotify] = useState(false);
  return <StatePage id="A16_ServiceUnavailable" tone="info" icon="mapoff" tag="Coming soon" title="We're not in your area yet" text={`RoadRider doesn't serve ${place} yet. We're expanding fast, and we can let you know when we arrive.`}>
    <Button onClick={onChange}><Icon name="pin" size={18}/>Change location</Button>
    <GhostButton onClick={() => setNotify((v) => !v)}>{notify ? "We'll notify you" : "Notify me when available"}</GhostButton>
    <GhostButton onClick={onBack}>Go back</GhostButton>
  </StatePage>;
}

/** A17: Page not found / generic error. */
export function A17_NotFound({ onHome, onBack }: { onHome: () => void; onBack: () => void }) {
  return <StatePage id="A17_NotFound" tone="error" icon="search" tag="Not found" title="We can't find that page" text="The link may be broken or the page may have moved.">
    <Button onClick={onHome}><Icon name="home" size={18}/>Go to home</Button>
    <GhostButton onClick={onBack}>Go back</GhostButton>
  </StatePage>;
}

const steps = ["Contacting your bank", "Verifying payment", "Confirming with RoadRider"];
/** A18: Payment processing. Do-not-close message, resolves via onDone. */
export function A18_PaymentProcessing({ amount, method, onDone }: { amount: string; method: string; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const done = useRef(onDone); done.current = onDone;
  useEffect(() => {
    const ticks = [700, 1400, 2100].map((ms, i) => setTimeout(() => setStep(i + 1), ms));
    const end = setTimeout(() => done.current(), 2500);
    return () => { ticks.forEach(clearTimeout); clearTimeout(end); };
  }, []);
  return <main className="state-page" data-screen="A18_PaymentProcessing">
    <div className="spinner-ring" role="status" aria-label="Processing payment"><Icon name="lock" size={24}/></div>
    <h1>Processing {amount}</h1><p>Paying with {method}</p>
    <ol className="process-steps">{steps.map((s, i) => <li key={s} className={i < step ? "done" : i === step ? "now" : ""}><i>{i < step && <Icon name="check" size={11}/>}</i>{s}</li>)}</ol>
    <p className="do-not-close"><Icon name="alert" size={14}/>Please do not close the app or press back.</p>
  </main>;
}

/** A19: Payment success with order summary. */
export function A19_PaymentSuccess({ title = "Payment successful", tag = "Paid", amount, lines, cta, onDone }: { title?: string; tag?: string; amount: string; lines: [string, string][]; cta: string; onDone: () => void }) {
  return <main className="state-page success-page" data-screen="A19_PaymentSuccess">
    <div className="state-icon tone-success"><Icon name="check" size={42}/></div>
    <span className="state-tag tone-success"><Icon name="check" size={12}/>{tag}</span>
    <h1>{title}</h1><strong className="success-amount">{amount}</strong>
    <div className="summary-card">{lines.map(([k, v]) => <div key={k}><span>{k}</span><b>{v}</b></div>)}</div>
    <div className="state-actions"><Button onClick={onDone}>{cta}</Button></div>
  </main>;
}

/** A20: Payment failed with reason, retry and change method. */
export function A20_PaymentFailed({ reason, amount, onRetry, onChangeMethod, onSupport }: { reason: string; amount: string; onRetry: () => void; onChangeMethod: () => void; onSupport: () => void }) {
  return <StatePage id="A20_PaymentFailed" tone="error" icon="card" tag="Payment failed" title="We couldn't take your payment" text={`${reason} No money was deducted for ${amount}.`}>
    <Button onClick={onRetry}><Icon name="refresh" size={18}/>Try again</Button>
    <GhostButton onClick={onChangeMethod}>Change payment method</GhostButton>
    <GhostButton onClick={onSupport}>Contact support</GhostButton>
  </StatePage>;
}

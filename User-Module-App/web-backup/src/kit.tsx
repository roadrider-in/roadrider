import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, FlowHeader, Icon } from "./ui";
import { useStore } from "./store";
import { sendOtp, verifyOtp } from "./services/auth.service";

export const initialsOf = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "RR";

/** Avatar face: uploaded photo if present, otherwise initials. Reads the shared profile. */
export function AvatarFace() {
  const { profile } = useStore();
  return profile.avatar ? <img className="avatar-photo" src={profile.avatar} alt={profile.name}/> : <>{initialsOf(profile.name)}</>;
}

/** Account sub-screen scaffold: back arrow + title; bottom nav is rendered by the app shell. */
export function KPage({ title, onBack, children, right }: { title: string; onBack: () => void; children: ReactNode; right?: ReactNode }) {
  return <div className="k-page">
    <header className="k-header"><button data-interactive="true" onClick={onBack} aria-label="Go back"><Icon name="back"/></button><h2>{title}</h2><div className="k-right">{right}</div></header>
    <div className="k-body">{children}</div>
  </div>;
}

export function Toggle({ on, onChange, disabled, label }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return <button data-interactive="true" role="switch" aria-checked={on} aria-label={label} disabled={disabled} className={`switch ${on ? "on" : ""}`} onClick={() => onChange(!on)}><i/></button>;
}

export function Field({ label, value, onChange, onBlur, error, placeholder, type = "text", inputMode, readOnly, optional, right, maxLength, prefix }: { label: string; value: string; onChange?: (v: string) => void; onBlur?: () => void; error?: string; placeholder?: string; type?: string; inputMode?: "text" | "numeric" | "tel" | "email"; readOnly?: boolean; optional?: boolean; right?: ReactNode; maxLength?: number; prefix?: string }) {
  return <label className={`field ${error ? "invalid" : ""} ${readOnly ? "readonly" : ""}`}>
    <span className="field-label">{label}{optional && <em>Optional</em>}{right}</span>
    <span className="field-box">{prefix && <b>{prefix}</b>}<input value={value} readOnly={readOnly} type={type} inputMode={inputMode} maxLength={maxLength} placeholder={placeholder} aria-invalid={!!error} onChange={(e) => onChange?.(e.target.value)} onBlur={onBlur}/></span>
    {error && <span className="field-error" role="alert"><Icon name="alert" size={13}/>{error}</span>}
  </label>;
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="sheet-backdrop" onClick={onClose}><div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}><div className="drag"/><div className="sheet-head"><h3>{title}</h3><button data-interactive="true" aria-label="Close" onClick={onClose}><Icon name="x" size={18}/></button></div>{children}</div></div>;
}

export function Dialog({ title, text, confirm, cancel = "Cancel", tone, onConfirm, onCancel, loading }: { title: string; text: string; confirm: string; cancel?: string; tone?: "danger"; onConfirm: () => void; onCancel: () => void; loading?: boolean }) {
  return <div className="sheet-backdrop center" onClick={onCancel}><div className="dialog" role="alertdialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
    <h3>{title}</h3><p>{text}</p>
    <div className="dialog-actions"><button data-interactive="true" className="ghost-button" onClick={onCancel}>{cancel}</button><Button tone={tone} onClick={onConfirm} loading={loading}>{confirm}</Button></div>
  </div></div>;
}

export function Chip({ on, onClick, children }: { on?: boolean; onClick: () => void; children: ReactNode }) {
  return <button data-interactive="true" className={`chip ${on ? "on" : ""}`} aria-pressed={!!on} onClick={onClick}>{children}</button>;
}

export function Row({ icon, title, sub, onClick, right, tone }: { icon?: string; title: string; sub?: string; onClick?: () => void; right?: ReactNode; tone?: "danger" }) {
  const body = <><span className={`row-icon ${tone ?? ""}`}>{icon && <Icon name={icon} size={18}/>}</span><div><strong>{title}</strong>{sub && <small>{sub}</small>}</div>{right ?? (onClick && <Icon name="arrow" size={17}/>)}</>;
  return onClick ? <button data-interactive="true" className="k-row" onClick={onClick}>{body}</button> : <div className="k-row static">{body}</div>;
}

export function StatusChip({ tone, children }: { tone: "success" | "warning" | "error" | "info"; children: string }) {
  const icon = tone === "success" ? "check" : tone === "error" ? "x" : tone === "info" ? "info" : "clock";
  return <span className={`status-chip tone-${tone}`}><Icon name={icon} size={11}/>{children}</span>;
}

/** Reusable OTP entry (6 boxes, keypad, resend countdown, wrong/expired states) backed by Supabase GoTrue. */
export function OtpEntry({ target, cta, onVerified, expireAfter = 60 }: { target: string; cta: string; onVerified: () => void; expireAfter?: number }) {
  const [otp, setOtp] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState<"idle" | "wrong" | "short">("idle");
  const [shake, setShake] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  useEffect(() => { const t = setInterval(() => setElapsed((e) => e + 1), 1000); return () => clearInterval(t); }, []);
  const expired = elapsed >= expireAfter;
  const left = Math.max(0, 30 - elapsed);
  const press = (key: string) => { if (expired || busy) return; setStatus("idle"); setErrorMsg(""); setOtp((v) => (key === "⌫" ? v.slice(0, -1) : /\d/.test(key) && v.length < 6 ? v + key : v)); };
  const ref = useRef(press); ref.current = press;
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === "Backspace") ref.current("⌫"); else if (/^\d$/.test(e.key)) ref.current(e.key); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, []);
  const verify = async () => {
    if (expired) return;
    if (otp.length < 6) { setStatus("short"); return; }
    setBusy(true);
    setErrorMsg("");
    try {
      const res = await verifyOtp(target, otp);
      if (res.success) {
        onVerified();
      } else {
        setStatus("wrong");
        setErrorMsg(res.error || "Incorrect verification code.");
        setOtp("");
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    } catch (err: any) {
      setStatus("wrong");
      setErrorMsg(err?.message || "Verification failed. Please try again.");
      setOtp("");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setBusy(false);
    }
  };
  const resend = async () => {
    setElapsed(0);
    setOtp("");
    setStatus("idle");
    setErrorMsg("");
    setSent(true);
    await sendOtp(target);
    setTimeout(() => setSent(false), 2500);
  };
  const msg = errorMsg ? errorMsg : expired ? "This code has expired. Request a new one." : status === "wrong" ? "Incorrect code. Check the digits and try again." : status === "short" ? "Enter all 6 digits." : "";
  return <div className="otp-block">
    <p className="otp-target">Code sent to <strong>{target}</strong></p>
    <div className={`otp-inputs ${msg ? "invalid" : ""} ${shake ? "shake" : ""}`}>{Array.from({ length: 6 }, (_, i) => <span key={i} className={i === otp.length && !expired ? "focused" : ""}>{otp[i] || ""}</span>)}</div>
    {msg && <p className="field-error center" role="alert"><Icon name="alert" size={13}/>{msg}</p>}
    {sent && <p className="field-ok center"><Icon name="check" size={13}/>New code sent</p>}
    {left > 0 && !expired ? <p className="resend">Resend code in <strong>00:{String(left).padStart(2, "0")}</strong></p> : <button data-interactive="true" className="resend link" onClick={resend}>Resend code</button>}
    <Button onClick={verify} loading={busy} disabled={expired}>{cta}</Button>
    <div className="k-keypad">{["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k, i) => <button data-interactive="true" key={i} disabled={k === ""} aria-label={k === "⌫" ? "Delete" : k || undefined} onClick={() => press(k)}>{k}</button>)}</div>
  </div>;
}

export { FlowHeader };

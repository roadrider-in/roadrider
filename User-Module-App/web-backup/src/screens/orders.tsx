import { Button, Icon, serviceMeta } from "../ui";
import { useNav } from "../nav";
import { inr, useStore } from "../store";
import { KPage, Row, StatusChip } from "../kit";
import { GhostButton } from "../states";

const iconFor = (s: string) => (s === "food" ? "food" : s === "grocery" ? "bag" : s === "courier" ? "box" : "car");

/** Order detail: summary, payment method, invoice and, for cancelled prepaid orders, refund status (J7). */
export function OrderDetail({ id }: { id: number }) {
  const nav = useNav();
  const { orders, profile } = useStore();
  const o = orders.find((x) => x.id === id);
  if (!o) return <KPage title="Order" onBack={nav.close}><p className="k-note">We couldn't find this order.</p></KPage>;
  const cancelled = o.status.startsWith("Cancelled");
  return <KPage title="Order details" onBack={nav.close}>
    <section className="k-card order-summary"><span className="service-order-icon"><Icon name={iconFor(o.service)}/></span>
      <div><small>{serviceMeta[o.service].label.toUpperCase()} · {o.date.toUpperCase()}</small><h2>{o.title}</h2><p>{o.status}</p></div>
      <StatusChip tone={cancelled ? "warning" : o.state === "active" ? "info" : "success"}>{cancelled ? "Cancelled" : o.state === "active" ? "Active" : "Completed"}</StatusChip></section>

    {!cancelled && (
      <Button onClick={() => nav.open("ORDER_JOURNEY", { id: o.dbId || o.orderNumber || o.id })}>
        <Icon name="clock" size={18}/>
        {o.state === "active" ? "Track Live Order & Rider" : "View Live Timeline & Rate"}
      </Button>
    )}
    <h3 className="k-h">Payment</h3>
    <div className="k-card flush">
      <div className="k-row static"><div><strong>Total</strong><small>Incl. taxes and fees</small></div><b>{inr(o.price)}</b></div>
      <div className="k-row static"><div><strong>Paid with</strong></div><span>{o.paidWith}</span></div>
    </div>
    {o.refund && <div className="k-card flush"><Row icon="receipt" title="Refund status" sub={`${inr(o.price)} to your original payment method`} onClick={() => nav.open("J7", { id: o.id })}/></div>}
    <Button secondary onClick={() => nav.toast(`Invoice sent to ${profile.email}`, "success")}><Icon name="receipt" size={18}/>Email invoice</Button>
    <GhostButton onClick={() => nav.open("L1")}>Get help with this order</GhostButton>
  </KPage>;
}

/** J7: refund tracking. Refunds always go back to the original payment method in 5 to 7 working days. */
export function J7_RefundStatus({ id }: { id: number }) {
  const nav = useNav();
  const { orders } = useStore();
  const o = orders.find((x) => x.id === id);
  const steps: [string, string, boolean][] = [["Refund initiated", "We've approved your refund", true], ["Processing with your bank", "Typically takes 5–7 working days", true], ["Credited to your account", "You'll be notified when it arrives", false]];
  return <KPage title="Refund status" onBack={nav.close}>
    <section className="k-card refund-card"><small>REFUND AMOUNT</small><strong>{inr(o?.price ?? 0)}</strong><p>Refunded to your original payment method{o ? ` (${o.paidWith})` : ""}. Expect it within 5–7 working days.</p></section>
    <ol className="refund-steps">{steps.map(([t, s, done], i) => <li key={t} className={done ? "done" : ""}><i>{done && <Icon name="check" size={11}/>}</i><div><strong>{t}</strong><small>{s}</small></div>{i === 1 && <StatusChip tone="info">In progress</StatusChip>}</li>)}</ol>
    <GhostButton onClick={() => nav.open("L1")}>Contact support</GhostButton>
  </KPage>;
}

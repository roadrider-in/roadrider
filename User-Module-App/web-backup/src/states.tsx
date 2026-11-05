import type { ReactNode } from "react";
import { Icon, type Service } from "./ui";

export type Tone = "error" | "warning" | "info" | "success";
const toneLabel: Record<Tone, string> = { error: "Error", warning: "Heads up", info: "Info", success: "Success" };
const toneIcon: Record<Tone, string> = { error: "alert", warning: "alert", info: "info", success: "check" };

/** Full-screen system state: icon, semantic tag, title, one-line explanation, then actions. */
export function StatePage({ tone, icon, tag, title, text, children, dark = false, id }: { tone: Tone; icon: string; tag?: string; title: string; text: string; children?: ReactNode; dark?: boolean; id?: string }) {
  return <main className={`state-page ${dark ? "state-dark" : ""}`} data-screen={id}>
    <div className={`state-icon tone-${tone}`}><Icon name={icon} size={40}/></div>
    <span className={`state-tag tone-${tone}`}><Icon name={toneIcon[tone]} size={12}/>{tag ?? toneLabel[tone]}</span>
    <h1>{title}</h1>
    <p>{text}</p>
    <div className="state-actions">{children}</div>
  </main>;
}

export function GhostButton({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return <button data-interactive="true" disabled={disabled} className="ghost-button" onClick={onClick}>{children}</button>;
}

/** Inline empty state with illustration, one-line explanation and one clear CTA. */
export function EmptyState({ icon, service, title, text, cta, onCta, secondary, onSecondary, id }: { icon: string; service?: Service; title: string; text: string; cta?: string; onCta?: () => void; secondary?: string; onSecondary?: () => void; id?: string }) {
  return <section className={`empty-state ${service ? `empty-${service}` : ""}`} data-screen={id}>
    <div className="empty-art"><span className="empty-dot a"/><span className="empty-dot b"/><div><Icon name={icon} size={34}/></div></div>
    <h2>{title}</h2>
    <p>{text}</p>
    {cta && <button data-interactive="true" className="primary-button empty-cta" onClick={onCta}>{cta}</button>}
    {secondary && <button data-interactive="true" className="empty-link" onClick={onSecondary}>{secondary}</button>}
  </section>;
}

const Sk = ({ w, h, r, className = "" }: { w?: number | string; h: number | string; r?: number | string; className?: string }) =>
  <i className={`sk ${className}`} style={{ width: w ?? "100%", height: h, borderRadius: r }}/>;

/** A2: mirrors FoodHome (hero, search, category chips, restaurant card, offers). */
export function A2_FoodSkeleton() {
  return <div className="skeleton sk-food" aria-busy="true" aria-label="Loading food">
    <div className="sk-hero"><div className="sk-row"><Sk w={150} h={34} r={17}/><Sk w={34} h={34} r="50%"/><Sk w={34} h={34} r="50%"/></div><Sk h={48} r={14}/><div className="sk-hero-copy"><Sk w={90} h={9}/><Sk w={220} h={26}/><Sk w={170} h={26}/></div></div>
    <div className="sk-body"><Sk h={50} r={14}/><Sk w={170} h={16}/><div className="sk-row between">{[1,2,3,4,5].map(i=><div key={i} className="sk-col"><Sk w={51} h={51} r="50%"/><Sk w={36} h={8}/></div>)}</div><Sk w={140} h={16}/><Sk h={152} r={16}/><div className="sk-row"><Sk w="60%" h={14}/><Sk w={36} h={20} r={5}/></div><Sk w={110} h={16}/><div className="sk-row"><Sk h={105} r={15}/><Sk h={105} r={15}/></div></div>
  </div>;
}
/** A3: mirrors RidesHome (header, tabs, map, route rows, ride tiles, CTA). */
export function A3_RidesSkeleton() {
  return <div className="skeleton sk-rides" aria-busy="true" aria-label="Loading rides">
    <div className="sk-row"><Sk w={150} h={34} r={17}/><Sk w={34} h={34} r="50%"/><Sk w={34} h={34} r="50%"/></div>
    <Sk h={48} r={14}/><Sk h={44} r={13}/><Sk h={214} r={18}/><Sk h={104} r={16}/><Sk w={130} h={16}/>
    <div className="sk-grid4">{[1,2,3,4].map(i=><Sk key={i} h={104} r={13}/>)}</div><Sk h={52} r={12}/>
  </div>;
}
/** A4: mirrors GroceryHome (header, tabs, banner, search, categories, product grid). */
export function A4_GrocerySkeleton() {
  return <div className="skeleton sk-grocery" aria-busy="true" aria-label="Loading grocery">
    <div className="sk-row"><Sk w={150} h={34} r={17}/><Sk w={34} h={34} r="50%"/><Sk w={34} h={34} r="50%"/></div>
    <Sk h={48} r={14}/><Sk h={185} r={20}/><Sk h={50} r={14}/><Sk w={150} h={16}/>
    <div className="sk-row between">{[1,2,3,4,5].map(i=><div key={i} className="sk-col"><Sk w={51} h={51} r="50%"/><Sk w={36} h={8}/></div>)}</div>
    <Sk h={115} r={17}/><div className="sk-row"><div className="sk-card"><Sk h={100} r={11}/><Sk w="80%" h={11}/><Sk w="50%" h={9}/></div><div className="sk-card"><Sk h={100} r={11}/><Sk w="80%" h={11}/><Sk w="50%" h={9}/></div></div>
  </div>;
}
/** A5: mirrors CourierHome (photo hero, switcher, sheet with segments, rows, package grid, quote). */
export function A5_CourierSkeleton() {
  return <div className="skeleton sk-courier" aria-busy="true" aria-label="Loading courier">
    <div className="sk-hero"><div className="sk-row"><Sk w={150} h={34} r={17}/><Sk w={34} h={34} r="50%"/><Sk w={34} h={34} r="50%"/></div><Sk h={48} r={14}/><div className="sk-hero-copy"><Sk w={110} h={9}/><Sk w={210} h={28}/></div></div>
    <div className="sk-sheet"><Sk h={44} r={13}/><Sk h={104} r={16}/><Sk w={120} h={16}/><div className="sk-grid4">{[1,2,3,4].map(i=><Sk key={i} h={78} r={12}/>)}</div><Sk h={64} r={14}/><Sk h={52} r={12}/></div>
  </div>;
}
/** A6: generic list/detail skeleton (title, chips, rows). */
export function A6_ListSkeleton() {
  return <div className="skeleton sk-list" aria-busy="true" aria-label="Loading">
    <div className="sk-row between"><div className="sk-col left"><Sk w={90} h={8}/><Sk w={170} h={24}/></div><Sk w={34} h={34} r="50%"/></div>
    <Sk h={150} r={20}/><div className="sk-row"><Sk w={90} h={34} r={17}/><Sk w={90} h={34} r={17}/><Sk w={90} h={34} r={17}/></div>
    {[1,2,3,4].map(i=><div key={i} className="sk-item"><Sk w={42} h={42} r={12}/><div className="sk-col left grow"><Sk w="70%" h={11}/><Sk w="45%" h={9}/></div><Sk w={40} h={12}/></div>)}
  </div>;
}
export function SkeletonFor({ service }: { service: Service }) {
  return service === "food" ? <A2_FoodSkeleton/> : service === "rides" ? <A3_RidesSkeleton/> : service === "grocery" ? <A4_GrocerySkeleton/> : <A5_CourierSkeleton/>;
}

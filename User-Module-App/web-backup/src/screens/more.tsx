import { useState } from "react";
import { Button, FlowHeader, Icon } from "../ui";

/** TEMPORARY placeholder. Removed once every control opens its specific screen (end of Batch 3). */
const actionContent: Record<string, { eyebrow: string; title: string; description: string; items: string[] }> = {
  notification: { eyebrow: "YOU'RE ALL CAUGHT UP", title: "Notifications", description: "Updates from every RoadRider service appear together here.", items: ["Your food order is being prepared", "Refund of ₹96 initiated", "Courier partner reached the pickup"] },
  address: { eyebrow: "SAVED PLACES", title: "Choose a location", description: "Use a saved place or add a new address for faster checkout.", items: ["Home · Hazratganj", "Work · Gomti Nagar", "Add a new address"] },
  payment: { eyebrow: "SAFE & SECURE", title: "Payment methods", description: "Manage the ways you pay across RoadRider.", items: ["Visa ending in 4821", "Add UPI or a new card"] },
  help: { eyebrow: "24/7 SUPPORT", title: "How can we help?", description: "Get quick help with an order, payment, ride, or delivery.", items: ["Chat with support", "Report an order issue", "Safety and emergency help"] },
  order: { eyebrow: "ORDER DETAILS", title: "Track your activity", description: "See live progress, receipts, and support options in one place.", items: ["View live tracking", "Download invoice", "Get help with this order"] },
  profile: { eyebrow: "PERSONAL DETAILS", title: "Profile & settings", description: "Keep your RoadRider account details up to date.", items: ["Arjun Khanna", "+91 98765 43210", "Language · English"] },
  default: { eyebrow: "EXPLORE ROADRIDER", title: "More options", description: "Everything you need is ready in the RoadRider prototype.", items: ["Recommended for you", "Popular nearby", "Offers and savings"] },
};

export function MoreScreen({ label, onBack }: { label: string; onBack: () => void }) {
  const [selected, setSelected] = useState("");
  const normalized = label.toLowerCase();
  const key = normalized.includes("notif") ? "notification"
    : normalized.includes("address") || normalized.includes("location") || normalized.includes("pickup") || normalized.includes("destination") ? "address"
    : normalized.includes("pay") || normalized.includes("card") || normalized.includes("upi") ? "payment"
    : normalized.includes("help") || normalized.includes("phone") ? "help"
    : normalized.includes("order") || normalized.includes("active") || normalized.includes("past") || normalized.includes("track") ? "order"
    : normalized.includes("profile") || normalized.includes("edit") || normalized.includes("account") ? "profile"
    : "default";
  const content = actionContent[key];
  const title = key === "default" && label ? label : content.title;
  return <div className="more-page">
    <FlowHeader title="" onBack={onBack} noHelp/>
    <div className="more-hero"><span><Icon name={key === "notification" ? "bell" : key === "address" ? "pin" : key === "payment" ? "card" : key === "order" ? "list" : key === "profile" ? "user" : key === "help" ? "shield" : "star"} size={28}/></span><p>{content.eyebrow}</p><h1>{title}</h1><p>{content.description}</p></div>
    <div className="more-list">{content.items.map((item, index) => <button data-interactive="true" className={selected === item ? "selected" : ""} onClick={() => setSelected(item)} key={item}><span>{selected === item ? <Icon name="check" size={15}/> : index + 1}</span><strong>{item}</strong><Icon name="arrow" size={17}/></button>)}</div>
    {selected && <p className="action-feedback"><Icon name="check" size={14}/> {selected} selected</p>}
    <div className="more-action"><Button onClick={onBack}>Done</Button></div>
  </div>;
}


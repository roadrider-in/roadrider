const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function time(d: Date) {
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "Today, 1:24 PM" · "Yesterday, 6:42 PM" · "18 May, 10:10 AM" (formats used in the design). */
export function formatWhen(ts: number, now = Date.now()) {
  const d = new Date(ts);
  const today = new Date(now);
  const yesterday = new Date(now - 86_400_000);
  if (sameDay(d, today)) return `Today, ${time(d)}`;
  if (sameDay(d, yesterday)) return `Yesterday, ${time(d)}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${time(d)}`;
}

/** "18 May" */
export function formatDay(ts: number) {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function formatTime(ts: number) {
  return time(new Date(ts));
}

export function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "RR";
}

/** Indian mobile numbers: 10 digits starting with 6–9. */
export function normalisePhone(raw: string) {
  return raw.replace(/\D/g, "").slice(0, 10);
}
export function isValidIndianMobile(digits: string) {
  return /^[6-9]\d{9}$/.test(digits);
}
export function prettyPhone(digits: string) {
  return digits.length === 10 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits;
}
